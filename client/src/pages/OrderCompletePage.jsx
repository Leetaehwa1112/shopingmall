import { Link } from 'react-router-dom'
import { formatKRWFull } from '@/api/cards'
import PokeCard from '@/components/common/PokeCard'
import Icon from '@/components/common/Icon'
import Sparkles from '@/components/common/Sparkles'
import Eyebrow from '@/components/common/Eyebrow'

export default function OrderCompletePage() {
  const order = JSON.parse(sessionStorage.getItem('last-order') || '{}')
  if (!order.items) return <div className="p-20 text-center text-mute font-bold">주문 내역이 없어요.</div>

  // 가상계좌(bank)는 발급만 됐고 실제 입금은 사용자가 별도로 — UI 분기
  const isPendingDeposit = order.method === 'bank'

  return (
    <div className="max-w-4xl mx-auto px-6 py-16 relative">
      {/* Confetti — 가상계좌(입금 대기)는 조용한 화면이 더 맞아서 생략 */}
      {!isPendingDeposit && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 18 }).map((_, i) => (
            <div key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{
                left: `${5 + i * 5.2}%`,
                top: `${5 + (i % 6) * 12}%`,
                background: ['#dc2626', '#facc15', '#3ba7e8', '#7bc043', '#c084fc', '#ff7a45'][i % 6],
                animation: `confetti 3s ease-in-out ${i * 0.1}s infinite`,
              }} />
          ))}
          <style>{`@keyframes confetti { 0%,100% { opacity: 0; transform: translateY(0) rotate(0deg); } 50% { opacity: 1; transform: translateY(-28px) rotate(180deg); } }`}</style>
        </div>
      )}

      <div className="text-center mb-12 relative sparkle-host">
        {!isPendingDeposit && <Sparkles always />}
        <div className="inline-flex items-center justify-center gap-2 mb-5">
          <span className={`led ${isPendingDeposit ? 'led-yellow' : 'led-green'} led-pulse`} />
          <span className="led led-yellow led-pulse" style={{ animationDelay: '0.2s' }} />
          <span className={`led ${isPendingDeposit ? 'led-yellow' : 'led-red'} led-pulse`} style={{ animationDelay: '0.4s' }} />
        </div>
        {isPendingDeposit ? (
          <>
            <Eyebrow tone="warning" led="yellow" pulse>AWAITING DEPOSIT · 입금 대기 중</Eyebrow>
            <h1 className="mt-5 font-display text-5xl font-bold text-ink tracking-tight leading-[1.05]">
              가상계좌 발급 완료!
              <span className="block mt-2">
                <span className="relative inline-block">
                  <span className="relative z-10 text-water">24시간 내 입금해 주세요</span>
                  <span className="absolute left-0 right-0 bottom-1 h-3 bg-electric/60 -z-0 rounded-sm" aria-hidden />
                </span>
              </span>
            </h1>
            <p className="text-sm text-mute mt-4 font-medium leading-relaxed">
              발급된 가상계좌 정보는 <strong className="text-ink">문자/이메일</strong>로 전송됐어요.<br />
              입금이 확인되면 자동으로 결제 완료 처리되고, 그때부터 발송 준비를 시작합니다.
            </p>
          </>
        ) : (
          <>
            <Eyebrow tone="grass" led="green" pulse>ORDER CONFIRMED · 결제 완료!</Eyebrow>
            <h1 className="mt-5 font-display text-5xl font-bold text-ink tracking-tight leading-[1.05]">
              축하해요!
              <span className="block mt-2">
                <span className="relative inline-block">
                  <span className="relative z-10 text-grass">새 카드가 곧 도착해요</span>
                  <span className="absolute left-0 right-0 bottom-1 h-3 bg-electric/60 -z-0 rounded-sm" aria-hidden />
                </span>
              </span>
            </h1>
            <p className="text-sm text-mute mt-4 font-medium">컬렉션에 카드가 추가되었어요. 안전 포장으로 빠르게 보내드릴게요.</p>
          </>
        )}
        <div className="font-mono text-xs text-ink/60 mt-4 font-bold">ORDER · {order.serverOrder?.orderNumber || order.orderId}</div>
      </div>

      {isPendingDeposit && (
        <div className="surface-pop p-6 mb-6 border-2 border-electric/40 bg-electric/10">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-electric border-2 border-ink flex items-center justify-center flex-shrink-0 shadow-[0_3px_0_#1a1a1a]">
              <Icon name="info" size={22} strokeWidth={2.4} className="text-ink" />
            </div>
            <div className="flex-1 text-sm leading-relaxed text-ink">
              <div className="font-bold mb-1.5">입금 안내</div>
              <ul className="space-y-1 text-ink/85 font-medium">
                <li>• 정확한 <strong>가상계좌 번호 · 은행 · 예금주</strong>는 PortOne에서 발송한 알림(SMS/이메일)에서 확인하세요.</li>
                <li>• 입금 마감: <strong>발급 후 24시간</strong>. 미입금 시 자동 취소돼요.</li>
                <li>• 입금자명은 <strong>주문자 이름과 동일</strong>해야 자동 확인됩니다.</li>
                <li>• 입금 확인 후 결제 완료 알림을 별도로 보내드려요.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col items-center gap-3 mb-10 relative sparkle-host">
        <Sparkles always />
        <div className="flex justify-center gap-3 flex-wrap">
          {order.items.map((c, idx) => (
            <div key={c._id || c.id || idx} className="float-bob">
              <PokeCard card={c} size="sm" interactive={false} showShine={false} eager />
            </div>
          ))}
        </div>
        {/* 상품명 명시 — 팩(itemType:pack)도 nameKo 우선 표시 */}
        <div className="text-center mt-2 space-y-1">
          {order.items.map((c, idx) => {
            const name = c.nameKo || c.name || '상품'
            const qty = c.qty || 1
            return (
              <div key={`name-${c._id || c.id || idx}`} className="font-display text-base font-bold text-ink">
                {name}{qty > 1 ? <span className="text-mute font-bold ml-1.5">× {qty}</span> : null}
              </div>
            )
          })}
        </div>
      </div>

      <div className="surface-pop p-8 mb-6">
        <div className="grid md:grid-cols-3 gap-6 pb-6 border-b-2 border-ink/15">
          <Stat label="결제 금액" value={formatKRWFull(order.total)} highlight />
          <Stat label="결제 수단" value={methodLabel(order.method)} />
          <Stat label="배송 예정" value="1-2일 이내" />
        </div>
        <div className="grid md:grid-cols-2 gap-6 pt-6">
          <KV k="수령인" v={`${order.form?.name} (${order.form?.phone})`} />
          <KV k="배송지" v={`${order.form?.addr1} ${order.form?.addr2 || ''}`} />
          <KV k="배송 방법" v={shippingLabel(order.form?.shipping)} />
          <KV k="서명 필수" v={order.form?.signature ? '예' : '아니오'} />
        </div>
      </div>

      <div className="surface-pop p-8 mb-10">
        <Eyebrow tone="water" led="blue" pulse>SHIPPING · 배송 현황</Eyebrow>
        <div className="grid grid-cols-5 gap-2 mb-4 mt-5">
          {/*
            가상계좌(미입금): step 0 "입금 대기"가 현재(시계 아이콘), 나머지 미완료.
            카드/간편결제(완료): step 0 "주문 확정" + step 1 "결제 확인" 모두 완료(체크),
            step 2 "발송 준비"가 현재(시계).
          */}
          {(() => {
            const steps = isPendingDeposit
              ? ['입금 대기', '입금 확인', '발송 준비', '운송중', '도착']
              : ['주문 확정', '결제 확인', '발송 준비', '운송중', '도착']
            // 가상계좌: currentIdx=0 / 완료=[] · 카드: currentIdx=2 / 완료=[0,1]
            const currentIdx = isPendingDeposit ? 0 : 2
            return steps.map((s, i) => {
              const done = i < currentIdx
              const current = i === currentIdx
              const inactive = i > currentIdx
              const circleCls = done
                ? 'bg-grass text-white shadow-[0_3px_0_#1a1a1a]'
                : current
                  ? (isPendingDeposit
                      ? 'bg-electric text-ink shadow-[0_3px_0_#1a1a1a]'
                      : 'bg-water text-white shadow-[0_3px_0_#1a1a1a]')
                  : 'bg-paper text-mute'
              return (
                <div key={s} className="text-center">
                  <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-2 font-bold text-sm border-2 border-ink ${circleCls}`}>
                    {done
                      ? <Icon name="check" size={18} strokeWidth={3} />
                      : current
                        ? <Icon name="clock" size={18} strokeWidth={3} />
                        : i + 1}
                  </div>
                  <div className={`text-xs font-bold ${inactive ? 'text-mute' : 'text-ink'}`}>{s}</div>
                </div>
              )
            })
          })()}
        </div>
        {/* 진행률: 가상계좌 10% / 카드 50% (5단계 중 2단계 완료 + 3단계 진행중) */}
        <div className="hp-bar"><div className="hp-bar-fill" style={{ width: isPendingDeposit ? '10%' : '50%' }} /></div>
      </div>

      <div className="flex gap-3 justify-center flex-wrap">
        {order.serverOrder?.orderNumber && (
          <Link
            to={`/track/${order.serverOrder.orderNumber}`}
            className="btn-pop px-6 py-3 rounded-xl inline-flex items-center gap-2 font-bold"
          >
            실시간 배송 추적 <Icon name="arrow" size={14} strokeWidth={2.4} />
          </Link>
        )}
        <Link
          to="/my-orders"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-paper border-2 border-ink text-ink font-bold shadow-[0_3px_0_#1a1a1a] hover:bg-electric/30 hover:-translate-y-0.5 transition-all"
        >
          주문 목록 보기 <Icon name="arrow" size={14} strokeWidth={2.4} />
        </Link>
        <Link
          to="/products"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-paper border-2 border-ink text-ink font-bold shadow-[0_3px_0_#1a1a1a] hover:bg-electric/30 hover:-translate-y-0.5 transition-all"
        >
          계속 쇼핑하기
        </Link>
      </div>
    </div>
  )
}

function Stat({ label, value, highlight }) {
  return (
    <div>
      <div className="text-[10px] font-bold text-mute tracking-[0.18em] uppercase mb-1.5">{label}</div>
      <div className={`font-display text-2xl font-bold tabular-nums ${highlight ? 'text-dex' : 'text-ink'}`}>{value}</div>
    </div>
  )
}
function KV({ k, v }) {
  return (
    <div>
      <div className="text-[10px] font-bold text-mute tracking-[0.18em] uppercase">{k}</div>
      <div className="text-sm text-ink font-bold mt-1.5">{v}</div>
    </div>
  )
}
function methodLabel(m) {
  return { card: '신용카드', toss: '토스페이', kakao: '카카오페이', bank: '가상계좌', escrow: '에스크로' }[m] || m
}
function shippingLabel(s) {
  return {
    standard: '일반 배송',
    quick: '퀵 배송',
    fedex: 'FedEx Priority',
    ems: 'EMS Premium',
    brinks: "Brink's 무장 수송",
    pickup: '직접 수령',
  }[s] || s
}
