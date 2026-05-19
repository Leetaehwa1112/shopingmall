/**
 * Sparkles — 5-star twinkle layer.
 * Wrap a relatively-positioned host (or pass `host=true` to add it).
 * Pair with `.sparkle-host` class on parent for hover-trigger,
 * or pass `always` to twinkle constantly.
 */
export default function Sparkles({ always = false, className = '' }) {
  return (
    <span aria-hidden="true" className={`${always ? 'is-on' : ''} ${className}`}>
      <span className="sparkle s1" />
      <span className="sparkle s2" />
      <span className="sparkle s3" />
      <span className="sparkle s4" />
      <span className="sparkle s5" />
    </span>
  )
}
