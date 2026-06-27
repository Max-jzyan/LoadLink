import { Types } from 'mongoose'
import { ReviewModel } from '../../models/ratings/Review'
import { TARGET_TYPES } from '../../models/ratings/Review'
import { MS_PER_HOUR } from '../../constants/auction'
import type { SeedDriverKey } from './users'

// Fixed ObjectIds for seeded reviews (range: ...0501 – ...0506)
const REVIEW_IDS = {
  driver1OnCompany1: new Types.ObjectId('000000000000000000000501'),
  driver2OnCompany2: new Types.ObjectId('000000000000000000000502'),
  company1OnDriver3: new Types.ObjectId('000000000000000000000503'),
  company2OnDriver4: new Types.ObjectId('000000000000000000000504'),
  driver3OnCompany1: new Types.ObjectId('000000000000000000000505'),
  company1OnDriver1: new Types.ObjectId('000000000000000000000506'),
}

type DriverDoc = Awaited<ReturnType<typeof import('./users').seedUsers>>['drivers'][SeedDriverKey]
// Only need _id from companies — use a simple object type
type CompanyRef = { _id: Types.ObjectId }

/**
 * Seed mixed reviews:
 *   - Drivers reviewing companies they hauled for
 *   - Companies reviewing drivers who completed their loads
 * Reviews reference existing loads, companies, and drivers from the seed data.
 */
export async function seedReviews(
  loads: Array<{ _id: Types.ObjectId; companyId: Types.ObjectId }>,
  companies: { testCompany1: CompanyRef; testCompany2: CompanyRef },
  drivers: Record<SeedDriverKey, DriverDoc>
) {
  // Delete existing reviews to avoid unique index conflicts
  await ReviewModel.deleteMany({})
  // Ensure the deletion is committed before proceeding
  await ReviewModel.syncIndexes()

  // Build a lookup: companyId -> loadId
  // Use the first load from each company for review associations
  const companyToLoad = new Map<string, Types.ObjectId>()
  for (const load of loads) {
    const cid = load.companyId.toString()
    if (!companyToLoad.has(cid)) {
      companyToLoad.set(cid, load._id)
    }
  }

  const reviewDocs = [
    {
      _id: REVIEW_IDS.driver1OnCompany1,
      reviewerId: drivers.testUser1._id,
      targetId: companies.testCompany1._id,
      targetType: TARGET_TYPES.COMPANY,
      loadId: companyToLoad.get(companies.testCompany1._id.toString())!,
      ratingCategories: {
        timeliness: 5,
        communication: 4,
        reliability: 5,
        professionalism: 4,
        documentationAccuracy: 5,
      },
      comment: 'Great company to work with. Clear communication and on-time pickup.',
      createdAt: new Date(Date.now() - 7 * 24 * MS_PER_HOUR),
    },
    {
      _id: REVIEW_IDS.driver2OnCompany2,
      reviewerId: drivers.testUser2._id,
      targetId: companies.testCompany2._id,
      targetType: TARGET_TYPES.COMPANY,
      loadId: companyToLoad.get(companies.testCompany2._id.toString())!,
      ratingCategories: {
        timeliness: 4,
        communication: 3,
        reliability: 4,
        professionalism: 4,
        documentationAccuracy: 3,
      },
      comment: 'Decent experience. Documentation could be better prepared.',
      createdAt: new Date(Date.now() - 3 * 24 * MS_PER_HOUR),
    },
    {
      _id: REVIEW_IDS.company1OnDriver3,
      reviewerId: companies.testCompany1._id,
      targetId: drivers.testUser3._id,
      targetType: TARGET_TYPES.DRIVER,
      loadId: companyToLoad.get(companies.testCompany1._id.toString())!,
      ratingCategories: {
        timeliness: 5,
        communication: 5,
        reliability: 5,
        professionalism: 5,
        documentationAccuracy: 5,
      },
      comment: 'Excellent driver. Delivered ahead of schedule and kept us updated throughout.',
      createdAt: new Date(Date.now() - 5 * 24 * MS_PER_HOUR),
    },
    {
      _id: REVIEW_IDS.company2OnDriver4,
      reviewerId: companies.testCompany2._id,
      targetId: drivers.testUser4._id,
      targetType: TARGET_TYPES.DRIVER,
      loadId: companyToLoad.get(companies.testCompany2._id.toString())!,
      ratingCategories: {
        timeliness: 3,
        communication: 4,
        reliability: 3,
        professionalism: 4,
        documentationAccuracy: 4,
      },
      comment: 'Reliable driver but was slightly behind schedule. Good communication though.',
      createdAt: new Date(Date.now() - 2 * 24 * MS_PER_HOUR),
    },
    {
      _id: REVIEW_IDS.driver3OnCompany1,
      reviewerId: drivers.testUser3._id,
      targetId: companies.testCompany1._id,
      targetType: TARGET_TYPES.COMPANY,
      loadId: companyToLoad.get(companies.testCompany1._id.toString())!,
      ratingCategories: {
        timeliness: 4,
        communication: 4,
        reliability: 4,
        professionalism: 5,
        documentationAccuracy: 4,
      },
      comment: 'Professional team. Would haul for them again.',
      createdAt: new Date(Date.now() - 1 * 24 * MS_PER_HOUR),
    },
    {
      _id: REVIEW_IDS.company1OnDriver1,
      reviewerId: companies.testCompany1._id,
      targetId: drivers.testUser1._id,
      targetType: TARGET_TYPES.DRIVER,
      loadId: companyToLoad.get(companies.testCompany1._id.toString())!,
      ratingCategories: {
        timeliness: 4,
        communication: 3,
        reliability: 4,
        professionalism: 4,
        documentationAccuracy: 3,
      },
      comment: 'Good driver overall. A bit slow on communication but delivery was on time.',
      createdAt: new Date(Date.now() - 12 * MS_PER_HOUR),
    },
  ]

  // Insert reviews - use ordered: false to continue on duplicate key errors
  let reviews
  try {
    reviews = await ReviewModel.insertMany(reviewDocs, { ordered: false })
  } catch (err: any) {
    // If duplicate key error, fetch the reviews that were successfully inserted
    if (err.code === 11000 || err.message?.includes('duplicate key')) {
      console.log('Some reviews already exist, fetching existing reviews...')
      reviews = await ReviewModel.find({ _id: { $in: reviewDocs.map((d) => d._id) } })
    } else {
      throw err
    }
  }

  return reviews
}