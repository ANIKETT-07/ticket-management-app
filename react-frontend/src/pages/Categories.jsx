import { useEffect, useState } from 'react'
import { AlertTriangle, Tag, X, Flame } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import * as api from '../api/client.js'
import SectionHeader from '../components/SectionHeader.jsx'
import Spinner from '../components/Spinner.jsx'

const PALETTE = [
  '#6366f1','#8b5cf6','#3b82f6','#10b981',
  '#f59e0b','#ef4444','#ec4899','#06b6d4',
]
const SENTIMENT_COLORS = {
  positive: '#10b981', neutral: '#94a3b8', frustrated: '#f97316', angry: '#ef4444',
}
const TOOLTIP_STYLE = { borderRadius: 10, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }

function useChartH(sm = 180, lg = 220) {
  const [h, setH] = useState(window.innerWidth < 640 ? sm : lg)
  useEffect(() => {
    const fn = () => setH(window.innerWidth < 640 ? sm : lg)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [sm, lg])
  return h
}

function StatPill({ label, value, color }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl py-2.5 px-3" style={{ background: color + '18' }}>
      <span className="text-lg font-extrabold leading-tight" style={{ color }}>{value}</span>
      <span className="text-xs font-semibold text-slate-500 mt-0.5 text-center">{label}</span>
    </div>
  )
}

