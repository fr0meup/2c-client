import { MessageSquare } from 'lucide-react'
import { useMessages } from './MessagesContext'
import { RoomCard } from './RoomCard'
import { DMRow } from './DMRow'

export function MessagesList() {
  const { rooms, dms } = useMessages()

  const sortedRooms = [...rooms].sort(
    (a, b) => (b.stats.last_message_at ?? '').localeCompare(a.stats.last_message_at ?? ''),
  )
  const sortedDms = [...dms].sort(
    (a, b) => (b.stats.last_message_at ?? '').localeCompare(a.stats.last_message_at ?? ''),
  )

  const isEmpty = rooms.length === 0 && dms.length === 0

  return (
    <div className="flex min-h-[calc(100vh-72px)] items-start justify-center px-4 pt-3 pb-6 sm:px-8">
      <div className="flex w-full max-w-[670px] flex-col gap-5 xl:-ml-[245px]">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] py-16">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.04] text-white/30">
              <MessageSquare className="h-5 w-5" strokeWidth={2} />
            </div>
            <p className="text-sm text-white/40">No conversations yet</p>
          </div>
        ) : (
          <>
            {sortedRooms.length > 0 && (
              <section>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {sortedRooms.map((room) => (
                    <RoomCard key={room.uuid} room={room} />
                  ))}
                </div>
              </section>
            )}

            {sortedDms.length > 0 && (
              <section className="flex flex-col gap-2">
                <div className="flex items-center gap-2 px-1">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">Direct messages</span>
                  <span className="text-[11px] text-white/25 tabular-nums">{sortedDms.length}</span>
                  <span className="ml-2 h-px flex-1 bg-white/[0.06]" />
                </div>
                <div className="flex flex-col gap-2">
                  {sortedDms.map((dm) => (
                    <DMRow key={dm.uuid} dm={dm} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}
