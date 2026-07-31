import { Types } from 'mongoose'
import { ReviewModel } from '../../models/ratings/Review'
import { TARGET_TYPES } from '../../models/ratings/Review'
import { recalculateRatingSummary } from '../../services/reviewService'
import { MS_PER_HOUR } from '../../constants/auction'
import type { SeedDriverKey } from './users'
import { COMPLETED_LOAD_IDS } from './loads'

// Fixed ObjectIds for seeded reviews (range: ...0501 – ...0517)
// Every review below is keyed to one of the 8 real completed loads (119-126),
// matching that load's actual assignedDriverId/companyId in loads.ts — a
// review can only exist for a driver/company pair that really hauled together.
const REVIEW_IDS = {
  // Driver → Company reviews (7 of the 8 possible completed-load slots)
  driver1OnCompany1_load119: new Types.ObjectId('000000000000000000000501'),
  driver2OnCompany2_load122: new Types.ObjectId('000000000000000000000502'),
  driver3OnCompany1_load125: new Types.ObjectId('000000000000000000000505'),
  driver4OnCompany1_load121: new Types.ObjectId('000000000000000000000507'),
  driver5OnCompany1_load123: new Types.ObjectId('000000000000000000000509'),
  driver3OnCompany2_load120: new Types.ObjectId('000000000000000000000511'),
  driver2OnCompany2_load126: new Types.ObjectId('000000000000000000000513'),

  // Company → Driver reviews (all 8 completed-load slots)
  company1OnDriver1_load119: new Types.ObjectId('000000000000000000000503'),
  company1OnDriver4_load121: new Types.ObjectId('000000000000000000000506'),
  company1OnDriver3_load125: new Types.ObjectId('000000000000000000000510'),
  company2OnDriver3_load120: new Types.ObjectId('000000000000000000000504'),
  company2OnDriver2_load126: new Types.ObjectId('000000000000000000000508'),
  company2OnDriver5_load124: new Types.ObjectId('000000000000000000000514'),
  company2OnDriver2_load122: new Types.ObjectId('000000000000000000000515'),
  company1OnDriver5_load123: new Types.ObjectId('000000000000000000000516'),
}

