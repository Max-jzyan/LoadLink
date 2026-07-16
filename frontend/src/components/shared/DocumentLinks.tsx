import { useMemo } from 'react'
import { useGetAcceptedBidQuery } from '@/services/loadApi/loadSlice'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

interface DocumentLinksProps {
  loadId: string
}

interface Document {
  label: string
  url: string | null
  icon?: React.ReactNode
}

export default function DocumentLinks({ loadId }: DocumentLinksProps) {
  const { data: acceptedBid } = useGetAcceptedBidQuery(loadId, {
    // Only fetch when component is mounted - DrawerShell handles mount/unmount
    skip: !loadId,
  })

  const documents = useMemo<Document[]>(() => {
    const docs: Document[] = []

    // Rate Confirmation
    if (acceptedBid?.rateConfirmationUrl) {
      docs.push({
        label: 'Rate Confirmation',
        url: acceptedBid.rateConfirmationUrl,
        icon: <Download className="h-3.5 w-3.5" />,
      })
    }

    // Future document types can be added here as the backend provides them
    // e.g., Bill of Lading, Proof of Delivery, etc.
    // if (acceptedBid?.billOfLadingUrl) {
    //   docs.push({ label: 'Bill of Lading', url: acceptedBid.billOfLadingUrl })
    // }

    return docs
  }, [acceptedBid])

  if (documents.length === 0) {
    return <span className="text-sm text-muted-foreground">No documents available</span>
  }

  return (
    <div className="flex flex-col gap-2">
      {documents.map((doc) => (
        <a
          key={doc.label}
          href={doc.url!}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex"
        >
          <Button size="sm" variant="outline" className="gap-1.5 h-8">
            {doc.icon}
            {doc.label}
          </Button>
        </a>
      ))}
    </div>
  )
}
