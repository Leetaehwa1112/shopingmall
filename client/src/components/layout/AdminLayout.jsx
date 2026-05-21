import { NavLink, Outlet, Link } from 'react-router-dom'
import useAuthStore from '@/store/authStore'
import ToastContainer from '@/components/common/Toast'
import Button from '@/components/common/Button'
import Pokeball from '@/components/common/Pokeball'
import Icon from '@/components/common/Icon'

export default function AdminLayout() {
  const { isAdmin, user } = useAuthStore()

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-bone">
        <div className="surface-soft p-10 max-w-md elev-2 text-center">
          <Icon name="lock" size={40} strokeWidth={1.4} className="text-dex mx-auto mb-5" />
          <h1 className="font-display text-2xl font-bold text-ink mb-3">관리자 권한 필요</h1>
          <p className="text-sm text-mute mb-6">
            관리자 계정으로 로그인해주세요.
          </p>
          <Link to="/admin/login"><Button variant="primary">관리자 로그인</Button></Link>
        </div>
      </div>
    )
  }

  const link = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all ${
      isActive ? 'bg-ink text-paper elev-1' : 'text-ink/70 hover:bg-bone-2 hover:text-ink'
    }`

  return (
    <div className="min-h-screen flex bg-bone">
      <ToastContainer />
      <aside className="w-64 bg-paper border-r border-line flex-shrink-0 flex flex-col">
        <Link to="/" className="block p-6 border-b border-line">
          <div className="flex items-center gap-3">
            <Pokeball size={28} />
            <div className="font-display font-bold text-xl text-ink">
              Poké<span className="text-dex">vault</span>
            </div>
          </div>
          <div className="pixel-label text-mute mt-2">Admin Panel</div>
        </Link>

        <nav className="p-3 space-y-1 flex-1">
          <NavLink to="/admin" end className={link}>
            <Icon name="trophy" size={16} strokeWidth={1.6} /> 대시보드
          </NavLink>

          <div className="px-4 pt-5 pb-1 text-[10px] font-bold tracking-[0.18em] text-mute uppercase">카탈로그</div>
          <NavLink to="/admin/products" className={link}>
            <Icon name="package" size={16} strokeWidth={1.6} /> 카드 관리
          </NavLink>
          <NavLink to="/admin/packs" className={link}>
            <Icon name="star" size={16} strokeWidth={1.6} /> 카드팩 관리
          </NavLink>

          <div className="px-4 pt-5 pb-1 text-[10px] font-bold tracking-[0.18em] text-mute uppercase">거래</div>
          <NavLink to="/admin/auctions" className={link}>
            <Icon name="flame" size={16} strokeWidth={1.6} /> 경매 관리
          </NavLink>
          <NavLink to="/admin/orders" className={link}>
            <Icon name="cart" size={16} strokeWidth={1.6} /> 주문 관리
          </NavLink>

          <div className="px-4 pt-5 pb-1 text-[10px] font-bold tracking-[0.18em] text-mute uppercase">회원</div>
          <NavLink to="/admin/users" className={link}>
            <Icon name="shield" size={16} strokeWidth={1.6} /> 고객 관리
          </NavLink>
        </nav>

        <div className="p-4 border-t border-line text-xs">
          <div className="text-mute mb-1 font-bold">로그인 중</div>
          <div className="text-ink font-bold">{user?.name}</div>
          <Link to="/" className="block text-mute hover:text-ink mt-3 font-bold text-[11px]">← 사이트로 돌아가기</Link>
        </div>
      </aside>

      <main className="flex-1 p-10 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  )
}
