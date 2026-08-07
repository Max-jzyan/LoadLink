import { Types } from 'mongoose'
import { AuctionModel } from '../../models/loads/Auction'
import { LoadModel } from '../../models/loads/Load'
import { AUCTION_STATUSES, CURRENCIES } from '../../models/enums'

const AUCTION_ID_BY_LOAD: Record<string, string> = {
  '000000000000000000000101': '000000000000000000000201',
  '000000000000000000000102': '000000000000000000000202',
  '000000000000000000000103': '000000000000000000000203',
  '000000000000000000000104': '000000000000000000000204',
  '000000000000000000000105': '000000000000000000000205',
  '000000000000000000000106': '000000000000000000000206',
  '000000000000000000000107': '000000000000000000000207',
  '000000000000000000000108': '000000000000000000000208',
  '000000000000000000000109': '000000000000000000000209',
  '000000000000000000000110': '000000000000000000000210',
  '000000000000000000000111': '000000000000000000000211',
  '000000000000000000000112': '000000000000000000000212',
  '000000000000000000000113': '000000000000000000000213',
  '000000000000000000000114': '000000000000000000000214',
  '000000000000000000000115': '000000000000000000000215',
  '000000000000000000000116': '000000000000000000000216',
  '000000000000000000000117': '000000000000000000000217',
  '000000000000000000000118': '000000000000000000000218',
  '000000000000000000000127': '000000000000000000000227',
  // Completed loads (historical hauls)
  '000000000000000000000119': '000000000000000000000219',
  '000000000000000000000120': '000000000000000000000220',
  '000000000000000000000121': '000000000000000000000221',
  '000000000000000000000122': '000000000000000000000222',
  '000000000000000000000123': '000000000000000000000223',
  '000000000000000000000124': '000000000000000000000224',
  '000000000000000000000125': '000000000000000000000225',
  '000000000000000000000126': '000000000000000000000226',
}

const AUCTION_PRICING_BY_LOAD: Record<
  string,
  { startPrice: number; capPrice: number; currentPrice: number }
> = {
  '000000000000000000000101': { startPrice: 850, capPrice: 1250, currentPrice: 910 },
  '000000000000000000000102': { startPrice: 450, capPrice: 750, currentPrice: 505 },
  '000000000000000000000103': { startPrice: 700, capPrice: 1050, currentPrice: 760 },
  '000000000000000000000104': { startPrice: 1100, capPrice: 1550, currentPrice: 1180 },
  '000000000000000000000105': { startPrice: 600, capPrice: 850, currentPrice: 850 },
  '000000000000000000000106': { startPrice: 950, capPrice: 1450, currentPrice: 1020 },
  '000000000000000000000107': { startPrice: 2777, capPrice: 4166, currentPrice: 3056 },
  '000000000000000000000108': { startPrice: 2606, capPrice: 3819, currentPrice: 2847 },
  '000000000000000000000109': { startPrice: 900, capPrice: 1300, currentPrice: 960 },
  '000000000000000000000110': { startPrice: 1050, capPrice: 1500, currentPrice: 1120 },
  '000000000000000000000111': { startPrice: 1400, capPrice: 1900, currentPrice: 1480 },
  '000000000000000000000112': { startPrice: 720, capPrice: 1080, currentPrice: 780 },
  '000000000000000000000113': { startPrice: 550, capPrice: 820, currentPrice: 600 },
  '000000000000000000000114': { startPrice: 1600, capPrice: 2200, currentPrice: 1700 },
  '000000000000000000000115': { startPrice: 720, capPrice: 1100, currentPrice: 790 },
  '000000000000000000000116': { startPrice: 640, capPrice: 980, currentPrice: 700 },
  '000000000000000000000117': { startPrice: 1450, capPrice: 2050, currentPrice: 1540 },
  '000000000000000000000118': { startPrice: 880, capPrice: 1320, currentPrice: 950 },
  // Demo load 127: priced well above testUser1's rate/value minimums to
  // push rateScore and valueScore near their caps.
  '000000000000000000000127': { startPrice: 3200, capPrice: 4200, currentPrice: 3200 },
  // Completed loads (historical hauls) — currentPrice reflects the final settled price
  '000000000000000000000119': { startPrice: 2700, capPrice: 3000, currentPrice: 2850 },
  '000000000000000000000120': { startPrice: 1600, capPrice: 1900, currentPrice: 1750 },
  '000000000000000000000121': { startPrice: 1950, capPrice: 2300, currentPrice: 2100 },
  '000000000000000000000122': { startPrice: 4000, capPrice: 4500, currentPrice: 4200 },
  '000000000000000000000123': { startPrice: 2900, capPrice: 3300, currentPrice: 3100 },
  '000000000000000000000124': { startPrice: 1750, capPrice: 2100, currentPrice: 1900 },
  '000000000000000000000125': { startPrice: 2400, capPrice: 2800, currentPrice: 2600 },
  '000000000000000000000126': { startPrice: 1450, capPrice: 1700, currentPrice: 1550 },
}

