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
import { Loader2, ShieldAlert } from 'lucide-react'
import { useState } from 'react'
import { useSelector } from 'react-redux'
import { useLocation, useNavigate } from 'react-router-dom'

const DRIVER_FRAUD_TYPES = [
  { value: 'fake_load', label: 'Fake or non-existent load posting' },
  { value: 'no_payment', label: 'Refused to pay after delivery' },
  { value: 'bait_switch', label: 'Bait-and-switch on load details' },
  { value: 'identity', label: 'Identity or company impersonation' },
  { value: 'other', label: 'Other fraudulent activity' },
]

const COMPANY_FRAUD_TYPES = [
  { value: 'fake_credentials', label: 'Fake or forged credentials' },
  { value: 'cargo_theft', label: 'Cargo theft' },
  { value: 'identity', label: 'Identity impersonation' },
  { value: 'billing', label: 'Fraudulent billing or claims' },
  { value: 'other', label: 'Other fraudulent activity' },
]

export default function ReportFraud() {
  const role = useSelector(selectRole)
  const isCompany = role === 'company'
  const navigate = useNavigate()
  const location = useLocation()
  const userId = useSelector(selectMongoId)
  const fraudTypes = isCompany ? COMPANY_FRAUD_TYPES : DRIVER_FRAUD_TYPES

  const prefilledName = (location.state as { entityName?: string } | null)?.entityName ?? ''

  const [name, setName] = useState(prefilledName)
  const [fraudType, setFraudType] = useState('')
  const [description, setDescription] = useState('')
  const [createReport, { isLoading: isSubmitting }] = useCreateReportMutation()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !fraudType || !description.trim() || !userId) return
    try {
      await createReport({
        reporterId: userId,
        type: 'fraud',
        targetType: isCompany ? 'driver' : 'company',
        targetName: name.trim(),
        category: fraudTypes.find((t) => t.value === fraudType)?.label ?? fraudType,
        description: description.trim(),
      }).unwrap()
      navigate(RoutePath.Report)
    } catch {
      // error toast handled by the mutation
    }
  }

  return (
    <PageShell
      title={`Report a ${isCompany ? 'Driver' : 'Company'} for Fraud`}
      subtitle="Reports are reviewed by our trust & safety team. False reports may result in account suspension."
    >
      <Row stackAt="lg">
        <Col size={10}>
          <DynamicCard title="Report Details">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="flex items-start gap-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3">
                <ShieldAlert className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 dark:text-red-400">
                  Only submit a report if you have direct evidence of fraudulent activity. Frivolous
                  reports are taken seriously.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="name">{isCompany ? 'Driver' : 'Company'} name</Label>
                <Input
                  id="name"
                  placeholder={`Enter ${isCompany ? 'driver' : 'company'} name...`}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="fraud-type">Type of fraud</Label>
                <Select value={fraudType} onValueChange={setFraudType} required>
                  <SelectTrigger id="fraud-type" className="w-full">
                    <SelectValue placeholder="Select fraud type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {fraudTypes.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe what happened in detail. Include dates, load IDs, or any other relevant information..."
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
                  variant="destructive"
                  className="bg-red-500 hover:bg-red-600 text-white"
                  disabled={!name.trim() || !fraudType || !description.trim() || isSubmitting}
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
