import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import { motion } from 'framer-motion'
import Spinner from './components/Spinner'
import Toast from './components/Toast'
import './App.css'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000'
const OWM_KEY = import.meta.env.VITE_OWM_KEY || '0143d80dca16d7cf3426bcbbbeb3fccc'

const defaultMarker = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

const popularCities = ['Delhi', 'Mumbai', 'Bengaluru', 'Chennai', 'Kolkata', 'Hyderabad']

function Navbar() {
  const [healthy, setHealthy] = useState(null)
  useEffect(() => {
    let alive = true
    const check = async () => {
      try {
        await axios.get(`${API_BASE}/health`, { timeout: 5000 })
        if (alive) setHealthy(true)
      } catch {
        if (alive) setHealthy(false)
      }
    }
    check()
    const id = setInterval(check, 10000)
    return () => { alive = false; clearInterval(id) }
  }, [])

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
        <Link to="/" className="text-xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-emerald-500 to-purple-600">
          AeroSense
        </Link>
        <div className="flex items-center gap-2 text-slate-700">
          <span title={healthy ? 'API healthy' : healthy === false ? 'API unreachable' : 'Checking...'} className={`inline-flex h-2.5 w-2.5 rounded-full ${healthy == null ? 'bg-slate-300' : healthy ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
          <Link to="/" className="px-3 py-1.5 rounded-md hover:bg-slate-100">Home</Link>
          <Link to="/citizen" className="px-3 py-1.5 rounded-md hover:bg-slate-100">Citizen</Link>
          <Link to="/policymaker" className="px-3 py-1.5 rounded-md hover:bg-slate-100">Policymaker</Link>
          <a href="#about" className="px-3 py-1.5 rounded-md hover:bg-slate-100">About</a>
          <a href="#contact" className="px-3 py-1.5 rounded-md hover:bg-slate-100">Contact</a>
        </div>
      </div>
    </nav>
  )
}

function Home() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <div className="grid md:grid-cols-2 gap-8 items-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-emerald-500 to-purple-600">AeroSense</span>
            <span className="text-slate-900"> – AI-Powered Urban Air Pollution Awareness</span>
          </h1>
          <p className="mt-4 text-slate-600">
            Real-time AQI, AI forecasts, and actionable insights for citizens and policymakers.
          </p>
          <div className="mt-6 flex gap-3">
            <Link to="/citizen" className="px-5 py-2.5 rounded-md bg-gradient-to-r from-blue-600 to-emerald-500 text-white shadow hover:opacity-95">Citizen Dashboard</Link>
            <Link to="/policymaker" className="px-5 py-2.5 rounded-md bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow hover:opacity-95">Policymaker Dashboard</Link>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.1 }} className="rounded-xl border p-6 bg-gradient-to-br from-white to-slate-50 shadow">
          <h2 className="text-lg font-semibold mb-2">Live AQI</h2>
          <p className="text-slate-600">Use the dashboards to view real-time data and forecasts.</p>
        </motion.div>
      </div>

      <section id="about" className="mt-16">
        <h3 className="text-2xl font-bold">About</h3>
        <p className="mt-2 text-slate-600">AeroSense aggregates air quality data and uses AI to forecast pollution trends.</p>
      </section>

      <section id="contact" className="mt-12">
        <h3 className="text-2xl font-bold">Contact</h3>
        <p className="mt-2 text-slate-600">Reach us at contact@aerosense.example</p>
      </section>
    </div>
  )
}

function StatCard({ title, value, suffix }) {
  return (
    <motion.div layout whileHover={{ scale: 1.02 }} className="rounded-lg p-[1px] bg-gradient-to-r from-blue-500 via-emerald-400 to-purple-500">
      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <p className="text-sm text-slate-500">{title}</p>
        <p className="mt-1 text-2xl font-semibold text-slate-900">{value}{suffix ? ` ${suffix}` : ''}</p>
      </div>
    </motion.div>
  )
}

function CitizenDashboard() {
  const [city, setCity] = useState('Delhi')
  const [aqiData, setAqiData] = useState([])
  const [summary, setSummary] = useState(null)
  const [forecast, setForecast] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setError('')
      setLoading(true)
      try {
        const aqiParams = { city, limit: 100 }
        if (OWM_KEY) aqiParams.owmKey = OWM_KEY
        const [aqiRes, sumRes, fcRes] = await Promise.all([
          axios.get(`${API_BASE}/api/aqi`, { params: aqiParams }),
          axios.post(`${API_BASE}/api/summary`, { city }),
          axios.post(`${API_BASE}/api/forecast`, { city }),
        ])
        if (cancelled) return
        setAqiData(Array.isArray(aqiRes.data?.results) ? aqiRes.data.results : [])
        setSummary(sumRes.data)
        setForecast(Array.isArray(fcRes.data?.points) ? fcRes.data.points : [])
      } catch (e) {
        if (cancelled) return
        console.error('AQI load error:', e)
        setError('Failed to load data. Ensure backend is running (4000) and API keys are set.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [city])

  const latest = useMemo(() => aqiData[0] || null, [aqiData])

  const pm25 = useMemo(() => {
    const pm = aqiData.find(m => m.parameter?.toLowerCase() === 'pm25')
    return pm?.value ?? '-'
  }, [aqiData])

  const pm10 = useMemo(() => {
    const pm = aqiData.find(m => m.parameter?.toLowerCase() === 'pm10')
    return pm?.value ?? '-'
  }, [aqiData])

  const no2 = useMemo(() => {
    const v = aqiData.find(m => m.parameter?.toLowerCase() === 'no2')
    return v?.value ?? '-'
  }, [aqiData])

  const lineData = useMemo(() => {
    const points = aqiData
      .filter(m => m.parameter?.toLowerCase() === 'pm25')
      .slice(0, 24)
      .reverse()
    return {
      labels: points.map(p => new Date(p.date?.utc || p.date?.local || Date.now()).toLocaleTimeString()),
      datasets: [
        {
          label: 'PM2.5 (µg/m³)',
          data: points.map(p => p.value),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.25)',
          tension: 0.35,
        },
      ],
    }
  }, [aqiData])

  const fcLine = useMemo(() => ({
    labels: forecast.map(p => `${p.hour}h`),
    datasets: [
      {
        label: 'Forecast PM2.5 (µg/m³)',
        data: forecast.map(p => p.pm25),
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.25)',
        tension: 0.35,
      },
    ],
  }), [forecast])

  const markers = useMemo(() => aqiData
    .filter(m => m.coordinates && typeof m.coordinates.latitude === 'number' && typeof m.coordinates.longitude === 'number')
    .slice(0, 50), [aqiData])

  const mapCenter = useMemo(() => {
    if (markers.length > 0) {
      return [markers[0].coordinates.latitude, markers[0].coordinates.longitude]
    }
    return [28.6139, 77.2090]
  }, [markers])

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-end gap-3">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-emerald-500 to-purple-600">Citizen Dashboard</h1>
        <div className="ml-auto relative">
          <label className="text-sm text-slate-600 mr-2">City</label>
          <input
            value={city}
            onChange={e => { setCity(e.target.value); setShowSuggestions(true) }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            className="rounded-md border px-3 py-1.5 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Search city"
          />
          {showSuggestions && (
            <div className="absolute z-10 mt-1 w-56 rounded-md border bg-white shadow">
              {popularCities.filter(c => c.toLowerCase().includes(city.toLowerCase())).map(c => (
                <button key={c} className="block w-full text-left px-3 py-1.5 hover:bg-slate-50 text-sm" onClick={() => setCity(c)}>
                  {c}
        </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {error && <div className="mt-3"><Toast type="error" message={error} /></div>}
      {loading && <div className="mt-3"><Spinner label="Loading latest measurements..." /></div>}

      <motion.div layout className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="PM2.5" value={pm25} suffix="µg/m³" />
        <StatCard title="PM10" value={pm10} suffix="µg/m³" />
        <StatCard title="NO₂" value={no2} suffix="µg/m³" />
        <StatCard title="Latest" value={latest?.parameter ? `${latest.parameter} ${latest.value}` : '-'} />
      </motion.div>

      <div className="mt-6 grid md:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="rounded-lg border bg-gradient-to-br from-white to-sky-50 p-4 shadow">
          <h2 className="text-lg font-semibold">PM2.5 – Last 24 readings</h2>
          <div className="mt-3">
            <Line data={lineData} options={{ responsive: true, plugins: { legend: { display: true } } }} />
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="rounded-lg border bg-gradient-to-br from-white to-emerald-50 p-4 shadow">
          <h2 className="text-lg font-semibold">Forecast – Next 24h</h2>
          <div className="mt-3">
            <Line data={fcLine} options={{ responsive: true, plugins: { legend: { display: true } } }} />
          </div>
        </motion.div>
      </div>

      <div className="mt-6 grid md:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="md:col-span-2 rounded-lg border bg-gradient-to-br from-white to-indigo-50 p-4 shadow">
          <h2 className="text-lg font-semibold">Hotspots Map</h2>
          <div className="mt-3 h-[420px] overflow-hidden rounded-md">
            <MapContainer center={mapCenter} zoom={10} scrollWheelZoom={false} className="h-full w-full">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {markers.map((m, idx) => (
                <Marker key={idx} position={[m.coordinates.latitude, m.coordinates.longitude]} icon={defaultMarker}>
                  <Popup>
                    <div className="text-sm">
                      <p className="font-semibold">{m.parameter?.toUpperCase()} {m.value} {m.unit}</p>
                      <p className="text-slate-600">{m.location}</p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="rounded-lg border bg-gradient-to-br from-white to-fuchsia-50 p-4 shadow">
          <h2 className="text-lg font-semibold">Health Advisory</h2>
          <p className="mt-2 text-slate-700">{summary?.summary || '—'}</p>
          <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">Risk: {summary?.riskLevel || '—'}</p>
        </motion.div>
      </div>
    </div>
  )
}

function PolicymakerDashboard() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500">Policymaker Dashboard</h1>
      <p className="mt-2 text-slate-600">Data integration, impact analytics, and AI insights coming up.</p>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/citizen" element={<CitizenDashboard />} />
          <Route path="/policymaker" element={<PolicymakerDashboard />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
