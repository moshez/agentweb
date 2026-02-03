import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MessageRenderer } from './MessageRenderer'
import type { SDKMessage } from '../lib/types'

describe('MessageRenderer', () => {
  it('renders text message with markdown', () => {
    const message: SDKMessage = {
      type: 'text',
      content: 'Hello **world**',
    }
    render(<MessageRenderer message={message} />)
    expect(screen.getByText('world')).toBeInTheDocument()
  })

  it('renders tool use message', () => {
    const message: SDKMessage = {
      type: 'tool_use',
      id: 'tool-1',
      name: 'read_file',
      input: { path: '/test.txt' },
    }
    render(<MessageRenderer message={message} />)
    expect(screen.getByText('read_file')).toBeInTheDocument()
    expect(screen.getByText(/\/test\.txt/)).toBeInTheDocument()
  })

  it('renders tool result message', () => {
    const message: SDKMessage = {
      type: 'tool_result',
      tool_use_id: 'tool-1',
      content: 'File contents here',
    }
    render(<MessageRenderer message={message} />)
    expect(screen.getByText('Tool Result')).toBeInTheDocument()
    expect(screen.getByText('File contents here')).toBeInTheDocument()
  })

  it('renders error tool result with error styling', () => {
    const message: SDKMessage = {
      type: 'tool_result',
      tool_use_id: 'tool-1',
      content: 'Error occurred',
      is_error: true,
    }
    const { container } = render(<MessageRenderer message={message} />)
    expect(container.querySelector('.error')).toBeInTheDocument()
  })

  it('renders thinking message', () => {
    const message: SDKMessage = {
      type: 'thinking',
      content: 'Processing request...',
    }
    render(<MessageRenderer message={message} />)
    expect(screen.getByText('Thinking...')).toBeInTheDocument()
    expect(screen.getByText('Processing request...')).toBeInTheDocument()
  })

  it('renders error message', () => {
    const message: SDKMessage = {
      type: 'error',
      error: 'Something went wrong',
    }
    render(<MessageRenderer message={message} />)
    expect(screen.getByText('Error')).toBeInTheDocument()
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('renders start message as null (not displayed)', () => {
    const message: SDKMessage = {
      type: 'start',
      session_id: 'test-session',
    }
    const { container } = render(<MessageRenderer message={message} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders end message as null (not displayed)', () => {
    const message: SDKMessage = {
      type: 'end',
      stop_reason: 'end_turn',
    }
    const { container } = render(<MessageRenderer message={message} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders user message', () => {
    const message: SDKMessage = {
      type: 'user',
      content: 'Hello, Claude!',
    }
    render(<MessageRenderer message={message} />)
    expect(screen.getByText('You')).toBeInTheDocument()
    expect(screen.getByText('Hello, Claude!')).toBeInTheDocument()
  })

  it('renders unknown message type as JSON', () => {
    const message = {
      type: 'unknown_type',
      data: 'test',
    } as unknown as SDKMessage
    render(<MessageRenderer message={message} />)
    expect(screen.getByText(/unknown_type/)).toBeInTheDocument()
  })
})
