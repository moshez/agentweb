/**
 * Agent SDK message types
 */

export interface TextMessage {
  type: 'text'
  content: string
}

export interface ToolUseMessage {
  type: 'tool_use'
  id: string
  name: string
  input: Record<string, unknown>
}

export interface ToolResultMessage {
  type: 'tool_result'
  tool_use_id: string
  content: string | ToolResultContent[]
  is_error?: boolean
}

export interface ToolResultContent {
  type: 'text' | 'image'
  text?: string
  source?: {
    type: 'base64'
    media_type: string
    data: string
  }
}

export interface ThinkingMessage {
  type: 'thinking'
  content: string
}

export interface ErrorMessage {
  type: 'error'
  error: string
}

export interface StartMessage {
  type: 'start'
  session_id?: string
}

export interface EndMessage {
  type: 'end'
  stop_reason?: string
}

export interface UserMessage {
  type: 'user'
  content: string
}

export type SDKMessage =
  | TextMessage
  | ToolUseMessage
  | ToolResultMessage
  | ThinkingMessage
  | ErrorMessage
  | StartMessage
  | EndMessage
  | UserMessage

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

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

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
