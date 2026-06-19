import { Types } from 'mongoose'
import { UserModel } from '../../models/users/User'
import { DriverModel } from '../../models/users/Driver'
import { CompanyModel } from '../../models/users/Company'

const TEST_COMPANY1_ID = new Types.ObjectId('000000000000000000000001')
const TEST_COMPANY2_ID = new Types.ObjectId('000000000000000000000002')
const TEST_USER1_ID = new Types.ObjectId('000000000000000000000011')
const TEST_USER2_ID = new Types.ObjectId('000000000000000000000012')
const TEST_USER3_ID = new Types.ObjectId('000000000000000000000013')
const TEST_USER4_ID = new Types.ObjectId('000000000000000000000014')
const TEST_USER5_ID = new Types.ObjectId('000000000000000000000015')

export type SeedDriverKey = 'testUser1' | 'testUser2' | 'testUser3' | 'testUser4' | 'testUser5'

/** Seed the users collection with Firebase-backed teammate demo accounts. */
export async function seedUsers() {
  await UserModel.deleteMany({})

  const testCompany1 = await CompanyModel.create({
    _id: TEST_COMPANY1_ID,
    firebaseUid: '7XXAaQ6HvvNGk8pk07NZ7bP19de2',
    name: 'testCompany1',
    email: 'testcompany1@example.com',
    companyName: 'testCompany1',
    contactName: 'testCompany1',
  })

  const testCompany2 = await CompanyModel.create({
    _id: TEST_COMPANY2_ID,
    firebaseUid: 'uHB2IDSPKETMuVStfEI3gbNh4ky1',
    name: 'testCompany2',
    email: 'testcompany2@example.com',
    companyName: 'testCompany2',
    contactName: 'testCompany2',
  })

  const testUser1 = await DriverModel.create({
    _id: TEST_USER1_ID,
    firebaseUid: 'TvOVchr9RFe6p1cnibkkEsxMH473',
    name: 'testUser1',
    email: 'testuser1@example.com',
    ratingSummary: { average: 4.7, totalReviews: 18 },
  })

  const testUser2 = await DriverModel.create({
    _id: TEST_USER2_ID,
    firebaseUid: 'Q9PZSRdPG2eYRIiUE2RTf1Y2dWk2',
    name: 'testUser2',
    email: 'testuser2@example.com',
    ratingSummary: { average: 4.8, totalReviews: 22 },
  })

  const testUser3 = await DriverModel.create({
    _id: TEST_USER3_ID,
    firebaseUid: 'tuJLp8qN6WO1eY2Bq0rgTmJ3x4p2',
    name: 'testUser3',
    email: 'testuser3@example.com',
    ratingSummary: { average: 4.6, totalReviews: 14 },
  })

  const testUser4 = await DriverModel.create({
    _id: TEST_USER4_ID,
    firebaseUid: 'aT4XwmUqIiTZbxcCrfrnKVlPOzN2',
    name: 'testUser4',
    email: 'testuser4@example.com',
    ratingSummary: { average: 4.9, totalReviews: 31 },
  })

  const testUser5 = await DriverModel.create({
    _id: TEST_USER5_ID,
    firebaseUid: 'Eoqv2IXuDoNYzrFXzCeBFjS6RAz2',
    name: 'testUser5',
    email: 'testuser5@example.com',
    ratingSummary: { average: 4.5, totalReviews: 11 },
  })

  return {
    companies: { testCompany1, testCompany2 },
    drivers: { testUser1, testUser2, testUser3, testUser4, testUser5 },
  }
}
