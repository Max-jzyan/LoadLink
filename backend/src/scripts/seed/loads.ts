import { Types } from 'mongoose'
import { LoadModel } from '../../models/loads/Load'
import { LOAD_STATUSES, TRUCK_TYPES } from '../../models/enums'

/** Seed the loads collection: one load owned by the given company. */
export async function seedLoads({ companyId }: { companyId: Types.ObjectId }) {
  await LoadModel.deleteMany({})

  const load = await LoadModel.create({
    companyId,
    createdBy: companyId,
    originAddress: 'Newark, NJ',
    destinationAddress: 'Chicago, IL (ORD)',
    originCoords: { lat: 40.7357, lng: -74.1724 },
    destinationCoords: { lat: 41.9742, lng: -87.9073 },
    pickupTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
    dropoffTime: new Date(Date.now() + 48 * 60 * 60 * 1000),
    weightLbs: 55000,
    commodity: 'Frozen Produce',
    truckType: TRUCK_TYPES.Reefer,
    trailerLengthFt: 53,
    certifications: ['Reefer HACCP'],
    driverAssist: false,
    status: LOAD_STATUSES.AuctionLive,
  })

  return load
}
