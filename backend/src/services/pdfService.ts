/**
 * pdfService.ts
 *
 * Generates a rate-confirmation PDF using pdf-lib.
 * Logo: place a PNG at backend/src/templates/logo.png — it will be embedded
 * automatically in the header band.  If the file is absent the header renders
 * without a logo (graceful fallback).
 */

import fs from 'fs'
import path from 'path'
import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from 'pdf-lib'
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { AWS_REGION, S3_BUCKET, s3Client } from '../config/s3Client'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RateConfirmationData {
  // ── Identity
  loadId: string       // maps to Order #
  bidId: string        // maps to Platform Authorization ID
  bolNumber?: string   // Bill of Lading # (auto-generated if not supplied)
  proNumber?: string   // PRO / carrier tracking number

  // ── Company / Shipper
  companyName: string
  companyAddress?: string
  companyCity?: string       // City / St / Zip of origin
  companyContact?: string    // Contact name at origin
  invoiceEmail?: string      // Where to email BOL/POD paperwork

  // ── Carrier / Driver
  driverName: string
  driverPhone?: string
  driverEmail?: string
  mcNumber?: string          // FMCSA Motor Carrier number
  dotNumber?: string         // US DOT number
  nscCvorNumber?: string     // NSC / CVOR (Canadian equivalent)
  truckNumber?: string       // Truck unit number
  trailerNumber?: string     // Trailer unit number

  // ── Load & Equipment
  originAddress: string
  originCity?: string
  originContact?: string
  destinationAddress: string
  destinationCity?: string
  destinationContact?: string
  pickupTime: Date
  dropoffTime: Date
  poRelNumber?: string       // P.O. / Release # at origin
  apptRefNumber?: string     // Appointment / Ref # at destination
  commodity: string
  weightLbs: number
  truckType: string          // Equipment type
  trailerLengthFt?: number   // trailer length
  tempRequirement?: string   // reefer temp, if applicable
  specialInstructions?: string

  // ── Rate & Compensation
  finalPayout: number        // Total to be paid to carrier
  linehaulRate?: number      // Linehaul portion
  fuelSurcharge?: number     // FSC
  accessorials?: number      // Other accessorial charges
  currency: string

  // ── Meta
  confirmedAt: Date
}

// ── Layout constants ──────────────────────────────────────────────────────────

const PW = 612   // letter width  (72 dpi)
const PH = 792   // letter height
const ML = 36    // left margin
const MR = PW - 36 // right margin
const LH = 13    // standard line height
const SMALL = 8
const BODY = 9
const SUB = 11
const HEAD = 13

const BRAND = rgb(0.10, 0.22, 0.56)   // dark navy
const DARK  = rgb(0.08, 0.08, 0.08)
const GRAY  = rgb(0.45, 0.45, 0.45)
const LGRAY = rgb(0.85, 0.85, 0.85)
const WHITE = rgb(1, 1, 1)
const RULE_HEAVY = 1.5
const RULE_LIGHT = 0.8

// ── Helpers ───────────────────────────────────────────────────────────────────

type Ctx = { page: PDFPage; bold: PDFFont; reg: PDFFont; y: number }

/** Word-wrap `str` into lines that fit within `maxWidth` pts at `size`. */
function wrapLines(str: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = str.split(' ')
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate
    } else {
      if (current) lines.push(current)
      current = word
    }
  }
  if (current) lines.push(current)
  return lines
}

/** Draw wrapped text, advancing ctx.y for each wrapped line. */
function wrappedText(
  ctx: Ctx,
  str: string,
  x: number,
  opts: { size?: number; font?: PDFFont; color?: ReturnType<typeof rgb>; maxWidth?: number } = {}
) {
  const size     = opts.size     ?? BODY
  const font     = opts.font     ?? ctx.reg
  const color    = opts.color    ?? DARK
  const maxWidth = opts.maxWidth ?? (MR - x)
  const lines    = wrapLines(str, font, size, maxWidth)
  for (const line of lines) {
    ctx.page.drawText(line, { x, y: ctx.y, size, font, color })
    ctx.y -= size + 4   // tight line spacing for wrapped text
  }
}

