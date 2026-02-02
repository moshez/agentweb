import { describe, it, expect, vi } from 'vitest'
import { handleQuery, MessageCallback } from './query-handler.js'
import type { QueryRequest, SDKMessage } from './types.js'

describe('handleQuery', () => {
  it('sends start message', async () => {
    const onMessage = vi.fn<Parameters<MessageCallback>, void>()
    const request: QueryRequest = { prompt: 'Hello' }

    await handleQuery(request, onMessage)

    const startMessage = onMessage.mock.calls.find(
      (call) => (call[0] as SDKMessage).type === 'start'
    )
    expect(startMessage).toBeDefined()
  })

  it('sends end message', async () => {
    const onMessage = vi.fn<Parameters<MessageCallback>, void>()
    const request: QueryRequest = { prompt: 'Hello' }

    await handleQuery(request, onMessage)

    const endMessage = onMessage.mock.calls.find(
      (call) => (call[0] as SDKMessage).type === 'end'
    )
    expect(endMessage).toBeDefined()
  })

  it('sends thinking message', async () => {
    const onMessage = vi.fn<Parameters<MessageCallback>, void>()
    const request: QueryRequest = { prompt: 'Hello' }

    await handleQuery(request, onMessage)

    const thinkingMessage = onMessage.mock.calls.find(
      (call) => (call[0] as SDKMessage).type === 'thinking'
    )
    expect(thinkingMessage).toBeDefined()
  })

  it('sends text response', async () => {
    const onMessage = vi.fn<Parameters<MessageCallback>, void>()
    const request: QueryRequest = { prompt: 'Hello' }

    await handleQuery(request, onMessage)

    const textMessage = onMessage.mock.calls.find(
      (call) => (call[0] as SDKMessage).type === 'text'
    )
    expect(textMessage).toBeDefined()
  })

  it('includes prompt in response', async () => {
    const onMessage = vi.fn<Parameters<MessageCallback>, void>()
    const request: QueryRequest = { prompt: 'Test prompt' }

    await handleQuery(request, onMessage)

    const textMessage = onMessage.mock.calls.find(
      (call) => (call[0] as SDKMessage).type === 'text'
    )
    expect(textMessage).toBeDefined()
    const message = textMessage![0] as { type: string; content: string }
    expect(message.content).toContain('Test prompt')
  })

  it('handles options parameter', async () => {
    const onMessage = vi.fn<Parameters<MessageCallback>, void>()
    const request: QueryRequest = {
      prompt: 'Hello',
      options: { model: 'claude-3-opus' },
    }

    await handleQuery(request, onMessage)

    // Should complete without error
    expect(onMessage).toHaveBeenCalled()
  })
})
