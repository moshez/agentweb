import type { QueryRequest, SDKMessage, ErrorMessage } from './types.js'

/**
 * Mock implementation of the query handler.
 * In production, this would use the Claude Agent SDK.
 *
 * TODO: Replace with actual Agent SDK integration:
 * import { query } from '@anthropic-ai/claude-agent-sdk'
 */

export type MessageCallback = (message: SDKMessage | ErrorMessage) => void

export async function handleQuery(
  request: QueryRequest,
  onMessage: MessageCallback
): Promise<void> {
  // Send start message
  onMessage({
    type: 'start',
    session_id: generateSessionId(),
  })

  try {
    // TODO: Replace with actual Agent SDK call
    // for await (const message of query({ prompt: request.prompt, ...request.options })) {
    //   onMessage(message)
    // }

    // Mock response for now
    await mockAgentResponse(request.prompt, onMessage)

    // Send end message
    onMessage({
      type: 'end',
      stop_reason: 'end_turn',
    })
  } catch (error) {
    onMessage({
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

async function mockAgentResponse(
  prompt: string,
  onMessage: MessageCallback
): Promise<void> {
  // Simulate thinking
  onMessage({
    type: 'thinking',
    content: `Processing request: "${prompt.substring(0, 50)}..."`,
  })

  // Small delay to simulate processing
  await delay(100)

  // Send text response
  onMessage({
    type: 'text',
    content: `This is a mock response to: "${prompt}"\n\nThe Claude Agent SDK integration is not yet implemented. Once integrated, this will stream actual agent responses.`,
  })
}

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
