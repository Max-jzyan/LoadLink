import { configureStore } from '@reduxjs/toolkit'
import { api } from './api'
import authReducer, { subscribeToAuthChanges } from './authSlice'
import driverLoadsReducer from './driverLoadsSlice'
import breadcrumbReducer from './breadcrumbSlice'
import aiReducer, { AI_TRIGGERED_STORAGE_KEY } from './aiSlice'

export const store = configureStore({
  reducer: {
    [api.reducerPath]: api.reducer,
    auth: authReducer,
    driverLoads: driverLoadsReducer,
    breadcrumb: breadcrumbReducer,
    ai: aiReducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(api.middleware),
})

subscribeToAuthChanges(store.dispatch)

let previousAiTriggered = store.getState().ai.triggered
store.subscribe(() => {
  const nextAiTriggered = store.getState().ai.triggered
  if (nextAiTriggered !== previousAiTriggered) {
    previousAiTriggered = nextAiTriggered
    localStorage.setItem(AI_TRIGGERED_STORAGE_KEY, String(nextAiTriggered))
  }
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
