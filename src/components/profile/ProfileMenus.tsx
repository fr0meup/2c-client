import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth'
import {
  AlertTriangle,
  Ban,
  Check,
  ChevronDown,
  ChevronLeft,
  ExternalLink,
  FileText,
  Github,
  Download,
  EyeOff,
  Loader2,
  LogOut,
  Upload,
  Mail,
  MapPin,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Settings,
  Sparkles,
  Trash2,
  User as UserIcon,
  UserCheck,
  UserPlus,
  Calendar,
  Link2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUpdateUser } from '@/hooks/useUpdateUser'
import { useCities } from '@/hooks/useCities'
import type { ApiUserProfile } from '@/lib/types'
import { useBlockUser, useUnblockUser } from '@/hooks/useBlock'
import { useToast } from '@/components/toast/ToastContext'
import { humanizeError } from '@/lib/api'
import { OFFLINE_KEY } from '@/hooks/useAuthLogin'
import { BlockedUsersModal } from './BlockedUsersModal'

const TRIGGER_BTN =
  'group flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.06] text-white/70 transition-colors hover:bg-gradient-to-b hover:from-white/[0.09] hover:to-white/[0.04] hover:text-white hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]'

const MENU_PANEL =
  'absolute right-0 top-full z-50 mt-1.5 min-w-[220px] rounded-xl border border-white/[0.08] bg-[#141410] p-1 shadow-xl shadow-black/40'

const MENU_ITEM =
  'flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-white/75 transition-colors hover:bg-white/[0.05] hover:text-white'

const MENU_ITEM_DANGER =
  'flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-400/80 transition-colors hover:bg-red-500/10 hover:text-red-400'

const MENU_HEADER =
  'px-3 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/30'

/* ────────────────────────────────────────────────────────────────────────── */
/* Generic popover wrapper — handles outside-click + escape                  */
/* ────────────────────────────────────────────────────────────────────────── */

interface PopoverMenuProps {
  trigger: ReactNode
  triggerTitle?: string
  children: (close: () => void) => ReactNode
}

function PopoverMenu({ trigger, triggerTitle, children }: PopoverMenuProps) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (!(e.target instanceof Element)) return
      if (wrapRef.current?.contains(e.target)) return
      setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        title={triggerTitle}
        className={TRIGGER_BTN}
        data-active={open ? 'true' : 'false'}
      >
        {trigger}
      </button>
      {open && <div className={MENU_PANEL}>{children(() => setOpen(false))}</div>}
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Settings menu (own profile)                                                */
/* ────────────────────────────────────────────────────────────────────────── */

const CONTACT_LINKS = [
  { label: 'twocents feedback', href: '/?feed=bugs-and-feedback', icon: Mail, external: false },
  { label: 'X / Twitter', href: 'https://x.com/twocents', icon: ExternalLink, external: true },
  { label: 'Discord', href: 'https://discord.gg/w6NnSua4aH', icon: ExternalLink, external: true },
  { label: 'GitHub', href: 'https://github.com/fr0meup/2c-client', icon: Github, external: true },
]

interface ConfirmModalProps {
  title: string
  message: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}

