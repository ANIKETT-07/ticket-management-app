import clsx from 'clsx'

const VARIANTS = {
  open:       'bg-brand-100 text-brand-700',
  resolved:   'bg-emerald-100 text-emerald-700',
  escalated:  'bg-rose-100 text-rose-700',
  positive:   'bg-emerald-100 text-emerald-700',
  neutral:    'bg-slate-100 text-slate-600',
  frustrated: 'bg-amber-100 text-amber-700',
  angry:      'bg-rose-100 text-rose-700',
  chat:       'bg-sky-100 text-sky-700',
  email:      'bg-violet-100 text-violet-700',
  web:        'bg-indigo-100 text-indigo-700',
}

const DOTS = {
  open:       'bg-brand-500',
  resolved:   'bg-emerald-500',
  escalated:  'bg-rose-500',
  positive:   'bg-emerald-500',
  neutral:    'bg-slate-400',
  frustrated: 'bg-amber-500',
  angry:      'bg-rose-500',
}

export default function Badge({ value, showDot = true }) {
  const key = (value ?? '').toLowerCase()
  return (
    <span className={clsx('badge', VARIANTS[key] ?? 'bg-slate-100 text-slate-600')}>
      {showDot && DOTS[key] && (
        <span className={clsx('w-1.5 h-1.5 rounded-full', DOTS[key])} />
      )}
      {value}
    </span>
  )
}
