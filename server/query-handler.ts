import { query } from '@anthropic-ai/claude-agent-sdk'
import type { QueryRequest, SDKMessage, ErrorMessage, SDKIncomingMessage, SDKContentBlock } from './types.js'
import { getClaudeCodeCliPath, getJsRuntime, getRuntimeEnv } from './cli-extractor.js'

/**
 * Query handler that integrates with the Claude Agent SDK.
 * Transforms SDK messages into the format expected by the frontend.
 */

export type MessageCallback = (message: SDKMessage | ErrorMessage) => void

export interface QueryController {
  abort: () => void
  promise: Promise<void>
}

export function handleQuery(
  request: QueryRequest,
  onMessage: MessageCallback
): QueryController {
  const abortController = new AbortController()
  let resolvePromise: () => void
  let rejectPromise: (error: Error) => void

  const promise = new Promise<void>((resolve, reject) => {
    resolvePromise = resolve
    rejectPromise = reject
  })

  const runQuery = async () => {
    const sessionId = generateSessionId()

    // Send start message
    onMessage({
      type: 'start',
      session_id: sessionId,
    })

    try {
      // Get the CLI path, runtime, and env (needed for compiled Bun binaries)
      const pathToClaudeCodeExecutable = getClaudeCodeCliPath()
      const executable = getJsRuntime()
      const env = getRuntimeEnv()

      // Log configuration for debugging
      console.log('SDK Configuration:', {
        pathToClaudeCodeExecutable,
        executable,
        pathModified: env.PATH !== process.env.PATH,
      })

      // Call the Claude Agent SDK
      for await (const message of query({
        prompt: request.prompt,
        options: {
          model: request.options?.model,
          systemPrompt: request.options?.systemPrompt,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment -- SDK expects specific McpServerConfig type
          mcpServers: request.options?.mcpServers as any,
          // Use acceptEdits mode to auto-approve file edits
          permissionMode: 'acceptEdits',
          // Enable common tools
          allowedTools: ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'Bash', 'WebSearch', 'WebFetch'],
          // Pass through environment variables (including ANTHROPIC_API_KEY)
          // For compiled binaries, this includes a modified PATH to find our runtime
          env,
          // For compiled Bun binaries, use the extracted CLI path and specify runtime
          pathToClaudeCodeExecutable,
          executable,
        },
      })) {
        // Check if aborted
        if (abortController.signal.aborted) {
          onMessage({
            type: 'end',
            stop_reason: 'user_stopped',
          })
          resolvePromise()
          return
        }

        // Log raw SDK messages for debugging
        console.log('SDK Message:', JSON.stringify(message, null, 2))

        // Transform SDK messages into frontend format
        const frontendMessages = transformSDKMessage(message as SDKIncomingMessage)
        for (const msg of frontendMessages) {
          onMessage(msg)
        }
      }

      // Send end message
      onMessage({
        type: 'end',
        stop_reason: 'end_turn',
      })
      resolvePromise()
    } catch (error) {
      // Check if this was an abort
      if (abortController.signal.aborted) {
        onMessage({
          type: 'end',
          stop_reason: 'user_stopped',
        })
        resolvePromise()
        return
      }

      // Log full error details for debugging
      console.error('SDK Error:', error)
      if (error instanceof Error) {
        console.error('Error stack:', error.stack)
      }

      onMessage({
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      rejectPromise(error instanceof Error ? error : new Error('Unknown error'))
    }
  }

  // Start the query asynchronously
  void runQuery()

  return {
    abort: () => abortController.abort(),
    promise,
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

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}
