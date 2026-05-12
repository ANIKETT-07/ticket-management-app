export default function SectionHeader({ title, action }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
        <span className="w-1 h-5 bg-brand-500 rounded-full" />
        {title}
      </h2>
      {action}
    </div>
  )
}
