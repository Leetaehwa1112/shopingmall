import { Link } from 'react-router-dom'
import Pokeball from '@/components/common/Pokeball'

export default function Footer() {
  return (
    <footer className="mt-20 bg-ink text-paper/80 border-t-4 border-dex">
      <div className="max-w-7xl mx-auto px-6 py-14 grid md:grid-cols-12 gap-10">
        <div className="md:col-span-5">
          <div className="flex items-center gap-3 mb-4">
            <Pokeball size={28} />
            <div className="font-display font-bold text-2xl text-paper">
              Poké<span className="text-dex">vault</span>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-paper/60 max-w-xs">
            한국 최대 희귀 포켓몬 카드 옥션 & 컬렉터블 마켓.
            모든 카드 PSA·BGS·CGC 공식 인증.
          </p>
          <div className="flex gap-2 mt-5">
            {['blue', 'red', 'yellow', 'green'].map((c) => (
              <span key={c} className={`led led-${c}`} />
            ))}
          </div>
        </div>
        <div className="md:col-span-7 grid grid-cols-3 gap-8">
          <Col title="SHOP" links={[['경매', '/auctions'], ['카탈로그', '/products'], ['시세', '/market']]} />
          <Col title="SUPPORT" links={[['고객센터', '#'], ['배송', '#'], ['반품', '#'], ['FAQ', '#']]} />
          <Col title="COMPANY" links={[['회사 소개', '#'], ['이용약관', '#'], ['개인정보처리방침', '#']]} />
        </div>
      </div>
      <div className="border-t border-paper/10">
        <div className="max-w-7xl mx-auto px-6 py-5 flex flex-wrap justify-between items-center text-[11px] text-paper/40 gap-2 font-mono">
          <span>© 2026 POKÉVAULT Inc.</span>
          <span>사업자등록번호 123-45-67890 · 통신판매업 2026-서울강남-0420</span>
        </div>
      </div>
    </footer>
  )
}

function Col({ title, links }) {
  return (
    <div>
      <h4 className="pixel-label text-gold mb-4">{title}</h4>
      <ul className="space-y-2.5">
        {links.map(([label, to]) => (
          <li key={label}>
            <Link to={to} className="text-sm text-paper/65 hover:text-paper">{label}</Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
