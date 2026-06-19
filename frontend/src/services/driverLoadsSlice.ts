import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { Load } from './loadApi/loadEnum'
import type { RootState } from './store'

interface DriverLoadsState {
  items: Load[]
  lastFetched: number | null
}

const initialState: DriverLoadsState = {
  items: [],
  lastFetched: null,
}

const driverLoadsSlice = createSlice({
  name: 'driverLoads',
  initialState,
  reducers: {
    setDriverLoads(state, action: PayloadAction<Load[]>) {
      state.items = action.payload
      state.lastFetched = Date.now()
    },
    updateLoadInList(state, action: PayloadAction<{ loadId: string; changes: Partial<Load> }>) {
      const { loadId, changes } = action.payload
      const idx = state.items.findIndex((l) => l._id === loadId)
      if (idx !== -1) {
        state.items[idx] = { ...state.items[idx], ...changes }
      }
    },
  },
})

export const { setDriverLoads, updateLoadInList } = driverLoadsSlice.actions
export default driverLoadsSlice.reducer

export const selectDriverLoads = (state: RootState) => state.driverLoads.items
export const selectDriverLoadsLastFetched = (state: RootState) => state.driverLoads.lastFetched
