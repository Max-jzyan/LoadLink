import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { LoadForm, type LoadFormValues } from '@/components/LoadForm'
import { useCreateLoadMutation } from '@/services/loadApi/loadSlice'
import { selectMongoId } from '@/services/authSlice'
import Spinner from '@/components/shared/Spinner'
import { RoutePath } from '@/config/routes'

export default function PostLoad() {
  const [createLoad, { isLoading }] = useCreateLoadMutation()
  const navigate = useNavigate()
  const companyId = useSelector(selectMongoId)

  // Still resolving MongoDB id from auth
  if (!companyId) {
    return <Spinner fullPage />
  }

  const handleSubmit = async (values: LoadFormValues) => {
    await createLoad({ companyId, body: values })
    navigate(RoutePath.Loads)
  }

  return <LoadForm onSubmit={handleSubmit} isSubmitting={isLoading} />
}
