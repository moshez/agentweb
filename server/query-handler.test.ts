import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleQuery, MessageCallback } from './query-handler.js'
import type { QueryRequest, SDKMessage } from './types.js'

// Mock the SDK
vi.mock('@anthropic-ai/claude-agent-sdk', () => ({
  query: vi.fn(),
}))

import { query } from '@anthropic-ai/claude-agent-sdk'
const mockQuery = vi.mocked(query)

// Helper to create an async generator from values
function createMockGenerator<T>(values: T[]): () => AsyncGenerator<T> {
  return async function* () {
    await Promise.resolve() // Ensure this is a proper async generator
    for (const value of values) {
      yield value
    }
  }
}

describe('handleQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sends start message', async () => {
    // Setup mock to return an empty async generator
    mockQuery.mockImplementation(createMockGenerator([]))

    const onMessage = vi.fn<Parameters<MessageCallback>, void>()
    const request: QueryRequest = { prompt: 'Hello' }

    const controller = handleQuery(request, onMessage)
    await controller.promise

    const startMessage = onMessage.mock.calls.find(
      (call) => (call[0] as SDKMessage).type === 'start'
    )
    expect(startMessage).toBeDefined()
  })

  it('sends end message', async () => {
    mockQuery.mockImplementation(createMockGenerator([]))

    const onMessage = vi.fn<Parameters<MessageCallback>, void>()
    const request: QueryRequest = { prompt: 'Hello' }

    const controller = handleQuery(request, onMessage)
    await controller.promise

    const endMessage = onMessage.mock.calls.find(
      (call) => (call[0] as SDKMessage).type === 'end'
    )
    expect(endMessage).toBeDefined()
  })

  it('transforms assistant text messages', async () => {
    mockQuery.mockImplementation(createMockGenerator([{
      type: 'assistant',
      message: {
        content: [
          { type: 'text', text: 'Hello from Claude!' }
        ]
      }
    }]))

    const onMessage = vi.fn<Parameters<MessageCallback>, void>()
    const request: QueryRequest = { prompt: 'Hello' }

    const controller = handleQuery(request, onMessage)
    await controller.promise

    const textMessage = onMessage.mock.calls.find(
      (call) => (call[0] as SDKMessage).type === 'text'
    )
    expect(textMessage).toBeDefined()
    const message = textMessage![0] as { type: string; content: string }
    expect(message.content).toBe('Hello from Claude!')
  })

  it('transforms tool_use messages', async () => {
    mockQuery.mockImplementation(createMockGenerator([{
      type: 'assistant',
      message: {
        content: [
          { type: 'tool_use', id: 'tool_123', name: 'Read', input: { file_path: '/test.txt' } }
        ]
      }
    }]))

    const onMessage = vi.fn<Parameters<MessageCallback>, void>()
    const request: QueryRequest = { prompt: 'Read a file' }

    const controller = handleQuery(request, onMessage)
    await controller.promise

    const toolUseMessage = onMessage.mock.calls.find(
      (call) => (call[0] as SDKMessage).type === 'tool_use'
    )
    expect(toolUseMessage).toBeDefined()
    const message = toolUseMessage![0] as { type: string; id: string; name: string; input: Record<string, unknown> }
    expect(message.name).toBe('Read')
    expect(message.input.file_path).toBe('/test.txt')
  })

  it('transforms tool_result messages', async () => {
    mockQuery.mockImplementation(createMockGenerator([{
      type: 'user',
      message: {
        content: [
          { type: 'tool_result', tool_use_id: 'tool_123', content: 'File contents here' }
        ]
      }
    }]))

    const onMessage = vi.fn<Parameters<MessageCallback>, void>()
    const request: QueryRequest = { prompt: 'Read a file' }

    const controller = handleQuery(request, onMessage)
    await controller.promise

    const toolResultMessage = onMessage.mock.calls.find(
      (call) => (call[0] as SDKMessage).type === 'tool_result'
    )
    expect(toolResultMessage).toBeDefined()
    const message = toolResultMessage![0] as { type: string; tool_use_id: string; content: string }
    expect(message.tool_use_id).toBe('tool_123')
    expect(message.content).toBe('File contents here')
  })

  it('transforms thinking messages', async () => {
    mockQuery.mockImplementation(createMockGenerator([{
      type: 'assistant',
      message: {
        content: [
          { type: 'thinking', thinking: 'Let me analyze this...' }
        ]
      }
    }]))

    const onMessage = vi.fn<Parameters<MessageCallback>, void>()
    const request: QueryRequest = { prompt: 'Hello' }

    const controller = handleQuery(request, onMessage)
    await controller.promise

    const thinkingMessage = onMessage.mock.calls.find(
      (call) => (call[0] as SDKMessage).type === 'thinking'
    )
    expect(thinkingMessage).toBeDefined()
    const message = thinkingMessage![0] as { type: string; content: string }
    expect(message.content).toBe('Let me analyze this...')
  })

  it('handles SDK errors', async () => {
    // eslint-disable-next-line require-yield -- yield is unreachable due to throw
    mockQuery.mockImplementation(async function* () {
      await Promise.resolve() // Ensure this is a proper async generator
      throw new Error('API connection failed')
    })

    const onMessage = vi.fn<Parameters<MessageCallback>, void>()
    const request: QueryRequest = { prompt: 'Hello' }

    const controller = handleQuery(request, onMessage)
    // The promise will reject but we catch it
    try {
      await controller.promise
    } catch {
      // Expected to reject
    }

    const errorMessage = onMessage.mock.calls.find(
      (call) => (call[0] as SDKMessage).type === 'error'
    )
    expect(errorMessage).toBeDefined()
    const message = errorMessage![0] as { type: string; error: string }
    expect(message.error).toBe('API connection failed')
  })

  it('passes options to SDK', async () => {
    mockQuery.mockImplementation(createMockGenerator([]))

    const onMessage = vi.fn<Parameters<MessageCallback>, void>()
    const request: QueryRequest = {
      prompt: 'Hello',
      options: { model: 'claude-3-opus', systemPrompt: 'Be helpful' },
    }

    const controller = handleQuery(request, onMessage)
    await controller.promise

    expect(mockQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: 'Hello',
        options: expect.objectContaining({
          model: 'claude-3-opus',
          systemPrompt: 'Be helpful',
        }) as Record<string, unknown>,
      })
    )
  })

  it('does not duplicate text from result messages', async () => {
    // Result messages with subtype 'success' should NOT emit text
    // (the text is already in the preceding assistant message)
    mockQuery.mockImplementation(createMockGenerator([{
      type: 'result',
      subtype: 'success',
      result: 'Task completed successfully'
    }]))

    const onMessage = vi.fn<Parameters<MessageCallback>, void>()
    const request: QueryRequest = { prompt: 'Do something' }

    const controller = handleQuery(request, onMessage)
    await controller.promise

    const textMessage = onMessage.mock.calls.find(
      (call) => {
        const msg = call[0] as SDKMessage
        return msg.type === 'text'
      }
    )
    // Should NOT find a text message from result
    expect(textMessage).toBeUndefined()
  })
})
