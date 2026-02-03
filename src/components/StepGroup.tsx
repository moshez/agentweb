import { useState } from 'react'
import type { SDKMessage } from '../lib/types'
import './StepGroup.css'

interface StepGroupProps {
  steps: SDKMessage[]
}

function getStepSummary(step: SDKMessage): string {
  if (step.type === 'tool_use') {
    const { name, input } = step
    // Get the description or command for common tools
    if (input.description) {
      return `${name}: ${String(input.description)}`
    }
    if (input.command) {
      const cmd = String(input.command)
      return `${name}: ${cmd.length > 50 ? cmd.slice(0, 50) + '...' : cmd}`
    }
    if (input.pattern) {
      return `${name}: ${String(input.pattern)}`
    }
    if (input.file_path) {
      return `${name}: ${String(input.file_path)}`
    }
    return name
  }
  if (step.type === 'tool_result') {
    const content = typeof step.content === 'string' ? step.content : JSON.stringify(step.content)
    const preview = content.slice(0, 60).replace(/\n/g, ' ')
    return step.is_error ? `Error: ${preview}...` : `Result: ${preview}...`
  }
  return 'Step'
}

function getStepDetails(step: SDKMessage): string {
  if (step.type === 'tool_use') {
    return JSON.stringify(step.input, null, 2)
  }
  if (step.type === 'tool_result') {
    const content = step.content
    return typeof content === 'string' ? content : JSON.stringify(content, null, 2)
  }
  return JSON.stringify(step, null, 2)
}

interface StepItemProps {
  step: SDKMessage
}

function StepItem({ step }: StepItemProps) {
  const [isDetailExpanded, setIsDetailExpanded] = useState(false)

  return (
    <div className={`step-item step-${step.type} ${isDetailExpanded ? 'detail-expanded' : ''}`}>
      <button
        className="step-summary"
        onClick={() => setIsDetailExpanded(!isDetailExpanded)}
      >
        <span className="step-expand-icon">{isDetailExpanded ? '▼' : '▶'}</span>
        <span className="step-summary-text">{getStepSummary(step)}</span>
      </button>
      {isDetailExpanded && (
        <pre className="step-details">{getStepDetails(step)}</pre>
      )}
    </div>
  )
}

export function StepGroup({ steps }: StepGroupProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (steps.length === 0) return null

  // Get the latest step (last tool_use or its result)
  const latestStep = steps[steps.length - 1]
  const hiddenCount = steps.length - 1

  if (isExpanded) {
    return (
      <div className="step-group expanded">
        <button
          className="step-group-toggle"
          onClick={() => setIsExpanded(false)}
        >
          <span className="toggle-icon">▼</span>
          <span>Collapse {steps.length} steps</span>
        </button>
        <div className="step-group-content">
          {steps.map((step, index) => (
            <StepItem key={index} step={step} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="step-group collapsed">
      {hiddenCount > 0 && (
        <button
          className="step-group-toggle"
          onClick={() => setIsExpanded(true)}
        >
          <span className="toggle-icon">▶</span>
          <span>{hiddenCount} more step{hiddenCount > 1 ? 's' : ''}</span>
        </button>
      )}
      <div className="step-group-latest">
        <StepItem step={latestStep} />
      </div>
    </div>
  )
}
