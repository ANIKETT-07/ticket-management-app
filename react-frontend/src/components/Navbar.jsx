import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, TrendingUp, Tag, Search, Upload, Menu, X, BarChart2 } from 'lucide-react'

const links = [
  { to: '/dashboard',  label: 'Dashboard',      Icon: LayoutDashboard },
  { to: '/trends',     label: 'Trends',          Icon: TrendingUp },
  { to: '/categories', label: 'Categories',      Icon: Tag },
  { to: '/tickets',    label: 'Ticket Explorer', Icon: Search },
  { to: '/upload',     label: 'Upload',          Icon: Upload },
]

function SidebarContent({ onClose }) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
            <BarChart2 size={16} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">Support Insight</p>
            <p className="text-white/50 text-xs">AI Analytics</p>
          </div>
        </div>
        {/* Close button — mobile only */}
        {onClose && (
          <button onClick={onClose} className="lg:hidden text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="text-white/30 text-xs font-semibold uppercase tracking-widest px-2 mb-3">Navigation</p>
        {links.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
               ${isActive
                 ? 'bg-white/20 text-white shadow-sm'
                 : 'text-white/65 hover:bg-white/10 hover:text-white'}`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`p-1.5 rounded-lg transition-colors ${isActive ? 'bg-white/20' : 'bg-transparent'}`}>
                  <Icon size={15} />
                </div>
                <span>{label}</span>
                {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white/80" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-white/10 shrink-0">
        <p className="text-white/30 text-xs text-center">v1.0 · AI-powered</p>
      </div>
    </div>
  )
}

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  // Close drawer on route change
  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  // Prevent body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  const currentPage = links.find(l => l.to === location.pathname)?.label ?? 'Dashboard'

  return (
    <>
      {/* ── Desktop Sidebar (lg+) ── */}
      <aside className="hidden lg:flex flex-col fixed top-0 left-0 h-screen w-60 z-40 bg-gradient-to-b from-brand-700 via-brand-600 to-brand-500 shadow-xl">
        <SidebarContent />
      </aside>

      {/* ── Mobile Top Bar ── */}
      <header className="lg:hidden sticky top-0 z-40 bg-gradient-to-r from-brand-700 to-brand-500 shadow-lg flex items-center gap-3 px-4 h-14">
        <button
          onClick={() => setMobileOpen(true)}
          className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
            <BarChart2 size={14} className="text-white" />
          </div>
          <span className="text-white font-bold text-sm">Support Insight</span>
        </div>
        <span className="ml-auto text-white/60 text-xs font-medium truncate">{currentPage}</span>
      </header>

      {/* ── Mobile Drawer overlay ── */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer panel */}
          <div className="relative w-72 max-w-[85vw] h-full bg-gradient-to-b from-brand-700 via-brand-600 to-brand-500 shadow-2xl flex flex-col animate-slide-in">
            <SidebarContent onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}
    </>
  )
}
