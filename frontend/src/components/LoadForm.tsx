import type { CreateLoadPayload } from '@/services/loadApi/loadEnum'

export type LoadFormValues = CreateLoadPayload

interface LoadFormProps {
  initialValues?: Partial<LoadFormValues>
  onSubmit: (values: LoadFormValues) => void
}

export function LoadForm({ initialValues: _initialValues, onSubmit: _onSubmit }: LoadFormProps) {
  // TODO: implement
  return null
}
