import * as readline from 'readline'
import type { QueryRequest, ErrorMessage } from './types.js'
import { handleQuery } from './query-handler.js'

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

      const controller = handleQuery(request, sendMessage)
      await controller.promise
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
  process.exit(0)
})

// Handle process termination gracefully
process.on('SIGINT', () => {
  rl.close()
})

process.on('SIGTERM', () => {
  rl.close()
})
