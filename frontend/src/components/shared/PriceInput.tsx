import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon } from '@/components/ui/input-group'
import { cn } from '@/lib/utils'
import { PriceInputVariant } from '@/types/enums'
import * as React from 'react'

interface PriceInputProps extends React.ComponentProps<typeof Input> {
  label?: React.ReactNode
  variant: PriceInputVariant
  description?: string
  inputGroupClassName?: string
  fullWidth?: boolean
}

function PriceInput({
  className,
  label = '',
  variant,
  description,
  placeholder,
  inputGroupClassName,
  fullWidth = false,
  ...props
}: PriceInputProps) {
  return (
    <Field className={fullWidth ? '' : 'max-w-sm'}>
      {label && <FieldLabel>{label}</FieldLabel>}

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
