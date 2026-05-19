import Icon from './Icon'

/**
 * Eyebrow — playful section/hero kicker chip.
 * Bordered pill with optional LED dot and emoji-like icon.
 *  tone: 'fire'|'water'|'electric'|'psychic'|'grass'|'ink' (border/text accent)
 */
const toneText = {
  fire:     'text-fire',
  water:    'text-water',
  electric: 'text-gold',
  psychic:  'text-psychic',
  grass:    'text-grass',
  ink:      'text-ink',
}

export default function Eyebrow({ tone = 'ink', icon, dot = false, dotColor = 'red', children, className = '' }) {
  return (
    <span className={`eyebrow ${toneText[tone] || ''} ${className}`}>
      {dot && <span className={`led led-${dotColor} led-pulse`} style={{ width: 7, height: 7 }} aria-hidden="true" />}
      {icon && <Icon name={icon} size={12} strokeWidth={2.5} aria-hidden="true" />}
      {children}
    </span>
  )
}
