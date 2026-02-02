import { useEffect, useRef } from 'react'
import type { SDKMessage } from '../lib/types'
import { MessageRenderer } from './MessageRenderer'
import './ConversationView.css'

interface ConversationViewProps {
  messages: SDKMessage[]
  isProcessing: boolean
}

export function ConversationView({ messages, isProcessing }: ConversationViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const shouldAutoScroll = useRef(true)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (containerRef.current && shouldAutoScroll.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [messages])

  // Detect if user has scrolled up
  const handleScroll = () => {
    if (containerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50
      shouldAutoScroll.current = isAtBottom
    }
  }

  if (messages.length === 0) {
    return (
      <div className="conversation-empty">
        <div className="empty-message">
          <h2>Welcome to agentweb</h2>
          <p>Send a message to start a conversation with the Claude Agent.</p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="conversation-view"
      onScroll={handleScroll}
    >
      {messages.map((message, index) => (
        <MessageRenderer key={index} message={message} />
      ))}
      {isProcessing && (
        <div className="processing-indicator">
          <span className="dot"></span>
          <span className="dot"></span>
          <span className="dot"></span>
        </div>
      )}
    </div>
  )
}
