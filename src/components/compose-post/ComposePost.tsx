import { useState, useRef, useEffect, useCallback } from 'react'
import { ImagePlus, X, ChevronDown, BarChart3, List, Bold, Plus, Minus } from 'lucide-react'
import { NetworthPill } from '@/components/networth-pill'
import { GenderIcon } from '@/components/gender-icon'
import { TOPIC_MENU } from './config'
import type { PostOption } from './types'

// Mock user data — replace with real hook later
const MOCK_USER = {
  balance: 500_000,
  subscription_type: 1,
  gender: 'M',
  age: 25,
  arena: 'New York',
}

export function ComposePost({ onClose, scrollHeight = 260 }: { onClose?: () => void; scrollHeight?: number }) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [selectedTopic, setSelectedTopic] = useState('Lounge')
  const [topicMenuOpen, setTopicMenuOpen] = useState(false)
  const [activeOption, setActiveOption] = useState<PostOption>(null)
  const [pollOptions, setPollOptions] = useState(['', ''])
  const [likertValue, setLikertValue] = useState<number | null>(null)
  const [isBold, setIsBold] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = ta.scrollHeight + 'px'
  }, [body])

  const topicRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (topicRef.current && !topicRef.current.contains(e.target as Node)) {
        setTopicMenuOpen(false)
      }
    }
    if (topicMenuOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [topicMenuOpen])

  const toggleOption = useCallback((opt: 'poll' | 'likert') => {
    setActiveOption((prev) => {
      if (prev === opt) return null
      return opt
    })
    if (opt === 'poll') setPollOptions(['', ''])
    if (opt === 'likert') setLikertValue(null)
  }, [])

  const canPost = title.trim().length > 0 || body.trim().length > 0

  return (
    <div className="flex flex-col rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.05] to-white/[0.02] shadow-lg shadow-black/20">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-inherit px-5 pt-5 pb-2">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
        <NetworthPill
          networth={MOCK_USER.balance}
          subscriptionType={MOCK_USER.subscription_type}
          size="small"
        />
        <span className="flex items-center gap-1.5">
          <GenderIcon
            gender={MOCK_USER.gender === 'F' ? 'female' : 'male'}
            className="h-4 w-4 text-white/40"
          />
          <span className="text-sm font-semibold text-white/40">
            {MOCK_USER.age}
          </span>
        </span>
        {MOCK_USER.arena && (
          <span className="flex items-center gap-1 text-sm text-white/40">
            <img
              src="https://www.twocents.money/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Flocation-icon.bbe094a7.png&w=48&q=75&dpl=dpl_57sq3a4okDe2tVXZVSYu9FCcDV21"
              alt=""
              className="h-6 w-6 opacity-60"
            />
            <span className="font-semibold">{MOCK_USER.arena}</span>
          </span>
        )}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-white/60 hover:bg-white/[0.06] hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Title */}
        <div className="mb-3 flex items-baseline gap-2 pl-1">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="w-full bg-transparent text-xl font-bold text-white placeholder:text-white/20 focus:outline-none"
          />
          <span className="shrink-0 text-xs text-white/20">optional</span>
        </div>

        <div className="mb-3 ml-1 border-t border-white/[0.06]" />
      </div>

      {/* Scrollable content */}
      <div className="overflow-y-auto px-5" style={{ maxHeight: `${scrollHeight}px`, minHeight: '144px' }}>
        {/* Body */}
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Share your two cents..."
          ref={textareaRef}
          rows={1}
          className="w-full resize-none overflow-hidden border-none bg-transparent text-base text-white placeholder:text-white/40 focus:outline-none min-h-[144px]"
        />

      {/* Poll UI */}
      {activeOption === 'poll' && (
        <div className="mb-3 space-y-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
              Poll
            </p>
            <button
              onClick={() => setActiveOption(null)}
              className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full text-white/40 hover:bg-white/[0.06] hover:text-white"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          {pollOptions.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  value={opt}
                  onChange={(e) => {
                    const updated = [...pollOptions]
                    updated[i] = e.target.value
                    setPollOptions(updated)
                  }}
                  placeholder={`Option ${i + 1}`}
                  className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 pr-12 text-sm text-white placeholder:text-white/20 focus:border-[#c8a44d]/30 focus:outline-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-white/20">
                  {50 - opt.length}
                </span>
              </div>
              {pollOptions.length > 2 && (
                <button
                  onClick={() =>
                    setPollOptions((prev) => prev.filter((_, idx) => idx !== i))
                  }
                  className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-white/40 hover:bg-white/[0.06] hover:text-white"
                >
                  <Minus className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
          {pollOptions.length < 4 && (
            <button
              onClick={() => setPollOptions((prev) => [...prev, ''])}
              className="flex cursor-pointer items-center gap-1 text-xs text-white/40 transition-colors hover:text-white"
            >
              <Plus className="h-3 w-3" />
              <span>Add option</span>
            </button>
          )}
        </div>
      )}

      {/* Likert UI */}
      {activeOption === 'likert' && (
        <div className="mb-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
              Likert Scale
            </p>
            <button
              onClick={() => setActiveOption(null)}
              className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full text-white/40 hover:bg-white/[0.06] hover:text-white"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          <div className="flex items-center gap-1">
            {[
              'Strongly Disagree',
              'Disagree',
              'Neutral',
              'Agree',
              'Strongly Agree',
            ].map((label, i) => (
              <button
                key={label}
                onClick={() => setLikertValue(i)}
                className={`flex-1 cursor-pointer rounded-lg px-1 py-2 text-center text-[11px] leading-tight transition-colors duration-150 ${
                  likertValue === i
                    ? 'border border-[#c8a44d]/30 bg-[#c8a44d]/15 font-medium text-[#c8a44d]'
                    : 'border border-white/[0.06] bg-white/[0.03] text-white/40 hover:bg-white/[0.06] hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-5 pb-5 pt-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveOption((p) => (p === 'image' ? null : 'image'))}
            className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-colors ${
              activeOption === 'image'
                ? 'bg-[#c8a44d]/10 text-[#c8a44d]'
                : 'text-white/40 hover:bg-white/[0.06] hover:text-white'
            }`}
            title="Image"
          >
            <ImagePlus className="h-4 w-4" />
          </button>

          <button
            onClick={() => toggleOption('poll')}
            className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-colors ${
              activeOption === 'poll'
                ? 'bg-[#c8a44d]/10 text-[#c8a44d]'
                : 'text-white/40 hover:bg-white/[0.06] hover:text-white'
            }`}
            title="Poll"
          >
            <BarChart3 className="h-4 w-4" />
          </button>

          <button
            onClick={() => toggleOption('likert')}
            className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-colors ${
              activeOption === 'likert'
                ? 'bg-[#c8a44d]/10 text-[#c8a44d]'
                : 'text-white/40 hover:bg-white/[0.06] hover:text-white'
            }`}
            title="Likert"
          >
            <span className="text-xs font-bold">L</span>
          </button>

          <button
            onClick={() => setIsBold((p) => !p)}
            className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-colors ${
              isBold
                ? 'bg-[#c8a44d]/10 text-[#c8a44d]'
                : 'text-white/40 hover:bg-white/[0.06] hover:text-white'
            }`}
            title="Bold"
          >
            <Bold className="h-4 w-4" />
          </button>

          <button
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white"
            title="Bullets"
          >
            <List className="h-4 w-4" />
          </button>

          {/* Topic dropdown */}
          <div className="relative" ref={topicRef}>
            <button
              onClick={() => setTopicMenuOpen((prev) => !prev)}
              className="flex cursor-pointer items-center gap-1 rounded-full px-3 py-1.5 text-sm text-white/40 transition-colors hover:bg-white/[0.04] hover:text-white"
            >
              <span>{selectedTopic}</span>
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform duration-200 ${topicMenuOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {topicMenuOpen && (
              <div
                className="absolute left-full top-0 z-50 ml-2 w-72 max-h-72 overflow-y-auto rounded-xl border border-white/[0.08] bg-[#1a1a1a] p-2 shadow-xl shadow-black/40"
                style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'rgba(255,255,255,0.1) transparent',
                }}
              >
                {TOPIC_MENU.map((group, i) => (
                  <div key={group.category}>
                    {i > 0 && (
                      <div className="my-1.5 border-t border-white/[0.06]" />
                    )}
                    <p className="px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-white/40">
                      {group.category}
                    </p>
                    {group.items.map((item) => (
                      <button
                        key={item}
                        onClick={() => {
                          setSelectedTopic(item)
                          setTopicMenuOpen(false)
                        }}
                        className={`w-full cursor-pointer rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors duration-150 ${
                          selectedTopic === item
                            ? 'bg-[#c8a44d]/10 font-medium text-[#c8a44d]'
                            : 'text-white/80 hover:bg-white/[0.06] hover:text-white'
                        }`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <button
          disabled={!canPost}
          className="flex cursor-pointer items-center gap-1.5 rounded-full bg-[#c8a44d] px-4 py-1.5 text-sm font-semibold text-[#0f0e0a] transition-all duration-200 hover:bg-[#c8a44d]/85 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span>Post</span>
        </button>
      </div>
    </div>
  )
}
