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

/**
 * Internal session management messages (not displayed in UI)
 */
export interface SessionCreatedMessage {
  type: 'session_created'
  sdkSessionId: string
}

export interface SessionResumedMessage {
  type: 'session_resumed'
  sdkSessionId: string
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
  | SessionCreatedMessage
  | SessionResumedMessage

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

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

export interface Session {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  messages: SDKMessage[]
  sdkSessionId?: string
}

export interface SessionSummary {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}
