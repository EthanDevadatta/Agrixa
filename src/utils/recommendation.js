import { crops } from '../mock/cropsDb.js'

const clamp01 = (n) => Math.max(0, Math.min(1, n))

function rangeScore(value, [min, max]) {
  if (value == null || Number.isNaN(value)) return 0
  if (value >= min && value <= max) return 1
  if (value < min) return clamp01(1 - (min - value) / (max - min + 0.0001))
  return clamp01(1 - (value - max) / (max - min + 0.0001))
}

/**
 * Recommends crops from live readings (temperature, humidity, soil moisture).
 * pH and soil type are not used (not in database).
 */
export function recommendCrops({ weather, soil }, topN = 3) {
  const temp = weather?.temperatureC
  const humidity = weather?.humidityPct
  const moisture = soil?.moisturePct

  const scored = crops.map((c) => {
    const sTemp = rangeScore(temp, c.ideal.tempC)
    const sHum = rangeScore(humidity, c.ideal.humidityPct)
    const sMoist = rangeScore(moisture, c.ideal.soilMoisturePct)

    const score = 0.35 * sTemp + 0.35 * sHum + 0.3 * sMoist

    const reasons = [
      { label: 'Temperature fit', value: sTemp },
      { label: 'Humidity fit', value: sHum },
      { label: 'Soil moisture fit', value: sMoist },
    ]
      .sort((a, b) => b.value - a.value)
      .slice(0, 3)
      .map((r) => r.label)

    return {
      crop: c,
      score,
      confidencePct: Math.round(score * 100),
      reasons,
    }
  })

  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, topN)
}

