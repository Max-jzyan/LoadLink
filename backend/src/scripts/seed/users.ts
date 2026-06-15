import { UserModel } from '../../models/users/User'
import { DriverModel } from '../../models/users/Driver'
import { CompanyModel } from '../../models/users/Company'

/** Seed the users collection: one company and two drivers. */
export async function seedUsers() {
  await UserModel.deleteMany({})

  const company = await CompanyModel.create({
    firebaseUid: 'fb_uid_5544',
    name: 'Greenleaf Logistics',
    email: 'ops@greenleaf.example.com',
    companyName: 'GREENLEAF',
    contactName: 'Dana Green',
  })

  const alex = await DriverModel.create({
    firebaseUid: 'fb_uid_67890',
    name: 'Alex Martinez',
    email: 'alex@example.com',
    ratingSummary: { average: 4.9, totalReviews: 30 },
  })
  const sam = await DriverModel.create({
    firebaseUid: 'fb_uid_55443',
    name: 'Sam Kowalski',
    email: 'sam@example.com',
    ratingSummary: { average: 4.7, totalReviews: 18 },
  })

  return { company, drivers: [sam, alex] }
}
