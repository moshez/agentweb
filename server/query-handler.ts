import { query } from '@anthropic-ai/claude-agent-sdk'
import type { QueryRequest, SDKMessage, ErrorMessage } from './types.js'

/**
 * Query handler that integrates with the Claude Agent SDK.
 * Transforms SDK messages into the format expected by the frontend.
 */

export type MessageCallback = (message: SDKMessage | ErrorMessage) => void

export async function handleQuery(
  request: QueryRequest,
  onMessage: MessageCallback
): Promise<void> {
  const sessionId = generateSessionId()

  // Send start message
  onMessage({
    type: 'start',
    session_id: sessionId,
  })

  try {
    // Call the Claude Agent SDK
    for await (const message of query({
      prompt: request.prompt,
      options: {
        model: request.options?.model,
        systemPrompt: request.options?.systemPrompt,
        mcpServers: request.options?.mcpServers as Record<string, any> | undefined,
        // Use acceptEdits mode to auto-approve file edits
        permissionMode: 'acceptEdits',
        // Enable common tools
        allowedTools: ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'Bash', 'WebSearch', 'WebFetch'],
        // Pass through environment variables (including ANTHROPIC_API_KEY)
        env: process.env as Record<string, string>,
      },
    })) {
      // Transform SDK messages into frontend format
      const frontendMessages = transformSDKMessage(message)
      for (const msg of frontendMessages) {
        onMessage(msg)
      }
    }

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

/**
 * Transform an SDK message into frontend message format.
 * The SDK returns complex nested messages that we flatten for the frontend.
 */
function transformSDKMessage(message: any): SDKMessage[] {
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
              input: block.input || {},
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
                .filter((c: any) => c.type === 'text')
                .map((c: any) => c.text)
                .join('\n')
            } else {
              resultContent = JSON.stringify(block.content)
            }

            messages.push({
              type: 'tool_result',
              tool_use_id: block.tool_use_id,
              content: resultContent,
              is_error: block.is_error || false,
            })
          }
        }
      }
      break
    }

    case 'result': {
      // Result messages indicate completion
      if (message.subtype === 'success' && message.result) {
        messages.push({
          type: 'text',
          content: message.result,
        })
      } else if (message.is_error && message.errors) {
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
      if ('content' in message && message.content) {
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

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}
