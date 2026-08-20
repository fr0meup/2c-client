const MAX_TARGET_BYTES = 9.9 * 1024 * 1024 // 9.9 MB

/**
 * Automatically compresses images, GIFs, and videos if they exceed 9.9 MB.
 * Preserves exact file format (GIF animation, video format, image type)
 * and targets a file size between 9.4 MB and 9.9 MB.
 */
export async function compressMediaIfNeeded(file: File, signal?: AbortSignal): Promise<File> {
  if (signal?.aborted) return file
  if (file.size <= MAX_TARGET_BYTES) {
    return file
  }

  if (file.type.startsWith('video/')) {
    return compressVideo(file, signal)
  }

  if (file.type === 'image/gif' || file.name.endsWith('.gif')) {
    return compressGifBinary(file, signal)
  }

  if (file.type.startsWith('image/')) {
    return compressImage(file, signal)
  }

  return file
}

/** Compress static images (PNG, JPEG, WEBP) preserving exact MIME type */
async function compressImage(file: File, signal?: AbortSignal): Promise<File> {
  const mimeType = file.type || 'image/jpeg'

  return new Promise((resolve) => {
    if (signal?.aborted) return resolve(file)

    const img = new Image()
    const url = URL.createObjectURL(file)

    const onAbort = () => {
      URL.revokeObjectURL(url)
      resolve(file)
    }
    signal?.addEventListener('abort', onAbort, { once: true })

    img.onload = async () => {
      signal?.removeEventListener('abort', onAbort)
      URL.revokeObjectURL(url)
      if (signal?.aborted) return resolve(file)

      let scale = 0.98
      let quality = 0.95

      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) return resolve(file)

      const getBlob = (s: number, q: number): Promise<Blob | null> => {
        const w = Math.round(img.width * s)
        const h = Math.round(img.height * s)
        canvas.width = w
        canvas.height = h
        ctx.clearRect(0, 0, w, h)
        ctx.drawImage(img, 0, 0, w, h)
        return new Promise((res) => canvas.toBlob(res, mimeType, q))
      }

      let blob = await getBlob(scale, quality)

      // Step down in small increments to land in 9.4MB - 9.9MB window
      while (blob && blob.size > MAX_TARGET_BYTES && (scale > 0.2 || quality > 0.3) && !signal?.aborted) {
        if (mimeType !== 'image/png' && quality > 0.4) {
          quality -= 0.04
        } else {
          scale -= 0.04
        }
        blob = await getBlob(scale, quality)
      }

      if (blob && blob.size <= MAX_TARGET_BYTES && !signal?.aborted) {
        const compressedFile = new File([blob], file.name, {
          type: mimeType,
          lastModified: Date.now(),
        })
        resolve(compressedFile)
      } else {
        resolve(file)
      }
    }

    img.onerror = () => {
      signal?.removeEventListener('abort', onAbort)
      URL.revokeObjectURL(url)
      resolve(file)
    }

    img.src = url
  })
}

/**
 * Fast GIF binary frame downsampler.
 * Preserves GIF animation, color palette, and visual quality by skipping
 * intermediate frames and adjusting frame delays to target 9.4 MB - 9.9 MB.
 */
async function compressGifBinary(file: File, signal?: AbortSignal): Promise<File> {
  if (signal?.aborted) return file
  try {
    const arrayBuffer = await file.arrayBuffer()
    if (signal?.aborted) return file
    const bytes = new Uint8Array(arrayBuffer)

    // Check GIF header
    if (bytes.length < 13 || bytes[0] !== 0x47 || bytes[1] !== 0x49 || bytes[2] !== 0x46) {
      return file
    }

    let pos = 6 // skip GIF89a/GIF87a header
    // Logical Screen Descriptor (7 bytes)
    const packed = bytes[10]
    pos += 7

    // Global Color Table
    if (packed & 0x80) {
      const gctSize = 3 * (1 << ((packed & 0x07) + 1))
      pos += gctSize
    }

    const headerChunk = bytes.subarray(0, pos)
    interface GifFrame {
      gce?: { raw: Uint8Array; delay: number }
      data: Uint8Array
    }

    const frames: GifFrame[] = []
    let currentGce: { raw: Uint8Array; delay: number } | undefined
    const globalMetaChunks: Uint8Array[] = []

    while (pos < bytes.length && !signal?.aborted) {
      const blockType = bytes[pos]

      if (blockType === 0x3b) {
        // GIF Trailer
        break
      }

      if (blockType === 0x21) {
        // Extension
        const extType = bytes[pos + 1]
        if (extType === 0xf9) {
          // Graphic Control Extension (8 bytes)
          const gceRaw = bytes.slice(pos, pos + 8)
          const delay = gceRaw[4] | (gceRaw[5] << 8)
          currentGce = { raw: gceRaw, delay }
          pos += 8
        } else {
          // Other extension (e.g. Netscape looping 0xFF)
          const startExt = pos
          pos += 2
          while (pos < bytes.length && bytes[pos] !== 0) {
            pos += bytes[pos] + 1
          }
          pos++ // skip 0x00
          const extChunk = bytes.subarray(startExt, pos)
          if (frames.length === 0) {
            globalMetaChunks.push(extChunk)
          }
        }
      } else if (blockType === 0x2c) {
        // Image Descriptor
        const startImg = pos
        pos += 10 // skip descriptor header
        const imgPacked = bytes[pos - 1]
        if (imgPacked & 0x80) {
          const lctSize = 3 * (1 << ((imgPacked & 0x07) + 1))
          pos += lctSize
        }
        pos++ // skip LZW min code size
        while (pos < bytes.length && bytes[pos] !== 0) {
          pos += bytes[pos] + 1
        }
        pos++ // skip 0x00
        const imgChunk = bytes.subarray(startImg, pos)

        frames.push({
          gce: currentGce,
          data: imgChunk,
        })
        currentGce = undefined
      } else {
        pos++
      }
    }

    if (signal?.aborted || frames.length <= 1) {
      return file
    }

    // Target ~9.6 MB
    const targetSizeRatio = (9.65 * 1024 * 1024) / file.size
    const keepStep = Math.max(1.1, 1 / targetSizeRatio)

    const newChunks: Uint8Array[] = [headerChunk, ...globalMetaChunks]
    let accumulatedDelay = 0

    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i]
      const frameDelay = frame.gce ? frame.gce.delay : 10
      accumulatedDelay += frameDelay

      // Determine if we keep this frame
      const isLastFrame = i === frames.length - 1
      const isKept = i === 0 || isLastFrame || Math.floor(i % keepStep) === 0

      if (isKept) {
        if (frame.gce) {
          const newGce = new Uint8Array(frame.gce.raw)
          // Update accumulated delay (16-bit little endian)
          newGce[4] = accumulatedDelay & 0xff
          newGce[5] = (accumulatedDelay >> 8) & 0xff
          newChunks.push(newGce)
        }
        newChunks.push(frame.data)
        accumulatedDelay = 0
      }
    }

    // Add trailer 0x3B
    newChunks.push(new Uint8Array([0x3b]))

    const blob = new Blob(newChunks as unknown as BlobPart[], { type: 'image/gif' })
    if (blob.size <= MAX_TARGET_BYTES && blob.size > 0 && !signal?.aborted) {
      return new File([blob], file.name, {
        type: 'image/gif',
        lastModified: Date.now(),
      })
    }

    return file
  } catch (err) {
    console.warn('[compressGifBinary] Error during GIF downsampling:', err)
    return file
  }
}

