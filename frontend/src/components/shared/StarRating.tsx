import { Star } from 'lucide-react'

interface StarRatingProps {
  value: number
  max?: number // defaults to 5
}

function getStarClassName(filled: boolean, half: boolean): string {
  if (filled) {
    return 'fill-amber-400 text-amber-400'
  }
  if (half) {
    return 'fill-amber-400/50 text-amber-400'
  }
  return 'fill-muted text-muted-foreground/30'
}

export default function StarRating({ value, max = 5 }: StarRatingProps) {
  const rounded = Math.round(value * 2) / 2 // round to nearest 0.5
  const stars = []

  for (let i = 1; i <= max; i++) {
    const filled = i <= rounded
    const half = !filled && i - 0.5 === rounded

    stars.push(<Star key={i} className={`h-3.5 w-3.5 ${getStarClassName(filled, half)}`} />)
  }

  return <div className="flex items-center gap-0.5">{stars}</div>
}
