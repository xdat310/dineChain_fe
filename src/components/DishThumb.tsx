import { useState } from 'react'

// The picture beside every dish name; a dish without a photo (or with a broken link) shows its initial on sand
export function DishThumb({ src, name, size = 'md' }: { src?: string | null; name?: string; size?: 'sm' | 'md' | 'lg' }) {
  const [broken, setBroken] = useState(false)
  if (src && !broken) {
    return <img className={`dish-thumb dish-thumb-${size}`} src={src} alt="" loading="lazy" onError={() => setBroken(true)} />
  }
  return <span className={`dish-thumb dish-thumb-${size} dish-thumb-empty`} aria-hidden="true">{name?.trim().charAt(0)}</span>
}
