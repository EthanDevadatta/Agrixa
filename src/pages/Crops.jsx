import { useEffect, useMemo, useState } from 'react'
import firebase from 'firebase/compat/app'
import 'firebase/compat/database'
import { crops } from '../mock/cropsDb.js'
import { recommendCrops } from '../utils/recommendation.js'
import { useI18n } from '../i18n/I18nProvider.jsx'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
}
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig)
const database = firebase.database()

function Pill({ children }) {
  return (
    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200">
      {children}
    </span>
  )
}

function MetricRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/60 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/60">
      <div className="text-xs text-slate-600 dark:text-slate-400">{label}</div>
      <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">{value}</div>
    </div>
  )
}

export default function Crops() {
  const { t } = useI18n()
  const [readings, setReadings] = useState({
    temperature: null,
    humidity: null,
    moisture: null,
    light: null,
    tds: null,
  })

  useEffect(() => {
    const ref = database.ref('CropData')
    const handler = (snapshot) => {
      const data = snapshot.val() || {}
      setReadings({
        temperature: Number(data.Temperature) || null,
        humidity: Number(data.Humidity) || null,
        moisture: Number(data.Moisture) || null,
        light: Number(data.Light) || null,
        tds: Number(data.TDS) || null,
      })
    }
    ref.on('value', handler)
    return () => ref.off('value', handler)
  }, [])

  const snapshot = useMemo(
    () => ({
      weather: {
        temperatureC: readings.temperature ?? 0,
        humidityPct: readings.humidity ?? 0,
      },
      soil: {
        moisturePct: readings.moisture ?? 0,
      },
    }),
    [readings.temperature, readings.humidity, readings.moisture]
  )
  const recommendations = useMemo(() => recommendCrops(snapshot, 3), [snapshot])

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
        <div className="bg-gradient-to-br from-emerald-500/10 via-emerald-400/5 to-transparent dark:from-emerald-500/20 dark:via-emerald-400/10">
          <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-emerald-400 sm:text-2xl">
                {t('cropRecommendation')}
              </h1>
              <p className="mt-2 max-w-xl text-sm text-slate-600 dark:text-slate-300">
                {t('cropRecommendationSubtitle')}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <span className="inline-flex items-center gap-2 rounded-xl border border-slate-200/60 bg-white/80 px-3 py-2 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200">
                🌡 {readings.temperature != null ? `${readings.temperature}°C` : '—'}
              </span>
              <span className="inline-flex items-center gap-2 rounded-xl border border-slate-200/60 bg-white/80 px-3 py-2 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200">
                💧 {readings.moisture != null ? `${readings.moisture}%` : '—'}
              </span>
              <span className="inline-flex items-center gap-2 rounded-xl border border-slate-200/60 bg-white/80 px-3 py-2 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200">
                💨 {readings.humidity != null ? `${readings.humidity}%` : '—'}
              </span>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200/60 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-800/40">
              <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">{t('currentConditionsUsed')}</div>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <MetricRow
                  label={t('temperature')}
                  value={readings.temperature != null ? `${readings.temperature}°C` : '—'}
                />
                <MetricRow
                  label={t('humidity')}
                  value={readings.humidity != null ? `${readings.humidity}%` : '—'}
                />
                <MetricRow
                  label={t('soilMoisture')}
                  value={readings.moisture != null ? `${readings.moisture}%` : '—'}
                />
                <MetricRow
                  label={t('light')}
                  value={readings.light != null ? `${readings.light}%` : '—'}
                />
                <MetricRow
                  label={t('nutrientsTds')}
                  value={readings.tds != null ? `${readings.tds} ppm` : '—'}
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Pill>{t('light')}: {readings.light != null ? `${readings.light}%` : '—'}</Pill>
                <Pill>TDS: {readings.tds != null ? `${readings.tds} ppm` : '—'}</Pill>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/60 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-800/40">
              <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">{t('topRecommendations')}</div>
              <div className="mt-3 space-y-3">
                {recommendations.map((r) => (
                  <div key={r.crop.id} className="rounded-2xl border border-emerald-200/60 bg-emerald-50/40 p-4 dark:border-emerald-800/50 dark:bg-emerald-900/30">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{r.crop.name}</div>
                        <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">{r.crop.notes}</div>
                      </div>
                      <div className="rounded-xl bg-white px-3 py-2 text-right shadow-sm dark:bg-slate-900/80">
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">{t('match')}</div>
                        <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{r.confidencePct}%</div>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {r.reasons.map((reason) => (
                        <Pill key={reason}>{reason}</Pill>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                {t('ruleBasedDisclaimer')}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t('allCrops')}</div>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          {crops.map((c) => (
            <div key={c.id} className="rounded-2xl border border-slate-200/60 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-800/40">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{c.name}</div>
                  <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">{c.notes}</div>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  {c.soils.slice(0, 2).map((s) => (
                    <Pill key={s}>{s}</Pill>
                  ))}
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <MetricRow label={t('tempC')} value={`${c.ideal.tempC[0]}–${c.ideal.tempC[1]}`} />
                <MetricRow label={t('humidityPct')} value={`${c.ideal.humidityPct[0]}–${c.ideal.humidityPct[1]}`} />
                <MetricRow label={t('soilMoisturePct')} value={`${c.ideal.soilMoisturePct[0]}–${c.ideal.soilMoisturePct[1]}`} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

