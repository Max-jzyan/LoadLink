import { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import * as reportService from '../services/reportService'

/**
 * POST /api/reports
 * Submit a fraud or inaccurate-details report.
 * Body: { reporterId, type: 'fraud' | 'inaccurate', targetType, targetName, category, description }
 */
export const createReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const report = await reportService.createReport(req.body)
    res.status(StatusCodes.CREATED).json(report)
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
