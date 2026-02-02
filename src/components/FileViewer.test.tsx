import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { FileViewer } from './FileViewer'

describe('FileViewer', () => {
  it('renders filename in header', () => {
    render(<FileViewer filename="test.ts" content="const x = 1;" />)
    expect(screen.getByText('test.ts')).toBeInTheDocument()
  })

  it('renders code content', () => {
    const { container } = render(<FileViewer filename="test.js" content="const x = 1;" />)
    // Content is split across multiple elements by syntax highlighter
    expect(container.querySelector('code')).toBeInTheDocument()
    expect(container.textContent).toContain('const')
    expect(container.textContent).toContain('x')
    expect(container.textContent).toContain('1')
  })

  it('shows Modified badge when oldContent is provided', () => {
    render(
      <FileViewer
        filename="test.ts"
        content="const x = 2;"
        oldContent="const x = 1;"
      />
    )
    expect(screen.getByText('Modified')).toBeInTheDocument()
  })

  it('does not show Modified badge when no oldContent', () => {
    render(<FileViewer filename="test.ts" content="const x = 1;" />)
    expect(screen.queryByText('Modified')).not.toBeInTheDocument()
  })

  it('renders diff view when oldContent is provided', () => {
    const { container } = render(
      <FileViewer
        filename="test.ts"
        content="const x = 2;"
        oldContent="const x = 1;"
      />
    )
    expect(container.querySelector('.simple-diff')).toBeInTheDocument()
  })

  it('shows added line in diff', () => {
    const { container } = render(
      <FileViewer
        filename="test.ts"
        content="line1\nline2"
        oldContent="line1"
      />
    )
    expect(container.querySelector('.diff-add')).toBeInTheDocument()
  })

  it('shows removed line in diff', () => {
    const { container } = render(
      <FileViewer
        filename="test.ts"
        content="line1"
        oldContent="line1\nline2"
      />
    )
    expect(container.querySelector('.diff-remove')).toBeInTheDocument()
  })

  it('uses custom language when provided', () => {
    render(
      <FileViewer
        filename="config"
        content="key = value"
        language="toml"
      />
    )
    // The component should render without errors with custom language
    expect(screen.getByText('config')).toBeInTheDocument()
  })
})
