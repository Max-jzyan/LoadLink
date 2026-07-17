import { StatusCodes } from 'http-status-codes'
import { Types } from 'mongoose'
import { BlocklistModel, TARGET_TYPES } from '../../models/blocklist/Blocklist'
import { UserModel } from '../../models/users/User'
import {
  getBlocklistForUser,
  blockUserByName,
  unblockUser,
  isBlockedPair,
} from '../blocklistService'

jest.mock('../../models/blocklist/Blocklist')
jest.mock('../../models/users/User')

const findBlocklistMock = jest.mocked(BlocklistModel.find)
const findOneBlocklistMock = jest.mocked(BlocklistModel.findOne)
const createBlocklistMock = jest.mocked(BlocklistModel.create)
const findOneAndUpdateBlocklistMock = jest.mocked(BlocklistModel.findOneAndUpdate)
const existsBlocklistMock = jest.mocked(BlocklistModel.exists)
const findOneUserMock = jest.mocked(UserModel.findOne)

const USER_ID = '000000000000000000000011'
const TARGET_USER_ID = '000000000000000000000001'
const INVALID_ID = 'not-an-object-id'

beforeEach(() => {
  jest.resetAllMocks()
})

describe('getBlocklistForUser', () => {
  it('400s on an invalid userId', async () => {
    await expect(getBlocklistForUser(INVALID_ID)).rejects.toMatchObject({
      statusCode: StatusCodes.BAD_REQUEST,
    })
  })

  it('filters to active entries for this user', async () => {
    const populateMock = jest.fn().mockResolvedValue([])
    const sortMock = jest.fn().mockReturnValue({ populate: populateMock })
    findBlocklistMock.mockReturnValue({ sort: sortMock } as never)

    await getBlocklistForUser(USER_ID)

    expect(findBlocklistMock).toHaveBeenCalledWith(expect.objectContaining({ isActive: true }))
  })
})

describe('blockUserByName', () => {
  it('400s on an invalid userId', async () => {
    await expect(
      blockUserByName({ userId: INVALID_ID, targetName: 'Acme', targetType: TARGET_TYPES.COMPANY })
    ).rejects.toMatchObject({ statusCode: StatusCodes.BAD_REQUEST })
  })

  it('400s when targetName is blank', async () => {
    await expect(
      blockUserByName({ userId: USER_ID, targetName: '   ', targetType: TARGET_TYPES.COMPANY })
    ).rejects.toMatchObject({ statusCode: StatusCodes.BAD_REQUEST })
  })

  it('400s on an invalid targetType', async () => {
    await expect(
      blockUserByName({ userId: USER_ID, targetName: 'Acme', targetType: 'admin' as never })
    ).rejects.toMatchObject({ statusCode: StatusCodes.BAD_REQUEST })
  })

  it('404s when no registered user matches the name', async () => {
    findOneUserMock.mockResolvedValue(null)

    await expect(
      blockUserByName({ userId: USER_ID, targetName: 'Acme', targetType: TARGET_TYPES.COMPANY })
    ).rejects.toMatchObject({ statusCode: StatusCodes.NOT_FOUND })
  })

  it('400s when blocking yourself', async () => {
    findOneUserMock.mockResolvedValue({ _id: { toString: () => USER_ID }, name: 'Me' } as never)

    await expect(
      blockUserByName({ userId: USER_ID, targetName: 'Me', targetType: TARGET_TYPES.COMPANY })
    ).rejects.toMatchObject({ statusCode: StatusCodes.BAD_REQUEST })
  })

  it('409s when the target is already actively blocked', async () => {
    findOneUserMock.mockResolvedValue({
      _id: { toString: () => TARGET_USER_ID },
      name: 'Acme',
    } as never)
    findOneBlocklistMock.mockResolvedValue({ isActive: true } as never)

    await expect(
      blockUserByName({ userId: USER_ID, targetName: 'Acme', targetType: TARGET_TYPES.COMPANY })
    ).rejects.toMatchObject({ statusCode: StatusCodes.CONFLICT })
  })

  it('re-activates a previously unblocked entry instead of creating a duplicate', async () => {
    findOneUserMock.mockResolvedValue({
      _id: { toString: () => TARGET_USER_ID },
      name: 'Acme',
    } as never)
    const existing = {
      isActive: false,
      reason: '',
      blockedAt: new Date(0),
      save: jest.fn().mockResolvedValue(undefined),
      populate: jest.fn().mockResolvedValue('populated-entry'),
    }
    findOneBlocklistMock.mockResolvedValue(existing as never)

    const result = await blockUserByName({
      userId: USER_ID,
      targetName: 'Acme',
      targetType: TARGET_TYPES.COMPANY,
      reason: 'spam',
    })

    expect(existing.isActive).toBe(true)
    expect(existing.reason).toBe('spam')
    expect(existing.save).toHaveBeenCalled()
    expect(createBlocklistMock).not.toHaveBeenCalled()
    expect(result).toBe('populated-entry')
  })

  it('creates a new blocklist entry when none exists', async () => {
    findOneUserMock.mockResolvedValue({
      _id: { toString: () => TARGET_USER_ID },
      name: 'Acme',
    } as never)
    findOneBlocklistMock.mockResolvedValue(null)
    const created = { populate: jest.fn().mockResolvedValue('populated-entry') }
    createBlocklistMock.mockResolvedValue(created as never)

    const result = await blockUserByName({
      userId: USER_ID,
      targetName: 'Acme',
      targetType: TARGET_TYPES.COMPANY,
    })

    expect(createBlocklistMock).toHaveBeenCalledWith(
      expect.objectContaining({ targetType: TARGET_TYPES.COMPANY, reason: '' })
    )
    expect(result).toBe('populated-entry')
  })
})

