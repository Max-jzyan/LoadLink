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
    firebaseUid: 'VpHHpa2DUAOuZNCGpYKsE6gkYhm1',
    name: 'testCompany1',
    email: 'testcompany1@example.com',
    companyName: 'testCompany1',
    contactName: 'testCompany1',
  })

  const testCompany2 = await CompanyModel.create({
    _id: TEST_COMPANY2_ID,
    firebaseUid: 'x4QlHTLijEg4YwZGi0rt68xP0iB3',
    name: 'testCompany2',
    email: 'testcompany2@example.com',
    companyName: 'testCompany2',
    contactName: 'testCompany2',
  })

  const testUser1 = await DriverModel.create({
    _id: TEST_USER1_ID,
    firebaseUid: '64HOtArwogXs2H4nXD4kyxRw2wk2',
    name: 'testUser1',
    email: 'testuser1@example.com',
  })

  const testUser2 = await DriverModel.create({
    _id: TEST_USER2_ID,
    firebaseUid: '4Y6LYPl2kyQpyPtR99FaeaVOph62',
    name: 'testUser2',
    email: 'testuser2@example.com',
  })

  const testUser3 = await DriverModel.create({
    _id: TEST_USER3_ID,
    firebaseUid: 'qYIxX5L2P5UoEBgDOh9UUHOX5HU2',
    name: 'testUser3',
    email: 'testuser3@example.com',
  })

  const testUser4 = await DriverModel.create({
    _id: TEST_USER4_ID,
    firebaseUid: 'XsbV0iBLkKhuxPHgChqBlel0Bg63',
    name: 'testUser4',
    email: 'testuser4@example.com',
  })

  const testUser5 = await DriverModel.create({
    _id: TEST_USER5_ID,
    firebaseUid: 'F6pMHcjeqXQCxSmpCrHnmraXa6p1',
    name: 'testUser5',
    email: 'testuser5@example.com',
  })

  return {
    companies: { testCompany1, testCompany2 },
    drivers: { testUser1, testUser2, testUser3, testUser4, testUser5 },
  }
}
