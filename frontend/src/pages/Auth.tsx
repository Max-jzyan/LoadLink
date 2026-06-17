import AuthForm from '@/components/authentication/AuthForm'
import LayoutGrid from '@/components/layout/LayoutGrid'
import Row from '@/components/layout/Row'
import Col from '@/components/layout/Col'

export default function Auth() {
  return (
    <div className="h-screen">
      <LayoutGrid>
        <Row size={16}>
          <Col size={16}>
            <div className="flex items-center justify-center h-full">
              <AuthForm />
            </div>
          </Col>
        </Row>
      </LayoutGrid>
    </div>
  )
}
