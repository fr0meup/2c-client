const BASE_URL = 'https://api.twocents.money/prod'

interface JsonRpcRequest {
  jsonrpc: '2.0'
  id: string
  method: string
  params: Record<string, unknown>
}

interface JsonRpcResponse<T = unknown> {
  jsonrpc: '2.0'
  id: string
  result?: T
  error?: { code: number; message: string; data?: unknown }
}

export class ApiError extends Error {
  code: number
  data?: unknown
  constructor(code: number, message: string, data?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.data = data
  }
}

/** Turn SCREAMING_SNAKE like "CONTENT_MODERATED" → "Content moderated" */
export function humanizeError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err)
  if (!raw) return 'Unknown error'
  // If it looks like SCREAMING_SNAKE_CASE, humanize it
  if (/^[A-Z][A-Z0-9_]+$/.test(raw)) {
    return raw.charAt(0) + raw.slice(1).toLowerCase().replace(/_/g, ' ')
  }
  return raw
}

export async function rpc<T = unknown>(
  method: string,
  params: Record<string, unknown>,
  token: string,
  userUuid: string,
  signal?: AbortSignal
): Promise<T> {
  const body: JsonRpcRequest = {
    jsonrpc: '2.0',
    id: userUuid,
    method,
    params,
  }

  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
    signal,
  })

  let json: JsonRpcResponse<T>
  try {
    json = await res.json()
  } catch {
    // Response body wasn't valid JSON — fall back to HTTP status
    if (!res.ok) {
      throw new ApiError(res.status, `HTTP ${res.status}: ${res.statusText}`)
    }
    throw new ApiError(0, 'Invalid response from server')
  }

  if (json.error) {
    throw new ApiError(json.error.code, json.error.message, json.error.data)
  }

  if (!res.ok) {
    throw new ApiError(res.status, `HTTP ${res.status}: ${res.statusText}`)
  }

  return json.result as T
}
