import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Link2, MoreHorizontal, Trash2, Quote, UserPlus, UserCheck, Mail, Ban, Bookmark, Loader2 } from 'lucide-react'
import { ConfirmDeleteModal } from '@/components/post-card/ConfirmDeleteModal'
import { useDeletePost } from '@/hooks/usePostMutations'
import { useToggleBookmark } from '@/hooks/useBookmarks'
import { useBlockUser, useUnblockUser } from '@/hooks/useBlock'
import { usePost } from '@/hooks/usePost'
import { useAuth } from '@/lib/auth'
import { useFollow } from '@/components/profile/FollowContext'
import { useToast } from '@/components/toast/ToastContext'
import { humanizeError } from '@/lib/api'
import { useQueryClient } from '@tanstack/react-query'

export function PostDetailHeader() {
  const { uuid } = useParams<{ uuid: string }>()
  const navigate = useNavigate()
  const { auth } = useAuth()
  const { data: postData } = usePost(uuid)
  const deleteMutation = useDeletePost()
  const bookmarkMutation = useToggleBookmark()
  const { isFollowing, toggleFollow } = useFollow()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const blockUser = useBlockUser()
  const unblockUser = useUnblockUser()
  const authorUuid = postData?.post?.author_uuid
  const isOwn = auth?.userUuid === authorUuid
  const [menuOpen, setMenuOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const [dmLoading, setDmLoading] = useState(false)
  const [showAliasInput, setShowAliasInput] = useState(false)
  const [aliasInput, setAliasInput] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  return (
    <div className="relative flex h-8 items-end justify-between">
      <button
        onClick={() => navigate(-1)}
        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.06] transition-all hover:bg-gradient-to-b hover:from-white/[0.09] hover:to-white/[0.04] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
      >
        <ArrowLeft className="h-5 w-5 text-white" />
      </button>
      <span className="text-sm font-bold tracking-wide text-white/40">slop</span>
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((p) => !p)}
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.06] transition-all hover:bg-gradient-to-b hover:from-white/[0.09] hover:to-white/[0.04] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
        >
          <MoreHorizontal className="h-5 w-5 text-white/40" />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-xl border border-white/[0.08] bg-[#141410] p-1 shadow-xl shadow-black/40">
            <button
              onClick={() => { navigator.clipboard.writeText(window.location.href); setMenuOpen(false) }}
              className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-white/80 transition-colors hover:bg-white/[0.06]"
            >
              <Link2 className="h-3.5 w-3.5 text-white/40" />
              Copy link
            </button>
            <button
              onClick={() => setMenuOpen(false)}
              className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-white/80 transition-colors hover:bg-white/[0.06]"
            >
              <Quote className="h-3.5 w-3.5 text-white/40" />
              Quote post
            </button>
            <button
              onClick={() => {
                if (!uuid) return
                setMenuOpen(false)
                bookmarkMutation.mutate(uuid, {
                  onSuccess: (res) => toast('success', res.bookmarked ? 'Post bookmarked' : 'Bookmark removed'),
                  onError: (err) => toast('error', `Bookmark failed: ${humanizeError(err)}`),
                })
              }}
              className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-white/80 transition-colors hover:bg-white/[0.06]"
            >
              <Bookmark className="h-3.5 w-3.5 text-white/40" />
              Bookmark
            </button>
            {!isOwn && authorUuid && (
              <>
                <div className="my-1 h-px bg-white/[0.06]" />
                {showAliasInput ? (
                  <div className="flex flex-col gap-1.5 p-2">
                    <p className="text-[11px] text-white/35">Choose a nickname</p>
                    <input
                      value={aliasInput}
                      onChange={(e) => setAliasInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && aliasInput.trim()) {
                          toggleFollow(authorUuid, aliasInput.trim())
                          setShowAliasInput(false)
                          setAliasInput('')
                          setMenuOpen(false)
                        }
                        if (e.key === 'Escape') { setShowAliasInput(false); setAliasInput('') }
                      }}
                      maxLength={30}
                      placeholder="e.g. John, trading-guy\u2026"
                      className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-sm text-white/90 placeholder-white/30 outline-none focus:border-[#c8a44d]/40"
                      autoFocus
                    />
                    <div className="flex justify-end">
                      <button
                        onClick={() => {
                          if (!aliasInput.trim()) return
                          toggleFollow(authorUuid, aliasInput.trim())
                          setShowAliasInput(false)
                          setAliasInput('')
                          setMenuOpen(false)
                        }}
                        disabled={!aliasInput.trim()}
                        className="flex items-center gap-1.5 rounded-lg bg-[#c8a44d]/20 px-3 py-1.5 text-xs font-semibold text-[#c8a44d] transition-colors hover:bg-[#c8a44d]/30 disabled:opacity-50"
                      >
                        <UserPlus className="h-3 w-3" strokeWidth={2.5} />
                        Follow
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      if (isFollowing(authorUuid)) {
                        toggleFollow(authorUuid)
                        setMenuOpen(false)
                      } else {
                        setShowAliasInput(true)
                      }
                    }}
                    className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-white/80 transition-colors hover:bg-white/[0.06]"
                  >
                    {isFollowing(authorUuid) ? (
                      <UserCheck className="h-3.5 w-3.5 text-[#c8a44d]" />
                    ) : (
                      <UserPlus className="h-3.5 w-3.5 text-white/40" />
                    )}
                    {isFollowing(authorUuid) ? 'Unfollow' : 'Follow'}
                  </button>
                )}
                <button
                  disabled={dmLoading}
                  onClick={async () => {
                    if (!auth || dmLoading) return
                    setDmLoading(true)
                    try {
                      const { rpc } = await import('@/lib/api')
                      const result = await rpc<{ room: { uuid: string } }>(
                        '/v1/rooms/startDM',
                        { recipientUuid: authorUuid },
                        auth.token,
                        auth.userUuid,
                      )
                      const roomUuid = result.room.uuid
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
                      queryClient.setQueryData<import('@/lib/types').ListRoomsResponse>(
                        ['rooms', 'dms'],
                        (prev) => {
                          const apiRoom = roomData.room
                          if (!prev) return { rooms: [apiRoom] }
                          if (prev.rooms.some((r) => r.uuid === apiRoom.uuid)) return prev
                          return { rooms: [apiRoom, ...prev.rooms] }
                        },
                      )
                      queryClient.setQueryData(['rooms', 'detail', roomUuid], roomData)
                      queryClient.setQueryData(['rooms', 'messages', roomUuid], messagesData)
                      setMenuOpen(false)
                      navigate(`/room/${roomUuid}`)
                      setTimeout(() => {
                        queryClient.invalidateQueries({ queryKey: ['rooms', 'dms'] })
                      }, 2000)
                    } catch {
                      setDmLoading(false)
                    }
                  }}
                  className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-white/80 transition-colors hover:bg-white/[0.06]"
                >
                  {dmLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-white/40" />
                  ) : (
                    <Mail className="h-3.5 w-3.5 text-white/40" />
                  )}
                  {dmLoading ? 'Starting DM…' : 'Message'}
                </button>
                <div className="my-1 h-px bg-white/[0.06]" />
                <button
                  disabled={blockUser.isPending || unblockUser.isPending}
                  onClick={() => {
                    if (blocked) {
                      unblockUser.mutate(authorUuid, {
                        onSuccess: () => { setBlocked(false); setMenuOpen(false); toast('success', 'User unblocked') },
                        onError: (err) => { toast('error', `Failed to unblock: ${humanizeError(err)}`) },
                      })
                    } else {
                      blockUser.mutate(authorUuid, {
                        onSuccess: () => { setBlocked(true); setMenuOpen(false); toast('success', 'User blocked') },
                        onError: (err) => { toast('error', `Failed to block: ${humanizeError(err)}`) },
                      })
                    }
                  }}
                  className={blocked
                    ? 'flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-white/80 transition-colors hover:bg-white/[0.06]'
                    : 'flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-rose-400 transition-colors hover:bg-rose-400/10'
                  }
                >
                  {blockUser.isPending || unblockUser.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Ban className="h-3.5 w-3.5" />
                  )}
                  {blocked ? 'Unblock' : 'Block'}
                </button>
              </>
            )}
            {isOwn && (
            <>
              <div className="my-1 h-px bg-white/[0.06]" />
              <button
                onClick={() => {
                  setMenuOpen(false)
                  setDeleteModalOpen(true)
                }}
                className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-rose-400 transition-colors hover:bg-rose-400/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            </>
            )}
          </div>
        )}
      </div>

      {deleteModalOpen && uuid && (
        <ConfirmDeleteModal
          onConfirm={() => {
            deleteMutation.mutate(
              { post_uuid: uuid },
              { onSuccess: () => { toast('success', 'Post deleted'); navigate('/') } }
            )
          }}
          onClose={() => setDeleteModalOpen(false)}
          isPending={deleteMutation.isPending}
        />
      )}
    </div>
  )
}
