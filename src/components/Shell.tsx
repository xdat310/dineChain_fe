import { CalendarClock, ChefHat, LayoutDashboard, LogOut, Package, QrCode, ReceiptText, Users } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { STAFF, can, useAuth } from '../auth'
import { ROLE_LABEL } from '../lib/format'

export function Shell() {
  const { session, role, branchId, branches, setBranchId, logout } = useAuth()
  const staff = session!.staff
  const branch = branches.find((b) => b.id === branchId)

  const links = [
    can.owner(role) && { to: `${STAFF}/chuoi`, label: 'Toàn chuỗi', Icon: LayoutDashboard },
    can.pos(role) && { to: `${STAFF}/ban-hang`, label: 'Bán hàng', Icon: ReceiptText },
    can.kitchen(role) && { to: `${STAFF}/bep`, label: 'Bếp', Icon: ChefHat },
    can.manage(role) && { to: `${STAFF}/quan-ly`, label: 'Quản lý', Icon: Users },
    can.manage(role) && { to: `${STAFF}/ma-qr`, label: 'Mã QR bàn', Icon: QrCode },
    can.stock(role) && { to: `${STAFF}/kho`, label: 'Kho & nhập hàng', Icon: Package },
    can.shifts(role) && { to: `${STAFF}/ca-cua-toi`, label: 'Ca của tôi', Icon: CalendarClock },
  ].filter(Boolean) as { to: string; label: string; Icon: typeof Users }[]

  return (
    <div className="shell">
      <aside className="rail">
        <div className="wordmark">Dine<span>Chain</span></div>
        {/* tablet rail: the branch stays visible as its code */}
        <div className="rail-branch-code chalk" aria-hidden="true">{branch?.code ?? ''}</div>
        <div className="rail-branch">
          {staff.branchId ? (
            <>
              Chi nhánh
              <strong>{branch?.name ?? staff.branchName ?? `#${staff.branchId}`}</strong>
            </>
          ) : (
            <label>
              Đang xem chi nhánh
              <select value={branchId ?? ''} onChange={(e) => setBranchId(Number(e.target.value))}>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.code} · {b.name}</option>
                ))}
              </select>
            </label>
          )}
        </div>
        <nav aria-label="Chức năng">
          {links.map(({ to, label, Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `rail-link${isActive ? ' active' : ''}`} title={label}>
              <Icon size={20} aria-hidden="true" />
              <span className="label">{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="rail-foot">
          <div className="who-short" aria-hidden="true">{staff.fullName}</div>
          <div className="who">
            <strong>{staff.fullName}</strong>
            {ROLE_LABEL[staff.role ?? ''] ?? staff.role}
          </div>
          <button onClick={logout} aria-label="Đăng xuất">
            <LogOut size={16} aria-hidden="true" /> <span className="label">Đăng xuất</span>
          </button>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}