function hRule(ctx: Ctx, thickness = RULE_LIGHT, color = LGRAY) {
  ctx.page.drawLine({
    start: { x: ML, y: ctx.y },
    end:   { x: MR, y: ctx.y },
    thickness,
    color,
  })
  ctx.y -= thickness + 3
}

function text(
  ctx: Ctx,
  str: string,
  x: number,
  opts: { size?: number; font?: PDFFont; color?: ReturnType<typeof rgb> } = {}
) {
  ctx.page.drawText(str, {
    x,
    y: ctx.y,
    size:  opts.size  ?? BODY,
    font:  opts.font  ?? ctx.reg,
    color: opts.color ?? DARK,
  })
}

function kv(
  ctx: Ctx,
  label: string,
  value: string,
  labelX: number,
  valueX: number,
  colWidth = 160
) {
  text(ctx, label, labelX, { font: ctx.bold, size: BODY, color: GRAY })
  // wrap value if it exceeds column width
  const display = value.length > 28 ? value.slice(0, 26) + '…' : value
  text(ctx, display, valueX, { size: BODY })
}

function sectionHeader(ctx: Ctx, title: string) {
  ctx.page.drawRectangle({
    x: ML, y: ctx.y - 2,
    width: MR - ML, height: LH + 4,
    color: BRAND,
  })
  text(ctx, title, ML + 4, { size: SUB, font: ctx.bold, color: WHITE })
  ctx.y -= LH + 8
}

function formatDT(d: Date) {
  return (
    d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' ' +
    d.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit', hour12: false })
  )
}

// ── Main generator ────────────────────────────────────────────────────────────