const NEAR_EXPIRY_MS_BY_LOAD: Record<string, number> = {
  '000000000000000000000102': 4 * 60 * 1000,
  '000000000000000000000103': 62 * 60 * 1000,
  '000000000000000000000105': 2 * 60 * 1000,
}

const PRICE_CREEP_DUE_SOON_MS_BY_LOAD: Record<string, number> = {
  '000000000000000000000104': 2 * 60 * 1000,
}

const AUTO_ACCEPT_TRIGGER_HOURS_BY_LOAD: Record<string, number> = {
  '000000000000000000000103': 1,
}

type SeedLoadRef = {
  _id: Types.ObjectId
  companyId: Types.ObjectId
  // null matches the Load schema's default for unassigned loads
  assignedDriverId?: Types.ObjectId | null
}

/** Seed active auctions for live loads and closed auctions for completed (historical) loads. */
export async function seedAuctions({
  loads,
  completedLoads = [],
}: {
  loads: Array<SeedLoadRef>
  completedLoads?: Array<SeedLoadRef>
}) {
  await AuctionModel.deleteMany({})

  const createAuction = async (
    load: SeedLoadRef,
    status: (typeof AUCTION_STATUSES)[keyof typeof AUCTION_STATUSES],
    expiresAt: Date
  ) => {
    const loadIdStr = load._id.toString()
    const pricing = AUCTION_PRICING_BY_LOAD[loadIdStr]
    const priceCreepIntervalHours = 1
    const priceCreepDueSoonMs = PRICE_CREEP_DUE_SOON_MS_BY_LOAD[loadIdStr]
    const lastPriceUpdateAt =
      priceCreepDueSoonMs == null
        ? undefined
        : new Date(Date.now() - priceCreepIntervalHours * 60 * 60 * 1000 + priceCreepDueSoonMs)

    const auction = await AuctionModel.create({
      _id: new Types.ObjectId(AUCTION_ID_BY_LOAD[loadIdStr]),
      loadId: load._id,
      companyId: load.companyId,
      startPrice: pricing.startPrice,
      capPrice: pricing.capPrice,
      autoAcceptPercent: 10,
      autoAcceptTriggerHours: AUTO_ACCEPT_TRIGGER_HOURS_BY_LOAD[loadIdStr] ?? 0,
      priceCreepAmount: 10,
      priceCreepIntervalHours,
      currentPrice: pricing.currentPrice,
      currency: CURRENCIES.CAD,
      expiresAt,
      status,
      ...(load.assignedDriverId ? { claimedByDriverId: load.assignedDriverId } : {}),
      ...(lastPriceUpdateAt ? { lastPriceUpdateAt } : {}),
    })

    await LoadModel.findByIdAndUpdate(load._id, { auctionId: auction._id })

    return auction
  }

  // Active auctions for live loads (expire in the future)
  const auctions = await Promise.all(
    loads.map((load) => {
      const loadIdStr = load._id.toString()
      const expiresInMs = NEAR_EXPIRY_MS_BY_LOAD[loadIdStr] ?? 4 * 60 * 60 * 1000
      return createAuction(load, AUCTION_STATUSES.Active, new Date(Date.now() + expiresInMs))
    })
  )

  // Closed auctions for completed (historical) loads (expired in the past)
  const closedAuctions = await Promise.all(
    completedLoads.map((load) =>
      createAuction(load, AUCTION_STATUSES.Closed, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
    )
  )

  return [...auctions, ...closedAuctions]
}
