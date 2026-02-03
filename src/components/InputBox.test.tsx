import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { InputBox } from './InputBox'

describe('InputBox', () => {
  it('renders with placeholder', () => {
    render(<InputBox onSubmit={() => {}} canSend={true} isProcessing={false} placeholder="Test placeholder" />)
    expect(screen.getByPlaceholderText('Test placeholder')).toBeInTheDocument()
  })

  it('calls onSubmit when button is clicked', () => {
    const onSubmit = vi.fn()
    render(<InputBox onSubmit={onSubmit} canSend={true} isProcessing={false} />)

    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'Test message' } })

    const button = screen.getByRole('button', { name: 'Send' })
    fireEvent.click(button)

    expect(onSubmit).toHaveBeenCalledWith('Test message')
  })

  it('calls onSubmit when Enter is pressed', () => {
    const onSubmit = vi.fn()
    render(<InputBox onSubmit={onSubmit} canSend={true} isProcessing={false} />)

    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'Test message' } })
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })

    expect(onSubmit).toHaveBeenCalledWith('Test message')
  })

  it('does not submit on Shift+Enter', () => {
    const onSubmit = vi.fn()
    render(<InputBox onSubmit={onSubmit} canSend={true} isProcessing={false} />)

    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'Test message' } })
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true })

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('clears input after submission', () => {
    const onSubmit = vi.fn()
    render(<InputBox onSubmit={onSubmit} canSend={true} isProcessing={false} />)

    const textarea = screen.getByRole<HTMLTextAreaElement>('textbox')
    fireEvent.change(textarea, { target: { value: 'Test message' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))

    expect(textarea.value).toBe('')
  })

  it('disables send button when canSend is false', () => {
    render(<InputBox onSubmit={() => {}} canSend={false} isProcessing={false} />)

    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'Test message' } })
    const button = screen.getByRole('button', { name: 'Send' })

    expect(button).toBeDisabled()
  })

  it('shows stop button when isProcessing is true', () => {
    const onStop = vi.fn()
    render(<InputBox onSubmit={() => {}} onStop={onStop} canSend={true} isProcessing={true} />)

    const button = screen.getByRole('button', { name: 'Stop' })
    expect(button).toBeInTheDocument()

    fireEvent.click(button)
    expect(onStop).toHaveBeenCalled()
  })

  it('does not submit empty messages', () => {
    const onSubmit = vi.fn()
    render(<InputBox onSubmit={onSubmit} canSend={true} isProcessing={false} />)

    fireEvent.click(screen.getByRole('button', { name: 'Send' }))

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('does not submit whitespace-only messages', () => {
    const onSubmit = vi.fn()
    render(<InputBox onSubmit={onSubmit} canSend={true} isProcessing={false} />)

    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))

    expect(onSubmit).not.toHaveBeenCalled()
  })
})
