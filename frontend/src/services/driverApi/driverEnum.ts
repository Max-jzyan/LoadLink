export interface PlaceBidPayload {
  driverId: string
  amount: number
}

export interface ClaimLoadPayload {
  driverId: string
}

export interface ClaimResult {
  loadId: string
  finalPayout: number
  rateConfirmationUrl: string
}

export interface Bid {
  _id: string
  loadId: string
  auctionId: string
  driverId: string
  amount: number
  status: string
  acceptedAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface Truck {
  _id: string
  ownerDriverId: string
  make: string
  model: string
  year: number
  truckType: string
  trailerLengthFt: number
  capacityLbs: number
  maxPayloadLbs: number
  plateNumber: string
  vin: string
  certifications: string[]
  isPrimary: boolean
  notes: string
  createdAt: string
  updatedAt: string
}
