import Col from '@/components/layout/Col'
import DynamicCard from '@/components/layout/DynamicCard'
import PageShell from '@/components/layout/PageShell'
import Row from '@/components/layout/Row'
import ReportInfoPanel from '@/components/report/ReportInfoPanel'
import { Button } from '@/components/ui/button'
import {
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox'
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
import { selectMongoId, selectRole } from '@/services/authSlice'
import {
  useCreateReportMutation,
  useGetReportCollaboratorsQuery,
} from '@/services/reportApi/reportSlice'
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

  // Prefilled when arriving from a blocklist row's "Report" button
  const prefilledEmail = (location.state as { entityEmail?: string } | null)?.entityEmail ?? ''

  const [email, setEmail] = useState(prefilledEmail)
  const [emailOpen, setEmailOpen] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [fraudType, setFraudType] = useState('')
  const [description, setDescription] = useState('')
  const [createReport, { isLoading: isSubmitting }] = useCreateReportMutation()

  // Suggestions are the users the reporter actually worked with — the same
  // list the backend validates fraud-report targets against
  const { data: collaborators = [] } = useGetReportCollaboratorsQuery(undefined, {
    skip: !emailOpen,
  })
  const filteredCollaborators = collaborators.filter((u) =>
    u.email.toLowerCase().includes(email.trim().toLowerCase())
  )

  const handleEmailChange = (value: string) => {
    setEmail(value)
    setEmailError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !fraudType || !description.trim() || !userId) return
    try {
      await createReport({
        reporterId: userId,
        type: 'fraud',
        targetType: isCompany ? 'driver' : 'company',
        targetEmail: email.trim(),
        category: fraudTypes.find((t) => t.value === fraudType)?.label ?? fraudType,
        description: description.trim(),
      }).unwrap()
      navigate(RoutePath.Report)
    } catch (err) {
      // toast handled by the mutation; surface target-validation errors inline
      const { status, data } = (err ?? {}) as { status?: number; data?: { message?: string } }
      if (status === 404 || status === 403) {
        setEmailError(
          data?.message ??
            `No ${isCompany ? 'driver' : 'company'} you have worked with matches that email`
        )
      }
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
                <Label htmlFor="email">{isCompany ? 'Driver' : 'Company'} email</Label>
                <Combobox
                  open={emailOpen}
                  onOpenChange={setEmailOpen}
                  inputValue={email}
                  onInputValueChange={(val, details) => {
                    // Only treat genuine typing as an edit — Base UI also
                    // fires this on selection and on popup close
                    if (details.reason === 'input-change') {
                      handleEmailChange(val)
                    }
                  }}
                  items={filteredCollaborators.map((u) => ({
                    value: u.email,
                    label: u.email,
                  }))}
                  onValueChange={(val) => {
                    if (val) {
                      handleEmailChange(val as string)
                      setEmailOpen(false)
                    }
                  }}
                >
                  <ComboboxInput
                    id="email"
                    placeholder={`Search a ${isCompany ? 'driver' : 'company'} you've worked with...`}
                    onFocus={() => setEmailOpen(true)}
                    required
                  />
                  <ComboboxContent>
                    <ComboboxList>
                      {filteredCollaborators.map((u) => (
                        <ComboboxItem key={u._id} value={u.email}>
                          <div className="flex flex-col">
                            <span>{u.name}</span>
                            <span className="text-xs text-muted-foreground">{u.email}</span>
                          </div>
                        </ComboboxItem>
                      ))}
                      {filteredCollaborators.length === 0 && (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          Only {isCompany ? 'drivers' : 'companies'} you've worked with can be
                          reported.
                        </div>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
                {emailError && (
                  <p className="text-xs text-destructive bg-destructive/10 rounded px-2 py-1">
                    {emailError}
                  </p>
                )}
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
                  disabled={!email.trim() || !fraudType || !description.trim() || isSubmitting}
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
