import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Logo, Wordmark } from '../components/Logo'

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-900 px-4 py-10">
      <div
        className="pointer-events-none fixed inset-0 opacity-40"
        style={{
          background:
            'radial-gradient(circle at 20% 20%, rgba(211,22,66,0.35), transparent 45%), radial-gradient(circle at 80% 80%, rgba(211,22,66,0.25), transparent 40%)',
        }}
      />
      <div className="relative w-full max-w-sm">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2 text-brand-500">
          <Logo className="h-9 w-9" />
          <Wordmark className="text-white" />
        </Link>
        <div className="rounded-2xl bg-white p-7 shadow-2xl">
          <h1 className="font-heading text-2xl font-bold text-slate-900">{title}</h1>
          <p className="mb-6 mt-1 text-sm text-slate-500">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  )
}