// Sourced from loads.ts's COMPLETED_LOAD_IDS (single source of truth for these
// ObjectIds) rather than re-hardcoding the same strings in this file too.
const HISTORICAL_LOAD_IDS = {
  load119: COMPLETED_LOAD_IDS['000000000000000000000119'],
  load120: COMPLETED_LOAD_IDS['000000000000000000000120'],
  load121: COMPLETED_LOAD_IDS['000000000000000000000121'],
  load122: COMPLETED_LOAD_IDS['000000000000000000000122'],
  load123: COMPLETED_LOAD_IDS['000000000000000000000123'],
  load124: COMPLETED_LOAD_IDS['000000000000000000000124'],
  load125: COMPLETED_LOAD_IDS['000000000000000000000125'],
  load126: COMPLETED_LOAD_IDS['000000000000000000000126'],
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
      _id: REVIEW_IDS.driver1OnCompany1_load119,
      reviewerId: drivers.testUser1._id,
      targetId: companies.testCompany1._id,
      targetType: TARGET_TYPES.COMPANY,
      loadId: HISTORICAL_LOAD_IDS.load119,
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
      _id: REVIEW_IDS.driver2OnCompany2_load122,
      reviewerId: drivers.testUser2._id,
      targetId: companies.testCompany2._id,
      targetType: TARGET_TYPES.COMPANY,
      loadId: HISTORICAL_LOAD_IDS.load122,
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
      _id: REVIEW_IDS.driver3OnCompany1_load125,
      reviewerId: drivers.testUser3._id,
      targetId: companies.testCompany1._id,
      targetType: TARGET_TYPES.COMPANY,
      loadId: HISTORICAL_LOAD_IDS.load125,
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
      _id: REVIEW_IDS.driver4OnCompany1_load121,
      reviewerId: drivers.testUser4._id,
      targetId: companies.testCompany1._id,
      targetType: TARGET_TYPES.COMPANY,
      loadId: HISTORICAL_LOAD_IDS.load121,
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
      _id: REVIEW_IDS.driver5OnCompany1_load123,
      reviewerId: drivers.testUser5._id,
      targetId: companies.testCompany1._id,
      targetType: TARGET_TYPES.COMPANY,
      loadId: HISTORICAL_LOAD_IDS.load123,
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
      _id: REVIEW_IDS.driver3OnCompany2_load120,
      reviewerId: drivers.testUser3._id,
      targetId: companies.testCompany2._id,
      targetType: TARGET_TYPES.COMPANY,
      loadId: HISTORICAL_LOAD_IDS.load120,
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
      _id: REVIEW_IDS.driver2OnCompany2_load126,
      reviewerId: drivers.testUser2._id,
      targetId: companies.testCompany2._id,
      targetType: TARGET_TYPES.COMPANY,
      loadId: HISTORICAL_LOAD_IDS.load126,
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

    // ── Company → Driver reviews (8) — one per completed load ──────────
    {
      _id: REVIEW_IDS.company1OnDriver1_load119,
      reviewerId: companies.testCompany1._id,
      targetId: drivers.testUser1._id,
      targetType: TARGET_TYPES.DRIVER,
      loadId: HISTORICAL_LOAD_IDS.load119,
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
      _id: REVIEW_IDS.company1OnDriver4_load121,
      reviewerId: companies.testCompany1._id,
      targetId: drivers.testUser4._id,
      targetType: TARGET_TYPES.DRIVER,
      loadId: HISTORICAL_LOAD_IDS.load121,
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
      _id: REVIEW_IDS.company1OnDriver3_load125,
      reviewerId: companies.testCompany1._id,
      targetId: drivers.testUser3._id,
      targetType: TARGET_TYPES.DRIVER,
      loadId: HISTORICAL_LOAD_IDS.load125,
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
      _id: REVIEW_IDS.company2OnDriver3_load120,
      reviewerId: companies.testCompany2._id,
      targetId: drivers.testUser3._id,
      targetType: TARGET_TYPES.DRIVER,
      loadId: HISTORICAL_LOAD_IDS.load120,
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
      _id: REVIEW_IDS.company2OnDriver2_load126,
      reviewerId: companies.testCompany2._id,
      targetId: drivers.testUser2._id,
      targetType: TARGET_TYPES.DRIVER,
      loadId: HISTORICAL_LOAD_IDS.load126,
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
    {
      _id: REVIEW_IDS.company2OnDriver5_load124,
      reviewerId: companies.testCompany2._id,
      targetId: drivers.testUser5._id,
      targetType: TARGET_TYPES.DRIVER,
      loadId: HISTORICAL_LOAD_IDS.load124,
      ratingCategories: {
        timeliness: 5,
        communication: 4,
        reliability: 5,
        professionalism: 5,
        documentationAccuracy: 5,
      },
      comment: 'Step deck specialist delivered oversized freight flawlessly.',
      createdAt: new Date(Date.now() - 28 * 24 * MS_PER_HOUR),
    },
    {
      _id: REVIEW_IDS.company2OnDriver2_load122,
      reviewerId: companies.testCompany2._id,
      targetId: drivers.testUser2._id,
      targetType: TARGET_TYPES.DRIVER,
      loadId: HISTORICAL_LOAD_IDS.load122,
      ratingCategories: {
        timeliness: 4,
        communication: 4,
        reliability: 5,
        professionalism: 4,
        documentationAccuracy: 4,
      },
      comment: 'Solid flatbed haul. Tarp job was clean and secure.',
      createdAt: new Date(Date.now() - 13 * 24 * MS_PER_HOUR),
    },
    {
      _id: REVIEW_IDS.company1OnDriver5_load123,
      reviewerId: companies.testCompany1._id,
      targetId: drivers.testUser5._id,
      targetType: TARGET_TYPES.DRIVER,
      loadId: HISTORICAL_LOAD_IDS.load123,
      ratingCategories: {
        timeliness: 4,
        communication: 5,
        reliability: 4,
        professionalism: 5,
        documentationAccuracy: 4,
      },
      comment: 'Reliable step deck operator for our BC corridor runs.',
      createdAt: new Date(Date.now() - 10 * 24 * MS_PER_HOUR),
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
