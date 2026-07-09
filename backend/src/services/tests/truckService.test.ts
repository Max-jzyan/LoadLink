import { StatusCodes } from 'http-status-codes'
import { TruckModel } from '../../models/trucks/Truck'
import { DriverModel } from '../../models/users/Driver'
import {
  listTrucks,
  getTruck,
  createTruck,
  updateTruck,
  deleteTruck,
  updateTruckExpenses,
  setPrimaryTruck,
} from '../truckService'

// TruckModel/DriverModel both declare virtual getters; jest's automock
// chokes trying to introspect those, so provide minimal manual mocks.
jest.mock('../../models/trucks/Truck', () => ({
  TruckModel: {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneAndDelete: jest.fn(),
    findOneAndUpdate: jest.fn(),
    countDocuments: jest.fn(),
    updateMany: jest.fn(),
    create: jest.fn(),
  },
}))
jest.mock('../../models/users/Driver', () => ({
  DriverModel: { findByIdAndUpdate: jest.fn() },
}))

const findTruckMock = jest.mocked(TruckModel.find)
const findOneTruckMock = jest.mocked(TruckModel.findOne)
const findOneAndDeleteTruckMock = jest.mocked(TruckModel.findOneAndDelete)
const findOneAndUpdateTruckMock = jest.mocked(TruckModel.findOneAndUpdate)
const countTruckMock = jest.mocked(TruckModel.countDocuments)
const updateManyTruckMock = jest.mocked(TruckModel.updateMany)
const createTruckMock = jest.mocked(TruckModel.create)
const findDriverByIdAndUpdateMock = jest.mocked(DriverModel.findByIdAndUpdate)

const DRIVER_ID = '000000000000000000000011'
const TRUCK_ID = '000000000000000000000401'
const INVALID_ID = 'not-an-object-id'

function baseTruckData() {
  return {
    make: 'Freightliner',
    model: 'Cascadia',
    year: 2022,
    truckType: 'DryVan' as const,
    trailerLengthFt: 53,
    capacityLbs: 45000,
    plateNumber: 'ABC123',
  }
}

