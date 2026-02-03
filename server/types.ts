/**
 * Shared types for the server
 */

export interface QueryRequest {
  prompt: string
  options?: QueryOptions
  messages?: ConversationMessage[]
}

export interface QueryOptions {
  model?: string
  maxTokens?: number
  systemPrompt?: string
  mcpServers?: Record<string, unknown>
}

/**
 * Conversation message format for multi-turn support
 */
export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string | ConversationContentBlock[]
}

export interface ConversationContentBlock {
  type: 'text' | 'tool_use' | 'tool_result'
  text?: string
  id?: string
  name?: string
  input?: Record<string, unknown>
  tool_use_id?: string
  content?: string
  is_error?: boolean
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
