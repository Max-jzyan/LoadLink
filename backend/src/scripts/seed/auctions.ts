import { Types } from 'mongoose'
import { AuctionModel } from '../../models/loads/Auction'
import { LoadModel } from '../../models/loads/Load'
import { AUCTION_STATUSES, CURRENCIES } from '../../models/enums'

const AUCTION_ID_BY_LOAD: Record<string, string> = {
  '000000000000000000000101': '000000000000000000000201',
  '000000000000000000000102': '000000000000000000000202',
  '000000000000000000000103': '000000000000000000000203',
  '000000000000000000000104': '000000000000000000000204',
}

const AUCTION_PRICING_BY_LOAD: Record<
  string,
  { startPrice: number; capPrice: number; currentPrice: number }
> = {
  '000000000000000000000101': { startPrice: 850, capPrice: 1250, currentPrice: 910 },
  '000000000000000000000102': { startPrice: 450, capPrice: 750, currentPrice: 505 },
  '000000000000000000000103': { startPrice: 700, capPrice: 1050, currentPrice: 760 },
  '000000000000000000000104': { startPrice: 1100, capPrice: 1550, currentPrice: 1180 },
}

const NEAR_EXPIRY_MS_BY_LOAD: Record<string, number> = {
  '000000000000000000000102': 4 * 60 * 1000,
  '000000000000000000000103': 62 * 60 * 1000,
}

const PRICE_CREEP_DUE_SOON_MS_BY_LOAD: Record<string, number> = {
  '000000000000000000000104': 2 * 60 * 1000,
}

const AUTO_ACCEPT_TRIGGER_HOURS_BY_LOAD: Record<string, number> = {
  '000000000000000000000103': 1,
}

/** Seed one active auction for each seeded load. */
export async function seedAuctions(
  loads: Array<{ _id: Types.ObjectId; companyId: Types.ObjectId }>
) {
  await AuctionModel.deleteMany({})

  const auctions = await Promise.all(
    loads.map(async (load) => {
      const loadIdStr = load._id.toString()
      const pricing = AUCTION_PRICING_BY_LOAD[loadIdStr]
      const expiresInMs = NEAR_EXPIRY_MS_BY_LOAD[loadIdStr] ?? 4 * 60 * 60 * 1000
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
        expiresAt: new Date(Date.now() + expiresInMs),
        status: AUCTION_STATUSES.Active,
        ...(lastPriceUpdateAt ? { lastPriceUpdateAt } : {}),
      })

      await LoadModel.findByIdAndUpdate(load._id, { auctionId: auction._id })

      return auction
    })
  )

  return auctions
}
