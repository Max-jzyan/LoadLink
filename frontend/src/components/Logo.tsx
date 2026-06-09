interface LogoProps {
  size?: number
  className?: string
  color?: string
}
const Logo = ({ size = 32, className, color }: LogoProps) => {
  return (
    <svg
      viewBox="24 24 52 52"
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      className={className}
      style={color ? { color } : undefined}
    >
      <g fill="currentColor">
        <rect x="27" y="27" width="14" height="14" rx="3.5"></rect>
        <rect x="43" y="27" width="14" height="14" rx="3.5"></rect>
        <rect x="59" y="27" width="14" height="14" rx="3.5" opacity="0.18"></rect>
        <rect x="27" y="43" width="14" height="14" rx="3.5"></rect>
        <rect x="43" y="43" width="14" height="14" rx="3.5" opacity="0.55"></rect>
        <rect x="59" y="43" width="14" height="14" rx="3.5"></rect>
        <rect x="27" y="59" width="14" height="14" rx="3.5" opacity="0.55"></rect>
        <rect x="43" y="59" width="14" height="14" rx="3.5"></rect>
        <rect x="59" y="59" width="14" height="14" rx="3.5"></rect>
      </g>
    </svg>
  )
}

export default Logo
