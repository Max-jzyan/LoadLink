import { Types } from 'mongoose'
import { FavoriteAddressModel } from '../../models/favorites/FavoriteAddress'

const FAVORITE_ADDRESS_IDS: Record<string, Types.ObjectId> = {
  vancouver: new Types.ObjectId('000000000000000000000501'),
  calgary: new Types.ObjectId('000000000000000000000502'),
  toronto: new Types.ObjectId('000000000000000000000503'),
}

/** Seed a few saved addresses for testCompany1. */
export async function seedFavoriteAddresses(companyId: Types.ObjectId) {
  await FavoriteAddressModel.deleteMany({})

  const favorites = await FavoriteAddressModel.insertMany([
    {
      _id: FAVORITE_ADDRESS_IDS.vancouver,
      companyId,
      address: '350 W Georgia St, Vancouver, BC V6B 6B1',
      lat: 49.279659,
      lng: -123.115614,
    },
    {
      _id: FAVORITE_ADDRESS_IDS.calgary,
      companyId,
      address: '800 3 St SE, Calgary, AB T2G 2E7',
      lat: 51.0452524,
      lng: -114.0550886,
    },
    {
      _id: FAVORITE_ADDRESS_IDS.toronto,
      companyId,
      address: '789 Yonge St, Toronto, ON M4W 2G8',
      lat: 43.6718771,
      lng: -79.3866663,
    },
  ])

  return favorites
}
