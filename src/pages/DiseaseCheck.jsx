import { useMemo, useState } from 'react'
import { useI18n } from '../i18n/I18nProvider.jsx'

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/60 bg-slate-50/80 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800/60">
      <div className="text-xs text-slate-600 dark:text-slate-400">{label}</div>
      <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">{value}</div>
    </div>
  )
}

export default function DiseaseCheck() {
  const { t, lang } = useI18n()
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [crop, setCrop] = useState('auto') // 'auto' | 'Rice' | 'Wheat' | 'SugarCane'

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : ''), [file])

  async function onAnalyze() {
    setError('')
    setResult(null)
    if (!file) return
    setBusy(true)
    try {
      const formData = new FormData()
      formData.append('image', file)

      const baseUrl = import.meta.env.VITE_DISEASE_API ?? 'http://localhost:8000'
      const cropParam = crop === 'auto' ? '' : `?crop=${encodeURIComponent(crop)}`
      const res = await fetch(`${baseUrl}/predict${cropParam}`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) throw new Error('Prediction API error')

      const data = await res.json()

      // If backend sends a structured error, surface it to the user
      if (data?.error) {
        setError(data.error)
        return
      }

      const uiLabel = lang === 'hi' ? data.label_hi : data.label_en
      const uiTip = lang === 'hi' ? data.tip_hi : data.tip_en

      setResult({
        label: uiLabel,
        confidencePct: Math.round((data.confidence ?? 0) * 100),
        tip: uiTip,
        rawLabel: data.raw_label,
      })
    } catch (e) {
      setError(t('analyzeError'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-emerald-100/80 bg-white/90 p-6 shadow-sm shadow-emerald-500/5 dark:border-slate-700 dark:bg-slate-900/80 dark:shadow-none">
        <div className="mb-1 text-base font-semibold tracking-tight text-slate-800 dark:text-slate-100">
          {t('diseaseTitle')}
        </div>
        <div className="text-sm text-slate-600 dark:text-slate-400">
          {t('diseaseSubtitle')}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200/60 bg-slate-50/50 p-5 dark:border-slate-700 dark:bg-slate-800/40">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('uploadPhoto')}</label>
            <input
              type="file"
              accept="image/*"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-emerald-500"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null
                setFile(f)
                setResult(null)
                setError('')
              }}
            />

            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="crop">
                {t('cropType')}
              </label>
              <select
                id="crop"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-emerald-500"
                value={crop}
                onChange={(e) => setCrop(e.target.value)}
              >
                <option value="auto">{t('cropAuto')}</option>
                <option value="Rice">{t('cropRice')}</option>
                <option value="Wheat">{t('cropWheat')}</option>
                <option value="SugarCane">{t('cropSugarcane')}</option>
              </select>
            </div>

            <button
              className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-500 dark:hover:bg-emerald-600"
              disabled={!file || busy}
              onClick={onAnalyze}
            >
              {busy ? t('analyzing') : t('analyzeImage')}
            </button>

            {error ? <div className="mt-3 text-sm font-medium text-rose-600 dark:text-rose-400">{error}</div> : null}

            <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              {t('tipLighting')}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/60 bg-slate-50/50 p-5 dark:border-slate-700 dark:bg-slate-800/40">
            <div className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('preview')}</div>
            <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200/60 bg-slate-100/80 dark:border-slate-600 dark:bg-slate-800/60">
              {previewUrl ? (
                // eslint-disable-next-line jsx-a11y/img-redundant-alt
                <img src={previewUrl} alt="Uploaded plant photo preview" className="h-72 w-full object-cover" />
              ) : (
                <div className="grid h-72 place-items-center text-sm text-slate-500 dark:text-slate-400">
                  {t('noImageSelected')}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-emerald-100/80 bg-white/90 p-6 shadow-sm shadow-emerald-500/5 dark:border-slate-700 dark:bg-slate-900/80 dark:shadow-none">
        <div className="mb-1 text-base font-semibold tracking-tight text-slate-800 dark:text-slate-100">
          {t('result')}
        </div>
        <div className="text-sm text-slate-600 dark:text-slate-400">{t('replaceDemoLater')}</div>

        {result ? (
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-emerald-200/60 bg-emerald-50/60 p-5 dark:border-emerald-800/50 dark:bg-emerald-900/30">
              <div className="text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                {t('prediction')}
              </div>
              <div className="mt-2 text-lg font-semibold leading-snug text-slate-900 dark:text-slate-50">
                {result.label}
              </div>
              <div className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                {t('confidenceDemo')}: <span className="font-semibold text-emerald-700 dark:text-emerald-400">{result.confidencePct}%</span>
              </div>
              <div className="mt-4 rounded-xl border border-emerald-200/40 bg-white/80 p-4 text-sm text-slate-700 dark:border-emerald-800/40 dark:bg-slate-900/50 dark:text-slate-300">
                <div className="font-semibold text-slate-800 dark:text-slate-100">{t('whatYouCanDo')}</div>
                <div className="mt-2 leading-relaxed">{result.tip}</div>
              </div>
              <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                {t('modelNote')}: <span className="font-mono text-slate-700 dark:text-slate-300">{result.rawLabel}</span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/60 bg-slate-50/50 p-5 dark:border-slate-700 dark:bg-slate-800/40">
              <div className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('modelDetails')}</div>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <InfoRow label={t('modelRawLabel')} value={result.rawLabel} />
                <InfoRow label={t('modelConfidence')} value={`${result.confidencePct}%`} />
              </div>
              <div className="mt-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{t('modelDisclaimer')}</div>
            </div>
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-slate-200/60 bg-slate-50/80 p-5 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-400">
            {t('uploadAndAnalyzeHint')}
          </div>
        )}
      </div>
    </div>
  )
}

