import { memo } from 'react'

/**
 * Sparkles — 5-star twinkle layer.
 * Pure presentational, props는 primitive. memo로 부모 재렌더 격리.
 */
function Sparkles({ always = false, className = '' }) {
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

export default memo(Sparkles)
