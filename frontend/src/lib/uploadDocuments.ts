export interface UploadedDocument {
  name: string
  url: string
  key: string
}

export type UploadDocType = 'driverDocuments' | 'companyDocuments'

async function getPresignedUrl(
  idToken: string,
  firebaseUid: string,
  docType: UploadDocType,
  file: File
) {
  const res = await fetch('/api/uploads/presign', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    // firebaseUID used for local dev mode. when firebase admin credentials are set, 
    // backend uses the verified uid instead of the one sent in the request body.
    body: JSON.stringify({ firebaseUid, docType, fileName: file.name, contentType: file.type }),
  })

  if (!res.ok) {
    throw new Error(`Failed to prepare upload for "${file.name}"`)
  }

  return (await res.json()) as { uploadUrl: string; key: string; fileUrl: string }
}

/**
 * Requests a presigned URL for each file and PUTs it directly to S3, bypassing
 * this server. Requires a Firebase ID token for the currently signed-in user.
 */
export async function uploadDocuments(
  idToken: string,
  firebaseUid: string,
  docType: UploadDocType,
  files: File[]
): Promise<UploadedDocument[]> {
  const uploaded: UploadedDocument[] = []

  for (const file of files) {
    const { uploadUrl, key, fileUrl } = await getPresignedUrl(idToken, firebaseUid, docType, file)

    const putRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    })

    if (!putRes.ok) {
      throw new Error(`Failed to upload "${file.name}"`)
    }

    uploaded.push({ name: file.name, url: fileUrl, key })
  }

  return uploaded
}
