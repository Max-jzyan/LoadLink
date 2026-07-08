import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { selectRole } from '@/services/authSlice'

interface DriverNameLinkProps {
  name: string
  driverId: string
  className?: string
}

const LINK_CLASS = 'hover:underline'

export default function DriverNameLink({ name, driverId, className }: DriverNameLinkProps) {
  const role = useSelector(selectRole)
  const label = name || `#${driverId.slice(-6).toUpperCase()}`

  if (role !== 'company') {
    return <span className={className}>{label}</span>
  }

  return (
    <Link to={`/driver/profile/${driverId}`} className={`${LINK_CLASS} ${className ?? ''}`}>
      {label}
    </Link>
  )
}
