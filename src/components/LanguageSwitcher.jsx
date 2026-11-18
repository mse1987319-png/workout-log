import { useId } from 'react'
import { LANGUAGES } from '../i18n/i18n'
import { useLanguage } from '../i18n/useLanguage'

// Each language is named in itself, whatever language the screen is in.
const NAMES = { lt: 'Lietuvių', en: 'English' }

// Flags are drawn here rather than as emoji: Windows shows flag emoji as
// two letters. Both fill the same small box (see .flag in index.css).
function LithuanianFlag() {
  return (
    <svg className="flag" viewBox="0 0 5 3" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <rect width="5" height="1" fill="#fdb913" />
      <rect y="1" width="5" height="1" fill="#006a44" />
      <rect y="2" width="5" height="1" fill="#c1272d" />
    </svg>
  )
}

// The Union flag, simplified the usual way for small sizes.
function EnglishFlag() {
  // A clip path needs an id that is unique on the page.
  const clip = `union-${useId().replace(/[^\w-]/g, '')}`
  return (
    <svg className="flag" viewBox="0 0 60 30" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <clipPath id={clip}>
        <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
      </clipPath>
      <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
      <path d="M0,0 L60,30 M60,0 L0,30" clipPath={`url(#${clip})`} stroke="#c8102e" strokeWidth="4" />
      <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
      <path d="M30,0 v30 M0,15 h60" stroke="#c8102e" strokeWidth="6" />
    </svg>
  )
}

const FLAGS = { lt: LithuanianFlag, en: EnglishFlag }

// Two radio buttons, shown as flags. The radios stay (hidden), so the switch
// works with the keyboard and a screen reader reads the language's name.
// The choice is saved by the i18n store.
export default function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage()

  return (
    <fieldset className="lang-switch">
      <legend className="visually-hidden">{t('language.label')}</legend>
      {LANGUAGES.map((code) => {
        const Flag = FLAGS[code]
        return (
          <label key={code} className="lang-option" title={NAMES[code]}>
            <input
              type="radio"
              className="visually-hidden"
              name="language"
              value={code}
              checked={language === code}
              onChange={() => setLanguage(code)}
            />
            <Flag />
            <span className="visually-hidden" lang={code}>
              {NAMES[code]}
            </span>
          </label>
        )
      })}
    </fieldset>
  )
}
