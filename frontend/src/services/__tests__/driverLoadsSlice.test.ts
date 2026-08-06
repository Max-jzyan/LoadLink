import { describe, it, expect } from 'vitest'
import { configureStore } from '@reduxjs/toolkit'
import driverLoadsReducer, {
  setDriverLoads,
  updateLoadInList,
  selectDriverLoads,
  selectDriverLoadsLastFetched,
} from '../driverLoadsSlice'
import type { RootState } from '../store'

function makeLoad(overrides: Record<string, unknown> = {}) {
  return { _id: 'load-1', title: 'Load One', ...overrides } as unknown as Parameters<typeof setDriverLoads>[0][number]
}

function createStore(initialItems: Parameters<typeof setDriverLoads>[0] = []) {
  return configureStore({
    reducer: {
      driverLoads: driverLoadsReducer,
    },
    preloadedState: { driverLoads: { items: initialItems, lastFetched: null } },
  })
}

describe('driverLoadsSlice', () => {
  describe('setDriverLoads', () => {
    it('replaces items and sets lastFetched to a timestamp', () => {
      const store = createStore()
      const loads = [makeLoad(), makeLoad({ _id: 'load-2', title: 'Load Two' })]
      store.dispatch(setDriverLoads(loads))
      const state = store.getState() as { driverLoads: { items: unknown[]; lastFetched: number | null } }
      expect(state.driverLoads.items).toHaveLength(2)
      expect(state.driverLoads.items[0]).toEqual(loads[0])
      expect(state.driverLoads.items[1]).toEqual(loads[1])
      expect(state.driverLoads.lastFetched).not.toBeNull()
      expect(typeof state.driverLoads.lastFetched).toBe('number')
    })

    it('clears items when given an empty array', () => {
      const store = createStore([makeLoad()])
      store.dispatch(setDriverLoads([]))
      const state = store.getState() as { driverLoads: { items: unknown[]; lastFetched: number | null } }
      expect(state.driverLoads.items).toEqual([])
    })

    it('overwrites previously stored items', () => {
      const store = createStore([makeLoad({ _id: 'old', title: 'Old' })])
      const newLoads = [makeLoad({ _id: 'new', title: 'New' })]
      store.dispatch(setDriverLoads(newLoads))
      const state = store.getState() as { driverLoads: { items: unknown[] } }
      expect(state.driverLoads.items).toHaveLength(1)
      expect((state.driverLoads.items[0] as { _id: string })._id).toBe('new')
    })
  })

  describe('updateLoadInList', () => {
    it('merges partial changes into an existing load', () => {
      const store = createStore([makeLoad({ title: 'Original', price: 1000 })])
      store.dispatch(
        updateLoadInList({ loadId: 'load-1', changes: { price: 1200 } })
      )
      const state = store.getState() as { driverLoads: { items: unknown[] } }
      const updated = state.driverLoads.items[0] as { title: string; price: number }
      expect(updated.title).toBe('Original')
      expect(updated.price).toBe(1200)
    })

    it('does nothing when the loadId is not found', () => {
      const store = createStore([makeLoad({ title: 'Keep' })])
      store.dispatch(
        updateLoadInList({ loadId: 'nonexistent', changes: { price: 9999 } })
      )
      const state = store.getState() as { driverLoads: { items: unknown[] } }
      expect(state.driverLoads.items).toHaveLength(1)
      expect((state.driverLoads.items[0] as { title: string }).title).toBe('Keep')
    })
  })

  describe('selectors', () => {
    it('selectDriverLoads returns the items array', () => {
      const loads = [makeLoad({ _id: 'load-1' }), makeLoad({ _id: 'load-2' })]
      const store = createStore(loads)
      const state = store.getState() as unknown as RootState
      expect(selectDriverLoads(state)).toEqual(loads)
    })

    it('selectDriverLoadsLastFetched returns null on a fresh store', () => {
      const store = createStore()
      const state = store.getState() as unknown as RootState
      expect(selectDriverLoadsLastFetched(state)).toBeNull()
    })

    it('selectDriverLoadsLastFetched returns the timestamp after setDriverLoads', () => {
      const store = createStore()
      const before = Date.now()
      store.dispatch(setDriverLoads([makeLoad()]))
      const after = Date.now()
      const state = store.getState() as unknown as RootState
      const fetched = selectDriverLoadsLastFetched(state)
      expect(fetched).not.toBeNull()
      expect(fetched!).toBeGreaterThanOrEqual(before)
      expect(fetched!).toBeLessThanOrEqual(after)
    })
  })
})
