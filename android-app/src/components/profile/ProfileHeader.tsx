import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { NetworthPill } from '@/components/networth-pill/NetworthPill'
import { useUserProfile } from '@/hooks/useUserProfile'
import { ProfileSettingsMenu, ProfileEditMenu, ProfileActionsMenu } from './ProfileMenus'
import { useFollow } from './FollowContext'

export function ProfileHeader() {
  const navigate = useNavigate()
  const { uuid } = useParams<{ uuid: string }>()
  const { auth } = useAuth()
  const targetUuid = uuid ?? auth?.userUuid
  const isOwnProfile = !uuid || uuid === auth?.userUuid
  const { isFollowing, toggleFollow } = useFollow()
  const { data } = useUserProfile(targetUuid)
  const user = data?.pages[0]?.user

  return (
    <div className="flex h-10 items-center justify-between gap-2">
      <div className="flex shrink-0 items-center" style={{ minWidth: isOwnProfile ? 88 : undefined }}>
        <button
          onClick={() => navigate(-1)}
          title="Back"
          className="group flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.06] text-white/70 transition-colors hover:bg-gradient-to-b hover:from-white/[0.09] hover:to-white/[0.04] hover:text-white hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
        >
          <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" strokeWidth={2.2} />
        </button>
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-center px-3">
        {user && (
          <NetworthPill
            networth={user.balance}
            subscriptionType={user.subscription_type}
            role={user.role}
            size="default"
          />
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {isOwnProfile ? (
          <>
            <ProfileEditMenu user={user} />
            <ProfileSettingsMenu />
          </>
        ) : (
          <ProfileActionsMenu
            userUuid={targetUuid ?? ''}
            isFollowing={isFollowing(targetUuid ?? '')}
            onToggleFollow={(alias) => toggleFollow(targetUuid ?? '', alias)}
          />
        )}
      </div>
    </div>
  )
}
