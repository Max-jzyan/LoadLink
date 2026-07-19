import { parseLatLng } from '../geo'

describe('parseLatLng', () => {
  it('parses valid numeric inputs', () => {
    expect(parseLatLng(49.2827, -123.1207)).toEqual({ lat: 49.2827, lng: -123.1207 })
  })

  it('parses valid numeric strings', () => {
    expect(parseLatLng('49.2827', '-123.1207')).toEqual({ lat: 49.2827, lng: -123.1207 })
  })

  it('returns null when either value is missing', () => {
    expect(parseLatLng(undefined, -123.1207)).toBeNull()
    expect(parseLatLng(49.2827, undefined)).toBeNull()
  })

  it('returns null for non-numeric strings', () => {
    expect(parseLatLng('nope', -123.1207)).toBeNull()
  })

  it('returns null for out-of-range values', () => {
    expect(parseLatLng(999, -123.1207)).toBeNull()
    expect(parseLatLng(49.2827, -999)).toBeNull()
  })

  it('returns null for non-finite numbers', () => {
    expect(parseLatLng(Infinity, -123.1207)).toBeNull()
    expect(parseLatLng(NaN, -123.1207)).toBeNull()
  })

  it('rejects array/object inputs rather than silently coercing them', () => {
    // Number([49.28]) === 49.28 in JS — a bare coercion would let this through.
    expect(parseLatLng([49.2827], -123.1207)).toBeNull()
    expect(parseLatLng({ lat: 49.2827 }, -123.1207)).toBeNull()
    expect(parseLatLng(null, -123.1207)).toBeNull()
    expect(parseLatLng(true, -123.1207)).toBeNull()
  })
})
