import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import './FileViewer.css'

interface FileViewerProps {
  filename: string
  content: string
  language?: string
  oldContent?: string
}

function getLanguageFromFilename(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase()
  const languageMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'tsx',
    js: 'javascript',
    jsx: 'jsx',
    py: 'python',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    java: 'java',
    c: 'c',
    cpp: 'cpp',
    h: 'c',
    hpp: 'cpp',
    css: 'css',
    scss: 'scss',
    html: 'html',
    json: 'json',
    yaml: 'yaml',
    yml: 'yaml',
    md: 'markdown',
    sh: 'bash',
    bash: 'bash',
    sql: 'sql',
  }
  return languageMap[ext || ''] || 'text'
}

function SimpleDiffViewer({ oldContent, newContent }: { oldContent: string; newContent: string }) {
  const oldLines = oldContent.split('\n')
  const newLines = newContent.split('\n')

  // Simple line-by-line diff
  const maxLines = Math.max(oldLines.length, newLines.length)
  const diffLines: Array<{ type: 'same' | 'add' | 'remove'; content: string }> = []

  for (let i = 0; i < maxLines; i++) {
    const oldLine = oldLines[i]
    const newLine = newLines[i]

    if (oldLine === newLine) {
      if (oldLine !== undefined) {
        diffLines.push({ type: 'same', content: oldLine })
      }
    } else {
      if (oldLine !== undefined) {
        diffLines.push({ type: 'remove', content: oldLine })
      }
      if (newLine !== undefined) {
        diffLines.push({ type: 'add', content: newLine })
      }
    }
  }

  return (
    <div className="simple-diff">
      {diffLines.map((line, index) => (
        <div key={index} className={`diff-line diff-${line.type}`}>
          <span className="diff-marker">
            {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}
          </span>
          <span className="diff-content">{line.content}</span>
        </div>
      ))}
    </div>
  )
}

export function FileViewer({ filename, content, language, oldContent }: FileViewerProps) {
  const detectedLanguage = language || getLanguageFromFilename(filename)

  return (
    <div className="file-viewer">
      <div className="file-header">
        <span className="file-icon">📄</span>
        <span className="file-name">{filename}</span>
        {oldContent !== undefined && (
          <span className="file-badge">Modified</span>
        )}
      </div>
      <div className="file-content">
        {oldContent !== undefined ? (
          <SimpleDiffViewer oldContent={oldContent} newContent={content} />
        ) : (
          <SyntaxHighlighter
            language={detectedLanguage}
            style={oneDark}
            showLineNumbers
            customStyle={{
              margin: 0,
              borderRadius: '0 0 8px 8px',
            }}
          >
            {content}
          </SyntaxHighlighter>
        )}
      </div>
    </div>
  )
}
