import { CommentItem } from './CommentItem'
import type { Comment } from './types'

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
                <path
                  d="M1,0 L1,20 Q1,28 9,28"
                  fill="none"
                  stroke="#c8a44d"
                  strokeWidth="2"
                  strokeLinejoin="round"
                  strokeOpacity="0.35"
                />
                {!isLast && (
                  <line x1="1" y1="20" x2="1" y2="100%" stroke="#c8a44d" strokeWidth="2" strokeOpacity="0.35" />
                )}
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
