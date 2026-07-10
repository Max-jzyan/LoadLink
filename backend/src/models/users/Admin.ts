import { Schema } from 'mongoose'
import { USER_ROLES } from '../enums'
import { UserModel } from './User'

const AdminSchema = new Schema({
  /**
   * Admins who handle document verification are flagged here so UI can show
   * a "Document Processor" badge.
   */
  canProcessDocuments: { type: Boolean, default: true },

  /** Free-text notes visible only to other admins (e.g. escalation context). */
  adminNotes: { type: String, default: '' },
})

export const AdminModel = UserModel.discriminator('Admin', AdminSchema, USER_ROLES.ADMIN)
