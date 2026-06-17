import { DriverMap, type RouteCoordinate } from '@/components/driverLoads/Map'

const SAMPLE_ROUTES: RouteCoordinate[] = [
  {
    origin: [49.2827, -123.1207], // Vancouver, BC
    destination: [53.5461, -113.4938], // Edmonton, AB
  },
  {
    origin: [51.0447, -114.0719], // Calgary, AB
    destination: [49.8951, -97.1384], // Winnipeg, MB
  },
  {
    origin: [43.6532, -79.3832], // Toronto, ON
    destination: [45.5017, -73.5673], // Montreal, QC
  },
]

export default function MapPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <h1 className="text-2xl font-semibold">Map</h1>
      <div className="min-h-[60vh] flex-1 rounded-xl bg-muted/50 p-6">
        <DriverMap routes={SAMPLE_ROUTES} height="100%" />
      </div>
    </div>
  )
}
