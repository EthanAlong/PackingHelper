import type { ReactNode } from 'react'
import type { ServiceType } from '../lib/types'

export function ServiceBadge({ service }: { service: ServiceType }) {
  const styles: Record<ServiceType, string> = {
    priority: 'bg-priority text-white',
    ground: 'bg-ground text-white',
    unknown: 'bg-ink-mut text-white',
  }
  const label: Record<ServiceType, string> = {
    priority: 'PRIORITY',
    ground: 'GROUND',
    unknown: '?',
  }
  return (
    <span
      className={`inline-block rounded-sm px-1.5 py-0.5 font-display text-xs font-bold tracking-widest ${styles[service]}`}
    >
      {label[service]}
    </span>
  )
}

export function BoxBadge({
  name,
  tone,
}: {
  name: string
  tone: 'ok' | 'fail' | 'pending'
}) {
  const styles = {
    ok: 'border-ink text-ink',
    fail: 'border-accent bg-accent text-accent-ink',
    pending: 'border-line text-ink-mut border-dashed',
  }
  return (
    <span
      className={`inline-block rounded-sm border-2 px-2 py-0.5 font-mono text-sm font-semibold whitespace-nowrap ${styles[tone]}`}
    >
      {name}
    </span>
  )
}

export function Section({
  title,
  hint,
  children,
  actions,
}: {
  title: string
  hint?: string
  children: ReactNode
  actions?: ReactNode
}) {
  return (
    <section className="mb-10">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-3xl font-bold tracking-wide uppercase">{title}</h2>
          {hint && <p className="mt-1 max-w-2xl text-sm text-ink-mut">{hint}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  )
}

export function Btn({
  children,
  onClick,
  tone = 'ghost',
  disabled,
}: {
  children: ReactNode
  onClick?: () => void
  tone?: 'primary' | 'ghost' | 'danger'
  disabled?: boolean
}) {
  const styles = {
    primary: 'bg-accent text-accent-ink border-accent hover:brightness-110',
    ghost: 'bg-surface text-ink border-line hover:border-ink',
    danger: 'bg-surface text-accent border-line hover:border-accent',
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`cursor-pointer rounded-md border-2 px-3.5 py-2 font-display text-sm font-bold tracking-wider uppercase transition disabled:cursor-not-allowed disabled:opacity-40 ${styles[tone]}`}
    >
      {children}
    </button>
  )
}
