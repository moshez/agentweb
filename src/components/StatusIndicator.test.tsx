import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { StatusIndicator } from './StatusIndicator'

describe('StatusIndicator', () => {
  it('renders connecting status', () => {
    render(<StatusIndicator status="connecting" />)
    expect(screen.getByText('Connecting...')).toBeInTheDocument()
  })

  it('renders connected status', () => {
    render(<StatusIndicator status="connected" />)
    expect(screen.getByText('Connected')).toBeInTheDocument()
  })

  it('renders disconnected status', () => {
    render(<StatusIndicator status="disconnected" />)
    expect(screen.getByText('Disconnected')).toBeInTheDocument()
  })

  it('renders error status', () => {
    render(<StatusIndicator status="error" />)
    expect(screen.getByText('Connection Error')).toBeInTheDocument()
  })

  it('applies correct CSS class for connected', () => {
    const { container } = render(<StatusIndicator status="connected" />)
    expect(container.querySelector('.status-connected')).toBeInTheDocument()
  })

  it('applies correct CSS class for error', () => {
    const { container } = render(<StatusIndicator status="error" />)
    expect(container.querySelector('.status-error')).toBeInTheDocument()
  })
})
