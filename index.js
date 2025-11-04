const express = require('express');
const axios = require('axios');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Simple request logger for debugging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${ms}ms)`);
  });
  next();
});

const PORT = process.env.PORT || 4000;
const OPENAQ_API_KEY = process.env.OPENAQ_API_KEY || '';
const OWM_API_KEY_ENV = process.env.OPENWEATHERMAP_API_KEY || process.env.OWM_API_KEY || '';

// Health
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

async function fetchFromOpenAQ(city, limit, headers) {
  const url = 'https://api.openaq.org/v3/measurements';
  const params = {
    city,
    limit,
    parameter: ['pm25', 'pm10', 'no2'],
    sort: 'desc',
    order_by: 'datetime',
  };
  const { data } = await axios.get(url, { params, headers, timeout: 20000 });
  const items = Array.isArray(data?.results) ? data.results : Array.isArray(data?.data) ? data.data : [];
  return items.map((m) => ({
    parameter: m.parameter || m.pollutant || undefined,
    value: m.value,
    unit: m.unit,
    location: m.location || m.locationName || city,
    coordinates: m.coordinates || m.coordinate || { latitude: m.latitude, longitude: m.longitude },
    date: m.date || { utc: m.datetime ? new Date(m.datetime).toISOString() : undefined },
  }));
}

async function geocodeCityOWM(city, apiKey) {
  if (!apiKey) throw new Error('Missing OPENWEATHERMAP_API_KEY');
  const url = 'https://api.openweathermap.org/geo/1.0/direct';
  const { data } = await axios.get(url, { params: { q: city, limit: 1, appid: apiKey }, timeout: 15000 });
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('City not found');
  }
  const { lat, lon, name, country, state } = data[0];
  return { lat, lon, label: [name, state, country].filter(Boolean).join(', ') };
}

async function fetchFromOWM(city, limit, apiKey) {
  const geo = await geocodeCityOWM(city, apiKey);
  const url = 'https://api.openweathermap.org/data/2.5/air_pollution';
  const { data } = await axios.get(url, { params: { lat: geo.lat, lon: geo.lon, appid: apiKey }, timeout: 15000 });
  const list = Array.isArray(data?.list) ? data.list : [];
  const results = [];
  const first = list[0];
  if (first?.components) {
    const dt = first.dt ? new Date(first.dt * 1000).toISOString() : undefined;
    const components = first.components;
    const candidate = [
      { parameter: 'pm25', value: components.pm2_5, unit: 'µg/m³' },
      { parameter: 'pm10', value: components.pm10, unit: 'µg/m³' },
      { parameter: 'no2', value: components.no2, unit: 'µg/m³' },
    ];
    candidate.forEach(c => {
      if (typeof c.value === 'number') {
        results.push({
          parameter: c.parameter,
          value: c.value,
          unit: c.unit,
          location: geo.label,
          coordinates: { latitude: geo.lat, longitude: geo.lon },
          date: { utc: dt },
        });
      }
    });
  }
  return results.slice(0, limit);
}

// Fetch air quality data from OpenAQ v3 with fallback to OpenWeatherMap
app.get('/api/aqi', async (req, res) => {
  const { city = 'Delhi', limit = 50 } = req.query;
  const owmKeyFromClient = req.headers['x-owm-key'] || req.query.owmKey;
  const effectiveOwmKey = owmKeyFromClient || OWM_API_KEY_ENV;
  const headers = OPENAQ_API_KEY ? { 'X-API-Key': OPENAQ_API_KEY } : undefined;

  try {
    if (headers) {
      const results = await fetchFromOpenAQ(city, limit, headers);
      if (results.length > 0) return res.json({ results });
    }
    const owmResults = await fetchFromOWM(city, limit, effectiveOwmKey);
    return res.json({ results: owmResults });
  } catch (err) {
    try {
      const owmResults = await fetchFromOWM(city, limit, effectiveOwmKey);
      return res.json({ results: owmResults });
    } catch (err2) {
      const status = err2.response?.status || err.response?.status;
      const detail = err2.response?.data || err.response?.data || err2.message || err.message;
      return res.status(500).json({ error: 'Failed to fetch AQI', status, details: detail });
    }
  }
});

// Forecast stub
app.post('/api/forecast', async (req, res) => {
  try {
    const { city = 'Delhi' } = req.body || {};
    const points = Array.from({ length: 24 }, (_, i) => ({ hour: i, pm25: 60 + i }));
    res.json({ city, horizonHours: 24, points });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate forecast', details: err.message });
  }
});

// Summary stub
app.post('/api/summary', (req, res) => {
  const { city = 'Delhi' } = req.body || {};
  res.json({
    city,
    summary: `Air quality in ${city} is moderate. Limit prolonged outdoor exertion.`,
    riskLevel: 'moderate',
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`AeroSense backend listening on 0.0.0.0:${PORT}`);
});
