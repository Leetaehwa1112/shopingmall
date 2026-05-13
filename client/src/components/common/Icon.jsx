import { ICONS } from './iconPaths'

export default function Icon({ name, size = 20, className = '', strokeWidth = 1.6, ...rest }) {
  const d = ICONS[name]
  if (!d) return null
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round"
      className={className}
      {...rest}
    >
      <path d={d} />
    </svg>
  )
}