function fakeTruck(overrides: Record<string, unknown> = {}): Record<string, any> {
  return {
    _id: { toString: () => TRUCK_ID },
    isPrimary: false,
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

beforeEach(() => {
  jest.resetAllMocks()
})

describe('listTrucks', () => {
  it('sorts primary first, then newest', async () => {
    const sortMock = jest.fn().mockResolvedValue([])
    findTruckMock.mockReturnValue({ sort: sortMock } as never)

    await listTrucks(DRIVER_ID)

    expect(sortMock).toHaveBeenCalledWith({ isPrimary: -1, createdAt: -1 })
  })
})

describe('getTruck', () => {
  it('400s on an invalid truckId', async () => {
    await expect(getTruck(DRIVER_ID, INVALID_ID)).rejects.toMatchObject({
      statusCode: StatusCodes.BAD_REQUEST,
    })
  })

  it('404s when the truck does not exist for this driver', async () => {
    findOneTruckMock.mockResolvedValue(null)

    await expect(getTruck(DRIVER_ID, TRUCK_ID)).rejects.toMatchObject({
      statusCode: StatusCodes.NOT_FOUND,
    })
  })

  it('returns the truck when found', async () => {
    const truck = fakeTruck()
    findOneTruckMock.mockResolvedValue(truck as never)

    await expect(getTruck(DRIVER_ID, TRUCK_ID)).resolves.toBe(truck)
  })
})

describe('createTruck', () => {
  it('400s on an invalid truck type', async () => {
    await expect(
      createTruck(DRIVER_ID, { ...baseTruckData(), truckType: 'Spaceship' as never })
    ).rejects.toMatchObject({ statusCode: StatusCodes.BAD_REQUEST })
  })

  it('400s on an invalid certification', async () => {
    await expect(
      createTruck(DRIVER_ID, { ...baseTruckData(), certifications: ['NotACert' as never] })
    ).rejects.toMatchObject({ statusCode: StatusCodes.BAD_REQUEST })
  })

  it("auto-sets isPrimary when this is the driver's first truck", async () => {
    countTruckMock.mockResolvedValue(0)
    createTruckMock.mockResolvedValue(fakeTruck() as never)

    await createTruck(DRIVER_ID, baseTruckData())

    expect(updateManyTruckMock).toHaveBeenCalled()
    expect(createTruckMock).toHaveBeenCalledWith(expect.objectContaining({ isPrimary: true }))
  })

  it('does not auto-set isPrimary when the driver already has trucks', async () => {
    countTruckMock.mockResolvedValue(2)
    createTruckMock.mockResolvedValue(fakeTruck() as never)

    await createTruck(DRIVER_ID, baseTruckData())

    expect(updateManyTruckMock).not.toHaveBeenCalled()
    expect(createTruckMock).toHaveBeenCalledWith(expect.objectContaining({ isPrimary: false }))
  })

  it('links the new truck onto the driver document', async () => {
    countTruckMock.mockResolvedValue(1)
    const truck = fakeTruck()
    createTruckMock.mockResolvedValue(truck as never)

    await createTruck(DRIVER_ID, baseTruckData())

    expect(findDriverByIdAndUpdateMock).toHaveBeenCalledWith(DRIVER_ID, {
      $addToSet: { trucks: truck._id },
    })
  })
})

describe('updateTruck', () => {
  it('400s on an invalid truck type', async () => {
    await expect(
      updateTruck(DRIVER_ID, TRUCK_ID, { truckType: 'Spaceship' as never })
    ).rejects.toMatchObject({ statusCode: StatusCodes.BAD_REQUEST })
  })

  it('400s on an invalid certification', async () => {
    await expect(
      updateTruck(DRIVER_ID, TRUCK_ID, { certifications: ['NotACert' as never] })
    ).rejects.toMatchObject({ statusCode: StatusCodes.BAD_REQUEST })
  })

  it('400s on an invalid truckId', async () => {
    await expect(updateTruck(DRIVER_ID, INVALID_ID, { notes: 'x' })).rejects.toMatchObject({
      statusCode: StatusCodes.BAD_REQUEST,
    })
  })

  it('404s when the truck does not exist for this driver', async () => {
    findOneTruckMock.mockResolvedValue(null)

    await expect(updateTruck(DRIVER_ID, TRUCK_ID, { notes: 'x' })).rejects.toMatchObject({
      statusCode: StatusCodes.NOT_FOUND,
    })
  })

  it('unsets other primary trucks when this one is newly made primary', async () => {
    const truck = fakeTruck({ isPrimary: false })
    findOneTruckMock.mockResolvedValue(truck as never)

    await updateTruck(DRIVER_ID, TRUCK_ID, { isPrimary: true })

    expect(updateManyTruckMock).toHaveBeenCalledWith(
      { ownerDriverId: expect.anything(), _id: { $ne: truck._id } },
      { $set: { isPrimary: false } }
    )
    expect(truck.isPrimary).toBe(true)
  })

  it('does not touch other primaries when already primary', async () => {
    const truck = fakeTruck({ isPrimary: true })
    findOneTruckMock.mockResolvedValue(truck as never)

    await updateTruck(DRIVER_ID, TRUCK_ID, { isPrimary: true })

    expect(updateManyTruckMock).not.toHaveBeenCalled()
  })

  it('applies field updates and saves', async () => {
    const truck = fakeTruck()
    findOneTruckMock.mockResolvedValue(truck as never)

    await updateTruck(DRIVER_ID, TRUCK_ID, { notes: 'new notes' })

    expect(truck.notes).toBe('new notes')
    expect(truck.save).toHaveBeenCalled()
  })
})

describe('deleteTruck', () => {
  it('400s on an invalid truckId', async () => {
    await expect(deleteTruck(DRIVER_ID, INVALID_ID)).rejects.toMatchObject({
      statusCode: StatusCodes.BAD_REQUEST,
    })
  })

  it('404s when the truck does not exist for this driver', async () => {
    findOneAndDeleteTruckMock.mockResolvedValue(null)

    await expect(deleteTruck(DRIVER_ID, TRUCK_ID)).rejects.toMatchObject({
      statusCode: StatusCodes.NOT_FOUND,
    })
  })

  it('unlinks the truck from the driver document', async () => {
    const truck = fakeTruck({ isPrimary: false })
    findOneAndDeleteTruckMock.mockResolvedValue(truck as never)

    await deleteTruck(DRIVER_ID, TRUCK_ID)

    expect(findDriverByIdAndUpdateMock).toHaveBeenCalledWith(DRIVER_ID, {
      $pull: { trucks: truck._id },
    })
  })

  it('promotes the next oldest truck to primary when the deleted one was primary', async () => {
    const deleted = fakeTruck({ isPrimary: true })
    findOneAndDeleteTruckMock.mockResolvedValue(deleted as never)
    const nextTruck = fakeTruck({ isPrimary: false })
    findOneTruckMock.mockReturnValue({ sort: jest.fn().mockResolvedValue(nextTruck) } as never)

    await deleteTruck(DRIVER_ID, TRUCK_ID)

    expect(nextTruck.isPrimary).toBe(true)
    expect(nextTruck.save).toHaveBeenCalled()
  })

  it('does nothing extra when the deleted truck was not primary', async () => {
    const deleted = fakeTruck({ isPrimary: false })
    findOneAndDeleteTruckMock.mockResolvedValue(deleted as never)

    await deleteTruck(DRIVER_ID, TRUCK_ID)

    expect(findOneTruckMock).not.toHaveBeenCalled()
  })
})

describe('updateTruckExpenses', () => {
  it('400s on invalid ids', async () => {
    await expect(updateTruckExpenses(INVALID_ID, TRUCK_ID, {})).rejects.toMatchObject({
      statusCode: StatusCodes.BAD_REQUEST,
    })
    await expect(updateTruckExpenses(DRIVER_ID, INVALID_ID, {})).rejects.toMatchObject({
      statusCode: StatusCodes.BAD_REQUEST,
    })
  })

  it('400s when no allowed expense fields are present', async () => {
    await expect(updateTruckExpenses(DRIVER_ID, TRUCK_ID, { bogus: 1 })).rejects.toMatchObject({
      statusCode: StatusCodes.BAD_REQUEST,
    })
  })

  it('404s when the truck does not exist for this driver', async () => {
    findOneAndUpdateTruckMock.mockResolvedValue(null)

    await expect(
      updateTruckExpenses(DRIVER_ID, TRUCK_ID, { fuelCostPerLiter: 2 })
    ).rejects.toMatchObject({ statusCode: StatusCodes.NOT_FOUND })
  })

  it('namespaces allowed fields under expensePreferences', async () => {
    findOneAndUpdateTruckMock.mockResolvedValue(fakeTruck() as never)

    await updateTruckExpenses(DRIVER_ID, TRUCK_ID, {
      fuelCostPerLiter: 2,
      maintenancePerKm: null,
    })

    expect(findOneAndUpdateTruckMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        $set: {
          'expensePreferences.fuelCostPerLiter': 2,
          'expensePreferences.maintenancePerKm': null,
        },
      },
      { new: true, runValidators: true }
    )
  })
})

describe('setPrimaryTruck', () => {
  it('400s on an invalid truckId', async () => {
    await expect(setPrimaryTruck(DRIVER_ID, INVALID_ID)).rejects.toMatchObject({
      statusCode: StatusCodes.BAD_REQUEST,
    })
  })

  it('404s when the truck does not exist for this driver', async () => {
    findOneTruckMock.mockResolvedValue(null)

    await expect(setPrimaryTruck(DRIVER_ID, TRUCK_ID)).rejects.toMatchObject({
      statusCode: StatusCodes.NOT_FOUND,
    })
  })

  it('unsets other primaries and marks this truck primary', async () => {
    const truck = fakeTruck({ isPrimary: false })
    findOneTruckMock.mockResolvedValue(truck as never)

    await setPrimaryTruck(DRIVER_ID, TRUCK_ID)

    expect(updateManyTruckMock).toHaveBeenCalledWith(
      { ownerDriverId: expect.anything() },
      { $set: { isPrimary: false } }
    )
    expect(truck.isPrimary).toBe(true)
    expect(truck.save).toHaveBeenCalled()
  })
})
