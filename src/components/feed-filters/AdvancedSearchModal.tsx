import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { X, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCities } from '@/hooks/useCities'
import { TOPIC_MENU } from '@/components/feed-filters/config'
import { TOPIC_TO_API } from '@/hooks/useFeed'

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
const PLATFORM_START = new Date(2024, 11, 6) // Dec 6 2024

function pad(n: number) { return n < 10 ? `0${n}` : `${n}` }
function toDateStr(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }

function DatePicker({ value, onChange, label, minDate }: { value: string; onChange: (v: string) => void; label: string; minDate?: string }) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'days' | 'months'>('days')
  const ref = useRef<HTMLDivElement>(null)

  const parsed = value ? new Date(value + 'T00:00:00') : null
  const [viewYear, setViewYear] = useState(parsed?.getFullYear() ?? new Date().getFullYear())
  const [viewMonth, setViewMonth] = useState(parsed?.getMonth() ?? new Date().getMonth())

  const effectiveMin = minDate ? new Date(minDate + 'T00:00:00') : PLATFORM_START

  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setMode('days') }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  // Build calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1)
  const startDow = (firstDay.getDay() + 6) % 7 // Mon=0
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const cells: (number | null)[] = []
  for (let i = 0; i < startDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const today = new Date()
  const canPrev = viewYear > effectiveMin.getFullYear() || (viewYear === effectiveMin.getFullYear() && viewMonth > effectiveMin.getMonth())
  const canNext = viewYear < today.getFullYear() || (viewYear === today.getFullYear() && viewMonth < today.getMonth())

  function prev() { if (!canPrev) return; if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1) } else setViewMonth(viewMonth - 1) }
  function next() { if (!canNext) return; if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1) } else setViewMonth(viewMonth + 1) }

  function selectDay(day: number) {
    const d = new Date(viewYear, viewMonth, day)
    if (d < effectiveMin || d > today) return
    onChange(toDateStr(d))
    setOpen(false)
    setMode('days')
  }

  const minYear = PLATFORM_START.getFullYear()
  const maxYear = today.getFullYear()

  return (
    <div ref={ref} className="relative flex flex-col gap-1">
      <label className="text-[11px] font-medium text-white/35">{label}</label>
      <button
        type="button"
        onClick={() => { setOpen(!open); setMode('days'); if (parsed) { setViewYear(parsed.getFullYear()); setViewMonth(parsed.getMonth()) } }}
        className="flex h-8 w-full cursor-pointer items-center justify-between rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 text-xs text-white transition-colors hover:border-white/[0.12] focus:border-[#c8a44d]/30 focus:outline-none"
      >
        <span className={value ? 'text-white' : 'text-white/20'}>{value || 'Pick date'}</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/25"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-[252px] rounded-lg border border-white/[0.08] bg-[#141410] p-3 shadow-xl">
          {mode === 'days' ? (
            <>
              {/* Month/Year nav */}
              <div className="mb-2 flex items-center justify-between">
                <button type="button" onClick={prev} className={cn('flex h-6 w-6 cursor-pointer items-center justify-center rounded-md transition-colors', canPrev ? 'text-white/50 hover:bg-white/[0.06] hover:text-white/80' : 'cursor-default text-white/10')}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={() => setMode('months')} className="cursor-pointer text-xs font-semibold text-white/70 transition-colors hover:text-[#c8a44d]">
                  {MONTH_NAMES[viewMonth]} {viewYear}
                </button>
                <button type="button" onClick={next} className={cn('flex h-6 w-6 cursor-pointer items-center justify-center rounded-md transition-colors', canNext ? 'text-white/50 hover:bg-white/[0.06] hover:text-white/80' : 'cursor-default text-white/10')}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
              {/* Day labels */}
              <div className="mb-1 grid grid-cols-7 gap-0">
                {DAY_LABELS.map((d) => (
                  <div key={d} className="flex h-7 items-center justify-center text-[10px] font-medium text-white/25">{d}</div>
                ))}
              </div>
              {/* Days */}
              <div className="grid grid-cols-7 gap-0">
                {cells.map((day, i) => {
                  if (day === null) return <div key={`e${i}`} />
                  const date = new Date(viewYear, viewMonth, day)
                  const disabled = date < effectiveMin || date > today
                  const isSelected = value === toDateStr(date)
                  const isToday = toDateStr(date) === toDateStr(today)
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => !disabled && selectDay(day)}
                      className={cn(
                        'flex h-7 w-full cursor-pointer items-center justify-center rounded-md text-[11px] transition-colors',
                        disabled && 'cursor-default text-white/10',
                        !disabled && !isSelected && 'text-white/60 hover:bg-white/[0.06] hover:text-white',
                        isSelected && 'bg-[#c8a44d]/20 font-semibold text-[#c8a44d]',
                        isToday && !isSelected && 'font-semibold text-[#c8a44d]/60'
                      )}
                    >
                      {day}
                    </button>
                  )
                })}
              </div>
              {/* Quick actions */}
              <div className="mt-2 flex items-center justify-between border-t border-white/[0.06] pt-2">
                <button type="button" onClick={() => { onChange(''); setOpen(false) }} className="cursor-pointer text-[10px] font-medium text-white/30 hover:text-white/50">Clear</button>
                <button type="button" onClick={() => { const t = new Date(); onChange(toDateStr(t)); setViewYear(t.getFullYear()); setViewMonth(t.getMonth()); setOpen(false) }} className="cursor-pointer text-[10px] font-medium text-[#c8a44d]/60 hover:text-[#c8a44d]">Today</button>
              </div>
            </>
          ) : (
            <>
              {/* Year nav */}
              <div className="mb-3 flex items-center justify-between">
                <button type="button" onClick={() => viewYear > minYear && setViewYear(viewYear - 1)} className={cn('flex h-6 w-6 cursor-pointer items-center justify-center rounded-md transition-colors', viewYear > minYear ? 'text-white/50 hover:bg-white/[0.06] hover:text-white/80' : 'cursor-default text-white/10')}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span className="text-xs font-semibold text-white/70">{viewYear}</span>
                <button type="button" onClick={() => viewYear < maxYear && setViewYear(viewYear + 1)} className={cn('flex h-6 w-6 cursor-pointer items-center justify-center rounded-md transition-colors', viewYear < maxYear ? 'text-white/50 hover:bg-white/[0.06] hover:text-white/80' : 'cursor-default text-white/10')}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
              {/* Month grid */}
              <div className="grid grid-cols-3 gap-1">
                {MONTH_NAMES.map((m, i) => {
                  const monthEnd = new Date(viewYear, i + 1, 0)
                  const monthStart = new Date(viewYear, i, 1)
                  const disabled = monthEnd < effectiveMin || monthStart > today
                  const isCurrent = viewMonth === i
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => { if (!disabled) { setViewMonth(i); setMode('days') } }}
                      className={cn(
                        'flex h-8 items-center justify-center rounded-md text-xs transition-colors',
                        disabled && 'cursor-default text-white/10',
                        !disabled && !isCurrent && 'cursor-pointer text-white/60 hover:bg-white/[0.06] hover:text-white',
                        !disabled && isCurrent && 'cursor-pointer bg-[#c8a44d]/20 font-semibold text-[#c8a44d]'
                      )}
                    >
                      {m}
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function NumberInput({
  label,
  value,
  onChange,
  placeholder,
  prefix,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  prefix?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-medium text-white/35">{label}</label>
      <div className="flex items-center rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 h-8 focus-within:border-[#c8a44d]/30">
        {prefix && <span className="mr-1 text-xs text-white/30">{prefix}</span>}
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent text-xs text-white placeholder:text-white/20 focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
      </div>
    </div>
  )
}

function ToggleChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-7 cursor-pointer items-center rounded-full border px-2.5 text-[11px] font-medium transition-all',
        active
          ? 'border-[#c8a44d]/30 bg-[#c8a44d]/10 text-[#c8a44d]'
          : 'border-white/[0.08] bg-white/[0.03] text-white/50 hover:border-white/[0.12] hover:text-white/70'
      )}
    >
      {label}
    </button>
  )
}

function SearchableDropdown({
  label,
  value,
  options,
  onChange,
  placeholder = 'Any',
  disabled = false,
}: {
  label: string
  value: string
  options: string[]
  onChange: (v: string) => void
  placeholder?: string
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const filtered = search
    ? options.filter((o) => o.toLowerCase().includes(search.toLowerCase()))
    : options

  return (
    <div ref={ref} className="flex flex-col gap-1">
      <label className="text-[11px] font-medium text-white/35">{label}</label>
      <div className="relative">
        <button
          type="button"
          onClick={() => { if (!disabled) { setOpen(!open); setSearch('') } }}
          className={cn(
            'flex h-8 w-full items-center justify-between rounded-lg border px-2.5 text-xs transition-colors',
            disabled
              ? 'cursor-not-allowed border-white/[0.04] bg-white/[0.02] text-white/20'
              : value
                ? 'border-[#c8a44d]/20 bg-[#c8a44d]/5 text-[#c8a44d]'
                : 'border-white/[0.08] bg-white/[0.04] text-white/50 hover:border-white/[0.12]'
          )}
        >
          <span className="truncate">{value || placeholder}</span>
          <ChevronDown className={cn('h-3 w-3 shrink-0 transition-transform', open && 'rotate-180')} />
        </button>
        {open && (
          <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-lg border border-white/[0.06] bg-[#141410] shadow-lg">
            <div className="p-1.5">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="h-7 w-full rounded border border-white/[0.08] bg-white/[0.04] px-2 text-xs text-white placeholder:text-white/20 focus:outline-none"
                autoFocus
              />
            </div>
            <div className="max-h-40 overflow-auto py-1">
              <button
                onClick={() => { onChange(''); setOpen(false) }}
                className={cn('flex w-full cursor-pointer items-center px-3 py-1.5 text-xs', !value ? 'text-[#c8a44d]' : 'text-white/60 hover:bg-white/[0.03]')}
              >
                {placeholder}
              </button>
              {filtered.map((o) => (
                <button
                  key={o}
                  onClick={() => { onChange(o); setOpen(false) }}
                  className={cn('flex w-full cursor-pointer items-center px-3 py-1.5 text-xs', o === value ? 'text-[#c8a44d]' : 'text-white/60 hover:bg-white/[0.03]')}
                >
                  {o}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function TopicDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const allTopics = TOPIC_MENU.flatMap((g) =>
    g.items.map((item) => ({ label: item as string, value: TOPIC_TO_API[item] ?? '' }))
  ).filter((t) => t.value && t.value !== 'hot')

  const activeLabel = allTopics.find((t) => t.value === value)?.label ?? 'Any'

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div ref={ref} className="flex flex-col gap-1">
      <label className="text-[11px] font-medium text-white/35">Topic</label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={cn(
            'flex h-8 w-full items-center justify-between rounded-lg border px-2.5 text-xs transition-colors',
            value
              ? 'border-[#c8a44d]/20 bg-[#c8a44d]/5 text-[#c8a44d]'
              : 'border-white/[0.08] bg-white/[0.04] text-white/50 hover:border-white/[0.12]'
          )}
        >
          <span className="truncate">{activeLabel}</span>
          <ChevronDown className={cn('h-3 w-3 shrink-0 transition-transform', open && 'rotate-180')} />
        </button>
        {open && (
          <div className="absolute left-0 top-full z-50 mt-1 max-h-52 w-full overflow-auto rounded-lg border border-white/[0.06] bg-[#141410] py-1 shadow-lg">
            <button
              onClick={() => { onChange(''); setOpen(false) }}
              className={cn('flex w-full cursor-pointer items-center px-3 py-1.5 text-xs', !value ? 'text-[#c8a44d]' : 'text-white/60 hover:bg-white/[0.03]')}
            >
              Any
            </button>
            {TOPIC_MENU.map((group) => (
              <div key={group.category}>
                <div className="px-3 pt-2 pb-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/25">
                  {group.category}
                </div>
                {group.items.map((item) => {
                  const val = TOPIC_TO_API[item] ?? ''
                  if (!val || val === 'hot') return null
                  return (
                    <button
                      key={item}
                      onClick={() => { onChange(val); setOpen(false) }}
                      className={cn('flex w-full cursor-pointer items-center px-3 py-1.5 text-xs', val === value ? 'text-[#c8a44d]' : 'text-white/60 hover:bg-white/[0.03]')}
                    >
                      {item}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/** Checks if any advanced search URL params are present */
export function hasAdvancedParams(search: string): boolean {
  const sp = new URLSearchParams(search)
  return sp.has('adv') ||
    sp.has('min_balance') || sp.has('max_balance') || sp.has('votes_min') ||
    sp.has('votes_max') || sp.has('min_age') || sp.has('max_age') || sp.has('genders') ||
    sp.has('has_image') || sp.has('has_poll') || sp.has('has_likert') ||
    sp.has('has_video') || sp.has('author_uuids') || sp.has('verified') ||
    sp.has('comments_min') || sp.has('comments_max') ||
    sp.has('country') || sp.has('city') || sp.has('adv_topic') ||
    sp.has('date_from') || sp.has('date_to')
}

export function AdvancedSearchPanel() {
  const location = useLocation()
  const navigate = useNavigate()
  const sp = new URLSearchParams(location.search)
  const { data: citiesData } = useCities(true)
  const countries = citiesData ? Object.keys(citiesData.cities).sort() : []

  // Initialise from current URL params
  const [searchText, setSearchText] = useState(sp.get('q') || '')
  const [minBalance, setMinBalance] = useState(sp.get('min_balance') || '')
  const [maxBalance, setMaxBalance] = useState(sp.get('max_balance') || '')
  const [votesMin, setVotesMin] = useState(sp.get('votes_min') || '')
  const [votesMax, setVotesMax] = useState(sp.get('votes_max') || '')
  const [minAge, setMinAge] = useState(sp.get('min_age') || '')
  const [maxAge, setMaxAge] = useState(sp.get('max_age') || '')
  const [genders, setGenders] = useState<Set<string>>(new Set(sp.get('genders')?.split(',').filter(Boolean) || []))
  const [hasImage, setHasImage] = useState(sp.get('has_image') === '1')
  const [hasPoll, setHasPoll] = useState(sp.get('has_poll') === '1')
  const [hasLikert, setHasLikert] = useState(sp.get('has_likert') === '1')
  const [hasVideo, setHasVideo] = useState(sp.get('has_video') === '1')
  const [authorUuids, setAuthorUuids] = useState<string[]>(
    sp.get('author_uuids')?.split(',').filter(Boolean) || ['']
  )
  const [verified, setVerified] = useState(sp.get('verified') || '')
  const [commentsMin, setCommentsMin] = useState(sp.get('comments_min') || '')
  const [commentsMax, setCommentsMax] = useState(sp.get('comments_max') || '')
  const [country, setCountry] = useState(sp.get('country') || '')
  const [city, setCity] = useState(sp.get('city') || '')
  const [advTopic, setAdvTopic] = useState(sp.get('adv_topic') || '')
  const [dateFrom, setDateFrom] = useState(sp.get('date_from') || '')
  const [dateTo, setDateTo] = useState(sp.get('date_to') || '')
  const [showDateRange, setShowDateRange] = useState(sp.get('date_range') === '1')
  const [expanded, setExpanded] = useState(true)

  const cityOptions = country && citiesData ? (citiesData.cities[country] || []).sort() : []

  const toggleGender = (g: string) => {
    const next = new Set(genders)
    if (next.has(g)) next.delete(g)
    else next.add(g)
    setGenders(next)
  }

  const activeCount = [
    searchText,
    minBalance,
    maxBalance,
    votesMin,
    votesMax,
    minAge,
    maxAge,
    genders.size > 0,
    hasImage,
    hasPoll,
    hasLikert,
    hasVideo,
    authorUuids.some((u) => u.trim()),
    verified,
    commentsMin,
    commentsMax,
    country,
    city,
    advTopic,
    showDateRange && dateFrom,
    showDateRange && dateTo,
  ].filter(Boolean).length

  const handleClose = () => navigate('/')

  const handleReset = () => {
    setSearchText('')
    setMinBalance('')
    setMaxBalance('')
    setVotesMin('')
    setVotesMax('')
    setMinAge('')
    setMaxAge('')
    setGenders(new Set())
    setHasImage(false)
    setHasPoll(false)
    setHasLikert(false)
    setHasVideo(false)
    setAuthorUuids([''])
    setVerified('')
    setCommentsMin('')
    setCommentsMax('')
    setCountry('')
    setCity('')
    setAdvTopic('')
    setDateFrom('')
    setDateTo('')
    setShowDateRange(false)
    navigate('/?adv=1')
  }

  const handleApply = () => {
    const params = new URLSearchParams()
    params.set('adv', '1')
    if (searchText.trim()) params.set('q', searchText.trim())
    if (minBalance) params.set('min_balance', minBalance)
    if (maxBalance) params.set('max_balance', maxBalance)
    if (votesMin) params.set('votes_min', votesMin)
    if (votesMax) params.set('votes_max', votesMax)
    if (minAge) params.set('min_age', minAge)
    if (maxAge) params.set('max_age', maxAge)
    if (genders.size) params.set('genders', [...genders].join(','))
    if (hasImage) params.set('has_image', '1')
    if (hasPoll) params.set('has_poll', '1')
    if (hasLikert) params.set('has_likert', '1')
    if (hasVideo) params.set('has_video', '1')
    const uuids = authorUuids.map((u) => u.trim()).filter(Boolean)
    if (uuids.length) params.set('author_uuids', uuids.join(','))
    if (verified) params.set('verified', verified)
    if (commentsMin) params.set('comments_min', commentsMin)
    if (commentsMax) params.set('comments_max', commentsMax)
    if (country) params.set('country', country)
    if (city) params.set('city', city)
    if (advTopic) params.set('adv_topic', advTopic)
    // Always use workers — default date range to full platform history
    const effectiveFrom = dateFrom || '2024-12-06'
    const effectiveTo = dateTo || toDateStr(new Date())
    if (showDateRange) params.set('date_range', '1')
    params.set('date_from', effectiveFrom)
    params.set('date_to', effectiveTo)
    params.set('search_run', String(Date.now()))
    navigate(`/?${params.toString()}`)
  }

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-white/[0.02]">
      <div data-onboarding="adv-filters">
        {/* Header — always visible */}
        <div
          className="flex cursor-pointer items-center justify-between px-4 py-3"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-full"
              style={{ background: 'linear-gradient(135deg, rgba(200,164,77,0.18), rgba(200,164,77,0.04))' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#c8a44d]"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
            </div>
            <span className="text-xs font-semibold text-white">Advanced Search</span>
            {activeCount > 0 && (
              <span className="flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-[#c8a44d]/15 px-1.5 text-[10px] font-bold text-[#c8a44d]">
                {activeCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5 text-white/30" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-white/30" />
            )}
            <button
              onClick={(e) => { e.stopPropagation(); handleClose() }}
              className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-white/30 transition-colors hover:bg-white/[0.06] hover:text-white/60"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Collapsible body — filter fields */}
        {expanded && (
          <div className="space-y-3.5 px-4 pb-3">
            {/* Search + Date toggle */}
            <div className="flex gap-1.5">
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search..."
                onKeyDown={(e) => e.key === 'Enter' && handleApply()}
                className="h-8 min-w-0 flex-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 text-xs text-white placeholder:text-white/20 focus:border-[#c8a44d]/30 focus:outline-none"
              />
              <button
                type="button"
                title={showDateRange ? 'Remove date range' : 'Add date range'}
                onClick={() => {
                  const next = !showDateRange
                  setShowDateRange(next)
                  if (!next) { setDateFrom(''); setDateTo('') }
                }}
                className={cn(
                  'flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border transition-all',
                  showDateRange
                    ? 'border-[#c8a44d]/30 bg-[#c8a44d]/10 text-[#c8a44d]'
                    : 'border-white/[0.08] bg-white/[0.04] text-white/40 hover:border-white/[0.12] hover:text-white/70'
                )}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
              </button>
            </div>

            {/* Date range pickers */}
            {showDateRange && (
              <div className="grid grid-cols-2 gap-2">
                <DatePicker label="From" value={dateFrom} onChange={(v) => { setDateFrom(v); if (v && dateTo && dateTo < v) setDateTo('') }} />
                <DatePicker label="To" value={dateTo} onChange={setDateTo} minDate={dateFrom} />
              </div>
            )}

            <div className="h-px bg-white/[0.06]" />

            {/* ── Author Filters ── */}
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/25">Author</p>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-white/35">Author UUID</label>
              {authorUuids.map((uuid, i) => (
                <div key={i} className="flex gap-1">
                  <input
                    type="text"
                    value={uuid}
                    onChange={(e) => {
                      const next = [...authorUuids]
                      next[i] = e.target.value
                      setAuthorUuids(next)
                    }}
                    placeholder="F57E587D-9419-4332-922D-..."
                    className="h-8 min-w-0 flex-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 text-xs text-white placeholder:text-white/20 focus:border-[#c8a44d]/30 focus:outline-none font-mono"
                  />
                  {authorUuids.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setAuthorUuids(authorUuids.filter((_, j) => j !== i))}
                      className="flex h-8 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-white/30 transition-colors hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                  {i === authorUuids.length - 1 && (
                    <button
                      type="button"
                      onClick={() => setAuthorUuids([...authorUuids, ''])}
                      className="flex h-8 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-white/30 transition-colors hover:border-[#c8a44d]/30 hover:bg-[#c8a44d]/10 hover:text-[#c8a44d]"
                    >
                      <span className="text-sm font-bold leading-none">+</span>
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-x-2.5">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-white/35">Gender</label>
                <div className="flex gap-1.5">
                  <ToggleChip label="Male" active={genders.has('M')} onClick={() => toggleGender('M')} />
                  <ToggleChip label="Female" active={genders.has('F')} onClick={() => toggleGender('F')} />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-white/35">Verification</label>
                <div className="flex gap-1.5">
                  <ToggleChip label="Verified" active={verified === 'verified'} onClick={() => setVerified(verified === 'verified' ? '' : 'verified')} />
                  <ToggleChip label="Unverified" active={verified === 'unverified'} onClick={() => setVerified(verified === 'unverified' ? '' : 'unverified')} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-x-2">
              <NumberInput label="Min NW" value={minBalance} onChange={setMinBalance} placeholder="0" prefix="$" />
              <NumberInput label="Max NW" value={maxBalance} onChange={setMaxBalance} placeholder="Any" prefix="$" />
              <NumberInput label="Min Age" value={minAge} onChange={setMinAge} placeholder="Any" />
              <NumberInput label="Max Age" value={maxAge} onChange={setMaxAge} placeholder="Any" />
            </div>

            <div className="grid grid-cols-2 gap-x-2.5">
              <SearchableDropdown label="Location" value={country} options={countries} onChange={(c) => { setCountry(c); setCity('') }} placeholder="Any country" />
              <SearchableDropdown label="City" value={city} options={cityOptions} onChange={setCity} placeholder="Any city" disabled={!country} />
            </div>

            <div className="h-px bg-white/[0.06]" />

            {/* ── Post Filters ── */}
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/25">Post</p>

            <div className="grid grid-cols-4 gap-x-2">
              <NumberInput label="Min Votes" value={votesMin} onChange={setVotesMin} placeholder="Any" />
              <NumberInput label="Max Votes" value={votesMax} onChange={setVotesMax} placeholder="Any" />
              <NumberInput label="Min Cmts" value={commentsMin} onChange={setCommentsMin} placeholder="Any" />
              <NumberInput label="Max Cmts" value={commentsMax} onChange={setCommentsMax} placeholder="Any" />
            </div>

            <div className="grid grid-cols-[1fr_1fr] items-end gap-x-2.5">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-white/35">Content</label>
                <div className="flex flex-wrap gap-1.5">
                  <ToggleChip label="Image" active={hasImage} onClick={() => setHasImage(!hasImage)} />
                  <ToggleChip label="Video" active={hasVideo} onClick={() => setHasVideo(!hasVideo)} />
                  <ToggleChip label="Poll" active={hasPoll} onClick={() => setHasPoll(!hasPoll)} />
                  <ToggleChip label="Likert" active={hasLikert} onClick={() => setHasLikert(!hasLikert)} />
                </div>
              </div>
              <TopicDropdown value={advTopic} onChange={setAdvTopic} />
            </div>
          </div>
        )}
      </div>

      {/* Footer — outside onboarding wrapper so spotlight excludes it */}
      {expanded && (
        <div className="flex items-center justify-between border-t border-white/[0.06] px-4 py-2.5">
          <button
            onClick={handleReset}
            className="cursor-pointer text-[11px] font-medium text-white/30 transition-colors hover:text-white/60"
          >
            Reset all
          </button>
          <button
            data-onboarding="apply-filters"
            onClick={handleApply}
            className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full bg-gradient-to-b from-[#c8a44d] to-[#a88a3e] px-4 text-xs font-semibold text-black shadow-lg transition-all hover:brightness-110 active:scale-[0.97]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            Apply Filters
          </button>
        </div>
      )}
    </div>
  )
}