function ConfirmModal({ title, message, confirmLabel, onConfirm, onCancel }: ConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60" onClick={onCancel}>
      <div
        className="mx-4 w-full max-w-[360px] rounded-2xl border border-white/[0.08] bg-[#141410] p-5 shadow-2xl shadow-black/60"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-500/10">
            <AlertTriangle className="h-4.5 w-4.5 text-red-400" strokeWidth={2.2} />
          </div>
          <h3 className="text-sm font-semibold text-white/90">{title}</h3>
        </div>
        <p className="mb-5 text-[13px] leading-relaxed text-white/50">{message}</p>
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-xs font-medium text-white/50 transition-colors hover:bg-white/[0.05] hover:text-white/70"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg bg-red-500/20 px-4 py-2 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/30"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function LogoutModal({ onExport, onLogout, onCancel }: { onExport: () => void; onLogout: () => void; onCancel: () => void }) {
  const [exported, setExported] = useState(false)

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60" onClick={onCancel}>
      <div
        className="mx-4 w-full max-w-[360px] rounded-2xl border border-white/[0.08] bg-[#141410] p-5 shadow-2xl shadow-black/60"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/10">
            <AlertTriangle className="h-4.5 w-4.5 text-amber-400" strokeWidth={2.2} />
          </div>
          <h3 className="text-sm font-semibold text-white/90">Log out</h3>
        </div>
        <p className="mb-5 text-[13px] leading-relaxed text-white/50">
          Your saved GIFs, favorites, emoji recents, drafts, and preferences are stored locally and may be lost. Export your data first so you can restore it later.
        </p>
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-xs font-medium text-white/50 transition-colors hover:bg-white/[0.05] hover:text-white/70"
          >
            Cancel
          </button>
          <button
            onClick={() => { onExport(); setExported(true) }}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition-colors',
              exported
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-white/[0.08] text-white/70 hover:bg-white/[0.12] hover:text-white'
            )}
          >
            {exported ? <Check className="h-3.5 w-3.5" /> : <Download className="h-3.5 w-3.5" />}
            {exported ? 'Exported' : 'Export first'}
          </button>
          <button
            onClick={onLogout}
            className="rounded-lg bg-red-500/20 px-4 py-2 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/30"
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  )
}

