/**
 * KeyboardShortcutsHelp — `?` 키로 토글되는 단축키 치트시트.
 *
 * 운영 효율 의도
 *   강력한 단축키가 있어도 운영자가 모르면 무용. 매 화면마다 `?`로
 *   현재 컨텍스트의 단축키를 즉시 확인 → 키보드 사용률을 강제 견인.
 *
 *   Linear / GitHub / Notion 동일 패턴.
 *
 * Props
 *   shortcuts: [{ section, items: [{ keys: ['j'], desc: '...' }] }]
 *
 * 토글:
 *   - `?` (Shift+/) — 입력 중이 아닐 때 전역
 *   - 모달 외부 클릭 / ESC — 닫기
 */
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from '@/components/common/Icon'

// 기본 전역 단축키 (모든 admin 화면 공통)
const GLOBAL_SHORTCUTS = {
  section: '전역',
  items: [
    { keys: ['⌘', 'K'], desc: '명령 팔레트 (검색·점프)' },
    { keys: ['?'],      desc: '이 도움말 열기/닫기' },
    { keys: ['Esc'],    desc: '모달/드로어 닫기' },
  ],
}

export default function KeyboardShortcutsHelp({ shortcuts = [] }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const t = document.activeElement?.tagName
      const inEditor = t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT' || document.activeElement?.isContentEditable
      if (inEditor && e.key !== 'Escape') return
      if (e.key === '?' && e.shiftKey) {
        e.preventDefault()
        setOpen((v) => !v)
      } else if (e.key === 'Escape' && open) {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (!open) return null

  const sections = [GLOBAL_SHORTCUTS, ...shortcuts]

  return createPortal(
    <div className="fixed inset-0 z-[65] flex items-center justify-center p-4" onClick={() => setOpen(false)}>
      <div className="absolute inset-0 bg-ink/50 backdrop-blur-[2px]" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="키보드 단축키"
        className="relative w-full max-w-2xl bg-paper border-2 border-ink rounded-2xl shadow-[0_6px_0_#1a1a1a] flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="px-5 py-3.5 border-b-2 border-ink/10 flex items-center gap-3">
          <span className="w-8 h-8 rounded-full bg-electric/30 border-2 border-ink flex items-center justify-center">
            <Icon name="bolt" size={13} strokeWidth={2.4} />
          </span>
          <div className="flex-1">
            <div className="text-base font-bold text-ink">키보드 단축키</div>
            <div className="text-xs text-mute font-medium">현재 화면에서 사용 가능한 단축키</div>
          </div>
          <kbd className="text-[10px] font-mono text-mute bg-bone-2 border border-ink/15 px-1.5 py-0.5 rounded">?</kbd>
          <button onClick={() => setOpen(false)} aria-label="닫기"
            className="w-7 h-7 rounded-md text-mute hover:text-ink hover:bg-bone-2">
            <Icon name="close" size={13} strokeWidth={2.4} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {sections.map((sec, si) => (
            <section key={si}>
              <h3 className="text-[10px] font-bold tracking-[0.18em] uppercase text-mute mb-2">{sec.section}</h3>
              <div className="space-y-1.5">
                {sec.items.map((it, i) => (
                  <div key={i} className="flex items-center justify-between py-1 px-2 rounded hover:bg-bone-2/50">
                    <span className="text-sm text-ink">{it.desc}</span>
                    <span className="flex items-center gap-1 shrink-0">
                      {it.keys.map((k, j) => (
                        <kbd
                          key={j}
                          className="text-[11px] font-mono text-ink bg-paper border border-ink/20 px-1.5 py-0.5 rounded shadow-[0_1px_0_rgba(0,0,0,0.08)] min-w-[20px] text-center"
                        >
                          {k}
                        </kbd>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="px-5 py-2 bg-bone-2/60 border-t border-ink/10 text-[10px] text-mute font-mono text-center">
          입력 중에는 단축키가 비활성됩니다 · ESC로 입력 해제
        </div>
      </div>
    </div>,
    document.body
  )
}
