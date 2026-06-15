import Col from '@/components/layout/Col'
import DynamicCard from '@/components/layout/dynamicCard'
import LayoutGrid from '@/components/layout/LayoutGrid'
import Row from '@/components/layout/Row'
import { Button } from '@/components/ui/button'

export default function DriverLoads() {
  return (
    <>
      <LayoutGrid>
        <Row size={8}>
          <Col size={8}>
            <DynamicCard
              title="Vancouver → Calgary"
              description="Frozen vegetables · 18,000 kg · Reefer trailer"
              action={<Button size="sm">Bid Now</Button>}
              content={
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="font-medium">Current Price:</span> $2,450.00
                  </p>
                  <p>
                    <span className="font-medium">Max Price Cap:</span> $3,200.00
                  </p>
                  <p>
                    <span className="font-medium">Distance:</span> 965 km
                  </p>
                  <p>
                    <span className="font-medium">Pickup:</span> Jun 16, 2026 at 8:00 AM
                  </p>
                  <p>
                    <span className="font-medium">Delivery:</span> Jun 17, 2026 by 6:00 PM
                  </p>
                </div>
              }
              footer={
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    View Details
                  </Button>
                  <Button size="sm" variant="destructive">
                    Decline
                  </Button>
                </div>
              }
            />
          </Col>
          <Col size={8}>
            <DynamicCard
              title="Toronto → Montreal"
              description="Auto parts · 12,500 kg · Dry van"
              action={<Button size="sm">Claim Load</Button>}
              content={
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="font-medium">Current Price:</span> $1,875.00
                  </p>
                  <p>
                    <span className="font-medium">Max Price Cap:</span> $2,400.00
                  </p>
                  <p>
                    <span className="font-medium">Distance:</span> 540 km
                  </p>
                  <p>
                    <span className="font-medium">Pickup:</span> Jun 15, 2026 at 6:00 AM
                  </p>
                  <p>
                    <span className="font-medium">Delivery:</span> Jun 15, 2026 by 4:00 PM
                  </p>
                </div>
              }
              footer={
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    View Details
                  </Button>
                  <Button size="sm" variant="destructive">
                    Decline
                  </Button>
                </div>
              }
            />
          </Col>
        </Row>
        <Row size={8}>
          <Col size={8}>
            <DynamicCard
              title="Edmonton → Winnipeg"
              description="Palletized consumer goods · 22,000 kg · Dry van"
              action={<Button size="sm">Bid Now</Button>}
              content={
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="font-medium">Current Price:</span> $3,100.00
                  </p>
                  <p>
                    <span className="font-medium">Max Price Cap:</span> $4,000.00
                  </p>
                  <p>
                    <span className="font-medium">Distance:</span> 1,250 km
                  </p>
                  <p>
                    <span className="font-medium">Pickup:</span> Jun 18, 2026 at 10:00 AM
                  </p>
                  <p>
                    <span className="font-medium">Delivery:</span> Jun 20, 2026 by 12:00 PM
                  </p>
                </div>
              }
              footer={
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    View Details
                  </Button>
                  <Button size="sm" variant="destructive">
                    Decline
                  </Button>
                </div>
              }
            />
          </Col>
          <Col size={8}>
            <DynamicCard
              title="Halifax → Ottawa"
              description="Seafood (refrigerated) · 8,000 kg · Reefer trailer"
              action={<Button size="sm">Claim Load</Button>}
              content={
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="font-medium">Current Price:</span> $2,950.00
                  </p>
                  <p>
                    <span className="font-medium">Max Price Cap:</span> $3,600.00
                  </p>
                  <p>
                    <span className="font-medium">Distance:</span> 1,400 km
                  </p>
                  <p>
                    <span className="font-medium">Pickup:</span> Jun 15, 2026 at 3:00 AM
                  </p>
                  <p>
                    <span className="font-medium">Delivery:</span> Jun 17, 2026 by 8:00 AM
                  </p>
                </div>
              }
              footer={
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    View Details
                  </Button>
                  <Button size="sm" variant="destructive">
                    Decline
                  </Button>
                </div>
              }
            />
          </Col>
          <Col size={8}>
            <DynamicCard
              title="Windsor → Quebec City"
              description="Industrial machinery · 30,000 kg · Flatbed"
              action={<Button size="sm">Bid Now</Button>}
              content={
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="font-medium">Current Price:</span> $2,700.00
                  </p>
                  <p>
                    <span className="font-medium">Max Price Cap:</span> $3,500.00
                  </p>
                  <p>
                    <span className="font-medium">Distance:</span> 1,100 km
                  </p>
                  <p>
                    <span className="font-medium">Pickup:</span> Jun 19, 2026 at 7:00 AM
                  </p>
                  <p>
                    <span className="font-medium">Delivery:</span> Jun 20, 2026 by 5:00 PM
                  </p>
                </div>
              }
              footer={
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    View Details
                  </Button>
                  <Button size="sm" variant="destructive">
                    Decline
                  </Button>
                </div>
              }
            />
          </Col>
          <Col size={8}>
            <DynamicCard
              title="Saskatoon → Regina"
              description="Grain seed · 25,000 kg · Hopper bottom trailer"
              action={<Button size="sm">Claim Load</Button>}
              content={
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="font-medium">Current Price:</span> $850.00
                  </p>
                  <p>
                    <span className="font-medium">Max Price Cap:</span> $1,200.00
                  </p>
                  <p>
                    <span className="font-medium">Distance:</span> 260 km
                  </p>
                  <p>
                    <span className="font-medium">Pickup:</span> Jun 15, 2026 at 9:00 AM
                  </p>
                  <p>
                    <span className="font-medium">Delivery:</span> Jun 15, 2026 by 12:00 PM
                  </p>
                </div>
              }
              footer={
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    View Details
                  </Button>
                  <Button size="sm" variant="destructive">
                    Decline
                  </Button>
                </div>
              }
            />
          </Col>
        </Row>
      </LayoutGrid>
    </>
  )
}
