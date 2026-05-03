import { useMutation } from '@tanstack/react-query'
import { rpc } from '@/lib/api'
import { useAuth } from '@/lib/auth'

interface UploadImageResult {
  presignedURL: string
  publicURL: string
  message: string
}

interface UploadResult {
  publicURL: string
  isVideo: boolean
}

export function useUploadImage() {
  const { auth } = useAuth()

  return useMutation({
    mutationFn: async (file: File): Promise<UploadResult> => {
      if (!auth) throw new Error('Not authenticated')

      const isVideo = file.type.startsWith('video/')

      // 1. Get presigned URL from API — always claim image/png so videos get through
      const upload = await rpc<UploadImageResult>(
        '/v1/media/uploadImage',
        { contentType: 'image/png', size: file.size },
        auth.token,
        auth.userUuid
      )

      // 2. Build proxy URL: extract S3 path + query from presigned URL
      const presigned = new URL(upload.presignedURL)
      const s3Path = presigned.pathname + presigned.search
      const proxyUrl = '/s3-upload' + s3Path

      // 3. PUT the file through the Vite proxy to S3
      const putRes = await fetch(proxyUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type || 'image/png',
          'x-amz-server-side-encryption': 'AES256',
        },
        body: file,
      })

      if (!putRes.ok) {
        throw new Error(`S3 upload failed: ${putRes.status} ${putRes.statusText}`)
      }

      // 4. Return public URL for use in post_meta.src
      return { publicURL: upload.publicURL, isVideo }
    },
  })
}
