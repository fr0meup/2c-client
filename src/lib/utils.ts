import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const ZWJ = '\u200D'

export function obfuscateText(text: string): string {
  let current = text
  for (let pass = 0; pass < 2; pass++) {
    let result = ''
    for (let i = 0; i < current.length; i++) {
      result += current[i]
      if (current[i] !== ' ') {
        result += Math.random() < 0.5 ? ZWJ : ZWJ + ZWJ
      }
    }
    current = result
  }
  return current
}

const HANGUL_FILLER = '\u3164' // ㅤ

export function formatTextForApi(raw: string): string {
  if (!raw) return raw

  let text = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  // 1. Any 2+ consecutive newlines (or empty lines with spaces) -> \n\nㅤ\n\n
  text = text.replace(/(?:[ \t]*\n[ \t]*){2,}/g, `\n\n${HANGUL_FILLER}\n\n`)

  // 2. Any single newline -> \n\n
  const PLACEHOLDER = '___HANGUL_FILLER_GAP___'
  text = text.replace(new RegExp(`\\n\\n${HANGUL_FILLER}\\n\\n`, 'g'), PLACEHOLDER)
  text = text.replace(/\n/g, '\n\n')
  text = text.replace(new RegExp(PLACEHOLDER, 'g'), `\n\n${HANGUL_FILLER}\n\n`)

  return text.trim()
}

export function formatTopicSlug(name: string): string {
  const clean = name.replace(/^\$/, '').trim()
  return clean.toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-')
}
