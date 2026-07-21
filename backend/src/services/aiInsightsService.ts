/**
 * AI Insights service — builds prompts from live data and calls OpenRouter.
 *
 * Two public functions:
 *   getLoadInsight(driverId)       → natural-language commentary on top scored loads
 *   getFuelStopSuggestions(loadId) → list of fuel-stop cities + reasons for a route
 *
 * Both return { available: false } when OPENROUTER_API_KEY is absent, so callers
 * (and the frontend) can hide the feature gracefully.
 */

import { isValidObjectId, Types } from 'mongoose'
import { StatusCodes } from 'http-status-codes'
import { ApiError } from '../utils/ApiError'
import { isAvailable, chat } from './openrouterService'
import { getScoredLoads, haversineKm } from './driverService'
import { LoadModel } from '../models/loads/Load'
import { DriverModel } from '../models/users/Driver'
import { TruckModel } from '../models/trucks/Truck'

// ── types ──────────────────────────────────────────────────────────────────────

export interface LoadInsightResult {
  available: true
  insight: string
}

export interface FuelStopsResult {
  available: true
  stops: FuelStop[]
}

export interface FuelStop {
  city: string
  province: string
  reason: string
}

export interface RestArea {
  city: string
  province: string
  reason: string
}

export interface RestAreasResult {
  available: true
  areas: RestArea[]
}

export interface UnavailableResult {
  available: false
}

// ── helpers ────────────────────────────────────────────────────────────────────

const assertValidId = (id: string, label: string) => {
  if (!isValidObjectId(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, `Invalid ${label}`)
  }
}

/** Extract a clean JSON array from a model reply that may have surrounding prose. */
const extractJsonArray = (text: string): unknown[] => {
  const match = text.match(/\[[\s\S]*\]/)
  if (!match) throw new Error('No JSON array found in model response')
  return JSON.parse(match[0]) as unknown[]
}

// ── public functions ───────────────────────────────────────────────────────────

/**
 * Generate a short natural-language insight about the driver's top recommended loads.
 * Returns { available: false } when OpenRouter is not configured OR on any runtime error
 * so the frontend always degrades silently rather than surfacing a 500.
 */
