<#
.SYNOPSIS
  Sets up the Workout Log development environment on Windows.

.DESCRIPTION
  Safe to run again at any time: every step first checks whether it is
  already done and skips itself if so.

    1. Tools         Git and Node.js (installed with winget when missing)
    2. App           Vite + React scaffold (only while the repo has none)
    3. Dependencies  npm install, plus the libraries the plan calls for
    4. Environment   .env.example and .env.local
    5. Verify        npm run build

  Full instructions: docs/setup.md

.PARAMETER CheckOnly
  Report what is missing and change nothing. Exit code 1 if anything is missing.

.PARAMETER SupabaseUrl
  Written to VITE_SUPABASE_URL in .env.local.

.PARAMETER SupabaseAnonKey
  Written to VITE_SUPABASE_ANON_KEY in .env.local.

.PARAMETER WithGitHubCli
  Also install the optional GitHub CLI (gh).

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\setup.ps1

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\setup.ps1 -CheckOnly
#>
[CmdletBinding()]
param(
    [switch]$CheckOnly,
    [string]$SupabaseUrl,
    [string]$SupabaseAnonKey,
    [switch]$WithGitHubCli
)

$ErrorActionPreference = 'Stop'

# Vite 8 needs Node ^20.19 || >=22.12 and supabase-js needs >=22, so 22.12 covers both.
$MinNode = [version]'22.12.0'
$RequiredPackages = @('@supabase/supabase-js', 'react-router-dom')
$UrlPlaceholder = 'https://YOUR-PROJECT-REF.supabase.co'
$KeyPlaceholder = 'YOUR-ANON-KEY'

$Root = Split-Path -Parent $PSScriptRoot
$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$script:Todo = 0

function Write-Step([string]$Text) { Write-Host ''; Write-Host "== $Text" -ForegroundColor Cyan }
function Write-Ok([string]$Text) { Write-Host "  [ok]   $Text" -ForegroundColor Green }
function Write-Done([string]$Text) { Write-Host "  [done] $Text" -ForegroundColor Green }
function Write-Note([string]$Text) { Write-Host "  [note] $Text" -ForegroundColor Yellow }
function Write-Todo([string]$Text) { $script:Todo++; Write-Host "  [todo] $Text" -ForegroundColor Yellow }