export const generateRateConfirmationPdf = async (
  data: RateConfirmationData
): Promise<{ key: string; url: string }> => {

  const pdfDoc = await PDFDocument.create()
  const page   = pdfDoc.addPage([PW, PH])
  const bold   = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const reg    = await pdfDoc.embedFont(StandardFonts.Helvetica)

  const ctx: Ctx = { page, bold, reg, y: PH - ML }

  // ── HEADER BAND ─────────────────────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: PH - 60, width: PW, height: 60, color: BRAND })

  // Left: logo PNG (backend/src/templates/logo.png) — graceful fallback if absent
  const LOGO_SIZE = 40   // pt — logo is rendered as a square in the header
  let brandX = ML        // will shift right if a logo is embedded
  try {
    const logoPngPath = path.resolve(__dirname, '../templates/logo.png')
    const logoPngBytes = fs.readFileSync(logoPngPath)
    const logoImage = await pdfDoc.embedPng(logoPngBytes)
    page.drawImage(logoImage, {
      x:      ML,
      y:      PH - 60 + (60 - LOGO_SIZE) / 2,   // vertically centred in the 60pt band
      width:  LOGO_SIZE,
      height: LOGO_SIZE,
    })
    brandX = ML + LOGO_SIZE + 6   // shift text 6 pt clear of logo's right edge
  } catch {
    // logo.png not found — render header without it
  }

  // Left: LoadLink brand
  page.drawText('LoadLink', { x: brandX, y: PH - 24, size: 18, font: bold, color: WHITE })
  page.drawText('Automated Freight Platform', { x: brandX, y: PH - 38, size: SMALL, font: reg, color: rgb(0.75, 0.85, 1) })

  // Centre: RATE CONFIRMATION + Order/BOL
  const bolNum = data.bolNumber ?? `BOL-${data.loadId.slice(-6).toUpperCase()}`
  const orderNum = data.loadId.slice(-10).toUpperCase()
  page.drawText('RATE CONFIRMATION', { x: 210, y: PH - 22, size: HEAD, font: bold, color: WHITE })
  page.drawText(`Order #: ${orderNum}`, { x: 210, y: PH - 36, size: SMALL, font: reg, color: WHITE })
  page.drawText(`BOL #:   ${bolNum}`,   { x: 210, y: PH - 48, size: SMALL, font: reg, color: WHITE })

  // Right: date / dispatch / Pro #
  const dateStr = data.confirmedAt.toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })
  const proStr  = data.proNumber ?? `PRO-${data.bidId.slice(-6).toUpperCase()}`
  page.drawText(`Date: ${dateStr}`,      { x: 430, y: PH - 22, size: SMALL, font: reg, color: WHITE })
  page.drawText('Dispatch: +1 (519) 988-6223', { x: 430, y: PH - 34, size: SMALL, font: reg, color: WHITE })
  page.drawText(`Pro #: ${proStr}`,      { x: 430, y: PH - 46, size: SMALL, font: reg, color: WHITE })

  ctx.y = PH - 70

  // Dispatch instructions line
  text(ctx, `Dispatch instructions: Have driver confirm load info on LoadLink platform before pickup.`, ML, { size: SMALL, color: GRAY })
  ctx.y -= LH

  // ── CARRIER INFORMATION ──────────────────────────────────────────────────────
  hRule(ctx, RULE_HEAVY, BRAND)
  ctx.y += 2
  sectionHeader(ctx, 'CARRIER INFORMATION')

  const col2 = ML + 180
  const col3 = ML + 350

  kv(ctx, 'Carrier:', data.driverName, ML, ML + 70)
  kv(ctx, 'MC #:', data.mcNumber ?? '—', col2, col2 + 40)
  kv(ctx, 'US DOT #:', data.dotNumber ?? '—', col3, col3 + 60)
  ctx.y -= LH

  kv(ctx, 'Driver:', data.driverName, ML, ML + 70)
  kv(ctx, 'Cell:', data.driverPhone ?? '—', col2, col2 + 40)
  kv(ctx, 'NSC/CVOR #:', data.nscCvorNumber ?? '—', col3, col3 + 70)
  ctx.y -= LH

  kv(ctx, 'Truck #:', data.truckNumber ?? '—', ML, ML + 70)
  kv(ctx, 'Trailer #:', data.trailerNumber ?? '—', col2, col2 + 60)
  kv(ctx, 'Email:', data.driverEmail ?? '—', col3, col3 + 44)
  ctx.y -= LH + 2

  // ── LOAD & EQUIPMENT ─────────────────────────────────────────────────────────
  hRule(ctx, RULE_LIGHT)
  sectionHeader(ctx, 'LOAD & EQUIPMENT REQUIREMENTS')

  kv(ctx, 'Equipment:', data.truckType, ML, ML + 70)
  kv(ctx, 'Commodity:', data.commodity, col2, col2 + 70)
  kv(ctx, 'Temp Req:', data.tempRequirement ?? 'N/A', col3, col3 + 60)
  ctx.y -= LH

  kv(ctx, 'Weight:', `${data.weightLbs.toLocaleString()} lbs`, ML, ML + 70)
  kv(ctx, 'Length:', data.trailerLengthFt ? `${data.trailerLengthFt} ft` : '—', col2, col2 + 50)
  ctx.y -= LH + 2

  // ── ROUTING ──────────────────────────────────────────────────────────────────
  hRule(ctx, RULE_HEAVY, BRAND)
  ctx.y += 2

  // Two-column headers
  const midX = ML + (MR - ML) / 2 + 5
  page.drawRectangle({ x: ML, y: ctx.y - 2, width: (midX - ML) - 4, height: LH + 4, color: BRAND })
  page.drawRectangle({ x: midX, y: ctx.y - 2, width: MR - midX, height: LH + 4, color: BRAND })
  text(ctx, 'ORIGIN', ML + 4, { size: SUB, font: bold, color: WHITE })
  text(ctx, 'DESTINATION', midX + 4, { size: SUB, font: bold, color: WHITE })
  ctx.y -= LH + 6

  const routeRows: [string, string, string, string][] = [
    ['Shipper:', data.companyName,          'Consignee:', data.destinationAddress.split(',')[0] ?? '—'],
    ['Address:', data.originAddress,         'Address:',  data.destinationAddress],
    ['City/St:',  data.originCity ?? '—',   'City/St:',  data.destinationCity ?? '—'],
    ['Contact:', data.companyContact ?? '—', 'Contact:',  data.destinationContact ?? '—'],
    ['Date/Time:', formatDT(data.pickupTime),'Date/Time:', formatDT(data.dropoffTime)],
    ['P.O./Rel #:', data.poRelNumber ?? '—', 'Appt/Ref #:', data.apptRefNumber ?? '—'],
  ]

  for (const [lk, lv, rk, rv] of routeRows) {
    kv(ctx, lk, lv, ML, ML + 68)
    kv(ctx, rk, rv, midX, midX + 76)
    ctx.y -= LH
  }
  ctx.y -= 2

  // ── RATE & COMPENSATION ──────────────────────────────────────────────────────
  hRule(ctx, RULE_HEAVY, BRAND)
  ctx.y += 2
  sectionHeader(ctx, 'RATE & COMPENSATION')

  const rateColLabel = ML
  const rateColAmt   = MR - 80

  const linehaul    = data.linehaulRate    ?? data.finalPayout
  const fsc         = data.fuelSurcharge   ?? 0
  const accessorial = data.accessorials    ?? 0
  const total       = linehaul + fsc + accessorial

  const rateRows: [string, number][] = [
    ['Linehaul:', linehaul],
    ['Fuel Surcharge (FSC):', fsc],
    ['Accessorials:', accessorial],
  ]
  for (const [label, amount] of rateRows) {
    text(ctx, label, rateColLabel, { size: BODY, font: reg })
    text(ctx, `${data.currency} $${amount.toFixed(2)}`, rateColAmt, { size: BODY, font: reg })
    ctx.y -= LH
  }
  ctx.y -= 4   // extra gap so the highlight box does not clip Accessorials above

  // Total row — highlighted (rect sits strictly below ctx.y)
  page.drawRectangle({ x: ML, y: ctx.y - 3, width: MR - ML, height: LH + 3, color: rgb(0.92, 0.95, 1) })
  text(ctx, 'Total to be paid to Carrier:', rateColLabel, { size: BODY, font: bold, color: BRAND })
  text(ctx, `${data.currency} $${total.toFixed(2)}`, rateColAmt, { size: HEAD, font: bold, color: BRAND })
  ctx.y -= LH + 10

  // Special instructions
  if (data.specialInstructions) {
    text(ctx, 'Special Instructions:', ML, { font: bold, size: BODY })
    ctx.y -= LH
    text(ctx, data.specialInstructions, ML + 10, { size: SMALL, color: DARK })
    ctx.y -= LH
  }

  // ── OPERATIONAL RULES ────────────────────────────────────────────────────────
  hRule(ctx, RULE_LIGHT)
  text(ctx, 'OPERATIONAL RULES & BILL OF LADING INSTRUCTIONS', ML, { font: bold, size: SMALL, color: BRAND })
  ctx.y -= LH

  const opRules = [
    'Detention & TONU: LoadLink requires 4 hrs loading / 4 hrs unloading before detention. Detention rate $60.00/hr (LoadLink approval required). TONU = $100.00.',
    'Pre-Approval: ALL LOADING AND UNLOADING FEES MUST BE PRE-APPROVED.',
    'BOL: Sealed loads require seal number + "Seal Intact" on BOL. Driver must count or get "SLC" notation.',
    `Completion: Call LoadLink when loaded and upon delivery. Fax/email signed BOL/POD to ${data.invoiceEmail ?? 'dispatch@loadlink.io'}.`,
  ]
  for (const rule of opRules) {
    ctx.y -= 2
    wrappedText(ctx, `- ${rule}`, ML + 8, { size: SMALL, color: GRAY, maxWidth: MR - ML - 8 })
  }
  ctx.y -= 5

  hRule(ctx, RULE_LIGHT)
  text(ctx, 'LEGAL TERMS & CONDITIONS (US & CANADA COMPLIANT)', ML, { font: bold, size: SMALL, color: BRAND })
  ctx.y -= LH

  const legalItems = [
    'Acceptance & Anti-Double Brokering: Carrier warrants freight will move on its own equipment. Co/double-brokering is strictly prohibited (49 U.S.C. §14916).',
    'Compliance: Carrier must comply with all FMCSA, Transport Canada, and applicable state/provincial regulations, including CBP/CBSA (ACE/ACI eManifests, PAPS/PARS) for cross-border shipments.',
    'Liability: Carrier accepts full liability for loss/damage/delay under Carmack Amendment (US) or applicable Highway Traffic Acts (Canada), up to $100,000/conveyance unless Declared Value is stated above.',
  ]
  for (const item of legalItems) {
    ctx.y -= 2
    wrappedText(ctx, `- ${item}`, ML + 8, { size: SMALL, color: GRAY, maxWidth: MR - ML - 8 })
  }
  ctx.y -= 5

  // ── EXECUTION ────────────────────────────────────────────────────────────────
  hRule(ctx, RULE_HEAVY, BRAND)
  ctx.y += 2
  text(ctx, 'EXECUTION OF AGREEMENT', ML, { font: bold, size: SUB, color: BRAND })
  ctx.y -= LH + 2

  wrappedText(
    ctx,
    "This Rate Confirmation was generated automatically by the LoadLink platform upon the Carrier's acceptance of the load.",
    ML,
    { size: SMALL, color: GRAY, maxWidth: MR - ML }
  )
  ctx.y -= 4
  wrappedText(
    ctx,
    'This document serves as a binding contract. No physical signature is required from the Shipper or LoadLink.',
    ML,
    { size: SMALL, color: GRAY, maxWidth: MR - ML }
  )
  ctx.y -= 6

  text(ctx, `Platform Authorization ID: ${data.bidId}`, ML, { size: SMALL, font: bold })
  ctx.y -= LH + 8

  // Signature line
  page.drawLine({ start: { x: ML, y: ctx.y }, end: { x: ML + 280, y: ctx.y }, thickness: 0.5, color: DARK })
  page.drawLine({ start: { x: ML + 310, y: ctx.y }, end: { x: MR, y: ctx.y }, thickness: 0.5, color: DARK })
  ctx.y -= LH - 2
  text(ctx, 'Carrier Authorized Representative (e-Signature)', ML, { size: SMALL, color: GRAY })
  text(ctx, 'Date', ML + 310, { size: SMALL, color: GRAY })

  // ── Footer ───────────────────────────────────────────────────────────────────
  page.drawText(
    `Generated by LoadLink · ${data.confirmedAt.toISOString()} · RC-${data.bidId.slice(-8).toUpperCase()}`,
    { x: ML, y: 20, size: 7, font: reg, color: LGRAY }
  )

  // ── Serialize & upload to S3 ─────────────────────────────────────────────────
  const pdfBytes = await pdfDoc.save()
  const key = `rateconfirmations/${data.loadId}/rc_${data.bidId}.pdf`

  await s3Client.send(
    new PutObjectCommand({
      Bucket:      S3_BUCKET,
      Key:         key,
      Body:        Buffer.from(pdfBytes),
      ContentType: 'application/pdf',
    })
  )

  // Presigned GET URL valid for 7 days
  const getCmd = new GetObjectCommand({ Bucket: S3_BUCKET, Key: key })
  const url = await getSignedUrl(s3Client, getCmd, { expiresIn: 7 * 24 * 3600 })

  return { key, url }
}
