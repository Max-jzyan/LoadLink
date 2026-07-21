import { Schema, model, InferSchemaType, Types } from 'mongoose'

export const MESSAGE_BODY_MAX_LENGTH = 2000

const MessageSchema = new Schema(
  {
    /** The load this message thread belongs to */
    loadId: {
      type: Types.ObjectId,
      ref: 'Load',
      required: true,
      index: true,
    },

    senderId: {
      type: Types.ObjectId,
      ref: 'User',
      required: true,
    },

    recipientId: {
      type: Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    body: {
      type: String,
      required: true,
      trim: true,
      maxlength: MESSAGE_BODY_MAX_LENGTH,
    },

    /** Whether the recipient has seen this message */
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
)

// Thread view: all messages for a load in chronological order
MessageSchema.index({ loadId: 1, createdAt: 1 })
// Unread badge queries: unread messages for a recipient (optionally per load)
MessageSchema.index({ recipientId: 1, isRead: 1, loadId: 1 })

export type Message = InferSchemaType<typeof MessageSchema>
export const MessageModel = model('Message', MessageSchema)
