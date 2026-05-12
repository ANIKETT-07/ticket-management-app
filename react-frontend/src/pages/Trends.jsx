import { useEffect, useState } from 'react'
import { AlertTriangle, TrendingUp, TrendingDown, Minus, Filter, X } from 'lucide-react'
import {
  BarChart, Bar, AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, ComposedChart,
} from 'recharts'
import * as api from '../api/client.js'
import SectionHeader from '../components/SectionHeader.jsx'
import Spinner from '../components/Spinner.jsx'

const DAYS_OPTIONS  = [7, 14, 30, 90]
const CHANNEL_OPTS  = ['All', 'chat', 'email', 'web']
const TOOLTIP_STYLE = { borderRadius: 10, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }

function useChartH(sm = 180, lg = 240) {
  const [h, setH] = useState(window.innerWidth < 640 ? sm : lg)
  useEffect(() => {
    const fn = () => setH(window.innerWidth < 640 ? sm : lg)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [sm, lg])
  return h
}

function VelocityCard({ item }) {
  const pct  = item.change_pct
  const up   = pct > 0
  const flat = pct === 0
  const Icon  = flat ? Minus : up ? TrendingUp : TrendingDown
  const color = flat ? 'text-slate-400' : up ? 'text-rose-500' : 'text-emerald-500'
  const bg    = flat ? 'bg-slate-50'   : up ? 'bg-rose-50'    : 'bg-emerald-50'
  return (
    <div className={`rounded-xl p-3 sm:p-4 ${bg} flex items-center justify-between`}>
      <div>
        <p className="text-xs font-semibold text-slate-500 mb-0.5 truncate max-w-[120px]">{item.category}</p>
        <p className="text-base sm:text-lg font-extrabold text-slate-900">{item.count_current} tickets</p>
        <p className="text-xs text-slate-400">vs {item.count_previous} prior</p>
      </div>
      <div className={`flex flex-col items-end gap-1 ${color}`}>
        <Icon size={18} />
        <span className="text-sm font-bold">
          {flat ? '—' : `${up ? '+' : ''}${pct.toFixed(0)}%`}
        </span>
      </div>
    </div>
  )
}

export default function Trends() {
  const [days, setDays]         = useState(30)
  const [category, setCategory] = useState('')
  const [channel, setChannel]   = useState('')
  const [allCats, setAllCats]   = useState([])
  const [trendData, setTrendData] = useState([])
  const [velocity, setVelocity]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError]         = useState(null)

  const chartH = useChartH(180, 240)

  useEffect(() => {
    api.getCategories()
      .then(d => setAllCats((d.categories ?? []).map(c => c.category)))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const isFirst = trendData.length === 0 && !error
    if (isFirst) setLoading(true); else setRefreshing(true)

    const f = {
      days,
      category: category || undefined,
      channel:  channel  || undefined,
    }

    Promise.all([
      api.getTrends(f),
      api.getVelocity({ period_days: Math.min(days, 30), category: category || undefined, channel: channel || undefined }),
    ]).then(([t, v]) => {
      setTrendData(t.data ?? [])
      setVelocity(v.items ?? [])
      setError(null)
    }).catch(e => setError(String(e)))
      .finally(() => { setLoading(false); setRefreshing(false) })
  }, [days, category, channel])

  const stackedStatus = trendData.map(d => ({
    date: d.date,
    Open: d.open_count,
    Resolved: d.resolved_count,
    Escalated: d.escalated_count,
  }))

  const combinedData = trendData.map(d => ({
    date: d.date,
    Tickets: d.ticket_count,
    Revenue: Math.round(d.revenue_at_risk ?? 0),
  }))

  const hasFilters = !!category || !!channel || days !== 30
  const clearAll   = () => { setDays(30); setCategory(''); setChannel('') }

  return (
    <div className="space-y-5">
      {/* Header + filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Trends</h1>
          <p className="text-sm text-slate-500">Volume, sentiment, and status over time</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">
            <Filter size={13} className="text-brand-500" />
            <span className="text-xs font-semibold text-slate-500">
              {refreshing ? 'Updating…' : 'Filters'}
            </span>
          </div>

          {/* Days */}
          <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
            {DAYS_OPTIONS.map(d => (
              <button key={d} onClick={() => setDays(d)}
                className={`px-2 py-1 rounded-lg text-xs font-semibold transition-colors
                  ${days === d ? 'bg-brand-600 text-white' : 'text-slate-500 hover:bg-brand-50'}`}>
                {d}d
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
              <X size={12} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Active filter chips */}
      {hasFilters && (
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-xs text-slate-400 font-medium">Active:</span>
          {days !== 30 && (
            <span className="flex items-center gap-1 bg-brand-100 text-brand-700 text-xs font-semibold px-2.5 py-1 rounded-full">
              Last {days}d <button onClick={() => setDays(30)}><X size={10} /></button>
            </span>
          )}
          {channel && (
            <span className="flex items-center gap-1 bg-sky-100 text-sky-700 text-xs font-semibold px-2.5 py-1 rounded-full capitalize">
              {channel} <button onClick={() => setChannel('')}><X size={10} /></button>
            </span>
          )}
          {category && (
            <span className="flex items-center gap-1 bg-violet-100 text-violet-700 text-xs font-semibold px-2.5 py-1 rounded-full">
              {category} <button onClick={() => setCategory('')}><X size={10} /></button>
            </span>
          )}
        </div>
      )}

      {loading && <Spinner />}
      {!loading && error && (
        <div className="card text-center py-12 text-rose-600">
          <AlertTriangle className="mx-auto mb-2" size={32} />
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Row 1: Area volume + Sentiment line */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="card min-w-0">
              <SectionHeader title="Daily Ticket Volume" />
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={chartH}>
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 10 }} width={32} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Area type="monotone" dataKey="ticket_count" stroke="#6366f1"
                      strokeWidth={2.5} fill="url(#volGrad)" name="Tickets" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : <p className="text-sm text-slate-400 text-center py-10">No data for this period</p>}
            </div>

            <div className="card min-w-0">
              <SectionHeader title="Average Sentiment Score" />
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={chartH}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                    <YAxis domain={[1, 5]} tick={{ fontSize: 10 }} width={32} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Line type="monotone" dataKey="avg_sentiment" stroke="#f59e0b"
                      strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} name="Avg Sentiment" />
                  </LineChart>
                </ResponsiveContainer>
              ) : <p className="text-sm text-slate-400 text-center py-10">No sentiment data</p>}
            </div>
          </div>

          {/* Row 2: Stacked status + Volume vs Revenue */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="card min-w-0">
              <SectionHeader title="Daily Status Breakdown" />
              {stackedStatus.length > 0 ? (
                <ResponsiveContainer width="100%" height={chartH}>
                  <BarChart data={stackedStatus}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 10 }} width={32} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="Open"      stackId="s" fill="#6366f1" />
                    <Bar dataKey="Resolved"  stackId="s" fill="#10b981" />
                    <Bar dataKey="Escalated" stackId="s" fill="#ef4444" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-sm text-slate-400 text-center py-10">No data</p>}
            </div>

            <div className="card min-w-0">
              <SectionHeader title="Volume vs Revenue at Risk" />
              {combinedData.length > 0 ? (
                <ResponsiveContainer width="100%" height={chartH}>
                  <ComposedChart data={combinedData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                    <YAxis yAxisId="left"  tick={{ fontSize: 10 }} width={32} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9 }} width={40}
                      tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={TOOLTIP_STYLE}
                      formatter={(v, n) => n === 'Revenue' ? [`$${Number(v).toLocaleString()}`, n] : [v, n]} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar  yAxisId="left"  dataKey="Tickets" fill="#6366f1" radius={[4,4,0,0]} opacity={0.85} />
                    <Line yAxisId="right" dataKey="Revenue" stroke="#ef4444" strokeWidth={2} dot={false} type="monotone" />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : <p className="text-sm text-slate-400 text-center py-10">No data</p>}
            </div>
          </div>

          {/* Category velocity */}
          {velocity.length > 0 && (
            <div className="card">
              <SectionHeader title="Category Velocity — vs Previous Period" />
              <p className="text-xs text-slate-400 mb-4">
                Compares ticket count in the last {Math.min(days, 30)} days vs the {Math.min(days, 30)} days before.
                Red = increasing, green = decreasing.
              </p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {velocity.slice(0, 8).map(item => (
                  <VelocityCard key={item.category} item={item} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
