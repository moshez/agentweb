import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSession, resumeSession, type MessageCallback } from './query-handler.js'
import type { SDKMessage } from './types.js'

// Mock the SDK session
const mockSession = {
  sessionId: 'mock-session-123',
  send: vi.fn(),
  close: vi.fn(),
  stream: vi.fn(),
}

// Mock the SDK
vi.mock('@anthropic-ai/claude-agent-sdk', () => ({
  unstable_v2_createSession: vi.fn(() => mockSession),
  unstable_v2_resumeSession: vi.fn(() => mockSession),
}))

// Mock CLI extractor
vi.mock('./cli-extractor.js', () => ({
  getClaudeCodeCliPath: vi.fn(() => '/mock/cli/path'),
  getJsRuntime: vi.fn(() => 'node'),
  getRuntimeEnv: vi.fn(() => ({ PATH: '/mock/path' })),
}))

import { unstable_v2_createSession, unstable_v2_resumeSession } from '@anthropic-ai/claude-agent-sdk'
const mockCreateSession = vi.mocked(unstable_v2_createSession)
const mockResumeSession = vi.mocked(unstable_v2_resumeSession)

// Helper to create an async generator from values
function createMockStream<T>(values: T[]): AsyncGenerator<T> {
  // eslint-disable-next-line @typescript-eslint/require-await
  async function* generator() {
    for (const value of values) {
      yield value
    }
  }
  return generator()
}

describe('createSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset stream mock to return empty by default
    mockSession.stream.mockReturnValue(createMockStream([]))
  })

  it('creates a session with correct options', () => {
    const onMessage = vi.fn<Parameters<MessageCallback>, void>()

    createSession(onMessage, { model: 'claude-3-opus' })

    expect(mockCreateSession).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'claude-3-opus',
        pathToClaudeCodeExecutable: '/mock/cli/path',
        executable: 'node',
      })
    )
  })

  it('uses default model when not specified', () => {
    const onMessage = vi.fn<Parameters<MessageCallback>, void>()

    createSession(onMessage)

    expect(mockCreateSession).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'claude-sonnet-4-20250514',
      })
    )
  })

  it('returns session controller with sendMessage and close', () => {
    const onMessage = vi.fn<Parameters<MessageCallback>, void>()

    const controller = createSession(onMessage)

    expect(controller).toHaveProperty('session')
    expect(controller).toHaveProperty('sendMessage')
    expect(controller).toHaveProperty('close')
    expect(typeof controller.sendMessage).toBe('function')
    expect(typeof controller.close).toBe('function')
  })

  it('sendMessage sends start message and calls session.send', async () => {
    const onMessage = vi.fn<Parameters<MessageCallback>, void>()

    const controller = createSession(onMessage)
    await controller.sendMessage('Hello')

    // Should send start message with session ID
    const startMessage = onMessage.mock.calls.find(
      (call) => (call[0] as SDKMessage).type === 'start'
    )
    expect(startMessage).toBeDefined()
    expect((startMessage![0] as { session_id: string }).session_id).toBe('mock-session-123')

    // Should call session.send
    expect(mockSession.send).toHaveBeenCalledWith('Hello')
  })

  it('close calls session.close', () => {
    const onMessage = vi.fn<Parameters<MessageCallback>, void>()

    const controller = createSession(onMessage)
    controller.close()

    expect(mockSession.close).toHaveBeenCalled()
  })

  it('handles sendMessage errors', async () => {
    const onMessage = vi.fn<Parameters<MessageCallback>, void>()
    mockSession.send.mockRejectedValueOnce(new Error('Send failed'))

    const controller = createSession(onMessage)
    await controller.sendMessage('Hello')

    const errorMessage = onMessage.mock.calls.find(
      (call) => (call[0] as SDKMessage).type === 'error'
    )
    expect(errorMessage).toBeDefined()
    expect((errorMessage![0] as { error: string }).error).toBe('Send failed')
  })
})

describe('resumeSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSession.stream.mockReturnValue(createMockStream([]))
  })

  it('resumes session with correct session ID', () => {
    const onMessage = vi.fn<Parameters<MessageCallback>, void>()

    resumeSession('existing-session-456', onMessage)

    expect(mockResumeSession).toHaveBeenCalledWith(
      'existing-session-456',
      expect.objectContaining({
        model: 'claude-sonnet-4-20250514',
      })
    )
  })

  it('accepts model option', () => {
    const onMessage = vi.fn<Parameters<MessageCallback>, void>()

    resumeSession('existing-session-456', onMessage, { model: 'claude-3-opus' })

    expect(mockResumeSession).toHaveBeenCalledWith(
      'existing-session-456',
      expect.objectContaining({
        model: 'claude-3-opus',
      })
    )
  })
})

