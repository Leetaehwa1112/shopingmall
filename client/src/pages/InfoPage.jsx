import { useParams, Link } from 'react-router-dom'
import { useState } from 'react'
import Icon from '@/components/common/Icon'

// 정적 정보 페이지 — 단일 컴포넌트가 슬러그로 컨텐츠 분기.
// 별도 라우트 7개 모두 같은 청크 공유 → 번들 영향 최소.

const CONTENT = {
  support: {
    title: '고객센터',
    eyebrow: 'SUPPORT · 1588-0420',
    intro: '평일 10:00–18:00 · 점심 12:30–13:30 제외',
    sections: [
      { h: '연락 채널',
        body: [
          ['전화', '1588-0420 (평일 10–18시)'],
          ['이메일', 'support@pokevault.kr'],
          ['카카오 채널', '@pokevault'],
        ],
      },
      { h: '응대 안내',
        body: [
          ['평균 응답 시간', '카카오 30분 / 이메일 영업일 1일 내'],
          ['긴급 응대', '고액 거래(₩1,000,000 이상) 전담 라인 별도 안내'],
        ],
      },
      { h: '주말/공휴일',
        body: [
          ['카카오 자동 응답', '운영'],
          ['전화/이메일 응대', '익영업일 순차 처리'],
        ],
      },
    ],
  },
  shipping: {
    title: '배송 안내',
    eyebrow: 'SHIPPING · 100% 보험 포함',
    intro: '모든 발송은 트래킹 + 수령인 서명 필수. 분실/파손 시 전액 보상.',
    sections: [
      { h: '배송 옵션',
        body: [
          ['일반 배송', '평일 1-2일 (무료)'],
          ['퀵 배송', '서울/경기 당일 2-4시간 (+30,000원)'],
          ['FedEx Priority', '국제 안심 배송 + 전액 보험 (+30,000원)'],
          ['Brink\'s', '₩1,000,000 이상 자동 적용 (+1,500,000원)'],
        ],
      },
      { h: '패키징',
        body: [
          ['외포장', '5겹 충격 흡수 + 방수 처리'],
          ['카드 보호', 'Toploader + Penny Sleeve + Team Bag'],
          ['고가 카드', 'PSA Slab 자체 패딩 박스로 추가 보호'],
        ],
      },
      { h: '트래킹',
        body: [
          ['발송 24시간 내', 'SMS + 이메일로 트래킹 번호 전송'],
          ['실시간 위치', '마이페이지 > 내 주문 목록에서 확인'],
        ],
      },
    ],
  },
  returns: {
    title: '반품 안내',
    eyebrow: 'RETURNS · 7일 보장',
    intro: '카드 컨디션이 안내와 다를 경우 100% 반품 보장. 단순 변심은 7일 이내.',
    sections: [
      { h: '반품 가능 기간',
        body: [
          ['수령 후 7일', '모든 사유 반품 가능'],
          ['컨디션 상이', '기간 무관 (PSA/BGS/CGC 등급 변동 포함)'],
          ['정품 인증 실패', '전액 환불 + 운송비 부담'],
        ],
      },
      { h: '반품 절차',
        body: [
          ['1단계', '마이페이지 > 주문 상세에서 반품 신청'],
          ['2단계', '24시간 내 회수 신청 (Brink\'s 또는 FedEx)'],
          ['3단계', '회수 도착 + 검수 (영업일 1-2일)'],
          ['4단계', '검수 통과 시 즉시 환불 (카드/계좌)'],
        ],
      },
      { h: '반품 불가',
        body: [
          ['개봉된 봉인 팩/박스', '시장 가치 보전을 위해 미개봉 상태만 반품 가능'],
          ['고객 과실 손상', '슬리브 제거, 액체 노출 등'],
          ['경매 낙찰 후 변심', '낙찰가 10% 위약금 발생'],
        ],
      },
    ],
  },
  faq: {
    title: 'FAQ',
    eyebrow: 'FAQ · 자주 묻는 질문',
    intro: '주문 · 결제 · 배송 · 인증에 대한 가장 많이 받는 질문들',
    faq: [
      { q: '카드는 진품 인증되어 있나요?',
        a: '모든 출품 카드는 PSA / BGS / CGC 중 하나의 공식 등급사 인증을 거친 슬랩 상태로 거래됩니다. 인증서 번호는 상세 페이지에서 확인 가능합니다.' },
      { q: '경매 입찰 시 보증금이 있나요?',
        a: '₩1,000,000 이상 입찰 시 결제수단 사전 등록이 필요합니다. 낙찰 시 자동 결제되며, 미낙찰 시 보증금은 발생하지 않습니다.' },
      { q: '결제 수단은 어떤 게 있나요?',
        a: '신용/체크카드, 토스페이, 카카오페이, 가상계좌, 에스크로(₩1,000,000 이상 자동)를 지원합니다.' },
      { q: '해외 배송 가능한가요?',
        a: 'FedEx Priority Insured로 미국·일본·EU 주요국 발송 가능. 3-5영업일 도착, 전액 보험 포함됩니다.' },
      { q: '낙찰 후 결제 기한은?',
        a: '낙찰 후 24시간 이내 결제 필수. 미결제 시 자동 취소 + 차순위 입찰자에게 기회가 넘어갑니다.' },
      { q: '내 카드를 출품하려면?',
        a: '"내 카드 출품" 메뉴에서 신청 → 어드민 검수(영업일 1-2일) → 승인 시 경매/즉시구매로 등록됩니다.' },
      { q: '카드 상태를 직접 확인할 수 있나요?',
        a: '서울 강남 쇼룸에서 사전 예약 후 실물 확인 가능 (평일 13:00–17:00). 1588-0420으로 문의주세요.' },
    ],
  },
  about: {
    title: '회사 소개',
    eyebrow: 'COMPANY · 2026',
    intro: '어른이 된 트레이너를 위한 정품 인증 컬렉터블 마켓',
    sections: [
      { h: '우리는',
        body: [
          ['미션', '그때 손에 쥐고 싶었던 카드들을 한 페이지에서 만날 수 있게 합니다.'],
          ['철학', '모든 카드는 정품 인증, 모든 거래는 트래킹 가능해야 합니다.'],
        ],
      },
      { h: '회사 정보',
        body: [
          ['상호', 'POKÉVAULT Inc.'],
          ['대표이사', '이태화'],
          ['사업자등록번호', '123-45-67890'],
          ['통신판매업 신고', '2026-서울강남-0420'],
          ['주소', '서울특별시 강남구 테헤란로 420'],
          ['이메일', 'hello@pokevault.kr'],
        ],
      },
      { h: '신뢰 기반',
        body: [
          ['PSA/BGS/CGC 공식 파트너', '국제 인증 등급사와 직접 연계'],
          ['에스크로', '₩1,000,000 이상 거래 자동 안전결제'],
          ['Brink\'s 운송', '초고가 거래 무장 운송 + 전액 보험'],
        ],
      },
    ],
  },
  terms: {
    title: '이용약관',
    eyebrow: 'TERMS · 2026.01.01 시행',
    intro: 'POKÉVAULT 서비스 이용 시 적용되는 약관입니다.',
    sections: [
      { h: '제1조 (목적)',
        body: [['', 'POKÉVAULT(이하 "회사")가 제공하는 카드 거래·경매 서비스 이용에 관한 회사와 회원 간의 권리·의무 및 책임사항을 규정합니다.']] },
      { h: '제2조 (정의)',
        body: [
          ['회원', '본 약관에 동의하고 서비스에 가입한 자'],
          ['카드', 'PSA/BGS/CGC 등 공인 등급사 인증 슬랩 상태 트레이딩 카드'],
          ['경매', '회원 간 입찰을 통해 최고가 입찰자에게 낙찰되는 거래'],
        ],
      },
      { h: '제3조 (회원가입)',
        body: [
          ['가입 자격', '만 14세 이상, 본인 명의 휴대전화 인증 완료자'],
          ['거부 사유', '허위 정보 기재, 과거 강제탈퇴 이력, 부정 거래 이력'],
        ],
      },
      { h: '제4조 (경매 입찰)',
        body: [
          ['입찰 효력', '입찰은 회원의 구속력 있는 청약으로, 임의 취소 불가'],
          ['낙찰', '경매 종료 시점 최고가 입찰자에게 자동 낙찰'],
          ['결제 기한', '낙찰 후 24시간 이내 결제 필수, 미결제 시 자동 취소'],
        ],
      },
      { h: '제5조 (반품 및 환불)',
        body: [
          ['단순 변심', '수령 후 7일 이내 반품 신청 가능 (운송비 회원 부담)'],
          ['컨디션 상이', '기간 무관 100% 환불 + 운송비 회사 부담'],
          ['낙찰 후 변심', '낙찰가 10% 위약금 발생'],
        ],
      },
      { h: '제6조 (책임 제한)',
        body: [
          ['천재지변', '회사 통제 범위를 벗어난 사유로 인한 손해는 면책'],
          ['회원 과실', '비밀번호 관리 소홀 등 회원 귀책 손해는 회사 면책'],
        ],
      },
    ],
  },
  privacy: {
    title: '개인정보 처리방침',
    eyebrow: 'PRIVACY · 2026.01.01 시행',
    intro: '회사가 수집·이용하는 개인정보의 범위와 처리 방법을 안내합니다.',
    sections: [
      { h: '1. 수집 항목',
        body: [
          ['필수', '이메일, 비밀번호, 이름, 휴대전화번호, 배송 주소'],
          ['선택', '프로필 이미지, 관심 카드 카테고리'],
          ['자동 수집', 'IP, 쿠키, 접속 로그, 기기 정보'],
        ],
      },
      { h: '2. 수집 목적',
        body: [
          ['서비스 제공', '회원 식별, 거래 처리, 배송, 결제'],
          ['CS', '문의 응대, 분쟁 조정'],
          ['보안', '부정 거래 탐지, 계정 도용 방지'],
        ],
      },
      { h: '3. 보유 기간',
        body: [
          ['회원 정보', '회원 탈퇴 시까지 (단, 관련 법령에 따라 일정 기간 보관)'],
          ['거래 기록', '전자상거래법에 따라 5년'],
          ['로그 기록', '통신비밀보호법에 따라 3개월'],
        ],
      },
      { h: '4. 제3자 제공',
        body: [
          ['배송', '운송사(CJ대한통운, FedEx, Brink\'s)에 배송 정보 제공'],
          ['결제', 'PG사(PortOne)에 결제 정보 위탁'],
          ['이외', '회원 동의 또는 법령 근거 없이 제공하지 않음'],
        ],
      },
      { h: '5. 회원 권리',
        body: [
          ['열람·수정', '마이페이지 > 프로필 수정에서 직접 가능'],
          ['탈퇴', '마이페이지 > 계정 설정에서 즉시 처리'],
          ['이의 제기', 'privacy@pokevault.kr 또는 1588-0420'],
        ],
      },
      { h: '6. 개인정보 보호 책임자',
        body: [
          ['책임자', '이태화 (대표이사)'],
          ['연락처', 'privacy@pokevault.kr'],
        ],
      },
    ],
  },
}

