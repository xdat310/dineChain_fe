import { Eye, EyeOff, LogIn } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { ApiError } from '../api/client'
import { useAuth } from '../auth'
import photo from '../assets/photos/mam-com.webp'
import { ErrorNotice } from '../components/Feedback'

// Starting accounts the backend creates on an empty database (one per role, shared password 12345)
const DEMO = [
  { username: 'admin', password: '12345', label: 'Chủ chuỗi' },
  { username: 'quanly', password: '12345', label: 'Quản lý' },
  { username: 'thungan', password: '12345', label: 'Thu ngân' },
  { username: 'phucvu', password: '12345', label: 'Phục vụ' },
  { username: 'daubep', password: '12345', label: 'Đầu bếp' },
  { username: 'kho', password: '12345', label: 'Kho' },
]

// TEMPORARY for testing (2026-10-10): quick sign-in also through ngrok and the Wi-Fi IP, so anyone holding the link gets in.
// Remove before sharing the link widely: put back `&& ['localhost', '127.0.0.1'].includes(window.location.hostname)`
const QUICK_LOGIN = import.meta.env.DEV

const WEEKDAY = new Intl.DateTimeFormat('vi-VN', { weekday: 'long' })
const DAY = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
const CLOCK = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })

// The quán writes the date on its board every morning; the login slate does the same
function useNow() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15000)
    return () => clearInterval(id)
  }, [])
  return now
}

export function Login() {
  const { login } = useAuth()
  const now = useNow()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  // Which sign-in is running: 'form' or the username of a quick-login tile
  const [busy, setBusy] = useState<string | null>(null)
  const [showPw, setShowPw] = useState(false)

  async function signIn(user: string, pass: string, who: string) {
    setBusy(who)
    setError(null)
    try {
      await login(user.trim(), pass)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không đăng nhập được')
      setBusy(null)
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    signIn(username, password, 'form')
  }

  const weekday = WEEKDAY.format(now)
  return (
    <div className="login">
      <section className="board-surface login-board" aria-label="DineChain">
        <img className="login-photo" src={photo} alt="" />
        <h1>Dine<span>Chain</span></h1>
        <div className="login-today">
          <span className="login-day">{weekday.charAt(0).toUpperCase() + weekday.slice(1)}, {DAY.format(now)}</span>
          <span className="login-clock num">{CLOCK.format(now)}</span>
        </div>
      </section>

      <section className="login-form">
        <div className="login-card">
          <form onSubmit={submit} className="login-fields">
            <div>
              <h2>Đăng nhập</h2>
              <p>Dùng tài khoản nhân viên do quản lý cấp.</p>
            </div>
            {error && <ErrorNotice message={error} />}
            <label className="field">
              Tên đăng nhập
              <input className="input" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus />
            </label>
            <label className="field">
              Mật khẩu
              <div style={{ position: 'relative' }}>
                <input className="input" type={showPw ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ paddingRight: '2.5rem' }} />
                <button type="button" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  style={{ position: 'absolute', right: '0.625rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-text-2, #888)', display: 'flex', alignItems: 'center', padding: 0 }}>
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>
            <button className="btn btn-primary btn-lg btn-block" disabled={busy !== null}>
              {busy === 'form' ? <span className="spinner" aria-hidden="true" /> : <LogIn size={18} aria-hidden="true" />}
              Vào ca
            </button>
          </form>

          {/* Bootstrap accounts are a development convenience: never shown on a production build or to other devices */}
          {QUICK_LOGIN && <div className="quick-login">
            <h3>Vào nhanh <span>tài khoản ban đầu, mật khẩu 12345</span></h3>
            <div className="quick-grid">
              {DEMO.map((d) => (
                <button key={d.username} type="button" className="quick-role" disabled={busy !== null}
                  onClick={() => signIn(d.username, d.password, d.username)}>
                  <span className="quick-label">{d.label}</span>
                  <span className="quick-user">{busy === d.username ? <span className="spinner" aria-hidden="true" /> : d.username}</span>
                </button>
              ))}
            </div>
          </div>}
        </div>
      </section>
    </div>
  )
}