describe('isBlockedPair', () => {
  it('returns false without a query when either id is syntactically invalid', async () => {
    await expect(isBlockedPair(INVALID_ID, TARGET_USER_ID)).resolves.toBe(false)
    await expect(isBlockedPair(USER_ID, INVALID_ID)).resolves.toBe(false)
    expect(existsBlocklistMock).not.toHaveBeenCalled()
  })

  it('queries both directions of the pair and returns true when a match exists', async () => {
    existsBlocklistMock.mockResolvedValue({ _id: 'match' } as never)

    await expect(isBlockedPair(USER_ID, TARGET_USER_ID)).resolves.toBe(true)
    expect(existsBlocklistMock).toHaveBeenCalledWith({
      isActive: true,
      $or: [
        { userId: new Types.ObjectId(USER_ID), targetId: new Types.ObjectId(TARGET_USER_ID) },
        { userId: new Types.ObjectId(TARGET_USER_ID), targetId: new Types.ObjectId(USER_ID) },
      ],
    })
  })

  it('returns false when no active block exists in either direction', async () => {
    existsBlocklistMock.mockResolvedValue(null)

    await expect(isBlockedPair(USER_ID, TARGET_USER_ID)).resolves.toBe(false)
  })
})

describe('unblockUser', () => {
  it('400s on invalid ids', async () => {
    await expect(unblockUser(INVALID_ID, TARGET_USER_ID)).rejects.toMatchObject({
      statusCode: StatusCodes.BAD_REQUEST,
    })
    await expect(unblockUser(USER_ID, INVALID_ID)).rejects.toMatchObject({
      statusCode: StatusCodes.BAD_REQUEST,
    })
  })

  it('404s when there is no active entry to unblock', async () => {
    findOneAndUpdateBlocklistMock.mockResolvedValue(null)

    await expect(unblockUser(USER_ID, TARGET_USER_ID)).rejects.toMatchObject({
      statusCode: StatusCodes.NOT_FOUND,
    })
  })

  it('soft-deactivates the entry', async () => {
    const entry = { isActive: false }
    findOneAndUpdateBlocklistMock.mockResolvedValue(entry as never)

    await expect(unblockUser(USER_ID, TARGET_USER_ID)).resolves.toBe(entry)
    expect(findOneAndUpdateBlocklistMock).toHaveBeenCalledWith(
      expect.objectContaining({ isActive: true }),
      { isActive: false },
      { new: true }
    )
  })
})