export const getLoadInsight = async (
  driverId: string
): Promise<LoadInsightResult | UnavailableResult> => {
  if (!isAvailable()) return { available: false }

  // Validate separately so callers still get a 400 for obviously bad IDs
  assertValidId(driverId, 'driverId')

  try {
    // Gather driver profile
    const driver = await DriverModel.findById(new Types.ObjectId(driverId))
      .select('pricingPreferences homeLocation')
      .lean()
    if (!driver) throw new ApiError(StatusCodes.NOT_FOUND, 'Driver not found')

    const trucks = await TruckModel.find({ ownerDriverId: new Types.ObjectId(driverId) })
      .select('truckType trailerLengthFt')
      .lean()
    const truckTypes = [...new Set(trucks.map((t) => t.truckType))]

    // Get scored loads (top 5 eligible, sorted by score)
    const scored = await getScoredLoads(driverId)
    let topScored = scored
      .filter((s) => s.eligibilityFlags.isEligible)
      .sort((a, b) => b.recommendationScore - a.recommendationScore)
      .slice(0, 5)

    if (topScored.length === 0) {
      // Fall back to top 5 regardless of eligibility
      topScored = scored.sort((a, b) => b.recommendationScore - a.recommendationScore).slice(0, 5)
      if (topScored.length === 0) {
        return {
          available: true,
          insight: 'No loads are currently available for analysis.',
        }
      }
    }

    // Fetch load details — full set of fields so AI has rich context
    const topLoadIds = topScored.map((s) => new Types.ObjectId(s.loadId))
    const loads = await LoadModel.find({ _id: { $in: topLoadIds } })
      .select(
        'originAddress destinationAddress commodity route auctionId originCoords destinationCoords ' +
          'pickupTime dropoffTime weightLbs truckType trailerLengthFt certifications driverAssist'
      )
      .populate('auctionId', 'currentPrice capPrice startPrice')
      .lean()

    const loadMap = new Map(loads.map((l) => [l._id.toString(), l]))

    const prefs = (driver.pricingPreferences ?? {}) as Record<string, number>
    const home = driver.homeLocation as Record<string, string> | null | undefined
    const homeStr = home?.city ? `${home.city}, ${home.province ?? ''}` : 'unknown'

    const fmtTime = (d: Date | string | undefined) =>
      d
        ? new Date(d).toLocaleString('en-CA', { timeZone: 'America/Vancouver', hour12: false })
        : null

    const loadsContext = topScored
      .map((s, i) => {
        const load = loadMap.get(s.loadId) as any
        if (!load) return null
        const auction = load.auctionId as any
        const price = auction?.currentPrice ?? auction?.capPrice ?? 0

        // Prefer stored route distance; fall back to haversine straight-line estimate
        let distKm: number | null = (load.route as any)?.distanceKm ?? null
        if (!distKm && load.originCoords && load.destinationCoords) {
          distKm = haversineKm(
            load.originCoords.lat,
            load.originCoords.lng,
            load.destinationCoords.lat,
            load.destinationCoords.lng
          )
        }
        const distStr = distKm ? `~${Math.round(distKm)} km` : 'distance unknown'
        const pickup = fmtTime(load.pickupTime)
        const dropoff = fmtTime(load.dropoffTime)
        const weight = load.weightLbs ? `${load.weightLbs.toLocaleString()} lbs` : null
        const equip = [
          load.truckType,
          load.trailerLengthFt ? `${load.trailerLengthFt}ft trailer` : null,
        ]
          .filter(Boolean)
          .join(', ')
        const extras = [
          load.certifications?.length ? `certs: ${load.certifications.join(', ')}` : null,
          load.driverAssist ? 'driver assist required' : null,
        ]
          .filter(Boolean)
          .join(' | ')

        return [
          `${i + 1}. ${load.originAddress} → ${load.destinationAddress}`,
          `   Pay: $${price.toFixed(0)} | Distance: ${distStr}`,
          `   Commodity: ${load.commodity}${weight ? ` (${weight})` : ''}`,
          equip ? `   Equipment: ${equip}` : null,
          pickup ? `   Pickup: ${pickup}` : null,
          dropoff ? `   Delivery due: ${dropoff}` : null,
          extras ? `   ${extras}` : null,
        ]
          .filter(Boolean)
          .join('\n')
      })
      .filter(Boolean)
      .join('\n\n')

    const systemPrompt = `You are a decisive logistics advisor inside LoadLink, a Canadian freight marketplace where drivers bid on live reverse-auction loads.
ALL data is sourced directly from the LoadLink platform and is accurate — treat every number and address as ground truth.
Never mention internal ranking, algorithm scores, or score numbers. Respond based only on the actual load details.
Never use phrases like "verify", "confirm", "check before", "double-check", or "make sure".
Respond in exactly 2-3 plain sentences. No bullet points. No hedging.`

    const userPrompt = `Driver profile:
- Home: ${homeStr}
- Truck types: ${truckTypes.length ? truckTypes.join(', ') : 'unspecified'}
- Min rate/mile: ${prefs.minimumRatePerMile > 0 ? `$${prefs.minimumRatePerMile}` : 'none set'}
- Min load value: ${prefs.minimumLoadValue > 0 ? `$${prefs.minimumLoadValue}` : 'none set'}

Available loads (pre-sorted best to worst fit for this driver):
${loadsContext || 'None available'}

Recommend the single best load based on its pay, distance, commodity, equipment, and schedule. Do not reference any ranking or score numbers. Do not suggest the driver verify anything.`

    const insight = await chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ])

    return { available: true, insight: insight.trim() }
  } catch (err) {
    console.error('[aiInsightsService] getLoadInsight failed:', err)
    return { available: false }
  }
}

/**
 * Suggest fuel stop cities for a given load's route.
 * Returns { available: false } when OpenRouter is not configured.
 */
export const getFuelStopSuggestions = async (
  loadId: string
): Promise<FuelStopsResult | UnavailableResult> => {
  if (!isAvailable()) return { available: false }

  assertValidId(loadId, 'loadId')

  const load = await LoadModel.findById(new Types.ObjectId(loadId))
    .select('originAddress destinationAddress route pickupTime dropoffTime')
    .lean()
  if (!load) throw new ApiError(StatusCodes.NOT_FOUND, 'Load not found')

  const distKm = (load.route as any)?.distanceKm ?? 0
  const durationHours = (load.route as any)?.durationHours ?? 0
  const distMiles = Math.round(distKm / 1.60934)

  const fmtTime = (d: Date | string | undefined) =>
    d ? new Date(d).toLocaleString('en-CA', { timeZone: 'America/Vancouver', hour12: false }) : null

  const routeContext = [
    `Route: ${(load as any).originAddress} → ${(load as any).destinationAddress}`,
    `Distance: ~${Math.round(distKm)} km (${distMiles} mi)`,
    durationHours > 0 ? `Estimated drive time: ~${durationHours.toFixed(1)} hours` : null,
    fmtTime((load as any).pickupTime) ? `Pickup: ${fmtTime((load as any).pickupTime)}` : null,
    fmtTime((load as any).dropoffTime)
      ? `Delivery due: ${fmtTime((load as any).dropoffTime)}`
      : null,
  ]
    .filter(Boolean)
    .join('\n')

  const systemPrompt = `You are a route planning assistant inside LoadLink, a Canadian freight platform.
You give practical fuel stop advice for long-haul drivers. All route data is accurate and sourced from the platform.
Respond ONLY with a JSON array — no markdown, no explanation, no prose.`

  const userPrompt = `${routeContext}

Only suggest fuel stops if the route genuinely warrants them (typically >200 km or >2.5 hours of driving). For short urban runs, return an empty array.
If stops are appropriate, space them evenly so no single leg exceeds ~300 km or ~3 hours.
Return ONLY a JSON array (empty [] if no stops needed):
[{"city":"City Name","province":"XX","reason":"brief reason e.g. midway point, last stop before remote stretch"}]`

  let raw: string
  try {
    raw = await chat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      undefined,
      400
    )
  } catch (err) {
    console.error('[aiInsightsService] getFuelStopSuggestions failed:', err)
    return { available: false }
  }

  try {
    const parsed = extractJsonArray(raw) as Array<{
      city?: string
      province?: string
      reason?: string
    }>
    const stops: FuelStop[] = parsed
      .filter((s) => s.city && s.province)
      .map((s) => ({
        city: String(s.city),
        province: String(s.province ?? ''),
        reason: String(s.reason ?? ''),
      }))
    return { available: true, stops }
  } catch (err) {
    console.error('[aiInsightsService] Failed to parse fuel stops JSON:', err, '\nRaw:', raw)
    // Return available:false rather than crashing the user's session
    return { available: false }
  }
}

