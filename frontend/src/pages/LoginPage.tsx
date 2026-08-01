import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'

import { getApiErrorDetail } from '../api/client'
import { useAuth } from '../context/AuthContext'

const inputClassName =
  'w-full rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-sm text-slate-100 shadow-inner outline-none transition placeholder:text-slate-500 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/35 disabled:cursor-not-allowed disabled:opacity-50'

export function LoginPage() {
  const { login, user, isInitializing, isAuthenticating } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (!isInitializing && user) {
    return <Navigate to="/" replace />
  }

  if (isInitializing) {
    return (
      <div className="flex flex-1 items-center justify-center bg-slate-950 py-24">
        <p className="text-sm text-slate-400">Loading…</p>
      </div>
    )
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const u = username.trim()
    const p = password
    if (!u || !p) {
      setError('Please enter your username and password.')
      return
    }
    try {
      await login({ username: u, password: p })
      navigate('/', { replace: true })
    } catch (err: unknown) {
      setError(getApiErrorDetail(err))
    }
  }

  const busy = isAuthenticating

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 px-4 py-14 sm:py-20">
      <div className="w-full max-w-md rounded-2xl border border-slate-700/80 bg-slate-900/90 p-8 shadow-2xl shadow-black/50 ring-1 ring-white/5 backdrop-blur-sm sm:p-10">
        <div className="flex flex-col gap-3 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Log in
          </h1>
          <p className="text-sm leading-relaxed text-slate-400 sm:text-[0.9375rem]">
            Sign in with your username and password. Email is optional here and
            not sent to the server.
          </p>
        </div>

        <form
          className="mt-10 flex flex-col gap-6"
          onSubmit={handleSubmit}
          noValidate
        >
          {error ? (
            <div
              className="rounded-xl border border-red-500/35 bg-red-950/60 px-4 py-3 text-sm leading-snug text-red-100"
              role="alert"
            >
              {error}
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            <label
              htmlFor="login-email"
              className="text-sm font-medium text-slate-300"
            >
              Email
            </label>
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
              className={inputClassName}
              placeholder="you@example.com"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="login-username"
              className="text-sm font-medium text-slate-300"
            >
              Username
            </label>
            <input
              id="login-username"
              name="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={busy}
              required
              className={inputClassName}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="login-password"
              className="text-sm font-medium text-slate-300"
            >
              Password
            </label>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
              required
              className={inputClassName}
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="mt-2 w-full rounded-xl bg-indigo-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-950/50 transition hover:bg-indigo-500 hover:shadow-indigo-900/55 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-indigo-600"
          >
            {busy ? 'Signing in…' : 'Log in'}
          </button>
        </form>

        <p className="mt-10 text-center text-sm text-slate-400">
          No account?{' '}
          <Link
            to="/register"
            className="font-medium text-indigo-400 underline-offset-2 transition hover:text-indigo-300 hover:underline"
          >
            Register
          </Link>
        </p>
      </div>
    </div>
  )
}
