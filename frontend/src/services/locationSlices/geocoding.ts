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
  }),
  overrideExisting: false,
})

export const { useAutocompleteAddressQuery } = geocodingApi
