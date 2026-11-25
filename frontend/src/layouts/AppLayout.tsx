import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Logo, Wordmark } from '../components/Logo'
import { landingPathForRole } from '../roleRouting'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
    isActive ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'
  }`

function CustomerNav() {
  return (
    <>
      <NavLink to="/events" className={linkClass}>
        Browse
      </NavLink>
      <NavLink to="/bookings" className={linkClass}>
        My Bookings
      </NavLink>
    </>
  )
}

function OrganizerNav() {
  return (
    <>
      <NavLink to="/organizer/venues" className={linkClass}>
        Venues
      </NavLink>
      <NavLink to="/organizer/events" className={linkClass}>
        Events &amp; Shows
      </NavLink>
    </>
  )
}

function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 bg-ink-900 text-white shadow-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-6">
            <Link to={user ? landingPathForRole(user.role) : '/'} className="flex items-center gap-2 text-brand-500">
              <Logo />
              <Wordmark className="text-white" />
            </Link>
            <nav className="hidden items-center gap-1 sm:flex">
              {user?.role === 'CUSTOMER' && <CustomerNav />}
              {user?.role === 'ORGANIZER' && <OrganizerNav />}
            </nav>
          </div>
          {user && (
            <div className="flex items-center gap-3">
              <div className="hidden text-right text-sm leading-tight sm:block">
                <p className="font-medium text-white">{user.name}</p>
                <p className="text-xs text-slate-400">{user.role}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold">
                {initials(user.name)}
              </div>
              <button
                onClick={handleLogout}
                className="rounded-full border border-white/20 px-3 py-1.5 text-sm text-slate-200 transition-colors hover:bg-white/10"
              >
                Log out
              </button>
            </div>
          )}
        </div>
        {user && (
          <nav className="flex items-center gap-1 overflow-x-auto border-t border-white/10 px-4 py-2 sm:hidden">
            {user.role === 'CUSTOMER' && <CustomerNav />}
            {user.role === 'ORGANIZER' && <OrganizerNav />}
          </nav>
        )}
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
