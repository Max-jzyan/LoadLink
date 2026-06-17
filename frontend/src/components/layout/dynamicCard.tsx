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
}: DriverCardProps) {
  return (
    <Card
      className={cn(
        'mx-auto w-full',
        noBorder && 'ring-0',
        noBackground && 'bg-transparent',
        roundedProp && roundedMap[roundedProp],
        noPadding && '[--card-spacing:0px]'
      )}
      size={size}
    >
      {(title || description || action) && (
        <CardHeader
          className={cn(
            roundedProp && roundedTMap[roundedProp],
            noPadding && 'p-0'
          )}
        >
          {title && (
            <CardTitle className={cn(largeTitle && 'text-xl')}>
              {title}
            </CardTitle>
          )}
          {description && <CardDescription>{description}</CardDescription>}
          {action && <CardAction>{action}</CardAction>}
        </CardHeader>
      )}
      {children && (
        <CardContent className={cn(noPadding && 'p-0')}>
          {children}
        </CardContent>
      )}
      {footer && (
        <CardFooter
          className={cn(
            roundedProp && roundedBMap[roundedProp],
            noFooterStyle && 'bg-transparent border-none p-(--card-spacing)',
            noPadding && 'p-0'
          )}
        >
          {footer}
        </CardFooter>
      )}
    </Card>
  )
}