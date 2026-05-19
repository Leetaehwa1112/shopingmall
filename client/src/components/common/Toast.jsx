import useToastStore from '@/store/toastStore'

const tones = {
  success: { led: 'green', bg: 'bg-grass/15',     accent: 'text-grass'    },
  info:    { led: 'blue',  bg: 'bg-water/15',     accent: 'text-water'    },
  error:   { led: 'red',   bg: 'bg-rose-50',       accent: 'text-dex'      },
}

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts)
  return (
    <div className="fixed top-24 right-6 z-[9998] space-y-3 pointer-events-none">
      {toasts.map((t) => {
        const tone = tones[t.type || 'info']
        return (
          <div key={t.id}
            className={`pointer-events-auto p-4 min-w-[300px] flex items-start gap-3 rounded-xl border-2 border-ink bg-paper shadow-[0_4px_0_#1a1a1a] ${tone.bg}`}
            style={{ animation: 'toast-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
            <span className={`led led-${tone.led} led-pulse mt-1`} style={{ width: 8, height: 8 }} />
            <div className="flex-1">
              <div className={`text-sm font-bold ${tone.accent}`}>{t.title}</div>
              {t.message && <div className="text-xs text-ink/80 mt-0.5 font-medium">{t.message}</div>}
            </div>
          </div>
        )
      })}
      <style>{`@keyframes toast-in {
        from { transform: translateX(60px) rotate(2deg); opacity: 0; }
        to   { transform: translateX(0) rotate(0); opacity: 1; }
      }`}</style>
    </div>
  )
}
