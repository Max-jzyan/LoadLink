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

        {/* === Missing-field example cards === */}
        <Row size={8}>
          <Col size={8}>
            <DynamicCard
              description="Missing title · 10,000 kg · Dry van"
              action={<Button size="sm">Bid Now</Button>}
              content={
                <div className="space-y-1 text-sm">
                  <p className="text-orange-600 font-medium">⚠ This card is missing a title.</p>
                  <p>
                    <span className="font-medium">Current Price:</span> $1,200.00
                  </p>
                  <p>
                    <span className="font-medium">Distance:</span> 400 km
                  </p>
                </div>
              }
              footer={
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    View Details
                  </Button>
                </div>
              }
            />
          </Col>
          <Col size={8}>
            <DynamicCard
              title="Calgary → Vancouver"
              action={<Button size="sm">Claim Load</Button>}
              content={
                <div className="space-y-1 text-sm">
                  <p className="text-orange-600 font-medium">
                    ⚠ This card is missing a description.
                  </p>
                  <p>
                    <span className="font-medium">Current Price:</span> $2,100.00
                  </p>
                  <p>
                    <span className="font-medium">Distance:</span> 965 km
                  </p>
                </div>
              }
              footer={
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    View Details
                  </Button>
                </div>
              }
            />
          </Col>
          <Col size={8}>
            <DynamicCard
              title="Montreal → Toronto"
              description="Electronics · 5,000 kg · Dry van"
              content={
                <div className="space-y-1 text-sm">
                  <p className="text-orange-600 font-medium">
                    ⚠ This card is missing an action button.
                  </p>
                  <p>
                    <span className="font-medium">Current Price:</span> $1,650.00
                  </p>
                  <p>
                    <span className="font-medium">Distance:</span> 540 km
                  </p>
                </div>
              }
              footer={
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    View Details
                  </Button>
                </div>
              }
            />
          </Col>
        </Row>
        <Row size={8}>
          <Col size={8}>
            <DynamicCard
              title="Winnipeg → Edmonton"
              description="Lumber · 20,000 kg · Flatbed"
              action={<Button size="sm">Bid Now</Button>}
              footer={
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    View Details
                  </Button>
                </div>
              }
            />
          </Col>
          <Col size={8}>
            <DynamicCard
              title="Ottawa → Halifax"
              description="Consumer goods · 15,000 kg · Dry van"
              action={<Button size="sm">Claim Load</Button>}
              content={
                <div className="space-y-1 text-sm">
                  <p className="text-orange-600 font-medium">⚠ This card is missing a footer.</p>
                  <p>
                    <span className="font-medium">Current Price:</span> $2,800.00
                  </p>
                  <p>
                    <span className="font-medium">Distance:</span> 1,200 km
                  </p>
                </div>
              }
            />
          </Col>
          <Col size={8}>
            <DynamicCard
              action={<Button size="sm">Bid Now</Button>}
              content={
                <div className="space-y-1 text-sm">
                  <p className="text-orange-600 font-medium">
                    ⚠ This card is missing a title and description.
                  </p>
                  <p>
                    <span className="font-medium">Current Price:</span> $950.00
                  </p>
                  <p>
                    <span className="font-medium">Distance:</span> 300 km
                  </p>
                </div>
              }
              footer={
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    View Details
                  </Button>
                </div>
              }
            />
          </Col>
        </Row>
        <Row size={8}>
          <Col size={8}>
            <DynamicCard
              title="Regina → Saskatoon"
              description="Grain · 18,000 kg · Hopper bottom"
              content={
                <div className="space-y-1 text-sm">
                  <p className="text-orange-600 font-medium">
                    ⚠ This card is missing an action button and footer.
                  </p>
                  <p>
                    <span className="font-medium">Current Price:</span> $750.00
                  </p>
                  <p>
                    <span className="font-medium">Distance:</span> 260 km
                  </p>
                </div>
              }
            />
          </Col>
          <Col size={8}>
            <DynamicCard
              content={
                <div className="space-y-1 text-sm">
                  <p className="text-orange-600 font-medium">
                    ⚠ This card only has content — no title, description, action, or footer.
                  </p>
                  <p>
                    <span className="font-medium">Current Price:</span> $500.00
                  </p>
                  <p>
                    <span className="font-medium">Distance:</span> 150 km
                  </p>
                </div>
              }
            />
          </Col>
          <Col size={8}>
            <DynamicCard
              title="Victoria → Kelowna"
              description="Wine crates · 6,000 kg · Reefer trailer"
              action={<Button size="sm">Claim Load</Button>}
              content={
                <div className="space-y-1 text-sm">
                  <p className="text-orange-600 font-medium">⚠ This card is missing a footer.</p>
                  <p>
                    <span className="font-medium">Current Price:</span> $1,100.00
                  </p>
                  <p>
                    <span className="font-medium">Distance:</span> 350 km
                  </p>
                </div>
              }
            />
          </Col>
        </Row>
        <Row size={8}>
          <Col size={8}>
            <DynamicCard
              title="Fredericton → Moncton"
              action={<Button size="sm">Bid Now</Button>}
              content={
                <div className="space-y-1 text-sm">
                  <p className="text-orange-600 font-medium">
                    ⚠ This card is missing a description and footer.
                  </p>
                  <p>
                    <span className="font-medium">Current Price:</span> $420.00
                  </p>
                  <p>
                    <span className="font-medium">Distance:</span> 130 km
                  </p>
                </div>
              }
            />
          </Col>
          <Col size={8}>
            <DynamicCard
              description="Chemicals · 9,000 kg · Tanker"
              content={
                <div className="space-y-1 text-sm">
                  <p className="text-orange-600 font-medium">
                    ⚠ This card is missing a title, action, and footer.
                  </p>
                  <p>
                    <span className="font-medium">Current Price:</span> $1,750.00
                  </p>
                  <p>
                    <span className="font-medium">Distance:</span> 600 km
                  </p>
                </div>
              }
            />
          </Col>
          <Col size={8}>
            <DynamicCard
              title="Thunder Bay → Sault Ste. Marie"
              description="Paper rolls · 14,000 kg · Dry van"
              action={<Button size="sm">Claim Load</Button>}
              content={
                <div className="space-y-1 text-sm">
                  <p className="text-orange-600 font-medium">⚠ This card is missing a footer.</p>
                  <p>
                    <span className="font-medium">Current Price:</span> $1,350.00
                  </p>
                  <p>
                    <span className="font-medium">Distance:</span> 700 km
                  </p>
                </div>
              }
            />
          </Col>
        </Row>
      </LayoutGrid>
    </>
  )
}
