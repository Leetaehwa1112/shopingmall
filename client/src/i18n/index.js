// 인앱 i18n — 외부 라이브러리 없이 dictionary + useT() 훅.
// 사용: const t = useT(); t('hero.headline.line1')
// 보간: t('cart.total', { n: 3 }) → "3 items"
import useLocaleStore from '@/store/localeStore'

const DICT = {
  ko: {
    // ── Header (top fun ribbon)
    'header.ribbon.live': '두근두근 LIVE 경매',
    'header.ribbon.cert': 'PSA·BGS·CGC 인증',
    'header.ribbon.delivery': '안심 배송 + 보험',
    'header.logo.sub': '트레이너 옥션',
    // ── Header nav
    'nav.auctions': 'Live 경매',
    'nav.products': '희귀카드',
    'nav.packs': '카드팩',
    'nav.dex': '도감',
    'nav.admin': '관리자',
    'nav.sell': '+ 내 카드 출품',
    'nav.cart': '두근두근 장바구니',
    'nav.login': '로그인',
    'nav.signup': '트레이너 되기',
    'nav.trainer': '트레이너',
    'nav.search.placeholder': '어떤 카드를 찾고 계세요?',
    // ── Hero
    'hero.eyebrow': '지금 두근거리는 옥션',
    'hero.headline.line1': '어릴 적',
    'hero.headline.line2.before': '갖고 싶었던',
    'hero.headline.line2.after': '그 카드,',
    'hero.headline.line3.before': '오늘 우리',
    'hero.headline.line3.after': '컬렉션으로',
    'hero.paragraph.line1': 'PSA·BGS·CGC 인증 카드만 모았어요. 100% 정품 보증, 가품이면 전액 환불.',
    'hero.paragraph.line2': '트레이너의 마당에 오신 걸 환영해요.',
    'hero.cta.primary.live': '지금 {name} 입찰 중!',
    'hero.cta.primary.buynow': '두근두근 경매장',
    'hero.cta.secondary.buynow': '즉시구매 카탈로그',
    'hero.cta.secondary.packs': '카드팩 바로구매',
    'hero.chip.authentic': '정품 100%',
    'hero.chip.certs': 'PSA·BGS·CGC',
    'hero.chip.delivery': '안심 배송',
    // ── Quick categories
    'cat.auctions': '경매',
    'cat.auctions.desc.live': '{n}건 진행중',
    'cat.auctions.desc.soon': '곧 오픈',
    'cat.buynow': '즉시구매',
    'cat.buynow.desc.live': '{n}건 즉시 발송',
    'cat.buynow.desc.soon': '준비 중',
    'cat.packs': '카드팩 · 박스',
    'cat.packs.desc.live': '{n}건 미개봉',
    'cat.packs.desc.soon': '준비 중',
    'cat.all': '전체 카탈로그',
    'cat.all.desc': '모든 등급 보기',
  },
  en: {
    // ── Header
    'header.ribbon.live': 'Live Auction Now',
    'header.ribbon.cert': 'PSA·BGS·CGC Graded',
    'header.ribbon.delivery': 'Insured Shipping',
    'header.logo.sub': 'TRAINER AUCTION',
    'nav.auctions': 'Auctions',
    'nav.products': 'Rare Cards',
    'nav.packs': 'Packs',
    'nav.dex': 'Pokédex',
    'nav.admin': 'Admin',
    'nav.sell': '+ Consign a Card',
    'nav.cart': 'Cart',
    'nav.login': 'Sign in',
    'nav.signup': 'Join as Trainer',
    'nav.trainer': 'Trainer',
    'nav.search.placeholder': 'Find a card…',
    // ── Hero
    'hero.eyebrow': 'Auction in Session',
    'hero.headline.line1': 'That childhood card',
    'hero.headline.line2.before': 'you always',
    'hero.headline.line2.after': 'dreamed of —',
    'hero.headline.line3.before': 'now in our',
    'hero.headline.line3.after': 'collection',
    'hero.paragraph.line1': 'Only PSA·BGS·CGC graded cards. 100% authentic — full refund on any counterfeit.',
    'hero.paragraph.line2': 'Welcome to a Trainer’s home court.',
    'hero.cta.primary.live': 'Bidding on {name} now!',
    'hero.cta.primary.buynow': 'Browse Buy-Now Cards',
    'hero.cta.secondary.buynow': 'Buy-Now Catalog',
    'hero.cta.secondary.packs': 'Buy a Sealed Pack',
    'hero.chip.authentic': '100% Authentic',
    'hero.chip.certs': 'PSA·BGS·CGC',
    'hero.chip.delivery': 'Insured Shipping',
    // ── Quick categories
    'cat.auctions': 'Auctions',
    'cat.auctions.desc.live': '{n} live now',
    'cat.auctions.desc.soon': 'Opening soon',
    'cat.buynow': 'Buy Now',
    'cat.buynow.desc.live': '{n} ship today',
    'cat.buynow.desc.soon': 'Preparing',
    'cat.packs': 'Packs · Boxes',
    'cat.packs.desc.live': '{n} sealed',
    'cat.packs.desc.soon': 'Preparing',
    'cat.all': 'Full Catalog',
    'cat.all.desc': 'All grades',
  },
}

function interpolate(str, params) {
  if (!params) return str
  return str.replace(/\{(\w+)\}/g, (_, k) => (params[k] != null ? String(params[k]) : `{${k}}`))
}

export function useT() {
  const locale = useLocaleStore((s) => s.locale)
  return (key, params) => {
    const v = DICT[locale]?.[key] ?? DICT.ko[key] ?? key
    return interpolate(v, params)
  }
}

export function getT(locale) {
  return (key, params) => {
    const v = DICT[locale]?.[key] ?? DICT.ko[key] ?? key
    return interpolate(v, params)
  }
}
