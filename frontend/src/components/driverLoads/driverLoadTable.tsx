import { useCallback, useState, useRef, useMemo } from 'react'
import {
  DataTable,
  type OnTableReadyPayload,
  type DrawerField,
} from '@/components/shared/DataTable'
import type { Load, AuctionSummary, CompanySummary } from '@/services/loadApi/loadEnum'
import type { Truck } from '@/services/driverApi/driverEnum'
import type { Table } from '@tanstack/react-table'
import { columns } from './driverColumns'
import LoadTablePagination from './loadTablePagination'
import DynamicCard from '../layout/DynamicCard'
import { TRUCK_TYPES, type LoadStatus, DRIVER_STATUSES, LOAD_STATUSES } from '@/types/enums'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useSelectTruckForLoadMutation } from '@/services/driverApi/driverSlice'
import { useUpdateLoadStatusMutation } from '@/services/loadApi/loadSlice'
import { useDispatch, useSelector } from 'react-redux'
import { selectMongoId } from '@/services/authSlice'
import { updateLoadInList } from '@/services/driverLoadsSlice'
import type { AppDispatch } from '@/services/store'
import DocumentLinks from '@/components/shared/DocumentLinks'

const TRUCK_LABELS: Record<string, string> = Object.fromEntries(
  TRUCK_TYPES.map((t) => [t.value, t.label])
)

function truckDisplayName(t: Truck) {
  return `${t.year} ${t.make} ${t.model} (${t.trailerLengthFt}ft)`
}

function isPopulatedCompany(value: Load['companyId']): value is CompanySummary {
  return typeof value === 'object' && value !== null && 'companyName' in value
}

function getCurrentPrice(load: Load): number | null {
  const auction = load.auctionId
  return auction && typeof auction === 'object' ? (auction as AuctionSummary).currentPrice : null
}

interface DriverLoadTableProps {
  title: string
  loads: Load[]
  trucks?: Truck[]
  onRowClick?: (load: Load) => void
  selectedId?: string | null
}

