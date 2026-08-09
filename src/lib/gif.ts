// ── GIF API Helpers ──

// ── GIF Input Helpers ──

export const MEDIA_URL_REGEX = /(https?:\/\/[^\s<>"'`]+?\.(?:gif|gifv|webp|png|jpe?g|apng|avif|bmp|svg|heic|heif|tiff?|ico)(?:[?#][^\s<>"'`]*)?)/gi
export const ZERO_WIDTH_MEDIA_TEXT = '\u200b'

function mediaRegex(): RegExp {
  return new RegExp(MEDIA_URL_REGEX.source, 'gi')
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function extractMediaUrls(text: string): string[] {
  return Array.from(new Set(Array.from(text.matchAll(mediaRegex()), (match) => match[1])))
}

export function firstMediaUrl(text: string): string | undefined {
  return extractMediaUrls(text)[0]
}

export function stripMediaUrls(text: string, extraUrls: string[] = []): string {
  let stripped = text.replace(mediaRegex(), '')
  for (const url of extraUrls) {
    if (url) stripped = stripped.replace(new RegExp(escapeRegExp(url), 'g'), '')
  }
  return stripped.trim()
}

export function normalizeMediaUrl(url: string): string {
  return url.replace(/\/\d+\.gif(?=([?#]|$))/i, '/giphy.gif')
}

/** Extract text from a contentEditable div, converting <img> elements back to their src URLs */
export function getTextWithGifs(el: HTMLElement): string {
  let text = ''
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent ?? ''
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const elem = node as HTMLElement
      const tag = elem.tagName
      if (elem.hasAttribute('data-mention-uuid')) {
        const uuid = elem.getAttribute('data-mention-uuid')
        text += uuid ? `[${elem.textContent || ''}](/user/${uuid})` : elem.textContent || ''
      } else if (tag === 'IMG') {
        const src = (node as HTMLImageElement).getAttribute('data-gif-url') || (node as HTMLImageElement).src
        text += (text.length > 0 && !text.endsWith('\n') ? '\n' : '') + src
      } else if (tag === 'BR') {
        text += '\n'
      } else if (tag === 'DIV' || tag === 'P') {
        const inner = getTextWithGifs(node as HTMLElement)
        if (inner) text += (text.length > 0 && !text.endsWith('\n') ? '\n' : '') + inner
      } else {
        text += getTextWithGifs(node as HTMLElement)
      }
    }
  }
  return text.replace(/\u00A0/g, ' ').replace(/&nbsp;/gi, ' ')
}

/** Insert a GIF image element at the bottom of a contentEditable div */
export function insertGifImage(el: HTMLElement, url: string) {
  el.focus()

  // Remove any existing gif image (one gif at a time)
  el.querySelectorAll('img[data-gif-url]').forEach((img) => img.remove())

  const br = document.createElement('br')
  const img = document.createElement('img')
  img.src = url
  img.alt = 'GIF'
  img.setAttribute('data-gif-url', url)
  img.className = 'block max-w-[200px] rounded-lg mt-1'
  img.contentEditable = 'false'

  el.appendChild(br)
  el.appendChild(img)
}

// ── Saved GIFs (localStorage) ──

const SAVED_KEY = '2c_saved_gifs'
const FAVES_KEY = '2c_fave_gifs'

function readList(key: string): string[] {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function writeList(key: string, list: string[]) {
  localStorage.setItem(key, JSON.stringify(list))
}

function notify() {
  window.dispatchEvent(new Event('gif-storage-change'))
}

export function getSavedGifs(): string[] {
  return readList(SAVED_KEY)
}

export function saveGif(url: string): string[] {
  const gifs = getSavedGifs()
  if (!gifs.includes(url)) {
    gifs.unshift(url)
    writeList(SAVED_KEY, gifs)
    notify()
  }
  return gifs
}

/** Bulk-save multiple GIF URLs. Returns the count of newly added (non-duplicate) URLs. */
export function saveManyGifs(urls: string[]): { added: number; skipped: number } {
  const existing = getSavedGifs()
  const seen = new Set(existing)
  let added = 0
  let skipped = 0
  const next = [...existing]
  for (const raw of urls) {
    const url = raw.trim()
    if (!url) continue
    if (seen.has(url)) { skipped++; continue }
    seen.add(url)
    next.unshift(url)
    added++
  }
  if (added > 0) {
    writeList(SAVED_KEY, next)
    notify()
  }
  return { added, skipped }
}

/** Parse a blob of text into individual URL candidates (split on whitespace, commas, semicolons). */
export function parseGifUrlList(input: string): string[] {
  return input
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter((s) => /^https?:\/\//i.test(s))
}

export function removeGif(url: string): string[] {
  const gifs = getSavedGifs().filter((g) => g !== url)
  writeList(SAVED_KEY, gifs)
  removeFave(url)
  notify()
  return gifs
}

export function isGifSaved(url: string): boolean {
  return getSavedGifs().includes(url)
}

export function getFaveGifs(): string[] {
  return readList(FAVES_KEY)
}

export function addFave(url: string): string[] {
  const faves = getFaveGifs()
  if (!faves.includes(url)) {
    faves.unshift(url)
    writeList(FAVES_KEY, faves)
  }
  // also ensure it's in saved
  saveGif(url)
  return faves
}

export function removeFave(url: string): string[] {
  const faves = getFaveGifs().filter((g) => g !== url)
  writeList(FAVES_KEY, faves)
  notify()
  return faves
}

export function isFave(url: string): boolean {
  return getFaveGifs().includes(url)
}

export function isUploadedUrl(url?: string): boolean {
  if (!url) return false
  return url.includes('twocents-ugc.s3') || url.includes('api.twocents.money') || url.includes('/s3-upload') || url.includes('/ugc-proxy')
}

export async function fetchOrConvertImageToFile(url: string): Promise<File> {
  let blob: Blob | null = null
  const isGifUrl = /\.gif(?:[?#]|$)/i.test(url)

  // 1. Direct fetch (handles 200 OK and 304 Not Modified)
  try {
    const res = await fetch(url, { cache: 'no-cache' })
    if (res.ok || res.status === 304) {
      const b = await res.blob()
      if (b && b.size > 0) blob = b
    }
  } catch {
    /* CORS or network error */
  }

  // 2. Direct fetch fallback without cache option
  if (!blob) {
    try {
      const res = await fetch(url)
      if (res.ok || res.status === 304) {
        const b = await res.blob()
        if (b && b.size > 0) blob = b
      }
    } catch {
      /* ignore */
    }
  }

  // 3. CORS Proxy Fallbacks (images.weserv.nl with &n=-1&output=gif, allorigins)
  if (!blob) {
    const proxies = [
      `https://images.weserv.nl/?url=${encodeURIComponent(url)}&n=-1&output=gif`,
      `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    ]
    for (const proxyUrl of proxies) {
      try {
        const res = await fetch(proxyUrl)
        const ct = res.headers.get('content-type') || ''
        if ((res.ok || res.status === 304) && !ct.includes('application/json') && !ct.includes('text/html')) {
          const b = await res.blob()
          if (b && b.size > 0 && !b.type.includes('json')) {
            blob = b
            break
          }
        }
      } catch {
        /* try next proxy */
      }
    }
  }

  // 4. Canvas fallback (last resort)
  if (!blob) {
    blob = await new Promise<Blob>((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth || 400
        canvas.height = img.naturalHeight || 300
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(img, 0, 0)
          canvas.toBlob((b) => {
            if (b && b.size > 0) resolve(b)
            else reject(new Error('Canvas to blob failed'))
          }, isGifUrl ? 'image/gif' : 'image/png')
        } else {
          reject(new Error('No canvas context'))
        }
      }
      img.onerror = () => reject(new Error('Image failed to load'))
      img.src = url
    })
  }

  if (!blob || blob.size === 0) {
    throw new Error('Unable to retrieve image data')
  }

  let mime = blob.type
  if (isGifUrl || mime.includes('gif')) {
    mime = 'image/gif'
  } else if (!mime || mime === 'application/octet-stream') {
    mime = 'image/png'
  }

  const ext = mime.includes('gif') ? 'gif' : mime.includes('jpeg') || mime.includes('jpg') ? 'jpg' : mime.includes('webp') ? 'webp' : 'png'
  const filename = `media-${Date.now()}.${ext}`

  return new File([blob], filename, { type: mime })
}
