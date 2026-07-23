import { getHttpErrorMessage, showError, showSuccess, getErrorStatus } from '@/lib/toast'
import { api } from '../api'
import { LoadTag } from '../apiTypes'
import type {
  AddFavoriteAddressPayload,
  DeleteFavoriteAddressPayload,
  FavoriteAddress,
} from './favoriteAddressEnum'

/** Prefer the backend's { message } body over the generic status text */
const getServerErrorMessage = (error: unknown, fallbackStatus: number) => {
  const data = (error as { error?: { data?: { message?: string } } })?.error?.data
  return data?.message ?? getHttpErrorMessage(fallbackStatus)
}

export const favoriteAddressApi = api.injectEndpoints({
  endpoints: (build) => ({
    // GET /api/favorite-addresses/:companyId — the company's saved addresses
    getFavoriteAddresses: build.query<FavoriteAddress[], string>({
      query: (companyId) => `favorite-addresses/${companyId}`,
      providesTags: (_result, _error, companyId) => [
        { type: LoadTag.FavoriteAddress, id: companyId },
      ],
    }),

    // POST /api/favorite-addresses/:companyId — save a new favorite address
    addFavoriteAddress: build.mutation<FavoriteAddress, AddFavoriteAddressPayload>({
      query: ({ companyId, body }) => ({
        url: `favorite-addresses/${companyId}`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { companyId }) => [
        { type: LoadTag.FavoriteAddress, id: companyId },
      ],
      async onQueryStarted(_arg, { queryFulfilled }) {
        try {
          await queryFulfilled
          showSuccess('Address saved to favorites')
        } catch (error) {
          showError(getServerErrorMessage(error, getErrorStatus(error)))
        }
      },
    }),

    // DELETE /api/favorite-addresses/:companyId/:addressId — remove a saved address
    deleteFavoriteAddress: build.mutation<void, DeleteFavoriteAddressPayload>({
      query: ({ companyId, addressId }) => ({
        url: `favorite-addresses/${companyId}/${addressId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { companyId }) => [
        { type: LoadTag.FavoriteAddress, id: companyId },
      ],
      async onQueryStarted(_arg, { queryFulfilled }) {
        try {
          await queryFulfilled
          showSuccess('Favorite address removed')
        } catch (error) {
          showError(getServerErrorMessage(error, getErrorStatus(error)))
        }
      },
    }),
  }),
  overrideExisting: false,
})

export const {
  useGetFavoriteAddressesQuery,
  useAddFavoriteAddressMutation,
  useDeleteFavoriteAddressMutation,
} = favoriteAddressApi
