import { useRef } from 'react'
import { FileText, Upload, X } from 'lucide-react'

import { Button } from '@/components/ui/button'

interface FileUploadFieldProps {
  files: File[]
  onChange: (files: File[]) => void
  multiple?: boolean
  accept?: string
  maxSizeMB?: number
  disabled?: boolean
  buttonLabel?: string
  onError?: (message: string) => void
}

const DEFAULT_ACCEPT = 'application/pdf,image/*'

export default function FileUploadField({
  files,
  onChange,
  multiple = false,
  accept = DEFAULT_ACCEPT,
  maxSizeMB = 10,
  disabled = false,
  buttonLabel = 'Choose file',
  onError,
}: FileUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (selected.length === 0) return

    const oversized = selected.find((file) => file.size > maxSizeMB * 1024 * 1024)
    if (oversized) {
      onError?.(`"${oversized.name}" exceeds the ${maxSizeMB}MB limit.`)
      return
    }

    if (multiple) {
      const existingKeys = new Set(files.map((f) => `${f.name}-${f.size}`))
      const merged = [...files, ...selected.filter((f) => !existingKeys.has(`${f.name}-${f.size}`))]
      onChange(merged)
    } else {
      onChange([selected[0]])
    }
  }

  const removeFile = (index: number) => {
    onChange(files.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled}
      />
      <Button
        type="button"
        variant="outline"
        className="cursor-pointer"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="mr-2 h-4 w-4" />
        {buttonLabel}
      </Button>

      {files.length > 0 && (
        <ul className="space-y-1.5">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${file.size}-${index}`}
              className="flex items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm"
            >
              <span className="flex min-w-0 items-center gap-2">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{file.name}</span>
              </span>
              <button
                type="button"
                onClick={() => removeFile(index)}
                disabled={disabled}
                className="shrink-0 text-muted-foreground hover:text-foreground cursor-pointer"
                aria-label={`Remove ${file.name}`}
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
