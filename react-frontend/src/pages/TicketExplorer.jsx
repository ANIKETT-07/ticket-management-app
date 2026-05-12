import { useEffect, useState, useCallback } from 'react'
import { Search, ChevronDown, ChevronUp, CheckCircle, AlertTriangle, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react'
import * as api from '../api/client.js'
import Badge from '../components/Badge.jsx'
import Spinner from '../components/Spinner.jsx'
import SectionHeader from '../components/SectionHeader.jsx'

const PAGE_SIZE_OPTS = [10, 20, 50]

function FilterBar({ filters, setFilters, cats }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="card">
      <button
        className="w-full flex items-center justify-between text-sm font-semibold text-slate-700"
        onClick={() => setOpen(o => !o)}
      >
        <span>Filters</span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {open && (
        <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Category</label>
            <select className="select w-full text-xs" value={filters.category}
              onChange={e => setFilters(f => ({ ...f, category: e.target.value, page: 1 }))}>
              <option value="">All</option>
              {cats.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Channel</label>
            <select className="select w-full text-xs" value={filters.channel}
              onChange={e => setFilters(f => ({ ...f, channel: e.target.value, page: 1 }))}>
              <option value="">All</option>
              {['chat','email','web'].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Status</label>
            <select className="select w-full text-xs" value={filters.resolution_status}
              onChange={e => setFilters(f => ({ ...f, resolution_status: e.target.value, page: 1 }))}>
              <option value="">All</option>
              {['open','resolved','escalated'].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Sentiment</label>
            <select className="select w-full text-xs" value={filters.sentiment_label}
              onChange={e => setFilters(f => ({ ...f, sentiment_label: e.target.value, page: 1 }))}>
              <option value="">All</option>
              {['positive','neutral','frustrated','angry'].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Sort by</label>
            <select className="select w-full text-xs" value={filters.order_by}
              onChange={e => setFilters(f => ({ ...f, order_by: e.target.value, page: 1 }))}>
              <option value="timestamp_desc">Newest first</option>
              <option value="timestamp_asc">Oldest first</option>
              <option value="sentiment_desc">Most angry first</option>
              <option value="order_value_desc">Highest order value</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Per page</label>
            <select className="select w-full text-xs" value={filters.page_size}
              onChange={e => setFilters(f => ({ ...f, page_size: Number(e.target.value), page: 1 }))}>
              {PAGE_SIZE_OPTS.map(n => <option key={n}>{n}</option>)}
            </select>
          </div>
          <div className="flex items-end col-span-2">
            <button className="btn-secondary w-full text-xs"
              onClick={() => setFilters({
                category: '', channel: '', resolution_status: '',
                sentiment_label: '', order_by: 'timestamp_desc',
                page_size: 20, page: 1, search: '',
              })}>
              Reset Filters
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function TicketCard({ t, onResolve, onEscalate }) {
  const [expanded, setExpanded]     = useState(false)
  const [reply, setReply]           = useState(t.suggested_reply ?? '')
  const [generating, setGenerating] = useState(false)
  const [actionMsg, setActionMsg]   = useState(null)

  const handleResolve = async () => {
    try { await onResolve(t.ticket_id); setActionMsg({ type: 'success', text: 'Ticket resolved!' })
    } catch (e) { setActionMsg({ type: 'error', text: String(e) }) }
  }
  const handleEscalate = async () => {
    try { await onEscalate(t.ticket_id); setActionMsg({ type: 'warning', text: 'Ticket escalated!' })
    } catch (e) { setActionMsg({ type: 'error', text: String(e) }) }
  }
  const handleGenReply = async () => {
    setGenerating(true)
    try {
      const r = await api.suggestReply({ message: t.message, ticket_id: t.ticket_id, category: t.category })
      setReply(r.suggested_reply)
    } catch (e) { setActionMsg({ type: 'error', text: String(e) })
    } finally { setGenerating(false) }
  }

  const status    = t.resolution_status ?? 'open'
  const sentiment = t.sentiment_label ?? ''

  return (
    <div className="card p-0 overflow-hidden">
      {/* Header row */}
      <button
        className="w-full flex items-center flex-wrap gap-1.5 px-3 sm:px-4 py-3 text-left hover:bg-slate-50 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <Badge value={status} />
        <Badge value={sentiment} />
        <span className="text-xs font-semibold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full truncate max-w-[120px] sm:max-w-none">
          {t.category ?? 'Unclassified'}
        </span>
        <span className="text-xs text-slate-400">{(t.timestamp ?? '').slice(0, 10)}</span>
        <span className="hidden sm:inline text-xs font-medium text-slate-500 uppercase">{t.channel}</span>
        {t.order_value && (
          <span className="text-xs font-semibold text-emerald-600">
            ${Number(t.order_value).toFixed(2)}
          </span>
        )}
        <span className="ml-auto text-slate-400 shrink-0">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-3 sm:px-4 pb-4 border-t border-slate-100">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mt-3">
            {/* Left: messages */}
            <div className="lg:col-span-3 space-y-3">
              <div className="bg-slate-50 border-l-4 border-brand-400 rounded-xl p-3">
                <p className="text-xs font-bold text-brand-600 uppercase mb-1">Customer Message</p>
                <p className="text-sm text-slate-800">{t.message}</p>
              </div>
              {t.agent_reply && (
                <div className="bg-emerald-50 border-l-4 border-emerald-400 rounded-xl p-3">
                  <p className="text-xs font-bold text-emerald-600 uppercase mb-1">Agent Reply</p>
                  <p className="text-sm text-slate-800">{t.agent_reply}</p>
                </div>
              )}
              {t.key_issues?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {t.key_issues.map((k, i) => (
                    <span key={i} className="bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full text-xs font-medium">
                      {k}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Right: meta + actions */}
            <div className="lg:col-span-2 space-y-3">
              <div className="bg-white border border-slate-100 rounded-xl p-3 grid grid-cols-2 gap-2">
                {[
                  ['ID', String(t.ticket_id).slice(0, 8) + '…'],
                  ['Customer', t.customer_id ?? '—'],
                  ['Product', t.product ?? '—'],
                  ['Country', t.customer_country ?? '—'],
                  ['Sentiment', `${t.sentiment_score ?? '—'}/5`],
                  ['Subcategory', t.subcategory ?? '—'],
                ].map(([k, v]) => (
                  <div key={k}>
                    <p className="text-xs text-slate-400 font-semibold">{k}</p>
                    <p className="text-xs font-medium text-slate-800 truncate">{v}</p>
                  </div>
                ))}
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                {status !== 'resolved' && (
                  <button onClick={handleResolve} className="btn-secondary flex-1 flex items-center justify-center gap-1 text-xs px-2 py-2">
                    <CheckCircle size={12} /> Resolve
                  </button>
                )}
                {status !== 'resolved' && status !== 'escalated' && (
                  <button onClick={handleEscalate} className="bg-rose-50 text-rose-600 hover:bg-rose-100 px-2 py-2 rounded-xl text-xs font-semibold flex-1 flex items-center justify-center gap-1 transition-colors">
                    <AlertTriangle size={12} /> Escalate
                  </button>
                )}
              </div>

              {/* AI Reply */}
              <div>
                <p className="text-xs font-bold text-violet-600 uppercase mb-1">AI Reply</p>
                {reply ? (
                  <textarea readOnly value={reply} rows={4}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 resize-none text-slate-700 bg-slate-50" />
                ) : (
                  <button onClick={handleGenReply} disabled={generating}
                    className="btn-primary w-full flex items-center justify-center gap-1.5 text-xs">
                    <Sparkles size={13} />
                    {generating ? 'Generating…' : 'Generate AI Reply'}
                  </button>
                )}
              </div>

              {actionMsg && (
                <p className={`text-xs font-medium rounded-lg p-2 text-center
                  ${actionMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700'
                    : actionMsg.type === 'warning' ? 'bg-amber-50 text-amber-700'
                    : 'bg-rose-50 text-rose-700'}`}>
                  {actionMsg.text}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function TicketExplorer() {
  const [filters, setFilters] = useState({
    category: '', channel: '', resolution_status: '',
    sentiment_label: '', order_by: 'timestamp_desc',
    page_size: 20, page: 1, search: '',
  })
  const [tickets, setTickets]   = useState([])
  const [total, setTotal]       = useState(0)
  const [cats, setCats]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [searchInput, setSearchInput] = useState('')

  useEffect(() => {
    api.getCategories()
      .then(d => setCats((d.categories ?? []).map(c => c.category)))
      .catch(() => {})
  }, [])

  const fetchTickets = useCallback(() => {
    setLoading(true)
    const params = { page: filters.page, page_size: filters.page_size, order_by: filters.order_by }
    if (filters.category)          params.category           = filters.category
    if (filters.channel)           params.channel            = filters.channel
    if (filters.resolution_status) params.resolution_status  = filters.resolution_status
    if (filters.sentiment_label)   params.sentiment_label    = filters.sentiment_label
    if (filters.search)            params.search             = filters.search

    api.listTickets(params)
      .then(d => { setTickets(d.items ?? []); setTotal(d.total ?? 0); setError(null) })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [filters])

  useEffect(() => { fetchTickets() }, [fetchTickets])

  const handleResolve  = async (id) => { await api.resolveTicket(id);  fetchTickets() }
  const handleEscalate = async (id) => { await api.escalateTicket(id); fetchTickets() }

  const nPages = Math.max(1, Math.ceil(total / filters.page_size))

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Ticket Explorer</h1>
        <p className="text-sm text-slate-500">Filter, browse, resolve, and generate AI replies</p>
      </div>

      {/* Search bar */}
      <form
        className="flex gap-2"
        onSubmit={e => { e.preventDefault(); setFilters(f => ({ ...f, search: searchInput, page: 1 })) }}
      >
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" className="input w-full pl-9 shadow-sm text-sm"
            placeholder="Search by keyword, issue, customer ID…"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)} />
        </div>
        <button type="submit" className="btn-primary px-4 shrink-0">Search</button>
        {filters.search && (
          <button type="button" className="btn-secondary shrink-0"
            onClick={() => { setSearchInput(''); setFilters(f => ({ ...f, search: '', page: 1 })) }}>
            Clear
          </button>
        )}
      </form>

      {/* Filters */}
      <FilterBar filters={filters} setFilters={setFilters} cats={cats} />

      {/* Results header + pagination */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-500">
          <span className="font-bold text-slate-800">{total.toLocaleString()}</span> tickets
          {filters.search && <> matching "<em>{filters.search}</em>"</>}
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <button className="btn-secondary px-2 py-1.5"
            disabled={filters.page <= 1}
            onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}>
            <ChevronLeft size={14} />
          </button>
          <span className="text-sm font-semibold text-slate-700 whitespace-nowrap">
            {filters.page} / {nPages}
          </span>
          <button className="btn-secondary px-2 py-1.5"
            disabled={filters.page >= nPages}
            onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Ticket list */}
      {loading && <Spinner />}
      {!loading && error && (
        <div className="card text-center py-10 text-rose-600">
          <AlertTriangle className="mx-auto mb-2" size={28} />
          <p>{error}</p>
        </div>
      )}
      {!loading && !error && tickets.length === 0 && (
        <div className="card text-center py-16 text-slate-400">
          No tickets match the current filters.
        </div>
      )}
      {!loading && !error && (
        <div className="space-y-3">
          {tickets.map(t => (
            <TicketCard key={t.ticket_id} t={t} onResolve={handleResolve} onEscalate={handleEscalate} />
          ))}
        </div>
      )}
    </div>
  )
}
