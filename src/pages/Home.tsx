import { BookOpen, ChevronRight, MapPin, ReceiptText, ScanQrCode, ShoppingBag, UtensilsCrossed, X } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { get } from '../api/client'
import type { PublicBranchResponse, PublicMenuResponse } from '../api/types'
import bunCha from '../assets/photos/bun-cha.webp'
import heroPho from '../assets/photos/hero-pho.webp'
import { Empty, ErrorNotice, Loading } from '../components/Feedback'
import { QrScan } from '../components/QrScan'
import { money, number } from '../lib/format'
import { forgetSeat, lastSeat, lastTakeaway } from '../lib/seat'
import { useData } from '../lib/useData'
import { NearMe } from '../components/NearMe'
import { byDistance, formatKm, useMyLocation } from '../lib/geo'

const TAKEAWAY_BRANCH_KEY = 'dinechain.takeawayBranch'

function scrollToMenu() {
  document.getElementById('thuc-don')?.scrollIntoView({ behavior: 'smooth' })
}

// Guests' home page: the food first, the two ways to eat (scan at the table, or takeaway), the branches and the menu
export function Home() {
  const navigate = useNavigate()
  const menu = useData(() => get<PublicMenuResponse>('/public/menu'), [])
  const branches = useData(() => get<PublicBranchResponse[]>('/public/branches'), [], 60000)
  const [seat, setSeat] = useState(lastSeat)
  const [scanning, setScanning] = useState(false)
  const [takeaway] = useState(lastTakeaway)
  const [category, setCategory] = useState<number | null>(null)
  // Asked once per visit: eating here goes through the table QR, takeaway goes straight to ordering
  const [asking, setAsking] = useState(() => {
    if (lastSeat()) return false
    try {
      return sessionStorage.getItem('dinechain.asked') !== '1'
    } catch {
      return true
    }
  })

  function answer(choice: 'here' | 'away' | null) {
    setAsking(false)
    try {
      sessionStorage.setItem('dinechain.asked', '1')
    } catch {
      // asked again next time
    }
    if (choice === 'here') setScanning(true)
    if (choice === 'away') navigate('/mang-ve')
  }
  const openTable = useCallback((token: string) => navigate(`/goi-mon/${token}`), [navigate])

  function orderFrom(branch: PublicBranchResponse) {
    try {
      sessionStorage.setItem(TAKEAWAY_BRANCH_KEY, String(branch.id))
    } catch {
      // the takeaway page asks for the branch again
    }
    navigate('/mang-ve')
  }

  const categories = useMemo(() => {
    const used = new Set((menu.data?.dishes ?? []).map((d) => d.categoryId))
    return (menu.data?.categories ?? []).filter((c) => used.has(c.id))
  }, [menu.data])
  const dishes = (menu.data?.dishes ?? []).filter((d) => category == null || d.categoryId === category)
  const open = branches.data?.filter((b) => b.acceptingTakeaway).length ?? 0
  const transfer = branches.data?.some((b) => b.transferAvailable) ?? false
  // Branches with a real address, grouped by city, for the facts line and the footer
  const located = (branches.data ?? []).filter((b) => b.address && b.address !== 'Chưa cập nhật' && b.city && b.city !== 'Chưa cập nhật')
  const branchCount = branches.data?.length ?? 0
  const cities = [...new Set(located.map((b) => b.city!))].map((city) => ({ city, branches: located.filter((b) => b.city === city) }))
  const here = useMyLocation()
  const origin = here.state.status === 'ok' ? { lat: here.state.lat, lng: here.state.lng } : null
  const nearby = byDistance(branches.data ?? [], origin)
  const nearestId = origin ? nearby.find((x) => x.km != null && x.item.acceptingTakeaway)?.item.id : undefined

  return (
    <div className="home">
      <section className="hero">
        <img className="hero-img" src={heroPho} alt="Bát phở bò" />
        <div className="hero-shade" />
        <header className="site-head">
          <Link to="/" className="site-mark">DineChain</Link>
          <nav className="site-nav" aria-label="Trang khách">
            <button onClick={() => setScanning(true)}><ScanQrCode size={20} aria-hidden="true" /> Quét mã bàn</button>
            <Link to="/mang-ve"><ShoppingBag size={20} aria-hidden="true" /> Mang về</Link>
            <button onClick={scrollToMenu}><BookOpen size={20} aria-hidden="true" /> Thực đơn</button>
          </nav>
        </header>

        <div className="hero-stack">
          <button className="on" onClick={() => setScanning(true)}>Ăn tại quán</button>
          <Link to="/mang-ve">Mang về</Link>
          <button onClick={scrollToMenu}>Thực đơn</button>
        </div>

        {branches.data && (
          <aside className="hero-count" aria-label="Chi nhánh nhận đơn mang về">
            <div className="count-row">
              <span className="count-label">Đang mở</span>
              <span className="count-digits" aria-label={`${open} chi nhánh`}>
                {String(open).padStart(2, '0').split('').map((d, i) => <span key={i} aria-hidden="true">{d}</span>)}
              </span>
            </div>
            <p>chi nhánh đang nhận đơn mang về. Bếp chi nhánh nào quá tải giờ cao điểm sẽ tạm ngưng, khách tại bàn vẫn được phục vụ.</p>
            <Link to="/mang-ve">Chọn chi nhánh</Link>
          </aside>
        )}
      </section>

      {(seat || takeaway) && (
        <div className="home-notes">
          {seat && (
            <div className="seat-card">
              <MapPin size={20} aria-hidden="true" />
              <div className="seat-text">
                <span>Bạn đang ngồi</span>
                <strong>Bàn {seat.tableName} · {seat.branchName}</strong>
                <span>{seat.areaName}</span>
              </div>
              <div className="seat-actions">
                <button className="btn btn-primary" onClick={() => openTable(seat.token)}>Gọi món <ChevronRight size={16} aria-hidden="true" /></button>
                <button className="btn btn-sm btn-ghost" onClick={() => { forgetSeat(); setSeat(null) }}>Không phải bàn này</button>
              </div>
            </div>
          )}
          {takeaway && (
            <Link to={`/don-mang-ve/${takeaway.token}`} className="seat-card takeaway-card">
              <ReceiptText size={20} aria-hidden="true" />
              <div className="seat-text">
                <span>Đơn mang về của bạn</span>
                <strong>{takeaway.code}</strong>
                <span>{takeaway.branchName}</span>
              </div>
              <ChevronRight size={18} aria-hidden="true" />
            </Link>
          )}
        </div>
      )}

      <section className="home-intro">
        <h2>Ngồi xuống, quét mã, món lên bàn</h2>
        <p>
          Ăn tại quán: quét mã QR dán trên bàn để gọi món, món chuyển thẳng xuống bếp. Mang về: chọn chi nhánh, đặt món,
          trả tiền trước rồi đến quầy nhận khi món xong.
        </p>
      </section>

      <section className="home-split">
        <div className="split-navy">
          <h2 className="split-title">Chi nhánh</h2>
          <NearMe tone="dark" status={here.state.status} message={here.state.status === 'error' ? here.state.message : undefined} onAsk={here.ask} />
          {branches.error && <ErrorNotice message={branches.error} onRetry={branches.reload} />}
          <ul className="home-branches">
            {nearby.map(({ item: b, km }) => (
              <li key={b.id}>
                <button disabled={!b.acceptingTakeaway} onClick={() => orderFrom(b)}>
                  <span className="hb-code">{b.code}</span>
                  <span>
                    <span className="hb-name">{b.name}{b.id === nearestId && <span className="nearest-tag">Gần bạn nhất</span>}</span>
                    {b.address && b.address !== 'Chưa cập nhật' && <span className="hb-addr">{b.address}{b.city && b.city !== 'Chưa cập nhật' ? `, ${b.city}` : ''}</span>}
                    {km != null && <span className="hb-addr">Cách bạn {formatKm(km)}</span>}
                  </span>
                  {b.acceptingTakeaway
                    ? <span className="btn-oval btn-oval-sm" aria-hidden="true">Đặt mang về</span>
                    : <span className="hb-state">Bếp đang kín</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="split-sand">
          <h2 className="split-title">Món của quán</h2>
          <div className="split-photo">
            <img src={bunCha} alt="Bún chả, rau sống và nước chấm" loading="lazy" />
          </div>
          <button className="btn-oval split-oval" onClick={scrollToMenu}><span>Xem<br />thực đơn</span></button>
        </div>
      </section>

      <section id="thuc-don" className="home-menu" aria-label="Thực đơn">
        <div className="home-menu-head">
          <h2>Thực đơn</h2>
          {categories.length > 1 && (
            <div className="menu-tabs" role="group" aria-label="Nhóm món">
              <button aria-pressed={category == null} onClick={() => setCategory(null)}>Tất cả</button>
              {categories.map((c) => (
                <button key={c.id} aria-pressed={category === c.id} onClick={() => setCategory(c.id!)}>{c.name}</button>
              ))}
            </div>
          )}
        </div>
        {menu.error && <ErrorNotice message={menu.error} onRetry={menu.reload} />}
        {menu.loading ? <Loading label="Đang tải thực đơn…" /> : dishes.length === 0 ? (
          !menu.error && <Empty title="Thực đơn đang được cập nhật" />
        ) : (
          <div className="dish-grid">
            {dishes.map((d) => (
              <article key={d.id} className="dish-card">
                <div className="dish-photo">
                  {d.imageUrl
                    ? <img src={d.imageUrl} alt={d.name} loading="lazy" />
                    : <span className="dish-type" aria-hidden="true">{d.name}</span>}
                </div>
                <h3>{d.name}</h3>
                {d.description && <p>{d.description}</p>}
                <span className="dish-price num">{money(d.price)}</span>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="home-howto" aria-labelledby="howto-title">
        <h2 id="howto-title">Đặt món thế nào</h2>
        <div className="howto-cols">
          <div className="howto-col">
            <h3><UtensilsCrossed size={22} aria-hidden="true" /> Ăn tại quán</h3>
            <ol className="howto-steps">
              <li><strong>Quét mã QR trên bàn</strong><span>Bằng máy ảnh điện thoại, không cần cài ứng dụng.</span></li>
              <li><strong>Chọn món, gửi xuống bếp</strong><span>Gọi thêm lúc nào cũng được, mọi món vào chung hoá đơn của bàn.</span></li>
              <li><strong>Thanh toán tại quầy</strong><span>Tiền mặt khi dùng xong.</span></li>
            </ol>
            <button className="btn-oval" onClick={() => setScanning(true)}><span>Quét mã</span></button>
          </div>
          <div className="howto-col">
            <h3><ShoppingBag size={22} aria-hidden="true" /> Mang về</h3>
            <ol className="howto-steps">
              <li><strong>Chọn chi nhánh gần bạn</strong><span>Chi nhánh có bếp đang kín giờ cao điểm sẽ tạm ngưng nhận đơn.</span></li>
              <li><strong>Đặt món và trả trước</strong><span>{transfer ? 'Chuyển khoản theo mã QR của quán, hoặc tiền mặt tại quầy.' : 'Tiền mặt tại quầy.'}</span></li>
              <li><strong>Nhận món tại quầy</strong><span>Theo dõi tiến độ trên điện thoại, đọc mã đơn khi đến nhận.</span></li>
            </ol>
            <Link className="btn-oval" to="/mang-ve"><span>Đặt<br />mang về</span></Link>
          </div>
        </div>
        <dl className="howto-facts">
          {menu.data?.vatPercent != null && (
            <div><dt>Hoá đơn</dt><dd>Giá trên thực đơn chưa gồm VAT {number(menu.data.vatPercent, 2)}%. Hoá đơn ghi rõ tạm tính, VAT và tổng tiền.</dd></div>
          )}
          <div><dt>Thanh toán</dt><dd>Tiền mặt tại quầy{transfer ? '; chuyển khoản cho đơn mang về đặt trên web' : ''}.</dd></div>
          {cities.length > 0 && (
            <div><dt>Chi nhánh</dt><dd>{branchCount} chi nhánh tại {cities.map((c) => c.city).join(' và ')}.</dd></div>
          )}
        </dl>
      </section>

      <footer className="site-foot">
        <div className="foot-brand">
          <Link to="/" className="site-mark">DineChain</Link>
          {cities.length > 0 && <p>{branchCount} chi nhánh · {cities.map((c) => c.city).join(' · ')}</p>}
        </div>
        {cities.map((c) => (
          <div key={c.city} className="foot-col">
            <h4>{c.city}</h4>
            <ul>
              {c.branches.map((b) => (
                <li key={b.id}><strong>{b.name}</strong><span>{b.address}</span></li>
              ))}
            </ul>
          </div>
        ))}
        <div className="foot-col">
          <h4>Đặt món</h4>
          <nav aria-label="Đặt món">
            <button onClick={() => setScanning(true)}>Ăn tại quán: quét mã bàn</button>
            <Link to="/mang-ve">Đặt mang về</Link>
            <button onClick={scrollToMenu}>Thực đơn</button>
          </nav>
        </div>
        <small className="foot-copy">© {new Date().getFullYear()} DineChain</small>
      </footer>

      <nav className="mobile-bar" aria-label="Gọi món">
        <button onClick={() => setScanning(true)}><ScanQrCode size={18} aria-hidden="true" /> {seat ? 'Bàn khác' : 'Quét bàn'}</button>
        <Link to="/mang-ve"><ShoppingBag size={18} aria-hidden="true" /> Mang về</Link>
        <button onClick={scrollToMenu}><BookOpen size={18} aria-hidden="true" /> Thực đơn</button>
      </nav>

      {asking && (
        <div className="guest-sheet-backdrop" onClick={() => answer(null)}>
          <div className="guest-sheet choice-sheet" role="dialog" aria-modal="true" aria-labelledby="choice-title" onClick={(e) => e.stopPropagation()}>
            <div className="panel-head">
              <h2 id="choice-title">Bạn dùng bữa thế nào?</h2>
              <button className="icon-btn" aria-label="Xem thực đơn trước" onClick={() => answer(null)}><X size={18} /></button>
            </div>
            <div className="choice-options">
              <button className="choice" onClick={() => answer('here')}>
                <UtensilsCrossed size={24} aria-hidden="true" />
                <strong>Ăn tại quán</strong>
                <span>Quét mã QR dán trên bàn để gọi món</span>
              </button>
              <button className="choice" onClick={() => answer('away')}>
                <ShoppingBag size={24} aria-hidden="true" />
                <strong>Mang về</strong>
                <span>Chọn chi nhánh, đặt món, trả tiền trước</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {scanning && <QrScan onToken={openTable} onClose={() => setScanning(false)} />}
    </div>
  )
}
