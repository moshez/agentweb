import * as readline from 'readline'
import type { QueryRequest, ErrorMessage } from './types.js'
import { createSession, type SessionController } from './query-handler.js'

/**
 * Stdio mode for programmatic use.
 *
 * Protocol:
 * - Input: One JSON object per line: { prompt: string, options?: QueryOptions }
 * - Output: Agent SDK messages, one JSON object per line (NDJSON)
 */

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
})

function sendMessage(message: unknown): void {
  process.stdout.write(JSON.stringify(message) + '\n')
}

// Keep track of the current session for multi-turn conversations
let currentSession: SessionController | null = null

rl.on('line', (line: string) => {
  void (async () => {
    if (!line.trim()) {
      return
    }

    try {
      const request = JSON.parse(line) as QueryRequest

      if (!request.prompt) {
        const error: ErrorMessage = {
          type: 'error',
          error: 'Missing required field: prompt',
        }
        sendMessage(error)
        return
      }

      // Create a new session if we don't have one
      if (!currentSession) {
        currentSession = createSession(sendMessage, {
          model: request.options?.model,
          systemPrompt: request.options?.systemPrompt,
        })
      }

      // Send the message
      await currentSession.sendMessage(request.prompt)
    } catch (error) {
      const errorMessage: ErrorMessage = {
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      }
      sendMessage(errorMessage)
    }
  })()
})

rl.on('close', () => {
  if (currentSession) {
    currentSession.close()
  }
  process.exit(0)
})

// Handle process termination gracefully
process.on('SIGINT', () => {
  rl.close()
})

process.on('SIGTERM', () => {
  rl.close()
})
