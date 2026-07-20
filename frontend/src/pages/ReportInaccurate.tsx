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
import {
  DRIVER_INACCURACY_TYPES,
  LOAD_INACCURACY_TYPES,
} from '@/types/fraudTypes'
import { RoutePath } from '@/config/routes'
import { selectMongoId, selectRole } from '@/services/authSlice'
import {
  useCreateReportMutation,
  useGetReportableLoadsQuery,
  useGetReportCollaboratorsQuery,
} from '@/services/reportApi/reportSlice'
import type { ReportableLoad } from '@/services/reportApi/reportEnum'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { useLocation, useNavigate } from 'react-router-dom'

const loadLabel = (load: ReportableLoad) =>
  `Load #${load._id.slice(-6).toUpperCase()} — ${load.originAddress} → ${load.destinationAddress}`

export default function ReportInaccurate() {
  const role = useSelector(selectRole)
  const isCompany = role === 'company'
  const navigate = useNavigate()
  const location = useLocation()
  const userId = useSelector(selectMongoId)
  const inaccuracyTypes = isCompany ? DRIVER_INACCURACY_TYPES : LOAD_INACCURACY_TYPES

  const subject = isCompany ? 'driver' : 'load'

  const [inaccuracyType, setInaccuracyType] = useState('')
  const [description, setDescription] = useState('')
  const [createReport, { isLoading: isSubmitting, isSuccess, isError, error }] = useCreateReportMutation()

  // Company reports a driver — picked from drivers they've actually
  // collaborated with, the same list (and combobox) the fraud report page uses
  const prefilledEmail =
    (location.state as { entityEmail?: string } | null)?.entityEmail ?? ''
  const [driverEmail, setDriverEmail] = useState(prefilledEmail)
  const [driverEmailOpen, setDriverEmailOpen] = useState(false)
  const [driverEmailError, setDriverEmailError] = useState<string | null>(null)

  const { data: collaborators = [] } = useGetReportCollaboratorsQuery(undefined, {
    skip: !isCompany || !driverEmailOpen,
  })
  const filteredCollaborators = collaborators.filter((u) =>
    u.email.toLowerCase().includes(driverEmail.trim().toLowerCase())
  )

  // Driver reports a load — picked from loads they've actually bid on or
  // hauled, the same list the backend validates against
  const [loadQuery, setLoadQuery] = useState('')
  const [selectedLoadId, setSelectedLoadId] = useState<string | null>(null)
  const [loadPickerOpen, setLoadPickerOpen] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const { data: reportableLoads = [] } = useGetReportableLoadsQuery(undefined, {
    skip: isCompany || !loadPickerOpen,
  })
  const selectedLoad = reportableLoads.find((l) => l._id === selectedLoadId)
  // While the input still shows the selected load's own label (i.e. the user
  // hasn't typed anything since picking it), show the full list rather than
  // narrowing to just the one selected item
  const filteredLoads =
    selectedLoad && loadQuery === loadLabel(selectedLoad)
      ? reportableLoads
      : reportableLoads.filter((load) =>
          `${loadLabel(load)} ${load.commodity}`.toLowerCase().includes(loadQuery.trim().toLowerCase())
        )

  const isFormComplete = isCompany
    ? !!driverEmail.trim() && !!inaccuracyType && !!description.trim()
    : !!selectedLoadId && !!inaccuracyType && !!description.trim()

  useEffect(() => {
    if (isSuccess) {
      navigate(RoutePath.Report)
    }
  }, [isSuccess, navigate])

  useEffect(() => {
    if (isError && error) {
      const err = error as { status?: number; data?: { message?: string } }
      if (err.status === 404 || err.status === 403) {
        if (isCompany) {
          setDriverEmailError(err.data?.message ?? 'No driver you have worked with matches that email')
        } else {
          setLoadError(err.data?.message ?? 'That load could not be found')
        }
      }
    }
  }, [isError, error, isCompany])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isFormComplete || !userId) return
    if (!isCompany && !selectedLoadId) {
      setLoadError('Select a load from the list')
      return
    }
    setDriverEmailError(null)
    setLoadError(null)
    createReport({
      reporterId: userId,
      type: 'inaccurate',
      targetType: isCompany ? 'driver' : 'company',
      ...(isCompany ? { targetEmail: driverEmail.trim() } : { targetName: selectedLoadId! }),
      category: inaccuracyTypes.find((t) => t.value === inaccuracyType)?.label ?? inaccuracyType,
      description: description.trim(),
    })
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

              {isCompany ? (
                <div className="space-y-1.5">
                  <Label htmlFor="driver-email">Driver email</Label>
                  <Combobox
                    open={driverEmailOpen}
                    onOpenChange={setDriverEmailOpen}
                    inputValue={driverEmail}
                    onInputValueChange={(val, details) => {
                      // Only treat genuine typing as an edit — Base UI also
                      // fires this on selection and on popup close
                      if (details.reason === 'input-change') {
                        setDriverEmail(val)
                        setDriverEmailError(null)
                      }
                    }}
                    items={filteredCollaborators.map((u) => ({
                      value: u.email,
                      label: u.email,
                    }))}
                    onValueChange={(val) => {
                      if (val) {
                        setDriverEmail(val as string)
                        setDriverEmailOpen(false)
                        setDriverEmailError(null)
                      }
                    }}
                  >
                    <ComboboxInput
                      id="driver-email"
                      placeholder="Search a driver you've worked with..."
                      onFocus={() => setDriverEmailOpen(true)}
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
                            Only drivers you've worked with can be reported.
                          </div>
                        )}
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                  {driverEmailError && (
                    <p className="text-xs text-destructive bg-destructive/10 rounded px-2 py-1">
                      {driverEmailError}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label htmlFor="load">Load</Label>
                  <Combobox
                    open={loadPickerOpen}
                    onOpenChange={setLoadPickerOpen}
                    inputValue={loadQuery}
                    onInputValueChange={(val, details) => {
                      // Only treat genuine typing as an edit. Base UI also fires
                      // this on selection (reason 'item-press', restringifying the
                      // raw item value since it doesn't know our friendly label)
                      // and on popup close ('none'/'input-clear') — honoring those
                      // would overwrite the label we set in onValueChange and wipe
                      // out the just-made selection.
                      if (details.reason === 'input-change') {
                        setLoadQuery(val)
                        setSelectedLoadId(null)
                        setLoadError(null)
                      }
                    }}
                    items={filteredLoads.map((load) => ({
                      value: load._id,
                      label: loadLabel(load),
                    }))}
                    onValueChange={(val) => {
                      const load = reportableLoads.find((l) => l._id === val)
                      if (!load) return
                      setSelectedLoadId(load._id)
                      setLoadQuery(loadLabel(load))
                      setLoadPickerOpen(false)
                      setLoadError(null)
                    }}
                  >
                    <ComboboxInput
                      id="load"
                      placeholder="Search a load you've bid on or hauled..."
                      onFocus={() => setLoadPickerOpen(true)}
                      required
                    />
                    <ComboboxContent>
                      <ComboboxList>
                        {filteredLoads.map((load) => (
                          <ComboboxItem key={load._id} value={load._id}>
                            <div className="flex flex-col">
                              <span>{loadLabel(load)}</span>
                              <span className="text-xs text-muted-foreground">
                                {load.commodity} · {load.status}
                              </span>
                            </div>
                          </ComboboxItem>
                        ))}
                        {filteredLoads.length === 0 && (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">
                            Only loads you've bid on or hauled can be reported.
                          </div>
                        )}
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                  {loadError && (
                    <p className="text-xs text-destructive bg-destructive/10 rounded px-2 py-1">
                      {loadError}
                    </p>
                  )}
                </div>
              )}

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
                <Button type="submit" disabled={!isFormComplete || isSubmitting}>
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
