import { StatusCodes } from 'http-status-codes'
import { Types } from 'mongoose'
import { ApiError } from '../../utils/ApiError'
import { MessageModel } from '../../models/messages/Message'
import { LoadModel } from '../../models/loads/Load'
import { UserModel } from '../../models/users/User'
import { emitThreadMessage } from '../../events/messageEvents'
import { notifyMessageReceived } from '../notificationService'
import {
  getThreadContext,
  getThread,
  sendMessage,
  markThreadRead,
  getUnreadCounts,
  listThreads,
} from '../messageService'

jest.mock('../../models/messages/Message', () => ({
  MESSAGE_BODY_MAX_LENGTH: 2000,
  MessageModel: {
    find: jest.fn(),
    create: jest.fn(),
    updateMany: jest.fn(),
    aggregate: jest.fn(),
  },
}))
jest.mock('../../models/loads/Load', () => ({
  LoadModel: { findById: jest.fn(), find: jest.fn() },
}))
jest.mock('../../models/users/User', () => ({
  UserModel: { findById: jest.fn(), find: jest.fn() },
}))
jest.mock('../../events/messageEvents')
jest.mock('../notificationService')

const findLoadMock = jest.mocked(LoadModel.findById)
const findLoadsMock = jest.mocked(LoadModel.find)
const findUserMock = jest.mocked(UserModel.findById)
const findUsersMock = jest.mocked(UserModel.find)
const findMessagesMock = jest.mocked(MessageModel.find)
const createMessageMock = jest.mocked(MessageModel.create)
const updateManyMock = jest.mocked(MessageModel.updateMany)
const aggregateMock = jest.mocked(MessageModel.aggregate)
const emitThreadMessageMock = jest.mocked(emitThreadMessage)
const notifyMessageReceivedMock = jest.mocked(notifyMessageReceived)

const COMPANY_ID = '000000000000000000000001'
const DRIVER_ID = '000000000000000000000002'
const OUTSIDER_ID = '000000000000000000000003'
const LOAD_ID = '000000000000000000000101'
const INVALID_ID = 'not-an-object-id'

/** Chainable mock for LoadModel.findById().select().lean() */
function mockLoad(load: Record<string, unknown> | null) {
  findLoadMock.mockReturnValue({
    select: () => ({ lean: () => Promise.resolve(load) }),
  } as never)
}

function mockUser(user: Record<string, unknown> | null) {
  findUserMock.mockReturnValue({
    select: () => ({ lean: () => Promise.resolve(user) }),
  } as never)
}

function bookedLoad() {
  return {
    companyId: new Types.ObjectId(COMPANY_ID),
    assignedDriverId: new Types.ObjectId(DRIVER_ID),
  }
}

beforeEach(() => {
  jest.resetAllMocks()
})

describe('getThreadContext', () => {
  it('rejects invalid ids', async () => {
    await expect(getThreadContext(INVALID_ID, COMPANY_ID)).rejects.toMatchObject({
      statusCode: StatusCodes.BAD_REQUEST,
    })
  })

  it('404s when the load does not exist', async () => {
    mockLoad(null)
    await expect(getThreadContext(LOAD_ID, COMPANY_ID)).rejects.toMatchObject({
      statusCode: StatusCodes.NOT_FOUND,
    })
  })

  it('409s when no driver has been assigned yet', async () => {
    mockLoad({ companyId: new Types.ObjectId(COMPANY_ID), assignedDriverId: null })
    await expect(getThreadContext(LOAD_ID, COMPANY_ID)).rejects.toMatchObject({
      statusCode: StatusCodes.CONFLICT,
    })
  })

  it('resolves the driver as counterparty when the company asks', async () => {
    mockLoad(bookedLoad())
    const ctx = await getThreadContext(LOAD_ID, COMPANY_ID)
    expect(ctx.counterpartyId).toBe(DRIVER_ID)
    expect(ctx.counterpartyRole).toBe('driver')
  })

  it('resolves the company as counterparty when the driver asks', async () => {
    mockLoad(bookedLoad())
    const ctx = await getThreadContext(LOAD_ID, DRIVER_ID)
    expect(ctx.counterpartyId).toBe(COMPANY_ID)
    expect(ctx.counterpartyRole).toBe('company')
  })

  it('403s for a user who is neither company nor assigned driver', async () => {
    mockLoad(bookedLoad())
    await expect(getThreadContext(LOAD_ID, OUTSIDER_ID)).rejects.toMatchObject({
      statusCode: StatusCodes.FORBIDDEN,
    })
  })
})

