import { Camera, X } from 'lucide-react'
import QrScanner from 'qr-scanner'
import { useEffect, useRef, useState } from 'react'
import { tokenFromQr } from '../lib/seat'

// In-page camera scanner for the table QR. Browsers only open the camera on https (ngrok) or localhost;
// on a plain Wi-Fi address the guest uses the phone's own camera app, which opens the same link.
export function QrScan({ onToken, onClose }: { onToken: (token: string) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const [problem, setProblem] = useState<string | null>(
    window.isSecureContext ? null : 'Trình duyệt chỉ mở máy ảnh trên trang https.',
  )
  const [wrongCode, setWrongCode] = useState(false)

  useEffect(() => {
    if (!window.isSecureContext || !video.current) return
    const scanner = new QrScanner(video.current, (result) => {
      const token = tokenFromQr(result.data)
      if (token) {
        scanner.stop()
        onToken(token)
      } else {
        setWrongCode(true)
      }
    }, { preferredCamera: 'environment', highlightScanRegion: true, highlightCodeOutline: true, returnDetailedScanResult: true })
    scanner.start().catch(() => setProblem('Không mở được máy ảnh. Hãy cho phép trang dùng máy ảnh rồi thử lại.'))
    return () => scanner.destroy()
  }, [onToken])

  return (
    <div className="guest-sheet-backdrop" onClick={onClose}>
      <div className="guest-sheet scan-sheet" role="dialog" aria-modal="true" aria-label="Quét mã QR tại bàn" onClick={(e) => e.stopPropagation()}>
        <div className="panel-head">
          <h2>Quét mã QR trên bàn</h2>
          <button className="icon-btn" aria-label="Đóng" onClick={onClose}><X size={18} /></button>
        </div>
        {problem ? (
          <div className="scan-fallback">
            <Camera size={40} aria-hidden="true" />
            <p><strong>{problem}</strong></p>
            <p>Mở ứng dụng <strong>Máy ảnh</strong> của điện thoại, hướng vào mã QR dán trên bàn rồi bấm vào đường link hiện ra. Trang gọi món của bàn sẽ mở ngay.</p>
          </div>
        ) : (
          <div className="scan-view">
            <video ref={video} muted playsInline />
            <p className={wrongCode ? 'scan-hint bad' : 'scan-hint'}>
              {wrongCode ? 'Đây không phải mã bàn của quán. Hãy quét mã dán trên bàn.' : 'Đưa mã QR trên bàn vào giữa khung hình.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
