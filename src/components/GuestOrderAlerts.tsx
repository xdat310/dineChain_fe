import { ScanQrCode, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { OrderResponse } from '../api/types'
import { chime } from '../lib/chime'

interface GuestAlert { orderId: number; tableId: number; dishes: number }

// Guests ordering from the table QR: nobody on the floor typed those dishes, so the POS rings and says which table
export function useGuestOrderAlerts(orders: OrderResponse[] | undefined, enabled: boolean) {
  const seen = useRef<Set<number> | null>(null)
  const [pending, setPending] = useState<GuestAlert[]>([])

  useEffect(() => {
    if (!orders || !enabled) return
    const guestItems = orders.filter((o) => o.tableId).flatMap((o) =>
      (o.items ?? []).filter((i) => i.orderedByGuest && i.status !== 'CANCELLED').map((i) => ({ o, i })))
    if (seen.current === null) {
      // What was already there when the screen opened is not news
      seen.current = new Set(guestItems.map(({ i }) => i.id!))
      return
    }
    const added = guestItems.filter(({ i }) => !seen.current!.has(i.id!))
    if (!added.length) return
    added.forEach(({ i }) => seen.current!.add(i.id!))
    setPending((list) => {
      const next = [...list]
      for (const { o, i } of added) {
        const at = next.findIndex((a) => a.orderId === o.id)
        if (at >= 0) next[at] = { ...next[at], dishes: next[at].dishes + (i.quantity ?? 1) }
        else next.push({ orderId: o.id!, tableId: o.tableId!, dishes: i.quantity ?? 1 })
      }
      return next
    })
    chime(2)
  }, [orders, enabled])

  // A bill that was paid or cancelled needs no more attention
  const alerts = useMemo(() => {
    const open = new Set((orders ?? []).map((o) => o.id))
    return pending.filter((a) => open.has(a.orderId))
  }, [orders, pending])

  return { alerts, dismiss: (orderId: number) => setPending((list) => list.filter((a) => a.orderId !== orderId)) }
}

export function GuestOrderAlerts({ alerts, tableName, onOpen, onDismiss }: {
  alerts: GuestAlert[]; tableName: (tableId: number) => string
  onOpen: (tableId: number, orderId: number) => void; onDismiss: (orderId: number) => void
}) {
  if (alerts.length === 0) return null
  return (
    <section className="takeaway-alerts" aria-live="polite" aria-label="Khách gọi món qua mã QR">
      {alerts.map((a) => (
        <div key={a.orderId} className="t-alert t-alert-new">
          <ScanQrCode size={18} aria-hidden="true" />
          <div className="t-alert-text">
            <strong>{tableName(a.tableId)}: khách vừa gọi {a.dishes} món</strong>
            <span>Khách tự gọi bằng mã QR trên bàn, món đã xuống bếp.</span>
          </div>
          <button className="btn btn-sm btn-primary" onClick={() => { onOpen(a.tableId, a.orderId); onDismiss(a.orderId) }}>Xem bàn</button>
          <button className="icon-btn" aria-label="Đã biết" title="Đã biết" onClick={() => onDismiss(a.orderId)}><X size={15} /></button>
        </div>
      ))}
    </section>
  )
}
