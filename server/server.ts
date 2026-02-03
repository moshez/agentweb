import express from 'express'
import { WebSocketServer, WebSocket } from 'ws'
import { createServer } from 'http'
import path from 'path'
import { existsSync } from 'fs'
import { fileURLToPath } from 'url'
import type { QueryRequest, ErrorMessage } from './types.js'
import { handleQuery } from './query-handler.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PORT = parseInt(process.env.PORT || '8765', 10)

const app = express()

// Detect if running as compiled binary (Bun uses /$bunfs/ for embedded files)
const distPath = path.join(__dirname, '../dist')
const isCompiledBinary = !existsSync(distPath)

if (isCompiledBinary) {
  // Serve from embedded assets
  let embeddedAssets: typeof import('./embedded-assets.js') | undefined
  try {
    embeddedAssets = await import('./embedded-assets.js')
  } catch {
    console.error('Warning: Running as compiled binary but embedded assets not found.')
    console.error('The binary may have been built without running embed-assets.ts first.')
  }

  if (embeddedAssets) {
    app.get('*', (req, res) => {
      let assetPath = req.path
      if (assetPath === '/') assetPath = '/index.html'

      const asset = embeddedAssets.getAsset(assetPath)
      if (asset) {
        const isBase64 = asset.contentType.includes(';base64')
        const contentType = isBase64
          ? asset.contentType.replace(';base64', '')
          : asset.contentType
        res.setHeader('Content-Type', contentType)
        if (isBase64) {
          res.send(Buffer.from(asset.content, 'base64'))
        } else {
          res.send(asset.content)
        }
      } else {
        // SPA fallback - serve index.html for unknown routes
        const indexAsset = embeddedAssets.getIndexHtml()
        if (indexAsset) {
          res.setHeader('Content-Type', 'text/html; charset=utf-8')
          res.send(indexAsset.content)
        } else {
          res.status(404).send('Not found')
        }
      }
    })
  }
} else {
  // Serve static React build from filesystem
  app.use(express.static(distPath))

  // Fallback to index.html for SPA routing
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

const server = createServer(app)

// WebSocket server for Agent SDK streaming
const wss = new WebSocketServer({ server })

wss.on('connection', (ws: WebSocket) => {
  console.log('Client connected')

  ws.on('message', (data: Buffer) => {
    void (async () => {
      try {
        const request = JSON.parse(data.toString()) as QueryRequest

        if (!request.prompt) {
          const error: ErrorMessage = {
            type: 'error',
            error: 'Missing required field: prompt',
          }
          ws.send(JSON.stringify(error))
          return
        }

        await handleQuery(request, (message) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message))
          }
        })
      } catch (error) {
        const errorMessage: ErrorMessage = {
          type: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        }
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(errorMessage))
        }
      }
    })()
  })

  ws.on('close', () => {
    console.log('Client disconnected')
  })

  ws.on('error', (error) => {
    console.error('WebSocket error:', error)
  })
})

export function startServer(): void {
  server.listen(PORT, () => {
    console.log(`agentweb running on http://localhost:${PORT}`)
  })
}

// Start server if this is the main module
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  startServer()
}

export { app, server, wss }
