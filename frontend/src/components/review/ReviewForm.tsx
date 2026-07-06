import { useState } from 'react'
import { Star } from 'lucide-react'
import type { Load } from '@/services/loadApi/loadEnum'
import { categoryLabels, type RatingCategories } from '@/services/driverApi/driverEnum'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface ReviewFormProps {
  driverName: string
  loads: Load[]
  onSubmit: (data: { loadId: string; ratingCategories: RatingCategories; comment: string }) => void
  onCancel: () => void
  isSubmitting?: boolean
}

function StarInput({
  value,
  onChange,
}: {
  value: number
  onChange: (v: number) => void
}) {
  const [hovered, setHovered] = useState(0)

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= (hovered || value)
        return (
          <button
            key={star}
            type="button"
            className="transition-colors"
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => onChange(star)}
          >
            <Star
              className={`h-5 w-5 ${
                filled
                  ? 'fill-amber-400 text-amber-400'
                  : 'text-muted-foreground/30 hover:text-amber-400/50'
              }`}
            />
          </button>
        )
      })}
    </div>
  )
}

export default function ReviewForm({
  driverName,
  loads,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: ReviewFormProps) {
  const [selectedLoadId, setSelectedLoadId] = useState<string>('')
  const [ratingCategories, setRatingCategories] = useState<RatingCategories>({
    timeliness: 0,
    communication: 0,
    reliability: 0,
    professionalism: 0,
    documentationAccuracy: 0,
  })
  const [comment, setComment] = useState('')

  const updateCategory = (key: keyof RatingCategories, value: number) => {
    setRatingCategories((prev) => ({ ...prev, [key]: value }))
  }

  const allRated = Object.values(ratingCategories).every((v) => v > 0)
  const canSubmit = allRated && selectedLoadId && !isSubmitting

  const handleSubmit = () => {
    if (!canSubmit) return
    onSubmit({ loadId: selectedLoadId, ratingCategories, comment })
  }

  const formatLoadLabel = (load: Load) => {
    const date = new Date(load.dropoffTime).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: '2-digit',
    })
    return `${load.originAddress} → ${load.destinationAddress} | ${date}`
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Review Driver: {driverName}</DialogTitle>
        </DialogHeader>

        {loads.length === 0 ? (
          <DialogDescription className="rounded-md border border-dashed p-4">
            This driver currently has no loads available for review. This may be because they have not completed a load for your company yet,
            or because all completed loads have already been reviewed.
          </DialogDescription>
        ) : (
          <div>
            <label className="block text-sm font-medium mb-1">Select Load</label>
            <select
              value={selectedLoadId}
              onChange={(e) => setSelectedLoadId(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">-- Choose a load --</option>
              {loads.map((load) => (
                <option key={load._id} value={load._id}>
                  {formatLoadLabel(load)}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-4">
          {categoryLabels.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-sm font-medium">{label}</span>
              <StarInput
                value={ratingCategories[key]}
                onChange={(v) => updateCategory(key, v)}
              />
            </div>
          ))}

          <div>
            <label className="block text-sm font-medium mb-1">Comment</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience with this driver..."
              rows={4}
              maxLength={2000}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="mt-1 text-xs text-muted-foreground text-right">
              {comment.length}/2000
            </p>
          </div>
        </div>

        <DialogFooter className="border-0 bg-transparent -mx-0 -mb-0 p-0">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Review'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}