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
  size?: 'default' | 'sm'
  children?: React.ReactNode
}

export default function DynamicCard({
  title,
  description,
  action,
  footer,
  size = 'default',
  children,
}: DriverCardProps) {
  return (
    <Card className="mx-auto w-full" size={size}>
      {(title || description || action) && (
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
          {action && <CardAction>{action}</CardAction>}
        </CardHeader>
      )}
      {children && <CardContent>{children}</CardContent>}
      {footer && <CardFooter>{footer}</CardFooter>}
    </Card>
  )
}