export function ProfileSettingsMenu() {
  const [blockedOpen, setBlockedOpen] = useState(false)
  const [confirm, setConfirm] = useState<{ type: 'clear' | 'import' | 'logout'; onConfirm: () => void } | null>(null)

  return (
    <>
      <PopoverMenu
        triggerTitle="Settings"
        trigger={<Settings className="h-4 w-4" strokeWidth={2.2} />}
      >
        {(close) => (
          <SettingsContent
            close={close}
            onOpenBlocked={() => { close(); setBlockedOpen(true) }}
            onConfirm={(type, fn) => { close(); setConfirm({ type, onConfirm: fn }) }}
          />
        )}
      </PopoverMenu>
      {blockedOpen && <BlockedUsersModal onClose={() => setBlockedOpen(false)} />}
      {confirm?.type === 'clear' && (
        <ConfirmModal
          title="Clear all data"
          message="This will permanently delete all your saved GIFs, favorites, emoji recents, drafts, and preferences. This cannot be undone."
          confirmLabel="Clear everything"
          onConfirm={() => { confirm.onConfirm(); setConfirm(null) }}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm?.type === 'import' && (
        <ConfirmModal
          title="Import data"
          message="Importing will replace all your current data (GIFs, favorites, emoji recents, drafts, preferences) with the backup file. Export first if you want to keep your current data."
          confirmLabel="Import & replace"
          onConfirm={() => { confirm.onConfirm(); setConfirm(null) }}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm?.type === 'logout' && (
        <LogoutModal
          onExport={async () => {
            const OUR_PREFIXES = ['2c_', 'twocents']
            const SKIP_KEYS = ['2c_auth']
            const data: Record<string, string> = {}
            for (let i = 0; i < localStorage.length; i++) {
              const k = localStorage.key(i)
              if (k && OUR_PREFIXES.some((p) => k.startsWith(p)) && !SKIP_KEYS.includes(k)) {
                data[k] = localStorage.getItem(k)!
              }
            }
            let drafts: unknown[] = []
            try {
              const { getDrafts } = await import('@/lib/drafts')
              const raw = await getDrafts()
              drafts = raw.map((d) => ({
                ...d,
                mediaBlob: d.mediaBlob ? Array.from(new Uint8Array(d.mediaBlob)) : null,
              }))
            } catch { /* no drafts */ }
            const backup = { _version: 1, localStorage: data, drafts }
            const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `2c-backup-${new Date().toISOString().slice(0, 10)}.json`
            a.click()
            URL.revokeObjectURL(url)
          }}
          onLogout={() => { confirm.onConfirm(); setConfirm(null) }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </>
  )
}

function SettingsContent({ close, onOpenBlocked, onConfirm }: { close: () => void; onOpenBlocked: () => void; onConfirm: (type: 'clear' | 'import' | 'logout', fn: () => void) => void }) {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const [contactOpen, setContactOpen] = useState(false)
  const [offline, setOffline] = useState(() => localStorage.getItem(OFFLINE_KEY) === '1')

  return (
    <div className="flex flex-col">
      <a
        href="https://www.twocents.money/user/connections"
        target="_blank"
        rel="noreferrer"
        onClick={close}
        className={MENU_ITEM}
      >
        <Link2 className="h-4 w-4 text-white/50" strokeWidth={2.2} />
        <span>Connections</span>
      </a>

      {/* Contact (expandable) */}
      <button
        onClick={() => setContactOpen((v) => !v)}
        className={cn(MENU_ITEM, 'justify-between')}
      >
        <span className="flex items-center gap-2.5">
          <Mail className="h-4 w-4 text-white/50" strokeWidth={2.2} />
          <span>Contact</span>
        </span>
        <ChevronDown
          className={cn('h-3.5 w-3.5 text-white/40 transition-transform duration-200', contactOpen && 'rotate-180')}
          strokeWidth={2.2}
        />
      </button>
      {contactOpen && (
        <div className="ml-4 flex flex-col border-l border-white/[0.06] pl-1.5">
          {CONTACT_LINKS.map(({ label, href, icon: Icon, external }) => (
            external ? (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                onClick={close}
                className={cn(MENU_ITEM, 'text-[13px]')}
              >
                <Icon className="h-3.5 w-3.5 text-white/40" strokeWidth={2.2} />
                <span>{label}</span>
              </a>
            ) : (
              <button
                key={label}
                onClick={() => { close(); navigate(href) }}
                className={cn(MENU_ITEM, 'text-[13px]')}
              >
                <Icon className="h-3.5 w-3.5 text-white/40" strokeWidth={2.2} />
                <span>{label}</span>
              </button>
            )
          ))}
        </div>
      )}

      <a
        href="https://www.twocents.com/blog/credits"
        target="_blank"
        rel="noreferrer"
        onClick={close}
        className={MENU_ITEM}
      >
        <Sparkles className="h-4 w-4 text-white/50" strokeWidth={2.2} />
        <span>Credits</span>
      </a>

      <div className="my-1 h-px bg-white/[0.06]" />

      <button
        onClick={onOpenBlocked}
        className={MENU_ITEM}
      >
        <Ban className="h-4 w-4 text-white/50" strokeWidth={2.2} />
        <span>Blocked users</span>
      </button>

      <button
        onClick={() => {
          const next = !offline
          setOffline(next)
          if (next) {
            localStorage.setItem(OFFLINE_KEY, '1')
          } else {
            localStorage.removeItem(OFFLINE_KEY)
          }
          close()
          window.location.reload()
        }}
        className={cn(MENU_ITEM, 'justify-between')}
      >
        <span className="flex items-center gap-2.5">
          <EyeOff className="h-4 w-4 text-white/50" strokeWidth={2.2} />
          <span>Appear offline</span>
        </span>
        <div
          className={`relative h-4 w-7 rounded-full transition-colors duration-200 ${
            offline ? 'bg-[#c8a44d]/40' : 'bg-white/[0.08]'
          }`}
        >
          <div
            className={`absolute top-0.5 h-3 w-3 rounded-full transition-all duration-200 ${
              offline ? 'left-[13px] bg-[#c8a44d]' : 'left-0.5 bg-white/40'
            }`}
          />
        </div>
      </button>
      <p className="px-3 pb-1 text-[11px] leading-tight text-white/30">
        You won't be able to send or receive any messages while appearing offline.
      </p>

      <div className="my-1 h-px bg-white/[0.06]" />

      <button
        onClick={async () => {
          const OUR_PREFIXES = ['2c_', 'twocents']
          const SKIP_KEYS = ['2c_auth']
          const data: Record<string, string> = {}
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i)
            if (k && OUR_PREFIXES.some((p) => k.startsWith(p)) && !SKIP_KEYS.includes(k)) {
              data[k] = localStorage.getItem(k)!
            }
          }

          // Drafts from IndexedDB
          let drafts: unknown[] = []
          try {
            const { getDrafts } = await import('@/lib/drafts')
            const raw = await getDrafts()
            drafts = raw.map((d) => ({
              ...d,
              mediaBlob: d.mediaBlob ? Array.from(new Uint8Array(d.mediaBlob)) : null,
            }))
          } catch { /* no drafts */ }

          const backup = {
            _version: 1,
            localStorage: data,
            drafts,
          }

          const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `2c-backup-${new Date().toISOString().slice(0, 10)}.json`
          a.click()
          URL.revokeObjectURL(url)
          close()
        }}
        className={MENU_ITEM}
      >
        <Download className="h-4 w-4 text-white/50" strokeWidth={2.2} />
        <span>Export data</span>
      </button>

      <button
        onClick={() => {
          onConfirm('import', () => {
            const input = document.createElement('input')
            input.type = 'file'
            input.accept = '.json'
            input.onchange = () => {
              const file = input.files?.[0]
              if (!file) return
              const reader = new FileReader()
              reader.onload = async () => {
                try {
                  const data = JSON.parse(reader.result as string)
                  if (typeof data !== 'object' || data === null) throw new Error('bad format')

                  // Clear existing data first
                  const OUR_PREFIXES = ['2c_', 'twocents']
                  const KEEP_KEYS = ['2c_auth']
                  const toRemove: string[] = []
                  for (let i = 0; i < localStorage.length; i++) {
                    const k = localStorage.key(i)
                    if (k && OUR_PREFIXES.some((p) => k.startsWith(p)) && !KEEP_KEYS.includes(k)) {
                      toRemove.push(k)
                    }
                  }
                  toRemove.forEach((k) => localStorage.removeItem(k))
                  try { indexedDB.deleteDatabase('2c-drafts') } catch { /* ignore */ }

                  // v1 format (has _version key)
                  if (data._version) {
                    if (data.localStorage) {
                      Object.entries(data.localStorage).forEach(([k, v]) => localStorage.setItem(k, v as string))
                    }
                    if (data.drafts?.length) {
                      const { saveDraft } = await import('@/lib/drafts')
                      for (const d of data.drafts) {
                        const draft = {
                          ...d,
                          mediaBlob: d.mediaBlob ? new Uint8Array(d.mediaBlob).buffer : null,
                        }
                        await saveDraft(draft)
                      }
                    }
                  } else {
                    // Legacy format (flat key-value from old export)
                    Object.entries(data).forEach(([k, v]) => localStorage.setItem(k, v as string))
                  }

                  window.location.reload()
                } catch {
                  alert('Invalid backup file.')
                }
              }
              reader.readAsText(file)
            }
            input.click()
          })
        }}
        className={MENU_ITEM}
      >
        <Upload className="h-4 w-4 text-white/50" strokeWidth={2.2} />
        <span>Import data</span>
      </button>

      <button
        onClick={() => {
          onConfirm('clear', () => {
            const OUR_PREFIXES = ['2c_', 'twocents']
            const KEEP_KEYS = ['2c_auth']
            const toRemove: string[] = []
            for (let i = 0; i < localStorage.length; i++) {
              const k = localStorage.key(i)
              if (k && OUR_PREFIXES.some((p) => k.startsWith(p)) && !KEEP_KEYS.includes(k)) {
                toRemove.push(k)
              }
            }
            toRemove.forEach((k) => localStorage.removeItem(k))
            try { indexedDB.deleteDatabase('2c-drafts') } catch { /* ignore */ }
            window.location.reload()
          })
        }}
        className={MENU_ITEM_DANGER}
      >
        <Trash2 className="h-4 w-4" strokeWidth={2.2} />
        <span>Clear data</span>
      </button>

      <div className="my-1 h-px bg-white/[0.06]" />

      <button
        onClick={() => {
          onConfirm('logout', () => { logout(); navigate('/login', { replace: true }) })
        }}
        className={MENU_ITEM_DANGER}
      >
        <LogOut className="h-4 w-4" strokeWidth={2.2} />
        <span>Log out</span>
      </button>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Edit menu (own profile)                                                    */
/* ────────────────────────────────────────────────────────────────────────── */

type EditField = 'bio' | 'city' | 'age' | 'gender' | null

interface ProfileEditMenuProps {
  user?: ApiUserProfile
}

export function ProfileEditMenu({ user }: ProfileEditMenuProps) {
  return (
    <PopoverMenu
      triggerTitle="Edit profile"
      trigger={<Pencil className="h-4 w-4" strokeWidth={2.2} />}
    >
      {(close) => <EditMenuContent user={user} close={close} />}
    </PopoverMenu>
  )
}

function EditMenuContent({ user, close }: { user?: ApiUserProfile; close: () => void }) {
  const [editing, setEditing] = useState<EditField>(null)
  const updateUser = useUpdateUser()

  const currentBio = user?.bio ?? ''
  const currentAge = user?.age ?? 0
  const currentGender = user?.gender ?? ''
  const currentArena = user?.arena ?? ''

  function buildParams(overrides: Record<string, unknown>) {
    return {
      bio: currentBio,
      age: currentAge,
      gender: currentGender,
      arena: currentArena,
      balance: user?.balance ?? 0,
      ...overrides,
    }
  }

  if (editing === 'bio') {
    return (
      <BioEditor
        initial={currentBio}
        saving={updateUser.isPending}
        onBack={() => setEditing(null)}
        onSave={(val) => {
          updateUser.mutate(buildParams({ bio: val }), { onSuccess: () => setEditing(null) })
        }}
      />
    )
  }

  if (editing === 'city') {
    return (
      <CityEditor
        initial={currentArena}
        saving={updateUser.isPending}
        onBack={() => setEditing(null)}
        onSave={(val) => {
          updateUser.mutate(buildParams({ arena: val }), { onSuccess: () => setEditing(null) })
        }}
      />
    )
  }

  if (editing === 'age') {
    return (
      <AgeEditor
        initial={currentAge}
        saving={updateUser.isPending}
        onBack={() => setEditing(null)}
        onSave={(val) => {
          updateUser.mutate(buildParams({ age: val }), { onSuccess: () => setEditing(null) })
        }}
      />
    )
  }

  if (editing === 'gender') {
    return (
      <GenderEditor
        initial={currentGender}
        saving={updateUser.isPending}
        onBack={() => setEditing(null)}
        onSave={(val) => {
          updateUser.mutate(buildParams({ gender: val }), { onSuccess: () => setEditing(null) })
        }}
      />
    )
  }

  return (
    <div className="flex flex-col">
      <div className={MENU_HEADER}>Edit profile</div>
      <button onClick={() => setEditing('bio')} className={MENU_ITEM}>
        <FileText className="h-4 w-4 text-white/50" strokeWidth={2.2} />
        <span className="flex-1 text-left">Bio</span>
        <span className="max-w-[100px] truncate text-xs text-white/30">{currentBio || '—'}</span>
      </button>
      <button onClick={() => setEditing('city')} className={MENU_ITEM}>
        <MapPin className="h-4 w-4 text-white/50" strokeWidth={2.2} />
        <span className="flex-1 text-left">City</span>
        <span className="text-xs text-white/30">{currentArena || '—'}</span>
      </button>
      <button onClick={() => setEditing('age')} className={MENU_ITEM}>
        <Calendar className="h-4 w-4 text-white/50" strokeWidth={2.2} />
        <span className="flex-1 text-left">Age</span>
        <span className="text-xs text-white/30">{currentAge || '—'}</span>
      </button>
      <button onClick={() => setEditing('gender')} className={MENU_ITEM}>
        <UserIcon className="h-4 w-4 text-white/50" strokeWidth={2.2} />
        <span className="flex-1 text-left">Gender</span>
        <span className="text-xs text-white/30">{currentGender || '—'}</span>
      </button>
    </div>
  )
}

/* ── Bio editor ── */

function BioEditor({ initial, saving, onBack, onSave }: { initial: string; saving: boolean; onBack: () => void; onSave: (v: string) => void }) {
  const [val, setVal] = useState(initial)
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { ref.current?.focus() }, [])

  return (
    <div className="flex w-[260px] flex-col gap-2 p-2">
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white">
        <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2.2} />
        <span>Edit Bio</span>
      </button>
      <textarea
        ref={ref}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        maxLength={300}
        rows={3}
        className="w-full resize-none rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/90 placeholder-white/30 outline-none focus:border-[#c8a44d]/40"
        placeholder="Write something about yourself…"
      />
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-white/25">{val.length}/300</span>
        <button
          onClick={() => onSave(val)}
          disabled={saving}
          className="flex items-center gap-1.5 rounded-lg bg-[#c8a44d]/20 px-3 py-1.5 text-xs font-semibold text-[#c8a44d] transition-colors hover:bg-[#c8a44d]/30 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" strokeWidth={2.5} />}
          Save
        </button>
      </div>
    </div>
  )
}

/* ── City editor ── */

function CityEditor({ initial, saving, onBack, onSave }: { initial: string; saving: boolean; onBack: () => void; onSave: (v: string) => void }) {
  const { data, isLoading } = useCities(true)
  const [selectedRegion, setSelectedRegion] = useState<string | null>(() => {
    if (!initial) return null
    const parts = initial.split(', ')
    return parts.length === 2 ? parts[1] : null
  })
  const [search, setSearch] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => { searchRef.current?.focus() }, [selectedRegion])

  const cities = data?.cities ?? {}
  const regions = Object.keys(cities).sort()

  const filteredRegions = search
    ? regions.filter((r) => {
        if (r.toLowerCase().includes(search.toLowerCase())) return true
        return cities[r].some((c) => c.toLowerCase().includes(search.toLowerCase()))
      })
    : regions

  if (selectedRegion && cities[selectedRegion]) {
    const regionCities = cities[selectedRegion]
    const filteredCities = search
      ? regionCities.filter((c) => c.toLowerCase().includes(search.toLowerCase()))
      : regionCities

    return (
      <div className="flex w-[240px] flex-col gap-1 p-2">
        <button onClick={() => { setSelectedRegion(null); setSearch('') }} className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white">
          <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2.2} />
          <span>{selectedRegion}</span>
        </button>
        <input
          ref={searchRef}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search cities…"
          className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs text-white/90 placeholder-white/30 outline-none focus:border-[#c8a44d]/40"
        />
        <div className="max-h-[200px] overflow-y-auto">
          {filteredCities.map((city) => {
            const arena = `${city}, ${selectedRegion}`
            const isActive = arena === initial
            return (
              <button
                key={city}
                onClick={() => !saving && onSave(arena)}
                disabled={saving}
                className={cn(MENU_ITEM, 'text-xs', isActive && 'text-[#c8a44d]')}
              >
                {isActive && <Check className="h-3 w-3 shrink-0" strokeWidth={2.5} />}
                <span>{city}</span>
                {saving && arena === initial && <Loader2 className="ml-auto h-3 w-3 animate-spin" />}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="flex w-[240px] flex-col gap-1 p-2">
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white">
        <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2.2} />
        <span>Edit City</span>
      </button>
      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-white/40" />
        </div>
      ) : (
        <>
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search regions…"
            className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs text-white/90 placeholder-white/30 outline-none focus:border-[#c8a44d]/40"
          />
          <div className="max-h-[250px] overflow-y-auto">
            {filteredRegions.map((region) => (
              <button
                key={region}
                onClick={() => { setSelectedRegion(region); setSearch('') }}
                className={cn(MENU_ITEM, 'justify-between text-xs')}
              >
                <span>{region}</span>
                <ChevronDown className="h-3 w-3 -rotate-90 text-white/30" strokeWidth={2.2} />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

/* ── Age editor ── */

function AgeEditor({ initial, saving, onBack, onSave }: { initial: number; saving: boolean; onBack: () => void; onSave: (v: number) => void }) {
  const [val, setVal] = useState(String(initial || ''))
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => { ref.current?.focus(); ref.current?.select() }, [])

  const num = parseInt(val, 10)
  const valid = !isNaN(num) && num >= 1 && num <= 120

  return (
    <div className="flex w-[220px] flex-col gap-2 p-2">
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white">
        <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2.2} />
        <span>Edit Age</span>
      </button>
      <input
        ref={ref}
        type="number"
        min={1}
        max={120}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && valid) onSave(num) }}
        className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/90 placeholder-white/30 outline-none focus:border-[#c8a44d]/40 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        placeholder="Your age"
      />
      <div className="flex justify-end">
        <button
          onClick={() => valid && onSave(num)}
          disabled={saving || !valid}
          className="flex items-center gap-1.5 rounded-lg bg-[#c8a44d]/20 px-3 py-1.5 text-xs font-semibold text-[#c8a44d] transition-colors hover:bg-[#c8a44d]/30 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" strokeWidth={2.5} />}
          Save
        </button>
      </div>
    </div>
  )
}

/* ── Gender editor ── */

const GENDER_OPTIONS = [
  { value: 'M', label: 'Male' },
  { value: 'F', label: 'Female' },
  { value: 'NB', label: 'Non-binary' },
]

function GenderEditor({ initial, saving, onBack, onSave }: { initial: string; saving: boolean; onBack: () => void; onSave: (v: string) => void }) {
  return (
    <div className="flex w-[220px] flex-col gap-1 p-2">
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white">
        <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2.2} />
        <span>Edit Gender</span>
      </button>
      {GENDER_OPTIONS.map(({ value, label }) => {
        const isActive = initial === value
        return (
          <button
            key={value}
            onClick={() => !saving && onSave(value)}
            disabled={saving}
            className={cn(MENU_ITEM, 'text-xs', isActive && 'text-[#c8a44d]')}
          >
            {isActive && <Check className="h-3 w-3 shrink-0" strokeWidth={2.5} />}
            <span>{label}</span>
            {saving && isActive && <Loader2 className="ml-auto h-3 w-3 animate-spin" />}
          </button>
        )
      })}
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Actions menu (other users) — block / message / follow                      */
/* ────────────────────────────────────────────────────────────────────────── */

interface ProfileActionsMenuProps {
  userUuid: string
  isFollowing: boolean
  onToggleFollow: (alias?: string) => void
}

export function ProfileActionsMenu({ userUuid, isFollowing, onToggleFollow }: ProfileActionsMenuProps) {
  return (
    <PopoverMenu
      triggerTitle="More"
      trigger={<MoreHorizontal className="h-4 w-4" strokeWidth={2.2} />}
    >
      {(close) => (
        <FollowMenuContent
          userUuid={userUuid}
          isFollowing={isFollowing}
          onToggleFollow={onToggleFollow}
          close={close}
        />
      )}
    </PopoverMenu>
  )
}

function FollowMenuContent({
  userUuid,
  isFollowing,
  onToggleFollow,
  close,
}: {
  userUuid: string
  isFollowing: boolean
  onToggleFollow: (alias?: string) => void
  close: () => void
}) {
  const navigate = useNavigate()
  const { auth } = useAuth()
  const queryClient = useQueryClient()
  const [showAliasInput, setShowAliasInput] = useState(false)
  const [alias, setAlias] = useState('')
  const [dmLoading, setDmLoading] = useState(false)
  const [dmError, setDmError] = useState<string | null>(null)
  const [blocked, setBlocked] = useState(false)
  const blockUser = useBlockUser()
  const unblockUser = useUnblockUser()
  const { toast } = useToast()
  const aliasRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (showAliasInput) aliasRef.current?.focus()
  }, [showAliasInput])

  if (showAliasInput) {
    return (
      <div className="flex w-[240px] flex-col gap-2 p-2">
        <button
          onClick={() => setShowAliasInput(false)}
          className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white"
        >
          <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2.2} />
          <span>Set alias</span>
        </button>
        <p className="text-[11px] text-white/35">Choose a nickname for this person</p>
        <input
          ref={aliasRef}
          value={alias}
          onChange={(e) => setAlias(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && alias.trim()) {
              onToggleFollow(alias.trim())
              close()
            }
          }}
          maxLength={30}
          placeholder="e.g. John, trading-guy…"
          className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/90 placeholder-white/30 outline-none focus:border-[#c8a44d]/40"
        />
        <div className="flex justify-end">
          <button
            onClick={() => {
              if (!alias.trim()) return
              onToggleFollow(alias.trim())
              close()
            }}
            disabled={!alias.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-[#c8a44d]/20 px-3 py-1.5 text-xs font-semibold text-[#c8a44d] transition-colors hover:bg-[#c8a44d]/30 disabled:opacity-50"
          >
            <UserPlus className="h-3 w-3" strokeWidth={2.5} />
            Follow
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <button
        onClick={() => {
          if (isFollowing) {
            onToggleFollow()
            close()
          } else {
            setShowAliasInput(true)
          }
        }}
        className={MENU_ITEM}
      >
        {isFollowing ? (
          <UserCheck className="h-4 w-4 text-[#c8a44d]" strokeWidth={2.2} />
        ) : (
          <UserPlus className="h-4 w-4 text-white/50" strokeWidth={2.2} />
        )}
        <span>{isFollowing ? 'Unfollow' : 'Follow'}</span>
      </button>

      <button
        disabled={dmLoading}
        onClick={async () => {
          if (!auth || dmLoading) return
          setDmLoading(true)
          try {
            const { rpc } = await import('@/lib/api')
            const check = await rpc<{ canMessage: boolean }>(
              '/v1/rooms/dms/canMessage',
              { recipientUuid: userUuid },
              auth.token,
              auth.userUuid,
            )
            if (!check.canMessage) {
              setDmError('This user has restricted their DMs.')
              setDmLoading(false)
              return
            }
            const result = await rpc<{ room: { uuid: string } }>(
              '/v1/rooms/startDM',
              { recipientUuid: userUuid },
              auth.token,
              auth.userUuid,
            )
            const roomUuid = result.room.uuid
            // Fetch room details, members, messages in parallel
            const [roomData, , messagesData] = await Promise.all([
              rpc<import('@/lib/types').GetRoomResponse>(
                '/v1/rooms/getRoom',
                { roomUuid },
                auth.token,
                auth.userUuid,
              ),
              rpc<import('@/lib/types').GetMembersResponse>(
                '/v1/rooms/getMembers',
                { roomUuid },
                auth.token,
                auth.userUuid,
              ),
              rpc<import('@/lib/types').GetMessagesResponse>(
                '/v1/rooms/getMessages',
                { roomUuid, offset: 0, limit: 500 },
                auth.token,
                auth.userUuid,
              ),
            ])
            // Inject new room into DM list cache so getRoom() finds it immediately
            queryClient.setQueryData<import('@/lib/types').ListRoomsResponse>(
              ['rooms', 'dms'],
              (prev) => {
                const apiRoom = roomData.room
                if (!prev) return { rooms: [apiRoom] }
                if (prev.rooms.some((r) => r.uuid === apiRoom.uuid)) return prev
                return { rooms: [apiRoom, ...prev.rooms] }
              },
            )
            // Also cache room detail as a fallback for getRoom()
            queryClient.setQueryData(['rooms', 'detail', roomUuid], roomData)
            // Prefill messages cache so RoomChat renders immediately
            queryClient.setQueryData(['rooms', 'messages', roomUuid], messagesData)
            close()
            navigate(`/room/${roomUuid}`)
            // Refresh DM list in background after navigation (delayed so server has time to propagate)
            setTimeout(() => {
              queryClient.invalidateQueries({ queryKey: ['rooms', 'dms'] })
              queryClient.invalidateQueries({ queryKey: ['rooms', 'user'] })
            }, 2000)
          } catch {
            setDmError('Failed to start DM. Try again.')
            setDmLoading(false)
          }
        }}
        className={MENU_ITEM}
      >
        {dmLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-white/50" strokeWidth={2.2} />
        ) : (
          <MessageSquare className="h-4 w-4 text-white/50" strokeWidth={2.2} />
        )}
        <span>{dmLoading ? 'Starting DM…' : 'Message'}</span>
      </button>
      {dmError && (
        <p className="px-3 py-1.5 text-[11px] text-red-400/80">{dmError}</p>
      )}

      <div className="my-1 h-px bg-white/[0.06]" />

      <button
        disabled={blockUser.isPending || unblockUser.isPending}
        onClick={() => {
          if (blocked) {
            unblockUser.mutate(userUuid, {
              onSuccess: () => {
                setBlocked(false)
                close()
                toast('success', 'User unblocked')
              },
              onError: (err) => {
                toast('error', `Failed to unblock: ${humanizeError(err)}`)
              },
            })
          } else {
            blockUser.mutate(userUuid, {
              onSuccess: () => {
                setBlocked(true)
                close()
                toast('success', 'User blocked')
              },
              onError: (err) => {
                toast('error', `Failed to block: ${humanizeError(err)}`)
              },
            })
          }
        }}
        className={blocked ? MENU_ITEM : MENU_ITEM_DANGER}
      >
        {blockUser.isPending || unblockUser.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.2} />
        ) : (
          <Ban className="h-4 w-4" strokeWidth={2.2} />
        )}
        <span>{blocked ? 'Unblock user' : 'Block user'}</span>
      </button>
    </div>
  )
}
