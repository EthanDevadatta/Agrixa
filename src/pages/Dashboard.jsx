import { useEffect, useRef, useState } from 'react'
import Chart from 'chart.js/auto'
import firebase from 'firebase/compat/app'
import 'firebase/compat/database'
import { useI18n } from '../i18n/I18nProvider.jsx'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
}

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig)
}

const database = firebase.database()


function MetricCard({ title, value, status }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-left shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
      <div className="text-xs font-medium text-slate-600 dark:text-slate-300">{title}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-50">{value ?? '--'}</div>
      {status ? <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{status}</div> : null}
    </div>
  )
}

function ChartBox({ title, children }) {
  return (
    <div className="flex h-60 flex-col rounded-2xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
      <div className="mb-2 text-xs font-medium text-slate-700 dark:text-slate-200">{title}</div>
      <div className="relative h-44 w-full min-h-0">{children}</div>
    </div>
  )
}

function formatTime(ts, t) {
  if (!ts) return t('waitingForData')
  return ts.toLocaleString()
}

function statusKeyForTemperature(val) {
  if (val == null) return null
  if (val < 18) return 'statusTooCold'
  if (val <= 30) return 'statusOptimalTemp'
  return 'statusHeatStress'
}

function statusKeyForHumidity(val) {
  if (val == null) return null
  if (val < 40) return 'statusAirDry'
  if (val <= 70) return 'statusGoodHumidity'
  return 'statusHighHumidity'
}

function statusKeyForMoisture(val) {
  if (val == null) return null
  if (val < 30) return 'statusSoilDry'
  if (val <= 70) return 'statusSoilOptimal'
  return 'statusOverwatered'
}

function statusKeyForLight(val) {
  if (val == null) return null
  if (val < 30) return 'statusLowSun'
  if (val <= 70) return 'statusModerateSun'
  return 'statusHighSun'
}

function statusKeyForTds(val) {
  if (val == null) return null
  if (val < 300) return 'statusLowNutrients'
  if (val <= 800) return 'statusOptimalNutrients'
  return 'statusExcessFertilizer'
}

function computeGrowthIndex({ temperature, humidity, moisture, light, tds }) {
  let score = 0
  let possible = 0

  function scoreRange(value, min, max) {
    if (value == null) return
    possible += 1
    if (value >= min && value <= max) score += 1
  }

  scoreRange(temperature, 20, 30)
  scoreRange(humidity, 40, 70)
  scoreRange(moisture, 40, 70)
  scoreRange(light, 40, 70)
  scoreRange(tds, 300, 800)

  if (!possible) return null
  return Math.round((score / possible) * 100)
}

function growthSummaryKey(idx) {
  if (idx == null) return 'waitingForSensorData'
  if (idx >= 80) return 'growthExcellent'
  if (idx >= 60) return 'growthGood'
  if (idx >= 40) return 'growthAverage'
  return 'growthPoor'
}

function irrigationAdviceKey(moisture) {
  if (moisture == null) return 'waitingForMoisture'
  if (moisture < 30) return 'irrigationSoon'
  if (moisture <= 70) return 'irrigationNotNeeded'
  return 'irrigationDelay'
}

function diseaseRiskKey(humidity, light) {
  if (humidity == null || light == null) return 'waitingForHumidityLight'
  if (humidity > 80 && light < 40) return 'diseaseHighRisk'
  if (humidity > 70) return 'diseaseModerateRisk'
  return 'diseaseLowRisk'
}

function formatWeatherCode(code, fallbackText) {
  if (code == null) return fallbackText
  const map = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast'
  }
  return map[code] ?? code
}

