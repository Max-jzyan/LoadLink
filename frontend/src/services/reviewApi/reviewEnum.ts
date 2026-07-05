export interface ReviewUser {
  name: string
  email: string
}

export interface ReviewLoad {
  originAddress: string
  destinationAddress: string
}

export interface Review {
  _id: string
  reviewerId: ReviewUser
  targetId: string | ReviewUser
  loadId: ReviewLoad
  ratingCategories: import('../driverApi/driverEnum').RatingCategories
  comment: string
  createdAt: string
  updatedAt: string
}

export interface GetReviewsForTargetResponse {
  data: Review[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}