import { useState, useCallback, KeyboardEvent } from 'react'
import './InputBox.css'

interface InputBoxProps {
  onSubmit: (message: string) => void
  disabled?: boolean
  placeholder?: string
}

export function InputBox({
  onSubmit,
  disabled = false,
  placeholder = 'Type your message...',
}: InputBoxProps) {
  const [value, setValue] = useState('')

  const handleSubmit = useCallback(() => {
    const trimmedValue = value.trim()
    if (trimmedValue && !disabled) {
      onSubmit(trimmedValue)
      setValue('')
    }
  }, [value, disabled, onSubmit])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit]
  )

  return (
    <div className="input-box">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={3}
        className="input-textarea"
      />
      <button
        onClick={handleSubmit}
        disabled={disabled || !value.trim()}
        className="submit-button"
      >
        Send
      </button>
    </div>
  )
}
