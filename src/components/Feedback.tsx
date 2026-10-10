import { AlertCircle } from 'lucide-react'
import type { ReactNode } from 'react'

export function Loading({ label = 'Đang tải…' }: { label?: string }) {
  return (
    <div className="empty" role="status">
      <div className="row" style={{ justifyContent: 'center' }}>
        <span className="spinner" aria-hidden="true" />
        {label}
      </div>
    </div>
  )
}

export function ErrorNotice({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="notice notice-bad" role="alert">
      <AlertCircle size={18} aria-hidden="true" />
      <div>
        {message}
        {onRetry && (
          <>
            {' '}
            <button className="btn btn-sm btn-ghost" onClick={onRetry}>Thử lại</button>
          </>
        )}
      </div>
    </div>
  )
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      {children}
    </div>
  )
}
