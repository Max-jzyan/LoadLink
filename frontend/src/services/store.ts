import { configureStore } from '@reduxjs/toolkit'
import { api } from './api'
import authReducer, { subscribeToAuthChanges } from './authSlice'
import driverLoadsReducer from './driverLoadsSlice'

export const store = configureStore({
  reducer: {
    [api.reducerPath]: api.reducer,
    auth: authReducer,
    driverLoads: driverLoadsReducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(api.middleware),
})

subscribeToAuthChanges(store.dispatch)

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch