import React, { createElement, Fragment } from 'react'

export function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d`
  const months = Math.floor(days / 30)
  return `${months}mo`
}

export function cleanPostText(text: string): string {
  return text
    .replace(/&#\d+;/g, (match) => {
      const code = parseInt(match.replace(/&#|;/g, ''), 10)
      return String.fromCodePoint(code)
    })
    .replace(/[\u200B-\u200F\u2028-\u202F\u2060-\u206F\uFEFF\u00AD\u061C\u180E\uFFFC\uFFF9-\uFFFB]|\u034F/g, '')
    .replace(/\n{3,}/g, '\n')
    .trim()
}

function parseInline(text: string) {
  // Matches: markdown links [text](url), bold **text**, or plain URLs
  const INLINE_RE = /(\[([^\]]+)\]\(((?:https?:\/\/|\/)[^\s)]+)\))|(\*\*.*?\*\*)|(https?:\/\/[^\s<>[\]()]+)/g

  const parts: (string | ReturnType<typeof createElement>)[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  let key = 0

  while ((match = INLINE_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }

    if (match[1]) {
      // Markdown link [text](url)
      parts.push(createElement('a', {
        key: key++,
        href: match[3],
        target: '_blank',
        rel: 'noopener noreferrer',
        className: 'text-[#c8a44d] hover:underline break-all',
        onClick: (e: React.MouseEvent) => e.stopPropagation(),
      }, match[2]))
    } else if (match[4]) {
      // Bold **text**
      parts.push(createElement('strong', { key: key++, className: 'font-bold' }, match[4].slice(2, -2)))
    } else if (match[5]) {
      // Plain URL
      parts.push(createElement('a', {
        key: key++,
        href: match[5],
        target: '_blank',
        rel: 'noopener noreferrer',
        className: 'text-[#c8a44d] hover:underline break-all',
        onClick: (e: React.MouseEvent) => e.stopPropagation(),
      }, match[5]))
    }

    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts.length > 0 ? parts : [text]
}

export function renderPostText(raw: string) {
  const cleaned = cleanPostText(raw)
  const lines = cleaned.split('\n')
  const elements: ReturnType<typeof createElement>[] = []

  let i = 0
  while (i < lines.length) {
    // Collect consecutive blockquote lines
    if (/^>\s?/.test(lines[i])) {
      const quoteLines: typeof elements = []
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        if (quoteLines.length > 0) quoteLines.push(createElement('br', { key: `qbr-${i}` }))
        quoteLines.push(createElement(Fragment, { key: `qf-${i}` }, ...parseInline(lines[i].replace(/^>\s?/, ''))))
        i++
      }
      elements.push(
        createElement('blockquote', {
          key: `bq-${i}`,
          className: 'my-1 border-l-2 border-[#c8a44d]/30 pl-3 text-white/50 italic',
        }, ...quoteLines)
      )
    // Collect consecutive bullet lines
    } else if (/^-\s/.test(lines[i])) {
      const items: typeof elements = []
      while (i < lines.length && /^-\s/.test(lines[i])) {
        items.push(
          createElement('li', { key: `li-${i}`, className: 'flex gap-1.5' },
            createElement('span', { className: 'text-[#c8a44d]/60 select-none', key: 'b' }, '•'),
            createElement('span', { key: 't' }, ...parseInline(lines[i].replace(/^-\s+/, '')))
          )
        )
        i++
      }
      elements.push(
        createElement('ul', { key: `ul-${i}`, className: 'my-0.5' }, ...items)
      )
    } else {
      // Regular line
      if (i > 0) elements.push(createElement('br', { key: `br-${i}` }))
      elements.push(createElement(Fragment, { key: `f-${i}` }, ...parseInline(lines[i])))
      i++
    }
  }

  return createElement(Fragment, null, ...elements)
}

export function formatNumber(n: number): string {
  return Math.abs(Math.round(n)).toLocaleString('en-US')
}

export function formatCompact(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${Math.round(abs / 1_000)}K`
  return String(Math.round(abs))
}
