import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

interface BreadcrumbState {
  /**
   * Local UI overrides for breadcrumb labels, keyed by the full route pathname
   * (e.g. `/loads/abc123`, `/driver/xyz789`). Pages that already have
   * the entity data in hand (load/driver/company profiles) dispatch an override
   * so the breadcrumb can render a human-friendly label without re-fetching.
   */
  overrides: Record<string, string>
}

const initialState: BreadcrumbState = {
  overrides: {},
}

const breadcrumbSlice = createSlice({
  name: 'breadcrumb',
  initialState,
  reducers: {
    setBreadcrumbLabel(state, action: PayloadAction<{ path: string; label: string }>) {
      state.overrides[action.payload.path] = action.payload.label
    },
    clearBreadcrumbLabel(state, action: PayloadAction<string>) {
      delete state.overrides[action.payload]
    },
    clearAllBreadcrumbLabels(state) {
      state.overrides = {}
    },
  },
})

export const { setBreadcrumbLabel, clearBreadcrumbLabel, clearAllBreadcrumbLabels } =
  breadcrumbSlice.actions
export default breadcrumbSlice.reducer

/** Whole-map selector for components (e.g. PageLayout) that render all crumbs. */
export const selectBreadcrumbOverrides = (state: {
  breadcrumb: BreadcrumbState
}): Record<string, string> => state.breadcrumb.overrides
