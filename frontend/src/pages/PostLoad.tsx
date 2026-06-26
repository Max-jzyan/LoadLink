import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { LoadForm, type LoadFormValues } from '@/components/LoadForm'
import { useCreateLoadMutation } from '@/services/loadApi/loadSlice'
import { selectMongoId } from '@/services/authSlice'
import PageShell from '@/components/layout/PageShell'
import Spinner from '@/components/shared/Spinner'
import { RoutePath } from '@/config/routes'

export default function PostLoad() {
  const [createLoad, { isLoading: isCreatingLoad }] = useCreateLoadMutation()
  const navigate = useNavigate()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const companyId = useSelector(selectMongoId)

  if (!companyId) {
    return <Spinner fullPage />
  }

  const handleSubmit = async (values: LoadFormValues) => {
    setSubmitError(null)
    try {
      await createLoad({ companyId, body: values }).unwrap()
      navigate(RoutePath.Loads)
    } catch {
      setSubmitError('Failed to post load. Please try again.')
    }
  }

  return (
    <PageShell title="Post a Load">
      {submitError && <p className="text-sm text-destructive mb-4">{submitError}</p>}
      <LoadForm onSubmit={handleSubmit} isSubmitting={isCreatingLoad} />
    </PageShell>
  )
}
