export const crops = [
  {
    id: 'rice',
    name: 'Rice',
    ideal: { tempC: [20, 35], humidityPct: [60, 90], soilMoisturePct: [55, 85], pH: [5.5, 7.0] },
    soils: ['Clay loam', 'Loam'],
    notes: 'Prefers warm, humid conditions and higher water availability.',
  },
  {
    id: 'wheat',
    name: 'Wheat',
    ideal: { tempC: [12, 25], humidityPct: [35, 65], soilMoisturePct: [30, 55], pH: [6.0, 7.5] },
    soils: ['Loam', 'Clay loam'],
    notes: 'Does better with cooler temperatures and moderate moisture.',
  },
  {
    id: 'maize',
    name: 'Maize (Corn)',
    ideal: { tempC: [18, 32], humidityPct: [45, 75], soilMoisturePct: [35, 65], pH: [5.8, 7.2] },
    soils: ['Loam', 'Sandy loam'],
    notes: 'Warm season crop; avoid waterlogging.',
  },
  {
    id: 'cotton',
    name: 'Cotton',
    ideal: { tempC: [20, 35], humidityPct: [30, 60], soilMoisturePct: [25, 45], pH: [5.5, 8.0] },
    soils: ['Sandy loam', 'Loam'],
    notes: 'Likes warmth and sun; too much humidity increases disease risk.',
  },
  {
    id: 'soybean',
    name: 'Soybean',
    ideal: { tempC: [18, 30], humidityPct: [45, 75], soilMoisturePct: [35, 60], pH: [6.0, 7.5] },
    soils: ['Loam', 'Sandy loam'],
    notes: 'Legume; does well with good drainage and moderate moisture.',
  },
  {
    id: 'chickpea',
    name: 'Chickpea',
    ideal: { tempC: [15, 28], humidityPct: [25, 55], soilMoisturePct: [20, 45], pH: [6.0, 8.0] },
    soils: ['Sandy loam', 'Loam'],
    notes: 'Tolerates drier conditions; avoid very high humidity.',
  },
  {
    id: 'tomato',
    name: 'Tomato',
    ideal: { tempC: [18, 30], humidityPct: [40, 70], soilMoisturePct: [35, 65], pH: [5.8, 7.0] },
    soils: ['Loam', 'Sandy loam'],
    notes: 'Needs consistent moisture; too much humidity can cause fungal issues.',
  },
]