export default function DriverLoadTable({
  loads,
  trucks = [],
  onRowClick,
  selectedId,
}: DriverLoadTableProps) {
  const dispatch = useDispatch<AppDispatch>()
  const driverId = useSelector(selectMongoId)
  const [selectTruck] = useSelectTruckForLoadMutation()
  const [updateLoadStatus] = useUpdateLoadStatusMutation()
  const [table, setTable] = useState<Table<Load> | null>(null)
  const [pageIndex, setPageIndex] = useState(0)
  const [, forceRender] = useState(0)
  const pendingChangesRef = useRef<Map<string, { status?: LoadStatus; truckId?: string | null }>>(
    new Map()
  )

  const handleTableReady = (payload: OnTableReadyPayload<Load>) => {
    setTable(payload.table)
    setPageIndex(payload.pageIndex)
  }

  const handleSelectTruck = useCallback((loadId: string, truckId: string | null) => {
    pendingChangesRef.current.set(loadId, {
      ...(pendingChangesRef.current.get(loadId) ?? {}),
      truckId,
    })
    forceRender((k) => k + 1)
  }, [])

  const handleStatusChange = useCallback((loadId: string, newStatus: LoadStatus) => {
    pendingChangesRef.current.set(loadId, {
      ...(pendingChangesRef.current.get(loadId) ?? {}),
      status: newStatus,
    })
    forceRender((k) => k + 1)
  }, [])

  const getStatusKey = useCallback((statusValue: string) => {
    return Object.entries(LOAD_STATUSES).find(([, v]) => v === statusValue)?.[0] ?? statusValue
  }, [])

  const drawerTitle = useCallback((load: Load) => {
    const company = isPopulatedCompany(load.companyId) ? load.companyId : null
    return company?.companyName?.toUpperCase() || load.commodity.toUpperCase()
  }, [])

  const drawerFields = useMemo<DrawerField<Load>[]>(
    () => [
      {
        label: 'Commodity',
        renderValue: (load) => (
          <span className="text-sm font-semibold">{load.commodity.toUpperCase()}</span>
        ),
      },
      {
        label: 'Origin',
        renderValue: (load) => <span className="text-sm">{load.originAddress}</span>,
      },
      {
        label: 'Destination',
        renderValue: (load) => <span className="text-sm">{load.destinationAddress}</span>,
      },
      {
        label: 'Pickup',
        renderValue: (load) => (
          <span>
            <span className="text-sm">{new Date(load.pickupTime).toLocaleDateString()}</span>
            <br />
            <span className="text-xs text-muted-foreground">
              {new Date(load.pickupTime).toLocaleTimeString()}
            </span>
          </span>
        ),
      },
      {
        label: 'Dropoff',
        renderValue: (load) => (
          <span>
            <span className="text-sm">{new Date(load.dropoffTime).toLocaleDateString()}</span>
            <br />
            <span className="text-xs text-muted-foreground">
              {new Date(load.dropoffTime).toLocaleTimeString()}
            </span>
          </span>
        ),
      },
      {
        label: 'Weight',
        renderValue: (load) => <span>{load.weightLbs.toLocaleString()} lbs</span>,
      },
      {
        label: 'Truck Type',
        renderValue: (load) => (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary text-secondary-foreground border border-border">
            {TRUCK_LABELS[load.truckType] ?? load.truckType}
          </span>
        ),
      },
      {
        label: 'Trailer Length',
        renderValue: (load) => <span>{load.trailerLengthFt} ft</span>,
      },
      {
        label: 'Current Price',
        renderValue: (load) => {
          const price = getCurrentPrice(load)
          return (
            <span className="font-semibold">
              {price != null ? `$${price.toLocaleString()}` : '—'}
            </span>
          )
        },
      },
      {
        label: 'Status',
        renderValue: (load) => {
          const pending = pendingChangesRef.current.get(load._id)
          const status = (pending?.status ?? load.status) as LoadStatus
          return (
            <Select
              value={status}
              onValueChange={(val) => handleStatusChange(load._id, val as LoadStatus)}
            >
              <SelectTrigger className="w-full max-w-[240px] h-8 text-sm">
                <SelectValue placeholder="Select status..." />
              </SelectTrigger>
              <SelectContent>
                {DRIVER_STATUSES.map((statusValue) => {
                  const key = getStatusKey(statusValue)
                  return (
                    <SelectItem key={statusValue} value={statusValue}>
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          )
        },
      },
      {
        label: 'Assigned Truck',
        renderValue: (load) => {
          if (trucks.length === 0) {
            return <span className="text-sm text-muted-foreground">No trucks registered</span>
          }
          const pending = pendingChangesRef.current.get(load._id)
          const selectedTruckId = pending?.truckId ?? load.selectedTruckId ?? '__none__'
          return (
            <Select
              value={selectedTruckId}
              onValueChange={(val) => handleSelectTruck(load._id, val === '__none__' ? null : val)}
            >
              <SelectTrigger className="w-full max-w-[240px] h-8 text-sm">
                <SelectValue placeholder="Select a truck..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {trucks.map((t) => (
                  <SelectItem key={t._id} value={t._id}>
                    {truckDisplayName(t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )
        },
      },
    ],
    [trucks, getStatusKey, handleStatusChange, handleSelectTruck]
  )

  const documentDrawerFields = useMemo<DrawerField<Load>[]>(
    () => [
      {
        label: 'Documents',
        renderValue: (load) => <DocumentLinks loadId={load._id} />,
      },
    ],
    []
  )

  const drawerSubmit = useCallback(
    async (load: Load) => {
      if (!driverId) return
      const changes = pendingChangesRef.current.get(load._id)
      if (!changes) return

      dispatch(
        updateLoadInList({
          loadId: load._id,
          changes: {
            ...(changes.status && { status: changes.status }),
            ...(changes.truckId !== undefined && { selectedTruckId: changes.truckId }),
          },
        })
      )

      const promises: Promise<unknown>[] = []
      if (changes.status) {
        promises.push(updateLoadStatus({ driverId, loadId: load._id, status: changes.status }))
      }
      if (changes.truckId !== undefined) {
        promises.push(selectTruck({ loadId: load._id, truckId: changes.truckId }))
      }

      const results = await Promise.allSettled(promises)
      results.forEach((r) => {
        if (
          r.status === 'rejected' ||
          (r.status === 'fulfilled' && (r.value as { error?: unknown })?.error)
        ) {
          console.error(
            'Failed to save changes:',
            r.status === 'rejected' ? r.reason : (r.value as { error?: unknown }).error
          )
        }
      })

      pendingChangesRef.current.delete(load._id)
    },
    [driverId, dispatch, selectTruck, updateLoadStatus]
  )

  return (
    <DynamicCard
      title="Loads"
      footer={table && <LoadTablePagination table={table} currentPage={pageIndex} />}
    >
      <DataTable
        columns={columns(trucks)}
        data={loads}
        onTableReady={handleTableReady}
        onRowClick={onRowClick}
        selectedId={selectedId}
        getId={(load) => load._id}
        drawerTitle={drawerTitle}
        drawerFields={[...drawerFields, ...documentDrawerFields]}
        drawerSubmit={drawerSubmit}
      />
    </DynamicCard>
  )
}
