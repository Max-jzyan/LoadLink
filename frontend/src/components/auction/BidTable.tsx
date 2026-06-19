import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { BidStatusBadge } from '@/components/auction/statusBadge'
import { timeAgo } from '@/lib/format'
import type { PopulatedBid } from '@/services/auctionApi/auctionEnum'

interface BidTableProps {
  bids: PopulatedBid[]
  currentDriverId?: string
}

function getDriverLabel(bid: PopulatedBid): string {
  if (typeof bid.driverId === 'object' && bid.driverId?.name) {
    return bid.driverId.name
  }
  const rawId =
    typeof bid.driverId === 'string'
      ? bid.driverId
      : ((bid.driverId as { _id?: string })?._id ?? '')
  return `#${rawId.slice(-6).toUpperCase()}`
}

export default function BidTable({ bids, currentDriverId }: BidTableProps) {
  if (bids.length === 0) {
    return (
      <p className="text-muted-foreground text-sm py-4 text-center">
        No bids yet. Be the first to bid!
      </p>
    )
  }

  const isMyBid = (bid: PopulatedBid): boolean => {
    if (!currentDriverId) return false
    const bidDriverId = typeof bid.driverId === 'string' ? bid.driverId : bid.driverId?._id
    return bidDriverId === currentDriverId
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Driver</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Time</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {bids.map((bid) => {
          const isWinner = bid.status === 'accepted'
          const isMine = isMyBid(bid)

          let rowClassName = ''
          if (isWinner) {
            rowClassName = 'bg-green-50 dark:bg-green-950/40'
          } else if (isMine) {
            rowClassName = 'bg-blue-50 dark:bg-blue-950/40'
          }

          return (
            <TableRow key={bid._id} className={rowClassName}>
              <TableCell className="font-medium">{getDriverLabel(bid)}</TableCell>
              <TableCell>${bid.amount.toLocaleString()}</TableCell>
              <TableCell>
                <BidStatusBadge status={bid.status} />
              </TableCell>
              <TableCell className="text-muted-foreground">{timeAgo(bid.createdAt)}</TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
