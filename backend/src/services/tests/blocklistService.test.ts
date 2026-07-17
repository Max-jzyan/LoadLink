import { StatusCodes } from 'http-status-codes'
import { Types } from 'mongoose'
import { BlocklistModel, TARGET_TYPES } from '../../models/blocklist/Blocklist'
import { UserModel } from '../../models/users/User'
import { BidModel } from '../../models/loads/Bid'
import { LoadModel } from '../../models/loads/Load'
import {
  getBlocklistForUser,
  blockUserByName,
  unblockUser,
  isBlockedPair,
  getKnownUsersForBlocklist,
} from '../blocklistService'

jest.mock('../../models/blocklist/Blocklist')
jest.mock('../../models/users/User')
jest.mock('../../models/loads/Bid')
jest.mock('../../models/loads/Load')

const findBlocklistMock = jest.mocked(BlocklistModel.find)
const findOneBlocklistMock = jest.mocked(BlocklistModel.findOne)
const createBlocklistMock = jest.mocked(BlocklistModel.create)
const findOneAndUpdateBlocklistMock = jest.mocked(BlocklistModel.findOneAndUpdate)
const existsBlocklistMock = jest.mocked(BlocklistModel.exists)
const findOneUserMock = jest.mocked(UserModel.findOne)
const findByIdUserMock = jest.mocked(UserModel.findById)
const bidAggregateMock = jest.mocked(BidModel.aggregate)
const loadAggregateMock = jest.mocked(LoadModel.aggregate)

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

