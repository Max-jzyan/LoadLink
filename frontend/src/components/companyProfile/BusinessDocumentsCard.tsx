import DynamicCard from '@/components/layout/DynamicCard'
import type { BusinessDocument } from '@/services/companyApi/companyEnum'
import { FileText } from 'lucide-react'
import EditPencilButton from '@/components/shared/EditPencilButton'

interface BusinessDocumentsCardProps {
  documents: BusinessDocument[]
  onEdit?: () => void
}

export default function BusinessDocumentsCard({ documents, onEdit }: BusinessDocumentsCardProps) {
  return (
    <DynamicCard
      title="Business Documents"
      action={
        onEdit && (
          <EditPencilButton onClick={onEdit} ariaLabel="Manage documents" title="Manage documents" />
        )
      }
    >
      {documents.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">
          No business documents uploaded yet.
        </p>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.key}
              className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <a
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate flex-1 hover:underline text-primary"
              >
                {doc.name}
              </a>
              <span className="text-xs text-muted-foreground shrink-0">
                {new Date(doc.uploadedAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
          ))}
        </div>
      )}
    </DynamicCard>
  )
}