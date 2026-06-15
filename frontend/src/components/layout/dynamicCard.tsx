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
  content?: React.ReactNode
  footer?: React.ReactNode
  size?: 'default' | 'sm'
}

export default function DynamicCard({
  title,
  description,
  action,
  content,
  footer,
  size = 'default',
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
      {content && <CardContent>{content}</CardContent>}
      {footer && <CardFooter>{footer}</CardFooter>}
    </Card>
  )
}
