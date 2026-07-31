import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { format } from 'date-fns'
import type { DateRange } from 'react-day-picker'

import DrawerShell from '@/components/layout/DrawerShell'
import type { CertificationDocument, DriverProfile } from '@/services/driverApi/driverEnum'
import { FileText, Trash2, AlertTriangle, Clock } from 'lucide-react'

import AvatarUploadField from '@/components/shared/AvatarUploadField'
import { DatePickerWithRange } from '@/components/shared/DatePickerWithRange'
import FileUploadField from '@/components/shared/FileUploadField'
import { auth } from '@/lib/firebase'
import { useRequiredMongoId } from '@/hooks/useAuth'
import {
  useRemoveCertificationDocumentMutation,
  useUploadDriverDocumentsMutation,
} from '@/services/driverApi/driverSlice'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export interface DriverInfoFormValues {
  name: string
  professionalTitle: string
  profilePictureUrl: string
  certificationDocuments: CertificationDocument[]
  mcNumber?: string
  dotNumber?: string
  nscCvorNumber?: string
}

interface DriverInfoFormFields {
  name: string
  professionalTitle: string
  mcNumber: string
  dotNumber: string
  nscCvorNumber: string
}

interface DriverInfoDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  driver: DriverProfile
  onSubmit: (values: DriverInfoFormValues) => void
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs text-destructive mt-1">{message}</p>
}

