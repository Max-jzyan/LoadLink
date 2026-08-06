import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  createTestStore,
  restoreFetch,
  mockFetchResponse,
  getFetchCalls,
  resetFetchCalls,
} from './helpers'
import { adminApi } from '../adminApi/adminSlice'
import { __setCachedTokenForTests } from '../api'

void adminApi

function lastCall() {
  const calls = getFetchCalls()
  return calls[calls.length - 1]
}

function adminUser(overrides: Record<string, unknown> = {}) {
  return {
    _id: 'user-1',
    name: 'Test User',
    email: 'user@test.com',
    role: 'driver',
    createdAt: '2026-01-01T00:00:00Z',
    lastActiveAt: '2026-01-02T00:00:00Z',
    profilePictureUrl: '',
    isBanned: false,
    bannedAt: null,
    bannedReason: '',
    ...overrides,
  }
}

function adminDriver(overrides: Record<string, unknown> = {}) {
  return {
    _id: 'driver-1',
    name: 'Test Driver',
    email: 'dr@test.com',
    mcNumber: 'MC123',
    dotNumber: 'DOT456',
    nscCvorNumber: undefined,
    insuranceCertificates: [],
    certificationDocuments: [],
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function rateConfirmationBid(overrides: Record<string, unknown> = {}) {
  return {
    _id: 'bid-1',
    loadId: { _id: 'load-1', originAddress: 'Calgary, AB', destinationAddress: 'Vancouver, BC', pickupTime: '2026-01-01T00:00:00Z', dropoffTime: '2026-01-02T00:00:00Z', commodity: 'Freight' },
    driverId: { _id: 'driver-1', name: 'Test Driver', email: 'dr@test.com' },
    amount: 1200,
    acceptedAt: '2026-01-01T00:00:00Z',
    rateConfirmationUrl: null,
    rateConfirmationKey: null,
    ...overrides,
  }
}

function billOfLadingBid(overrides: Record<string, unknown> = {}) {
  return {
    _id: 'bid-1',
    loadId: { _id: 'load-1', originAddress: 'Calgary, AB', destinationAddress: 'Vancouver, BC', pickupTime: '2026-01-01T00:00:00Z', dropoffTime: '2026-01-02T00:00:00Z', commodity: 'Freight' },
    driverId: { _id: 'driver-1', name: 'Test Driver', email: 'dr@test.com' },
    amount: 1200,
    acceptedAt: '2026-01-01T00:00:00Z',
    bolUrl: null,
    bolKey: null,
    signedBolUrl: null,
    signedBolKey: null,
    ...overrides,
  }
}

describe('adminApi endpoints', () => {
  beforeEach(() => {
    resetFetchCalls()
    __setCachedTokenForTests(null)
  })

  afterEach(() => {
    restoreFetch()
  })

  describe('getPlatformStats', () => {
    it('[URL] GET admin/stats', async () => {
      mockFetchResponse({ status: 200, body: { totalDrivers: 5, totalCompanies: 3, totalLoads: 20, totalBids: 50, driversWithDocs: 4, totalRevenue: 10000 } })
      const store = createTestStore()
      await store.dispatch(adminApi.endpoints.getPlatformStats.initiate())
      expect(lastCall().url).toContain('/api/admin/stats')
      expect(lastCall().method).toBe('GET')
    })

    it('[Success] data lands in cache', async () => {
      mockFetchResponse({ status: 200, body: { totalDrivers: 5, totalCompanies: 3, totalLoads: 20, totalBids: 50, driversWithDocs: 4, totalRevenue: 10000 } })
      const store = createTestStore()
      await store.dispatch(adminApi.endpoints.getPlatformStats.initiate())
      const state = adminApi.endpoints.getPlatformStats.select(undefined)(store.getState())
      expect(state.data?.totalDrivers).toBe(5)
    })

    it('[Error] 500 sets error state', async () => {
      mockFetchResponse({ status: 500, body: {} })
      const store = createTestStore()
      await store.dispatch(adminApi.endpoints.getPlatformStats.initiate())
      const state = adminApi.endpoints.getPlatformStats.select(undefined)(store.getState())
      expect(state.isError).toBe(true)
    })
  })

  describe('getAdminAnalytics', () => {
    it('[URL] GET admin/analytics without days', async () => {
      mockFetchResponse({ status: 200, body: { days: 30, series: {} } })
      const store = createTestStore()
      await store.dispatch(adminApi.endpoints.getAdminAnalytics.initiate())
      expect(lastCall().url).toContain('/api/admin/analytics')
      expect(lastCall().method).toBe('GET')
    })

    it('[URL] GET admin/analytics?days=7', async () => {
      mockFetchResponse({ status: 200, body: { days: 7, series: {} } })
      const store = createTestStore()
      await store.dispatch(adminApi.endpoints.getAdminAnalytics.initiate({ days: 7 }))
      expect(lastCall().url).toContain('/api/admin/analytics?days=7')
    })

    it('[Success] data lands in cache', async () => {
      mockFetchResponse({ status: 200, body: { days: 7, series: { revenue: [] } } })
      const store = createTestStore()
      await store.dispatch(adminApi.endpoints.getAdminAnalytics.initiate({ days: 7 }))
      const state = adminApi.endpoints.getAdminAnalytics.select({ days: 7 })(store.getState())
      expect(state.data?.days).toBe(7)
    })

    it('[Error] 500 sets error state', async () => {
      mockFetchResponse({ status: 500, body: {} })
      const store = createTestStore()
      await store.dispatch(adminApi.endpoints.getAdminAnalytics.initiate())
      const state = adminApi.endpoints.getAdminAnalytics.select(undefined)(store.getState())
      expect(state.isError).toBe(true)
    })
  })

  describe('getAdminInsights', () => {
    it('[URL] GET admin/insights', async () => {
      mockFetchResponse({ status: 200, body: { topCompanies: [], topDrivers: [], topLanes: [], activity: {} } })
      const store = createTestStore()
      await store.dispatch(adminApi.endpoints.getAdminInsights.initiate())
      expect(lastCall().url).toContain('/api/admin/insights')
      expect(lastCall().method).toBe('GET')
    })

    it('[Success] data lands in cache', async () => {
      mockFetchResponse({ status: 200, body: { topCompanies: [], topDrivers: [], topLanes: [], activity: {} } })
      const store = createTestStore()
      await store.dispatch(adminApi.endpoints.getAdminInsights.initiate())
      const state = adminApi.endpoints.getAdminInsights.select(undefined)(store.getState())
      expect(state.data?.topCompanies).toHaveLength(0)
    })

    it('[Error] 500 sets error state', async () => {
      mockFetchResponse({ status: 500, body: {} })
      const store = createTestStore()
      await store.dispatch(adminApi.endpoints.getAdminInsights.initiate())
      const state = adminApi.endpoints.getAdminInsights.select(undefined)(store.getState())
      expect(state.isError).toBe(true)
    })
  })

  describe('listAdminUsers', () => {
    it('[URL] GET admin/users without role', async () => {
      mockFetchResponse({ status: 200, body: [adminUser()] })
      const store = createTestStore()
      await store.dispatch(adminApi.endpoints.listAdminUsers.initiate({}))
      expect(lastCall().url).toContain('/api/admin/users')
      expect(lastCall().method).toBe('GET')
    })

    it('[URL] GET admin/users?role=driver', async () => {
      mockFetchResponse({ status: 200, body: [adminUser()] })
      const store = createTestStore()
      await store.dispatch(adminApi.endpoints.listAdminUsers.initiate({ role: 'driver' }))
      expect(lastCall().url).toContain('/api/admin/users?role=driver')
    })

    it('[Success] data lands in cache', async () => {
      mockFetchResponse({ status: 200, body: [adminUser()] })
      const store = createTestStore()
      await store.dispatch(adminApi.endpoints.listAdminUsers.initiate({}))
      const state = adminApi.endpoints.listAdminUsers.select({})(store.getState())
      expect(state.data).toHaveLength(1)
    })

    it('[Error] 500 sets error state', async () => {
      mockFetchResponse({ status: 500, body: {} })
      const store = createTestStore()
      await store.dispatch(adminApi.endpoints.listAdminUsers.initiate({}))
      const state = adminApi.endpoints.listAdminUsers.select({})(store.getState())
      expect(state.isError).toBe(true)
    })
  })

  describe('banUser', () => {
    it('[URL/Body] PATCH admin/users/:userId/ban with reason', async () => {
      mockFetchResponse({ status: 200, body: { message: 'User banned' } })
      const store = createTestStore()
      await store.dispatch(adminApi.endpoints.banUser.initiate({ userId: 'user-1', reason: 'Fraud' }))
      expect(lastCall().url).toContain('/api/admin/users/user-1/ban')
      expect(lastCall().method).toBe('PATCH')
      expect(lastCall().body).toEqual({ reason: 'Fraud' })
    })

    it('[Success] data in result', async () => {
      mockFetchResponse({ status: 200, body: { message: 'User banned' } })
      const store = createTestStore()
      const result = await store.dispatch(adminApi.endpoints.banUser.initiate({ userId: 'user-1' }))
      expect(result.data?.message).toBe('User banned')
    })

    it('[Error] 404 sets error', async () => {
      mockFetchResponse({ status: 404, body: {} })
      const store = createTestStore()
      const result = await store.dispatch(adminApi.endpoints.banUser.initiate({ userId: 'user-1' }))
      expect(result.error).toBeDefined()
    })
  })

  describe('unbanUser', () => {
    it('[URL/Method] PATCH admin/users/:userId/unban', async () => {
      mockFetchResponse({ status: 200, body: { message: 'User unbanned' } })
      const store = createTestStore()
      await store.dispatch(adminApi.endpoints.unbanUser.initiate({ userId: 'user-1' }))
      expect(lastCall().url).toContain('/api/admin/users/user-1/unban')
      expect(lastCall().method).toBe('PATCH')
    })

    it('[Success] data in result', async () => {
      mockFetchResponse({ status: 200, body: { message: 'User unbanned' } })
      const store = createTestStore()
      const result = await store.dispatch(adminApi.endpoints.unbanUser.initiate({ userId: 'user-1' }))
      expect(result.data?.message).toBe('User unbanned')
    })

    it('[Error] 404 sets error', async () => {
      mockFetchResponse({ status: 404, body: {} })
      const store = createTestStore()
      const result = await store.dispatch(adminApi.endpoints.unbanUser.initiate({ userId: 'user-1' }))
      expect(result.error).toBeDefined()
    })
  })

  describe('deleteAdminUser', () => {
    it('[URL/Method] DELETE admin/users/:userId', async () => {
      mockFetchResponse({ status: 200, body: {} })
      const store = createTestStore()
      await store.dispatch(adminApi.endpoints.deleteAdminUser.initiate({ userId: 'user-1' }))
      expect(lastCall().url).toContain('/api/admin/users/user-1')
      expect(lastCall().method).toBe('DELETE')
    })

    it('[Success] no error', async () => {
      mockFetchResponse({ status: 200, body: {} })
      const store = createTestStore()
      const result = await store.dispatch(adminApi.endpoints.deleteAdminUser.initiate({ userId: 'user-1' }))
      expect(result.error).toBeUndefined()
    })

    it('[Error] 404 sets error', async () => {
      mockFetchResponse({ status: 404, body: {} })
      const store = createTestStore()
      const result = await store.dispatch(adminApi.endpoints.deleteAdminUser.initiate({ userId: 'user-1' }))
      expect(result.error).toBeDefined()
    })
  })

  describe('listAdminDrivers', () => {
    it('[URL] GET admin/drivers', async () => {
      mockFetchResponse({ status: 200, body: [adminDriver()] })
      const store = createTestStore()
      await store.dispatch(adminApi.endpoints.listAdminDrivers.initiate())
      expect(lastCall().url).toContain('/api/admin/drivers')
      expect(lastCall().method).toBe('GET')
    })

    it('[Success] data lands in cache', async () => {
      mockFetchResponse({ status: 200, body: [adminDriver()] })
      const store = createTestStore()
      await store.dispatch(adminApi.endpoints.listAdminDrivers.initiate())
      const state = adminApi.endpoints.listAdminDrivers.select(undefined)(store.getState())
      expect(state.data).toHaveLength(1)
    })

    it('[Error] 500 sets error state', async () => {
      mockFetchResponse({ status: 500, body: {} })
      const store = createTestStore()
      await store.dispatch(adminApi.endpoints.listAdminDrivers.initiate())
      const state = adminApi.endpoints.listAdminDrivers.select(undefined)(store.getState())
      expect(state.isError).toBe(true)
    })
  })

  describe('getDriverDocuments', () => {
    it('[URL] GET admin/drivers/:driverId', async () => {
      mockFetchResponse({ status: 200, body: adminDriver() })
      const store = createTestStore()
      await store.dispatch(adminApi.endpoints.getDriverDocuments.initiate('driver-1'))
      expect(lastCall().url).toContain('/api/admin/drivers/driver-1')
      expect(lastCall().method).toBe('GET')
    })

    it('[Success] data lands in cache', async () => {
      mockFetchResponse({ status: 200, body: adminDriver() })
      const store = createTestStore()
      await store.dispatch(adminApi.endpoints.getDriverDocuments.initiate('driver-1'))
      const state = adminApi.endpoints.getDriverDocuments.select('driver-1')(store.getState())
      expect(state.data?._id).toBe('driver-1')
    })

    it('[Error] 404 sets error state', async () => {
      mockFetchResponse({ status: 404, body: {} })
      const store = createTestStore()
      await store.dispatch(adminApi.endpoints.getDriverDocuments.initiate('driver-1'))
      const state = adminApi.endpoints.getDriverDocuments.select('driver-1')(store.getState())
      expect(state.isError).toBe(true)
    })
  })

  describe('approveInsuranceCert', () => {
    it('[URL/Method] PATCH admin/drivers/:driverId/insurance/:idx/approve', async () => {
      mockFetchResponse({ status: 200, body: { message: 'Approved' } })
      const store = createTestStore()
      await store.dispatch(adminApi.endpoints.approveInsuranceCert.initiate({ driverId: 'driver-1', idx: 0 }))
      expect(lastCall().url).toContain('/api/admin/drivers/driver-1/insurance/0/approve')
      expect(lastCall().method).toBe('PATCH')
    })

    it('[Success] data in result', async () => {
      mockFetchResponse({ status: 200, body: { message: 'Approved' } })
      const store = createTestStore()
      const result = await store.dispatch(adminApi.endpoints.approveInsuranceCert.initiate({ driverId: 'driver-1', idx: 0 }))
      expect(result.data?.message).toBe('Approved')
    })

    it('[Error] 404 sets error', async () => {
      mockFetchResponse({ status: 404, body: {} })
      const store = createTestStore()
      const result = await store.dispatch(adminApi.endpoints.approveInsuranceCert.initiate({ driverId: 'driver-1', idx: 0 }))
      expect(result.error).toBeDefined()
    })
  })

  describe('rejectInsuranceCert', () => {
    it('[URL/Body] PATCH admin/drivers/:driverId/insurance/:idx/reject with reason', async () => {
      mockFetchResponse({ status: 200, body: { message: 'Rejected' } })
      const store = createTestStore()
      await store.dispatch(adminApi.endpoints.rejectInsuranceCert.initiate({ driverId: 'driver-1', idx: 0, reason: 'Expired' }))
      expect(lastCall().url).toContain('/api/admin/drivers/driver-1/insurance/0/reject')
      expect(lastCall().method).toBe('PATCH')
      expect(lastCall().body).toEqual({ reason: 'Expired' })
    })

    it('[Success] data in result', async () => {
      mockFetchResponse({ status: 200, body: { message: 'Rejected' } })
      const store = createTestStore()
      const result = await store.dispatch(adminApi.endpoints.rejectInsuranceCert.initiate({ driverId: 'driver-1', idx: 0 }))
      expect(result.data?.message).toBe('Rejected')
    })

    it('[Error] 404 sets error', async () => {
      mockFetchResponse({ status: 404, body: {} })
      const store = createTestStore()
      const result = await store.dispatch(adminApi.endpoints.rejectInsuranceCert.initiate({ driverId: 'driver-1', idx: 0 }))
      expect(result.error).toBeDefined()
    })
  })

  describe('approveCertDoc', () => {
    it('[URL/Method] PATCH admin/drivers/:driverId/certdoc/:idx/approve', async () => {
      mockFetchResponse({ status: 200, body: { message: 'Approved' } })
      const store = createTestStore()
      await store.dispatch(adminApi.endpoints.approveCertDoc.initiate({ driverId: 'driver-1', idx: 0 }))
      expect(lastCall().url).toContain('/api/admin/drivers/driver-1/certdoc/0/approve')
      expect(lastCall().method).toBe('PATCH')
    })

    it('[Success] data in result', async () => {
      mockFetchResponse({ status: 200, body: { message: 'Approved' } })
      const store = createTestStore()
      const result = await store.dispatch(adminApi.endpoints.approveCertDoc.initiate({ driverId: 'driver-1', idx: 0 }))
      expect(result.data?.message).toBe('Approved')
    })

    it('[Error] 404 sets error', async () => {
      mockFetchResponse({ status: 404, body: {} })
      const store = createTestStore()
      const result = await store.dispatch(adminApi.endpoints.approveCertDoc.initiate({ driverId: 'driver-1', idx: 0 }))
      expect(result.error).toBeDefined()
    })
  })

  describe('rejectCertDoc', () => {
    it('[URL/Body] PATCH admin/drivers/:driverId/certdoc/:idx/reject with reason', async () => {
      mockFetchResponse({ status: 200, body: { message: 'Rejected' } })
      const store = createTestStore()
      await store.dispatch(adminApi.endpoints.rejectCertDoc.initiate({ driverId: 'driver-1', idx: 0, reason: 'Invalid' }))
      expect(lastCall().url).toContain('/api/admin/drivers/driver-1/certdoc/0/reject')
      expect(lastCall().method).toBe('PATCH')
      expect(lastCall().body).toEqual({ reason: 'Invalid' })
    })

    it('[Success] data in result', async () => {
      mockFetchResponse({ status: 200, body: { message: 'Rejected' } })
      const store = createTestStore()
      const result = await store.dispatch(adminApi.endpoints.rejectCertDoc.initiate({ driverId: 'driver-1', idx: 0 }))
      expect(result.data?.message).toBe('Rejected')
    })

    it('[Error] 404 sets error', async () => {
      mockFetchResponse({ status: 404, body: {} })
      const store = createTestStore()
      const result = await store.dispatch(adminApi.endpoints.rejectCertDoc.initiate({ driverId: 'driver-1', idx: 0 }))
      expect(result.error).toBeDefined()
    })
  })

  describe('getDocumentDownloadUrl', () => {
    it('[URL] GET admin/documents/download?key=', async () => {
      mockFetchResponse({ status: 200, body: { url: 'https://s3.example.com/doc.pdf' } })
      const store = createTestStore()
      await store.dispatch(adminApi.endpoints.getDocumentDownloadUrl.initiate('documents/insurance.pdf'))
      expect(lastCall().url).toContain('/api/admin/documents/download?key=documents%2Finsurance.pdf')
      expect(lastCall().method).toBe('GET')
    })

    it('[Success] data lands in cache', async () => {
      mockFetchResponse({ status: 200, body: { url: 'https://s3.example.com/doc.pdf' } })
      const store = createTestStore()
      await store.dispatch(adminApi.endpoints.getDocumentDownloadUrl.initiate('documents/insurance.pdf'))
      const state = adminApi.endpoints.getDocumentDownloadUrl.select('documents/insurance.pdf')(store.getState())
      expect(state.data?.url).toBe('https://s3.example.com/doc.pdf')
    })

    it('[Error] 404 sets error state', async () => {
      mockFetchResponse({ status: 404, body: {} })
      const store = createTestStore()
      await store.dispatch(adminApi.endpoints.getDocumentDownloadUrl.initiate('documents/insurance.pdf'))
      const state = adminApi.endpoints.getDocumentDownloadUrl.select('documents/insurance.pdf')(store.getState())
      expect(state.isError).toBe(true)
    })
  })

  describe('listRateConfirmations', () => {
    it('[URL] GET admin/rate-confirmations', async () => {
      mockFetchResponse({ status: 200, body: [rateConfirmationBid()] })
      const store = createTestStore()
      await store.dispatch(adminApi.endpoints.listRateConfirmations.initiate())
      expect(lastCall().url).toContain('/api/admin/rate-confirmations')
      expect(lastCall().method).toBe('GET')
    })

    it('[Success] data lands in cache', async () => {
      mockFetchResponse({ status: 200, body: [rateConfirmationBid()] })
      const store = createTestStore()
      await store.dispatch(adminApi.endpoints.listRateConfirmations.initiate())
      const state = adminApi.endpoints.listRateConfirmations.select(undefined)(store.getState())
      expect(state.data).toHaveLength(1)
    })

    it('[Error] 500 sets error state', async () => {
      mockFetchResponse({ status: 500, body: {} })
      const store = createTestStore()
      await store.dispatch(adminApi.endpoints.listRateConfirmations.initiate())
      const state = adminApi.endpoints.listRateConfirmations.select(undefined)(store.getState())
      expect(state.isError).toBe(true)
    })
  })

  describe('listBillsOfLading', () => {
    it('[URL] GET admin/bill-of-ladings', async () => {
      mockFetchResponse({ status: 200, body: [billOfLadingBid()] })
      const store = createTestStore()
      await store.dispatch(adminApi.endpoints.listBillsOfLading.initiate())
      expect(lastCall().url).toContain('/api/admin/bill-of-ladings')
      expect(lastCall().method).toBe('GET')
    })

    it('[Success] data lands in cache', async () => {
      mockFetchResponse({ status: 200, body: [billOfLadingBid()] })
      const store = createTestStore()
      await store.dispatch(adminApi.endpoints.listBillsOfLading.initiate())
      const state = adminApi.endpoints.listBillsOfLading.select(undefined)(store.getState())
      expect(state.data).toHaveLength(1)
    })

    it('[Error] 500 sets error state', async () => {
      mockFetchResponse({ status: 500, body: {} })
      const store = createTestStore()
      await store.dispatch(adminApi.endpoints.listBillsOfLading.initiate())
      const state = adminApi.endpoints.listBillsOfLading.select(undefined)(store.getState())
      expect(state.isError).toBe(true)
    })
  })

  describe('generateRateConfirmation', () => {
    it('[URL/Method] POST admin/loads/:loadId/bids/:bidId/rate-confirmation', async () => {
      mockFetchResponse({ status: 201, body: { url: 'https://s3.example.com/rc.pdf', key: 'rc/key.pdf' } })
      const store = createTestStore()
      await store.dispatch(adminApi.endpoints.generateRateConfirmation.initiate({ loadId: 'load-1', bidId: 'bid-1' }))
      expect(lastCall().url).toContain('/api/admin/loads/load-1/bids/bid-1/rate-confirmation')
      expect(lastCall().method).toBe('POST')
    })

    it('[Success] data in result', async () => {
      mockFetchResponse({ status: 201, body: { url: 'https://s3.example.com/rc.pdf', key: 'rc/key.pdf' } })
      const store = createTestStore()
      const result = await store.dispatch(adminApi.endpoints.generateRateConfirmation.initiate({ loadId: 'load-1', bidId: 'bid-1' }))
      expect(result.data?.key).toBe('rc/key.pdf')
    })

    it('[Error] 404 sets error', async () => {
      mockFetchResponse({ status: 404, body: {} })
      const store = createTestStore()
      const result = await store.dispatch(adminApi.endpoints.generateRateConfirmation.initiate({ loadId: 'load-1', bidId: 'bid-1' }))
      expect(result.error).toBeDefined()
    })
  })
})