describe('message streaming', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('transforms assistant text messages', async () => {
    mockSession.stream.mockReturnValue(createMockStream([
      {
        type: 'assistant',
        message: {
          content: [
            { type: 'text', text: 'Hello from Claude!' }
          ]
        }
      }
    ]))

    const onMessage = vi.fn<Parameters<MessageCallback>, void>()
    createSession(onMessage)

    // Wait for stream processing
    await new Promise(resolve => setTimeout(resolve, 10))

    const textMessage = onMessage.mock.calls.find(
      (call) => (call[0] as SDKMessage).type === 'text'
    )
    expect(textMessage).toBeDefined()
    expect((textMessage![0] as { content: string }).content).toBe('Hello from Claude!')
  })

  it('transforms tool_use messages', async () => {
    mockSession.stream.mockReturnValue(createMockStream([
      {
        type: 'assistant',
        message: {
          content: [
            { type: 'tool_use', id: 'tool_123', name: 'Read', input: { file_path: '/test.txt' } }
          ]
        }
      }
    ]))

    const onMessage = vi.fn<Parameters<MessageCallback>, void>()
    createSession(onMessage)

    // Wait for stream processing
    await new Promise(resolve => setTimeout(resolve, 10))

    const toolUseMessage = onMessage.mock.calls.find(
      (call) => (call[0] as SDKMessage).type === 'tool_use'
    )
    expect(toolUseMessage).toBeDefined()
    const msg = toolUseMessage![0] as { name: string; input: Record<string, unknown> }
    expect(msg.name).toBe('Read')
    expect(msg.input.file_path).toBe('/test.txt')
  })

  it('transforms tool_result messages', async () => {
    mockSession.stream.mockReturnValue(createMockStream([
      {
        type: 'user',
        message: {
          content: [
            { type: 'tool_result', tool_use_id: 'tool_123', content: 'File contents here' }
          ]
        }
      }
    ]))

    const onMessage = vi.fn<Parameters<MessageCallback>, void>()
    createSession(onMessage)

    // Wait for stream processing
    await new Promise(resolve => setTimeout(resolve, 10))

    const toolResultMessage = onMessage.mock.calls.find(
      (call) => (call[0] as SDKMessage).type === 'tool_result'
    )
    expect(toolResultMessage).toBeDefined()
    const msg = toolResultMessage![0] as { tool_use_id: string; content: string }
    expect(msg.tool_use_id).toBe('tool_123')
    expect(msg.content).toBe('File contents here')
  })

  it('transforms thinking messages', async () => {
    mockSession.stream.mockReturnValue(createMockStream([
      {
        type: 'assistant',
        message: {
          content: [
            { type: 'thinking', thinking: 'Let me analyze this...' }
          ]
        }
      }
    ]))

    const onMessage = vi.fn<Parameters<MessageCallback>, void>()
    createSession(onMessage)

    // Wait for stream processing
    await new Promise(resolve => setTimeout(resolve, 10))

    const thinkingMessage = onMessage.mock.calls.find(
      (call) => (call[0] as SDKMessage).type === 'thinking'
    )
    expect(thinkingMessage).toBeDefined()
    expect((thinkingMessage![0] as { content: string }).content).toBe('Let me analyze this...')
  })

  it('sends end message on result', async () => {
    mockSession.stream.mockReturnValue(createMockStream([
      { type: 'result', subtype: 'success' }
    ]))

    const onMessage = vi.fn<Parameters<MessageCallback>, void>()
    createSession(onMessage)

    // Wait for stream processing
    await new Promise(resolve => setTimeout(resolve, 10))

    const endMessage = onMessage.mock.calls.find(
      (call) => (call[0] as SDKMessage).type === 'end'
    )
    expect(endMessage).toBeDefined()
    expect((endMessage![0] as { stop_reason: string }).stop_reason).toBe('end_turn')
  })

  it('does not duplicate text from result messages', async () => {
    mockSession.stream.mockReturnValue(createMockStream([
      { type: 'result', subtype: 'success', result: 'Task completed' }
    ]))

    const onMessage = vi.fn<Parameters<MessageCallback>, void>()
    createSession(onMessage)

    // Wait for stream processing
    await new Promise(resolve => setTimeout(resolve, 10))

    const textMessage = onMessage.mock.calls.find(
      (call) => (call[0] as SDKMessage).type === 'text'
    )
    // Should NOT find a text message from result
    expect(textMessage).toBeUndefined()
  })

  it('handles stream errors', async () => {
    // eslint-disable-next-line require-yield, @typescript-eslint/require-await
    mockSession.stream.mockReturnValue((async function* () {
      throw new Error('Stream error')
    })())

    const onMessage = vi.fn<Parameters<MessageCallback>, void>()
    createSession(onMessage)

    // Wait for stream processing
    await new Promise(resolve => setTimeout(resolve, 10))

    const errorMessage = onMessage.mock.calls.find(
      (call) => (call[0] as SDKMessage).type === 'error'
    )
    expect(errorMessage).toBeDefined()
    expect((errorMessage![0] as { error: string }).error).toBe('Stream error')
  })
})
