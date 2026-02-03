import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import type { SDKMessage } from '../lib/types'
import './MessageRenderer.css'

interface MessageRendererProps {
  message: SDKMessage
}

export function MessageRenderer({ message }: MessageRendererProps) {
  switch (message.type) {
    case 'text':
      return (
        <div className="message message-text">
          <ReactMarkdown
            components={{
              code({ className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '')
                const codeString = String(children).replace(/\n$/, '')

                // Check if it's an inline code or block code
                const isInline = !className && !codeString.includes('\n')

                if (isInline) {
                  return (
                    <code className="inline-code" {...props}>
                      {children}
                    </code>
                  )
                }

                return (
                  <SyntaxHighlighter
                    style={oneDark}
                    language={match?.[1] || 'text'}
                    PreTag="div"
                  >
                    {codeString}
                  </SyntaxHighlighter>
                )
              },
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
      )

    case 'tool_use':
      return (
        <div className="message message-tool-use">
          <div className="tool-header">
            <span className="tool-icon">🔧</span>
            <span className="tool-name">{message.name}</span>
          </div>
          <pre className="tool-input">
            {JSON.stringify(message.input, null, 2)}
          </pre>
        </div>
      )

    case 'tool_result':
      return (
        <div className={`message message-tool-result ${message.is_error ? 'error' : ''}`}>
          <div className="tool-result-header">
            <span className="result-icon">{message.is_error ? '❌' : '✓'}</span>
            <span>Tool Result</span>
          </div>
          <pre className="tool-result-content">
            {typeof message.content === 'string'
              ? message.content
              : JSON.stringify(message.content, null, 2)}
          </pre>
        </div>
      )

    case 'thinking':
      return (
        <div className="message message-thinking">
          <div className="thinking-header">
            <span className="thinking-icon">💭</span>
            <span>Thinking...</span>
          </div>
          <div className="thinking-content">{message.content}</div>
        </div>
      )

    case 'error':
      return (
        <div className="message message-error">
          <div className="error-header">
            <span className="error-icon">⚠️</span>
            <span>Error</span>
          </div>
          <div className="error-content">{message.error}</div>
        </div>
      )

    case 'user':
      return (
        <div className="message message-user">
          <div className="user-header">
            <span className="user-icon">👤</span>
            <span>You</span>
          </div>
          <div className="user-content">{message.content}</div>
        </div>
      )

    case 'start':
    case 'end':
      // Don't render start/end messages in the UI
      return null

    default:
      return (
        <div className="message message-unknown">
          <pre>{JSON.stringify(message, null, 2)}</pre>
        </div>
      )
  }
}
