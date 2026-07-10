import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'

import DrawerShell from '@/components/layout/DrawerShell'
import type { CertificationDocument, DriverProfile } from '@/services/driverApi/driverEnum'
import { FileText, Loader2, Trash2 } from 'lucide-react'

import AvatarUploadField from '@/components/shared/AvatarUploadField'
import FileUploadField from '@/components/shared/FileUploadField'
import { auth } from '@/lib/firebase'
import { uploadDocuments } from '@/lib/uploadDocuments'
import { useRequiredMongoId } from '@/hooks/useAuth'
import { useRemoveCertificationDocumentMutation } from '@/services/driverApi/driverSlice'
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
  const [certError, setCertError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [docToDelete, setDocToDelete] = useState<CertificationDocument | null>(null)
  const [removeCertDoc, { isLoading: isRemoving }] = useRemoveCertificationDocumentMutation()

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

  // Reset form when drawer opens with driver data; clear when it closes
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
      setPictureError(null)
      setCertError(null)
    }
  }, [open, driver, reset])

  const onFormSubmit = async (values: DriverInfoFormFields) => {
    let profilePictureUrl: string | undefined = undefined
    let certificationDocuments: CertificationDocument[] | undefined = undefined

    if (profilePictureFile || certificationFiles.length > 0) {
      const user = auth.currentUser
      if (user) {
        setUploading(true)
        try {
          const idToken = await user.getIdToken()

          if (profilePictureFile) {
            const [uploaded] = await uploadDocuments(idToken, user.uid, 'driverDocuments', [
              profilePictureFile,
            ])
            profilePictureUrl = uploaded.url
          }

          if (certificationFiles.length > 0) {
            const uploaded = await uploadDocuments(
              idToken,
              user.uid,
              'driverDocuments',
              certificationFiles
            )
            // Convert UploadedDocument to CertificationDocument format
            certificationDocuments = [
              ...(driver.certificationDocuments ?? []),
              ...uploaded.map((doc) => ({
                name: doc.name,
                url: doc.url,
                key: doc.key,
                uploadedAt: new Date().toISOString(),
              })),
            ]
          }
        } catch {
          setPictureError('Failed to upload one or more files. Please try again.')
          setUploading(false)
          return
        }
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
  }

  const inputCls = 'bg-background border-border placeholder:text-muted-foreground/50'

  const getButtonContent = () => {
    if (isSubmitting || uploading) {
      return (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Saving...
        </>
      )
    }
    return 'Save Changes'
  }

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
      footer={
        <>
          <Button type="submit" size="lg" disabled={isSubmitting || uploading} form={formId}>
            {getButtonContent()}
          </Button>
          <Button
            variant="outline"
            size="lg"
            disabled={isSubmitting || uploading}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </>
      }
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
            disabled={isSubmitting || uploading}
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
              <Input
                className={inputCls}
                placeholder="e.g. 1234567"
                {...register('dotNumber')}
              />
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
                return (
                  <li
                    key={doc.key}
                    className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm"
                  >
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate flex-1">{doc.name}</span>
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
            onChange={setCertificationFiles}
            onError={setCertError}
            multiple
            disabled={isSubmitting || uploading}
            buttonLabel="Upload certification"
          />
          <FieldDescription>Optional: Add proof of any certifications</FieldDescription>
          <FieldError message={certError ?? undefined} />
        </Field>
      </form>
    </DrawerShell>

    {/* Confirm delete document dialog */}
    <Dialog open={!!docToDelete} onOpenChange={(v) => { if (!v) setDocToDelete(null) }} >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove document?</DialogTitle>
          <DialogDescription>
            Are you sure you want to remove <strong>{docToDelete?.name}</strong>? This action cannot
            be undone.
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
