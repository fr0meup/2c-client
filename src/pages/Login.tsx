import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Copy, Check, ChevronRight, ShieldCheck, Terminal, ClipboardPaste, Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { rpc } from '@/lib/api'
import { seedAuthLoginCache } from '@/hooks/useMyRank'
import type { AuthLoginResponse } from '@/lib/types'

const EXTRACT_SCRIPT = `(function() {
  const token = document.cookie.split('; ').find(r => r.startsWith('twocentsToken='))?.split('=')[1];
  if (!token) { console.warn('twocentsToken cookie not found'); return; }
  const uuid = JSON.parse(atob(token.split('.')[1])).sub;
  const secretKey = localStorage.getItem('twocentsKey');

  const out = JSON.stringify({ TOKEN: token, USER_UUID: uuid, SECRET_KEY: secretKey }, null, 2);
  console.log('%c--- 2c export ---', 'color: #a78bfa; font-weight: bold');
  console.log(out);
  copy(out);
  console.log('%ccopied.', 'color: #34d399');
})();`

const STEPS = [
  { num: 1, text: 'Copy the script below to your clipboard' },
  { num: 2, text: 'Go to twocents.money and make sure you\u2019re logged in', link: 'https://twocents.money' },
  { num: 3, text: 'Open DevTools — F12 on Windows/Linux, Cmd+Option+J on Mac — then switch to the Console tab' },
  { num: 4, text: 'Paste the script into the console and press Enter' },
  { num: 5, text: 'The output will be copied to your clipboard automatically' },
  { num: 6, text: 'Come back here and paste it into the input below' },
]

