import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { LoadForm, type LoadFormValues } from '@/components/LoadForm'
import { useCreateLoadMutation } from '@/services/loadApi/loadSlice'
import { selectMongoId } from '@/services/authSlice'
import PageShell from '@/components/layout/PageShell'
import Spinner from '@/components/shared/Spinner'
import { RoutePath } from '@/config/routes'

export default function PostLoad() {
  const [createLoad, { isLoading: isCreatingLoad, isSuccess, isError }] = useCreateLoadMutation()
  const navigate = useNavigate()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const companyId = useSelector(selectMongoId)

  if (!companyId) {
    return <Spinner fullPage />
  }

  useEffect(() => {
    if (isSuccess) {
      navigate(RoutePath.Loads)
    }
  }, [isSuccess, navigate])

  useEffect(() => {
    if (isError) {
      setSubmitError('Failed to post load. Please try again.')
    }
  }, [isError])

  const handleSubmit = (values: LoadFormValues) => {
    setSubmitError(null)
    createLoad({ companyId, body: values })
  }

  return (
    <PageShell title="Post a Load">
      {submitError && <p className="text-sm text-destructive mb-4">{submitError}</p>}
      <LoadForm onSubmit={handleSubmit} isSubmitting={isCreatingLoad} />
    </PageShell>
  )
}
