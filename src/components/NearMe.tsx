import { LocateFixed } from 'lucide-react'

// "Find the branch near me": one button, then its outcome in a line
export function NearMe({ status, message, onAsk, tone = 'light' }: {
  status: 'idle' | 'asking' | 'ok' | 'error'; message?: string; onAsk: () => void; tone?: 'light' | 'dark'
}) {
  return (
    <div className={`near-me near-me-${tone}`}>
      <button type="button" className="btn btn-sm near-me-btn" onClick={onAsk} disabled={status === 'asking'}>
        {status === 'asking' ? <span className="spinner" aria-hidden="true" /> : <LocateFixed size={15} aria-hidden="true" />}
        {status === 'ok' ? 'Cập nhật vị trí' : 'Tìm chi nhánh gần tôi'}
      </button>
      {status === 'ok' && <span className="near-me-note">Đã xếp chi nhánh theo khoảng cách từ chỗ bạn.</span>}
      {status === 'error' && <span className="near-me-note" role="status">{message}</span>}
    </div>
  )
}
