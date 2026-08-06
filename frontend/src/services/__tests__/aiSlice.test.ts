import { describe, it, expect, beforeEach, vi } from 'vitest'
import { configureStore } from '@reduxjs/toolkit'
import aiReducer, { setAiTriggered, selectAiTriggered, AI_TRIGGERED_STORAGE_KEY } from '../aiSlice'
import type { RootState } from '../store'

function createStore(initialTriggered: boolean) {
  return configureStore({
    reducer: {
      ai: aiReducer,
    },
    preloadedState: {
      ai: { triggered: initialTriggered },
    },
  })
}

describe('aiSlice', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  describe('setAiTriggered reducer', () => {
    it('sets triggered to true', () => {
      const store = createStore(false)
      store.dispatch(setAiTriggered(true))
      expect((store.getState() as { ai: { triggered: boolean } }).ai.triggered).toBe(true)
    })

    it('sets triggered to false', () => {
      const store = createStore(true)
      store.dispatch(setAiTriggered(false))
      expect((store.getState() as { ai: { triggered: boolean } }).ai.triggered).toBe(false)
    })

    it('can toggle back and forth', () => {
      const store = createStore(false)
      store.dispatch(setAiTriggered(true))
      expect((store.getState() as { ai: { triggered: boolean } }).ai.triggered).toBe(true)
      store.dispatch(setAiTriggered(false))
      expect((store.getState() as { ai: { triggered: boolean } }).ai.triggered).toBe(false)
    })
  })

  describe('selectAiTriggered', () => {
    it('returns true when triggered is true', () => {
      const store = createStore(true)
      const state = store.getState() as unknown as RootState
      expect(selectAiTriggered(state)).toBe(true)
    })

    it('returns false when triggered is false', () => {
      const store = createStore(false)
      const state = store.getState() as unknown as RootState
      expect(selectAiTriggered(state)).toBe(false)
    })
  })

  describe('initial state from localStorage', () => {
    // The aiSlice initial state reads localStorage at module-load time.
    // We use vi.resetModules() + dynamic import so each test gets a fresh
    // module evaluation with the desired localStorage value pre-set.
    beforeEach(() => {
      vi.resetModules()
    })

    it('reads "true" from localStorage on initial load', async () => {
      localStorage.setItem(AI_TRIGGERED_STORAGE_KEY, 'true')
      const { default: freshReducer } = await import('../aiSlice')
      const state = freshReducer(undefined, { type: 'INIT' })
      expect(state.triggered).toBe(true)
    })

    it('reads "false" from localStorage on initial load', async () => {
      localStorage.setItem(AI_TRIGGERED_STORAGE_KEY, 'false')
      const { default: freshReducer } = await import('../aiSlice')
      const state = freshReducer(undefined, { type: 'INIT' })
      expect(state.triggered).toBe(false)
    })

    it('defaults to false when localStorage has no key', async () => {
      const { default: freshReducer } = await import('../aiSlice')
      const state = freshReducer(undefined, { type: 'INIT' })
      expect(state.triggered).toBe(false)
    })

    it('defaults to false when localStorage has a non-"true" value', async () => {
      localStorage.setItem(AI_TRIGGERED_STORAGE_KEY, 'yes')
      const { default: freshReducer } = await import('../aiSlice')
      const state = freshReducer(undefined, { type: 'INIT' })
      expect(state.triggered).toBe(false)
    })
  })
})