/** Compress video preserving video/mp4 MIME type and targeting 9.4 MB - 9.9 MB */
async function compressVideo(file: File, signal?: AbortSignal): Promise<File> {
  return new Promise((resolve) => {
    if (signal?.aborted) return resolve(file)

    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    const url = URL.createObjectURL(file)

    let animId: number | null = null
    let recorder: MediaRecorder | null = null

    const cleanup = () => {
      if (animId !== null) cancelAnimationFrame(animId)
      if (recorder && recorder.state !== 'inactive') {
        try { recorder.stop() } catch { /* ignore */ }
      }
      video.pause()
      video.removeAttribute('src')
      video.load()
      URL.revokeObjectURL(url)
    }

    const onAbort = () => {
      cleanup()
      resolve(file)
    }
    signal?.addEventListener('abort', onAbort, { once: true })

    video.onloadedmetadata = async () => {
      if (signal?.aborted) {
        cleanup()
        return resolve(file)
      }

      const duration = video.duration || 10
      // Target 9.65 MB (right in the middle of 9.4 MB and 9.9 MB)
      const targetBytes = 9.65 * 1024 * 1024
      const targetBps = Math.floor((targetBytes * 8) / duration)

      const canvas = document.createElement('canvas')
      let scale = 1
      if (video.videoWidth > 1280 || video.videoHeight > 720) {
        scale = Math.min(1280 / video.videoWidth, 720 / video.videoHeight)
      }
      canvas.width = Math.round(video.videoWidth * scale)
      canvas.height = Math.round(video.videoHeight * scale)
      const ctx = canvas.getContext('2d')

      if (!ctx || !('MediaRecorder' in window)) {
        cleanup()
        return resolve(file)
      }

      const stream = canvas.captureStream(30)
      const mimeType = MediaRecorder.isTypeSupported('video/mp4')
        ? 'video/mp4'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
          ? 'video/webm;codecs=vp8'
          : ''

      try {
        recorder = new MediaRecorder(stream, {
          mimeType: mimeType || undefined,
          videoBitsPerSecond: Math.max(500_000, Math.min(targetBps, 5_000_000)),
        })
      } catch {
        cleanup()
        return resolve(file)
      }

      const chunks: Blob[] = []
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data)
      }

      recorder.onstop = () => {
        signal?.removeEventListener('abort', onAbort)
        URL.revokeObjectURL(url)
        if (signal?.aborted) return resolve(file)

        const blob = new Blob(chunks, { type: 'video/mp4' })
        const compressedFile = new File([blob], file.name.endsWith('.mp4') ? file.name : file.name.replace(/\.[^.]+$/, '.mp4'), {
          type: 'video/mp4',
          lastModified: Date.now(),
        })
        resolve(compressedFile)
      }

      const drawFrame = () => {
        if (video.ended || video.paused || signal?.aborted) return
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        animId = requestAnimationFrame(drawFrame)
      }

      recorder.start(100)
      video.playbackRate = 2.0 // fast encode
      video
        .play()
        .then(() => {
          drawFrame()
        })
        .catch(() => {
          cleanup()
          resolve(file)
        })

      video.onended = () => {
        if (animId !== null) cancelAnimationFrame(animId)
        if (recorder && recorder.state !== 'inactive') recorder.stop()
      }
    }

    video.onerror = () => {
      signal?.removeEventListener('abort', onAbort)
      cleanup()
      resolve(file)
    }

    video.src = url
  })
}
