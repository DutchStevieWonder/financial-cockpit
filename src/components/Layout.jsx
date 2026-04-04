import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { to: '/', label: 'Dashboard', icon: '◉', adminOnly: false },
  { to: '/transacties', label: 'Transacties', icon: '☰', adminOnly: false },
  { to: '/vermogen', label: 'Vermogen', icon: '◆', adminOnly: false },
  { to: '/upload', label: 'Upload', icon: '↑', adminOnly: true },
]

export default function Layout() {
  const { profile, signOut, isAdmin } = useAuth()

  const visibleItems = navItems.filter(
    (item) => !item.adminOnly || isAdmin
  )

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-brand-500 text-white px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight">
          Financial Cockpit
        </h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-brand-200">
            {profile?.display_name}
          </span>
          <button
            onClick={signOut}
            className="text-sm text-brand-200 hover:text-white transition-colors"
          >
            Uitloggen
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 p-4 md:p-6 max-w-6xl mx-auto w-full">
        <Outlet />
      </main>

      {/* Bottom navigation (mobile-friendly) */}
      <nav className="bg-white border-t border-slate-200 px-2 py-1 flex justify-around md:justify-center md:gap-8">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center py-2 px-3 text-xs transition-colors ${
                isActive
                  ? 'text-brand-500 font-semibold'
                  : 'text-slate-400 hover:text-slate-600'
              }`
            }
          >
            <span className="text-lg mb-0.5">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
