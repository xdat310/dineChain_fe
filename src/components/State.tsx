import { AlertTriangle, CheckCircle2, Gauge } from 'lucide-react'

const LOAD = {
  NORMAL: { cls: 'state-normal', label: 'Bình thường', Icon: CheckCircle2 },
  BUSY: { cls: 'state-busy', label: 'Bận', Icon: Gauge },
  OVERLOADED: { cls: 'state-overloaded', label: 'Quá tải', Icon: AlertTriangle },
} as const

// Kitchen load always shows a word and a mark, never colour alone
export function LoadState({ status }: { status?: string }) {
  const s = LOAD[(status as keyof typeof LOAD) ?? 'NORMAL'] ?? LOAD.NORMAL
  return (
    <span className={`state ${s.cls}`}>
      <s.Icon aria-hidden="true" />
      {s.label}
    </span>
  )
}

export function loadColor(status?: string) {
  if (status === 'OVERLOADED') return 'var(--red)'
  if (status === 'BUSY') return 'var(--accent)'
  return 'var(--green)'
}

export function Chip({ tone, children }: { tone: 'ok' | 'warn' | 'bad' | 'info' | 'neutral'; children: React.ReactNode }) {
  return <span className={`state state-${tone}`}>{children}</span>
}
