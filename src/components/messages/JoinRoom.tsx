import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { rpc } from '@/lib/api'
import { useAuth } from '@/lib/auth'

const WS_URL = 'wss://ds3y2js2k0.execute-api.us-east-2.amazonaws.com/ws/'

export function JoinRoom() {
  const { roomUuid, roomCode } = useParams<{ roomUuid: string; roomCode: string }>()
  const { auth } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const attempted = useRef(false)

  useEffect(() => {
    if (!auth || !roomUuid || !roomCode || attempted.current) return
    attempted.current = true

    ;(async () => {
      try {
        // Join the room with the code
        await rpc(
          '/v1/rooms/joinRoomWithCode',
          { roomUuid, roomCode },
          auth.token,
          auth.userUuid,
        )

        await new Promise<void>((resolve) => {
          const ws = new WebSocket(`${WS_URL}?token=${encodeURIComponent(auth.token)}`)
          const timeout = window.setTimeout(resolve, 5000)
          ws.onopen = () => {
            ws.send(JSON.stringify({ action: 'joinRoom', roomUuid }))
            window.setTimeout(() => {
              ws.send(JSON.stringify({ action: 'sendMessage', roomUuid, text: 'joined' }))
              ws.close()
              window.clearTimeout(timeout)
              resolve()
            }, 1000)
          }
          ws.onerror = () => {
            window.clearTimeout(timeout)
            resolve()
          }
        })

        navigate(`/room/${roomUuid}`, { replace: true })
      } catch (e) {
        console.error('Failed to join room:', e)
        setError(e instanceof Error ? e.message : 'Failed to join room')
      }
    })()
  }, [auth, roomUuid, roomCode, navigate])

  if (error) {
    return (
      <div className="flex min-h-[calc(100vh-72px)] items-center justify-center px-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-sm font-medium text-red-400">{error}</p>
          <button
            onClick={() => navigate('/messages', { replace: true })}
            className="rounded-full border border-white/[0.08] bg-white/[0.06] px-4 py-2 text-sm font-medium text-white/75 transition-colors hover:bg-white/[0.1]"
          >
            Go to messages
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-[calc(100vh-72px)] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-[#c8a44d]" strokeWidth={2} />
        <p className="text-sm text-white/50">Joining room…</p>
      </div>
    </div>
  )
}
