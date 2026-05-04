// ── GIF API Helpers ──

const GIF_URL_RE = /(https?:\/\/\S+\.gif(?:\?\S*)?)/i

/** Extract the first .gif URL from text so we can pass it as giphy_url to the API */
export function extractGifMeta(text: string): { giphy_url: string; giphy_id: string } | null {
  const m = text.match(GIF_URL_RE)
  if (!m) return null
  const url = m[1]
  // Derive a giphy_id from the URL path (filename without extension)
  try {
    const segments = new URL(url).pathname.split('/').filter(Boolean)
    const last = segments[segments.length - 1] ?? ''
    const id = last.replace(/\.gif$/i, '') || url
    return { giphy_url: url, giphy_id: id }
  } catch {
    return { giphy_url: url, giphy_id: url }
  }
}

// ── GIF Input Helpers ──

/** Extract text from a contentEditable div, converting <img> elements back to their src URLs */
export function getTextWithGifs(el: HTMLElement): string {
  let text = ''
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent ?? ''
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const tag = (node as HTMLElement).tagName
      if (tag === 'IMG') {
        const src = (node as HTMLImageElement).getAttribute('data-gif-url') || (node as HTMLImageElement).src
        text += (text.length > 0 && !text.endsWith('\n') ? '\n' : '') + src
      } else if (tag === 'BR') {
        text += '\n'
      } else if (tag === 'DIV' || tag === 'P') {
        const inner = getTextWithGifs(node as HTMLElement)
        if (inner) text += (text.length > 0 && !text.endsWith('\n') ? '\n' : '') + inner
      } else {
        text += (node as HTMLElement).textContent ?? ''
      }
    }
  }
  return text
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
