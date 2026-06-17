import { useNavigate } from 'react-router-dom'
import { LoadForm, type LoadFormValues } from '@/components/LoadForm'
import { useCreateLoadMutation } from '@/services/loadApi/loadSlice'
import { RoutePath } from '@/config/routes'

// TODO: replace with real companyId from auth once auth is functional
const DEV_COMPANY_ID = '000000000000000000000001'

export default function PostLoad() {
  const [createLoad, { isLoading }] = useCreateLoadMutation()
  const navigate = useNavigate()

  const handleSubmit = async (values: LoadFormValues) => {
    await createLoad({ companyId: DEV_COMPANY_ID, body: values })
    navigate(RoutePath.Loads)
  }

  return <LoadForm onSubmit={handleSubmit} isSubmitting={isLoading} />
}
