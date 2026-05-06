import { useState, useEffect, useCallback, useLayoutEffect, useRef } from 'react'
import { ChevronRight, ChevronLeft, X, MousePointerClick } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ONBOARDING_KEY } from './constants'

// ── Step definitions ──
// selector: data-onboarding="<id>" attribute on the target element
// fallback: if element not found, show as a centered floating card instead
// action: if true, user must click the target element to advance (click-through enabled)
// clickThrough: if true, allows clicking the target but uses Next button to advance
// waitFor: poll for this selector to appear before showing the step
interface Step {
  selector: string
  title: string
  description: string
  position: 'top' | 'bottom' | 'left' | 'right' | 'center'
  accent: string
  fallback?: boolean
  action?: boolean
  clickThrough?: boolean
  waitFor?: string
  interimSelector?: string
  // If true, do NOT dispatch a body mousedown when leaving this step.
  // Used for chained steps inside the same popover (e.g. edit-profile → edit-city → custom-location)
  // so the popover stays open across the chain.
  keepOpen?: boolean
  // If true, listen to the natural 'click' event instead of 'mousedown' and do NOT synthesize
  // a click. Use this for toggle buttons (e.g. popover triggers) where a synthesized click + the
  // user's real click would double-toggle the state.
  naturalClick?: boolean
}

const STEPS: Step[] = [
  // ── Welcome ──
  {
    selector: '__welcome__',
    title: 'Welcome to 2c-client',
    description:
      'This is an unofficial third-party client for twocents.money with some extra features built on top. Let\u2019s take a quick tour.',
    position: 'center',
    accent: '#c8a44d',
    fallback: true,
  },

  // ── Search flow ──
  {
    selector: 'search',
    title: 'Search',
    description:
      'Click the search icon to expand the search bar.',
    position: 'bottom',
    accent: '#c8a44d',
    action: true,
  },
  {
    selector: 'adv-search',
    title: 'Advanced Search',
    description: 'Click the slider icon to open Advanced Search.',
    position: 'bottom',
    accent: '#c8a44d',
    waitFor: 'adv-search',
    action: true,
  },
  {
    selector: 'adv-filters',
    title: 'Filter Fields',
    description:
      'Use these fields to narrow your search. Filter by author UUID, gender, net worth, age range, location, date range, content type (image/video/poll/likert), vote count, comment count, topic, and more.',
    position: 'right',
    accent: '#c8a44d',
    waitFor: 'adv-filters',
    interimSelector: 'feed-compose',
  },
  {
    selector: 'apply-filters',
    title: 'Apply Filters',
    description:
      'Once you\u2019ve set your filters, click this button to run the search. The first search will take longer, especially for broad date ranges. After that, results are cached locally \u2014 subsequent searches only scan for the newest posts, making them much faster.',
    position: 'top',
    accent: '#c8a44d',
    waitFor: 'apply-filters',
  },

  // ── Compose flow ──
  {
    selector: 'compose',
    title: 'Compose',
    description: 'Click to open the compose window \u2014 we\u2019ll walk through a couple features inside.',
    position: 'top',
    accent: '#c8a44d',
    action: true,
  },
  {
    selector: 'media',
    title: 'Media \u2014 Video Support',
    description: 'Upload images or videos. Video is now fully supported \u2014 click this button to attach media to your post.',
    position: 'top',
    accent: '#c8a44d',
    waitFor: 'media',
  },
  {
    selector: 'zwj',
    title: 'ZWJ Obfuscation',
    description:
      'Type some text in the editor above, select it, then click this ZWJ button. It injects invisible zero-width joiners between characters \u2014 AI detection tools can\u2019t flag or match the text. Give it a try! You\u2019ll get a toast confirming it worked.',
    position: 'top',
    accent: '#c8a44d',
    waitFor: 'zwj',
  },

  // ── Drafts flow ──
  {
    selector: 'save-draft',
    title: 'Save Draft',
    description: 'Type something in the editor, then click this button to save it as a draft. Drafts are stored locally in your browser and survive refreshes.',
    position: 'top',
    accent: '#c8a44d',
  },
  {
    selector: 'drafts',
    title: 'Manage Drafts',
    description:
      'Click here to open the drafts panel. You can load a saved draft back into the editor or delete ones you no longer need.',
    position: 'top',
    accent: '#c8a44d',
  },

  // ── Close compose ──
  {
    selector: 'close-compose',
    title: 'Close Compose',
    description: 'Click the X to close the compose window before we continue.',
    position: 'bottom',
    accent: '#c8a44d',
    action: true,
  },

  // ── Settings flow ──
  {
    selector: 'me-nav',
    title: 'Your Profile',
    description: 'Click \u201CMe\u201D to navigate to your profile page \u2014 that\u2019s where you\u2019ll find Settings.',
    position: 'top',
    accent: '#c8a44d',
    action: true,
  },
  // ── Custom Location flow ──
  {
    selector: 'edit-profile',
    title: 'Edit Profile',
    description: 'Click the pencil icon to open the edit profile menu \u2014 we\u2019ll show off the custom location feature.',
    position: 'bottom',
    accent: '#c8a44d',
    waitFor: 'edit-profile',
    action: true,
    keepOpen: true,
    naturalClick: true,
  },
  {
    selector: 'edit-city',
    title: 'City',
    description: 'Click the City row to open the location picker.',
    position: 'right',
    accent: '#c8a44d',
    waitFor: 'edit-city',
    action: true,
    keepOpen: true,
    naturalClick: true,
  },
  {
    selector: 'custom-location',
    title: 'Custom Location',
    description: 'Not stuck with the preset city list. Hit the \u201C+\u201D inside the search box to type any location you want (e.g. \u201CTokyo, Japan\u201D or \u201CMars\u201D).',
    position: 'right',
    accent: '#c8a44d',
    waitFor: 'custom-location',
  },
  {
    selector: 'settings',
    title: 'Settings',
    description:
      'Click the gear icon to open Settings. Inside you\u2019ll find:\n\u2022 Connections \u2014 manage linked accounts\n\u2022 Blocked Users \u2014 manage your block list\n\u2022 Appear Offline \u2014 ghost mode\n\u2022 Export / Import Data \u2014 back up or restore\n\u2022 Clear Data \u2014 wipe everything\n\u2022 Tutorial \u2014 replay this walkthrough',
    position: 'right',
    accent: '#c8a44d',
    waitFor: 'settings',
    clickThrough: true,
  },

  // ── Export reminder ──
  {
    selector: '__export_reminder__',
    title: 'Export Your Data Regularly!',
    description:
      'There\u2019s no cloud sync \u2014 everything lives in your browser. Go to your profile \u2192 Settings \u2192 Export Data to save a backup JSON. You can import it on any device.',
    position: 'center',
    accent: '#c8a44d',
    fallback: true,
  },
]