export default function InfoPage() {
  const { slug } = useParams()
  const c = CONTENT[slug]

  if (!c) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-20 text-center">
        <div className="font-display text-3xl font-bold text-ink mb-3">페이지를 찾을 수 없어요</div>
        <Link to="/" className="text-sm text-dex font-bold underline">홈으로</Link>
      </div>
    )
  }

  return (
    <article className="max-w-3xl mx-auto px-6 py-12 lg:py-16">
      {/* Header */}
      <div className="mb-10 pb-6 border-b-2 border-ink">
        <div className="inline-flex items-center gap-2 mb-3">
          <span className="led led-yellow led-pulse" style={{ width: 7, height: 7 }} />
          <span className="font-mono text-[10px] font-bold tracking-[0.22em] uppercase text-mute">
            {c.eyebrow}
          </span>
        </div>
        <h1 className="font-display text-4xl lg:text-5xl font-bold text-ink tracking-tight">{c.title}</h1>
        {c.intro && <p className="text-sm text-mute mt-3 font-medium leading-relaxed">{c.intro}</p>}
      </div>

      {/* FAQ는 아코디언, 나머지는 섹션 카드 */}
      {c.faq ? (
        <div className="space-y-2">
          {c.faq.map((item, i) => <FaqRow key={i} q={item.q} a={item.a} />)}
        </div>
      ) : (
        <div className="space-y-8">
          {c.sections.map((s, i) => (
            <section key={i}>
              <h2 className="font-display text-lg font-bold text-ink mb-3">{s.h}</h2>
              <dl className="bg-paper border-2 border-ink rounded-xl shadow-[0_3px_0_#1a1a1a] divide-y-2 divide-ink/10">
                {s.body.map(([k, v], j) => (
                  <div key={j} className="grid grid-cols-[140px_1fr] gap-3 px-5 py-3 text-sm">
                    {k && <dt className="text-mute font-bold">{k}</dt>}
                    <dd className={`text-ink font-medium leading-relaxed ${!k ? 'col-span-2' : ''}`}>{v}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      )}

      {/* Footer back-link */}
      <div className="mt-14 pt-6 border-t-2 border-dotted border-line text-center">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-bold text-mute hover:text-ink">
          <Icon name="arrow" size={11} strokeWidth={2.5} className="rotate-180" />
          홈으로
        </Link>
      </div>
    </article>
  )
}

function FaqRow({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="bg-paper border-2 border-ink rounded-xl shadow-[0_3px_0_#1a1a1a] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-bone-2/40 transition-colors"
      >
        <span className="font-bold text-ink text-sm pr-4">{q}</span>
        <span className={`shrink-0 text-mute transition-transform ${open ? 'rotate-90' : ''}`}>
          <Icon name="arrow" size={12} strokeWidth={2.5} />
        </span>
      </button>
      {open && (
        <div className="px-5 pb-4 pt-1 text-sm text-ink/80 leading-relaxed border-t border-dotted border-ink/15">
          {a}
        </div>
      )}
    </div>
  )
}
