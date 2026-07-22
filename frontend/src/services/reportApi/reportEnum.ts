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

/** A user the caller has actually worked with — valid fraud-report target */
export interface ReportCollaborator {
  _id: string
  name: string
  email: string
}

/** A load the caller (driver) has bid on or been assigned — valid inaccurate-report target */
export interface ReportableLoad {
  _id: string
  originAddress: string
  destinationAddress: string
  commodity: string
  status: string
}

export interface CreateReportPayload {
  reporterId: string
  type: ReportType
  targetType: ReportTargetType
  /** Fraud reports: email of a prior collaborator, resolved server-side */
  targetEmail?: string
  /** Inaccurate reports: free-text name or load ID */
  targetName?: string
  category: string
  description: string
}

/** Minimal user info populated onto admin report rows */
export interface ReportUserRef {
  _id: string
  name: string
  email: string
  role: string
}

/** Report as returned by the admin listing endpoint — reporterId/targetId populated */
export interface AdminReport extends Omit<Report, 'reporterId' | 'targetId'> {
  reporterId: ReportUserRef | null
  targetId: ReportUserRef | null
}

export interface UpdateReportStatusPayload {
  reportId: string
  status: ReportStatus
  adminId?: string
}
