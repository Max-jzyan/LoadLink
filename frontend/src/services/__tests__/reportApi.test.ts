import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  createTestStore,
  seedToken,
  restoreFetch,
  mockFetchResponse,
  getFetchCalls,
  resetFetchCalls,
} from './helpers'
import { api } from '../api'
import { reportApi } from '../reportApi/reportSlice'
import { __setCachedTokenForTests } from '../api'

void reportApi

function lastCall() {
  const calls = getFetchCalls()
  return calls[calls.length - 1]
}

function report(overrides: Record<string, unknown> = {}) {
  return {
    _id: 'report-1',
    reporterId: 'driver-1',
    type: 'fraud',
    targetType: 'company',
    targetName: 'Test Company',
    targetId: 'company-1',
    category: 'fraud',
    description: 'Scam attempt',
    status: 'under_review',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function collaborator(overrides: Record<string, unknown> = {}) {
  return {
    _id: 'user-2',
    name: 'Test Company',
    email: 'co@test.com',
    ...overrides,
  }
}

function reportableLoad(overrides: Record<string, unknown> = {}) {
  return {
    _id: 'load-1',
    originAddress: 'Calgary, AB',
    destinationAddress: 'Vancouver, BC',
    commodity: 'Freight',
    status: 'completed',
    ...overrides,
  }
}

describe('reportApi endpoints', () => {
  beforeEach(() => {
    resetFetchCalls()
    __setCachedTokenForTests(null)
  })

  afterEach(() => {
    restoreFetch()
  })

  describe('getMyReports', () => {
    it('[URL] GET reports/user/:userId', async () => {
      mockFetchResponse({ status: 200, body: [report()] })
      const store = createTestStore()
      await store.dispatch(api.endpoints.getMyReports.initiate('driver-1'))
      expect(lastCall().url).toContain('/api/reports/user/driver-1')
      expect(lastCall().method).toBe('GET')
    })

    it('[Headers] Authorization present when token cached', async () => {
      await seedToken('report-token')
      mockFetchResponse({ status: 200, body: [] })
      const store = createTestStore()
      await store.dispatch(api.endpoints.getMyReports.initiate('driver-1'))
      expect(lastCall().headers['authorization']).toBe('Bearer report-token')
    })

    it('[Success] data lands in cache', async () => {
      mockFetchResponse({ status: 200, body: [report()] })
      const store = createTestStore()
      await store.dispatch(api.endpoints.getMyReports.initiate('driver-1'))
      const state = api.endpoints.getMyReports.select('driver-1')(store.getState())
      expect(state.data).toHaveLength(1)
      expect(state.data?.[0]?._id).toBe('report-1')
    })

    it('[Error] 500 sets error state', async () => {
      mockFetchResponse({ status: 500, body: {} })
      const store = createTestStore()
      await store.dispatch(api.endpoints.getMyReports.initiate('driver-1'))
      const state = api.endpoints.getMyReports.select('driver-1')(store.getState())
      expect(state.isError).toBe(true)
    })
  })

  describe('getReportCollaborators', () => {
    it('[URL] GET reports/collaborators', async () => {
      mockFetchResponse({ status: 200, body: [collaborator()] })
      const store = createTestStore()
      await store.dispatch(api.endpoints.getReportCollaborators.initiate())
      expect(lastCall().url).toContain('/api/reports/collaborators')
      expect(lastCall().method).toBe('GET')
    })

    it('[Success] data lands in cache', async () => {
      mockFetchResponse({ status: 200, body: [collaborator()] })
      const store = createTestStore()
      await store.dispatch(api.endpoints.getReportCollaborators.initiate())
      const state = api.endpoints.getReportCollaborators.select()(store.getState())
      expect(state.data).toHaveLength(1)
      expect(state.data?.[0]?.name).toBe('Test Company')
    })

    it('[Error] 401 sets error state', async () => {
      mockFetchResponse({ status: 401, body: {} })
      const store = createTestStore()
      await store.dispatch(api.endpoints.getReportCollaborators.initiate())
      const state = api.endpoints.getReportCollaborators.select()(store.getState())
      expect(state.isError).toBe(true)
    })
  })

  describe('getReportableLoads', () => {
    it('[URL] GET reports/loads', async () => {
      mockFetchResponse({ status: 200, body: [reportableLoad()] })
      const store = createTestStore()
      await store.dispatch(api.endpoints.getReportableLoads.initiate())
      expect(lastCall().url).toContain('/api/reports/loads')
      expect(lastCall().method).toBe('GET')
    })

    it('[Success] data lands in cache', async () => {
      mockFetchResponse({ status: 200, body: [reportableLoad()] })
      const store = createTestStore()
      await store.dispatch(api.endpoints.getReportableLoads.initiate())
      const state = api.endpoints.getReportableLoads.select()(store.getState())
      expect(state.data).toHaveLength(1)
      expect(state.data?.[0]?._id).toBe('load-1')
    })

    it('[Error] 500 sets error state', async () => {
      mockFetchResponse({ status: 500, body: {} })
      const store = createTestStore()
      await store.dispatch(api.endpoints.getReportableLoads.initiate())
      const state = api.endpoints.getReportableLoads.select()(store.getState())
      expect(state.isError).toBe(true)
    })
  })

  describe('createReport', () => {
    it('[URL/Body] POST reports with payload', async () => {
      mockFetchResponse({ status: 201, body: report() })
      const store = createTestStore()
      const payload = {
        reporterId: 'driver-1',
        type: 'fraud' as const,
        targetType: 'company' as const,
        targetEmail: 'co@test.com',
        category: 'fraud',
        description: 'Scam attempt',
      }
      await store.dispatch(api.endpoints.createReport.initiate(payload))
      expect(lastCall().url).toContain('/api/reports')
      expect(lastCall().method).toBe('POST')
      expect(lastCall().body).toEqual(payload)
    })

    it('[Success] data in result', async () => {
      mockFetchResponse({ status: 201, body: report() })
      const store = createTestStore()
      const result = await store.dispatch(
        api.endpoints.createReport.initiate({
          reporterId: 'driver-1',
          type: 'fraud' as const,
          targetType: 'company' as const,
          category: 'fraud',
          description: 'Scam attempt',
        })
      )
      expect(result.data?._id).toBe('report-1')
    })

    it('[Error] 400 sets error', async () => {
      mockFetchResponse({ status: 400, body: { message: 'Invalid report' } })
      const store = createTestStore()
      const result = await store.dispatch(
        api.endpoints.createReport.initiate({
          reporterId: 'driver-1',
          type: 'fraud' as const,
          targetType: 'company' as const,
          category: 'fraud',
          description: 'Scam attempt',
        })
      )
      expect(result.error).toBeDefined()
    })
  })

  describe('getAllReports', () => {
    it('[URL] GET reports without status', async () => {
      mockFetchResponse({ status: 200, body: [] })
      const store = createTestStore()
      await store.dispatch(api.endpoints.getAllReports.initiate())
      expect(lastCall().url).toContain('/api/reports')
      expect(lastCall().method).toBe('GET')
    })

    it('[URL] GET reports?status=resolved', async () => {
      mockFetchResponse({ status: 200, body: [] })
      const store = createTestStore()
      await store.dispatch(api.endpoints.getAllReports.initiate({ status: 'resolved' }))
      expect(lastCall().url).toContain('/api/reports?status=resolved')
    })

    it('[Success] data lands in cache', async () => {
      mockFetchResponse({ status: 200, body: [report()] })
      const store = createTestStore()
      await store.dispatch(api.endpoints.getAllReports.initiate())
      const state = api.endpoints.getAllReports.select()(store.getState())
      expect(state.data).toHaveLength(1)
    })

    it('[Error] 500 sets error state', async () => {
      mockFetchResponse({ status: 500, body: {} })
      const store = createTestStore()
      await store.dispatch(api.endpoints.getAllReports.initiate())
      const state = api.endpoints.getAllReports.select()(store.getState())
      expect(state.isError).toBe(true)
    })
  })

  describe('updateReportStatus', () => {
    it('[URL/Body] PATCH reports/:reportId/status with body', async () => {
      mockFetchResponse({ status: 200, body: report({ status: 'resolved' }) })
      const store = createTestStore()
      const payload = { reportId: 'report-1', status: 'resolved' as const, adminId: 'admin-1' }
      await store.dispatch(api.endpoints.updateReportStatus.initiate(payload))
      expect(lastCall().url).toContain('/api/reports/report-1/status')
      expect(lastCall().method).toBe('PATCH')
      expect(lastCall().body).toEqual({ status: 'resolved', adminId: 'admin-1' })
    })

    it('[Success] data in result', async () => {
      mockFetchResponse({ status: 200, body: report({ status: 'resolved' }) })
      const store = createTestStore()
      const result = await store.dispatch(
        api.endpoints.updateReportStatus.initiate({ reportId: 'report-1', status: 'resolved' as const })
      )
      expect(result.data?.status).toBe('resolved')
    })

    it('[Error] 404 sets error', async () => {
      mockFetchResponse({ status: 404, body: {} })
      const store = createTestStore()
      const result = await store.dispatch(
        api.endpoints.updateReportStatus.initiate({ reportId: 'report-1', status: 'resolved' as const })
      )
      expect(result.error).toBeDefined()
    })
  })
})