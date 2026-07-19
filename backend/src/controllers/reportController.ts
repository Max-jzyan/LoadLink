import { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import * as reportService from '../services/reportService'

/**
 * POST /api/reports
 * Submit a fraud or inaccurate-details report.
 * Body: { type: 'fraud' | 'inaccurate', targetType, targetName, category, description }
 * reporterId is taken from the authenticated caller, not the request body.
 */
export const createReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const report = await reportService.createReport({ ...req.body, reporterId: req.user!._id })
    res.status(StatusCodes.CREATED).json(report)
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/reports/collaborators
 * Users the caller has actually worked with — the only valid fraud-report
 * targets; feeds the report page's autocomplete.
 */
export const getReportCollaborators = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const collaborators = await reportService.getReportableCollaborators(req.user!._id)
    res.status(StatusCodes.OK).json(collaborators)
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/reports/loads
 * Loads the calling driver has actually worked with (bid on or been
 * assigned) — the only valid inaccurate-report targets; feeds the report
 * page's load picker.
 */
export const getReportLoads = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const loads = await reportService.getReportableLoads(req.user!._id)
    res.status(StatusCodes.OK).json(loads)
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/reports/user/:userId
 * Fetch reports submitted by a user, newest first.
 */
export const getReportsByReporter = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.params.userId as string
    const reports = await reportService.getReportsByReporter(userId)
    res.status(StatusCodes.OK).json(reports)
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/reports?status=under_review
 * Fetch all reports (admin view), optionally filtered by status.
 */
export const getAllReports = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = req.query.status as string | undefined
    const reports = await reportService.getAllReports(
      status ? { status: status as never } : undefined
    )
    res.status(StatusCodes.OK).json(reports)
  } catch (err) {
    next(err)
  }
}

/**
 * PATCH /api/reports/:reportId/status
 * Update a report's status (admin action).
 * Body: { status: 'under_review' | 'resolved' | 'dismissed', adminId? }
 */
export const updateReportStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reportId = req.params.reportId as string
    const { status, adminId } = req.body
    const report = await reportService.updateReportStatus(reportId, status, adminId)
    res.status(StatusCodes.OK).json(report)
  } catch (err) {
    next(err)
  }
}
