import {
  unstable_v2_createSession,
  unstable_v2_resumeSession,
  type SDKSession,
  type SDKSessionOptions,
} from '@anthropic-ai/claude-agent-sdk'
import type { SDKMessage, ErrorMessage, SDKIncomingMessage, SDKContentBlock } from './types.js'
import { getClaudeCodeCliPath, getJsRuntime, getRuntimeEnv } from './cli-extractor.js'

/**
 * Session-based query handler using the V2 SDK API.
 * Supports multi-turn conversations within a session.
 */

export type MessageCallback = (message: SDKMessage | ErrorMessage) => void

export interface SessionController {
  session: SDKSession
  sendMessage: (prompt: string) => Promise<void>
  close: () => void
}

/**
 * Create a new SDK session for multi-turn conversations.
 */
export function createSession(
  onMessage: MessageCallback,
  options?: { model?: string; systemPrompt?: string }
): SessionController {
  // Get the CLI path, runtime, and env (needed for compiled Bun binaries)
  const pathToClaudeCodeExecutable = getClaudeCodeCliPath()
  const executable = getJsRuntime()
  const env = getRuntimeEnv()

  // Log configuration for debugging
  console.log('Creating SDK Session with config:', {
    pathToClaudeCodeExecutable,
    executable,
    pathModified: env.PATH !== process.env.PATH,
    model: options?.model || 'claude-sonnet-4-20250514',
  })

  const sessionOptions: SDKSessionOptions = {
    model: options?.model || 'claude-sonnet-4-20250514',
    pathToClaudeCodeExecutable,
    executable,
    env,
    allowedTools: ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'Bash', 'WebSearch', 'WebFetch'],
  }

  const session = unstable_v2_createSession(sessionOptions)

  // Start streaming messages in the background
  void streamMessages(session, onMessage)

  const sendMessage = async (prompt: string): Promise<void> => {
    try {
      // Send start message
      onMessage({
        type: 'start',
        session_id: session.sessionId,
      })

      await session.send(prompt)
    } catch (error) {
      console.error('Error sending message:', error)
      onMessage({
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  return {
    session,
    sendMessage,
    close: () => session.close(),
  }
}

/**
 * Resume an existing SDK session by ID.
 */
export function resumeSession(
  sessionId: string,
  onMessage: MessageCallback,
  options?: { model?: string }
): SessionController {
  const pathToClaudeCodeExecutable = getClaudeCodeCliPath()
  const executable = getJsRuntime()
  const env = getRuntimeEnv()

  console.log('Resuming SDK Session:', sessionId)

  const sessionOptions: SDKSessionOptions = {
    model: options?.model || 'claude-sonnet-4-20250514',
    pathToClaudeCodeExecutable,
    executable,
    env,
    allowedTools: ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'Bash', 'WebSearch', 'WebFetch'],
  }

  const session = unstable_v2_resumeSession(sessionId, sessionOptions)

  // Start streaming messages in the background
  void streamMessages(session, onMessage)

  const sendMessage = async (prompt: string): Promise<void> => {
    try {
      onMessage({
        type: 'start',
        session_id: session.sessionId,
      })

      await session.send(prompt)
    } catch (error) {
      console.error('Error sending message:', error)
      onMessage({
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  return {
    session,
    sendMessage,
    close: () => session.close(),
  }
}

/**
 * Stream messages from the session and forward to the callback.
 */
async function streamMessages(
  session: SDKSession,
  onMessage: MessageCallback
): Promise<void> {
  try {
    for await (const message of session.stream()) {
      console.log('SDK Message:', JSON.stringify(message, null, 2))

      // Transform SDK messages into frontend format
      const frontendMessages = transformSDKMessage(message as SDKIncomingMessage)
      for (const msg of frontendMessages) {
        onMessage(msg)
      }

      // Check for end of turn
      if (message.type === 'result') {
        onMessage({
          type: 'end',
          stop_reason: 'end_turn',
        })
      }
    }
  } catch (error) {
    console.error('Stream error:', error)
    onMessage({
      type: 'error',
      error: error instanceof Error ? error.message : 'Stream error',
    })
  }
}

/**
 * Transform an SDK message into frontend message format.
 * The SDK returns complex nested messages that we flatten for the frontend.
 */
function transformSDKMessage(message: SDKIncomingMessage): SDKMessage[] {
  const messages: SDKMessage[] = []

  switch (message.type) {
    case 'assistant': {
      // Assistant messages contain content blocks
      const content = message.message?.content
      if (Array.isArray(content)) {
        for (const block of content) {
          if (block.type === 'text' && block.text) {
            messages.push({
              type: 'text',
              content: block.text,
            })
          } else if (block.type === 'tool_use') {
            messages.push({
              type: 'tool_use',
              id: block.id,
              name: block.name,
              input: block.input ?? {},
            })
          } else if (block.type === 'thinking' && block.thinking) {
            messages.push({
              type: 'thinking',
              content: block.thinking,
            })
          }
        }
      }
      break
    }

    case 'user': {
      // User messages contain tool results
      const content = message.message?.content
      if (Array.isArray(content)) {
        for (const block of content) {
          if (block.type === 'tool_result') {
            let resultContent: string
            if (typeof block.content === 'string') {
              resultContent = block.content
            } else if (Array.isArray(block.content)) {
              // Extract text from content array
              resultContent = block.content
                .filter((c: SDKContentBlock) => c.type === 'text')
                .map((c: SDKContentBlock) => c.text ?? '')
                .join('\n')
            } else {
              resultContent = JSON.stringify(block.content)
            }

            messages.push({
              type: 'tool_result',
              tool_use_id: block.tool_use_id,
              content: resultContent,
              is_error: block.is_error ?? false,
            })
          }
        }
      }
      break
    }

    case 'result': {
      // Result messages indicate completion
      // Note: Don't emit text for 'success' results - the final text is already
      // included in the preceding 'assistant' message to avoid duplicates
      if (message.is_error && message.errors) {
        for (const error of message.errors) {
          messages.push({
            type: 'error',
            error: error,
          })
        }
      }
      break
    }

    case 'system': {
      // System init messages - we can log them but don't need to display
      if (message.subtype === 'init') {
        // Optionally could send a system message to frontend
        // For now, we just acknowledge the session started
      }
      break
    }

    default:
      // For unknown message types, pass them through as-is if they have content
      if (message.content !== undefined) {
        messages.push({
          type: 'text',
          content: typeof message.content === 'string'
            ? message.content
            : JSON.stringify(message.content),
        })
      }
      break
  }

  return messages
}