// ── Helpers ──
function getTargetEl(selector: string): HTMLElement | null {
  if (selector.startsWith('__')) return null
  return document.querySelector(`[data-onboarding="${selector}"]`)
}

interface Rect { top: number; left: number; width: number; height: number }

function getRect(el: HTMLElement): Rect {
  const r = el.getBoundingClientRect()
  return { top: r.top, left: r.left, width: r.width, height: r.height }
}

// ── Component ──
export function OnboardingTutorial() {
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)
  const [exiting, setExiting] = useState(false)
  const [spotlight, setSpotlight] = useState<Rect | null>(null)
  const [waiting, setWaiting] = useState(false)
  const [tooltipVisible, setTooltipVisible] = useState(false)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const trackingRef = useRef(false)

  // Wrapper: sets waiting synchronously with step so layout effects see it
  const goToStep = useCallback((n: number) => {
    const def = STEPS[n]
    // Only enter waiting if the target element isn't already in the DOM
    if (def?.waitFor && !getTargetEl(def.waitFor)) {
      setWaiting(true)
      // Immediately target an interim element so the spotlight starts moving now
      if (def.interimSelector) {
        const el = getTargetEl(def.interimSelector)
        if (el) setSpotlight(getRect(el))
      }
    }
    setStep(n)
  }, [])

  useEffect(() => {
    if (localStorage.getItem(ONBOARDING_KEY) !== '1') {
      const t = setTimeout(() => setVisible(true), 600)
      return () => clearTimeout(t)
    }
  }, [])

  // Recalculate spotlight position on step change, resize, scroll
  const updateSpotlight = useCallback(() => {
    const current = STEPS[step]
    if (!current) return
    const el = getTargetEl(current.selector)
    if (el) {
      const r = getRect(el)
      setSpotlight(prev => {
        if (prev && prev.top === r.top && prev.left === r.left && prev.width === r.width && prev.height === r.height) return prev
        return r
      })
    } else {
      setSpotlight(prev => prev === null ? prev : null)
    }
  }, [step])

  useLayoutEffect(() => {
    if (!visible || waiting) return
    updateSpotlight()

    // After the 'search' action step: track frame-by-frame (search bar expanding)
    const prevDef = step > 0 ? STEPS[step - 1] : null
    if (prevDef?.selector === 'search') {
      const current = STEPS[step]
      if (!current) return
      trackingRef.current = true
      let raf: number
      const start = performance.now()
      const tick = () => {
        updateSpotlight()
        if (performance.now() - start < 400) {
          raf = requestAnimationFrame(tick)
        } else {
          trackingRef.current = false
          updateSpotlight()
        }
      }
      raf = requestAnimationFrame(tick)
      return () => { cancelAnimationFrame(raf); trackingRef.current = false }
    }

    // All other steps: re-measure after layout stabilizes (e.g. search bar collapse)
    const t = setTimeout(updateSpotlight, 350)
    return () => clearTimeout(t)
  }, [visible, step, updateSpotlight, waiting])

  useEffect(() => {
    if (!visible || waiting) return
    const handleResize = () => updateSpotlight()
    window.addEventListener('resize', handleResize)
    window.addEventListener('scroll', handleResize, true)
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('scroll', handleResize, true)
    }
  }, [visible, updateSpotlight, waiting])

  // ── waitFor: poll for the selector to appear ──
  useEffect(() => {
    if (!visible) return
    const current = STEPS[step]
    if (!current?.waitFor) { setWaiting(false); return }
    const sel = current.waitFor
    // If element is already in the DOM, skip waiting entirely
    if (getTargetEl(sel)) { setWaiting(false); return }
    setWaiting(true)
    // Highlight an interim element while waiting (e.g. ComposePost occupies same spot as AdvancedSearchPanel)
    if (current.interimSelector) {
      const interimEl = getTargetEl(current.interimSelector)
      if (interimEl) setSpotlight(getRect(interimEl))
    }
    let found = false
    const resolve = () => {
      if (!found && getTargetEl(sel)) {
        found = true
        clearInterval(interval)
        clearTimeout(timeout)
        setWaiting(false)
      }
    }
    resolve() // check immediately
    const interval = setInterval(resolve, 20)
    const timeout = setTimeout(() => {
      clearInterval(interval)
      setWaiting(false) // show as fallback centered card after timeout
    }, 8000)
    return () => { clearInterval(interval); clearTimeout(timeout) }
  }, [visible, step])

  // ── Tooltip visibility: hide during waiting, visible otherwise ──
  useEffect(() => {
    if (waiting) { setTooltipVisible(false); return }
    const t = setTimeout(() => setTooltipVisible(true), 50)
    return () => clearTimeout(t)
  }, [waiting])

  // ── action steps: listen for interaction on target to auto-advance ──
  // Uses mousedown so it fires even if the element removes itself from the DOM
  // before the click event (e.g. adv-search button uses onMouseDown + removes itself).
  useEffect(() => {
    if (!visible || waiting) return
    const current = STEPS[step]
    if (!current?.action) return
    const el = getTargetEl(current.selector)
    if (!el) return
    const useNatural = !!current.naturalClick
    const eventName = useNatural ? 'click' : 'mousedown'
    function handleInteraction() {
      if (!useNatural) {
        // Fire a synthetic click so onClick handlers (e.g. close-compose) trigger
        // immediately — before the step changes and click blockers shift away
        el?.click()
      }
      // Compose needs more time so the click event fires and the modal opens
      const delay = current.selector === 'compose' ? 200 : 50
      setTimeout(() => {
        goToStep(Math.min(step + 1, STEPS.length - 1))
      }, delay)
    }
    el.addEventListener(eventName, handleInteraction, { once: true })
    return () => el.removeEventListener(eventName, handleInteraction)
  }, [visible, step, waiting, goToStep])

  // ── Dismiss open popovers (e.g. settings menu) when leaving an action step ──
  const prevStepRef = useRef(step)
  useEffect(() => {
    const prev = prevStepRef.current
    prevStepRef.current = step
    if (!visible || prev === step) return
    const prevDef = STEPS[prev]
    if ((prevDef?.action || prevDef?.clickThrough) && !prevDef?.keepOpen) {
      // Dispatch a mousedown on body so PopoverMenu's outside-click handler closes it
      document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    }
  }, [visible, step])

  const finish = useCallback(() => {
    setExiting(true)
    setTimeout(() => {
      localStorage.setItem(ONBOARDING_KEY, '1')
      setVisible(false)
    }, 250)
  }, [])

  const next = useCallback(() => {
    if (step < STEPS.length - 1) {
      goToStep(step + 1)
    } else {
      finish()
    }
  }, [step, finish, goToStep])

  const prev = useCallback(() => {
    if (step <= 0) return
    // Skip back over steps whose target element isn't in the DOM
    for (let i = step - 1; i >= 0; i--) {
      const s = STEPS[i]
      if (s.fallback || s.selector.startsWith('__')) { goToStep(i); return }
      if (getTargetEl(s.selector)) { goToStep(i); return }
    }
    goToStep(0)
  }, [step, goToStep])

  useEffect(() => {
    if (!visible) return
    const current = STEPS[step]
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { finish(); return }
      // For action steps, don't allow keyboard next
      if (current?.action) return
      if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); next() }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); prev() }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [visible, step, next, prev, finish])

  if (!visible) return null

  const current = STEPS[step]
  const isCentered = !spotlight || current.fallback
  const isLast = step === STEPS.length - 1
  const isAction = !!current.action && !isCentered
  const isClickThrough = !!current.clickThrough && !isCentered
  const allowClick = isAction || isClickThrough
  const PAD = 8

  // Calculate tooltip position — slides smoothly via CSS transitions
  const TOOLTIP_W = 340
  const MARGIN = 16
  let tooltipStyle: React.CSSProperties = {
    position: 'fixed',
    transition: trackingRef.current
      ? 'opacity 150ms ease'
      : 'top 300ms ease-out, left 300ms ease-out, transform 300ms ease-out, opacity 150ms ease',
  }
  if (isCentered) {
    tooltipStyle = { ...tooltipStyle, top: window.innerHeight / 2, left: window.innerWidth / 2, transform: 'translate(-50%, -50%)' }
  } else if (spotlight) {
    const pos = current.position
    const rawLeft = spotlight.left + spotlight.width / 2
    const clampedLeft = Math.max(MARGIN + TOOLTIP_W / 2, Math.min(rawLeft, window.innerWidth - MARGIN - TOOLTIP_W / 2))

    if (pos === 'bottom') {
      tooltipStyle = { ...tooltipStyle, top: spotlight.top + spotlight.height + PAD + 8, left: clampedLeft, transform: 'translate(-50%, 0%)' }
    } else if (pos === 'top') {
      tooltipStyle = { ...tooltipStyle, top: spotlight.top - PAD - 8, left: clampedLeft, transform: 'translate(-50%, -100%)' }
    } else if (pos === 'right') {
      tooltipStyle = { ...tooltipStyle, top: spotlight.top, left: spotlight.left + spotlight.width + PAD + 8, transform: 'translate(0%, 0%)' }
    } else if (pos === 'left') {
      tooltipStyle = { ...tooltipStyle, top: spotlight.top + spotlight.height / 2, left: spotlight.left - PAD - 8, transform: 'translate(-100%, -50%)' }
    }
  }

  return (
    <>
      {/* Layer 1: Dimming overlay (z-200) — compose modal sits above this at z-210 */}
      <div
        className={cn(
          'pointer-events-none fixed inset-0 transition-opacity duration-250',
          exiting ? 'opacity-0' : 'opacity-100',
        )}
        style={{ zIndex: 200 }}
      >
        <div
          className={cn('pointer-events-none fixed rounded-xl', !trackingRef.current && 'transition-all duration-300 ease-out')}
          style={{
            top: spotlight && !isCentered ? spotlight.top - PAD : '50%',
            left: spotlight && !isCentered ? spotlight.left - PAD : '50%',
            width: spotlight && !isCentered ? spotlight.width + PAD * 2 : 0,
            height: spotlight && !isCentered ? spotlight.height + PAD * 2 : 0,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.35)',
          }}
        />
      </div>

      {/* Layer 2: Spotlight ring (z-220) — above compose modal */}
      {!waiting && spotlight && !isCentered && (
        <div
          className={cn(
            'pointer-events-none fixed rounded-xl border-2',
            !trackingRef.current && 'transition-all duration-300 ease-out',
            exiting && 'opacity-0',
            allowClick && 'animate-pulse',
          )}
          style={{
            zIndex: 220,
            top: spotlight.top - PAD,
            left: spotlight.left - PAD,
            width: spotlight.width + PAD * 2,
            height: spotlight.height + PAD * 2,
            borderColor: current.accent,
            boxShadow: `0 0 20px ${current.accent}40, 0 0 40px ${current.accent}20`,
          }}
        />
      )}

      {/* Layer 3: Click blockers (z-230) — above compose modal */}
      <div
        className={cn(
          'pointer-events-none fixed inset-0 transition-opacity duration-250',
          exiting ? 'opacity-0' : 'opacity-100',
        )}
        style={{ zIndex: 230 }}
      >
        {waiting ? (
          <div className="pointer-events-auto fixed inset-0" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }} onClick={(e) => { e.preventDefault(); e.stopPropagation() }} />
        ) : allowClick && spotlight ? (
          <>
            {/* Top */}
            <div className="pointer-events-auto fixed left-0 right-0 top-0" style={{ height: Math.max(0, spotlight.top - PAD) }} onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }} onClick={(e) => { e.preventDefault(); e.stopPropagation() }} />
            {/* Bottom */}
            <div className="pointer-events-auto fixed bottom-0 left-0 right-0" style={{ top: spotlight.top + spotlight.height + PAD }} onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }} onClick={(e) => { e.preventDefault(); e.stopPropagation() }} />
            {/* Left */}
            <div className="pointer-events-auto fixed left-0" style={{ top: spotlight.top - PAD, height: spotlight.height + PAD * 2, width: Math.max(0, spotlight.left - PAD) }} onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }} onClick={(e) => { e.preventDefault(); e.stopPropagation() }} />
            {/* Right */}
            <div className="pointer-events-auto fixed right-0" style={{ top: spotlight.top - PAD, height: spotlight.height + PAD * 2, left: spotlight.left + spotlight.width + PAD }} onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }} onClick={(e) => { e.preventDefault(); e.stopPropagation() }} />
          </>
        ) : (
          <div className="pointer-events-auto fixed inset-0" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }} onClick={(e) => { e.preventDefault(); e.stopPropagation() }} />
        )}
      </div>

      {/* Layer 4: Tooltip card (z-240) — always rendered for smooth CSS transitions */}
      <div
        ref={tooltipRef}
        className={cn(
          current.selector === '__export_reminder__' ? 'w-[440px]' : 'w-[340px]',
          'max-w-[calc(100vw-32px)]',
          (waiting || !tooltipVisible || exiting) ? 'pointer-events-none' : 'pointer-events-auto',
        )}
        style={{ zIndex: 240, ...tooltipStyle, opacity: (tooltipVisible && !exiting) ? 1 : 0 }}
      >
        <div className="overflow-hidden rounded-2xl border border-white/[0.1] bg-[#18170f] shadow-2xl shadow-black/60">
          {/* Progress bar */}
          <div className="h-[2px] w-full bg-white/[0.04]">
            <div
              className="h-full transition-all duration-300 ease-out"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%`, backgroundColor: current.accent }}
            />
          </div>

          <div className="px-5 pt-4 pb-4">
            {/* Header row */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-[15px] font-semibold text-white/90">{current.title}</h3>
                <span className="text-[11px] text-white/25">{step + 1} of {STEPS.length}</span>
              </div>
              <button
                onClick={finish}
                className="flex h-6 w-6 items-center justify-center rounded-full text-white/25 transition-colors hover:bg-white/[0.06] hover:text-white/50"
              >
                <X className="h-3.5 w-3.5" strokeWidth={2.5} />
              </button>
            </div>

            {/* Description */}
            <p className="mt-3 whitespace-pre-line text-[13px] leading-relaxed text-white/50">
              {current.description}
            </p>

            {/* Action hint */}
            {isAction && (
              <div
                className="mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-medium"
                style={{ backgroundColor: `${current.accent}15`, color: current.accent }}
              >
                <MousePointerClick className="h-3.5 w-3.5 shrink-0" />
                Click the highlighted element to continue
              </div>
            )}

            {/* Nav */}
            <div className="mt-4 flex items-center justify-between">
              <button
                onClick={prev}
                disabled={step === 0}
                className={cn(
                  'flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-colors',
                  step === 0
                    ? 'cursor-default text-white/15'
                    : 'text-white/40 hover:bg-white/[0.04] hover:text-white/60',
                )}
              >
                <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2.5} />
                Back
              </button>

              {/* Dots */}
              <div className="flex gap-1">
                {STEPS.map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      'h-1.5 rounded-full transition-all duration-300',
                      i === step ? 'w-3.5' : 'w-1.5 bg-white/[0.1]',
                    )}
                    style={i === step ? { backgroundColor: current.accent } : undefined}
                  />
                ))}
              </div>

              {isAction ? (
                <div className="w-[60px]" />
              ) : (
                <button
                  onClick={next}
                  className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-colors hover:bg-white/[0.06]"
                  style={{ color: current.accent }}
                >
                  {isLast ? 'Got it!' : 'Next'}
                  <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.5} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
