import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'

import DrawerShell from '@/components/layout/DrawerShell'
import type { BusinessDocument, CompanyProfile } from '@/services/companyApi/companyEnum'
import { FileText, Trash2 } from 'lucide-react'

import AvatarUploadField from '@/components/shared/AvatarUploadField'
import FileUploadField from '@/components/shared/FileUploadField'
import { auth } from '@/lib/firebase'
import { uploadDocuments } from '@/lib/uploadDocuments'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export interface CompanyInfoFormValues {
  companyName: string
  contactName: string
  businessAddress: string
  businessNumber: string
  profilePictureUrl: string
  businessDocuments: BusinessDocument[]
}

interface CompanyInfoFormFields {
  companyName: string
  contactName: string
  businessAddress: string
  businessNumber: string
}

interface CompanyInfoDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  company: CompanyProfile
  onSubmit: (values: CompanyInfoFormValues) => void
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs text-destructive mt-1">{message}</p>
}

export default function CompanyInfoDrawer({
  open,
  onOpenChange,
  company,
  onSubmit,
}: CompanyInfoDrawerProps) {
  const formId = 'company-info-form'

  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null)
  const [pictureError, setPictureError] = useState<string | null>(null)
  const [businessDocFiles, setBusinessDocFiles] = useState<File[]>([])
  const [docError, setDocError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [docToDelete, setDocToDelete] = useState<BusinessDocument | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CompanyInfoFormFields>({
    defaultValues: {
      companyName: '',
      contactName: '',
      businessAddress: '',
      businessNumber: '',
    },
  })

  // Reset form when drawer opens with company data; clear when it closes
  useEffect(() => {
    if (open && company) {
      reset({
        companyName: company.companyName,
        contactName: company.contactName,
        businessAddress: company.businessAddress,
        businessNumber: company.businessNumber,
      })
    }

    if (!open) {
      reset({
        companyName: '',
        contactName: '',
        businessAddress: '',
        businessNumber: '',
      })
      setProfilePictureFile(null)
      setBusinessDocFiles([])
      setPictureError(null)
      setDocError(null)
    }
  }, [open, company, reset])

  const onFormSubmit = async (values: CompanyInfoFormFields) => {
    let profilePictureUrl: string | undefined = undefined
    let businessDocuments: BusinessDocument[] | undefined = undefined

    if (profilePictureFile || businessDocFiles.length > 0) {
      const user = auth.currentUser
      if (user) {
        setUploading(true)
        try {
          const idToken = await user.getIdToken()

          if (profilePictureFile) {
            const [uploaded] = await uploadDocuments(idToken, user.uid, 'companyDocuments', [
              profilePictureFile,
            ])
            profilePictureUrl = uploaded.url
          }

          if (businessDocFiles.length > 0) {
            const uploaded = await uploadDocuments(
              idToken,
              user.uid,
              'companyDocuments',
              businessDocFiles
            )
            businessDocuments = [
              ...(company.businessDocuments ?? []),
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

    const body: Partial<CompanyInfoFormValues> = {
      ...values,
      ...(profilePictureUrl !== undefined && { profilePictureUrl }),
      ...(businessDocuments !== undefined && { businessDocuments }),
    }

    await onSubmit(body as CompanyInfoFormValues)
    setProfilePictureFile(null)
    setBusinessDocFiles([])
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

  return (
    <>
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      title="Edit Company Information"
      description="Update your company name, contact info, profile picture, and business documents."
      size="md"
      drawerSubmit={{
        onSubmit: handleSubmit(onFormSubmit),
        isSubmitting: isSubmitting || uploading,
        submitLabel: 'Save Changes',
      }}
    >
      <form id={formId} onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
        {/* Profile Picture Preview */}
        <div className="flex flex-col items-center">
          <AvatarUploadField
            file={profilePictureFile}
            onFileChange={setProfilePictureFile}
            existingUrl={company.profilePictureUrl}
            fallbackText={getInitials(company.companyName || company.name)}
            onError={setPictureError}
            disabled={isSubmitting || uploading}
          />
          <FieldDescription className="mt-2 text-center">
            Click the pencil icon to upload a company logo
          </FieldDescription>
          <FieldError message={pictureError ?? undefined} />
        </div>

        {/* Company Name */}
        <Field>
          <FieldLabel>Company Name</FieldLabel>
          <Input
            className={inputCls}
            placeholder="Enter your company name"
            {...register('companyName', {
              required: 'Company name is required',
              minLength: { value: 2, message: 'Company name must be at least 2 characters' },
            })}
          />
          <FieldError message={errors.companyName?.message} />
        </Field>

        {/* Contact Name */}
        <Field>
          <FieldLabel>Contact Name</FieldLabel>
          <Input
            className={inputCls}
            placeholder="Enter contact person name"
            {...register('contactName', {
              required: 'Contact name is required',
              minLength: { value: 2, message: 'Contact name must be at least 2 characters' },
            })}
          />
          <FieldError message={errors.contactName?.message} />
        </Field>

        {/* Business Address */}
        <Field>
          <FieldLabel>Business Address</FieldLabel>
          <Input
            className={inputCls}
            placeholder="Enter your business address"
            {...register('businessAddress')}
          />
          <FieldDescription>Optional: Your registered business address</FieldDescription>
        </Field>

        {/* Business Number */}
        <Field>
          <FieldLabel>Business Number</FieldLabel>
          <Input
            className={inputCls}
            placeholder="e.g. 987654321"
            {...register('businessNumber')}
          />
          <FieldDescription>Optional: Your registration or business number</FieldDescription>
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
          <Button variant="outline" onClick={() => setDocToDelete(null)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              // Removal is handled via the parent by filtering out the doc
              setDocToDelete(null)
            }}
          >
            Remove
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}