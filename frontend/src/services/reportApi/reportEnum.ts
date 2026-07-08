export type ReportType = 'fraud' | 'inaccurate'
export type ReportTargetType = 'company' | 'driver'
export type ReportStatus = 'under_review' | 'resolved' | 'dismissed'

/** Report as returned by the backend */
export interface Report {
  _id: string
  reporterId: string
  type: ReportType
  targetType: ReportTargetType
  targetName: string
  targetId: string | null
  category: string
  description: string
  status: ReportStatus
  createdAt: string
  updatedAt: string
}

export interface CreateReportPayload {
  reporterId: string
  type: ReportType
  targetType: ReportTargetType
  targetName: string
  category: string
  description: string
}
