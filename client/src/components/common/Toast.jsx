import useToastStore from '@/store/toastStore'

const tones = {
  success: { led: 'green', accent: 'text-emerald-700' },
  info:    { led: 'blue',  accent: 'text-blue-700' },
  error:   { led: 'red',   accent: 'text-dex' },
}

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts)
  return (
    <div className="fixed top-24 right-6 z-[9998] space-y-3 pointer-events-none">
      {toasts.map((t) => {
        const tone = tones[t.type || 'info']
        return (
          <div key={t.id} className="surface-soft elev-3 pointer-events-auto p-4 min-w-[300px] flex items-start gap-3"
            style={{ animation: 'toast-in 0.35s cubic-bezier(0.16, 1, 0.3, 1)' }}>
            <span className={`led led-${tone.led} led-pulse mt-1`} />
            <div className="flex-1">
              <div className={`text-sm font-bold ${tone.accent}`}>{t.title}</div>
              {t.message && <div className="text-xs text-mute mt-0.5">{t.message}</div>}
            </div>
          </div>
        )
      })}
      <style>{`@keyframes toast-in {
        from { transform: translateX(40px); opacity: 0; }
        to   { transform: translateX(0); opacity: 1; }
      }`}</style>
    </div>
  )
}
