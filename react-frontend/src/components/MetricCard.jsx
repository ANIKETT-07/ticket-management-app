import clsx from 'clsx'

const ACCENT = {
  indigo:  'border-brand-500  bg-brand-50  text-brand-600',
  emerald: 'border-emerald-500 bg-emerald-50 text-emerald-600',
  amber:   'border-amber-500   bg-amber-50   text-amber-600',
  rose:    'border-rose-500    bg-rose-50    text-rose-600',
  violet:  'border-violet-500  bg-violet-50  text-violet-600',
  sky:     'border-sky-500     bg-sky-50     text-sky-600',
}

export default function MetricCard({ label, value, sub, color = 'indigo', icon: Icon }) {
  const acc = ACCENT[color] ?? ACCENT.indigo
  const [borderCls, bgCls, textCls] = acc.split(' ')
  return (
    <div className={clsx('card border-l-4 flex items-start gap-3 p-3 sm:p-5', borderCls)}>
      {Icon && (
        <div className={clsx('p-1.5 sm:p-2 rounded-xl shrink-0', bgCls)}>
          <Icon size={17} className={textCls} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-0.5 truncate">{label}</p>
        <p className="text-lg sm:text-2xl font-extrabold text-slate-900 leading-none truncate">{value ?? '—'}</p>
        {sub && <p className="text-xs text-slate-400 mt-1 truncate">{sub}</p>}
      </div>
    </div>
  )
}
