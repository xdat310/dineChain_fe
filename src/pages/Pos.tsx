import { Ban, Check, CupSoda, Globe, HandPlatter, Landmark, Minus, Plus, Search, Send, ShoppingBag, Ticket, Trash2, UserRound, Wallet, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { ApiError, get, post, put } from '../api/client'
import type {
  BranchLoadResponse, BranchMenuItemResponse, CustomerResponse, MenuCategoryResponse, OrderItemResponse,
  OrderResponse, PaymentResponse, PromotionCheckResponse, TableResponse,
} from '../api/types'
import { can, useAuth } from '../auth'
import { Strikable } from '../components/ChalkStrike'
import { DishThumb } from '../components/DishThumb'
import { GuestOrderAlerts, useGuestOrderAlerts } from '../components/GuestOrderAlerts'
import { TakeawayAlerts, useTakeawayReminders } from '../components/TakeawayAlerts'
import { unlockSound } from '../lib/chime'
import { Empty, ErrorNotice, Loading } from '../components/Feedback'
import { Chip, LoadState } from '../components/State'
import { useToast } from '../components/Toast'
import { ITEM_STATUS_LABEL, ORDER_TYPE_LABEL, money, time } from '../lib/format'
import { useData } from '../lib/useData'
import { Counter } from '../components/Counter'

type Selection =
  | { kind: 'table'; tableId: number }
  | { kind: 'order'; orderId: number }
  | { kind: 'new'; type: 'TAKEAWAY' | 'DELIVERY' }
  | null

interface DraftLine { menuItemId: number; quantity: number }

const QUICK_CASH = [50000, 100000, 200000, 500000]

export function Pos() {
  const { branchId, role } = useAuth()
  const toast = useToast()
  const [mode, setMode] = useState<'floor' | 'takeaway'>('floor')
  const [selection, setSelection] = useState<Selection>(null)
  const [draft, setDraft] = useState<DraftLine[]>([])

  const tables = useData(() => get<TableResponse[]>(`/branches/${branchId}/tables`), [branchId], 10000)
  const orders = useData(() => get<OrderResponse[]>(`/orders/branch/${branchId}`), [branchId], 8000)
  const menu = useData(() => get<BranchMenuItemResponse[]>(`/branches/${branchId}/menu`), [branchId], 30000)
  const categories = useData(() => get<MenuCategoryResponse[]>('/menu-categories/search?q='), [])
  const load = useData(() => get<BranchLoadResponse>(`/kitchen/branches/${branchId}/load`), [branchId], 15000)

  const openOrders = useMemo(() => orders.data ?? [], [orders.data])
  // Takeaway reminders ring at the cash desk only: the cashier is the one who takes the money and hands food over
  const refunds = useData(
    () => (can.cash(role) ? get<OrderResponse[]>(`/orders/branch/${branchId}/refunds-due`) : Promise.resolve([])),
    [branchId, role], 15000)
  const reminders = useTakeawayReminders(orders.data, refunds.data, can.cash(role))
  const guestOrders = useGuestOrderAlerts(orders.data, true)
  const [settling, setSettling] = useState<number | null>(null)
  async function refunded(orderId: number) {
    if (!window.confirm('Đã chuyển trả tiền cho khách, hoặc đã kiểm tra là tiền chưa hề về?')) return
    setSettling(orderId)
    try {
      await put(`/orders/${orderId}/refund-settled`)
      await refunds.reload()
      toast('Đã ghi nhận hoàn tiền')
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Không lưu được', true)
    } finally {
      setSettling(null)
    }
  }
  useEffect(() => unlockSound(), [])
  const ordersByTable = useMemo(() => {
    const map = new Map<number, OrderResponse[]>()
    for (const o of openOrders) if (o.tableId) map.set(o.tableId, [...(map.get(o.tableId) ?? []), o])
    return map
  }, [openOrders])

  const currentOrder: OrderResponse | undefined =
    selection?.kind === 'order' ? openOrders.find((o) => o.id === selection.orderId)
      : selection?.kind === 'table' ? ordersByTable.get(selection.tableId)?.[0]
        : undefined
  const tableOrders = selection?.kind === 'table' ? ordersByTable.get(selection.tableId) ?? [] : []

  function select(next: Selection) {
    setSelection(next)
    setDraft([])
  }

  function addDish(item: BranchMenuItemResponse) {
    if (!selection) {
      toast('Chọn bàn hoặc tạo đơn mang đi trước', true)
      return
    }
    setDraft((d) => {
      const existing = d.find((l) => l.menuItemId === item.menuItemId)
      return existing
        ? d.map((l) => (l.menuItemId === item.menuItemId ? { ...l, quantity: l.quantity + 1 } : l))
        : [...d, { menuItemId: item.menuItemId!, quantity: 1 }]
    })
  }

  async function refreshAll() {
    // The menu too: a ready-made dish may have just used up its stock
    await Promise.all([orders.reload(), tables.reload(), load.reload(), menu.reload()])
  }

  const takeawayPaused = load.data && !load.data.acceptingTakeaway
  // Drinks and ready-made dishes: the floor staff say when they are gone, or the stock does
  const [stockPanel, setStockPanel] = useState(false)
  const readyMadeOut = (menu.data ?? []).filter((m) => !m.needsKitchen && !m.available).length
  // Web takeaway the cashier still has to take money for (the kitchen does not see them yet)
  const waitingWeb = openOrders.filter((o) => o.status === 'AWAITING_PAYMENT').length

  return (
    <div className="pos">
      <div className="pos-work">
        <div className="pos-toolbar">
          <div className="seg" role="group" aria-label="Loại đơn">
            <button aria-pressed={mode === 'floor'} onClick={() => setMode('floor')}>Tại bàn</button>
            <button aria-pressed={mode === 'takeaway'} onClick={() => setMode('takeaway')}>
              Mang đi · Giao hàng{waitingWeb > 0 && <span className="seg-badge" aria-label={`${waitingWeb} đơn web chờ thanh toán`}>{waitingWeb}</span>}
            </button>
          </div>
          <button className="btn btn-sm" aria-expanded={stockPanel} onClick={() => setStockPanel(!stockPanel)}>
            <CupSoda size={15} aria-hidden="true" /> Hết hàng
            {readyMadeOut > 0 && <span className="seg-badge" style={{ background: 'var(--red)' }}>{readyMadeOut}</span>}
          </button>
          {load.data && (
            <div className="row" style={{ fontSize: 14, color: 'var(--ink-soft)' }}>
              Bếp: <LoadState status={load.data.status} />
              <span className="num">{load.data.loadPercent}%</span>
              {load.data.estimatedWaitMinutes != null && load.data.estimatedWaitMinutes > 0 && <span>· chờ ~{load.data.estimatedWaitMinutes} phút</span>}
            </div>
          )}
        </div>

        <GuestOrderAlerts alerts={guestOrders.alerts} onDismiss={guestOrders.dismiss}
          tableName={(id) => `Bàn ${tables.data?.find((t) => t.id === id)?.name ?? ''}`.trim()}
          onOpen={(tableId) => { setMode('floor'); select({ kind: 'table', tableId }) }} />
        <TakeawayAlerts alerts={reminders.alerts} onDismiss={reminders.dismiss} onRefunded={refunded} settling={settling}
          onOpen={(orderId) => { setMode('takeaway'); select({ kind: 'order', orderId }) }} />

        {stockPanel && (
          <ReadyMadeStock items={(menu.data ?? []).filter((m) => !m.needsKitchen)} branchId={branchId!} onChanged={menu.reload} />
        )}

        {mode === 'floor' ? (
          <FloorPlan
            tables={tables.data}
            error={tables.error}
            ordersByTable={ordersByTable}
            selectedTable={selection?.kind === 'table' ? selection.tableId : undefined}
            onSelect={(tableId) => select({ kind: 'table', tableId })}
          />
        ) : (
          <TakeawayList
            orders={openOrders.filter((o) => o.orderType !== 'DINE_IN')}
            paused={!!takeawayPaused}
            wait={load.data?.estimatedWaitMinutes}
            selected={selection}
            onNew={(type) => select({ kind: 'new', type })}
            onSelect={(orderId) => select({ kind: 'order', orderId })}
          />
        )}

        <div style={{ marginTop: 22 }}>
          <MenuBoard
            items={menu.data}
            categories={categories.data}
            error={menu.error}
            onAdd={addDish}
            disabled={!selection || currentOrder?.status === 'AWAITING_PAYMENT'}
          />
        </div>
      </div>

      <OrderColumn
        key={selection ? JSON.stringify(selection) + (currentOrder?.id ?? '') : 'none'}
        role={role}
        branchId={branchId!}
        selection={selection}
        order={currentOrder}
        siblingOrders={tableOrders}
        onPickSibling={(orderId) => select({ kind: 'order', orderId })}
        tableName={selection?.kind === 'table' ? tables.data?.find((t) => t.id === selection.tableId)?.name : undefined}
        menu={menu.data ?? []}
        draft={draft}
        setDraft={setDraft}
        onChanged={refreshAll}
        onCreated={(order) => {
          refreshAll()
          if (order.orderType !== 'DINE_IN') setSelection({ kind: 'order', orderId: order.id! })
          setDraft([])
        }}
        onClosed={() => {
          refreshAll()
          select(null)
        }}
      />
    </div>
  )
}

// ---------------------------------------------------------------- floor plan

function FloorPlan({ tables, error, ordersByTable, selectedTable, onSelect }: {
  tables?: TableResponse[]; error: string | null; ordersByTable: Map<number, OrderResponse[]>
  selectedTable?: number; onSelect: (id: number) => void
}) {
  if (error) return <ErrorNotice message={error} />
  if (!tables) return <Loading label="Đang tải sơ đồ bàn…" />
  if (tables.length === 0) return <Empty title="Chi nhánh chưa có bàn">Quản lý cần tạo khu vực và bàn.</Empty>

  const areas = new Map<number, TableResponse[]>()
  for (const t of tables) areas.set(t.areaId!, [...(areas.get(t.areaId!) ?? []), t])

  return (
    <div className="floor-areas">
      {[...areas.entries()].map(([areaId, list], i) => (
        <section key={areaId}>
          <h2 className="area-title">Khu {i + 1}</h2>
          {/* compact rows split an area evenly so no table is left alone on a row */}
          <div
            className={`floor${selectedTable ? ' has-focus compact' : ''}`}
            style={{ '--cols': Math.min(list.length, 10), '--cols-narrow': Math.ceil(Math.min(list.length, 10) / 2) } as React.CSSProperties}
          >
            {list.map((t) => {
              const open = ordersByTable.get(t.id!) ?? []
              const occupied = open.length > 0 || t.status === 'OCCUPIED'
              const total = open.reduce((s, o) => s + (o.totalAmount ?? 0), 0)
              const ready = open.some((o) => o.items?.some((it) => it.status === 'READY'))
              return (
                <button
                  key={t.id}
                  className={`table-tile${occupied ? ' occupied' : ''}${selectedTable === t.id ? ' selected' : ''}`}
                  onClick={() => onSelect(t.id!)}
                  aria-pressed={selectedTable === t.id}
                  aria-label={`Bàn ${t.name}${occupied ? ', có khách' : ', trống'}`}
                >
                  <span className="tno">{t.name}</span>
                  <span className="tmeta">
                    <span>{occupied ? money(total) : `${t.capacity} chỗ`}</span>
                    {ready && <span className="tile-ready">Có món ra</span>}
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------- takeaway

function TakeawayList({ orders, paused, wait, selected, onNew, onSelect }: {
  orders: OrderResponse[]; paused: boolean; wait?: number; selected: Selection
  onNew: (type: 'TAKEAWAY' | 'DELIVERY') => void; onSelect: (id: number) => void
}) {
  return (
    <div>
      {paused && (
        <div className="notice notice-bad" style={{ marginBottom: 14 }} role="alert">
          <Ban size={18} aria-hidden="true" />
          <div>
            <strong>Bếp đang quá tải — tạm ngưng nhận đơn mang đi và giao hàng.</strong>{' '}
            Khách tại bàn vẫn được phục vụ{wait ? `; ước tính chờ ~${wait} phút` : ''}. Hệ thống tự mở lại khi bếp bớt tải.
          </div>
        </div>
      )}
      <div className="row" style={{ marginBottom: 14 }}>
        <button className="btn btn-accent" onClick={() => onNew('TAKEAWAY')} disabled={paused}>
          <ShoppingBag size={18} aria-hidden="true" /> Đơn mang đi mới
        </button>
        <button className="btn" onClick={() => onNew('DELIVERY')} disabled={paused}>Đơn giao hàng mới</button>
      </div>
      {orders.some((o) => o.status === 'AWAITING_PAYMENT') && (
        <>
          <h3 className="area-title"><Globe size={14} aria-hidden="true" /> Đơn web chờ thanh toán · bếp chưa nhận</h3>
          <div className="takeaway-list" style={{ marginBottom: 18 }}>
            {orders.filter((o) => o.status === 'AWAITING_PAYMENT').map((o) => (
              <button key={o.id} className={`ticket web-waiting${selected?.kind === 'order' && selected.orderId === o.id ? ' selected' : ''}`} onClick={() => onSelect(o.id!)}>
                <span className="row" style={{ justifyContent: 'space-between' }}>
                  <span className="code">{o.code}</span>
                  <Chip tone={o.transferClaimedAt ? 'info' : 'warn'}>{o.transferClaimedAt ? 'Khách báo đã chuyển' : o.payMethod === 'BANK_TRANSFER' ? 'Chuyển khoản' : 'Tiền mặt'}</Chip>
                </span>
                <span style={{ fontWeight: 600 }}>{o.guestName} · <span className="num">{o.guestPhone}</span></span>
                <span className="muted" style={{ fontSize: 13 }}>{o.items?.filter((i) => i.status !== 'CANCELLED').length} món · đặt lúc {time(o.createdAt)}</span>
                <span className="num" style={{ fontWeight: 700 }}>{money(o.totalAmount)}</span>
              </button>
            ))}
          </div>
        </>
      )}
      {orders.filter((o) => o.status !== 'AWAITING_PAYMENT').length === 0 ? (
        <Empty title="Chưa có đơn mang đi nào đang mở" />
      ) : (
        <div className="takeaway-list">
          {orders.filter((o) => o.status !== 'AWAITING_PAYMENT').map((o) => (
            <button key={o.id} className={`ticket${selected?.kind === 'order' && selected.orderId === o.id ? ' selected' : ''}`} onClick={() => onSelect(o.id!)}>
              <span className="row" style={{ justifyContent: 'space-between' }}>
                <span className="code">{o.code}</span>
                <Chip tone="neutral">{ORDER_TYPE_LABEL[o.orderType!]}</Chip>
              </span>
              <span className="muted" style={{ fontSize: 13 }}>{o.items?.filter((i) => i.status !== 'CANCELLED').length} món · {time(o.createdAt)}</span>
              <span className="num" style={{ fontWeight: 700 }}>{money(o.totalAmount)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------- menu board (chalk)

function MenuBoard({ items, categories, error, onAdd, disabled }: {
  items?: BranchMenuItemResponse[]; categories?: MenuCategoryResponse[]; error: string | null
  onAdd: (item: BranchMenuItemResponse) => void; disabled: boolean
}) {
  if (error) return <ErrorNotice message={error} />
  if (!items) return <Loading label="Đang tải menu…" />
  const groups = new Map<number, BranchMenuItemResponse[]>()
  for (const it of items) groups.set(it.categoryId!, [...(groups.get(it.categoryId!) ?? []), it])
  const catName = (id: number) => categories?.find((c) => c.id === id)?.name ?? 'Món'

  return (
    <section className="menu-board" id="menu-board" aria-label="Menu chi nhánh">
      <h3>
        <span className="chalk board-title">Hôm nay có</span>
        {disabled && <span style={{ fontSize: 13, fontWeight: 500 }}>Chọn bàn để gọi món</span>}
      </h3>
      {[...groups.entries()].map(([catId, list]) => (
        <div key={catId}>
          <div className="menu-cat">{catName(catId)}</div>
          {list.map((it) => {
            const soldOut = !it.available
            return (
              <button
                key={it.menuItemId}
                className={`dish${soldOut ? ' soldout' : ''}`}
                onClick={() => onAdd(it)}
                disabled={soldOut}
                aria-label={soldOut ? `${it.name}, hết món` : `Thêm ${it.name}, ${money(it.price)}`}
              >
                <DishThumb src={it.imageUrl} name={it.name} size="sm" />
                <span className="dname"><Strikable on={soldOut}>{it.name}</Strikable></span>
                <span className="dots" aria-hidden="true" />
                {soldOut ? <span className="soldout-tag">{it.outOfStock ? 'hết kho' : 'hết'}</span> : <span className="dprice">{money(it.price)}</span>}
                {!soldOut && <Plus className="add" size={18} aria-hidden="true" />}
              </button>
            )
          })}
        </div>
      ))}
    </section>
  )
}

// ---------------------------------------------------------------- order column

function OrderColumn(props: {
  role?: string; branchId: number; selection: Selection; order?: OrderResponse; siblingOrders: OrderResponse[]
  onPickSibling: (id: number) => void; tableName?: string; menu: BranchMenuItemResponse[]
  draft: DraftLine[]; setDraft: (fn: (d: DraftLine[]) => DraftLine[]) => void
  onChanged: () => Promise<void> | void; onCreated: (o: OrderResponse) => void; onClosed: () => void
}) {
  const { selection, order, draft, setDraft, menu, branchId } = props
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paying, setPaying] = useState(false)

  // extras for a brand-new order
  const [phone, setPhone] = useState('')
  const [customer, setCustomer] = useState<CustomerResponse | null>(null)
  const [newName, setNewName] = useState('')
  const [notFound, setNotFound] = useState(false)
  const [points, setPoints] = useState(0)
  const [promo, setPromo] = useState('')
  const [promoCheck, setPromoCheck] = useState<PromotionCheckResponse | null>(null)

  const payment = useData(
    () => (order ? get<PaymentResponse>(`/payments/order/${order.id}`).catch(() => null) : Promise.resolve(null)),
    [order?.id, order?.totalAmount],
  )

  if (!selection) {
    return (
      <aside className="pos-order" aria-label="Đơn hàng">
        <Empty title="Chưa chọn bàn">Chạm vào một bàn trên sơ đồ, hoặc tạo đơn mang đi.</Empty>
      </aside>
    )
  }

  const priceOf = (id: number) => menu.find((m) => m.menuItemId === id)
  const draftSubtotal = draft.reduce((s, l) => s + (priceOf(l.menuItemId)?.price ?? 0) * l.quantity, 0)
  const paid = payment.data?.status === 'PAID'
  const awaiting = order?.status === 'AWAITING_PAYMENT'
  const items = order?.items ?? []
  const unfinished = items.filter((i) => i.status === 'PENDING' || i.status === 'COOKING' || i.status === 'READY')

  async function run(action: () => Promise<unknown>, success?: string) {
    setBusy(true)
    setError(null)
    try {
      await action()
      if (success) toast(success)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Có lỗi xảy ra')
    } finally {
      setBusy(false)
    }
  }

  const draftItems = draft.map((l) => ({ menuItemId: l.menuItemId, quantity: l.quantity }))

  const createOrder = () => run(async () => {
    const created = await post<OrderResponse>('/orders', {
      branchId,
      orderType: selection.kind === 'table' ? 'DINE_IN' : selection.kind === 'new' ? selection.type : 'TAKEAWAY',
      tableId: selection.kind === 'table' ? selection.tableId : undefined,
      customerId: customer?.id,
      promotionCode: promoCheck ? promo.trim() : undefined,
      pointsToUse: points > 0 ? points : undefined,
      items: draftItems,
    })
    props.onCreated(created)
  }, 'Đã gửi bếp')

  // No bank integration: the cashier checks the bank app for the amount with the order code as the transfer note
  const confirmTransfer = () => {
    if (!window.confirm(`Đã thấy ${money(order!.totalAmount)} với nội dung ${order!.code} về tài khoản?`)) return
    run(async () => {
      await post<PaymentResponse>('/payments', { orderId: order!.id, paymentMethod: 'BANK_TRANSFER' })
      await payment.reload()
      await props.onChanged()
    }, `Đã xác nhận chuyển khoản ${order!.code}, món xuống bếp`)
  }

  const addItems = () => run(async () => {
    await post(`/orders/${order!.id}/items`, { items: draftItems })
    setDraft(() => [])
    await props.onChanged()
  }, 'Đã gửi thêm món')

  const cancelItem = (item: OrderItemResponse) => run(async () => {
    await put(`/orders/${order!.id}/items/${item.id}/cancel`, { reason: 'Huỷ tại quầy' })
    await props.onChanged()
  }, `Đã huỷ ${item.itemName}`)

  const serveItem = (item: OrderItemResponse) => run(async () => {
    await put(`/kitchen/items/${item.id}/served`)
    await props.onChanged()
  }, `Đã bưng ${item.itemName}`)

  const complete = () => run(async () => {
    await put(`/orders/${order!.id}/complete`)
    props.onClosed()
  }, 'Đã hoàn tất đơn')

  const cancelOrder = () => {
    if (!window.confirm(`Huỷ cả đơn ${order!.code}? Các món chưa phục vụ sẽ bị gỡ khỏi bếp.`)) return
    run(async () => {
      await put(`/orders/${order!.id}/cancel`)
      props.onClosed()
    }, 'Đã huỷ đơn')
  }

  async function lookupCustomer() {
    setNotFound(false)
    setCustomer(null)
    try {
      setCustomer(await get<CustomerResponse>(`/customers/by-phone?phone=${encodeURIComponent(phone.trim())}`))
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) setNotFound(true)
      else setError(e instanceof ApiError ? e.message : 'Không tra được khách')
    }
  }

  async function createCustomer() {
    await run(async () => {
      setCustomer(await post<CustomerResponse>('/customers', { fullName: newName.trim(), phone: phone.trim() }))
      setNotFound(false)
    }, 'Đã tạo khách')
  }

  async function checkPromo() {
    setPromoCheck(null)
    await run(async () => {
      setPromoCheck(await get<PromotionCheckResponse>(
        `/promotions/check?code=${encodeURIComponent(promo.trim())}&branchId=${branchId}&orderAmount=${draftSubtotal}`))
    })
  }

  const title = selection.kind === 'table' ? props.tableName ?? '' : order?.code ?? (selection.kind === 'new' ? ORDER_TYPE_LABEL[selection.type] : '')

  return (
    <aside className="pos-order" aria-label="Đơn hàng">
      <div className="order-head">
        <div>
          {selection.kind === 'table' ? <div className="big">Bàn {title}</div> : <div style={{ fontWeight: 700, fontSize: 20 }}>{title}</div>}
          <div className="code">
            {order ? `${order.code} · ${ORDER_TYPE_LABEL[order.orderType!]} · mở lúc ${time(order.createdAt)}` : 'Đơn mới'}
          </div>
        </div>
        {paid && <Chip tone="ok"><Check size={14} aria-hidden="true" /> Đã thu tiền</Chip>}
      </div>
      {order?.guestName && (
        <div className={`web-guest${awaiting ? ' waiting' : ''}`}>
          <Globe size={16} aria-hidden="true" />
          <div>
            <strong>Đơn web · {order.guestName}</strong> · <span className="num">{order.guestPhone}</span>
            <div>{awaiting
              ? `Chờ thanh toán (${order.payMethod === 'BANK_TRANSFER' ? 'khách chọn chuyển khoản' : 'khách trả tiền mặt tại quầy'}). Bếp chỉ nhận đơn sau khi thu tiền.`
              : `Khách đã trả ${order.payMethod === 'BANK_TRANSFER' ? 'bằng chuyển khoản' : 'tiền mặt'}.`}</div>
          </div>
        </div>
      )}

      {props.siblingOrders.length > 1 && (
        <div className="row" style={{ padding: '8px 20px', borderBottom: '1px solid var(--rule)', fontSize: 13 }}>
          Bàn có {props.siblingOrders.length} đơn:
          {props.siblingOrders.map((o) => (
            <button key={o.id} className="btn btn-sm" onClick={() => props.onPickSibling(o.id!)} aria-pressed={o.id === order?.id}>{o.code?.split('-').pop()}</button>
          ))}
        </div>
      )}

      <div className="order-lines">
        {error && <div style={{ margin: '10px 0' }}><ErrorNotice message={error} /></div>}
        {items.length === 0 && draft.length === 0 && (
          <Empty title={order ? 'Đơn chưa có món' : 'Chưa gọi món'}>Chạm vào món trên bảng để thêm.</Empty>
        )}
        {items.map((it) => {
          const cancelled = it.status === 'CANCELLED'
          return (
            <div key={it.id} className={`line${cancelled ? ' cancelled' : ''}`}>
              <span className="lname with-thumb"><DishThumb src={menu.find((m) => m.menuItemId === it.menuItemId)?.imageUrl} name={it.itemName} size="sm" /><Strikable on={cancelled}>{it.quantity} × {it.itemName}</Strikable></span>
              <span className="lamt">{money(it.amount)}</span>
              <span className="lsub">
                <ItemStatus status={it.status} />
                {it.cancelReason && <span>· {it.cancelReason}</span>}
                <span style={{ marginLeft: 'auto' }} className="row">
                  {it.status === 'READY' && !paid && (
                    <button className="btn btn-sm btn-accent" onClick={() => serveItem(it)} disabled={busy}>
                      <HandPlatter size={15} aria-hidden="true" /> Bưng ra
                    </button>
                  )}
                  {!paid && !awaiting && (it.status === 'PENDING' || (can.cancelCooking(props.role) && (it.status === 'COOKING' || it.status === 'READY'))) && (
                    <button className="icon-btn" title="Huỷ món" aria-label={`Huỷ ${it.itemName}`} onClick={() => cancelItem(it)} disabled={busy}>
                      <X size={16} aria-hidden="true" />
                    </button>
                  )}
                </span>
              </span>
            </div>
          )
        })}
        {draft.map((l) => {
          const m = priceOf(l.menuItemId)
          return (
            <div key={l.menuItemId} className="line">
              <span className="lname with-thumb"><DishThumb src={m?.imageUrl} name={m?.name} size="sm" />{m?.name}</span>
              <span className="lamt">{money((m?.price ?? 0) * l.quantity)}</span>
              <span className="lsub">
                <Chip tone="warn">Chưa gửi bếp</Chip>
                <span className="qty-btns" style={{ marginLeft: 'auto' }}>
                  <button className="icon-btn" aria-label="Bớt" onClick={() => setDraft((d) => d.map((x) => x.menuItemId === l.menuItemId ? { ...x, quantity: Math.max(1, x.quantity - 1) } : x))}><Minus size={16} /></button>
                  <span className="num" style={{ minWidth: 24, textAlign: 'center', fontWeight: 700, color: 'var(--ink)' }}>{l.quantity}</span>
                  <button className="icon-btn" aria-label="Thêm" onClick={() => setDraft((d) => d.map((x) => x.menuItemId === l.menuItemId ? { ...x, quantity: x.quantity + 1 } : x))}><Plus size={16} /></button>
                  <button className="icon-btn" aria-label="Bỏ món" onClick={() => setDraft((d) => d.filter((x) => x.menuItemId !== l.menuItemId))}><Trash2 size={16} /></button>
                </span>
              </span>
            </div>
          )
        })}
      </div>

      {!order && draft.length > 0 && (
        <div className="extras">
          <div className="row">
            <UserRound size={18} aria-hidden="true" className="muted" />
            {customer ? (
              <span style={{ flex: 1 }}><strong>{customer.fullName ?? customer.phone}</strong> · <span className="num">{customer.points}</span> điểm</span>
            ) : (
              <>
                <input className="input" inputMode="tel" placeholder="SĐT khách (tích điểm)" value={phone} onChange={(e) => setPhone(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && lookupCustomer()} />
                <button className="btn btn-sm" onClick={lookupCustomer} disabled={!phone.trim()}><Search size={15} aria-hidden="true" /> Tra</button>
              </>
            )}
            {customer && <button className="btn btn-sm btn-ghost" onClick={() => { setCustomer(null); setPoints(0) }}>Đổi</button>}
          </div>
          {notFound && (
            <div className="row">
              <input className="input" placeholder="Tên khách mới" value={newName} onChange={(e) => setNewName(e.target.value)} />
              <button className="btn btn-sm" onClick={createCustomer} disabled={!newName.trim() || busy}>Tạo khách</button>
            </div>
          )}
          {customer && (customer.points ?? 0) > 0 && (
            <label className="row" style={{ fontSize: 14 }}>
              Dùng điểm
              <input className="input num" type="number" min={0} max={customer.points} value={points} onChange={(e) => setPoints(Math.max(0, Math.min(customer.points ?? 0, Number(e.target.value))))} style={{ width: 100, flex: 'none' }} />
              <span className="muted">= {money(points * 1000)}</span>
            </label>
          )}
          <div className="row">
            <Ticket size={18} aria-hidden="true" className="muted" />
            <input className="input" placeholder="Mã khuyến mãi" value={promo} onChange={(e) => { setPromo(e.target.value.toUpperCase()); setPromoCheck(null) }} />
            <button className="btn btn-sm" onClick={checkPromo} disabled={!promo.trim() || busy}>Áp mã</button>
          </div>
          {promoCheck && <div className="notice notice-ok" style={{ padding: '8px 12px' }}><Check size={16} aria-hidden="true" /> {promoCheck.name}: giảm {money(promoCheck.discount)}</div>}
        </div>
      )}

      <MoneyProof order={order} draftSubtotal={draftSubtotal} draftDiscount={promoCheck?.discount ?? 0} draftPoints={points} />

      {paying && order && !paid ? (
        <PayPanel
          total={order.totalAmount ?? 0}
          busy={busy}
          onCancel={() => setPaying(false)}
          onPay={(cash) => run(async () => {
            const p = await post<PaymentResponse>('/payments', { orderId: order.id, cashReceived: cash })
            setPaying(false)
            await payment.reload()
            await props.onChanged()
            toast(`Đã thu ${money(p.cashReceived)} — thối ${money(p.changeAmount)}`)
          })}
        />
      ) : (
        <div className="order-actions">
          {draft.length > 0 ? (
            <button className="btn btn-primary btn-lg btn-block" onClick={order ? addItems : createOrder} disabled={busy}>
              <Send size={18} aria-hidden="true" /> {order ? 'Gửi thêm món' : 'Gửi bếp'} · {draft.reduce((s, l) => s + l.quantity, 0)} phần
            </button>
          ) : order && !paid && !can.cash(props.role) ? (
            <div className="notice notice-ok">{awaiting ? 'Đơn web chờ thu ngân thu tiền.' : 'Gọi món xong. Khách thanh toán tiền mặt tại quầy thu ngân.'}</div>
          ) : order && awaiting && order.payMethod === 'BANK_TRANSFER' ? (
            <>
              <button className="btn btn-primary btn-lg btn-block" disabled={busy} onClick={confirmTransfer}>
                <Landmark size={18} aria-hidden="true" /> Đã nhận chuyển khoản · <span className="num">{money(order.totalAmount)}</span>
              </button>
              <button className="btn btn-block" disabled={busy} onClick={() => setPaying(true)}>
                <Wallet size={16} aria-hidden="true" /> Khách trả tiền mặt thay
              </button>
            </>
          ) : order && !paid ? (
            <button className="btn btn-primary btn-lg btn-block" onClick={() => setPaying(true)} disabled={busy || (order.totalAmount ?? 0) < 0}>
              <Wallet size={18} aria-hidden="true" /> Thu tiền mặt · <span className="num">{money(order.totalAmount)}</span>
            </button>
          ) : order && paid && can.cash(props.role) ? (
            <button className="btn btn-primary btn-lg btn-block" onClick={complete} disabled={busy || unfinished.length > 0}>
              <Check size={18} aria-hidden="true" /> {unfinished.length > 0 ? `Còn ${unfinished.length} món chưa bưng` : 'Hoàn tất đơn, trả bàn'}
            </button>
          ) : null}
          {order && !paid && can.cash(props.role) && (
            <button className="btn btn-danger btn-block" onClick={cancelOrder} disabled={busy}>Huỷ đơn</button>
          )}
          {payment.data && paid && (
            <div className="muted num" style={{ fontSize: 13, textAlign: 'center' }}>
              {payment.data.method === 'BANK_TRANSFER'
                ? `Đã nhận chuyển khoản ${money(payment.data.amount)}`
                : `Khách đưa ${money(payment.data.cashReceived)} · thối ${money(payment.data.changeAmount)}`}
            </div>
          )}
        </div>
      )}
    </aside>
  )
}

function ItemStatus({ status }: { status?: string }) {
  const tone = status === 'READY' ? 'warn' : status === 'SERVED' ? 'ok' : status === 'COOKING' ? 'info' : 'neutral'
  return <Chip tone={tone}>{ITEM_STATUS_LABEL[status ?? ''] ?? status}</Chip>
}

// Money always shows its working: subtotal − promotion − points + VAT = total
function MoneyProof({ order, draftSubtotal, draftDiscount, draftPoints }: {
  order?: OrderResponse; draftSubtotal: number; draftDiscount: number; draftPoints: number
}) {
  if (!order && draftSubtotal === 0) return null
  if (!order) {
    return (
      <div className="money-proof">
        <div className="mrow"><span>Tạm tính</span><span>{money(draftSubtotal)}</span></div>
        {draftDiscount > 0 && <div className="mrow minus"><span>Khuyến mãi</span><span>−{money(draftDiscount)}</span></div>}
        {draftPoints > 0 && <div className="mrow minus"><span>Điểm ({draftPoints})</span><span>−{money(draftPoints * 1000)}</span></div>}
        <div className="mrow"><span>VAT</span><span>tính khi gửi bếp</span></div>
      </div>
    )
  }
  return (
    <div className="money-proof">
      <div className="mrow"><span>Tạm tính</span><span>{money(order.subtotal)}</span></div>
      {(order.discountAmount ?? 0) > 0 && <div className="mrow minus"><span>Khuyến mãi</span><span>−{money(order.discountAmount)}</span></div>}
      {(order.pointsUsed ?? 0) > 0 && <div className="mrow minus"><span>Điểm ({order.pointsUsed})</span><span>−{money(order.pointsDiscount)}</span></div>}
      <div className="mrow"><span>VAT</span><span>+{money(order.vatAmount)}</span></div>
      <div className="total"><span>Tổng</span><strong className="num"><Counter value={money(order.totalAmount)} size="sm" /></strong></div>
    </div>
  )
}

function PayPanel({ total, busy, onPay, onCancel }: { total: number; busy: boolean; onPay: (cash: number) => void; onCancel: () => void }) {
  const [cash, setCash] = useState<number>(0)
  const change = cash - total
  const suggestions = [total, ...QUICK_CASH.filter((v) => v > total)].slice(0, 6)
  return (
    <div className="pay" style={{ borderTop: '1px solid var(--rule)' }}>
      <label className="field">
        Khách đưa (tiền mặt)
        <input className="input num" type="number" min={0} step={1000} autoFocus value={cash || ''} onChange={(e) => setCash(Number(e.target.value))} style={{ fontSize: 22, minHeight: 52 }} />
      </label>
      <div className="quick-cash">
        {suggestions.map((v, i) => (
          <button key={i} className="btn" aria-pressed={cash === v} onClick={() => setCash(v)}>{i === 0 ? 'Vừa đủ' : money(v)}</button>
        ))}
      </div>
      <div className={`change${change < 0 ? ' short' : ''}`} aria-live="polite">
        <span>{change < 0 ? 'Còn thiếu' : 'Tiền thối'}</span>
        <strong className="num">{money(Math.abs(change))}</strong>
      </div>
      <button className="btn btn-primary btn-lg btn-block" onClick={() => onPay(cash)} disabled={busy || cash < total}>
        <Wallet size={18} aria-hidden="true" /> Xác nhận đã thu {money(cash)}
      </button>
      <button className="btn btn-ghost btn-block" onClick={onCancel}>Quay lại</button>
    </div>
  )
}

// ---------------------------------------------------------------- ready-made dishes: sold out by the floor, not the kitchen

function ReadyMadeStock({ items, branchId, onChanged }: { items: BranchMenuItemResponse[]; branchId: number; onChanged: () => Promise<void> }) {
  const toast = useToast()
  const [busy, setBusy] = useState<number | null>(null)
  async function toggle(m: BranchMenuItemResponse) {
    setBusy(m.menuItemId!)
    try {
      await put(`/branches/${branchId}/menu/${m.menuItemId}/availability`, { available: !m.available })
      await onChanged()
      toast(m.available ? `Đã báo hết ${m.name}` : `${m.name} bán lại`)
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Không cập nhật được', true)
    } finally {
      setBusy(null)
    }
  }
  return (
    <section className="ready-made panel panel-pad" aria-label="Món có sẵn">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <strong>Đồ uống & món có sẵn</strong>
        <span className="muted" style={{ fontSize: 13 }}>Bấm để báo hết / bán lại. Món gắn kho tự hết khi kho hết.</span>
      </div>
      {items.length === 0 ? <span className="muted">Chưa có món nào được đặt là “Có sẵn” trong Menu chung.</span> : (
        <div className="row">
          {items.map((m) => (
            <button key={m.menuItemId} className="chip-toggle on-light" aria-pressed={!m.available} disabled={busy === m.menuItemId || m.outOfStock}
              title={m.outOfStock ? 'Hết trong kho: nhập thêm hàng ở Kho' : m.available ? 'Bấm để báo hết' : 'Bấm để bán lại'} onClick={() => toggle(m)}>
              <DishThumb src={m.imageUrl} name={m.name} size="sm" />
              <Strikable on={!m.available}>{m.name}</Strikable>
              {m.outOfStock && <span className="state state-bad">hết kho</span>}
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
