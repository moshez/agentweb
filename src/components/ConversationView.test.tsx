import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ConversationView } from './ConversationView'
import type { SDKMessage } from '../lib/types'

describe('ConversationView', () => {
  it('renders empty state when no messages', () => {
    render(<ConversationView messages={[]} isProcessing={false} />)
    expect(screen.getByText('Welcome to agentweb')).toBeInTheDocument()
    expect(
      screen.getByText('Send a message to start a conversation with the Claude Agent.')
    ).toBeInTheDocument()
  })

  it('renders messages', () => {
    const messages: SDKMessage[] = [
      { type: 'start', session_id: 'test' },
      { type: 'text', content: 'Hello world' },
      { type: 'end', stop_reason: 'end_turn' },
    ]
    render(<ConversationView messages={messages} isProcessing={false} />)

    expect(screen.getByText('Session started')).toBeInTheDocument()
    expect(screen.getByText('Hello world')).toBeInTheDocument()
    expect(screen.getByText('Response complete')).toBeInTheDocument()
  })

  it('shows processing indicator when isProcessing is true', () => {
    const messages: SDKMessage[] = [{ type: 'text', content: 'Hello' }]
    const { container } = render(
      <ConversationView messages={messages} isProcessing={true} />
    )
    expect(container.querySelector('.processing-indicator')).toBeInTheDocument()
  })

  it('hides processing indicator when isProcessing is false', () => {
    const messages: SDKMessage[] = [{ type: 'text', content: 'Hello' }]
    const { container } = render(
      <ConversationView messages={messages} isProcessing={false} />
    )
    expect(container.querySelector('.processing-indicator')).not.toBeInTheDocument()
  })
})
