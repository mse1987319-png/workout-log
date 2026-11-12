import { LANGUAGES } from '../i18n/i18n'
import { useLanguage } from '../i18n/useLanguage'

// Two radio buttons, LT and EN. The choice is saved by the i18n store.
export default function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage()

  return (
    <fieldset className="lang-switch">
      <legend className="visually-hidden">{t('language.label')}</legend>
      {LANGUAGES.map((code) => (
        <label key={code} className="lang-option">
          <input
            type="radio"
            name="language"
            value={code}
            checked={language === code}
            onChange={() => setLanguage(code)}
          />
          {code.toUpperCase()}
        </label>
      ))}
    </fieldset>
  )
}
