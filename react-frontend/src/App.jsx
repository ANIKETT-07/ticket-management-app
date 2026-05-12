import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Trends from './pages/Trends.jsx'
import Categories from './pages/Categories.jsx'
import TicketExplorer from './pages/TicketExplorer.jsx'
import Upload from './pages/Upload.jsx'

export default function App() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#f5f3ff]">
        <Navbar collapsed={collapsed} setCollapsed={setCollapsed} />
        {/* No inline style — margin is driven purely by CSS data-attribute rules */}
        <main
          className="min-h-screen transition-[margin] duration-300 ease-in-out"
          data-sidebar={collapsed ? 'collapsed' : 'expanded'}
        >
          <div className="max-w-screen-xl mx-auto px-4 py-6">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard"  element={<Dashboard />} />
              <Route path="/trends"     element={<Trends />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/tickets"    element={<TicketExplorer />} />
              <Route path="/upload"     element={<Upload />} />
            </Routes>
          </div>
        </main>
      </div>
    </BrowserRouter>
  )
}
