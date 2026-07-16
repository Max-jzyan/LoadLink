import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { selectRole } from '@/services/authSlice'

interface CompanyNameLinkProps {
  name: string
  companyId: string
  className?: string
}

const LINK_CLASS = 'hover:underline'

export default function CompanyNameLink({ name, companyId, className }: CompanyNameLinkProps) {
  const role = useSelector(selectRole)
  const label = name || `#${companyId.slice(-6).toUpperCase()}`

  if (role !== 'driver') {
    return <span className={className}>{label}</span>
  }

  return (
    <Link to={`/company/${companyId}`} className={`${LINK_CLASS} ${className ?? ''}`}>
      {label}
    </Link>
  )
}
