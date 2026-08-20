import { useRef, useEffect } from 'react'
import { ChevronDown, Pin } from 'lucide-react'
import { TOPIC_MENU } from './config'
import { setPinnedTopic } from '@/lib/pinnedTopic'

interface TopicDropdownProps {
  selectedTopic: string
  setSelectedTopic: (topic: string) => void
  pinnedTopic: string
  setPinnedTopicState: (topic: string) => void
  isOpen: boolean
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>
}

export function TopicDropdown({
  selectedTopic,
  setSelectedTopic,
  pinnedTopic,
  setPinnedTopicState,
  isOpen,
  setIsOpen,
}: TopicDropdownProps) {
  const topicRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    function handleOutside(e: MouseEvent) {
      if (topicRef.current && !topicRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [isOpen, setIsOpen])

  return (
    <div className="relative" ref={topicRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex h-8 max-w-[7rem] cursor-pointer items-center gap-1 whitespace-nowrap rounded-full border border-white/[0.08] bg-white/[0.04] px-3 text-xs font-medium text-white/40 transition-all hover:border-[#c8a44d]/20 hover:text-white/60 sm:max-w-[9rem]"
      >
        <span className="truncate">{selectedTopic.replace(/^\$/, '')}</span>
        <ChevronDown
          className={`h-3 w-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen && (
        <div
          className="absolute right-0 bottom-full z-50 mb-2 w-72 max-w-[calc(100vw-2rem)] max-h-72 overflow-y-auto rounded-xl border border-white/[0.08] bg-[#141410] p-2 shadow-xl shadow-black/40"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: '#333330 transparent',
          }}
        >
          {TOPIC_MENU.map((group, i) => {
            const rawItems = group.items
            const groupItems =
              pinnedTopic && rawItems.includes(pinnedTopic)
                ? [pinnedTopic, ...rawItems.filter((item) => item !== pinnedTopic)]
                : rawItems

            return (
              <div key={group.category}>
                {i > 0 && <div className="my-1.5 border-t border-white/[0.06]" />}
                <div className="flex items-center justify-between px-2.5 py-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
                    {group.category}
                  </p>
                </div>
                {groupItems.map((item) => {
                  const isPinned = pinnedTopic === item
                  return (
                    <div
                      key={item}
                      className="group/item relative flex items-center justify-between"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTopic(item)
                          setIsOpen(false)
                        }}
                        className={`flex w-full items-center px-3 py-2 text-sm transition-colors ${
                          item === selectedTopic
                            ? 'bg-white/[0.03] text-[#c8a44d]'
                            : 'text-white/60 hover:bg-white/[0.03] hover:text-white/80'
                        }`}
                      >
                        {item.replace(/^\$/, '')}
                      </button>

                      <div className="absolute right-3 flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            const nextPin = setPinnedTopic(item)
                            setPinnedTopicState(nextPin)
                          }}
                          className={`cursor-pointer transition-colors ${
                            isPinned
                              ? 'text-[#c8a44d]'
                              : 'text-white/20 hover:text-white/70 opacity-0 group-hover/item:opacity-100'
                          }`}
                          title={
                            isPinned
                              ? 'Unpin default posting topic'
                              : 'Pin as default posting topic'
                          }
                        >
                          <Pin
                            className={`h-3.5 w-3.5 ${isPinned ? 'fill-[#c8a44d]' : ''}`}
                          />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
