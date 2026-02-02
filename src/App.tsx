import { useCallback } from 'react'
import { ConversationView, InputBox, StatusIndicator } from './components'
import { useWebSocket } from './hooks'
import './App.css'

function getWebSocketUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = window.location.host

  // In development, connect to the dev server proxy
  if (import.meta.env.DEV) {
    return `${protocol}//${window.location.hostname}:8888`
  }

  return `${protocol}//${host}`
}

function App() {
  const wsUrl = getWebSocketUrl()
  const { messages, status, send, clearMessages, isProcessing } = useWebSocket(wsUrl)

  const handleSubmit = useCallback(
    (message: string) => {
      send(message)
    },
    [send]
  )

  const handleClear = useCallback(() => {
    clearMessages()
  }, [clearMessages])

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">agentweb</h1>
        <div className="header-actions">
          <button
            onClick={handleClear}
            className="clear-button"
            disabled={messages.length === 0}
          >
            Clear
          </button>
          <StatusIndicator status={status} />
        </div>
      </header>
      <main className="app-main">
        <ConversationView messages={messages} isProcessing={isProcessing} />
        <InputBox
          onSubmit={handleSubmit}
          disabled={status !== 'connected' || isProcessing}
          placeholder={
            status !== 'connected'
              ? 'Waiting for connection...'
              : isProcessing
                ? 'Processing...'
                : 'Type your message... (Enter to send, Shift+Enter for new line)'
          }
        />
      </main>
    </div>
  )
}

export default App
