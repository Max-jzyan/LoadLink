import { useState } from 'react'
import DriverLoadTable from '@/components/driverLoads/driverLoadTable'
import { DriverMap } from '@/components/driverLoads/Map'
import Col from '@/components/layout/Col'
import DynamicCard from '@/components/layout/DynamicCard'
import LayoutGrid from '@/components/layout/LayoutGrid'
import Row from '@/components/layout/Row'
import { useListDriverBidsQuery, useListDriverLoadsQuery } from '@/services/driverApi/driverSlice'

const PLACEHOLDER_DRIVER_ID = '6a30df19f9e53fd472dd8954'

export default function DriverLoads() {
  const driverId = PLACEHOLDER_DRIVER_ID

  // Fetch all loads currently on the auction board
  const { data: availableLoads = [], isLoading } = useListDriverLoadsQuery(
    { driverId },
    { skip: !driverId }
  )

  const loadsInTransit = availableLoads.filter((load) => load.status === 'in_transit')
  const completedLoads = availableLoads.filter((load) => load.status === 'completed')

  const { data: activeBids = [] } = useListDriverBidsQuery({ driverId }, { skip: !driverId })

  const routes = availableLoads.map((load) => ({
    id: load._id,
    origin: [load.originCoords.lat, load.originCoords.lng] as [number, number],
    originName: load.originAddress,
    destination: [load.destinationCoords.lat, load.destinationCoords.lng] as [number, number],
    destinationName: load.destinationAddress,
    status: load.status,
  }))

  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null)

  const handleRowClick = (load: (typeof availableLoads)[number]) => {
    setSelectedRouteId(load._id)
  }

  return (
    <LayoutGrid>
      <Row size={1}>
        <Col size={16}>
          <DynamicCard title="Toolbar" content={'Content will go here... eventually'} />
        </Col>
      </Row>
      <Row size={2}>
        <Col size={4}>
          <DynamicCard
            title="My Loads"
            content={availableLoads.length ? availableLoads.length : <p>0</p>}
          />
        </Col>
        <Col size={4}>
          <DynamicCard
            title="Current Loads in Transit"
            content={loadsInTransit.length ? loadsInTransit.length : <p>0</p>}
          />
        </Col>
        <Col size={4}>
          <DynamicCard title="Active Bids" content={activeBids.length} />
        </Col>
        <Col size={4}>
          <DynamicCard title="Completed Loads" content={completedLoads.length} />
        </Col>
      </Row>
      <Row size={7}>
        <Col size={16}>
          <DriverLoadTable
            title={isLoading ? 'Loading...' : 'Available Loads'}
            loads={availableLoads}
            onRowClick={handleRowClick}
          />
        </Col>
      </Row>
      <Row size={8}>
        <Col size={16}>
          <DynamicCard
            title="Map"
            content={<DriverMap routes={routes} selectedRouteId={selectedRouteId} />}
          />
        </Col>
      </Row>
    </LayoutGrid>
  )
}
