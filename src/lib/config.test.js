import { describe, expect, it } from 'vitest'
import { readSupabaseConfig } from './config'

const URL = 'https://abcdefghijklmnop.supabase.co'
const KEY = 'sb_publishable_test-key'

describe('readSupabaseConfig', () => {
  it('returns the URL and key when both are set', () => {
    expect(
      readSupabaseConfig({ VITE_SUPABASE_URL: URL, VITE_SUPABASE_ANON_KEY: KEY }),
    ).toEqual({ url: URL, key: KEY, error: null })
  })

  it('names every missing variable', () => {
    const { url, key, error } = readSupabaseConfig({})
    expect(url).toBeNull()
    expect(key).toBeNull()
    expect(error).toMatch(/VITE_SUPABASE_URL/)
    expect(error).toMatch(/VITE_SUPABASE_ANON_KEY/)
  })

  it('names only the variable that is missing', () => {
    const { error } = readSupabaseConfig({ VITE_SUPABASE_URL: URL })
    expect(error).toMatch(/VITE_SUPABASE_ANON_KEY/)
    expect(error).not.toMatch(/VITE_SUPABASE_URL/)
  })

  it('treats the .env.example placeholders as missing', () => {
    const { error } = readSupabaseConfig({
      VITE_SUPABASE_URL: 'https://YOUR-PROJECT-REF.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'YOUR-ANON-KEY',
    })
    expect(error).toMatch(/VITE_SUPABASE_URL/)
    expect(error).toMatch(/VITE_SUPABASE_ANON_KEY/)
  })

  it('rejects a URL without https://', () => {
    const { url, error } = readSupabaseConfig({
      VITE_SUPABASE_URL: 'abcdefghijklmnop.supabase.co',
      VITE_SUPABASE_ANON_KEY: KEY,
    })
    expect(url).toBeNull()
    expect(error).toMatch(/VITE_SUPABASE_URL/)
  })

  it('ignores whitespace pasted around the values', () => {
    expect(
      readSupabaseConfig({
        VITE_SUPABASE_URL: ` ${URL}\n`,
        VITE_SUPABASE_ANON_KEY: `  ${KEY} `,
      }),
    ).toEqual({ url: URL, key: KEY, error: null })
  })
})
