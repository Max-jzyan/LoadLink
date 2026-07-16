import { Types } from 'mongoose'
import { UserModel } from '../../models/users/User'
import { DriverModel } from '../../models/users/Driver'
import { CompanyModel } from '../../models/users/Company'
import { AdminModel } from '../../models/users/Admin'
import { type Certification } from '../../models/enums'

const TEST_ADMIN_ID = new Types.ObjectId('000000000000000000000099')
const ADMIN_FIREBASE_UID = 'ZuHtRq6w4sX1gDXD5XdT7fS8xyR2'

const TEST_COMPANY1_ID = new Types.ObjectId('000000000000000000000001')
const TEST_COMPANY2_ID = new Types.ObjectId('000000000000000000000002')
const TEST_USER1_ID = new Types.ObjectId('000000000000000000000011')
const TEST_USER2_ID = new Types.ObjectId('000000000000000000000012')
const TEST_USER3_ID = new Types.ObjectId('000000000000000000000013')
const TEST_USER4_ID = new Types.ObjectId('000000000000000000000014')
const TEST_USER5_ID = new Types.ObjectId('000000000000000000000015')

export type SeedDriverKey =
  | 'testUser1'
  | 'testUser2'
  | 'testUser3'
  | 'testUser4'
  | 'testUser5'

export type SeedCompanyKey = 'testCompany1' | 'testCompany2'

/** Seed the users collection with Firebase-backed teammate demo accounts. */
export async function seedUsers() {
  await UserModel.deleteMany({})

  const testCompany1 = await CompanyModel.create({
    _id: TEST_COMPANY1_ID,
    firebaseUid: 'VpHHpa2DUAOuZNCGpYKsE6gkYhm1',
    name: 'testCompany1',
    email: 'testcompany1@example.com',
    companyName: 'testCompany1',
    contactName: 'testCompany1',
    businessAddress: '450 5th Ave SW, Calgary, AB',
    businessNumber: 'AB-1192834',
  })

  const testCompany2 = await CompanyModel.create({
    _id: TEST_COMPANY2_ID,
    firebaseUid: 'x4QlHTLijEg4YwZGi0rt68xP0iB3',
    name: 'testCompany2',
    email: 'testcompany2@example.com',
    companyName: 'testCompany2',
    contactName: 'testCompany2',
    businessAddress: '2200 Portage Ave, Winnipeg, MB',
    businessNumber: 'MB-5566778',
  })

  const driverSeed = (
    id: Types.ObjectId,
    firebaseUid: string,
    name: string,
    email: string,
    pricing: { minimumRatePerMile: number; minimumLoadValue: number; preferredMaxDeadheadMiles: number },
    extra: Partial<{
      professionalTitle: string
      mcNumber: string
      dotNumber: string
      certifications: Certification[]
      homeLocation: { city: string; province: string }
    }> = {}
  ) =>
    DriverModel.create({
      _id: id,
      firebaseUid,
      name,
      email,
      professionalTitle: extra.professionalTitle ?? '',
      mcNumber: extra.mcNumber ?? '',
      dotNumber: extra.dotNumber ?? '',
      certifications: extra.certifications ?? [],
      homeLocation: extra.homeLocation ?? { city: '', province: '', country: 'Canada' },
      pricingPreferences: pricing,
    })

  const testUser1 = await driverSeed(
    TEST_USER1_ID,
    '64HOtArwogXs2H4nXD4kyxRw2wk2',
    'testUser1',
    'testuser1@example.com',
    { minimumRatePerMile: 2.25, minimumLoadValue: 400, preferredMaxDeadheadMiles: 75 },
    { professionalTitle: 'Owner-Operator', mcNumber: 'MC-123456', dotNumber: 'DOT-789012', homeLocation: { city: 'Calgary', province: 'AB' } }
  )

  const testUser2 = await driverSeed(
    TEST_USER2_ID,
    '4Y6LYPl2kyQpyPtR99FaeaVOph62',
    'testUser2',
    'testuser2@example.com',
    { minimumRatePerMile: 3.25, minimumLoadValue: 600, preferredMaxDeadheadMiles: 50 },
    { professionalTitle: 'Flatbed Specialist', mcNumber: 'MC-234567', dotNumber: 'DOT-890123', certifications: ['Hazmat'], homeLocation: { city: 'Surrey', province: 'BC' } }
  )

  const testUser3 = await driverSeed(
    TEST_USER3_ID,
    'qYIxX5L2P5UoEBgDOh9UUHOX5HU2',
    'testUser3',
    'testuser3@example.com',
    { minimumRatePerMile: 2.25, minimumLoadValue: 400, preferredMaxDeadheadMiles: 75 },
    { professionalTitle: 'Prairie Hauler', homeLocation: { city: 'Regina', province: 'SK' } }
  )

  const testUser4 = await driverSeed(
    TEST_USER4_ID,
    'XsbV0iBLkKhuxPHgChqBlel0Bg63',
    'testUser4',
    'testuser4@example.com',
    { minimumRatePerMile: 2.75, minimumLoadValue: 500, preferredMaxDeadheadMiles: 60 },
    { professionalTitle: 'Reefer Operator', mcNumber: 'MC-345678', dotNumber: 'DOT-901234', certifications: ['Reefer HACCP', 'Hazmat'], homeLocation: { city: 'Toronto', province: 'ON' } }
  )

  const testUser5 = await driverSeed(
    TEST_USER5_ID,
    'F6pMHcjeqXQCxSmpCrHnmraXa6p1',
    'testUser5',
    'testuser5@example.com',
    { minimumRatePerMile: 3.5, minimumLoadValue: 700, preferredMaxDeadheadMiles: 80 },
    { professionalTitle: 'Step Deck Pro', mcNumber: 'MC-456789', dotNumber: 'DOT-012345', homeLocation: { city: 'Winnipeg', province: 'MB' } }
  )

  const admin = await AdminModel.create({
    _id: TEST_ADMIN_ID,
    firebaseUid: ADMIN_FIREBASE_UID,
    name: 'Platform Admin',
    email: 'admin@example.com',
    canProcessDocuments: true,
    adminNotes: 'Seeded admin account.',
  })

  return {
    companies: { testCompany1, testCompany2 },
    drivers: { testUser1, testUser2, testUser3, testUser4, testUser5 },
    admin,
  }
}