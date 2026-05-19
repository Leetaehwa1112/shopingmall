const variants = {
  primary:   'btn-primary',
  accent:    'btn-accent',
  gold:      'btn-gold',
  spark:     'btn-spark',     // rainbow holo CTA — hero, signup
  pop:       'btn-pop',       // chunky bordered red — main bid CTA
  electric:  'btn-electric',  // yellow pop — secondary playful
  secondary: 'btn-secondary',
  ghost:     'btn-ghost',
  dark:      'btn-primary',
}
const sizes = { sm: 'btn-sm', md: 'btn-md', lg: 'btn-lg' }

export default function Button({
  variant = 'primary', size = 'md', children, className = '', ...rest
}) {
  return (
    <button {...rest} className={`btn ${variants[variant] || ''} ${sizes[size]} ${className}`}>
      {children}
    </button>
  )
}
