import { useState, useEffect, useCallback, useRef } from 'react'
import type { SDKMessage, QueryOptions, ConnectionStatus } from '../lib/types'

interface UseWebSocketReturn {
  messages: SDKMessage[]
  status: ConnectionStatus
  send: (prompt: string, options?: QueryOptions) => void
  clearMessages: () => void
  isProcessing: boolean
}

export function useWebSocket(url: string): UseWebSocketReturn {
  const [messages, setMessages] = useState<SDKMessage[]>([])
  const [status, setStatus] = useState<ConnectionStatus>('connecting')
  const [isProcessing, setIsProcessing] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<number | null>(null)

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

  useEffect(() => {
    connect()

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [connect])

  const send = useCallback((prompt: string, options?: QueryOptions) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const request = { prompt, options }
      wsRef.current.send(JSON.stringify(request))
    } else {
      console.error('WebSocket is not connected')
    }
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])

  return {
    messages,
    status,
    send,
    clearMessages,
    isProcessing,
  }
}
