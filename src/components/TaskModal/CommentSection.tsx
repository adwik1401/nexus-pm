import { useState } from 'react'
import { Send } from 'lucide-react'
import { Avatar } from '../Sidebar/Sidebar'
import { addComment, logActivity } from '../../services/tasks'
import { useAuth } from '../../context/AuthContext'
import type { ActivityLog, Comment } from '../../types'

interface CommentSectionProps {
  taskId: string
  comments: Comment[]
  onCommentAdded: (comment: Comment) => void
  onLogged: (log: ActivityLog) => void
}

export default function CommentSection({ taskId, comments, onCommentAdded, onLogged }: CommentSectionProps) {
  const { profile } = useAuth()
  const [text, setText] = useState('')
  const [posting, setPosting] = useState(false)

  const handlePost = async () => {
    if (!text.trim() || !profile) return
    setPosting(true)
    try {
      const c = await addComment(taskId, profile.id, text.trim())
      onCommentAdded({ ...c, user: profile })
      setText('')
      // Log the activity optimistically
      const log: ActivityLog = {
        id: crypto.randomUUID(),
        task_id: taskId,
        user_id: profile.id,
        action: 'comment_added',
        meta: {},
        created_at: new Date().toISOString(),
        user: profile,
      }
      onLogged(log)
      logActivity(taskId, 'comment_added', {})
    } catch { /* ignore */ }
    finally { setPosting(false) }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handlePost()
  }

  return (
    <div>
      <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">
        Comments ({comments.length})
      </h3>

      {/* Comment list */}
      {comments.length > 0 && (
        <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
          {comments.map(c => (
            <div key={c.id} className="flex gap-2.5">
              {c.user && <Avatar user={c.user} size="sm" />}
              <div className="flex-1 min-w-0 bg-gray-50 rounded-xl px-3 py-2.5">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-gray-700">{c.user?.name ?? 'Unknown'}</span>
                  <span className="text-[10px] text-gray-400">
                    {new Date(c.created_at).toLocaleString('en-US', {
                      month: 'short', day: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{c.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Post form */}
      {profile && (
        <div className="flex gap-2.5">
          <Avatar user={profile} size="sm" />
          <div className="flex-1 flex gap-2 items-end">
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Write a comment… (⌘+Enter to post)"
              rows={2}
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 placeholder-gray-400 outline-none resize-none focus:border-indigo-300 transition-colors"
            />
            <button
              onClick={handlePost}
              disabled={!text.trim() || posting}
              className="w-8 h-8 flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 rounded-lg text-white transition-colors flex-shrink-0"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
