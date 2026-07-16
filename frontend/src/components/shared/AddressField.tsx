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
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { FieldDescription, FieldLabel } from '@/components/ui/field'

const savedAddresses: AddressOption[] = [
  {
    value: '1234 main st, Vancouver, bc v5k 0a1',
    label: 'pickup point 1 - 1234 main st, Vancouver, bc v5k 0a1',
    lat: 49.2827,
    lon: -123.1207,
  },
  {
    value: '5678 elm st, Langley, bc v1m 2n3',
    label: 'pickup point 2 - 5678 elm st, Langley, bc v1m 2n3',
    lat: 49.1044,
    lon: -122.6604,
  },
  {
    value: '9101 oak st, Toronto, on m4b 1c2',
    label: 'dropoff point 1 - 9101 oak st, Toronto, on m4b 1c2',
    lat: 43.6532,
    lon: -79.3832,
  },
  {
    value: '1213 pine st, Montreal, qc h2x 3y4',
    label: 'dropoff point 2 - 1213 pine st, Montreal, qc h2x 3y4',
    lat: 45.5017,
    lon: -73.5673,
  },
]

export interface AddressOption {
  value: string
  label: string
  lat?: number
  lon?: number
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

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query), 400)
    return () => clearTimeout(id)
  }, [query])

  const { data: geocodeResults = [], isFetching } = useAutocompleteAddressQuery(debouncedQuery, {
    skip: debouncedQuery.length < 6,
  })

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

  const handleSelect = (value: string) => {
    setAddress(value)
    setOpen(false)
    onValueChange?.(value)
    const option = options.find((o) => o.value === value)
    if (option) onSelect?.(option)
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
          <Command>
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
              <CommandGroup className="overflow-y-auto">
                {options.map((option) => (
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
                    {option.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {description && <FieldDescription>{description}</FieldDescription>}
    </div>
  )
}
