import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from './store'

export const AI_TRIGGERED_STORAGE_KEY = 'ai-triggered'

interface AiState {
  /** Whether the user has toggled on the AI-powered panels (insights, fuel/rest suggestions). */
  triggered: boolean
}

const initialState: AiState = {
  triggered: localStorage.getItem(AI_TRIGGERED_STORAGE_KEY) === 'true',
}

const aiSlice = createSlice({
  name: 'ai',
  initialState,
  reducers: {
    setAiTriggered(state, action: PayloadAction<boolean>) {
      state.triggered = action.payload
    },
  },
})

export const { setAiTriggered } = aiSlice.actions
export default aiSlice.reducer

export const selectAiTriggered = (state: RootState): boolean => state.ai.triggered
