import { UserModel } from '../../models/users/User'
import { DriverModel } from '../../models/users/Driver'
import { CompanyModel } from '../../models/users/Company'

/** Seed the users collection: two companies and two drivers. */
export async function seedUsers() {
  await UserModel.deleteMany({})

  const greenleaf = await CompanyModel.create({
    firebaseUid: 'fb_uid_5544',
    name: 'Greenleaf Logistics',
    email: 'ops@greenleaf.example.com',
    companyName: 'GREENLEAF',
    contactName: 'Dana Green',
  })

  const northern = await CompanyModel.create({
    firebaseUid: 'fb_uid_8877',
    name: 'Great Northern Transport',
    email: 'dispatch@gnt.example.com',
    companyName: 'GNT',
    contactName: 'Hank Miller',
  })

  const sam = await DriverModel.create({
    firebaseUid: 'fb_uid_55443',
    name: 'Sam Kowalski',
    email: 'sam@example.com',
    ratingSummary: { average: 4.7, totalReviews: 18 },
  })
  const alex = await DriverModel.create({
    firebaseUid: 'fb_uid_67890',
    name: 'Alex Martinez',
    email: 'alex@example.com',
    ratingSummary: { average: 4.9, totalReviews: 30 },
  })

  return {
    companies: { greenleaf, northern },
    drivers: { sam, alex },
  }
}
