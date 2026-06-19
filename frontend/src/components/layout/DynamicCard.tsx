import { cn } from '@/lib/utils'

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

interface DriverCardProps {
  title?: string
  description?: string
  action?: React.ReactNode
  footer?: React.ReactNode
  size?: 'default' | 'sm' | 'md'
  children?: React.ReactNode
  noBorder?: boolean
  noBackground?: boolean
  noFooterStyle?: boolean
  rounded?: 'none' | 'sm' | 'md' | 'lg'
  largeTitle?: boolean
  noPadding?: boolean
  className?: string
  expand?: boolean // When true the card fills its parent height and CardContent becomes scrollable
}

const roundedMap = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
} as const

const roundedTMap = {
  none: 'rounded-t-none',
  sm: 'rounded-t-sm',
  md: 'rounded-t-md',
  lg: 'rounded-t-lg',
} as const

const roundedBMap = {
  none: 'rounded-b-none',
  sm: 'rounded-b-sm',
  md: 'rounded-b-md',
  lg: 'rounded-b-lg',
} as const

export default function DynamicCard({
  title,
  description,
  action,
  footer,
  size = 'md',
  children,
  noBorder,
  noBackground,
  noFooterStyle,
  rounded: roundedProp = 'sm',
  largeTitle,
  noPadding,
  className,
  expand,
}: DriverCardProps) {
  return (
    <Card
      className={cn(
        'mx-auto w-full',
        noBorder && 'ring-0',
        noBackground && 'bg-transparent',
        roundedProp && roundedMap[roundedProp],
        noPadding && '[--card-spacing:0px]',
        className,
        expand && 'flex h-full flex-col overflow-hidden'
      )}
      size={size}
    >
      {(title || description || action) && (
        <CardHeader className={cn(roundedProp && roundedTMap[roundedProp], noPadding && 'p-0')}>
          {title && <CardTitle className={cn(largeTitle && 'text-xl')}>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
          {action && (
            <CardAction
              className={cn(
                size === 'sm' && 'text-xs leading-5 p-0',
                size === 'sm' && '[&_svg]:h-4 [&_svg]:w-4'
              )}
            >
              {action}
            </CardAction>
          )}
        </CardHeader>
      )}
      {children && (
        <CardContent
          className={cn(
            noPadding && 'p-0',
            expand && 'flex min-h-0 flex-1 flex-col overflow-hidden'
          )}
        >
          {children}
        </CardContent>
      )}
      {footer && (
        <CardFooter
          className={cn(
            roundedProp && roundedBMap[roundedProp],
            noFooterStyle && 'bg-transparent border-none',
            noFooterStyle && 'p-(--card-spacing)',
            !noFooterStyle && noPadding && 'p-0'
          )}
        >
          {footer}
        </CardFooter>
      )}
    </Card>
  )
}
