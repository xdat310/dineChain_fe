import { Minus, Plus } from 'lucide-react'
import type { BranchMenuItemResponse, GuestMenuCategory } from '../api/types'
import { money } from '../lib/format'
import { Strikable } from './ChalkStrike'
import { DishThumb } from './DishThumb'

export interface DishGroup { id?: number; name: string; dishes: BranchMenuItemResponse[] }

// Dishes under their categories in menu order; anything without a known category goes last
export function groupDishes(categories: GuestMenuCategory[] = [], menu: BranchMenuItemResponse[] = []): DishGroup[] {
  const known = categories.map((c) => ({ id: c.id, name: c.name ?? '', dishes: menu.filter((m) => m.categoryId === c.id) }))
  const rest = menu.filter((m) => !known.some((g) => g.id === m.categoryId))
  return [...known, ...(rest.length ? [{ id: -1, name: 'Món khác', dishes: rest }] : [])].filter((g) => g.dishes.length > 0)
}

export function CategoryNav({ groups }: { groups: DishGroup[] }) {
  if (groups.length < 2) return null
  return (
    <nav className="guest-cats" aria-label="Nhóm món">
      {groups.map((g) => <a key={g.id} href={`#nhom-${g.id}`}>{g.name}</a>)}
    </nav>
  )
}

// The guest-facing chalk menu: tap + to add, sold-out dishes struck through
export function DishBoard({ groups, quantity, onChange }: {
  groups: DishGroup[]; quantity: (id: number) => number; onChange: (dish: BranchMenuItemResponse, delta: number) => void
}) {
  return (
    <section className="menu-board guest-menu" aria-label="Menu">
      {groups.map((g) => (
        <div key={g.id} id={`nhom-${g.id}`} className="guest-group">
          <div className="menu-cat">{g.name}</div>
          {g.dishes.map((m) => {
            const inCart = quantity(m.menuItemId!)
            return (
              <div key={m.menuItemId} className={`dish guest-dish${m.available ? '' : ' soldout'}`}>
                <DishThumb src={m.imageUrl} name={m.name} />
                <span className="dname"><Strikable on={!m.available}>{m.name}</Strikable></span>
                <span className="dots" />
                {m.available ? <span className="dprice num">{money(m.price)}</span> : <span className="soldout-tag">hết món</span>}
                {m.available && (inCart ? (
                  <span className="guest-qty">
                    <button className="icon-btn" aria-label={`Bớt ${m.name}`} onClick={() => onChange(m, -1)}><Minus size={16} /></button>
                    <span className="num">{inCart}</span>
                    <button className="icon-btn" aria-label={`Thêm ${m.name}`} onClick={() => onChange(m, 1)}><Plus size={16} /></button>
                  </span>
                ) : (
                  <button className="icon-btn guest-add" aria-label={`Gọi ${m.name}`} onClick={() => onChange(m, 1)}><Plus size={18} /></button>
                ))}
              </div>
            )
          })}
        </div>
      ))}
    </section>
  )
}