export function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const qc = useQueryClient()
  const [copied, setCopied] = useState(false)
  const [pasteValue, setPasteValue] = useState('')
  const [error, setError] = useState('')
  const [persist, setPersist] = useState(false)
  const [loading, setLoading] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(EXTRACT_SCRIPT)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleLogin() {
    setError('')
    let token: string, uuid: string, secretKey: string
    try {
      const parsed = JSON.parse(pasteValue.trim())
      token = parsed.TOKEN || parsed.token
      uuid = parsed.USER_UUID || parsed.user_uuid
      secretKey = parsed.SECRET_KEY || parsed.secret_key
      if (!token || !uuid || !secretKey) {
        setError('Missing TOKEN, USER_UUID, or SECRET_KEY in the pasted JSON.')
        return
      }
    } catch {
      setError('Invalid JSON. Paste the exact output from the console.')
      return
    }

    // Validate UUID matches the token's sub claim
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      if (payload.sub !== uuid) {
        setError('USER_UUID does not match the token. Make sure you copied the output correctly.')
        return
      }
    } catch {
      setError('Token is malformed — could not decode JWT payload.')
      return
    }

    setLoading(true)
    try {
      // Validate token + secret_key: /v1/users/blocked requires a valid secret_key
      const [loginRes] = await Promise.all([
        rpc<AuthLoginResponse>('/v2/auth/login', { version: 'web-v0.1.3', secret_key: secretKey }, token, uuid),
        rpc('/v1/users/blocked', { secret_key: secretKey }, token, uuid),
      ])
      seedAuthLoginCache(qc, loginRes)
      login(token, uuid, secretKey, persist)
      navigate('/', { replace: true })
    } catch {
      setError('Invalid or expired credentials. Go back to twocents.money and re-run the script.')
    } finally {
      setLoading(false)
    }
  }

  const canLogin = pasteValue.trim().length > 10 && !loading

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-[#0a0907] px-6 py-8"
      style={{ scrollbarWidth: 'thin', scrollbarColor: '#333330 transparent' }}
    >
      <div className="w-full max-w-5xl">
        {/* Logo */}
        <div className="mb-5 flex justify-center">
          <img
            src="https://www.twocents.money/_next/image?url=%2F2centsLogo.png&w=1920&q=75"
            alt="2C"
            className="h-11 object-contain"
          />
        </div>

        {/* Card — two-column */}
        <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-5 shadow-xl shadow-black/30 sm:p-7">
          <div className="flex flex-col gap-8 lg:flex-row">
            {/* Left column — intro + steps */}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-white">
                Welcome to the custom 2¢ client
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-white/50">
                This is a locally hosted client for{' '}
                <a href="https://twocents.money" target="_blank" rel="noopener noreferrer" className="font-medium text-[#c8a44d] underline decoration-[#c8a44d]/30 underline-offset-2 transition-colors hover:text-[#dab857]">twocents.money</a>.
                Since we don&apos;t have direct access to the backend, you&apos;ll need to grab your
                authentication token manually. It only takes a minute.
              </p>

              {/* Security notice */}
              <div
                className="mt-4 flex items-start gap-3 rounded-xl border border-emerald-500/15 px-3 py-2.5"
                style={{ background: 'linear-gradient(135deg, rgba(52,211,153,0.04), transparent)' }}
              >
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400/70" />
                <p className="text-xs leading-relaxed text-emerald-300/60">
                  <span className="font-semibold text-emerald-300/80">Your token never leaves your browser.</span>{' '}
                  We do not transmit or send your token anywhere, ever.
                  It is stored locally on your device and never shared with any server or third party.
                </p>
              </div>

              {/* Steps */}
              <div className="mt-4">
                <h2 className="mb-2 text-sm font-semibold text-white/70">How to get your token</h2>
                <ol className="space-y-1.5">
                  {STEPS.map((step) => (
                    <li key={step.num} className="flex items-start gap-2.5">
                      <span
                        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                        style={{
                          background: 'linear-gradient(135deg, rgba(200,164,77,0.15), rgba(200,164,77,0.05))',
                          color: 'rgba(200,164,77,0.7)',
                        }}
                      >
                        {step.num}
                      </span>
                      <span className="text-sm text-white/50">
                        {step.link ? (
                          <>Go to <a href={step.link} target="_blank" rel="noopener noreferrer" className="font-medium text-[#c8a44d] underline decoration-[#c8a44d]/30 underline-offset-2 transition-colors hover:text-[#dab857]">twocents.money</a> and make sure you&apos;re logged in</>
                        ) : step.text}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            {/* Right column — script + paste + login */}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              {/* Script block */}
              <div>
                <div className="flex items-center justify-between rounded-t-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2">
                  <div className="flex items-center gap-1.5 text-xs text-white/30">
                    <Terminal className="h-3 w-3" />
                    Console script
                  </div>
                  <button
                    onClick={handleCopy}
                    className="flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-all hover:bg-white/[0.06]"
                    style={{ color: copied ? '#34d399' : 'rgba(255,255,255,0.4)' }}
                  >
                    {copied ? (
                      <>
                        <Check className="h-3 w-3" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
                <pre
                  className="overflow-x-auto rounded-b-lg border border-t-0 border-white/[0.08] bg-[#0a0a08] px-3 py-3 font-mono text-[11px] leading-relaxed text-white/50"
                  style={{
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#333330 transparent',
                  }}
                >
                  {EXTRACT_SCRIPT}
                </pre>
              </div>

              {/* Paste input */}
              <div className="mt-4 flex flex-1 flex-col">
                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-white/70">
                  <ClipboardPaste className="h-3.5 w-3.5 text-white/30" />
                  Paste the output here
                </label>
                <textarea
                  value={pasteValue}
                  onChange={(e) => {
                    setPasteValue(e.target.value)
                    setError('')
                  }}
                  placeholder={'{\n  "TOKEN": "eyJ...",\n  "USER_UUID": "...",\n  "SECRET_KEY": "..."\n}'}
                  rows={4}
                  className="w-full flex-1 resize-none rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 font-mono text-xs text-white placeholder:text-white/15 focus:border-[#c8a44d]/30 focus:outline-none focus:ring-1 focus:ring-[#c8a44d]/20"
                />
                {error && (
                  <p className="mt-1.5 text-xs text-rose-400">{error}</p>
                )}
              </div>

              {/* Keep signed in toggle */}
              <label className="mt-3 flex cursor-pointer items-center gap-2.5 select-none">
                <div
                  onClick={() => setPersist((p) => !p)}
                  className={`relative h-5 w-9 rounded-full transition-colors duration-200 ${
                    persist ? 'bg-[#c8a44d]/40' : 'bg-white/[0.08]'
                  }`}
                >
                  <div
                    className={`absolute top-0.5 h-4 w-4 rounded-full transition-all duration-200 ${
                      persist
                        ? 'left-[18px] bg-[#c8a44d]'
                        : 'left-0.5 bg-white/40'
                    }`}
                  />
                </div>
                <span className="text-xs text-white/40">Keep me signed in</span>
              </label>

              {/* Login button */}
              <button
                onClick={handleLogin}
                disabled={!canLogin}
                className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-30"
                style={{
                  background: canLogin
                    ? 'linear-gradient(135deg, #c8a44d, #b8943d)'
                    : 'rgba(255,255,255,0.04)',
                  color: canLogin ? '#0f0e0a' : 'rgba(255,255,255,0.25)',
                }}
              >
                {loading ? 'Verifying…' : 'Login'}
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Footer note */}
        <p className="mt-3 text-center text-[11px] text-white/20">
          Not affiliated with <a href="https://twocents.money" target="_blank" rel="noopener noreferrer" className="text-white/30 underline decoration-white/10 underline-offset-2 transition-colors hover:text-white/50">twocents.money</a>. This is an independent community project.
        </p>
      </div>
    </div>
  )
}
