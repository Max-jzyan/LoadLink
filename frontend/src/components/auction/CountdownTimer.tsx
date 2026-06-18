import { Timer } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useCountdown } from './useCountdown'

export default function CountdownTimer({ expiresAt }: { expiresAt?: string }) {
  const { expired, label } = useCountdown(expiresAt)

  return (
    <Badge variant="outline" className="gap-1 font-normal">
      <Timer className="h-3.5 w-3.5" />
      {expired ? 'Closed' : `Closes in ${label}`}
    </Badge>
  )
}