describe('getThread', () => {
  it('returns chronological messages plus counterparty info', async () => {
    mockLoad(bookedLoad())
    const messages = [{ _id: 'm1', body: 'hi' }]
    const sortMock = jest.fn().mockReturnValue({ lean: () => Promise.resolve(messages) })
    findMessagesMock.mockReturnValue({ sort: sortMock } as never)
    mockUser({ _id: new Types.ObjectId(DRIVER_ID), name: 'Dan Driver', profilePictureUrl: '' })

    const thread = await getThread(LOAD_ID, COMPANY_ID)

    expect(sortMock).toHaveBeenCalledWith({ createdAt: 1 })
    expect(thread.messages).toEqual(messages)
    expect(thread.counterparty).toMatchObject({
      _id: DRIVER_ID,
      name: 'Dan Driver',
      role: 'driver',
    })
  })

  it('scopes the message query to the current company/driver pair, not just loadId', async () => {
    // Regression test: a load can be cancelled, reopened, and re-awarded to a
    // different driver. Messages from a previous driver's tenure must not
    // leak to whoever is assigned now — the query has to filter on the
    // current participant pair, not merely match every message on the load.
    mockLoad(bookedLoad())
    const sortMock = jest.fn().mockReturnValue({ lean: () => Promise.resolve([]) })
    findMessagesMock.mockReturnValue({ sort: sortMock } as never)
    mockUser({ _id: new Types.ObjectId(COMPANY_ID), name: 'Acme Freight', profilePictureUrl: '' })

    await getThread(LOAD_ID, DRIVER_ID)

    const filter = findMessagesMock.mock.calls[0][0] as unknown as Record<string, unknown>
    expect(filter.loadId?.toString()).toBe(LOAD_ID)
    expect(filter.$or).toEqual([
      {
        senderId: expect.objectContaining({ toString: expect.any(Function) }),
        recipientId: expect.objectContaining({ toString: expect.any(Function) }),
      },
      {
        senderId: expect.objectContaining({ toString: expect.any(Function) }),
        recipientId: expect.objectContaining({ toString: expect.any(Function) }),
      },
    ])
    const pairs = (filter.$or as { senderId: Types.ObjectId; recipientId: Types.ObjectId }[]).map(
      (p) => [p.senderId.toString(), p.recipientId.toString()]
    )
    expect(pairs).toContainEqual([COMPANY_ID, DRIVER_ID])
    expect(pairs).toContainEqual([DRIVER_ID, COMPANY_ID])
  })
})

describe('sendMessage', () => {
  it('rejects an empty body', async () => {
    await expect(sendMessage(LOAD_ID, COMPANY_ID, '   ')).rejects.toMatchObject({
      statusCode: StatusCodes.BAD_REQUEST,
    })
    expect(createMessageMock).not.toHaveBeenCalled()
  })

  it('rejects a body over the max length', async () => {
    await expect(sendMessage(LOAD_ID, COMPANY_ID, 'x'.repeat(2001))).rejects.toMatchObject({
      statusCode: StatusCodes.BAD_REQUEST,
    })
  })

  it('persists the message, emits SSE, and notifies the recipient', async () => {
    mockLoad(bookedLoad())
    const saved = { toObject: () => ({ _id: 'm1', body: 'Gate code is 4417' }) }
    createMessageMock.mockResolvedValue(saved as never)
    mockUser({ name: 'Acme Freight' })

    const result = await sendMessage(LOAD_ID, COMPANY_ID, '  Gate code is 4417  ')

    expect(createMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({ body: 'Gate code is 4417' })
    )
    const createArg = createMessageMock.mock.calls[0][0] as Record<string, Types.ObjectId>
    expect(createArg.senderId.toString()).toBe(COMPANY_ID)
    expect(createArg.recipientId.toString()).toBe(DRIVER_ID)

    expect(emitThreadMessageMock).toHaveBeenCalledWith(LOAD_ID, {
      _id: 'm1',
      body: 'Gate code is 4417',
    })
    expect(notifyMessageReceivedMock).toHaveBeenCalledWith(DRIVER_ID, {
      loadId: LOAD_ID,
      senderName: 'Acme Freight',
      preview: 'Gate code is 4417',
      recipientRole: 'driver',
    })
    expect(result).toBe(saved)
  })

  it('refuses to send when the caller is not a participant', async () => {
    mockLoad(bookedLoad())
    await expect(sendMessage(LOAD_ID, OUTSIDER_ID, 'hello')).rejects.toMatchObject({
      statusCode: StatusCodes.FORBIDDEN,
    })
    expect(createMessageMock).not.toHaveBeenCalled()
  })
})

