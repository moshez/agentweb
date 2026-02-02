/**
 * Shared types for the server
 */

export interface QueryRequest {
  prompt: string
  options?: QueryOptions
}

export interface QueryOptions {
  model?: string
  maxTokens?: number
  systemPrompt?: string
  mcpServers?: Record<string, unknown>
}

export interface SDKMessage {
  type: string
  [key: string]: unknown
}

export interface ErrorMessage {
  type: 'error'
  error: string
}
