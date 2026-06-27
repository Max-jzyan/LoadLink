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

const LOAD_IDS = {
  company1_load1: new Types.ObjectId('000000000000000000000101'),
  company1_load2: new Types.ObjectId('000000000000000000000102'),
  company2_load1: new Types.ObjectId('000000000000000000000103'),
}

type DriverDoc = Awaited<ReturnType<typeof import('./users').seedUsers>>['drivers'][SeedDriverKey]
type CompanyRef = { _id: Types.ObjectId }

/**
 * Seed mixed reviews:
 *   - Drivers reviewing companies they hauled for
 *   - Companies reviewing drivers who completed their loads
 * Reviews reference existing loads, companies, and drivers from the seed data.
 */
export async function seedReviews(
  _loads: Array<{ _id: Types.ObjectId; companyId: Types.ObjectId }>,
  companies: { testCompany1: CompanyRef; testCompany2: CompanyRef },
  drivers: Record<SeedDriverKey, DriverDoc>
) {
  await ReviewModel.deleteMany({})

  const reviewDocs = [
    {
      _id: REVIEW_IDS.driver1OnCompany1,
      reviewerId: drivers.testUser1._id,
      targetId: companies.testCompany1._id,
      targetType: TARGET_TYPES.COMPANY,
      loadId: LOAD_IDS.company1_load1,
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
      loadId: LOAD_IDS.company2_load1,
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
      loadId: LOAD_IDS.company1_load1,
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
      loadId: LOAD_IDS.company2_load1,
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
      loadId: LOAD_IDS.company1_load1,
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
      loadId: LOAD_IDS.company1_load2,
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

  return ReviewModel.insertMany(reviewDocs)
}
