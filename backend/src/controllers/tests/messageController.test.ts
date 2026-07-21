import httpMocks from 'node-mocks-http'
import { StatusCodes } from 'http-status-codes'
import { ApiError } from '../../utils/ApiError'
import * as messageService from '../../services/messageService'
import {
  getThread,
  sendMessage,
  markThreadRead,
  getUnreadCounts,
  listThreads,
} from '../messageController'
import type { AuthedUser } from '../../types/auth'

jest.mock('../../services/messageService')

const getThreadMock = jest.mocked(messageService.getThread)
const sendMessageMock = jest.mocked(messageService.sendMessage)
const markThreadReadMock = jest.mocked(messageService.markThreadRead)
const getUnreadCountsMock = jest.mocked(messageService.getUnreadCounts)
const listThreadsMock = jest.mocked(messageService.listThreads)

const COMPANY_ID = '000000000000000000000001'
const LOAD_ID = '000000000000000000000101'

function companyUser(): AuthedUser {
  return { _id: COMPANY_ID, role: 'company', firebaseUid: 'uid-1', email: 'c@x.com' }
}

beforeEach(() => {
  jest.resetAllMocks()
})

describe('getThread', () => {
  it('200s with the thread for the authenticated user', async () => {
    const thread = { loadId: LOAD_ID, messages: [], counterparty: { name: 'Dan' } }
    getThreadMock.mockResolvedValue(thread as never)
    const req = httpMocks.createRequest({
      params: { loadId: LOAD_ID },
      user: companyUser(),
    } as never)
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await getThread(req, res, next)

    expect(getThreadMock).toHaveBeenCalledWith(LOAD_ID, COMPANY_ID)
    expect(res.statusCode).toBe(StatusCodes.OK)
    expect(res._getJSONData()).toEqual(thread)
  })

  it('forwards errors to next', async () => {
    getThreadMock.mockRejectedValue(new ApiError(StatusCodes.FORBIDDEN, 'nope'))
    const req = httpMocks.createRequest({
      params: { loadId: LOAD_ID },
      user: companyUser(),
    } as never)
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await getThread(req, res, next)

    expect(next).toHaveBeenCalledWith(expect.any(ApiError))
  })
})

describe('sendMessage', () => {
  it('201s with the created message, passing body.body through', async () => {
    sendMessageMock.mockResolvedValue({ _id: 'm1' } as never)
    const req = httpMocks.createRequest({
      params: { loadId: LOAD_ID },
      user: companyUser(),
      body: { body: 'Dock 12, ask for Sam' },
    } as never)
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await sendMessage(req, res, next)

    expect(sendMessageMock).toHaveBeenCalledWith(LOAD_ID, COMPANY_ID, 'Dock 12, ask for Sam')
    expect(res.statusCode).toBe(StatusCodes.CREATED)
  })

  it('forwards validation errors to next', async () => {
    sendMessageMock.mockRejectedValue(new ApiError(StatusCodes.BAD_REQUEST, 'empty'))
    const req = httpMocks.createRequest({
      params: { loadId: LOAD_ID },
      user: companyUser(),
      body: {},
    } as never)
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await sendMessage(req, res, next)

    expect(next).toHaveBeenCalledWith(expect.any(ApiError))
  })
})

describe('markThreadRead', () => {
  it('200s with the modified count', async () => {
    markThreadReadMock.mockResolvedValue({ modifiedCount: 2 })
    const req = httpMocks.createRequest({
      params: { loadId: LOAD_ID },
      user: companyUser(),
    } as never)
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await markThreadRead(req, res, next)

    expect(markThreadReadMock).toHaveBeenCalledWith(LOAD_ID, COMPANY_ID)
    expect(res._getJSONData()).toEqual({ modifiedCount: 2 })
  })
})

describe('listThreads', () => {
  it('200s with the thread summaries for the authenticated user', async () => {
    const threads = [{ loadId: LOAD_ID, unreadCount: 1 }]
    listThreadsMock.mockResolvedValue(threads as never)
    const req = httpMocks.createRequest({ user: companyUser() } as never)
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await listThreads(req, res, next)

    expect(listThreadsMock).toHaveBeenCalledWith(COMPANY_ID)
    expect(res.statusCode).toBe(StatusCodes.OK)
    expect(res._getJSONData()).toEqual(threads)
  })

  it('forwards errors to next', async () => {
    listThreadsMock.mockRejectedValue(new ApiError(StatusCodes.BAD_REQUEST, 'bad id'))
    const req = httpMocks.createRequest({ user: companyUser() } as never)
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await listThreads(req, res, next)

    expect(next).toHaveBeenCalledWith(expect.any(ApiError))
  })
})

describe('getUnreadCounts', () => {
  it('200s with totals for the authenticated user', async () => {
    getUnreadCountsMock.mockResolvedValue({ total: 1, byLoad: { [LOAD_ID]: 1 } })
    const req = httpMocks.createRequest({ user: companyUser() } as never)
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await getUnreadCounts(req, res, next)

    expect(getUnreadCountsMock).toHaveBeenCalledWith(COMPANY_ID)
    expect(res._getJSONData()).toEqual({ total: 1, byLoad: { [LOAD_ID]: 1 } })
  })
})
