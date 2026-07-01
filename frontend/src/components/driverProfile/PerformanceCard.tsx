import DynamicCard from '@/components/layout/DynamicCard'
import type { DriverProfile } from '@/services/driverApi/driverEnum'
import { categoryLabels } from '@/services/driverApi/driverEnum'
import { Star, Truck, Award } from 'lucide-react'

interface PerformanceCardProps {
  driver: DriverProfile
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

function StarRating({ value, max = 5 }: { value: number; max?: number }) {
  const stars = []
  const rounded = Math.round(value * 2) / 2 // round to nearest 0.5
  for (let i = 1; i <= max; i++) {
    const filled = i <= rounded
    const half = !filled && i - 0.5 === rounded
    stars.push(
      <Star
        key={i}
        className={`h-3.5 w-3.5 ${getStarClassName(filled, half)}`}
      />
    )
  }
  return <div className="flex items-center gap-0.5">{stars}</div>
}

export default function PerformanceCard({ driver }: PerformanceCardProps) {
  const { ratingSummary } = driver
  const categories = ratingSummary.categories

  return (
    <DynamicCard title="Performance">
      <div className="space-y-3">
        {/* Overall Rating */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-medium">Overall Rating</span>
          </div>
          <div className="flex items-center gap-2">
            <StarRating value={ratingSummary.average} />
            <span className="text-sm font-semibold">
              {ratingSummary.average.toFixed(1)}
            </span>
          </div>
        </div>

        {/* Total Reviews */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Total Reviews</span>
          <span className="font-medium">{ratingSummary.totalReviews}</span>
        </div>

        {/* Completed Loads */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Truck className="h-4 w-4" />
            <span>Completed Loads</span>
          </div>
          <span className="font-medium">{driver.completedLoadsCount}</span>
        </div>

        {/* Category Breakdown */}
        {ratingSummary.totalReviews > 0 && (
          <div className="border-t pt-3 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Category Breakdown</p>
            {categoryLabels.map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{label}</span>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-20 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-400"
                      style={{ width: `${(categories[key] / 5) * 100}%` }}
                    />
                  </div>
                  <span className="w-6 text-right font-medium">
                    {categories[key].toFixed(1)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No reviews yet */}
        {ratingSummary.totalReviews === 0 && (
          <p className="text-xs text-muted-foreground italic">
            No reviews yet. Complete loads to build your rating.
          </p>
        )}
      </div>
    </DynamicCard>
  )
}