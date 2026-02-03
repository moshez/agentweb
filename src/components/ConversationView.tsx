import { useEffect, useRef, useMemo } from 'react'
import type { SDKMessage } from '../lib/types'
import { MessageRenderer } from './MessageRenderer'
import { StepGroup } from './StepGroup'
import './ConversationView.css'

interface MessageGroup {
  type: 'steps' | 'message'
  items: SDKMessage[]
}

function isToolMessage(message: SDKMessage): boolean {
  return message.type === 'tool_use' || message.type === 'tool_result'
}

function groupMessages(messages: SDKMessage[]): MessageGroup[] {
  const groups: MessageGroup[] = []
  let currentSteps: SDKMessage[] = []

  for (const message of messages) {
    if (isToolMessage(message)) {
      currentSteps.push(message)
    } else {
      // Flush any accumulated steps
      if (currentSteps.length > 0) {
        groups.push({ type: 'steps', items: currentSteps })
        currentSteps = []
      }
      groups.push({ type: 'message', items: [message] })
    }
  }

  // Flush remaining steps
  if (currentSteps.length > 0) {
    groups.push({ type: 'steps', items: currentSteps })
  }

  return groups
}

interface ConversationViewProps {
  messages: SDKMessage[]
  isProcessing: boolean
}

export function ConversationView({ messages, isProcessing }: ConversationViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const shouldAutoScroll = useRef(true)

  // Group consecutive tool messages together
  const messageGroups = useMemo(() => groupMessages(messages), [messages])

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
      {messageGroups.map((group, index) => (
        group.type === 'steps' ? (
          <StepGroup key={index} steps={group.items} />
        ) : (
          <MessageRenderer key={index} message={group.items[0]} />
        )
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
