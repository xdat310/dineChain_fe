import { LogIn, LogOut } from 'lucide-react'
import { useState } from 'react'
import { ApiError, get, put } from '../api/client'
import type { StaffShiftResponse } from '../api/types'
import { Empty, ErrorNotice, Loading } from '../components/Feedback'
import { Chip } from '../components/State'
import { useToast } from '../components/Toast'
import { dateTime, isoDate } from '../lib/format'
import { useData } from '../lib/useData'

export function MyShifts() {
  const toast = useToast()
  const [today] = useState(() => new Date())
  const from = isoDate(new Date(today.getTime() - 86400000))
  const to = isoDate(new Date(today.getTime() + 13 * 86400000))
  const shifts = useData(() => get<StaffShiftResponse[]>(`/shifts/me?from=${from}&to=${to}`), [])

  async function clock(a: StaffShiftResponse, step: 'check-in' | 'check-out') {
    try {
      await put(`/shift-assignments/${a.id}/${step}`)
      toast(step === 'check-in' ? 'Đã chấm công vào ca' : 'Đã chấm công ra ca')
      shifts.reload()
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Không chấm công được', true)
    }
  }

  return (
    <div className="page" style={{ maxWidth: 820 }}>
      <div className="page-head">
        <div>
          <h1>Ca của tôi</h1>
          <p>Chấm công từ 30 phút trước giờ vào ca đến hết ca.</p>
        </div>
      </div>
      {shifts.error && <ErrorNotice message={shifts.error} onRetry={shifts.reload} />}
      <div className="panel">
        {shifts.loading ? <Loading /> : (shifts.data?.length ?? 0) === 0 ? <Empty title="Chưa được xếp ca trong 2 tuần tới">Quản lý chi nhánh xếp ca cho bạn.</Empty> : (
          <table className="data">
            <thead><tr><th>Ngày</th><th>Ca</th><th>Vào</th><th>Ra</th><th /></tr></thead>
            <tbody>
              {shifts.data!.map((a) => (
                <tr key={a.id}>
                  <td className="num" style={{ fontWeight: 600 }}>{a.workDate === isoDate(today) ? 'Hôm nay' : a.workDate}</td>
                  <td>{a.shiftName} <span className="chalk num" style={{ fontSize: 20, color: 'var(--navy)', marginLeft: 6 }}>{a.startTime?.slice(0, 5)}–{a.endTime?.slice(0, 5)}</span></td>
                  <td className="num">{a.checkInAt ? dateTime(a.checkInAt) : '—'}</td>
                  <td className="num">{a.checkOutAt ? dateTime(a.checkOutAt) : '—'}</td>
                  <td className="right">
                    {!a.checkInAt && <button className="btn btn-sm btn-primary" onClick={() => clock(a, 'check-in')}><LogIn size={14} aria-hidden="true" /> Vào ca</button>}
                    {a.checkInAt && !a.checkOutAt && <button className="btn btn-sm btn-accent" onClick={() => clock(a, 'check-out')}><LogOut size={14} aria-hidden="true" /> Ra ca</button>}
                    {a.checkOutAt && <Chip tone="ok">{a.workedMinutes} phút</Chip>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
