import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth'
import { auth } from '@/lib/firebase'
import type { AppDispatch, RootState } from './store'
import type { USER_ROLES } from '@/types/enums'

export interface AuthUser {
  uid: string
  email: string | null
}

interface AuthState {
  user: AuthUser | null
  loading: boolean
}

const initialState: AuthState = {
  user: null,
  loading: true,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<AuthUser | null>) {
      state.user = action.payload
      state.loading = false
    },
  },
})

export const { setUser } = authSlice.actions
export default authSlice.reducer

export const selectCurrentUser = (state: RootState) => state.auth.user
export const selectAuthLoading = (state: RootState) => state.auth.loading

export function subscribeToAuthChanges(dispatch: AppDispatch) {
  return onAuthStateChanged(auth, (firebaseUser) => {
    dispatch(setUser(firebaseUser ? { uid: firebaseUser.uid, email: firebaseUser.email } : null))
  })
}

export async function registerUser(email: string, password: string, userRole: USER_ROLES) {
  const { user } = await createUserWithEmailAndPassword(auth, email, password)
  return user
}

export async function loginUser(email: string, password: string) {
  const { user } = await signInWithEmailAndPassword(auth, email, password)
  return user
}

export async function logoutUser() {
  await signOut(auth)
}
