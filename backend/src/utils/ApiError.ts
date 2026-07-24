/**
 * Typed domain error carrying an HTTP status code. Services throw these (e.g.
 * `new ApiError(StatusCodes.NOT_FOUND, 'Auction not found for load')`) and the
 * error-handling middleware maps them to the matching JSON response.
 *
 * The optional `code` is a stable machine-readable identifier (e.g.
 * `ACCOUNT_BANNED`) that lets the frontend react to specific error cases
 * (forcing a sign-out, showing a tailored message) without string-matching
 * the human-readable `message`.
 */
export class ApiError extends Error {
  statusCode: number
  code?: string

  constructor(statusCode: number, message: string, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.code = code
  }
}
