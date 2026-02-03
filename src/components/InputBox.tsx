import { useState, useCallback, KeyboardEvent } from 'react'
import './InputBox.css'

interface InputBoxProps {
  onSubmit: (message: string) => void
  onStop?: () => void
  canSend: boolean
  isProcessing: boolean
  placeholder?: string
}

export function InputBox({
  onSubmit,
  onStop,
  canSend,
  isProcessing,
  placeholder = 'Type your message...',
}: InputBoxProps) {
  const [value, setValue] = useState('')

  const handleSubmit = useCallback(() => {
    const trimmedValue = value.trim()
    if (trimmedValue && canSend && !isProcessing) {
      onSubmit(trimmedValue)
      setValue('')
    }
  }, [value, canSend, isProcessing, onSubmit])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit]
  )

  const sendDisabled = !canSend || isProcessing || !value.trim()

  return (
    <div className="input-box">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={3}
        className="input-textarea"
      />
      <div className="input-actions">
        {isProcessing ? (
          <button
            onClick={onStop}
            className="stop-button"
            type="button"
          >
            Stop
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={sendDisabled}
            className="submit-button"
            type="button"
          >
            Send
          </button>
        )}
      </div>
    </div>
  )
}
