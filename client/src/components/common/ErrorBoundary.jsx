/**
 * ErrorBoundary — 라우트 lazy chunk + 페이지 컴포넌트 런타임 에러 캐치.
 *
 * 처리 시나리오:
 *   1) ChunkLoadError / dynamic import 실패 → 새 배포로 HTML이 옛 청크 해시를 가리킴.
 *      sessionStorage 플래그로 1회만 자동 새로고침 (무한루프 방지).
 *   2) 그 외 컴포넌트 에러 → 친절한 "다시 시도" 폴백 화면.
 *
 * 마이페이지/디테일 등 lazy 페이지에서 "안 열림" 신고 → 대부분 stale HTML+청크 mismatch.
 */
import { Component } from 'react'

const RELOAD_KEY = 'pokevault:chunk-reload-once'

function isChunkLoadError(err) {
  if (!err) return false
  const msg = String(err.message || err.name || err)
  return (
    err.name === 'ChunkLoadError' ||
    /Loading chunk/i.test(msg) ||
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg) ||
    /ChunkLoadError/i.test(msg)
  )
}

// sessionStorage 플래그로 1회만 자동 새로고침 (무한루프 방지)
function maybeReloadOnce() {
  try {
    if (!sessionStorage.getItem(RELOAD_KEY)) {
      sessionStorage.setItem(RELOAD_KEY, String(Date.now()))
      window.location.reload()
    }
  } catch {/* private mode etc. */}
}

class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    if (isChunkLoadError(error)) {
      maybeReloadOnce()
      return
    }
    // 디버깅 흔적
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info)
  }

  componentDidMount() {
    // 새 페이지에 무사히 도착했으니 플래그 클리어
    try { sessionStorage.removeItem(RELOAD_KEY) } catch {/* */}
    // window 레벨 unhandledrejection 리스너 — Suspense가 못 잡는 비동기 dynamic import 실패 보완.
    // 신배포 직후 stale HTML이 옛 청크 해시 fetch 실패 → ErrorBoundary는 동기 throw만 잡으니
    // Promise reject 경로는 여기서 추가로 캐치하여 1회 새로고침.
    this._onUnhandled = (e) => {
      const err = e?.reason || e
      if (isChunkLoadError(err)) {
        e?.preventDefault?.()
        maybeReloadOnce()
      }
    }
    this._onError = (e) => {
      if (isChunkLoadError(e?.error || e?.message)) maybeReloadOnce()
    }
    window.addEventListener('unhandledrejection', this._onUnhandled)
    window.addEventListener('error', this._onError)
  }

  componentWillUnmount() {
    window.removeEventListener('unhandledrejection', this._onUnhandled)
    window.removeEventListener('error', this._onError)
  }

  reset = () => { this.setState({ error: null }) }
  reload = () => { window.location.reload() }

  render() {
    if (!this.state.error) return this.props.children

    const chunkErr = isChunkLoadError(this.state.error)
    return (
      <div className="max-w-md mx-auto py-20 px-6 text-center">
        <div className="surface-pop p-8">
          <div className="text-5xl mb-3" aria-hidden="true">🛠️</div>
          <h2 className="font-display text-2xl font-bold text-ink mb-2">
            {chunkErr ? '잠깐, 새 버전이 떴어요!' : '잠깐 문제가 있어요'}
          </h2>
          <p className="text-sm text-mute font-medium mb-6">
            {chunkErr
              ? '오래된 페이지가 캐시돼 있어서 안 보일 수 있어요. 새로고침하면 정상으로 돌아와요.'
              : '페이지를 다시 그리는 중에 막혔어요. 한 번만 더 시도해주세요.'}
          </p>
          <div className="flex gap-2 justify-center">
            <button
              type="button"
              onClick={this.reload}
              className="btn btn-pop btn-sm"
            >
              새로고침
            </button>
            <button
              type="button"
              onClick={this.reset}
              className="text-sm font-bold text-mute hover:text-ink underline underline-offset-2"
            >
              그냥 다시 시도
            </button>
          </div>
        </div>
      </div>
    )
  }
}

export default ErrorBoundary
