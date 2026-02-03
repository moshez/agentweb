import { useState, useEffect, useCallback, useRef } from 'react'
import type { SDKMessage, QueryOptions, ConnectionStatus, Session, SessionSummary } from '../lib/types'

interface UseWebSocketReturn {
  messages: SDKMessage[]
  status: ConnectionStatus
  send: (prompt: string, options?: QueryOptions) => void
  stop: () => void
  clearMessages: () => void
  isProcessing: boolean
  sessionId: string | null
  sdkSessionId: string | null
  sessions: SessionSummary[]
  createNewSession: () => void
  loadSession: (id: string) => void
  refreshSessions: () => void
}

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

function generateSessionName(messages: SDKMessage[]): string {
  // Find the first user message to use as session name
  const firstUserMessage = messages.find(m => m.type === 'user')
  if (firstUserMessage && firstUserMessage.type === 'user') {
    const content = firstUserMessage.content
    // Truncate to 50 chars
    return content.length > 50 ? content.substring(0, 47) + '...' : content
  }
  return 'New Session'
}

export function useWebSocket(url: string): UseWebSocketReturn {
  const [messages, setMessages] = useState<SDKMessage[]>([])
  const [status, setStatus] = useState<ConnectionStatus>('connecting')
  const [isProcessing, setIsProcessing] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sdkSessionId, setSdkSessionId] = useState<string | null>(null)
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<number | null>(null)

  // Determine the HTTP base URL for REST API calls
  const getHttpBaseUrl = useCallback(() => {
    if (import.meta.env.DEV) {
      return `http://${window.location.hostname}:8888`
    }
    return window.location.origin
  }, [])

  // Fetch sessions list
  const refreshSessions = useCallback(async () => {
    try {
      const response = await fetch(`${getHttpBaseUrl()}/api/sessions`)
      if (response.ok) {
        const data = await response.json() as SessionSummary[]
        setSessions(data)
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error)
    }
  }, [getHttpBaseUrl])

  // Save current session
  const saveSession = useCallback(async (msgs: SDKMessage[], id: string, sdkId: string | null) => {
    if (msgs.length === 0) return

    const session: Session = {
      id,
      name: generateSessionName(msgs),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: msgs,
      sdkSessionId: sdkId ?? undefined,
    }

    try {
      await fetch(`${getHttpBaseUrl()}/api/sessions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(session),
      })
      void refreshSessions()
    } catch (error) {
      console.error('Failed to save session:', error)
    }
  }, [getHttpBaseUrl, refreshSessions])

  // Create a new session
  const createNewSession = useCallback(() => {
    const newId = generateSessionId()
    setSessionId(newId)
    setSdkSessionId(null)
    setMessages([])
    setIsProcessing(false)

    // Tell server to create a new SDK session
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'create_session' }))
    }
  }, [])

  // Load an existing session
  const loadSession = useCallback(async (id: string) => {
    try {
      const response = await fetch(`${getHttpBaseUrl()}/api/sessions/${id}`)
      if (response.ok) {
        const session = await response.json() as Session
        setSessionId(session.id)
        setMessages(session.messages)
        setIsProcessing(false)

        // If session has an SDK session ID, resume it
        if (session.sdkSessionId && wsRef.current?.readyState === WebSocket.OPEN) {
          setSdkSessionId(session.sdkSessionId)
          wsRef.current.send(JSON.stringify({
            type: 'resume_session',
            sdkSessionId: session.sdkSessionId,
          }))
        } else {
          setSdkSessionId(null)
        }
      }
    } catch (error) {
      console.error('Failed to load session:', error)
    }
  }, [getHttpBaseUrl])

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    setStatus('connecting')

    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      setStatus('connected')
      console.log('WebSocket connected')
    }

    ws.onmessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data as string) as SDKMessage

        // Handle special message types
        if (message.type === 'session_created' || message.type === 'session_resumed') {
          // Session management messages - don't add to message list
          setSdkSessionId(message.sdkSessionId)
          return
        }

        // Track SDK session ID from start messages
        if (message.type === 'start' && message.session_id) {
          setSdkSessionId(message.session_id)
        }

        // Add message to the list
        setMessages((prev) => [...prev, message])

        // Track processing state
        if (message.type === 'start') {
          setIsProcessing(true)
        } else if (message.type === 'end' || message.type === 'error') {
          setIsProcessing(false)
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error)
      }
    }

    ws.onclose = () => {
      setStatus('disconnected')
      setIsProcessing(false)
      console.log('WebSocket disconnected')

      // Attempt to reconnect after 3 seconds
      reconnectTimeoutRef.current = window.setTimeout(() => {
        connect()
      }, 3000)
    }

    ws.onerror = (error) => {
      setStatus('error')
      console.error('WebSocket error:', error)
    }
  }, [url])

  // Initialize: connect, create session, and fetch sessions list
  useEffect(() => {
    connect()
    const newId = generateSessionId()
    setSessionId(newId)
    void refreshSessions()

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [connect, refreshSessions])

  // Auto-save session when messages change
  useEffect(() => {
    if (sessionId && messages.length > 0) {
      // Debounce save
      const timer = setTimeout(() => {
        void saveSession(messages, sessionId, sdkSessionId)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [messages, sessionId, sdkSessionId, saveSession])

  const send = useCallback((prompt: string, options?: QueryOptions) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      // Add user message to the list first
      const userMessage: SDKMessage = {
        type: 'user',
        content: prompt,
      }
      setMessages((prev) => [...prev, userMessage])

      // Send message using session-based protocol
      const request = {
        type: 'send_message',
        prompt,
        options,
      }
      wsRef.current.send(JSON.stringify(request))
    } else {
      console.error('WebSocket is not connected')
    }
  }, [])

  const stop = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'stop' }))
      setIsProcessing(false)
    }
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
    setSdkSessionId(null)
    // Create a new SDK session when clearing
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'create_session' }))
    }
  }, [])

  return {
    messages,
    status,
    send,
    stop,
    clearMessages,
    isProcessing,
    sessionId,
    sdkSessionId,
    sessions,
    createNewSession,
    loadSession: (id: string) => void loadSession(id),
    refreshSessions: () => void refreshSessions(),
  }
}
