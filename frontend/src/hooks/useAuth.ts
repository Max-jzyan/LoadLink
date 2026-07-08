import { useSelector } from 'react-redux'
import { selectCurrentUser, selectAuthLoading } from '@/services/authSlice'


const useAuth = () => {
  const user = useSelector(selectCurrentUser)
  const loading = useSelector(selectAuthLoading)
  return { user, loading }
}

export default useAuth
