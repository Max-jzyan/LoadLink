import { useMemo, useState } from 'react'
import type { Load } from '@/services/loadApi/loadEnum'
import { 
  Combobox, 
  ComboboxInput, 
  ComboboxContent, 
  ComboboxList, 
  ComboboxItem, 
  ComboboxEmpty, 
} from '@/components/ui/combobox'

interface LoadSelectProps {
  loads: Load[]
  onChange: (value: string) => void
}

interface LoadItem {
  value: string
  label: string
}

function formatLoadLabel(load: Load): string {
  const date = new Date(load.dropoffTime).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  return `${load.originAddress} → ${load.destinationAddress} | ${date}`
}

export default function LoadSelect({ loads, onChange }: LoadSelectProps) {
  // 1. Maintain the combobox value (load ID) in local state
  const [selectedId, setSelectedId] = useState('')

  const items = useMemo(
    () => loads.map((load): LoadItem => ({ value: load._id, label: formatLoadLabel(load) })),
    [loads]
  )

  // 2. Find the label for the selected ID to display in the input
  const selectedItem = items.find((item) => item.value === selectedId)
  const displayValue = selectedItem?.label || ''

  return (
    // 3. Pass the display label as the value and handle selection
    <Combobox 
      items={items} 
      value={displayValue}
      onValueChange={(newValue) => {
        const selected = items.find((item) => item.label === newValue)
        if (selected) {
          setSelectedId(selected.value)
          onChange(selected.value)
        }
      }}
    >
      <ComboboxInput placeholder="Search loads by route or date..." value={displayValue} />
      <ComboboxContent>
        <ComboboxEmpty>No matching loads</ComboboxEmpty>
        <ComboboxList>
          {items.map((item) => (
            <ComboboxItem 
              key={item.value} 
              value={item.label}
              className="cursor-pointer"
            >
              {item.label}
            </ComboboxItem>
          ))}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
