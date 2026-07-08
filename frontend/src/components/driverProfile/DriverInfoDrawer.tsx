import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'

import DrawerShell from '@/components/layout/DrawerShell'
import type { CertificationDocument, DriverProfile } from '@/services/driverApi/driverEnum'
import { FileText, Loader2 } from 'lucide-react'

import AvatarUploadField from '@/components/shared/AvatarUploadField'
import FileUploadField from '@/components/shared/FileUploadField'
import { auth } from '@/lib/firebase'
import { uploadDocuments } from '@/lib/uploadDocuments'

export interface DriverInfoFormValues {
  name: string
  professionalTitle: string
  profilePictureUrl: string
  certificationDocuments: CertificationDocument[]
}

interface DriverInfoFormFields {
  name: string
  professionalTitle: string
}

interface DriverInfoDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  driver: DriverProfile
  onSubmit: (values: DriverInfoFormValues) => Promise<void>
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

  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null)
  const [pictureError, setPictureError] = useState<string | null>(null)
  const [certificationFiles, setCertificationFiles] = useState<File[]>([])
  const [certError, setCertError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DriverInfoFormFields>({
    defaultValues: {
      name: '',
      professionalTitle: '',
    },
  })

  // Reset form when drawer opens with driver data; clear when it closes
  useEffect(() => {
    if (open && driver) {
      reset({
        name: driver.name,
        professionalTitle: driver.professionalTitle,
      })
    }

    if (!open) {
      reset({ name: '', professionalTitle: '' })
      setProfilePictureFile(null)
      setCertificationFiles([])
      setPictureError(null)
      setCertError(null)
    }
  }, [open, driver, reset])

  const onFormSubmit = async (values: DriverInfoFormFields) => {
    let profilePictureUrl = driver.profilePictureUrl
    let certificationDocuments = driver.certificationDocuments ?? []

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
            certificationDocuments = [...certificationDocuments, ...uploaded]
          }
        } catch {
          setPictureError('Failed to upload one or more files. Please try again.')
          setUploading(false)
          return
        }
        setUploading(false)
      }
    }

    await onSubmit({
      ...values,
      profilePictureUrl,
      certificationDocuments,
    })
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

  return (
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

        {/* Certifications */}
        <Field>
          <FieldLabel>Certifications</FieldLabel>
          {driver.certificationDocuments && driver.certificationDocuments.length > 0 && (
            <ul className="space-y-1.5 mb-2">
              {driver.certificationDocuments.map((doc) => (
                <li
                  key={doc.key}
                  className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm"
                >
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{doc.name}</span>
                </li>
              ))}
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
  )
}
