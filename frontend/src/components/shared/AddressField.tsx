// inspiration from https://stackblitz.com/edit/shadcn-combobox-example?file=components%2FCombobox.tsx
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { cn } from '@/lib/utils'
import { useAutocompleteAddressQuery } from '@/services/locationSlices/geocoding'
import { useRequiredMongoId } from '@/hooks/useAuth'
import {
  useGetFavoriteAddressesQuery,
  useAddFavoriteAddressMutation,
  useDeleteFavoriteAddressMutation,
} from '@/services/favoriteAddressApi/favoriteAddressSlice'
import { Check, ChevronsUpDown, Loader2, Star, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { FieldDescription, FieldLabel } from '@/components/ui/field'

export interface AddressOption {
  value: string
  label: string
  lat?: number
  lon?: number
}

/** A favorite-address option, tagged with the id needed to delete it. */
interface FavoriteOption extends AddressOption {
  favoriteId: string
}

export interface AddressFieldProps {
  disabled?: boolean
  placeholder?: string
  className?: string
  label?: React.ReactNode
  description?: string
  /** Prefill with an existing address (e.g. when editing a load) */
  initialValue?: string
  onValueChange?: (value: string) => void
  onSelect?: (option: AddressOption) => void
  invalid?: boolean
}

export function AddressField({
  disabled,
  placeholder,
  className,
  label,
  description,
  initialValue,
  onValueChange,
  onSelect,
  invalid,
}: AddressFieldProps) {
  const [address, setAddress] = useState<string>(initialValue ?? '')
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  const companyId = useRequiredMongoId()
  const { data: favorites = [] } = useGetFavoriteAddressesQuery(companyId, { skip: !companyId })
  const [addFavoriteAddress, { isLoading: isSavingFavorite }] = useAddFavoriteAddressMutation()
  const [deleteFavoriteAddress] = useDeleteFavoriteAddressMutation()

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query), 400)
    return () => clearTimeout(id)
  }, [query])

  const { data: geocodeResults = [], isFetching } = useAutocompleteAddressQuery(debouncedQuery, {
    skip: debouncedQuery.length < 6,
  })

  const savedAddresses: FavoriteOption[] = favorites.map((f) => ({
    value: f.address,
    label: f.address,
    lat: f.lat,
    lon: f.lng,
    favoriteId: f._id,
  }))

  const suggestions: AddressOption[] = geocodeResults.map((r) => ({
    value: r.formatted,
    label: r.formatted,
    lat: r.lat,
    lon: r.lon,
  }))

  const options = [
    ...savedAddresses,
    ...suggestions.filter((s) => !savedAddresses.some((saved) => saved.value === s.value)),
  ]
  const selected = options.find((option) => option.value === address)

  // Filtered explicitly so each group's visibility reflects its real member count.
  const q = query.trim().toLowerCase()
  const visibleSavedAddresses = q
    ? savedAddresses.filter((s) => s.label.toLowerCase().includes(q))
    : savedAddresses
  const visibleSuggestions = suggestions.filter(
    (s) => !savedAddresses.some((saved) => saved.value === s.value)
  )

  const handleSelect = (value: string) => {
    setAddress(value)
    setOpen(false)
    onValueChange?.(value)
    const option = options.find((o) => o.value === value)
    if (option) onSelect?.(option)
  }

  const handleSaveFavorite = (e: React.MouseEvent, option: AddressOption) => {
    e.stopPropagation()
    e.preventDefault()
    if (!companyId || option.lat == null || option.lon == null) return
    addFavoriteAddress({
      companyId,
      body: { address: option.value, lat: option.lat, lng: option.lon },
    })
  }

  const handleDeleteFavorite = (e: React.MouseEvent, favoriteId: string) => {
    e.stopPropagation()
    e.preventDefault()
    deleteFavoriteAddress({ companyId, addressId: favoriteId })
  }

  return (
    <div className={cn('flex flex-col', className)}>
      {label && <FieldLabel className="mb-1">{label}</FieldLabel>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            disabled={disabled ?? false}
            aria-expanded={open}
            aria-invalid={invalid}
            className="w-full font-normal overflow-hidden"
          >
            {address.length > 0 ? (
              // Fall back to the raw address so prefilled values (not in the
              // options list) still display when editing
              <div className="truncate mr-auto min-w-0">{selected?.label ?? address}</div>
            ) : (
              <div className="text-muted-foreground mr-auto">{placeholder ?? 'Select'}</div>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Choose from saved or enter new address..."
              value={query}
              onValueChange={(value: string) => setQuery(value)}
              onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                }
              }}
            />
            <CommandEmpty>
              {isFetching ? (
                <span className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Searching...
                </span>
              ) : (
                'No results found.'
              )}
            </CommandEmpty>

            <CommandList>
              {visibleSavedAddresses.length > 0 && (
                <CommandGroup heading="Saved Addresses" className="overflow-y-auto">
                  {visibleSavedAddresses.map((option) => (
                    <CommandItem
                      key={option.favoriteId}
                      tabIndex={0}
                      value={option.label}
                      onSelect={() => handleSelect(option.value)}
                      onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) => {
                        if (event.key === 'Enter') {
                          event.stopPropagation()
                          handleSelect(option.value)
                        }
                      }}
                      className={cn(
                        'cursor-pointer',
                        'focus:!bg-accent hover:!bg-accent aria-selected:bg-transparent'
                      )}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4 min-h-4 min-w-4',
                          selected?.value === option.value ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <span className="flex-1 min-w-0 truncate">{option.label}</span>
                      <button
                        type="button"
                        aria-label="Remove favorite"
                        onClick={(e) => handleDeleteFavorite(e, option.favoriteId)}
                        className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {visibleSuggestions.length > 0 && (
                <CommandGroup heading="Search Results" className="overflow-y-auto">
                  {visibleSuggestions.map((option) => (
                    <CommandItem
                      key={option.label}
                      tabIndex={0}
                      value={option.label}
                      onSelect={() => {
                        handleSelect(option.value)
                      }}
                      onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) => {
                        if (event.key === 'Enter') {
                          event.stopPropagation()
                          handleSelect(option.value)
                        }
                      }}
                      className={cn(
                        'cursor-pointer',
                        'focus:!bg-accent hover:!bg-accent aria-selected:bg-transparent'
                      )}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4 min-h-4 min-w-4',
                          selected?.value === option.value ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <span className="flex-1 min-w-0 truncate">{option.label}</span>
                      {option.lat != null && option.lon != null && (
                        <button
                          type="button"
                          aria-label="Save as favorite"
                          disabled={isSavingFavorite}
                          onClick={(e) => handleSaveFavorite(e, option)}
                          className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-primary hover:bg-primary/10"
                        >
                          <Star className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {description && <FieldDescription>{description}</FieldDescription>}
    </div>
  )
}