function Test-Command([string]$Name) {
    return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

# Runs a native command and stops the script if it fails.
function Invoke-Native([string]$What, [scriptblock]$Command) {
    & $Command
    if ($LASTEXITCODE -ne 0) { throw "$What failed (exit code $LASTEXITCODE)." }
}

# npm.cmd, not npm: PowerShell resolves "npm" to the unsigned npm.ps1 shim,
# which restrictive execution policies (AllSigned) refuse to run.
function Invoke-Npm([string]$What, [string[]]$Arguments) {
    Invoke-Native $What { & npm.cmd @Arguments }
}

# A winget install changes PATH in the registry, not in this running session.
function Update-SessionPath {
    $machine = [Environment]::GetEnvironmentVariable('Path', 'Machine')
    $user = [Environment]::GetEnvironmentVariable('Path', 'User')
    $env:Path = "$machine;$user"
}

function Install-WithWinget([string]$Id, [string]$Name) {
    if (-not (Test-Command 'winget')) {
        throw "$Name is missing and winget is not available to install it. Install $Name by hand (see docs/setup.md, 'Manual setup') and run this script again."
    }
    Write-Host "  Installing $Name with winget..."
    Invoke-Native "Installing $Name" {
        & winget install --id $Id --exact --source winget --accept-package-agreements --accept-source-agreements
    }
    Update-SessionPath
}

function Get-NodeVersion {
    if (-not (Test-Command 'node')) { return $null }
    $raw = (& node --version) -replace '^v', '' -replace '-.*$', ''
    return [version]$raw
}

function Write-TextFile([string]$Path, [string]$Text) {
    [System.IO.File]::WriteAllText($Path, $Text, $Utf8NoBom)
}

function Test-Scaffolded {
    foreach ($name in 'vite.config.js', 'vite.config.mjs', 'vite.config.ts') {
        if (Test-Path -LiteralPath (Join-Path $Root $name)) { return $true }
    }
    return $false
}

function Get-DependencyNames {
    $path = Join-Path $Root 'package.json'
    if (-not (Test-Path -LiteralPath $path)) { return @() }
    $pkg = Get-Content -LiteralPath $path -Raw | ConvertFrom-Json
    $names = @()
    foreach ($section in 'dependencies', 'devDependencies') {
        if ($pkg.$section) { $names += $pkg.$section.PSObject.Properties.Name }
    }
    return $names
}

# Adds the template's ignore rules that the repo's .gitignore does not have yet.
function Merge-GitIgnore([string]$TemplatePath) {
    $target = Join-Path $Root '.gitignore'
    if (-not (Test-Path -LiteralPath $target)) {
        Copy-Item -LiteralPath $TemplatePath -Destination $target
        return
    }
    $existingText = [System.IO.File]::ReadAllText($target)
    $existing = $existingText -split "`r?`n" | ForEach-Object { $_.Trim().TrimEnd('/') }
    $new = Get-Content -LiteralPath $TemplatePath | Where-Object {
        $line = $_.Trim()
        $line -and -not $line.StartsWith('#') -and ($existing -notcontains $line.TrimEnd('/'))
    }
    if (-not $new) { return }
    $eol = "`n"
    if ($existingText.Contains("`r`n")) { $eol = "`r`n" }
    $block = (@('', '# Added from the Vite template') + $new) -join $eol
    Write-TextFile $target ($existingText.TrimEnd() + $eol + $block + $eol)
}

# create-vite refuses a non-empty folder unless it may wipe it, so the template
# is generated in a temp folder and copied in. Existing files are never
# overwritten, except the IDE placeholder package.json.
function Initialize-ViteApp {
    $pkgPath = Join-Path $Root 'package.json'
    if ((Get-DependencyNames).Count -gt 0) {
        throw 'package.json already lists dependencies but there is no vite.config file. Not overwriting it: scaffold by hand (see docs/setup.md).'
    }

    $temp = Join-Path ([System.IO.Path]::GetTempPath()) ('workout-log-scaffold-' + [guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $temp | Out-Null
    try {
        Push-Location $temp
        try {
            Invoke-Npm 'Scaffolding the Vite app' @(
                'create', '--yes', 'vite@latest', 'workout-log', '--',
                '--template', 'react', '--no-interactive', '--no-immediate'
            )
        }
        finally { Pop-Location }

        $source = Join-Path $temp 'workout-log'
        foreach ($file in Get-ChildItem -LiteralPath $source -Recurse -File -Force) {
            $relative = $file.FullName.Substring($source.Length + 1)
            $destination = Join-Path $Root $relative
            if ($relative -eq 'README.md') { continue }
            if ($relative -eq '.gitignore') { Merge-GitIgnore $file.FullName; continue }
            if ((Test-Path -LiteralPath $destination) -and ($relative -ne 'package.json')) {
                Write-Note "Kept existing $relative (template version not copied)."
                continue
            }
            $folder = Split-Path -Parent $destination
            if (-not (Test-Path -LiteralPath $folder)) { New-Item -ItemType Directory -Path $folder | Out-Null }
            Copy-Item -LiteralPath $file.FullName -Destination $destination -Force
        }
    }
    finally {
        Remove-Item -LiteralPath $temp -Recurse -Force -ErrorAction SilentlyContinue
    }

    # The IDE-generated placeholder entry file is not part of a Vite app.
    $placeholder = Join-Path $Root 'index.js'
    if ((Test-Path -LiteralPath $placeholder) -and
        ((Get-Item -LiteralPath $placeholder).Length -lt 200) -and
        ((Get-Content -LiteralPath $placeholder -Raw) -match "^\s*console\.log\('Happy developing")) {
        Remove-Item -LiteralPath $placeholder
        Write-Done 'Removed the placeholder index.js.'
    }
}

function Get-EnvValue([string]$Text, [string]$Name) {
    $match = [regex]::Match($Text, "(?m)^\s*$([regex]::Escape($Name))\s*=\s*(.*?)\s*$")
    if ($match.Success) { return $match.Groups[1].Value }
    return ''
}

function Set-EnvValue([string]$Text, [string]$Name, [string]$Value) {
    $pattern = "(?m)^\s*$([regex]::Escape($Name))\s*=.*$"
    $line = "$Name=$Value"
    if ([regex]::IsMatch($Text, $pattern)) {
        return [regex]::Replace($Text, $pattern, $line.Replace('$', '$$'))
    }
    return $Text.TrimEnd() + "`n$line`n"
}

Push-Location $Root
try {
    # ---------------------------------------------------------------- 1. Tools
    Write-Step '1/5 Tools'

    if (Test-Command 'git') { Write-Ok ((& git --version) -join ' ') }
    elseif ($CheckOnly) { Write-Todo 'Git is not installed.' }
    else { Install-WithWinget 'Git.Git' 'Git'; Write-Done 'Git installed.' }

    $node = Get-NodeVersion
    if ($node -and $node -ge $MinNode) { Write-Ok "Node.js $node, npm $(& npm.cmd --version)" }
    elseif ($node) {
        # Not upgraded automatically: it may be managed by nvm or needed by other projects.
        $message = "Node.js $node is too old; $MinNode or newer is required. Upgrade it (winget upgrade OpenJS.NodeJS.LTS, or your version manager) and run this script again."
        if ($CheckOnly) { Write-Todo $message } else { throw $message }
    }
    elseif ($CheckOnly) { Write-Todo "Node.js is not installed ($MinNode or newer is required)." }
    else {
        Install-WithWinget 'OpenJS.NodeJS.LTS' 'Node.js LTS'
        $node = Get-NodeVersion
        if (-not $node) { throw 'Node.js was installed but is not on PATH yet. Open a new terminal and run this script again.' }
        Write-Done "Node.js $node installed."
    }
    $nodeReady = [bool]((Get-NodeVersion) -ge $MinNode)

    if (Test-Command 'gh') { Write-Ok ((& gh --version | Select-Object -First 1) + ' (optional)') }
    elseif ($WithGitHubCli -and -not $CheckOnly) { Install-WithWinget 'GitHub.cli' 'GitHub CLI'; Write-Done 'GitHub CLI installed. Sign in with: gh auth login' }
    else { Write-Note 'GitHub CLI (gh) is not installed. It is optional; add -WithGitHubCli to install it.' }

    if (-not $nodeReady -and -not $CheckOnly) { throw 'Node.js is not ready; cannot continue.' }

    # ------------------------------------------------------------------ 2. App
    Write-Step '2/5 Vite + React app'

    if (Test-Scaffolded) { Write-Ok 'Already scaffolded (vite.config found).' }
    elseif ($CheckOnly) { Write-Todo 'Not scaffolded yet (no vite.config).' }
    else { Initialize-ViteApp; Write-Done 'Scaffolded from the create-vite "react" template (JavaScript).' }

    # --------------------------------------------------------- 3. Dependencies
    Write-Step '3/5 Dependencies'

    $installed = Get-DependencyNames
    $missing = @($RequiredPackages | Where-Object { $installed -notcontains $_ })
    $hasModules = Test-Path -LiteralPath (Join-Path $Root 'node_modules')

    if ($CheckOnly) {
        if ($missing.Count) { Write-Todo "Not in package.json: $($missing -join ', ')" } else { Write-Ok "In package.json: $($RequiredPackages -join ', ')" }
        if ($hasModules) { Write-Ok 'node_modules exists.' } else { Write-Todo 'node_modules is missing (npm install has not run).' }
    }
    elseif ($missing.Count) {
        Invoke-Npm 'npm install' (@('install') + $missing)
        Write-Done "Installed all dependencies and added: $($missing -join ', ')"
    }
    else {
        Invoke-Npm 'npm install' @('install')
        Write-Done 'Dependencies are installed and up to date.'
    }

    # ---------------------------------------------------------- 4. Environment
    Write-Step '4/5 Environment variables'

    $examplePath = Join-Path $Root '.env.example'
    $localPath = Join-Path $Root '.env.local'
    $exampleText = "# Copy to .env.local and fill in the values from Supabase -> Project Settings -> API.`n" +
        "# .env.local is git-ignored. Never put the service_role key here.`n" +
        "VITE_SUPABASE_URL=$UrlPlaceholder`n" +
        "VITE_SUPABASE_ANON_KEY=$KeyPlaceholder`n"

    if (Test-Path -LiteralPath $examplePath) { Write-Ok '.env.example exists.' }
    elseif ($CheckOnly) { Write-Todo '.env.example is missing.' }
    else { Write-TextFile $examplePath $exampleText; Write-Done 'Created .env.example (safe to commit: names only).' }

    if (-not (Test-Path -LiteralPath $localPath)) {
        if ($CheckOnly) { Write-Todo '.env.local is missing.' }
        else { Copy-Item -LiteralPath $examplePath -Destination $localPath; Write-Done 'Created .env.local from .env.example.' }
    }

    if (Test-Path -LiteralPath $localPath) {
        $envText = [System.IO.File]::ReadAllText($localPath)
        if (-not $CheckOnly -and ($SupabaseUrl -or $SupabaseAnonKey)) {
            if ($SupabaseUrl) { $envText = Set-EnvValue $envText 'VITE_SUPABASE_URL' $SupabaseUrl }
            if ($SupabaseAnonKey) { $envText = Set-EnvValue $envText 'VITE_SUPABASE_ANON_KEY' $SupabaseAnonKey }
            Write-TextFile $localPath $envText
            Write-Done 'Wrote the given Supabase values to .env.local.'
        }
        $url = Get-EnvValue $envText 'VITE_SUPABASE_URL'
        $key = Get-EnvValue $envText 'VITE_SUPABASE_ANON_KEY'
        if (-not $url -or $url -eq $UrlPlaceholder) { Write-Todo 'VITE_SUPABASE_URL in .env.local still needs your project URL.' } else { Write-Ok 'VITE_SUPABASE_URL is set.' }
        if (-not $key -or $key -eq $KeyPlaceholder) { Write-Todo 'VITE_SUPABASE_ANON_KEY in .env.local still needs your anon key.' } else { Write-Ok 'VITE_SUPABASE_ANON_KEY is set.' }
    }

    # --------------------------------------------------------------- 5. Verify
    Write-Step '5/5 Verify'

    if ($CheckOnly) { Write-Note 'Skipped in -CheckOnly mode (a build writes to dist/).' }
    else { Invoke-Npm 'npm run build' @('run', 'build'); Write-Done 'Production build succeeded.' }

    # ----------------------------------------------------------------- Summary
    Write-Host ''
    if ($script:Todo -eq 0) {
        Write-Host 'Environment is ready. Start the app with: npm run dev  (http://localhost:5173)' -ForegroundColor Green
    }
    else {
        Write-Host "$($script:Todo) item(s) marked [todo] above still need attention. See docs/setup.md." -ForegroundColor Yellow
        if ($CheckOnly) { exit 1 }
    }
}
finally {
    Pop-Location
}
