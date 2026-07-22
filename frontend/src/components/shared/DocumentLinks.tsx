import { useMemo } from 'react'
import { useGetAcceptedBidQuery, useGetBolQuery } from '@/services/loadApi/loadSlice'
import { Button } from '@/components/ui/button'
import { Download, FileText } from 'lucide-react'

interface DocumentLinksProps {
  loadId: string
  /** Pass true when the load is booked/in-transit/completed so the BOL query fires. */
  isBooked?: boolean
}

interface Document {
  label: string
  url: string
  icon?: React.ReactNode
}

export default function DocumentLinks({ loadId, isBooked = true }: DocumentLinksProps) {
  const { data: acceptedBid } = useGetAcceptedBidQuery(loadId, { skip: !loadId })

  // BOL query fires for any booked/assigned load (also lazily generates on first fetch)
  const { data: bolData } = useGetBolQuery(loadId, { skip: !loadId || !isBooked })

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

    // Bill of Lading (blank — driver prints and brings to pickup)
    if (bolData?.bolUrl) {
      docs.push({
        label: 'Bill of Lading',
        url: bolData.bolUrl,
        icon: <FileText className="h-3.5 w-3.5" />,
      })
    }

    // Signed Bill of Lading (submitted by driver after delivery)
    if (bolData?.signedBolUrl) {
      docs.push({
        label: 'Signed BOL',
        url: bolData.signedBolUrl,
        icon: <FileText className="h-3.5 w-3.5" />,
      })
    }

    return docs
  }, [acceptedBid, bolData])

  if (documents.length === 0) {
    return <span className="text-sm text-muted-foreground">No documents available</span>
  }

  return (
    <div className="flex flex-wrap gap-2">
      {documents.map((doc) => (
        <a
          key={doc.label}
          href={doc.url}
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
