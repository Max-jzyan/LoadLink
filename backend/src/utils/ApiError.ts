/**
 * Typed domain error carrying an HTTP status code. Services throw these (e.g.
 * `new ApiError(StatusCodes.NOT_FOUND, 'Auction not found for load')`) and the
 * error-handling middleware maps them to the matching JSON response.
 */
export class ApiError extends Error {
  statusCode: number

  constructor(statusCode: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
  }
}
