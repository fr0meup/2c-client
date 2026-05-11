import { rpc } from '@/lib/api'
import type { UserProfileResponse } from '@/lib/types'

const WS_BASE = 'wss://ds3y2js2k0.execute-api.us-east-2.amazonaws.com/ws/'

interface AuthLike {
  token: string
  userUuid: string
}

interface NotifyMentionsParams {
  auth: AuthLike
  mentionedUuids: string[]
  postUuid: string
  contentType: 'post' | 'comment'
}

let ownNetworthPromise: Promise<string> | null = null
const userNetworthPromises = new Map<string, Promise<string>>()

export function extractMentionUuids(el: HTMLElement | null, currentUserUuid?: string): string[] {
  if (!el) return []
  const uuids = Array.from(el.querySelectorAll<HTMLElement>('[data-mention-uuid]'))
    .map((node) => node.getAttribute('data-mention-uuid'))
    .filter((uuid): uuid is string => !!uuid && uuid !== currentUserUuid)
  return Array.from(new Set(uuids))
}

function postUrl(postUuid: string): string {
  const origin = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
    ? 'https://twocents.money'
    : window.location.origin
  return `${origin}/post/${postUuid}`
}

async function getUserNetworth(auth: AuthLike, userUuid: string): Promise<string> {
  const existing = userNetworthPromises.get(userUuid)
  if (existing) return existing
  const promise = rpc<UserProfileResponse>(
    '/v2/users/get',
    { user_uuid: userUuid, posts_limit: 0, comments_limit: 0, voted_posts_limit: 0, pick_votes_limit: 0 },
    auth.token,
    auth.userUuid,
  ).then((res) => `$${Math.round(res.user.balance).toLocaleString('en-US')}`)
  userNetworthPromises.set(userUuid, promise)
  return promise
}

async function getOwnNetworth(auth: AuthLike): Promise<string> {
  ownNetworthPromise ??= rpc<UserProfileResponse>(
    '/v2/users/get',
    { user_uuid: auth.userUuid, posts_limit: 0, comments_limit: 0, voted_posts_limit: 0, pick_votes_limit: 0 },
    auth.token,
    auth.userUuid,
  ).then((res) => `$${Math.round(res.user.balance).toLocaleString('en-US')}`)
  return ownNetworthPromise
}

function sendWsMessage(token: string, roomUuid: string, text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${WS_BASE}?token=${token}`)
    const timeout = window.setTimeout(() => {
      ws.close()
      reject(new Error('Timed out sending mention notification'))
    }, 7000)

    ws.onerror = () => {
      window.clearTimeout(timeout)
      reject(new Error('Failed to connect to messages'))
    }

    ws.onopen = () => {
      ws.send(JSON.stringify({ action: 'joinRoom', roomUuid }))
      window.setTimeout(() => {
        ws.send(JSON.stringify({ action: 'sendMessage', roomUuid, text }))
        window.clearTimeout(timeout)
        ws.close()
        resolve()
      }, 300)
    }
  })
}

export async function notifyMentions({ auth, mentionedUuids, postUuid, contentType }: NotifyMentionsParams): Promise<{ sent: number; failed: number }> {
  const recipients = Array.from(new Set(mentionedUuids)).filter((uuid) => uuid !== auth.userUuid)
  if (recipients.length === 0) return { sent: 0, failed: 0 }

  const senderNw = await getOwnNetworth(auth)

  const results = await Promise.allSettled(recipients.map(async (recipientUuid) => {
    const recipientNw = await getUserNetworth(auth, recipientUuid)
    const text = `${senderNw} mentioned ${recipientNw} in a ${contentType}.\ncheck it out here: ${postUrl(postUuid)}`
    const dm = await rpc<{ room: { uuid: string } }>(
      '/v1/rooms/startDM',
      { recipientUuid },
      auth.token,
      auth.userUuid,
    )
    await sendWsMessage(auth.token, dm.room.uuid, text)
  }))

  return {
    sent: results.filter((r) => r.status === 'fulfilled').length,
    failed: results.filter((r) => r.status === 'rejected').length,
  }
}