/**
 * Suggest truck rest-area stops for a given load's route.
 * Returns { available: false } when OpenRouter is not configured.
 */
export const getRestAreaSuggestions = async (
  loadId: string
): Promise<RestAreasResult | UnavailableResult> => {
  if (!isAvailable()) return { available: false }

  assertValidId(loadId, 'loadId')

  const load = await LoadModel.findById(new Types.ObjectId(loadId))
    .select('originAddress destinationAddress route pickupTime dropoffTime')
    .lean()
  if (!load) throw new ApiError(StatusCodes.NOT_FOUND, 'Load not found')

  const distKm = (load.route as any)?.distanceKm ?? 0
  const durationHours = (load.route as any)?.durationHours ?? 0
  const distMiles = Math.round(distKm / 1.60934)

  const fmtTime = (d: Date | string | undefined) =>
    d ? new Date(d).toLocaleString('en-CA', { timeZone: 'America/Vancouver', hour12: false }) : null

  const pickupStr = fmtTime((load as any).pickupTime)
  const dropoffStr = fmtTime((load as any).dropoffTime)

  // Compute scheduled window so the AI can judge whether overnight rest is needed
  const scheduledHours =
    (load as any).pickupTime && (load as any).dropoffTime
      ? (new Date((load as any).dropoffTime).getTime() -
          new Date((load as any).pickupTime).getTime()) /
        3_600_000
      : null

  const routeContext = [
    `Route: ${(load as any).originAddress} → ${(load as any).destinationAddress}`,
    `Distance: ~${Math.round(distKm)} km (${distMiles} mi)`,
    durationHours > 0 ? `Estimated drive time: ~${durationHours.toFixed(1)} hours` : null,
    pickupStr ? `Pickup: ${pickupStr}` : null,
    dropoffStr ? `Delivery due: ${dropoffStr}` : null,
    scheduledHours !== null
      ? `Scheduled window: ${scheduledHours.toFixed(1)} hours from pickup to delivery`
      : null,
  ]
    .filter(Boolean)
    .join('\n')

  const systemPrompt = `You are a route planning assistant inside LoadLink, a Canadian freight platform.
Suggest designated truck rest areas, weigh stations with rest facilities, or major truck stops for HOS compliance. All route data is accurate and sourced from the platform.
Respond ONLY with a JSON array — no markdown, no explanation, no prose.`

  const userPrompt = `${routeContext}

Only suggest rest stops if HOS rules genuinely require them: driving time >8 hours OR the delivery is the next calendar day or later (suggesting an overnight run). For short single-shift same-day trips, return an empty array.
When stops are needed, pick real locations (truck stops, designated rest areas, or service plazas) spaced so no driving leg exceeds ~8 hours.
Return ONLY a JSON array (empty [] if no stops needed):
[{"city":"City Name","province":"XX","reason":"brief reason e.g. ~4h mark, overnight stop needed, mandatory 10h rest before delivery window"}]`

  let raw: string
  try {
    raw = await chat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      undefined,
      400
    )
  } catch (err) {
    console.error('[aiInsightsService] getRestAreaSuggestions failed:', err)
    return { available: false }
  }

  try {
    const parsed = extractJsonArray(raw) as Array<{
      city?: string
      province?: string
      reason?: string
    }>
    const areas: RestArea[] = parsed
      .filter((s) => s.city && s.province)
      .map((s) => ({
        city: String(s.city),
        province: String(s.province ?? ''),
        reason: String(s.reason ?? ''),
      }))
    return { available: true, areas }
  } catch (err) {
    console.error('[aiInsightsService] Failed to parse rest areas JSON:', err, '\nRaw:', raw)
    return { available: false }
  }
}
