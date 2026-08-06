import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  createTestStore,
  seedToken,
  mockFetchResponse,
  getFetchCalls,
  resetFetchCalls,
  restoreFetch,
  fixtures,
} from './helpers'
import { api } from '../api'
import { companyApi } from '../companyApi/companyApi'
import { __setCachedTokenForTests } from '../api'

void companyApi

function lastCall() {
  const calls = getFetchCalls()
  return calls[calls.length - 1]
}

describe('companyApi endpoints', () => {
  beforeEach(() => {
    resetFetchCalls()
    __setCachedTokenForTests(null)
  })

  afterEach(() => {
    restoreFetch()
  })

  describe('listCompanies', () => {
    it('[URL] GET companies', async () => {
      mockFetchResponse({ status: 200, body: [] })
      const store = createTestStore()
      await store.dispatch(api.endpoints.listCompanies.initiate())
      expect(lastCall().url).toContain('/api/companies')
      expect(lastCall().method).toBe('GET')
    })

    it('[Success] data lands in cache', async () => {
      mockFetchResponse({ status: 200, body: [fixtures.companyProfile()] })
      const store = createTestStore()
      await store.dispatch(api.endpoints.listCompanies.initiate())
      const state = api.endpoints.listCompanies.select()(store.getState())
      expect(state.data).toHaveLength(1)
    })

    it('[Error] 500 sets error state', async () => {
      mockFetchResponse({ status: 500, body: {} })
      const store = createTestStore()
      await store.dispatch(api.endpoints.listCompanies.initiate())
      const state = api.endpoints.listCompanies.select()(store.getState())
      expect(state.isError).toBe(true)
    })
  })

  describe('getCompanyDashboard', () => {
    it('[URL] GET company/:companyId/dashboard', async () => {
      mockFetchResponse({ status: 200, body: { loads: [], summary: {} } })
      const store = createTestStore()
      await store.dispatch(api.endpoints.getCompanyDashboard.initiate('company-1'))
      expect(lastCall().url).toContain('/api/company/company-1/dashboard')
      expect(lastCall().method).toBe('GET')
    })

    it('[Success] data lands in cache', async () => {
      mockFetchResponse({
        status: 200,
        body: {
          loads: [fixtures.load()],
          summary: { activeLoads: 1, liveAuctions: 0, inTransit: 0, totalBidsToday: 0 },
        },
      })
      const store = createTestStore()
      await store.dispatch(api.endpoints.getCompanyDashboard.initiate('company-1'))
      const state = api.endpoints.getCompanyDashboard.select('company-1')(store.getState())
      expect(state.data?.loads).toHaveLength(1)
    })

    it('[Error] 500 sets error state', async () => {
      mockFetchResponse({ status: 500, body: {} })
      const store = createTestStore()
      await store.dispatch(api.endpoints.getCompanyDashboard.initiate('company-1'))
      const state = api.endpoints.getCompanyDashboard.select('company-1')(store.getState())
      expect(state.isError).toBe(true)
    })
  })

  describe('getCompanyProfile', () => {
    it('[URL] GET company/:companyId/profile', async () => {
      mockFetchResponse({ status: 200, body: fixtures.companyProfile() })
      const store = createTestStore()
      await store.dispatch(api.endpoints.getCompanyProfile.initiate('company-1'))
      expect(lastCall().url).toContain('/api/company/company-1/profile')
      expect(lastCall().method).toBe('GET')
    })

    it('[Success] data lands in cache', async () => {
      mockFetchResponse({ status: 200, body: fixtures.companyProfile() })
      const store = createTestStore()
      await store.dispatch(api.endpoints.getCompanyProfile.initiate('company-1'))
      const state = api.endpoints.getCompanyProfile.select('company-1')(store.getState())
      expect(state.data?._id).toBe('company-1')
    })

    it('[Error] 404 sets error state', async () => {
      mockFetchResponse({ status: 404, body: {} })
      const store = createTestStore()
      await store.dispatch(api.endpoints.getCompanyProfile.initiate('company-1'))
      const state = api.endpoints.getCompanyProfile.select('company-1')(store.getState())
      expect(state.isError).toBe(true)
    })
  })

  describe('updateCompanyProfile', () => {
    it('[URL/Body] PATCH company/:companyId/profile with payload', async () => {
      mockFetchResponse({ status: 200, body: fixtures.companyProfile() })
      const store = createTestStore()
      const payload = { companyName: 'New Co' }
      await store.dispatch(api.endpoints.updateCompanyProfile.initiate({ companyId: 'company-1', body: payload }))
      expect(lastCall().url).toContain('/api/company/company-1/profile')
      expect(lastCall().method).toBe('PATCH')
      expect(lastCall().body).toEqual(payload)
    })

    it('[Headers] Authorization present when token cached', async () => {
      await seedToken('cp-token')
      mockFetchResponse({ status: 200, body: fixtures.companyProfile() })
      const store = createTestStore()
      await store.dispatch(api.endpoints.updateCompanyProfile.initiate({ companyId: 'company-1', body: {} }))
      expect(lastCall().headers['authorization']).toBe('Bearer cp-token')
    })

    it('[Success] data in result', async () => {
      mockFetchResponse({ status: 200, body: fixtures.companyProfile() })
      const store = createTestStore()
      const result = await store.dispatch(api.endpoints.updateCompanyProfile.initiate({ companyId: 'company-1', body: {} }))
      expect(result.data?._id).toBe('company-1')
    })

    it('[Error] 400 sets error', async () => {
      mockFetchResponse({ status: 400, body: {} })
      const store = createTestStore()
      const result = await store.dispatch(api.endpoints.updateCompanyProfile.initiate({ companyId: 'company-1', body: {} }))
      expect(result.error).toBeDefined()
    })
  })

  describe('uploadCompanyDocuments', () => {
    it('[queryFn] presign + S3 PUT produces uploaded docs', async () => {
      mockFetchResponse((url) => {
        if (url.includes('/api/uploads/presign')) {
          return { status: 200, body: { uploadUrl: 'http://s3/upload-1', key: 'key-1', fileUrl: 'http://s3/file-1' } }
        }
        return { status: 200, body: {} }
      })
      const store = createTestStore()
      const file = new File(['data'], 'insurance.pdf', { type: 'application/pdf' })
      const result = await store.dispatch(
        api.endpoints.uploadCompanyDocuments.initiate({ companyId: 'company-1', docType: 'companyDocuments', files: [file] })
      )
      expect(result.data).toEqual([{ name: 'insurance.pdf', url: 'http://s3/file-1', key: 'key-1' }])
    })

    it('[queryFn] presign request posts firebaseUid + docType', async () => {
      mockFetchResponse((url) => {
        if (url.includes('/api/uploads/presign')) {
          return { status: 200, body: { uploadUrl: 'http://s3/u', key: 'k', fileUrl: 'http://s3/f' } }
        }
        return { status: 200, body: {} }
      })
      const store = createTestStore()
      const file = new File(['data'], 'insurance.pdf', { type: 'application/pdf' })
      await store.dispatch(
        api.endpoints.uploadCompanyDocuments.initiate({ companyId: 'company-1', docType: 'companyDocuments', files: [file] })
      )
      const presign = getFetchCalls().find((c) => c.url.includes('/api/uploads/presign'))
      expect(presign?.method).toBe('POST')
      expect(presign?.body).toMatchObject({ firebaseUid: 'test-uid', docType: 'companyDocuments', fileName: 'insurance.pdf' })
    })
  })
})