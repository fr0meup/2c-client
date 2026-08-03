import { useMutation } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth'
import { rpc } from '@/lib/api'
import { compressMediaIfNeeded } from '@/lib/compressMedia'

interface UploadImageResult {
  presignedURL: string
  publicURL: string
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
