import { useState } from 'react'
import { Compass } from 'lucide-react'
import { ExploreModal } from './ExploreModal'

export function MessagesListHeader() {
  const [exploreOpen, setExploreOpen] = useState(false)

  return (
    <>
      <div className="flex h-10 items-center justify-center">
        <button
          onClick={() => setExploreOpen(true)}
          className="group flex h-10 cursor-pointer items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.06] px-4 text-sm font-medium text-white/75 transition-all hover:border-[#c8a44d]/30 hover:bg-gradient-to-b hover:from-[#c8a44d]/[0.1] hover:to-[#c8a44d]/[0.04] hover:text-[#c8a44d] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
        >
          <Compass className="h-3.5 w-3.5 transition-transform duration-300 group-hover:rotate-[20deg]" strokeWidth={2.4} />
          <span>Explore rooms</span>
        </button>
      </div>

      {exploreOpen && <ExploreModal onClose={() => setExploreOpen(false)} />}
    </>
  )
}
