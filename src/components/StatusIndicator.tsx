import type { ConnectionStatus } from '../lib/types'
import './StatusIndicator.css'

interface StatusIndicatorProps {
  status: ConnectionStatus
}

const STATUS_CONFIG: Record<
  ConnectionStatus,
  { label: string; className: string }
> = {
  connecting: { label: 'Connecting...', className: 'status-connecting' },
  connected: { label: 'Connected', className: 'status-connected' },
  disconnected: { label: 'Disconnected', className: 'status-disconnected' },
  error: { label: 'Connection Error', className: 'status-error' },
}

export function StatusIndicator({ status }: StatusIndicatorProps) {
  const config = STATUS_CONFIG[status]

  return (
    <div className={`status-indicator ${config.className}`}>
      <span className="status-dot"></span>
      <span className="status-label">{config.label}</span>
    </div>
  )
}
