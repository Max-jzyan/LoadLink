import { S3Client } from '@aws-sdk/client-s3'

export const AWS_REGION = process.env.AWS_REGION as string
export const S3_BUCKET = process.env.AWS_S3_BUCKET as string

export const s3Client = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
  },
})
