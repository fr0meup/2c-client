import { CommentItem } from './CommentItem'
import type { AuthorMeta } from '@/components/post-card/types'

export interface Comment {
  uuid: string
  created_at: string
  post_uuid: string
  reply_parent_uuid: string | null
  author_uuid: string
  author_meta: AuthorMeta
  comment_meta?: {
    giphy_id?: string
    giphy_url?: string
    image_url?: string
  } | null
  text: string
  upvote_count: number
  deleted_at: string | null
}

interface CommentThreadProps {
  comments: Comment[]
  parentUuid: string | null
  depth: number
  isAbsoluteLast?: boolean
  commentVoteMap?: Map<string, 1 | -1 | 0>
}

export function CommentThread({
  comments,
  parentUuid,
  depth,
  isAbsoluteLast = false,
  commentVoteMap,
}: CommentThreadProps) {
  const topLevel = parentUuid === null
  const children = comments.filter((c) =>
    topLevel
      ? !c.reply_parent_uuid || !comments.some((other) => other.uuid === c.reply_parent_uuid)
      : c.reply_parent_uuid === parentUuid,
  )

  children.sort((a, b) => b.upvote_count - a.upvote_count || new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  if (children.length === 0) return null

  return (
    <div style={{ marginLeft: depth === 1 ? '0rem' : depth > 1 ? '1rem' : undefined }}>
      {children.map((comment, idx) => {
        const replies = comments.filter((c) => c.reply_parent_uuid === comment.uuid)
        const isLast = idx === children.length - 1
        return (
          <div key={comment.uuid} className="relative">
            {/* Thread connector lines */}
            {depth > 0 && (
              <svg
                className="absolute"
                style={{ left: '-2px', top: 0, width: '12px', height: '100%', overflow: 'visible' }}
                preserveAspectRatio="none"
              >
                <g opacity="0.35" stroke="#c8a44d" strokeWidth="2" fill="none" strokeLinejoin="round" strokeLinecap="round">
                  {!isLast ? (
                    <>
                      {/* Continuous vertical line for full item height */}
                      <line x1="1" y1="0" x2="1" y2="100%" />
                      {/* Smooth branch curve to comment */}
                      <path d="M 1,20 Q 1,28 9,28" />
                    </>
                  ) : (
                    <>
                      {/* Vertical line down to curve start */}
                      <line x1="1" y1="0" x2="1" y2="20" />
                      {/* Smooth branch curve to comment */}
                      <path d="M 1,20 Q 1,28 9,28" />
                    </>
                  )}
                </g>
              </svg>
            )}

            <CommentItem
              comment={comment}
              depth={depth}
              isLast={isLast}
              isAbsoluteLast={isAbsoluteLast}
              hasReplies={replies.length > 0}
              initialVote={commentVoteMap?.get(comment.uuid) ?? 0}
            />

            {replies.length > 0 && (
              <CommentThread
                comments={comments}
                parentUuid={comment.uuid}
                depth={depth + 1}
                isAbsoluteLast={isAbsoluteLast && isLast}
                commentVoteMap={commentVoteMap}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
