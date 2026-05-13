const variants = {
  primary: 'btn-primary',
  accent: 'btn-accent',
  gold: 'btn-gold',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  dark: 'btn-primary',
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
