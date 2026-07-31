import { useRef } from 'react'
import { NavLink, Link, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useRevealObserver } from '../lib/motion'
import Logo from './Logo'
import Credit from './Credit'

const links = [
  { to: '/', label: 'Feed' },
  { to: '/100-dias', label: '100 dias' },
  { to: '/ranking', label: 'Ranking' },
  { to: '/grupos', label: 'Desafios' },
  { to: '/perfil', label: 'Perfil' },
]

export default function Layout({ children }) {
  const { pathname } = useLocation()
  const onCheckin = pathname === '/checkin'
  const mainRef = useRef(null)

  useRevealObserver(mainRef, [pathname])

  return (
    <div className="min-h-screen flex flex-col">
      <header
        className="sticky top-0 z-30 border-b border-edge backdrop-blur-xl"
        style={{ background: 'var(--s-nav)' }}
      >
        <div className="max-w-[1000px] mx-auto px-6 h-14 flex items-center justify-between gap-6">
          <Link to="/" className="shrink-0 group">
            <Logo
              wordmark
              className="h-9 w-auto transition-transform duration-500 group-hover:scale-110"
              textClass="text-[17px]"
            />
          </Link>

          <nav className="hidden sm:flex items-center gap-6">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.to === '/'}>
                {({ isActive }) => (
                  <span
                    className={`nav-link text-[13px] transition-colors duration-300 ${
                      isActive ? 'text-ink font-medium' : 'text-muted hover:text-ink'
                    }`}
                    data-active={isActive}
                  >
                    {l.label}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <Link to="/checkin" className="hidden sm:inline-flex btn btn-primary btn-sm">
              Check-in
            </Link>
            <button
              onClick={() => supabase.auth.signOut()}
              className="text-[13px] text-muted hover:text-ink transition-colors duration-300"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main
        ref={mainRef}
        key={pathname}
        className="page flex-1 w-full max-w-[1000px] mx-auto px-6 py-14 sm:py-16 pb-28 sm:pb-16"
      >
        {children}
      </main>

      <nav
        className="sm:hidden fixed bottom-0 inset-x-0 z-30 border-t border-edge backdrop-blur-xl"
        style={{ background: 'var(--s-nav)' }}
      >
        <div className="grid grid-cols-5">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              className={({ isActive }) =>
                `py-3.5 text-center text-[10px] leading-tight transition-all duration-300 ${
                  isActive ? 'text-brand font-semibold scale-105' : 'text-muted'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </div>
      </nav>

      {!onCheckin && (
        <Link
          to="/checkin"
          title="Novo check-in"
          className="sm:hidden fixed bottom-20 right-5 z-40 w-14 h-14 rounded-full bg-brand text-on-brand grid place-items-center text-3xl font-light shadow-lg pulse-ring transition-transform duration-300 active:scale-90"
        >
          +
        </Link>
      )}

      <footer className="section-alt mt-auto">
        <div className="max-w-[1000px] mx-auto px-6 pt-8 pb-safe flex justify-center">
          <Credit />
        </div>
      </footer>
    </div>
  )
}
