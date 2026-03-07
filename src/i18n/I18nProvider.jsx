import { createContext, useContext, useMemo, useState } from 'react'
import { languages, translations } from './translations.js'

const I18nContext = createContext(null)

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(() => {
    const saved = localStorage.getItem('agri_lang')
    return saved && translations[saved] ? saved : 'en'
  })

  const value = useMemo(() => {
    function t(key) {
      const table = translations[lang] ?? translations.en
      return table[key] ?? translations.en[key] ?? key
    }

    function setLanguage(next) {
      setLang(next)
      try {
        localStorage.setItem('agri_lang', next)
      } catch {
        // ignore
      }
    }

    return { lang, setLanguage, t, languages }
  }, [lang])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider')
  return ctx
}

