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
