import { useEffect, useRef, useState } from 'react'

import EditPencilButton from '@/components/shared/EditPencilButton'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const MAX_SIZE_BYTES = 5 * 1024 * 1024

interface AvatarUploadFieldProps {
  file: File | null
  onFileChange: (file: File) => void
  existingUrl?: string
  fallbackText: string
  onError?: (message: string) => void
  uploading?: boolean
  disabled?: boolean
}

export default function AvatarUploadField({
  file,
  onFileChange,
  existingUrl,
  fallbackText,
  onError,
  uploading = false,
  disabled = false,
}: AvatarUploadFieldProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [objectUrl, setObjectUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!file) {
      setObjectUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setObjectUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const previewUrl = objectUrl ?? existingUrl

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    e.target.value = ''
    if (!selected) return

    if (!ALLOWED_TYPES.includes(selected.type)) {
      onError?.('Please select a PNG, JPEG, or WEBP image')
      return
    }
    if (selected.size > MAX_SIZE_BYTES) {
      onError?.('Image must be less than 5MB')
      return
    }

    onFileChange(selected)
  }

  return (
    <div className="relative inline-block">
      <div
        role="button"
        tabIndex={disabled || uploading ? -1 : 0}
        aria-label="Upload profile picture"
        onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !disabled && !uploading) {
            e.preventDefault()
            fileInputRef.current?.click()
          }
        }}
        className={cn('rounded-full', !disabled && !uploading && 'cursor-pointer')}
      >
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Profile preview"
            className="h-24 w-24 rounded-full object-cover ring-2 ring-muted"
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 text-3xl font-bold text-primary ring-2 ring-muted">
            {fallbackText}
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/70">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
      </div>
      <div className="absolute -bottom-1 -right-1">
        <EditPencilButton
          onClick={() => fileInputRef.current?.click()}
          ariaLabel="Upload profile picture"
          title="Upload profile picture"
          className="bg-background border border-border shadow-sm hover:bg-muted"
        />
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled || uploading}
      />
    </div>
  )
}
