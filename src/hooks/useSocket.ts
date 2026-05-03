import { useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/lib/auth'
import { OFFLINE_KEY } from '@/hooks/useAuthLogin'

const WS_BASE = 'wss://ds3y2js2k0.execute-api.us-east-2.amazonaws.com/ws/'
const RECONNECT_DELAY = 2_000
const MAX_RECONNECT_DELAY = 30_000

type MessageHandler = (data: unknown) => void

export function useSocket(onMessage?: MessageHandler) {
  const { auth } = useAuth()
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const delayRef = useRef(RECONNECT_DELAY)
  const onMessageRef = useRef(onMessage)
  onMessageRef.current = onMessage

  const connect = useCallback(() => {
    if (!auth?.token) return
    if (localStorage.getItem(OFFLINE_KEY) === '1') return

    // Clean up existing connection
    if (wsRef.current) {
      wsRef.current.onclose = null
      wsRef.current.close()
    }

    const url = `${WS_BASE}?token=${auth.token}`
    const ws = new WebSocket(url)

    ws.onopen = () => {
      delayRef.current = RECONNECT_DELAY
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        onMessageRef.current?.(data)
      } catch {
        // ignore non-JSON frames
      }
    }

    ws.onclose = () => {
      wsRef.current = null
      // Auto-reconnect with exponential backoff
      reconnectTimer.current = setTimeout(() => {
        connect()
        delayRef.current = Math.min(delayRef.current * 1.5, MAX_RECONNECT_DELAY)
      }, delayRef.current)
    }

    ws.onerror = () => {
      ws.close()
    }

    wsRef.current = ws
  }, [auth?.token])

  useEffect(() => {
    connect()
    return () => {
      clearTimeout(reconnectTimer.current)
      if (wsRef.current) {
        wsRef.current.onclose = null
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [connect])

  const send = useCallback((data: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
      return true
    }
    return false
  }, [])

  return { send }
}
