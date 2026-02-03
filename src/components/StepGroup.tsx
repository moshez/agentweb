import { useState } from 'react'
import type { SDKMessage, ToolUseMessage } from '../lib/types'
import './StepGroup.css'

interface StepGroupProps {
  steps: SDKMessage[]
}

function getStepSummary(step: SDKMessage): string {
  if (step.type === 'tool_use') {
    const toolUse = step as ToolUseMessage
    const input = toolUse.input as Record<string, unknown>
    // Get the description or command for common tools
    if (input.description) {
      return `${toolUse.name}: ${input.description}`
    }
    if (input.command) {
      const cmd = String(input.command)
      return `${toolUse.name}: ${cmd.length > 50 ? cmd.slice(0, 50) + '...' : cmd}`
    }
    if (input.pattern) {
      return `${toolUse.name}: ${input.pattern}`
    }
    if (input.file_path) {
      return `${toolUse.name}: ${input.file_path}`
    }
    return toolUse.name
  }
  if (step.type === 'tool_result') {
    const content = typeof step.content === 'string' ? step.content : JSON.stringify(step.content)
    const preview = content.slice(0, 60).replace(/\n/g, ' ')
    return step.is_error ? `Error: ${preview}...` : `Result: ${preview}...`
  }
  return 'Step'
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
            <div key={index} className={`step-item step-${step.type}`}>
              <div className="step-summary">
                {getStepSummary(step)}
              </div>
            </div>
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
        <div className={`step-item step-${latestStep.type}`}>
          <div className="step-summary">
            {getStepSummary(latestStep)}
          </div>
        </div>
      </div>
    </div>
  )
}
