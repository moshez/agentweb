import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'
import type { Session, SessionSummary } from './types.js'

const SESSIONS_DIR = path.join(os.homedir(), '.agentweb', 'sessions')

/**
 * Ensures the sessions directory exists
 */
async function ensureSessionsDir(): Promise<void> {
  await fs.mkdir(SESSIONS_DIR, { recursive: true })
}

/**
 * Get the file path for a session
 */
function getSessionPath(id: string): string {
  // Sanitize the ID to prevent path traversal
  const sanitizedId = id.replace(/[^a-zA-Z0-9_-]/g, '_')
  return path.join(SESSIONS_DIR, `${sanitizedId}.json`)
}

/**
 * List all sessions
 */
export async function listSessions(): Promise<SessionSummary[]> {
  await ensureSessionsDir()

  try {
    const files = await fs.readdir(SESSIONS_DIR)
    const sessionFiles = files.filter(f => f.endsWith('.json'))

    const sessions: SessionSummary[] = []

    for (const file of sessionFiles) {
      try {
        const content = await fs.readFile(path.join(SESSIONS_DIR, file), 'utf-8')
        const session = JSON.parse(content) as Session
        sessions.push({
          id: session.id,
          name: session.name,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
        })
      } catch {
        // Skip invalid session files
        console.error(`Failed to read session file: ${file}`)
      }
    }

    // Sort by updated date, newest first
    sessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

    return sessions
  } catch (error) {
    console.error('Failed to list sessions:', error)
    return []
  }
}

/**
 * Get a specific session by ID
 */
export async function getSession(id: string): Promise<Session | null> {
  await ensureSessionsDir()

  try {
    const content = await fs.readFile(getSessionPath(id), 'utf-8')
    return JSON.parse(content) as Session
  } catch {
    return null
  }
}

/**
 * Save a session
 */
export async function saveSession(session: Session): Promise<void> {
  await ensureSessionsDir()

  const filePath = getSessionPath(session.id)
  await fs.writeFile(filePath, JSON.stringify(session, null, 2), 'utf-8')
}

/**
 * Delete a session
 */
export async function deleteSession(id: string): Promise<boolean> {
  try {
    await fs.unlink(getSessionPath(id))
    return true
  } catch {
    return false
  }
}
