import type { SessionSummary } from '../lib/types'
import './Sidebar.css'

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
  sessions: SessionSummary[]
  currentSessionId: string | null
  onNewSession: () => void
  onSelectSession: (id: string) => void
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } else if (diffDays === 1) {
    return 'Yesterday'
  } else if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'short' })
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }
}

export function Sidebar({
  isOpen,
  onToggle,
  sessions,
  currentSessionId,
  onNewSession,
  onSelectSession,
}: SidebarProps) {
  return (
    <>
      <button
        className={`sidebar-toggle ${isOpen ? 'open' : ''}`}
        onClick={onToggle}
        aria-label={isOpen ? 'Close sidebar' : 'Open sidebar'}
      >
        {isOpen ? '<' : '>'}
      </button>
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>Sessions</h2>
          <button className="new-session-button" onClick={onNewSession}>
            + New
          </button>
        </div>
        <div className="sessions-list">
          {sessions.length === 0 ? (
            <div className="no-sessions">No previous sessions</div>
          ) : (
            sessions.map((session) => (
              <button
                key={session.id}
                className={`session-item ${session.id === currentSessionId ? 'active' : ''}`}
                onClick={() => onSelectSession(session.id)}
              >
                <div className="session-name">{session.name}</div>
                <div className="session-date">{formatDate(session.updatedAt)}</div>
              </button>
            ))
          )}
        </div>
      </aside>
    </>
  )
}