function CategoryDetail({ cat, color, onClose }) {
  const [issues, setIssues]       = useState([])
  const [sentiment, setSentiment] = useState([])
  const [loading, setLoading]     = useState(true)
  const chartH = useChartH(160, 200)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.getTopIssues({ limit: 6, category: cat.category }),
      api.getSentimentDist({ category: cat.category }),
    ]).then(([ti, sd]) => {
      setIssues(ti.issues ?? [])
      setSentiment((sd.buckets ?? []).filter(b => b.count > 0))
    }).finally(() => setLoading(false))
  }, [cat.category])

  const statusData = [
    { name: 'Open',      value: cat.open_count,      fill: '#6366f1' },
    { name: 'Resolved',  value: cat.resolved_count,  fill: '#10b981' },
    { name: 'Escalated', value: cat.escalated_count, fill: '#ef4444' },
  ]
  const total    = cat.count || 1
  const resRate  = Math.round((cat.resolved_count  / total) * 100)
  const escRate  = Math.round((cat.escalated_count / total) * 100)
  const openRate = Math.round((cat.open_count      / total) * 100)

  return (
    <div className="card border-l-4 space-y-4" style={{ borderLeftColor: color }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full shrink-0" style={{ background: color }} />
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900">{cat.category}</h2>
          </div>
          <p className="text-sm text-slate-400 mt-0.5">
            {cat.count.toLocaleString()} tickets · {cat.percentage}% of all tickets
          </p>
        </div>
        <button onClick={onClose}
          className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors shrink-0">
          <X size={16} />
        </button>
      </div>

      {/* KPI pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatPill label="Open"            value={`${cat.open_count} (${openRate}%)`}  color="#6366f1" />
        <StatPill label="Resolved"        value={`${cat.resolved_count} (${resRate}%)`} color="#10b981" />
        <StatPill label="Escalated"       value={`${cat.escalated_count} (${escRate}%)`} color="#ef4444" />
        <StatPill label="Revenue at Risk" value={`$${Number(cat.revenue_at_risk).toLocaleString('en-US', { maximumFractionDigits: 0 })}`} color="#f59e0b" />
      </div>

      {/* Sentiment badge row */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2">
          <Flame size={13} className="text-amber-500" />
          <span className="text-sm font-semibold text-slate-700">
            Avg Sentiment: <span className="text-amber-600">{cat.avg_sentiment.toFixed(2)} / 5</span>
          </span>
        </div>
        {escRate > 10 && (
          <span className="text-xs font-bold bg-rose-100 text-rose-600 px-2.5 py-1 rounded-full">
            High escalation risk
          </span>
        )}
        {resRate > 50 && (
          <span className="text-xs font-bold bg-emerald-100 text-emerald-600 px-2.5 py-1 rounded-full">
            Good resolution rate
          </span>
        )}
      </div>

      {loading
        ? <div className="py-6"><Spinner text="Loading category insights…" /></div>
        : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Status donut */}
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Status Breakdown</p>
            <ResponsiveContainer width="100%" height={chartH}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%"
                  innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value"
                  label={({ name, percent }) => percent > 0.05 ? `${name} ${(percent*100).toFixed(0)}%` : ''}
                  labelLine={false}>
                  {statusData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v, n) => [v, n]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Sentiment donut */}
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Sentiment Breakdown</p>
            {sentiment.length > 0 ? (
              <ResponsiveContainer width="100%" height={chartH}>
                <PieChart>
                  <Pie data={sentiment} cx="50%" cy="50%"
                    innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="count"
                    label={({ percent }) => percent > 0.05 ? `${(percent*100).toFixed(0)}%` : ''}
                    labelLine={false}>
                    {sentiment.map((d, i) => (
                      <Cell key={i} fill={SENTIMENT_COLORS[d.label] ?? PALETTE[i]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE}
                    formatter={(v, n, p) => [v, p.payload.label]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} formatter={(_, entry) => entry.payload.label} />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-slate-400 py-10 text-center">No sentiment data</p>}
          </div>

          {/* Top issues bar */}
          {issues.length > 0 && (
            <div className="sm:col-span-2 min-w-0">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Top Issues</p>
              <ResponsiveContainer width="100%" height={chartH}>
                <BarChart data={issues} layout="vertical" margin={{ left: 0, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="issue" width={140} tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} fill={color} opacity={0.85} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Categories() {
  const [cats, setCats]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [selected, setSelected] = useState(null)
  const [days, setDays]         = useState(null)
  const chartH = useChartH(220, 320)

  const DAYS_OPTS = [
    { label: 'All time', val: null },
    { label: '90d', val: 90 },
    { label: '30d', val: 30 },
    { label: '7d', val: 7 },
  ]

  useEffect(() => {
    setLoading(true)
    api.getCategories({ days: days || undefined })
      .then(d => { setCats(d.categories ?? []); setError(null) })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [days])

  if (loading) return <Spinner />
  if (error) return (
    <div className="card text-center py-12 text-rose-600">
      <AlertTriangle className="mx-auto mb-2" size={32} />
      <p>{error}</p>
    </div>
  )

  const chartData = cats.map(c => ({
    name: c.category,
    Open: c.open_count,
    Resolved: c.resolved_count,
    Escalated: c.escalated_count,
  }))

  const sel = selected != null ? cats[selected] : null

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Categories</h1>
          <p className="text-sm text-slate-500">Click any category for detailed breakdown</p>
        </div>
        <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm self-start">
          {DAYS_OPTS.map(opt => (
            <button key={String(opt.val)} onClick={() => { setDays(opt.val); setSelected(null) }}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors
                ${days === opt.val ? 'bg-brand-600 text-white' : 'text-slate-500 hover:bg-brand-50'}`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stacked bar chart */}
      <div className="card min-w-0">
        <SectionHeader title="Ticket Status by Category" />
        <ResponsiveContainer width="100%" height={chartH}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis type="number" tick={{ fontSize: 10 }} />
            <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="Open"      stackId="s" fill="#6366f1" />
            <Bar dataKey="Resolved"  stackId="s" fill="#10b981" />
            <Bar dataKey="Escalated" stackId="s" fill="#ef4444" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Category cards grid — 2 cols on mobile, 4 on lg */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cats.map((c, i) => {
          const color    = PALETTE[i % PALETTE.length]
          const isActive = selected === i
          return (
            <button
              key={c.category}
              onClick={() => setSelected(isActive ? null : i)}
              className={`card text-left transition-all hover:shadow-card-hover border-l-4 cursor-pointer p-3 sm:p-5
                ${isActive ? 'ring-2 ring-offset-1' : ''}`}
              style={{ borderLeftColor: color }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <Tag size={12} style={{ color }} />
                <span className="text-xs font-semibold text-slate-400">{c.percentage}%</span>
              </div>
              <p className="text-xs font-semibold text-slate-500 mb-1 truncate">{c.category}</p>
              <p className="text-xl sm:text-2xl font-extrabold" style={{ color }}>{c.count.toLocaleString()}</p>

              {/* Mini status bar */}
              <div className="flex h-1.5 rounded-full overflow-hidden mt-2 gap-px">
                {[
                  { val: c.open_count,      bg: '#6366f1' },
                  { val: c.resolved_count,  bg: '#10b981' },
                  { val: c.escalated_count, bg: '#ef4444' },
                ].map((seg, si) => (
                  <div key={si} style={{ flex: seg.val, background: seg.bg }} />
                ))}
              </div>

              <div className="flex justify-between mt-1.5 text-xs text-slate-400">
                <span className="text-emerald-600 font-medium">
                  {Math.round((c.resolved_count / (c.count || 1)) * 100)}% res.
                </span>
                {c.escalated_count > 0 && (
                  <span className="text-rose-500 font-medium">{c.escalated_count} esc.</span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Detail panel */}
      {sel && (
        <CategoryDetail
          cat={sel}
          color={PALETTE[selected % PALETTE.length]}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
