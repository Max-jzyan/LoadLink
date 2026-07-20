import { api } from '../api'

const GEOAPIFY_KEY = import.meta.env.VITE_GEOAPIFY_KEY
const BASE_URL = 'https://api.geoapify.com/v1/geocode'

export interface GeocodeResult {
  placeId: string
  formatted: string
  lat: number
  lon: number
}

interface GeoapifyFeature {
  properties: {
    place_id: string
    formatted: string
    lat: number
    lon: number
  }
}

interface GeoapifyResponse {
  features: GeoapifyFeature[]
}

export interface ReverseGeocodeResult {
  /** "City, PROVINCE" (or the best available fallback if a city can't be resolved) */
  label: string
}

interface GeoapifyReverseFeature {
  properties: {
    city?: string
    county?: string
    state?: string
    state_code?: string
    formatted: string
  }
}

interface GeoapifyReverseResponse {
  features: GeoapifyReverseFeature[]
}

export const geocodingApi = api.injectEndpoints({
  endpoints: (build) => ({
    autocompleteAddress: build.query<GeocodeResult[], string>({
      queryFn: async (query) => {
        try {
          const params = new URLSearchParams({
            text: query,
            apiKey: GEOAPIFY_KEY,
            limit: '5',
            filter: 'countrycode:ca',
          })
          const res = await fetch(`${BASE_URL}/autocomplete?${params}`)
          if (!res.ok) return { error: { status: res.status, data: res.statusText } }

          const data: GeoapifyResponse = await res.json()
          return {
            data: data.features.map((f) => ({
              placeId: f.properties.place_id,
              formatted: f.properties.formatted,
              lat: f.properties.lat,
              lon: f.properties.lon,
            })),
          }
        } catch (error) {
          return { error: { status: 'FETCH_ERROR' as const, error: String(error) } }
        }
      },
    }),

    // Resolves a lat/lng pair to a "City, Province" label, e.g. for labeling
    // checkpoints along a route. Cached per coordinate pair by RTK Query.
    reverseGeocode: build.query<ReverseGeocodeResult, { lat: number; lng: number }>({
      queryFn: async ({ lat, lng }) => {
        try {
          const params = new URLSearchParams({
            lat: String(lat),
            lon: String(lng),
            apiKey: GEOAPIFY_KEY,
          })
          const res = await fetch(`${BASE_URL}/reverse?${params}`)
          if (!res.ok) return { error: { status: res.status, data: res.statusText } }

          const data: GeoapifyReverseResponse = await res.json()
          const props = data.features[0]?.properties
          if (!props) return { error: { status: 'FETCH_ERROR' as const, error: 'No result' } }

          const place = props.city ?? props.county
          const province = props.state_code ?? props.state
          const label = place && province ? `${place}, ${province}` : props.formatted

          return { data: { label } }
        } catch (error) {
          return { error: { status: 'FETCH_ERROR' as const, error: String(error) } }
        }
      },
    }),
  }),
  overrideExisting: false,
})

export const { useAutocompleteAddressQuery, useReverseGeocodeQuery } = geocodingApi
