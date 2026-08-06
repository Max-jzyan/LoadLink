import { describe, it, expect } from 'vitest'
import { configureStore } from '@reduxjs/toolkit'
import breadcrumbReducer, {
  setBreadcrumbLabel,
  clearBreadcrumbLabel,
  clearAllBreadcrumbLabels,
  selectBreadcrumbOverrides,
} from '../breadcrumbSlice'

function createStore(initialState = { overrides: {} }) {
  return configureStore({
    reducer: {
      breadcrumb: breadcrumbReducer,
    },
    preloadedState: { breadcrumb: initialState },
  })
}

describe('breadcrumbSlice', () => {
  describe('setBreadcrumbLabel', () => {
    it('sets a label for the given path', () => {
      const store = createStore()
      store.dispatch(setBreadcrumbLabel({ path: '/loads/abc', label: 'Load ABC' }))
      const state = (store.getState() as { breadcrumb: { overrides: Record<string, string> } }).breadcrumb
      expect(state.overrides['/loads/abc']).toBe('Load ABC')
    })

    it('overwrites an existing label for the same path', () => {
      const store = createStore({ overrides: { '/loads/abc': 'Old' } })
      store.dispatch(setBreadcrumbLabel({ path: '/loads/abc', label: 'New' }))
      const state = (store.getState() as { breadcrumb: { overrides: Record<string, string> } }).breadcrumb
      expect(state.overrides['/loads/abc']).toBe('New')
    })

    it('can set multiple different paths without interference', () => {
      const store = createStore()
      store.dispatch(setBreadcrumbLabel({ path: '/loads/abc', label: 'Load ABC' }))
      store.dispatch(setBreadcrumbLabel({ path: '/driver/xyz', label: 'Driver XYZ' }))
      const state = (store.getState() as { breadcrumb: { overrides: Record<string, string> } }).breadcrumb
      expect(state.overrides['/loads/abc']).toBe('Load ABC')
      expect(state.overrides['/driver/xyz']).toBe('Driver XYZ')
    })
  })

  describe('clearBreadcrumbLabel', () => {
    it('removes a single label by path', () => {
      const store = createStore({ overrides: { '/loads/abc': 'Load ABC', '/driver/xyz': 'Driver XYZ' } })
      store.dispatch(clearBreadcrumbLabel('/loads/abc'))
      const state = (store.getState() as { breadcrumb: { overrides: Record<string, string> } }).breadcrumb
      expect(state.overrides['/loads/abc']).toBeUndefined()
      expect(state.overrides['/driver/xyz']).toBe('Driver XYZ')
    })

    it('is a no-op when the path does not exist', () => {
      const store = createStore({ overrides: { '/loads/abc': 'Load ABC' } })
      store.dispatch(clearBreadcrumbLabel('/nonexistent'))
      const state = (store.getState() as { breadcrumb: { overrides: Record<string, string> } }).breadcrumb
      expect(state.overrides).toEqual({ '/loads/abc': 'Load ABC' })
    })
  })

  describe('clearAllBreadcrumbLabels', () => {
    it('wipes all overrides', () => {
      const store = createStore({ overrides: { '/loads/abc': 'Load ABC', '/driver/xyz': 'Driver XYZ' } })
      store.dispatch(clearAllBreadcrumbLabels())
      const state = (store.getState() as { breadcrumb: { overrides: Record<string, string> } }).breadcrumb
      expect(state.overrides).toEqual({})
    })
  })

  describe('selectBreadcrumbOverrides', () => {
    it('returns the overrides map from state', () => {
      const store = createStore({ overrides: { '/loads/abc': 'Load ABC' } })
      const state = store.getState() as { breadcrumb: { overrides: Record<string, string> } }
      expect(selectBreadcrumbOverrides(state)).toEqual({ '/loads/abc': 'Load ABC' })
    })

    it('returns an empty object for the initial state', () => {
      const store = createStore()
      const state = store.getState() as { breadcrumb: { overrides: Record<string, string> } }
      expect(selectBreadcrumbOverrides(state)).toEqual({})
    })
  })
})
