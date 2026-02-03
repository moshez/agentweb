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

/**
 * Types for Claude Agent SDK messages (incoming from SDK)
 */

export interface SDKContentBlock {
  type: string
  text?: string
  thinking?: string
  id?: string
  name?: string
  input?: Record<string, unknown>
  tool_use_id?: string
  content?: string | SDKContentBlock[]
  is_error?: boolean
}

export interface SDKIncomingMessage {
  type: string
  message?: {
    content?: SDKContentBlock[]
  }
  subtype?: string
  result?: string
  is_error?: boolean
  errors?: string[]
  content?: unknown
}

/**
 * Session types for persistent storage
 */

export interface Session {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  messages: SDKMessage[]
}

export interface SessionSummary {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}
