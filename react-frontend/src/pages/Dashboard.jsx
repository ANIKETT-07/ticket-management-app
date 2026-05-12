import { useEffect, useState } from 'react'
import {
  Ticket, CheckCircle, Clock, AlertTriangle,
  TrendingUp, Star, Package, Filter, X,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts'
import * as api from '../api/client.js'
import MetricCard from '../components/MetricCard.jsx'
import SectionHeader from '../components/SectionHeader.jsx'
import Spinner from '../components/Spinner.jsx'

const PIE_COLORS    = ['#10b981','#94a3b8','#f97316','#ef4444']
const DAYS_OPTS     = [
  { label: 'All', val: null },
  { label: '7d',  val: 7 },
  { label: '14d', val: 14 },
  { label: '30d', val: 30 },
  { label: '90d', val: 90 },
]
const CHANNEL_OPTS  = ['All', 'chat', 'email', 'web']
const TOOLTIP_STYLE = { borderRadius: 10, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }

// Responsive chart height: shorter on small screens
function useChartH(sm = 200, lg = 280) {
  const [h, setH] = useState(window.innerWidth < 640 ? sm : lg)
  useEffect(() => {
    const fn = () => setH(window.innerWidth < 640 ? sm : lg)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [sm, lg])
  return h
}

// Custom radar tick that wraps long labels
function RadarTick({ payload, x, y, cx, cy }) {
  const words  = payload.value.split(' ')
  const anchor = x > cx ? 'start' : x < cx ? 'end' : 'middle'
  const dx     = x > cx ? 4 : x < cx ? -4 : 0
  return (
    <text x={x} y={y} dx={dx} textAnchor={anchor} fill="#64748b" fontSize={10}>
      {words.map((w, i) => (
        <tspan key={i} x={x} dx={dx} dy={i === 0 ? 0 : 13}>{w}</tspan>
      ))}
    </text>
  )
}

// Custom pie label that stays inside chart bounds
function PieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }) {
  if (percent < 0.05) return null
  const RADIAN = Math.PI / 180
  const r  = innerRadius + (outerRadius - innerRadius) * 0.6
  const x  = cx + r * Math.cos(-midAngle * RADIAN)
  const y  = cy + r * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central"
      fontSize={11} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

export default function Dashboard() {
  const [summary, setSummary]         = useState(null)
  const [cats, setCats]               = useState([])
  const [allCats, setAllCats]         = useState([])
  const [sentDist, setSentDist]       = useState([])
  const [products, setProducts]       = useState([])
  const [revenueRisk, setRevenueRisk] = useState([])
  const [countries, setCountries]     = useState([])
  const [topIssues, setTopIssues]     = useState([])
  const [loading, setLoading]         = useState(true)
  const [refreshing, setRefreshing]   = useState(false)
  const [error, setError]             = useState(null)

  const [days, setDays]         = useState(null)
  const [category, setCategory] = useState('')
  const [channel, setChannel]   = useState('')

  const barH    = useChartH(180, 280)
  const pieH    = useChartH(220, 280)
  const radarH  = useChartH(220, 260)
  const smallH  = useChartH(160, 220)

  useEffect(() => {
    api.getCategories().then(d => setAllCats((d.categories ?? []).map(c => c.category))).catch(() => {})
  }, [])

  useEffect(() => {
    const f = {
      category: category || undefined,
      days:     days     || undefined,
      channel:  channel  || undefined,
    }
    const isFirst = !summary
    if (isFirst) setLoading(true); else setRefreshing(true)

    Promise.all([
      api.getSummary(f),
      api.getCategories(f),
      api.getSentimentDist(f),
      api.getTopProducts(f),
      api.getRevenueRisk(f),
      api.getCountries(f),
      api.getTopIssues(f),
    ]).then(([s, c, sd, p, rr, co, ti]) => {
      setSummary(s)
      setCats((c.categories ?? []).slice(0, 8))
      setSentDist((sd.buckets ?? []).map(d => ({ name: d.label, value: d.count })))
      setProducts((p.products ?? []).slice(0, 8))
      setRevenueRisk(rr.items ?? [])
      setCountries(co.countries ?? [])
      setTopIssues(ti.issues ?? [])
      setError(null)
    }).catch(e => setError(String(e)))
      .finally(() => { setLoading(false); setRefreshing(false) })
  }, [days, category, channel])

  const hasFilters = !!category || days !== null || !!channel
  const clearAll   = () => { setDays(null); setCategory(''); setChannel('') }

  const radarData = cats.slice(0, 6).map(c => ({
    subject: c.category,
    Tickets: c.count,
    Risk:    Math.round((c.revenue_at_risk ?? 0) / 100),
  }))

  const resRate = summary?.total_tickets
    ? Math.round((summary.resolved_tickets / summary.total_tickets) * 100) : 0

  if (loading) return <Spinner />
  if (error)   return (
    <div className="card text-center py-12 text-rose-600">
      <AlertTriangle className="mx-auto mb-2" size={32} />
      <p>{error}</p>
      <p className="text-sm text-slate-400 mt-1">Make sure the backend is running on port 8000</p>
    </div>
  )

  return (
    <div className="space-y-5">
      {/* ── Header + filter bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">AI-powered support insights overview</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">
            <Filter size={13} className="text-brand-500" />
            <span className="text-xs font-semibold text-slate-500">
              {refreshing ? 'Updating…' : 'Filters'}
            </span>
          </div>

          {/* Date range */}
          <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
            {DAYS_OPTS.map(opt => (
              <button key={String(opt.val)} onClick={() => setDays(opt.val)}
                className={`px-2 py-1 rounded-lg text-xs font-semibold transition-colors
                  ${days === opt.val ? 'bg-brand-600 text-white' : 'text-slate-500 hover:bg-brand-50'}`}>
                {opt.label}
              </button>
            ))}
          </div>

          {/* Channel */}
          <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
            {CHANNEL_OPTS.map(ch => (
              <button key={ch} onClick={() => setChannel(ch === 'All' ? '' : ch)}
                className={`px-2 py-1 rounded-lg text-xs font-semibold transition-colors capitalize
                  ${(ch === 'All' ? !channel : channel === ch) ? 'bg-brand-600 text-white' : 'text-slate-500 hover:bg-brand-50'}`}>
                {ch}
              </button>
            ))}
          </div>

          {/* Category */}
          <select className="select text-xs shadow-sm max-w-[160px]" value={category}
            onChange={e => setCategory(e.target.value)}>
            <option value="">All Categories</option>
            {allCats.map(c => <option key={c}>{c}</option>)}
          </select>

          {hasFilters && (
            <button onClick={clearAll}
              className="flex items-center gap-1 text-xs font-semibold text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1.5 rounded-xl transition-colors">
              <X size={12} /> Clear all
            </button>
          )}
        </div>
      </div>


      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard label="Total Tickets"   value={summary?.total_tickets?.toLocaleString()}           icon={Ticket}        color="indigo" />
        <MetricCard label="Open"            value={summary?.open_tickets?.toLocaleString()}             icon={Clock}         color="amber" />
        <MetricCard label="Resolved"        value={summary?.resolved_tickets?.toLocaleString()}         icon={CheckCircle}   color="emerald" sub={`${resRate}% resolution rate`} />
        <MetricCard label="Today"           value={summary?.tickets_processed_today?.toLocaleString()}  icon={TrendingUp}    color="violet" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard label="Avg Sentiment"   value={summary?.avg_sentiment_score != null ? `${Number(summary.avg_sentiment_score).toFixed(2)} / 5` : '—'} icon={Star}          color="rose" />
        <MetricCard label="Revenue at Risk" value={summary?.total_revenue_at_risk != null ? `$${Number(summary.total_revenue_at_risk).toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '—'} icon={Package} color="sky" />
        <MetricCard label="Escalated"       value={summary?.escalated_tickets?.toLocaleString()}        icon={AlertTriangle} color="rose" />
        <MetricCard label="Escalation Rate" value={summary?.escalation_rate != null ? `${summary.escalation_rate}%` : '—'} icon={TrendingUp} color="amber" />
      </div>

      {/* ── Category bar + Sentiment pie ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card min-w-0">
          <SectionHeader title="Tickets by Category" />
          {cats.length > 0 ? (
            <ResponsiveContainer width="100%" height={barH}>
              <BarChart data={cats} layout="vertical" margin={{ left: 0, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="category" width={120} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-slate-400 text-center py-10">No category data</p>}
        </div>

        <div className="card min-w-0">
          <SectionHeader title="Sentiment Distribution" />
          {sentDist.filter(d => d.value > 0).length > 0 ? (
            <ResponsiveContainer width="100%" height={pieH}>
              <PieChart>
                <Pie
                  data={sentDist.filter(d => d.value > 0)}
                  cx="50%" cy="50%"
                  innerRadius={55} outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                  labelLine={false}
                  label={<PieLabel />}
                >
                  {sentDist.filter(d => d.value > 0).map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE}
                  formatter={(v, _, p) => [v, p.payload.name]} />
                <Legend
                  formatter={(value, entry) => (
                    <span className="text-xs text-slate-600">{entry.payload.name}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-slate-400 text-center py-10">No sentiment data</p>}
        </div>
      </div>

      {/* ── Revenue at risk + Top issues ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card min-w-0">
          <SectionHeader title="Revenue at Risk by Category" />
          {revenueRisk.length > 0 ? (
            <ResponsiveContainer width="100%" height={smallH}>
              <BarChart data={revenueRisk} layout="vertical" margin={{ left: 0, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="category" width={120} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => [`$${Number(v).toLocaleString()}`, 'Revenue at Risk']} />
                <Bar dataKey="total_order_value" fill="#ef4444" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-slate-400 text-center py-10">No revenue data</p>}
        </div>

        <div className="card min-w-0">
          <SectionHeader title="Top Issues" />
          {topIssues.length > 0 ? (
            <ResponsiveContainer width="100%" height={smallH}>
              <BarChart data={topIssues} layout="vertical" margin={{ left: 0, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="issue" width={140} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="count" fill="#f59e0b" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-slate-400 text-center py-10">No issues data</p>}
        </div>
      </div>

      {/* ── Countries + Radar ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card min-w-0">
          <SectionHeader title="Top Countries by Ticket Volume" />
          {countries.length > 0 ? (
            <ResponsiveContainer width="100%" height={smallH}>
              <BarChart data={countries} layout="vertical" margin={{ left: 0, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="country" width={100} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="ticket_count" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-slate-400 text-center py-10">No country data</p>}
        </div>

        <div className="card min-w-0">
          <SectionHeader title="Category Radar — Volume vs Risk" />
          {radarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={radarH}>
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius={70} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" tick={<RadarTick />} />
                <PolarRadiusAxis tick={{ fontSize: 9 }} tickCount={4} />
                <Radar name="Tickets"     dataKey="Tickets" stroke="#6366f1" fill="#6366f1" fillOpacity={0.35} />
                <Radar name="Risk ($100s)" dataKey="Risk"   stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} />
                <Legend />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
              </RadarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-slate-400 text-center py-10">No data</p>}
        </div>
      </div>

      {/* ── Products ── */}
      {products.length > 0 && (
        <div className="card min-w-0">
          <SectionHeader title="Top Products by Ticket Volume" />
          <ResponsiveContainer width="100%" height={smallH}>
            <BarChart data={products} margin={{ left: 10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="product" tick={{ fontSize: 9 }} angle={-20} textAnchor="end" height={40} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="ticket_count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
