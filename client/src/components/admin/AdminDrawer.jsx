/**
 * AdminDrawer — 우측 슬라이드오버 상세 패널.
 *
 * 운영 효율 의도
 *   리스트 컨텍스트(필터/스크롤/선택)를 잃지 않고 상세를 본다.
 *   "주문 30건 출고 처리" 중 한 건 메모만 보고 다음으로 — 페이지 점프 없이.
 *
 *   J/K 키로 형제 row 점프 (이메일/Notion 패턴).
 *   ESC로 닫기. Cmd+Shift+E (또는 자체 버튼)로 풀화면 진입.
 *
 * 접근성
 *   - role="dialog" + aria-modal="true"
 *   - 첫 focusable에 자동 포커스, 닫힐 때 원래 요소로 복귀
 *   - focus trap (tab 순환을 드로어 안에 가둠)
 *   - 외부 backdrop 클릭은 의도하지 않은 닫힘 방지 위해 옵션화
 *     (위험 액션 진행 중에는 dismissible=false로)
 *
 * Props
 *   open: boolean — 열림 상태
 *   onClose: () => void — 닫기 요청 (ESC, backdrop, 닫기 버튼)
 *   onPrev / onNext: () => void — 형제 row 이동 (선택)
 *   title: string | ReactNode — 헤더 제목
 *   subtitle: string | ReactNode — 부제 (status pill 등)
 *   size: 'sm' | 'md' | 'lg' — 너비 (기본 md = 540px)
 *   dismissible: boolean — backdrop/ESC 닫기 허용 (기본 true)
 *   onFullScreen: () => void — 풀스크린 진입 (선택)
 *   children: 본문
 *   footer: 하단 sticky 액션바 (선택)
 */
import { useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import Icon from '@/components/common/Icon'

const SIZE = {
  sm: 'w-full sm:max-w-[420px]',
  md: 'w-full sm:max-w-[540px]',
  lg: 'w-full sm:max-w-[720px]',
  xl: 'w-full sm:max-w-[960px]',
}

export default function AdminDrawer({
  open,
  onClose,
  onPrev,
  onNext,
  title,
  subtitle,
  size = 'md',
  dismissible = true,
  onFullScreen,
  children,
  footer,
}) {
  const panelRef = useRef(null)
  const previousFocusRef = useRef(null)

  // 열림/닫힘 시 포커스 관리
  useEffect(() => {
    if (!open) return
    previousFocusRef.current = document.activeElement

    // 마운트 직후 첫 focusable에 포커스
    const t = setTimeout(() => {
      const first = panelRef.current?.querySelector(
        'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'
      )
      first?.focus()
    }, 50)

    // 닫힐 때 원래 요소로 복귀
    return () => {
      clearTimeout(t)
      try { previousFocusRef.current?.focus?.() } catch { /* noop */ }
    }
  }, [open])

  // 키보드: ESC, J/K, Tab trap
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      // 입력 중인 요소에서는 단축키 비활성 (J/K 충돌 방지)
      const ae = document.activeElement
      const inEditor = ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable)

      if (e.key === 'Escape' && dismissible) {
        e.preventDefault()
        onClose?.()
        return
      }
      if (!inEditor) {
        if (e.key === 'j' && onNext) { e.preventDefault(); onNext() }
        if (e.key === 'k' && onPrev) { e.preventDefault(); onPrev() }
      }
      // 간단한 focus trap (Shift+Tab 처음에서 / Tab 마지막에서 순환)
      if (e.key === 'Tab') {
        const focusables = panelRef.current?.querySelectorAll(
          'button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
        )
        if (!focusables?.length) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault(); last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault(); first.focus()
        }
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose, onNext, onPrev, dismissible])

  // body 스크롤 잠금
  useEffect(() => {
    if (!open) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = original }
  }, [open])

  const handleBackdrop = useCallback(() => {
    if (dismissible) onClose?.()
  }, [dismissible, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[60] flex">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="드로어 닫기"
        tabIndex={-1}
        onClick={handleBackdrop}
        className="absolute inset-0 bg-ink/40 backdrop-blur-[2px] cursor-default"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : '상세 정보'}
        className={`relative ml-auto bg-paper border-l-2 border-ink shadow-[-8px_0_0_rgba(0,0,0,0.04)] ${SIZE[size] || SIZE.md} h-full flex flex-col animate-drawer-in`}
      >
        {/* Header (sticky) */}
        <header className="flex-shrink-0 border-b-2 border-ink/10 px-5 py-3.5 flex items-center gap-3 bg-paper">
          {/* Prev/Next — onPrev/onNext 있을 때만 노출 */}
          {(onPrev || onNext) && (
            <div className="flex items-center gap-0.5">
              <IconBtn
                label="이전 항목 (K)"
                disabled={!onPrev}
                onClick={onPrev}
                icon="arrow"
                rotateDeg={180}
              />
              <IconBtn
                label="다음 항목 (J)"
                disabled={!onNext}
                onClick={onNext}
                icon="arrow"
              />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="text-base font-bold text-ink truncate">{title}</div>
            {subtitle && <div className="text-xs text-mute font-medium truncate mt-0.5">{subtitle}</div>}
          </div>

          {onFullScreen && (
            <IconBtn label="전체화면" onClick={onFullScreen} icon="trophy" />
          )}
          <IconBtn label="닫기 (ESC)" onClick={onClose} icon="close" />
        </header>

        {/* Body (scroll) */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {children}
        </div>

        {/* Footer (sticky) */}
        {footer && (
          <footer className="flex-shrink-0 border-t-2 border-ink/10 px-5 py-3 bg-paper">
            {footer}
          </footer>
        )}
      </div>

      {/* Animation — Tailwind v4 안 쓰는 keyframe은 인라인 */}
      <style>{`
        @keyframes drawer-in {
          from { transform: translateX(24px); opacity: 0; }
          to   { transform: translateX(0); opacity: 1; }
        }
        .animate-drawer-in { animation: drawer-in 180ms cubic-bezier(0.16, 1, 0.3, 1) both; }
      `}</style>
    </div>,
    document.body
  )
}

// ─── 헤더 아이콘 버튼 ──────────────────────────────────
function IconBtn({ label, onClick, icon, rotateDeg = 0, disabled }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="w-8 h-8 rounded-md flex items-center justify-center text-mute hover:text-ink hover:bg-bone-2 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
    >
      <Icon name={icon} size={14} strokeWidth={2.2} style={rotateDeg ? { transform: `rotate(${rotateDeg}deg)` } : undefined} />
    </button>
  )
}
