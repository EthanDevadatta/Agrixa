import { NavLink, Route, Routes } from 'react-router-dom'

function AppIcon({ className }) {
  return (
    <img src="/icon.jpeg" className={className} alt="Agrixa Logo" />
  )
}
import Dashboard from './pages/Dashboard.jsx'
import Crops from './pages/Crops.jsx'
import DiseaseCheck from './pages/DiseaseCheck.jsx'
import { useI18n } from './i18n/I18nProvider.jsx'
import { useTheme } from './theme/ThemeProvider.jsx'

function App() {
  const { lang, setLanguage, t, languages } = useI18n()
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white text-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-10 border-b border-emerald-100 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="shrink-0 h-10 w-10 rounded-xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800">
              <AppIcon className="h-full w-full object-cover" />
            </div>
            <div>
              <div className="text-sm font-semibold leading-tight">{t('appName')}</div>
              <div className="text-xs text-slate-600 dark:text-slate-400">{t('appTagline')}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <nav className="hidden items-center gap-2 text-sm md:flex">
              <NavItem to="/">{t('navDashboard')}</NavItem>
              <NavItem to="/crops">{t('navCrops')}</NavItem>
              <NavItem to="/disease">{t('navDisease')}</NavItem>
            </nav>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleTheme}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:focus:ring-emerald-500/50"
                title={theme === 'light' ? t('switchToDark') : t('switchToLight')}
                aria-label={theme === 'light' ? t('switchToDark') : t('switchToLight')}
              >
                {theme === 'light' ? (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                )}
              </button>
              <label className="hidden text-xs text-slate-600 dark:text-slate-400 sm:block" htmlFor="lang">
                {t('language')}
              </label>
              <select
                id="lang"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-emerald-500 dark:focus:ring-emerald-500/30"
                value={lang}
                onChange={(e) => setLanguage(e.target.value)}
              >
                {languages.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-4 pb-3 md:hidden">
          <nav className="flex flex-wrap items-center gap-2 text-sm">
            <NavItem to="/">{t('navDashboard')}</NavItem>
            <NavItem to="/crops">{t('navCrops')}</NavItem>
            <NavItem to="/disease">{t('navDisease')}</NavItem>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-6">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/crops" element={<Crops />} />
          <Route path="/disease" element={<DiseaseCheck />} />
        </Routes>
      </main>
    </div>
  )
}

function NavItem({ to, children }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        [
          'rounded-full px-3 py-2 transition',
          isActive
            ? 'bg-emerald-600 text-white shadow-sm dark:bg-emerald-500'
            : 'text-slate-700 hover:bg-emerald-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100',
        ].join(' ')
      }
    >
      {children}
    </NavLink>
  )
}

export default App