describe('markThreadRead', () => {
  it('marks only messages addressed to the caller as read', async () => {
    mockLoad(bookedLoad())
    updateManyMock.mockResolvedValue({ modifiedCount: 3 } as never)

    const result = await markThreadRead(LOAD_ID, DRIVER_ID)

    const filter = updateManyMock.mock.calls[0][0] as unknown as Record<string, unknown>
    expect((filter.recipientId as Types.ObjectId).toString()).toBe(DRIVER_ID)
    expect(filter.isRead).toBe(false)
    expect(result).toEqual({ modifiedCount: 3 })
  })
})

describe('listThreads', () => {
  it('rejects an invalid userId', async () => {
    await expect(listThreads(INVALID_ID)).rejects.toBeInstanceOf(ApiError)
  })

  it('returns [] without touching Load/User when there are no messages', async () => {
    aggregateMock.mockResolvedValue([])

    await expect(listThreads(DRIVER_ID)).resolves.toEqual([])

    expect(findLoadsMock).not.toHaveBeenCalled()
    expect(findUsersMock).not.toHaveBeenCalled()
  })

  it('builds thread summaries with counterparty, last message and unread count', async () => {
    aggregateMock.mockResolvedValue([
      {
        _id: new Types.ObjectId(LOAD_ID),
        lastMessage: {
          body: 'Running 20 min late',
          senderId: new Types.ObjectId(DRIVER_ID),
          createdAt: new Date('2026-07-15T10:00:00Z'),
        },
        unreadCount: 2,
      },
    ] as never)
    findLoadsMock.mockReturnValue({
      select: () => ({
        lean: () =>
          Promise.resolve([
            {
              _id: new Types.ObjectId(LOAD_ID),
              originAddress: 'Vancouver, BC',
              destinationAddress: 'Calgary, AB',
              status: 'in_transit',
              companyId: new Types.ObjectId(COMPANY_ID),
              assignedDriverId: new Types.ObjectId(DRIVER_ID),
            },
          ]),
      }),
    } as never)
    findUsersMock.mockReturnValue({
      select: () => ({
        lean: () =>
          Promise.resolve([
            { _id: new Types.ObjectId(DRIVER_ID), name: 'Dan Driver', profilePictureUrl: '' },
          ]),
      }),
    } as never)

    const threads = await listThreads(COMPANY_ID)

    expect(threads).toHaveLength(1)
    expect(threads[0]).toMatchObject({
      loadId: LOAD_ID,
      originAddress: 'Vancouver, BC',
      destinationAddress: 'Calgary, AB',
      loadStatus: 'in_transit',
      counterparty: { _id: DRIVER_ID, name: 'Dan Driver', role: 'driver' },
      lastMessage: { body: 'Running 20 min late', senderId: DRIVER_ID },
      unreadCount: 2,
    })
  })

  it('skips threads whose load no longer exists', async () => {
    aggregateMock.mockResolvedValue([
      {
        _id: new Types.ObjectId(LOAD_ID),
        lastMessage: {
          body: 'hi',
          senderId: new Types.ObjectId(DRIVER_ID),
          createdAt: new Date(),
        },
        unreadCount: 0,
      },
    ] as never)
    findLoadsMock.mockReturnValue({
      select: () => ({ lean: () => Promise.resolve([]) }),
    } as never)
    findUsersMock.mockReturnValue({
      select: () => ({ lean: () => Promise.resolve([]) }),
    } as never)

    await expect(listThreads(COMPANY_ID)).resolves.toEqual([])
  })
})

describe('getUnreadCounts', () => {
  it('rejects an invalid userId', async () => {
    await expect(getUnreadCounts(INVALID_ID)).rejects.toBeInstanceOf(ApiError)
  })

  it('returns the total and a per-load breakdown', async () => {
    aggregateMock.mockResolvedValue([
      { _id: new Types.ObjectId(LOAD_ID), count: 2 },
      { _id: new Types.ObjectId('000000000000000000000102'), count: 1 },
    ] as never)

    const result = await getUnreadCounts(DRIVER_ID)

    expect(result.total).toBe(3)
    expect(result.byLoad[LOAD_ID]).toBe(2)
  })
})
