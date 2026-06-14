export interface Coordinate {
  lat: number
  lng: number
}

export interface RouteSegment {
  polyline: string
  distanceKm: number
  durationHours: number
}

export interface Load {
  _id: string
  companyId: string
  assignedDriverId?: string | null
  originAddress: string
  destinationAddress: string
  originCoords: Coordinate
  destinationCoords: Coordinate
  pickupTime: string
  dropoffTime: string
  weightLbs: number
  commodity: string
  truckType: string
  trailerLengthFt: number
  certifications?: string[]
  driverAssist?: boolean
  route?: RouteSegment
  auctionId?: string | null
  status: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface CreateLoadPayload {
  originAddress: string
  destinationAddress: string
  originCoords: Coordinate
  destinationCoords: Coordinate
  pickupTime: string
  dropoffTime: string
  weightLbs: number
  commodity: string
  truckType: string
  trailerLengthFt: number
  certifications?: string[]
  driverAssist?: boolean
}

export interface UpdateLoadPayload extends Partial<CreateLoadPayload> {
  status?: string
  auctionId?: string
  assignedDriverId?: string
}
