import { Link } from 'react-router-dom'
import Icon from './Icon'
import Eyebrow from './Eyebrow'

/**
 * SectionHead — friendly playful section header.
 *  - Bordered "eyebrow" pill on top
 *  - Big bold Bungee display title with optional accented word
 *  - 마이크로 카피 with emotion-forward tone
 *  - CTA arrow that nudges right on hover
 */
export default function SectionHead({
  eyebrow,            // string
  eyebrowTone = 'ink',
  eyebrowIcon,
  eyebrowDot = false,
  title,              // string — can include <em>(accent word)
  accent,             // optional ReactNode — rendered after title for accent
  desc,               // string
  cta,                // { label, to } | null
}) {
  return (
    <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
      <div>
        {eyebrow && (
          <Eyebrow tone={eyebrowTone} icon={eyebrowIcon} dot={eyebrowDot} className="mb-4">
            {eyebrow}
          </Eyebrow>
        )}
        <h2 className="font-display text-3xl lg:text-[42px] font-bold text-ink tracking-tight leading-[1.05]">
          {title} {accent && <span className="inline-block">{accent}</span>}
        </h2>
        {desc && (
          <p className="text-[15px] text-mute mt-3 max-w-2xl leading-relaxed font-medium">{desc}</p>
        )}
      </div>
      {cta && (
        <Link
          to={cta.to}
          className="group inline-flex items-center gap-2 text-sm font-bold text-ink hover:text-dex transition-colors shrink-0"
          aria-label={cta.label}
        >
          <span className="border-b-2 border-transparent group-hover:border-current">{cta.label}</span>
          <Icon name="arrow" size={14} strokeWidth={2.5} className="group-hover:translate-x-1 transition-transform" />
        </Link>
      )}
    </header>
  )
}
