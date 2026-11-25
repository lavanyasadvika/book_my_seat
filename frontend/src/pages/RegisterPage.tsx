import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register } from '../api/auth'
import { apiErrorMessage } from '../api/client'
import type { Role } from '../api/types'
import { ErrorBanner } from '../components/Feedback'
import { AuthLayout } from './AuthLayout'

const ROLES: { value: Role; label: string; blurb: string }[] = [
  { value: 'CUSTOMER', label: 'Customer', blurb: 'Browse shows and book seats' },
  { value: 'ORGANIZER', label: 'Organizer', blurb: 'Create venues, events and shows' },
]

export function RegisterPage() {
  const navigate = useNavigate()
  const [role, setRole] = useState<Role>('CUSTOMER')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await register(name, email, password, role)
      // Deliberately not logging the user in here - registering only
      // creates the account; they land on /login and authenticate for real,
      // same as any other login.
      navigate('/login', { replace: true, state: { justRegistered: true, prefillEmail: email } })
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not create your account'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout title="Create your account" subtitle="Sign up as a Customer or an Organizer.">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <ErrorBanner message={error} />}

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">I am a…</label>
          <div className="grid grid-cols-2 gap-2">
            {ROLES.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setRole(r.value)}
                className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                  role === r.value
                    ? 'border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-500'
                    : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="block font-medium">{r.label}</span>
                <span className="block text-xs text-slate-500">{r.blurb}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
          <p className="mt-1 text-xs text-slate-400">At least 8 characters.</p>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
        >
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-slate-500">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-brand-600 hover:underline">
          Log in
        </Link>
      </p>
    </AuthLayout>
  )
}
