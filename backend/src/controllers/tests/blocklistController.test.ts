import httpMocks from 'node-mocks-http'
import { StatusCodes } from 'http-status-codes'
import { ApiError } from '../../utils/ApiError'
import * as blocklistService from '../../services/blocklistService'
import { getBlocklist, blockUser, unblockUser, getKnownUsers } from '../blocklistController'

jest.mock('../../services/blocklistService')

const getBlocklistForUserMock = jest.mocked(blocklistService.getBlocklistForUser)
const blockUserByNameMock = jest.mocked(blocklistService.blockUserByName)
const unblockUserMock = jest.mocked(blocklistService.unblockUser)
const getKnownUsersForBlocklistMock = jest.mocked(blocklistService.getKnownUsersForBlocklist)

const USER_ID = '000000000000000000000011'
const TARGET_ID = '000000000000000000000001'

beforeEach(() => {
  jest.resetAllMocks()
})

describe('getBlocklist', () => {
  it('200s with the entries', async () => {
    getBlocklistForUserMock.mockResolvedValue([{ _id: 'entry-1' }] as never)
    const req = httpMocks.createRequest({ params: { userId: USER_ID } })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await getBlocklist(req, res, next)

    expect(getBlocklistForUserMock).toHaveBeenCalledWith(USER_ID)
    expect(res.statusCode).toBe(StatusCodes.OK)
    expect(res._getJSONData()).toEqual([{ _id: 'entry-1' }])
  })

  it('forwards errors to next', async () => {
    getBlocklistForUserMock.mockRejectedValue(new ApiError(StatusCodes.BAD_REQUEST, 'bad id'))
    const req = httpMocks.createRequest({ params: { userId: USER_ID } })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await getBlocklist(req, res, next)

    expect(next).toHaveBeenCalledWith(expect.any(ApiError))
  })
})

describe('blockUser', () => {
  it('201s with the created entry', async () => {
    blockUserByNameMock.mockResolvedValue({ _id: 'entry-1' } as never)
    const req = httpMocks.createRequest({
      params: { userId: USER_ID },
      body: { targetName: 'Acme', targetType: 'company', reason: 'spam' },
    })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await blockUser(req, res, next)

    expect(blockUserByNameMock).toHaveBeenCalledWith({
      userId: USER_ID,
      targetName: 'Acme',
      targetType: 'company',
      reason: 'spam',
    })
    expect(res.statusCode).toBe(StatusCodes.CREATED)
  })

  it('forwards errors to next', async () => {
    blockUserByNameMock.mockRejectedValue(new ApiError(StatusCodes.CONFLICT, 'already blocked'))
    const req = httpMocks.createRequest({
      params: { userId: USER_ID },
      body: { targetName: 'Acme', targetType: 'company' },
    })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await blockUser(req, res, next)

    expect(next).toHaveBeenCalledWith(expect.any(ApiError))
  })
})

describe('unblockUser', () => {
  it('204s with no body', async () => {
    unblockUserMock.mockResolvedValue({ _id: 'entry-1' } as never)
    const req = httpMocks.createRequest({ params: { userId: USER_ID, targetId: TARGET_ID } })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await unblockUser(req, res, next)

    expect(unblockUserMock).toHaveBeenCalledWith(USER_ID, TARGET_ID)
    expect(res.statusCode).toBe(StatusCodes.NO_CONTENT)
  })

  it('forwards errors to next', async () => {
    unblockUserMock.mockRejectedValue(new ApiError(StatusCodes.NOT_FOUND, 'not found'))
    const req = httpMocks.createRequest({ params: { userId: USER_ID, targetId: TARGET_ID } })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await unblockUser(req, res, next)

    expect(next).toHaveBeenCalledWith(expect.any(ApiError))
  })
})

describe('getKnownUsers', () => {
  it('200s with known users', async () => {
    getKnownUsersForBlocklistMock.mockResolvedValue([
      { _id: 'user-1', name: 'Company A', email: 'a@example.com', interactionType: 'bid' },
    ] as never)
    const req = httpMocks.createRequest({ params: { userId: USER_ID } })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await getKnownUsers(req, res, next)

    expect(getKnownUsersForBlocklistMock).toHaveBeenCalledWith(USER_ID)
    expect(res.statusCode).toBe(StatusCodes.OK)
    expect(res._getJSONData()).toEqual([
      { _id: 'user-1', name: 'Company A', email: 'a@example.com', interactionType: 'bid' },
    ])
  })

  it('forwards errors to next', async () => {
    getKnownUsersForBlocklistMock.mockRejectedValue(new ApiError(StatusCodes.BAD_REQUEST, 'bad id'))
    const req = httpMocks.createRequest({ params: { userId: USER_ID } })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await getKnownUsers(req, res, next)

    expect(next).toHaveBeenCalledWith(expect.any(ApiError))
  })
})
