/** A company's saved address, as returned by GET /api/favorite-addresses/:companyId */
export interface FavoriteAddress {
  _id: string
  companyId: string
  address: string
  lat: number
  lng: number
  createdAt: string
  updatedAt: string
}

export interface AddFavoriteAddressPayload {
  companyId: string
  body: {
    address: string
    lat: number
    lng: number
  }
}

export interface DeleteFavoriteAddressPayload {
  companyId: string
  addressId: string
}
