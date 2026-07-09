import httpMocks from 'node-mocks-http'
import { StatusCodes } from 'http-status-codes'
import { ApiError } from '../../utils/ApiError'
import { errorHandler } from '../errorHandler'

describe('errorHandler', () => {
  it('maps an ApiError to its status code and message', () => {
    const err = new ApiError(StatusCodes.FORBIDDEN, 'Forbidden: not your resource')
    const req = httpMocks.createRequest()
    const res = httpMocks.createResponse()
    const next = jest.fn()

    errorHandler(err, req, res, next)

    expect(res.statusCode).toBe(StatusCodes.FORBIDDEN)
    expect(res._getJSONData()).toEqual({ message: 'Forbidden: not your resource' })
  })

  it('maps an unrecognized error to a generic 500', () => {
    const err = new Error('boom')
    const req = httpMocks.createRequest()
    const res = httpMocks.createResponse()
    const next = jest.fn()

    errorHandler(err, req, res, next)

    expect(res.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR)
    expect(res._getJSONData()).toEqual({ message: 'Internal server error' })
  })
})
