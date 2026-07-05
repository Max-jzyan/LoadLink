import { Types } from 'mongoose'
import { ReviewModel } from '../../models/ratings/Review'
import { TARGET_TYPES } from '../../models/ratings/Review'
import { recalculateRatingSummary } from '../../services/reviewService'
import { MS_PER_HOUR } from '../../constants/auction'
import type { SeedDriverKey } from './users'

// Fixed ObjectIds for seeded reviews (range: ...0501 – ...0517)
const REVIEW_IDS = {
  // Driver → Company reviews (7)
  driver1OnCompany1: new Types.ObjectId('000000000000000000000501'),
  driver2OnCompany2: new Types.ObjectId('000000000000000000000502'),
  driver3OnCompany1: new Types.ObjectId('000000000000000000000505'),
  driver4OnCompany2: new Types.ObjectId('000000000000000000000507'),
  driver5OnCompany1: new Types.ObjectId('000000000000000000000509'),
  driver1OnCompany2: new Types.ObjectId('000000000000000000000511'),
  driver2OnCompany1: new Types.ObjectId('000000000000000000000513'),

  // Company → Driver reviews (5) — all targeting testUser1
  company1OnDriver1_load101: new Types.ObjectId('000000000000000000000503'),
  company1OnDriver1_load102: new Types.ObjectId('000000000000000000000506'),
  company1OnDriver1_load105: new Types.ObjectId('000000000000000000000510'),
  company2OnDriver1_load103: new Types.ObjectId('000000000000000000000504'),
  company2OnDriver1_load104: new Types.ObjectId('000000000000000000000508'),
}

const LOAD_IDS = {
  company1_load1: new Types.ObjectId('000000000000000000000101'),
  company1_load2: new Types.ObjectId('000000000000000000000102'),
  company2_load1: new Types.ObjectId('000000000000000000000103'),
  company2_load2: new Types.ObjectId('000000000000000000000104'),
  company1_load3: new Types.ObjectId('000000000000000000000105'),
}

type DriverDoc = Awaited<ReturnType<typeof import('./users').seedUsers>>['drivers'][SeedDriverKey]
type CompanyRef = { _id: Types.ObjectId }

/**
 * Seed mixed reviews. Each (reviewerId, loadId) pair must be unique
 * due to the schema index. After insertion, recalculates ratingSummary
 * for every unique target user so Driver/Company documents reflect
 * the computed averages.
 */
export async function seedReviews(
  _loads: Array<{ _id: Types.ObjectId; companyId: Types.ObjectId }>,
  companies: { testCompany1: CompanyRef; testCompany2: CompanyRef },
  drivers: Record<SeedDriverKey, DriverDoc>
) {
  await ReviewModel.deleteMany({})

  const reviewDocs = [
    // ── Driver → Company reviews (7) ──────────────────────────────────
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
      _id: REVIEW_IDS.driver4OnCompany2,
      reviewerId: drivers.testUser4._id,
      targetId: companies.testCompany2._id,
      targetType: TARGET_TYPES.COMPANY,
      loadId: LOAD_IDS.company2_load2,
      ratingCategories: {
        timeliness: 5,
        communication: 5,
        reliability: 4,
        professionalism: 5,
        documentationAccuracy: 4,
      },
      comment: 'Top-notch company. Well-organized dispatch and prompt payment.',
      createdAt: new Date(Date.now() - 4 * 24 * MS_PER_HOUR),
    },
    {
      _id: REVIEW_IDS.driver5OnCompany1,
      reviewerId: drivers.testUser5._id,
      targetId: companies.testCompany1._id,
      targetType: TARGET_TYPES.COMPANY,
      loadId: LOAD_IDS.company1_load3,
      ratingCategories: {
        timeliness: 3,
        communication: 4,
        reliability: 3,
        professionalism: 4,
        documentationAccuracy: 5,
      },
      comment: 'Fair company but pickup was delayed by a few hours.',
      createdAt: new Date(Date.now() - 2 * 24 * MS_PER_HOUR),
    },
    {
      _id: REVIEW_IDS.driver1OnCompany2,
      reviewerId: drivers.testUser1._id,
      targetId: companies.testCompany2._id,
      targetType: TARGET_TYPES.COMPANY,
      loadId: LOAD_IDS.company2_load1,
      ratingCategories: {
        timeliness: 4,
        communication: 5,
        reliability: 4,
        professionalism: 5,
        documentationAccuracy: 4,
      },
      comment: 'Excellent company to work with. Very professional dispatch team.',
      createdAt: new Date(Date.now() - 6 * 24 * MS_PER_HOUR),
    },
    {
      _id: REVIEW_IDS.driver2OnCompany1,
      reviewerId: drivers.testUser2._id,
      targetId: companies.testCompany1._id,
      targetType: TARGET_TYPES.COMPANY,
      loadId: LOAD_IDS.company1_load2,
      ratingCategories: {
        timeliness: 5,
        communication: 4,
        reliability: 5,
        professionalism: 4,
        documentationAccuracy: 5,
      },
      comment: 'Smooth operation. Load was ready on time and paperwork was in order.',
      createdAt: new Date(Date.now() - 5 * 24 * MS_PER_HOUR),
    },

    // ── Company → Driver reviews (5) — all for testUser1 ──────────────
    // Company1 (001) owns loads 101, 102, 105 → 3 reviews
    // Company2 (002) owns loads 103, 104      → 2 reviews
    {
      _id: REVIEW_IDS.company1OnDriver1_load101,
      reviewerId: companies.testCompany1._id,
      targetId: drivers.testUser1._id,
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
      _id: REVIEW_IDS.company1OnDriver1_load102,
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
    {
      _id: REVIEW_IDS.company1OnDriver1_load105,
      reviewerId: companies.testCompany1._id,
      targetId: drivers.testUser1._id,
      targetType: TARGET_TYPES.DRIVER,
      loadId: LOAD_IDS.company1_load3,
      ratingCategories: {
        timeliness: 4,
        communication: 5,
        reliability: 4,
        professionalism: 5,
        documentationAccuracy: 4,
      },
      comment: 'Very reliable driver. Handled a large shipment with care.',
      createdAt: new Date(Date.now() - 3 * 24 * MS_PER_HOUR),
    },
    {
      _id: REVIEW_IDS.company2OnDriver1_load103,
      reviewerId: companies.testCompany2._id,
      targetId: drivers.testUser1._id,
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
      _id: REVIEW_IDS.company2OnDriver1_load104,
      reviewerId: companies.testCompany2._id,
      targetId: drivers.testUser1._id,
      targetType: TARGET_TYPES.DRIVER,
      loadId: LOAD_IDS.company2_load2,
      ratingCategories: {
        timeliness: 5,
        communication: 4,
        reliability: 5,
        professionalism: 5,
        documentationAccuracy: 4,
      },
      comment: 'Outstanding driver. Very professional and careful with the cargo.',
      createdAt: new Date(Date.now() - 8 * 24 * MS_PER_HOUR),
    },
  ]

  const inserted = await ReviewModel.insertMany(reviewDocs)

  // Recalculate ratingSummary for every unique target user
  const seen = new Set<string>()
  for (const doc of reviewDocs) {
    const key = `${doc.targetId.toString()}-${doc.targetType}`
    if (!seen.has(key)) {
      seen.add(key)
      await recalculateRatingSummary(doc.targetId.toString(), doc.targetType)
    }
  }

  return inserted
}