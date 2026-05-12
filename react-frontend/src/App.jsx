import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Trends from './pages/Trends.jsx'
import Categories from './pages/Categories.jsx'
import TicketExplorer from './pages/TicketExplorer.jsx'
import Upload from './pages/Upload.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#f5f3ff]">
        <Navbar />
        {/* lg: offset by sidebar width (w-60 = 240px) */}
        <main className="lg:ml-60 min-h-screen">
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
