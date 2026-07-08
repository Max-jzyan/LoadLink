import DynamicCard from '@/components/layout/DynamicCard'
import { Button } from '@/components/ui/button'
import { RoutePath } from '@/config/routes'
import { CheckCircle2, ClipboardList, Search, Send } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const STEPS = [
  {
    icon: Send,
    title: 'Submitted',
    description: 'Your report is logged and appears in My Reports as "Under Review".',
  },
  {
    icon: Search,
    title: 'Review',
    description:
      'Our trust & safety team investigates the claim and may reach out for more details.',
  },
  {
    icon: CheckCircle2,
    title: 'Resolution',
    description:
      'Once reviewed, the status updates to Resolved or Dismissed. Serious violations can lead to account suspension.',
  },
]

/** Right-hand sidebar for the report forms — explains the review process. */
export default function ReportInfoPanel() {
  const navigate = useNavigate()

  return (
    <DynamicCard title="What happens next" description="Every report is reviewed by a human.">
      <div className="space-y-5">
        <ol className="space-y-4">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                <step.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {i + 1}. {step.title}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  {step.description}
                </p>
              </div>
            </li>
          ))}
        </ol>
        <Button variant="outline" className="w-full" onClick={() => navigate(RoutePath.Report)}>
          <ClipboardList className="h-4 w-4" />
          View My Reports
        </Button>
      </div>
    </DynamicCard>
  )
}
