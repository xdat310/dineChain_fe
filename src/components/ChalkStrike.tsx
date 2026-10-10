import type { ReactNode } from 'react'

// The signature mark: a clean rule drawn across a dish that is sold out or cancelled.
// It draws in when `on` turns true and wipes back out when it turns false.
export function Strikable({ on, children, color }: { on: boolean; children: ReactNode; color?: string }) {
  return (
    <span className="strikable" style={color ? ({ '--strike-color': color } as React.CSSProperties) : undefined}>
      {children}
      <svg className={`chalk-strike${on ? ' on' : ''}`} viewBox="0 0 100 4" preserveAspectRatio="none" aria-hidden="true">
        <path pathLength={1} d="M0 2 H100" />
      </svg>
    </span>
  )
}
