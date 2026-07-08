import Col from '@/components/layout/Col'
import DynamicCard from '@/components/layout/DynamicCard'
import PageShell from '@/components/layout/PageShell'
import Row from '@/components/layout/Row'
import ReportInfoPanel from '@/components/report/ReportInfoPanel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { RoutePath } from '@/config/routes'
import { selectRole } from '@/services/authSlice'
import { selectMongoId } from '@/services/authSlice'
import { useCreateReportMutation } from '@/services/reportApi/reportSlice'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useSelector } from 'react-redux'
import { useLocation, useNavigate } from 'react-router-dom'

const LOAD_INACCURACY_TYPES = [
  { value: 'weight', label: 'Incorrect weight or dimensions' },
  { value: 'pickup_delivery', label: 'Wrong pickup or delivery location' },
  { value: 'equipment', label: 'Wrong equipment type required' },
  { value: 'hazmat', label: 'Undisclosed hazmat or special handling' },
  { value: 'dates', label: 'Incorrect pickup or delivery dates' },
  { value: 'other', label: 'Other inaccuracy' },
]

const DRIVER_INACCURACY_TYPES = [
  { value: 'license', label: 'Incorrect license or certification info' },
  { value: 'equipment', label: 'Wrong equipment or truck type listed' },
  { value: 'location', label: 'Inaccurate home location or service area' },
  { value: 'availability', label: 'Incorrect availability or capacity' },
  { value: 'other', label: 'Other inaccuracy' },
]

export default function ReportInaccurate() {
  const role = useSelector(selectRole)
  const isCompany = role === 'company'
  const navigate = useNavigate()
  const location = useLocation()
  const userId = useSelector(selectMongoId)
  const inaccuracyTypes = isCompany ? DRIVER_INACCURACY_TYPES : LOAD_INACCURACY_TYPES

  const subject = isCompany ? 'driver' : 'load'
  const idLabel = isCompany ? 'Driver name' : 'Load ID'
  const idPlaceholder = isCompany ? 'Enter driver name...' : 'e.g. LOAD-1234'

  // Prefilled when arriving from a blocklist row's "Report" button
  const prefilledName = (location.state as { entityName?: string } | null)?.entityName ?? ''

  const [entityId, setEntityId] = useState(prefilledName)
  const [inaccuracyType, setInaccuracyType] = useState('')
  const [description, setDescription] = useState('')
  const [createReport, { isLoading: isSubmitting }] = useCreateReportMutation()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!entityId.trim() || !inaccuracyType || !description.trim() || !userId) return
    try {
      await createReport({
        reporterId: userId,
        type: 'inaccurate',
        targetType: isCompany ? 'driver' : 'company',
        targetName: entityId.trim(),
        category: inaccuracyTypes.find((t) => t.value === inaccuracyType)?.label ?? inaccuracyType,
        description: description.trim(),
      }).unwrap()
      navigate(RoutePath.Report)
    } catch {
      // error toast handled by the mutation
    }
  }

  return (
    <PageShell
      title={`Report Inaccurate ${isCompany ? 'Driver' : 'Load'} Details`}
      subtitle={`Help us maintain accurate ${subject} information on LoadLink.`}
    >
      <Row stackAt="lg">
        <Col size={10}>
          <DynamicCard title="Report Details">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="flex items-start gap-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 px-4 py-3">
                <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                  Please only report details you know to be factually incorrect. Providing accurate
                  feedback helps all users on the platform.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="entity-id">{idLabel}</Label>
                <Input
                  id="entity-id"
                  placeholder={idPlaceholder}
                  value={entityId}
                  onChange={(e) => setEntityId(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="inaccuracy-type">What is inaccurate?</Label>
                <Select value={inaccuracyType} onValueChange={setInaccuracyType} required>
                  <SelectTrigger id="inaccuracy-type" className="w-full">
                    <SelectValue placeholder="Select inaccuracy type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {inaccuracyTypes.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description">What is the correct information?</Label>
                <Textarea
                  id="description"
                  placeholder={`Describe what's wrong and what the correct ${subject} details should be...`}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-32 resize-none"
                  required
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => navigate(RoutePath.Report)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    !entityId.trim() || !inaccuracyType || !description.trim() || isSubmitting
                  }
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Submit Report
                </Button>
              </div>
            </form>
          </DynamicCard>
        </Col>
        <Col size={6}>
          <ReportInfoPanel />
        </Col>
      </Row>
    </PageShell>
  )
}
