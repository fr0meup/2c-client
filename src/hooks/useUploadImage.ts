import { useMutation } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth'
import { rpc } from '@/lib/api'
import { compressMediaIfNeeded } from '@/lib/compressMedia'

export interface UploadImageResult {
  presignedURL: string
  publicURL: string
}

export interface UploadImageBulkResult {
  uploads: UploadImageResult[]
  message: string
}

export function useUploadImage() {
  const { auth } = useAuth()

  return useMutation({
    mutationFn: async (rawFile: File): Promise<{ publicURL: string; isVideo: boolean }> => {
      if (!auth) throw new Error('Not authenticated')

      // Compress images and videos if size > 9.9 MB
      const file = await compressMediaIfNeeded(rawFile)

      const isVideo = file.type.startsWith('video/')
      // Only spoof for video files; preserve original file.type for GIFs, PNGs, etc.
      const rpcContentType = isVideo ? 'image/png' : (file.type || 'image/png')

      const upload = await rpc<UploadImageResult>(
        '/v1/media/uploadImage',
        { contentType: rpcContentType, size: file.size },
        auth.token,
        auth.userUuid
      )
      const presigned = new URL(upload.presignedURL)

      const putRes = await fetch('/s3-upload' + presigned.pathname + presigned.search, {
        method: 'PUT',
        headers: {
          'x-amz-server-side-encryption': 'AES256',
        },
        body: file,
      })

      if (!putRes.ok) {
        throw new Error(`S3 upload failed: ${putRes.status} ${putRes.statusText}`)
      }

      return { publicURL: upload.publicURL, isVideo }
    },
  })
}

export function useUploadImagesBulk() {
  const { auth } = useAuth()

  return useMutation({
    mutationFn: async (rawFiles: File[]): Promise<Array<{ publicURL: string; isVideo: boolean }>> => {
      if (!auth) throw new Error('Not authenticated')
      if (!rawFiles || rawFiles.length === 0) return []

      // Compress images and videos if size > 9.9 MB
      const files = await Promise.all(rawFiles.map((f) => compressMediaIfNeeded(f)))

      const rpcImages = files.map((file) => {
        const isVideo = file.type.startsWith('video/')
        const rpcContentType = isVideo ? 'image/png' : (file.type || 'image/png')
        return {
          contentType: rpcContentType,
          size: file.size,
        }
      })

      const res = await rpc<UploadImageBulkResult>(
        '/v1/media/uploadImageBulk',
        { images: rpcImages },
        auth.token,
        auth.userUuid
      )

      if (!res.uploads || res.uploads.length !== files.length) {
        throw new Error('Bulk upload presigned URL mismatch')
      }

      const uploadPromises = res.uploads.map(async (uploadItem, idx) => {
        const file = files[idx]
        const isVideo = file.type.startsWith('video/')
        const presigned = new URL(uploadItem.presignedURL)

        const putRes = await fetch('/s3-upload' + presigned.pathname + presigned.search, {
          method: 'PUT',
          headers: {
            'x-amz-server-side-encryption': 'AES256',
          },
          body: file,
        })

        if (!putRes.ok) {
          throw new Error(`S3 upload failed for image ${idx + 1}: ${putRes.status} ${putRes.statusText}`)
        }

        return {
          publicURL: uploadItem.publicURL,
          isVideo,
        }
      })

      return Promise.all(uploadPromises)
    },
  })
}
