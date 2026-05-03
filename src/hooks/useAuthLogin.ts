import { useEffect, useRef } from 'react'
import { useAuth } from '@/lib/auth'
import { rpc } from '@/lib/api'

export const OFFLINE_KEY = '2c_appear_offline'

export function useAuthLogin() {
  const { auth } = useAuth()
  const called = useRef(false)

  useEffect(() => {
    if (!auth || called.current) return
    called.current = true

    if (localStorage.getItem(OFFLINE_KEY) === '1') return

    rpc(
      '/v2/auth/login',
      { version: 'web-v0.1.3', secret_key: auth.secretKey },
      auth.token,
      auth.userUuid,
    ).catch((err) => {
      console.warn('[useAuthLogin] /v2/auth/login failed:', err)
    })
  }, [auth])
}
