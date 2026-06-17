import * as React from 'react'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon } from '@/components/ui/input-group'
import { PriceInputVariant } from '@/types/enums'
import { cn } from '@/lib/utils'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'

interface PriceInputProps extends React.ComponentProps<typeof Input> {
  label: string
  variant: PriceInputVariant
  description?: string
  inputGroupClassName?: string
}

function PriceInput({
  className,
  label,
  variant,
  description,
  placeholder,
  inputGroupClassName,
  ...props
}: PriceInputProps) {
  return (
    <Field className="max-w-sm">
      <FieldLabel>{label}</FieldLabel>

      <InputGroup className={inputGroupClassName}>
        <InputGroupAddon
          align="inline-start"
          className={cn('bg-transparent text-muted-foreground px-3')}
        >
          $
        </InputGroupAddon>
        <Input
          type="number"
          step="0.01"
          min="0"
          className={cn(className, 'rounded-none border-0')}
          placeholder={placeholder}
          {...props}
        />
        {variant === PriceInputVariant.ESCALATION && (
          <InputGroupAddon
            align="inline-end"
            className={cn('bg-transparent text-muted-foreground w-25')}
          >
            / hour
          </InputGroupAddon>
        )}
      </InputGroup>
      {description && <FieldDescription>{description}</FieldDescription>}
    </Field>
  )
}

export { PriceInput }