describe('getKnownUsersForBlocklist', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('400s on an invalid userId', async () => {
    await expect(getKnownUsersForBlocklist(INVALID_ID)).rejects.toMatchObject({
      statusCode: StatusCodes.BAD_REQUEST,
    })
    expect(findOneUserMock).not.toHaveBeenCalled()
  })

  it('returns an empty array when the user does not exist', async () => {
    const selectMock = jest.fn().mockResolvedValue(null)
    findByIdUserMock.mockReturnValue({ select: selectMock } as never)

    const result = await getKnownUsersForBlocklist(USER_ID)

    expect(result).toEqual([])
    expect(findBlocklistMock).not.toHaveBeenCalled()
    expect(bidAggregateMock).not.toHaveBeenCalled()
    expect(loadAggregateMock).not.toHaveBeenCalled()
  })

  describe('for a driver', () => {
    const driverId = '000000000000000000000011'

    it('returns interacted companies from bids and assigned loads', async () => {
      const selectMock = jest.fn().mockResolvedValue({ _id: new Types.ObjectId(driverId), role: 'driver' })
      findByIdUserMock.mockReturnValue({ select: selectMock } as never)
      
      // Mock active blocks lookup
      findBlocklistMock.mockReturnValue({
        lean: jest.fn().mockResolvedValue([{ targetId: new Types.ObjectId('000000000000000000000099') }]),
      } as never)

      // Mock bid aggregation - companies the driver bid on
      bidAggregateMock.mockResolvedValue([
        {
          companyId: new Types.ObjectId('000000000000000000000001'),
          companyName: 'Company A',
          companyEmail: 'compA@example.com',
          statuses: ['submitted'],
          maxAcceptedAt: null,
          hasAccepted: false,
        },
        {
          companyId: new Types.ObjectId('000000000000000000000002'),
          companyName: 'Company B',
          companyEmail: 'compB@example.com',
          statuses: ['accepted'],
          maxAcceptedAt: new Date('2024-01-15'),
          hasAccepted: true,
        },
      ])

      // Mock assigned loads aggregation
      loadAggregateMock.mockResolvedValue([
        {
          companyId: new Types.ObjectId('000000000000000000000003'),
          companyName: 'Company C',
          companyEmail: 'compC@example.com',
          status: 'Booked',
        },
        {
          companyId: new Types.ObjectId('000000000000000000000002'),
          companyName: 'Company B',
          companyEmail: 'compB@example.com',
          status: 'Completed',
        },
      ])

      const result = await getKnownUsersForBlocklist(driverId)

      expect(result).toHaveLength(3)
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ _id: '000000000000000000000001', interactionType: 'bid' }),
          expect.objectContaining({ _id: '000000000000000000000002', interactionType: 'accepted' }),
          expect.objectContaining({ _id: '000000000000000000000003', interactionType: 'accepted' }),
        ])
      )
    })

    it('excludes already-blocked users', async () => {
      const selectMock = jest.fn().mockResolvedValue({ _id: new Types.ObjectId(driverId), role: 'driver' })
      findByIdUserMock.mockReturnValue({ select: selectMock } as never)
      
      const blockedCompanyId = '000000000000000000000001'
      findBlocklistMock.mockReturnValue({
        lean: jest.fn().mockResolvedValue([{ targetId: new Types.ObjectId(blockedCompanyId) }]),
      } as never)

      bidAggregateMock.mockResolvedValue([
        {
          companyId: new Types.ObjectId(blockedCompanyId),
          companyName: 'Blocked Company',
          companyEmail: 'blocked@example.com',
          statuses: ['submitted'],
          maxAcceptedAt: null,
          hasAccepted: false,
        },
      ])

      loadAggregateMock.mockResolvedValue([])

      const result = await getKnownUsersForBlocklist(driverId)

      expect(result).toHaveLength(0)
    })

    it('excludes the driver themselves', async () => {
      const selectMock = jest.fn().mockResolvedValue({ _id: new Types.ObjectId(driverId), role: 'driver' })
      findByIdUserMock.mockReturnValue({ select: selectMock } as never)
      findBlocklistMock.mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      } as never)

      // Mock a bid where companyId somehow matches driverId (edge case)
      bidAggregateMock.mockResolvedValue([
        {
          companyId: new Types.ObjectId(driverId),
          companyName: 'Myself',
          companyEmail: 'me@example.com',
          statuses: ['submitted'],
          maxAcceptedAt: null,
          hasAccepted: false,
        },
      ])

      loadAggregateMock.mockResolvedValue([])

      const result = await getKnownUsersForBlocklist(driverId)

      expect(result).toHaveLength(0)
    })

    it('returns unique users only', async () => {
      const selectMock = jest.fn().mockResolvedValue({ _id: new Types.ObjectId(driverId), role: 'driver' })
      findByIdUserMock.mockReturnValue({ select: selectMock } as never)
      findBlocklistMock.mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      } as never)

      // Same company appears in both bid and load with different interaction types
      bidAggregateMock.mockResolvedValue([
        {
          companyId: new Types.ObjectId('000000000000000000000001'),
          companyName: 'Company A',
          companyEmail: 'compA@example.com',
          statuses: ['submitted'],
          maxAcceptedAt: null,
          hasAccepted: false,
        },
      ])

      loadAggregateMock.mockResolvedValue([
        {
          companyId: new Types.ObjectId('000000000000000000000001'),
          companyName: 'Company A',
          companyEmail: 'compA@example.com',
          status: 'InTransit',
        },
      ])

      const result = await getKnownUsersForBlocklist(driverId)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual(
        expect.objectContaining({
          _id: '000000000000000000000001',
          name: 'Company A',
          interactionType: 'bid', // First occurrence wins (bids processed before loads)
        })
      )
    })
  })

  describe('for a company', () => {
    const companyId = '000000000000000000000022'

    it('returns interacted drivers from accepted bids and assigned loads', async () => {
      const selectMock = jest.fn().mockResolvedValue({ _id: new Types.ObjectId(companyId), role: 'company' })
      findByIdUserMock.mockReturnValue({ select: selectMock } as never)
      
      findBlocklistMock.mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      } as never)

      // Mock accepted bids aggregation
      bidAggregateMock.mockResolvedValue([
        {
          driverId: new Types.ObjectId('000000000000000000000101'),
          driverName: 'Driver A',
          driverEmail: 'driverA@example.com',
          acceptedAt: new Date('2024-01-20'),
        },
        {
          driverId: new Types.ObjectId('000000000000000000000102'),
          driverName: 'Driver B',
          driverEmail: 'driverB@example.com',
          acceptedAt: null,
        },
      ])

      // Mock assigned loads aggregation
      loadAggregateMock.mockResolvedValue([
        {
          assignedDriverId: new Types.ObjectId('000000000000000000000103'),
          driverName: 'Driver C',
          driverEmail: 'driverC@example.com',
          status: 'Booked',
        },
        {
          assignedDriverId: new Types.ObjectId('000000000000000000000101'),
          driverName: 'Driver A',
          driverEmail: 'driverA@example.com',
          status: 'Completed',
        },
      ])

      const result = await getKnownUsersForBlocklist(companyId)

      expect(result).toHaveLength(3)
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ _id: '000000000000000000000101', interactionType: 'accepted' }),
          expect.objectContaining({ _id: '000000000000000000000102', interactionType: 'completed' }),
          expect.objectContaining({ _id: '000000000000000000000103', interactionType: 'accepted' }),
        ])
      )
    })

    it('excludes already-blocked drivers', async () => {
      const selectMock = jest.fn().mockResolvedValue({ _id: new Types.ObjectId(companyId), role: 'company' })
      findByIdUserMock.mockReturnValue({ select: selectMock } as never)
      
      const blockedDriverId = '000000000000000000000101'
      findBlocklistMock.mockReturnValue({
        lean: jest.fn().mockResolvedValue([{ targetId: new Types.ObjectId(blockedDriverId) }]),
      } as never)

      bidAggregateMock.mockResolvedValue([
        {
          driverId: new Types.ObjectId(blockedDriverId),
          driverName: 'Blocked Driver',
          driverEmail: 'blocked@example.com',
          acceptedAt: new Date('2024-01-20'),
        },
      ])

      loadAggregateMock.mockResolvedValue([])

      const result = await getKnownUsersForBlocklist(companyId)

      expect(result).toHaveLength(0)
    })

    it('filters out loads with no assigned driver', async () => {
      const selectMock = jest.fn().mockResolvedValue({ _id: new Types.ObjectId(companyId), role: 'company' })
      findByIdUserMock.mockReturnValue({ select: selectMock } as never)
      findBlocklistMock.mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      } as never)

      bidAggregateMock.mockResolvedValue([])

      loadAggregateMock.mockResolvedValue([
        {
          assignedDriverId: null,
          driverName: 'No Driver',
          driverEmail: 'nodriver@example.com',
          status: 'Booked',
        },
      ])

      const result = await getKnownUsersForBlocklist(companyId)

      expect(result).toHaveLength(0)
    })
  })

  it('returns empty array when there are no interactions', async () => {
    const selectMock = jest.fn().mockResolvedValue({ _id: new Types.ObjectId('000000000000000000000033'), role: 'driver' })
    findByIdUserMock.mockReturnValue({ select: selectMock } as never)
    findBlocklistMock.mockReturnValue({
      lean: jest.fn().mockResolvedValue([]),
    } as never)

    bidAggregateMock.mockResolvedValue([])
    loadAggregateMock.mockResolvedValue([])

    const result = await getKnownUsersForBlocklist('000000000000000000000033')

    expect(result).toEqual([])
  })
})
