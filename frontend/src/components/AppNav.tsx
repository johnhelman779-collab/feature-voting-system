import { Link, NavLink } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'

export function AppNav() {
  const { user, logout, isInitializing } = useAuth()

  const linkClass =
    'rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'

  const activeClass =
    'bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-100'

  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          to="/"
          className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white"
        >
          Feature votes
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2" aria-label="Main">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `${linkClass} ${isActive ? activeClass : ''}`
            }
          >
            Home
          </NavLink>

          {!isInitializing && !user ? (
            <>
              <NavLink
                to="/login"
                className={({ isActive }) =>
                  `${linkClass} ${isActive ? activeClass : ''}`
                }
              >
                Log in
              </NavLink>
              <NavLink
                to="/register"
                className={({ isActive }) =>
                  `${linkClass} ${isActive ? activeClass : ''}`
                }
              >
                Register
              </NavLink>
            </>
          ) : null}

          {!isInitializing && user ? (
            <div className="flex items-center gap-3 pl-2">
              <span className="hidden max-w-[10rem] truncate text-sm text-slate-600 dark:text-slate-300 sm:inline">
                {user.username}
              </span>
              <button
                type="button"
                onClick={() => logout()}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Log out
              </button>
            </div>
          ) : null}
        </nav>
      </div>
    </header>
  )
}
