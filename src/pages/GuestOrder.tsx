import { ArrowLeft, Minus, Plus, Send, ShoppingBag, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError, get, post } from '../api/client'
import type { BranchMenuItemResponse, GuestOrderResponse, GuestTableResponse } from '../api/types'
import { CategoryNav, DishBoard, groupDishes } from '../components/DishBoard'
import { DishThumb } from '../components/DishThumb'
import { Empty, ErrorNotice, Loading } from '../components/Feedback'
import { useToast } from '../components/Toast'
import { ITEM_STATUS_LABEL, money } from '../lib/format'
import { rememberSeat } from '../lib/seat'
import { useData } from '../lib/useData'

interface Line { dish: BranchMenuItemResponse; quantity: number; note: string }

const STATE_CLASS: Record<string, string> = {
  PENDING: 'state-neutral', COOKING: 'state-info', READY: 'state-warn', SERVED: 'state-ok', CANCELLED: 'state-bad',
}

// Opened by scanning the QR code on a table: the guest sees where they sit, the branch menu, and orders to the kitchen
export function GuestOrder() {
  const { token = '' } = useParams()
  const toast = useToast()
  const table = useData(() => get<GuestTableResponse>(`/public/tables/${token}`), [token])
  // The bill keeps refreshing so guests watch their dishes move through the kitchen
  const bill = useData(() => get<GuestOrderResponse | undefined>(`/public/tables/${token}/order`), [token], 10000)
  const [cart, setCart] = useState<Record<number, Line>>({})
  const [cartOpen, setCartOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Remember the scanned table so the home page can bring the guest back to it
  useEffect(() => {
    const t = table.data
    if (t) rememberSeat({ token, tableName: t.tableName ?? '', areaName: t.areaName ?? '', branchName: t.branchName ?? '' })
  }, [table.data, token])

  const lines = Object.values(cart)
  const count = lines.reduce((n, l) => n + l.quantity, 0)
  const cartTotal = lines.reduce((n, l) => n + l.quantity * (l.dish.price ?? 0), 0)

  const groups = useMemo(() => groupDishes(table.data?.categories, table.data?.menu), [table.data])

  function change(dish: BranchMenuItemResponse, delta: number) {
    setCart((c) => {
      const id = dish.menuItemId!
      const quantity = (c[id]?.quantity ?? 0) + delta
      const next = { ...c }
      if (quantity <= 0) delete next[id]
      else next[id] = { dish, quantity, note: c[id]?.note ?? '' }
      return next
    })
  }

  async function send() {
    setSending(true)
    setError(null)
    try {
      await post(`/public/tables/${token}/orders`, {
        items: lines.map((l) => ({ menuItemId: l.dish.menuItemId, quantity: l.quantity, notes: l.note.trim() || undefined })),
      })
      setCart({})
      setCartOpen(false)
      toast('Đã gửi món xuống bếp')
      await Promise.all([bill.reload(), table.reload()])
      document.getElementById('da-goi')?.scrollIntoView({ behavior: 'smooth' })
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Không gửi được, thử lại')
      // A dish may have just sold out: show the fresh menu
      table.reload()
    } finally {
      setSending(false)
    }
  }

  if (table.loading) return <div className="guest"><Loading label="Đang mở menu…" /></div>
  if (table.error || !table.data) {
    return (
      <div className="guest">
        <div className="guest-board"><Link to="/" className="guest-back"><ArrowLeft size={16} aria-hidden="true" /> Trang chủ</Link></div>
        <div className="guest-body">
          <Empty title="Mã QR không hợp lệ">Vui lòng gọi nhân viên phục vụ để được hỗ trợ.</Empty>
          <Link to="/" className="btn btn-block">Về trang chủ</Link>
        </div>
      </div>
    )
  }

  const t = table.data
  const ordered = bill.data?.items ?? []

  return (
    <div className={`guest${count ? ' has-cart' : ''}`}>
      <header className="guest-board">
        <Link to="/" className="guest-back"><ArrowLeft size={16} aria-hidden="true" /> Trang chủ</Link>
        <div className="guest-table">Bàn {t.tableName}</div>
        <div className="guest-where">{t.branchName} · {t.areaName} · {t.capacity} ghế{t.branchAddress && t.branchAddress !== 'Chưa cập nhật' ? ` · ${t.branchAddress}` : ''}</div>
      </header>

      <CategoryNav groups={groups} />

      <main className="guest-body">
        {error && <ErrorNotice message={error} />}

        {groups.length === 0 ? <Empty title="Menu đang được cập nhật">Vui lòng gọi nhân viên để gọi món.</Empty> : (
          <DishBoard groups={groups} quantity={(id) => cart[id]?.quantity ?? 0} onChange={change} />
        )}

        {ordered.length > 0 && (
          <section id="da-goi" className="panel">
            <div className="panel-head"><h2>Món bàn đã gọi</h2><span className="muted num">{bill.data?.code}</span></div>
            <div style={{ padding: '4px 18px' }}>
              {ordered.map((i, n) => (
                <div key={n} className={`line${i.status === 'CANCELLED' ? ' cancelled' : ''}`}>
                  <span className="lname with-thumb"><DishThumb src={i.imageUrl} name={i.itemName} size="sm" />{i.quantity} × {i.itemName}</span>
                  <span className="lamt">{money(i.amount)}</span>
                  <span className="lsub">
                    <span className={`state ${STATE_CLASS[i.status ?? ''] ?? 'state-neutral'}`}>{ITEM_STATUS_LABEL[i.status ?? '']}</span>
                    {i.notes && <span>{i.notes}</span>}
                  </span>
                </div>
              ))}
            </div>
            <div className="money-proof">
              <div className="mrow"><span>Tạm tính</span><span>{money(bill.data?.subtotal)}</span></div>
              {!!bill.data?.discountAmount && <div className="mrow minus"><span>Giảm giá</span><span>−{money(bill.data.discountAmount)}</span></div>}
              {!!bill.data?.vatAmount && <div className="mrow"><span>VAT</span><span>{money(bill.data.vatAmount)}</span></div>}
              <div className="total"><span>Tổng cộng</span><strong className="num">{money(bill.data?.totalAmount)}</strong></div>
              <span className="muted" style={{ fontSize: 13, marginTop: 6 }}>Thanh toán bằng tiền mặt tại quầy khi dùng xong.</span>
            </div>
          </section>
        )}
      </main>

      {count > 0 && !cartOpen && (
        <div className="guest-bar">
          <button className="btn btn-accent btn-lg btn-block" onClick={() => setCartOpen(true)}>
            <ShoppingBag size={20} aria-hidden="true" />
            <span>{count} món · {money(cartTotal)}</span>
            <span style={{ marginLeft: 'auto' }}>Xem &amp; gửi bếp</span>
          </button>
        </div>
      )}

      {cartOpen && (
        <div className="guest-sheet-backdrop" onClick={() => !sending && setCartOpen(false)}>
          <div className="guest-sheet" role="dialog" aria-modal="true" aria-label="Món sắp gọi" onClick={(e) => e.stopPropagation()}>
            <div className="panel-head">
              <h2>Món sắp gọi · Bàn {t.tableName}</h2>
              <button className="icon-btn" aria-label="Đóng" onClick={() => setCartOpen(false)}><X size={18} /></button>
            </div>
            <div className="guest-sheet-lines">
              {lines.map((l) => (
                <div key={l.dish.menuItemId} className="line">
                  <span className="lname with-thumb"><DishThumb src={l.dish.imageUrl} name={l.dish.name} size="sm" />{l.dish.name}</span>
                  <span className="lamt">{money(l.quantity * (l.dish.price ?? 0))}</span>
                  <span className="lsub">
                    <span className="qty-btns">
                      <button className="icon-btn" aria-label={`Bớt ${l.dish.name}`} onClick={() => change(l.dish, -1)}><Minus size={16} /></button>
                      <span className="num" style={{ minWidth: 22, textAlign: 'center', fontWeight: 700, color: 'var(--ink)' }}>{l.quantity}</span>
                      <button className="icon-btn" aria-label={`Thêm ${l.dish.name}`} onClick={() => change(l.dish, 1)}><Plus size={16} /></button>
                    </span>
                    <input className="input" style={{ flex: 1, minWidth: 140, minHeight: 36 }} placeholder="Ghi chú: ít cay, không hành…" maxLength={200}
                      value={l.note} onChange={(e) => setCart((c) => ({ ...c, [l.dish.menuItemId!]: { ...l, note: e.target.value } }))} />
                  </span>
                </div>
              ))}
            </div>
            <div className="order-actions">
              {error && <ErrorNotice message={error} />}
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="muted">Tạm tính (chưa gồm VAT)</span>
                <strong className="num" style={{ fontSize: 18 }}>{money(cartTotal)}</strong>
              </div>
              <button className="btn btn-primary btn-lg btn-block" disabled={sending || count === 0} onClick={send}>
                {sending ? <span className="spinner" aria-hidden="true" /> : <Send size={18} aria-hidden="true" />} Gửi xuống bếp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
