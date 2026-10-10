// The house's live-number voice: each digit boxed in the condensed serif; separators sit between the boxes
export function Counter({ value, label, size = 'md' }: { value: string | number; label?: string; size?: 'sm' | 'md' | 'lg' }) {
  const text = String(value)
  return (
    <span className={`counter counter-${size}`} role="img" aria-label={label ?? text}>
      {text.split('').map((ch, i) => (/\d/.test(ch)
        ? <span key={i} className="counter-digit" aria-hidden="true">{ch}</span>
        : <span key={i} className="counter-sep" aria-hidden="true">{ch}</span>))}
    </span>
  )
}
