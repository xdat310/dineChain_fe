import { AlertTriangle, CheckCircle2, Flame, Gauge, HandPlatter } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ApiError, get, put } from '../api/client'
import type { BranchLoadResponse, BranchMenuItemResponse, KitchenTicketResponse, TableResponse } from '../api/types'
import { useAuth } from '../auth'
import { Strikable } from '../components/ChalkStrike'
import { DishThumb } from '../components/DishThumb'
import { useToast } from '../components/Toast'
import { ORDER_TYPE_LABEL } from '../lib/format'
import { useData } from '../lib/useData'
import { Counter } from '../components/Counter'

// Dishes waiting longer than this are flagged on the board
const LATE_MINUTES = 15

const LOAD_STATE = {
  NORMAL: { cls: 'normal', label: 'Bình thường', Icon: CheckCircle2 },
  BUSY: { cls: 'busy', label: 'Bận', Icon: Gauge },
  OVERLOADED: { cls: 'overloaded', label: 'Quá tải — ngưng mang đi', Icon: AlertTriangle },
} as const

export function Kitchen() {
  const { branchId, role, branches } = useAuth()
  const toast = useToast()
  const cooks = role === 'CHEF' || role === 'BRANCH_MANAGER' || role === 'ADMIN'
  const queue = useData(() => get<KitchenTicketResponse[]>(`/kitchen/branches/${branchId}/queue`), [branchId], 4000)
  const load = useData(() => get<BranchLoadResponse>(`/kitchen/branches/${branchId}/load`), [branchId], 8000)
  const menu = useData(() => get<BranchMenuItemResponse[]>(`/branches/${branchId}/menu`), [branchId], 30000)
  const tables = useData(() => get<TableResponse[]>(`/branches/${branchId}/tables`), [branchId])
  const tableName = (id?: number) => tables.data?.find((t) => t.id === id)?.name ?? `#${id}`
  const imageOf = (id?: number) => menu.data?.find((m) => m.menuItemId === id)?.imageUrl
  const [busyId, setBusyId] = useState<number | null>(null)
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15000)
    return () => clearInterval(id)
  }, [])

  const tickets = queue.data ?? []
  const pending = tickets.filter((t) => t.status === 'PENDING')
  const cooking = tickets.filter((t) => t.status === 'COOKING')
  const ready = tickets.filter((t) => t.status === 'READY')

  async function move(t: KitchenTicketResponse, step: 'start' | 'ready' | 'served') {
    setBusyId(t.itemId!)
    try {
      await put(`/kitchen/items/${t.itemId}/${step}`)
      await Promise.all([queue.reload(), load.reload()])
    } catch (e) {
      // Someone else took the dish first: the board simply refreshes
      toast(e instanceof ApiError ? e.message : 'Không cập nhật được', true)
      queue.reload()
    } finally {
      setBusyId(null)
    }
  }

  async function toggleSoldOut(item: BranchMenuItemResponse) {
    try {
      await put(`/branches/${branchId}/menu/${item.menuItemId}/availability`, { available: !item.available })
      menu.setData((list) => list?.map((m) => (m.menuItemId === item.menuItemId ? { ...m, available: !item.available } : m)))
      toast(item.available ? `Đã báo hết ${item.name}` : `${item.name} bán lại`)
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Không cập nhật được', true)
    }
  }

  const state = LOAD_STATE[(load.data?.status as keyof typeof LOAD_STATE) ?? 'NORMAL'] ?? LOAD_STATE.NORMAL
  const branch = branches.find((b) => b.id === branchId)

  return (
    <div className="kds">
      <header className="kds-head">
        <div>
          <h1>Bếp · {branch?.name ?? ''}</h1>
          {queue.error && <div style={{ color: '#ff9db3', fontSize: 14 }}>{queue.error}</div>}
        </div>
        {load.data && (
          <div className="load">
            <span className={`kds-state ${state.cls}`}><state.Icon size={16} aria-hidden="true" />{state.label}</span>
            <div className="load-meter" role="meter" aria-valuenow={load.data.loadPercent} aria-valuemin={0} aria-valuemax={100} aria-label="Tải bếp">
              <span style={{ transform: `scaleX(${Math.min(100, load.data.loadPercent ?? 0) / 100})`, background: load.data.status === 'OVERLOADED' ? 'var(--red)' : load.data.status === 'BUSY' ? 'var(--amber)' : 'var(--green)' }} />
            </div>
            <span className="load-text">
              <strong className="num">{(load.data.pendingPortions ?? 0) + (load.data.cookingPortions ?? 0)}</strong>/{load.data.kitchenCapacity} phần
              {load.data.estimatedWaitMinutes ? ` · chờ ~${load.data.estimatedWaitMinutes}′` : ''}
            </span>
          </div>
        )}
        <div className="clock" aria-label="Giờ hiện tại">{now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</div>
      </header>

      <div className="kds-cols">
        <Column title="Chờ nấu" count={pending.length} Icon={Flame}>
          {pending.map((t, i) => (
            <Ticket key={t.itemId} t={t} image={imageOf(t.menuItemId)} tableName={tableName(t.tableId)} next={i === 0}>
              {cooks && <button className={`btn btn-block ${i === 0 ? 'btn-accent' : 'btn-ghost-chalk'}`} disabled={busyId === t.itemId} onClick={() => move(t, 'start')}>Nhận nấu</button>}
            </Ticket>
          ))}
        </Column>
        <Column title="Đang nấu" count={cooking.length} Icon={Gauge}>
          {cooking.map((t, i) => (
            <Ticket key={t.itemId} t={t} image={imageOf(t.menuItemId)} tableName={tableName(t.tableId)} next={i === 0} cooking>
              {cooks && <button className={`btn btn-block ${i === 0 ? 'btn-chalk-blue' : 'btn-ghost-chalk'}`} disabled={busyId === t.itemId} onClick={() => move(t, 'ready')}>Xong</button>}
            </Ticket>
          ))}
        </Column>
        <Column title="Xong · chờ bưng" count={ready.length} Icon={HandPlatter}>
          {ready.map((t) => (
            <Ticket key={t.itemId} t={t} image={imageOf(t.menuItemId)} tableName={tableName(t.tableId)}>
              <button className="btn btn-ghost-chalk btn-block" disabled={busyId === t.itemId} onClick={() => move(t, 'served')}>Đã bưng ra</button>
            </Ticket>
          ))}
        </Column>
      </div>

      {cooks && menu.data && (
        <div className="kds-soldout" aria-label="Báo hết món">
          <span className="lbl">Báo hết món:</span>
          {menu.data.filter((m) => m.needsKitchen).map((m) => (
            <button key={m.menuItemId} className="chip-toggle" aria-pressed={!m.available} onClick={() => toggleSoldOut(m)} title={m.available ? 'Bấm để báo hết' : 'Bấm để bán lại'}>
              <DishThumb src={m.imageUrl} name={m.name} size="sm" />
              <Strikable on={!m.available}>{m.name}</Strikable>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function Column({ title, count, Icon, children }: { title: string; count: number; Icon: typeof Flame; children: React.ReactNode }) {
  const empty = Array.isArray(children) ? children.length === 0 : !children
  return (
    <section className="kds-col" aria-label={title}>
      <h2><Icon size={18} aria-hidden="true" />{title}<span className={`count${count === 0 ? ' zero' : ''}`}><Counter value={count} label={`${count} món`} /></span></h2>
      {empty ? <div className="kds-empty">Trống</div> : children}
    </section>
  )
}

function Ticket({ t, image, tableName, next, cooking, children }: {
  t: KitchenTicketResponse; image?: string; tableName: string; next?: boolean; cooking?: boolean; children: React.ReactNode
}) {
  const late = (t.waitingMinutes ?? 0) >= LATE_MINUTES && t.status !== 'READY'
  return (
    <article className={`kticket${late ? ' late' : ''}${next ? ' next' : ''}${cooking ? ' cooking' : ''}`}>
      <div className="ktop">
        <span className="kname with-thumb"><DishThumb src={image} name={t.itemName} size={next ? 'lg' : 'md'} />{t.itemName}</span>
        <span className="kqty" aria-label={`${t.quantity} phần`}>×{t.quantity}</span>
      </div>
      {t.note && <div className="knote">{t.note}</div>}
      <div className="kmeta">
        <span>{t.orderType === 'DINE_IN' ? `Bàn ${tableName}` : ORDER_TYPE_LABEL[t.orderType!]} · {t.orderCode?.split('-').pop()}</span>
        <span className="kwait">{late && <AlertTriangle size={14} aria-hidden="true" style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} />}{t.waitingMinutes} phút</span>
      </div>
      {children}
    </article>
  )
}