export default function Dashboard() {
  const { t } = useI18n()
  const [metrics, setMetrics] = useState({
    temperature: null,
    humidity: null,
    moisture: null,
    light: null,
    tds: null,
  })
  const [lastUpdated, setLastUpdated] = useState(null)

  const [weatherLocation, setWeatherLocation] = useState('')
  const [weatherLoading, setWeatherLoading] = useState(false)
  const [weather, setWeather] = useState(null)
  const [weatherError, setWeatherError] = useState('')

  const tempCanvasRef = useRef(null)
  const moistCanvasRef = useRef(null)
  const lightCanvasRef = useRef(null)
  const tdsCanvasRef = useRef(null)
  const chartsRef = useRef({})
  const prevMetricsRef = useRef(null)

  useEffect(() => {
    function createChart(ctx, label, color) {
      if (!ctx) return null
      return new Chart(ctx, {
        type: 'line',
        data: {
          labels: ['—'],
          datasets: [
            {
              label,
              data: [0],
              borderColor: color,
              backgroundColor: color + '20',
              fill: true,
              borderWidth: 2,
              tension: 0.3,
              pointRadius: 2,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { intersect: false, mode: 'index' },
          plugins: {
            legend: {
              labels: { color: '#e5e7eb', boxWidth: 12 },
            },
          },
          scales: {
            x: {
              ticks: { color: '#9ca3af', maxRotation: 45, maxTicksLimit: 8 },
              grid: { color: 'rgba(148, 163, 184, 0.2)' },
            },
            y: {
              beginAtZero: false,
              grace: '15%',
              ticks: { color: '#9ca3af', maxTicksLimit: 6 },
              grid: { color: 'rgba(148, 163, 184, 0.2)' },
            },
          },
        },
      })
    }

    const id = requestAnimationFrame(() => {
      chartsRef.current.temp = createChart(tempCanvasRef.current, 'Temperature °C', '#ef4444')
      chartsRef.current.moist = createChart(moistCanvasRef.current, 'Soil Moisture %', '#3b82f6')
      chartsRef.current.light = createChart(lightCanvasRef.current, 'Light %', '#eab308')
      chartsRef.current.tds = createChart(tdsCanvasRef.current, 'Nutrients ppm', '#22c55e')
    })

    function updateChart(chart, value, time) {
      if (!chart) return
      const labels = chart.data.labels
      const data = chart.data.datasets[0].data
      if (labels.length === 1 && labels[0] === '—') {
        labels[0] = time
        data[0] = value
      } else {
        labels.push(time)
        data.push(value)
        if (labels.length > 20) {
          labels.shift()
          data.shift()
        }
      }
      chart.update('none')
    }

    const ref = database.ref('CropData')

    const handler = (snapshot) => {
      const data = snapshot.val() || {}
      const temperature = Number(data.Temperature ?? NaN)
      const humidity = Number(data.Humidity ?? NaN)
      const moisture = Number(data.Moisture ?? NaN)
      const light = Number(data.Light ?? NaN)
      const tds = Number(data.TDS ?? NaN)

      const nextMetrics = {
        temperature: Number.isFinite(temperature) ? temperature : null,
        humidity: Number.isFinite(humidity) ? humidity : null,
        moisture: Number.isFinite(moisture) ? moisture : null,
        light: Number.isFinite(light) ? light : null,
        tds: Number.isFinite(tds) ? tds : null,
      }

      const prev = prevMetricsRef.current
      const isChanged = !prev || 
          prev.temperature !== nextMetrics.temperature ||
          prev.humidity !== nextMetrics.humidity ||
          prev.moisture !== nextMetrics.moisture ||
          prev.light !== nextMetrics.light ||
          prev.tds !== nextMetrics.tds

      if (!isChanged) {
        return // No actual data change, ignore this Firebase update event
      }

      prevMetricsRef.current = nextMetrics

      setMetrics(nextMetrics)
      
      const updateTime = new Date()
      setLastUpdated(updateTime)

      const label = updateTime.toLocaleTimeString()
      if (nextMetrics.temperature != null) updateChart(chartsRef.current.temp, nextMetrics.temperature, label)
      if (nextMetrics.moisture != null) updateChart(chartsRef.current.moist, nextMetrics.moisture, label)
      if (nextMetrics.light != null) updateChart(chartsRef.current.light, nextMetrics.light, label)
      if (nextMetrics.tds != null) updateChart(chartsRef.current.tds, nextMetrics.tds, label)
    }

    ref.on('value', handler)

    return () => {
      cancelAnimationFrame(id)
      ref.off('value', handler)
      Object.values(chartsRef.current).forEach((chart) => {
        if (chart) chart.destroy()
      })
    }
  }, [])

  const growthIndex = computeGrowthIndex(metrics)
  const growthText = t(growthSummaryKey(growthIndex))
  const irrigationText = t(irrigationAdviceKey(metrics.moisture))
  const diseaseRiskText = t(diseaseRiskKey(metrics.humidity, metrics.light))

  async function handleCheckWeather() {
    const loc = weatherLocation.trim()
    if (!loc) {
      setWeatherError(t('weatherLocationRequired'))
      return
    }
    try {
      setWeatherLoading(true)
      setWeather(null)
      setWeatherError('')
      const baseUrl = import.meta.env.VITE_DISEASE_API ?? 'http://localhost:8000'
      const res = await fetch(`${baseUrl}/api/weather?location=${encodeURIComponent(loc)}`)
      const data = await res.json()

      if (!res.ok || data?.error) {
        setWeatherError(data?.error || t('rainFetchError'))
        setWeather(null)
        return
      }

      setWeather({
        location: data.location || loc,
        precipitation: data.precipitation,
        wind_speed: data.wind_speed,
        weather_code: data.weather_code,
      })
    } catch {
      setWeatherError(t('rainFetchError'))
      setWeather(null)
    } finally {
      setWeatherLoading(false)
    }
  }

  return (
    <div className="space-y-6 rounded-3xl border border-slate-200 bg-white px-5 py-6 shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50">
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500/10 via-emerald-400/5 to-transparent dark:from-emerald-500/20 dark:via-emerald-400/10">
        <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-emerald-400 sm:text-2xl">
              {t('dashboardTitle')}
            </h1>
            <p className="mt-2 max-w-xl text-sm text-slate-600 dark:text-slate-300">
              {t('dashboardSubtitle')}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-slate-200/60 bg-white/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/80">
            <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
              {t('lastUpdate')}: {lastUpdated ? formatTime(lastUpdated, t) : t('waitingForData')}
            </span>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard
          title={t('temperature')}
          value={metrics.temperature != null ? `${metrics.temperature} °C` : '-- °C'}
          status={statusKeyForTemperature(metrics.temperature) ? t(statusKeyForTemperature(metrics.temperature)) : null}
        />
        <MetricCard
          title={t('humidity')}
          value={metrics.humidity != null ? `${metrics.humidity} %` : '-- %'}
          status={statusKeyForHumidity(metrics.humidity) ? t(statusKeyForHumidity(metrics.humidity)) : null}
        />
        <MetricCard
          title={t('soilMoisture')}
          value={metrics.moisture != null ? `${metrics.moisture} %` : '-- %'}
          status={statusKeyForMoisture(metrics.moisture) ? t(statusKeyForMoisture(metrics.moisture)) : null}
        />
        <MetricCard
          title={t('light')}
          value={metrics.light != null ? `${metrics.light} %` : '-- %'}
          status={statusKeyForLight(metrics.light) ? t(statusKeyForLight(metrics.light)) : null}
        />
        <MetricCard
          title={t('nutrientsTds')}
          value={metrics.tds != null ? `${metrics.tds} ppm` : '-- ppm'}
          status={statusKeyForTds(metrics.tds) ? t(statusKeyForTds(metrics.tds)) : null}
        />
      </section>

      <section className="space-y-4 rounded-3xl bg-transparent">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">{t('cropConditionTrends')}</h2>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              {t('cropTrendsSubtitle')}
            </p>
          </div>
        </div>

        <div className="grid gap-3 text-xs md:grid-cols-3">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 px-4 py-3 dark:border-emerald-700/50 dark:bg-emerald-900/40">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
              {t('plantGrowthIndex')}
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <div className="text-2xl font-semibold">
                {growthIndex != null ? `${growthIndex}%` : '--'}
              </div>
            </div>
            <div className="mt-1 text-[11px] text-emerald-800 dark:text-emerald-100">{growthText}</div>
          </div>

          <div className="rounded-2xl border border-sky-200 bg-sky-50/60 px-4 py-3 dark:border-sky-700/50 dark:bg-sky-900/30">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-200">
              {t('irrigationRecommendation')}
            </div>
            <div className="mt-2 text-[11px] text-sky-800 dark:text-sky-50">{irrigationText}</div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50/60 px-4 py-3 dark:border-amber-700/50 dark:bg-amber-900/30">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-200">
              {t('humidityDiseaseRisk')}
            </div>
            <div className="mt-2 text-[11px] text-amber-800 dark:text-amber-50">{diseaseRiskText}</div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <ChartBox title={`${t('temperature')} °C`}>
            <canvas ref={tempCanvasRef} className="block size-full" />
          </ChartBox>
          <ChartBox title={`${t('soilMoisture')} %`}>
            <canvas ref={moistCanvasRef} className="block size-full" />
          </ChartBox>
          <ChartBox title={`${t('light')} %`}>
            <canvas ref={lightCanvasRef} className="block size-full" />
          </ChartBox>
          <ChartBox title={`${t('nutrientsTds')} ppm`}>
            <canvas ref={tdsCanvasRef} className="block size-full" />
          </ChartBox>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-900/80">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200">
                🌤 {t('weatherConditions')}
              </h3>
              <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
                {t('weatherConditionsSubtitle')}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                type="text"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 sm:w-48"
                placeholder={t('weatherLocationPlaceholder')}
                value={weatherLocation}
                onChange={(e) => setWeatherLocation(e.target.value)}
              />
              <button
                type="button"
                onClick={handleCheckWeather}
                disabled={weatherLoading}
                className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-500 dark:hover:bg-emerald-600"
              >
                {weatherLoading ? t('checking') : t('checkWeather')}
              </button>
            </div>
          </div>
          {weatherError ? (
            <div className="mt-3 text-xs font-medium text-rose-600 dark:text-rose-400">
              {weatherError}
            </div>
          ) : weather ? (
            <div className="mt-3 space-y-1 rounded-xl border border-sky-200/60 bg-sky-50/60 p-3 text-xs text-slate-800 dark:border-sky-700/60 dark:bg-sky-900/30 dark:text-slate-100">
              <div className="font-semibold text-slate-900 dark:text-slate-50">
                {t('weatherSectionTitle')} {weather.location}
              </div>
              <div className="grid gap-1 sm:grid-cols-3">
                <div>
                  <span className="text-slate-600 dark:text-slate-400">{t('weatherRainfall')}:</span>{' '}
                  {typeof weather.precipitation === 'number'
                    ? `${weather.precipitation.toFixed(1)} mm`
                    : t('weatherValueUnknown')}
                </div>
                <div>
                  <span className="text-slate-600 dark:text-slate-400">{t('weatherWindSpeed')}:</span>{' '}
                  {typeof weather.wind_speed === 'number'
                    ? `${weather.wind_speed.toFixed(1)} m/s`
                    : t('weatherValueUnknown')}
                </div>
                <div>
                  <span className="text-slate-600 dark:text-slate-400">{t('weatherCode')}:</span>{' '}
                  {formatWeatherCode(weather.weather_code, t('weatherValueUnknown'))}
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-3 text-[11px] text-slate-600 dark:text-slate-400">
              {t('weatherHint')}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