export default function DriverInfoDrawer({
  open,
  onOpenChange,
  driver,
  onSubmit,
}: DriverInfoDrawerProps) {
  const formId = 'driver-info-form'
  const driverId = useRequiredMongoId()

  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null)
  const [pictureError, setPictureError] = useState<string | null>(null)
  const [certificationFiles, setCertificationFiles] = useState<File[]>([])
  const [certExpiries, setCertExpiries] = useState<Record<number, DateRange | undefined>>({})
  const [certError, setCertError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [docToDelete, setDocToDelete] = useState<CertificationDocument | null>(null)
  const [removeCertDoc, { isLoading: isRemoving }] = useRemoveCertificationDocumentMutation()
  const [uploadDriverDocs, { isLoading: isUploadingDocs }] = useUploadDriverDocumentsMutation()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DriverInfoFormFields>({
    defaultValues: {
      name: '',
      professionalTitle: '',
      mcNumber: '',
      dotNumber: '',
      nscCvorNumber: '',
    },
  })

  useEffect(() => {
    if (open && driver) {
      reset({
        name: driver.name,
        professionalTitle: driver.professionalTitle,
        mcNumber: driver.mcNumber ?? '',
        dotNumber: driver.dotNumber ?? '',
        nscCvorNumber: driver.nscCvorNumber ?? '',
      })
    }

    if (!open) {
      reset({ name: '', professionalTitle: '', mcNumber: '', dotNumber: '', nscCvorNumber: '' })
      setProfilePictureFile(null)
      setCertificationFiles([])
      setCertExpiries({})
      setPictureError(null)
      setCertError(null)
    }
  }, [open, driver, reset])

  const onFormSubmit = async (values: DriverInfoFormFields) => {
    let profilePictureUrl: string | undefined = undefined
    let certificationDocuments: CertificationDocument[] | undefined = undefined

    if (profilePictureFile || certificationFiles.length > 0) {
      const user = auth.currentUser
      if (!user) {
        setPictureError('No authenticated user.')
        return
      }

      setUploading(true)
      setPictureError(null)

      try {
        if (profilePictureFile) {
          const result = await uploadDriverDocs({
            driverId: driverId,
            docType: 'driverDocuments',
            files: [profilePictureFile],
          })

          if ('error' in result) {
            throw new Error('upload_failed')
          }

          if (result.data && result.data.length) {
            profilePictureUrl = result.data[0].url
          }
        }

        if (certificationFiles.length > 0) {
          const result = await uploadDriverDocs({
            driverId: driverId,
            docType: 'driverDocuments',
            files: certificationFiles,
          })

          if ('error' in result) {
            throw new Error('upload_failed')
          }

          if (result.data) {
            certificationDocuments = [
              ...(driver.certificationDocuments ?? []),
              ...result.data.map((doc, i) => ({
                name: doc.name,
                url: doc.url,
                key: doc.key,
                uploadedAt: new Date().toISOString(),
                expiresAt: certExpiries[i]?.from ? certExpiries[i].from!.toISOString() : null,
              })),
            ]
          }
        }
      } catch {
        setPictureError('Failed to upload one or more files. Please try again.')
        setUploading(false)
        return
      } finally {
        setUploading(false)
      }
    }

    const body: Partial<DriverInfoFormValues> = {
      ...values,
      ...(profilePictureUrl !== undefined && { profilePictureUrl }),
      ...(certificationDocuments !== undefined && { certificationDocuments }),
      mcNumber: values.mcNumber || undefined,
      dotNumber: values.dotNumber || undefined,
      nscCvorNumber: values.nscCvorNumber || undefined,
    }

    await onSubmit(body as DriverInfoFormValues)
    setProfilePictureFile(null)
    setCertificationFiles([])
    setCertExpiries({})
  }

  const inputCls = 'bg-background border-border placeholder:text-muted-foreground/50'

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  function docStatusVariant(s: string): 'default' | 'destructive' | 'secondary' {
    if (s === 'approved') return 'default'
    if (s === 'rejected') return 'destructive'
    return 'secondary'
  }

  return (
    <>
      <DrawerShell
        open={open}
        onOpenChange={onOpenChange}
        title="Edit Personal Information"
        description="Update your name, professional title, profile picture, and certifications."
        size="md"
        drawerSubmit={{
          onSubmit: handleSubmit(onFormSubmit),
          isSubmitting: isSubmitting || uploading || isUploadingDocs,
          submitLabel: 'Save Changes',
        }}
      >
        <form id={formId} onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          {/* Profile Picture Preview */}
          <div className="flex flex-col items-center">
            <AvatarUploadField
              file={profilePictureFile}
              onFileChange={setProfilePictureFile}
              existingUrl={driver.profilePictureUrl}
              fallbackText={getInitials(driver.name)}
              onError={setPictureError}
              disabled={isSubmitting || uploading || isUploadingDocs}
            />
            <FieldDescription className="mt-2 text-center">
              Click the pencil icon to upload a profile picture
            </FieldDescription>
            <FieldError message={pictureError ?? undefined} />
          </div>

          {/* Name */}
          <Field>
            <FieldLabel>Full Name</FieldLabel>
            <Input
              className={inputCls}
              placeholder="Enter your full name"
              {...register('name', {
                required: 'Name is required',
                minLength: { value: 2, message: 'Name must be at least 2 characters' },
              })}
            />
            <FieldError message={errors.name?.message} />
          </Field>

          {/* Professional Title */}
          <Field>
            <FieldLabel>Professional Title</FieldLabel>
            <Input
              className={inputCls}
              placeholder="e.g. Long Haul Truck Driver"
              {...register('professionalTitle')}
            />
            <FieldDescription>Optional: Add a professional title or certification</FieldDescription>
          </Field>

          {/* Carrier Credentials */}
          <div className="pt-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Carrier Credentials
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              These appear on rate confirmations and allow verification against FMCSA records.
            </p>
            <div className="grid grid-cols-1 gap-3">
              <Field>
                <FieldLabel>MC # (FMCSA Motor Carrier)</FieldLabel>
                <Input
                  className={inputCls}
                  placeholder="e.g. MC-123456"
                  {...register('mcNumber')}
                />
              </Field>
              <Field>
                <FieldLabel>US DOT #</FieldLabel>
                <Input className={inputCls} placeholder="e.g. 1234567" {...register('dotNumber')} />
              </Field>
              <Field>
                <FieldLabel>NSC / CVOR # (Canada)</FieldLabel>
                <Input
                  className={inputCls}
                  placeholder="e.g. NSC-987654"
                  {...register('nscCvorNumber')}
                />
              </Field>
            </div>
          </div>

          {/* Certifications */}
          <Field>
            <FieldLabel>Certifications</FieldLabel>
            {driver.certificationDocuments && driver.certificationDocuments.length > 0 && (
              <ul className="space-y-1.5 mb-2">
                {driver.certificationDocuments.map((doc) => {
                  const status = doc.verificationStatus ?? 'pending'
                  const now = new Date()
                  const expiry = doc.expiresAt ? new Date(doc.expiresAt) : null
                  const isExpired = expiry && expiry < now
                  const isExpiringSoon =
                    expiry && !isExpired && expiry <= new Date(now.getTime() + 30 * 24 * 3600_000)
                  return (
                    <li
                      key={doc.key}
                      className="flex items-start gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm"
                    >
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <span className="truncate block">{doc.name}</span>
                        {expiry && (
                          <span
                            className={`text-xs flex items-center gap-1 mt-0.5 ${
                              isExpired
                                ? 'text-destructive'
                                : isExpiringSoon
                                  ? 'text-amber-600'
                                  : 'text-muted-foreground'
                            }`}
                          >
                            {isExpired && <AlertTriangle className="h-3 w-3" />}
                            {isExpiringSoon && <Clock className="h-3 w-3" />}
                            {isExpired
                              ? `Expired ${format(expiry, 'MMM d, yyyy')}`
                              : `Expires ${format(expiry, 'MMM d, yyyy')}`}
                          </span>
                        )}
                      </div>
                      <Badge variant={docStatusVariant(status)} className="text-xs shrink-0">
                        {status === 'approved' && 'Verified'}
                        {status === 'rejected' && 'Rejected'}
                        {status === 'pending' && 'Pending Review'}
                        {!['approved', 'rejected', 'pending'].includes(status) && 'Pending Review'}
                      </Badge>
                      <button
                        type="button"
                        onClick={() => setDocToDelete(doc)}
                        className="shrink-0 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        title="Remove document"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
            <FileUploadField
              files={certificationFiles}
              onChange={(files) => {
                setCertificationFiles(files)
                setCertExpiries((prev) => {
                  const next: Record<number, DateRange> = {}
                  files.forEach((_, i) => {
                    if (prev[i]) next[i] = prev[i]
                  })
                  return next
                })
              }}
              onError={setCertError}
              multiple
              disabled={isSubmitting || uploading || isUploadingDocs}
              buttonLabel="Upload certification"
            />
            {certificationFiles.length > 0 && (
              <ul className="space-y-2 mt-2">
                {certificationFiles.map((file, i) => (
                  <li
                    key={i}
                    className="rounded-md border border-border bg-muted/40 px-3 py-2 space-y-1.5"
                  >
                    <p className="text-xs font-medium truncate flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      {file.name}
                    </p>
                    <DatePickerWithRange
                      mode="single"
                      label="Expiry date"
                      date={certExpiries[i]}
                      onRangeChange={(range) =>
                        setCertExpiries((prev) => ({ ...prev, [i]: range }))
                      }
                    />
                  </li>
                ))}
              </ul>
            )}
            <FieldDescription>Optional: Add proof of any certifications</FieldDescription>
            <FieldError message={certError ?? undefined} />
          </Field>
        </form>
      </DrawerShell>

      {/* Confirm delete document dialog */}
      <Dialog
        open={!!docToDelete}
        onOpenChange={(v) => {
          if (!v) setDocToDelete(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove document?</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove <strong>{docToDelete?.name}</strong>? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDocToDelete(null)} disabled={isRemoving}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={isRemoving}
              onClick={async () => {
                if (!docToDelete) return
                await removeCertDoc({ driverId, docKey: docToDelete.key })
                setDocToDelete(null)
              }}
            >
              {isRemoving ? 'Removing…' : 'Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
