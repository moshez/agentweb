import express, { Request, Response, NextFunction, RequestHandler } from 'express'
import { WebSocketServer, WebSocket } from 'ws'
import { createServer } from 'http'
import path from 'path'
import { existsSync } from 'fs'
import { fileURLToPath } from 'url'
import type { ErrorMessage, Session } from './types.js'
import { createSession, resumeSession, type SessionController } from './query-handler.js'
import { listSessions, getSession, saveSession, deleteSession } from './session-manager.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Check if we're being invoked as a script runner (for self-as-runtime support)
// When the binary is symlinked as 'bun' and invoked with a .js file, run that file
const firstArg = process.argv[2]
if (firstArg && firstArg.endsWith('.js') && existsSync(firstArg)) {
  // We're being asked to run a JavaScript file
  // Import and run it - this works because Bun's runtime is embedded in the binary
  // NOTE: Don't log anything to stdout - the CLI uses it for JSON protocol
  try {
    await import(path.resolve(firstArg))
    // Don't exit - the CLI will handle its own lifecycle
    // It needs to keep running to process stdin/stdout with the SDK
  } catch (err) {
    // Log errors to stderr only
    console.error('Failed to run script:', err)
    process.exit(1)
  }
  // Block forever - let the imported script handle everything
  // The process will exit when the CLI terminates or stdin closes
  await new Promise(() => {})
}

const PORT = parseInt(process.env.PORT || '8765', 10)

const app = express()

// JSON body parsing for REST API
app.use(express.json())

// Wrapper for async route handlers
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next)
  }
}

// Session API endpoints
app.get('/api/sessions', asyncHandler(async (_req, res) => {
  try {
    const sessions = await listSessions()
    res.json(sessions)
  } catch (error) {
    console.error('Failed to list sessions:', error)
    res.status(500).json({ error: 'Failed to list sessions' })
  }
}))

app.get('/api/sessions/:id', asyncHandler(async (req, res) => {
  try {
    const session = await getSession(req.params.id)
    if (session) {
      res.json(session)
    } else {
      res.status(404).json({ error: 'Session not found' })
    }
  } catch (error) {
    console.error('Failed to get session:', error)
    res.status(500).json({ error: 'Failed to get session' })
  }
}))

app.put('/api/sessions/:id', asyncHandler(async (req, res) => {
  try {
    const session = req.body as Session
    if (!session.id || session.id !== req.params.id) {
      res.status(400).json({ error: 'Session ID mismatch' })
      return
    }
    await saveSession(session)
    res.json({ success: true })
  } catch (error) {
    console.error('Failed to save session:', error)
    res.status(500).json({ error: 'Failed to save session' })
  }
}))

app.delete('/api/sessions/:id', asyncHandler(async (req, res) => {
  try {
    const deleted = await deleteSession(req.params.id)
    if (deleted) {
      res.json({ success: true })
    } else {
      res.status(404).json({ error: 'Session not found' })
    }
  } catch (error) {
    console.error('Failed to delete session:', error)
    res.status(500).json({ error: 'Failed to delete session' })
  }
}))

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
      // Skip API routes
      if (req.path.startsWith('/api/')) {
        res.status(404).json({ error: 'Not found' })
        return
      }

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

  // Fallback to index.html for SPA routing (but not for API routes)
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
      res.status(404).json({ error: 'Not found' })
      return
    }
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

const server = createServer(app)

// WebSocket server for Agent SDK streaming
const wss = new WebSocketServer({ server })

// Message types from client
interface ClientMessage {
  type: 'create_session' | 'resume_session' | 'send_message' | 'stop'
  prompt?: string
  sdkSessionId?: string
  options?: { model?: string }
}

// Track active SDK sessions per WebSocket connection
const activeSessions = new Map<WebSocket, SessionController>()

wss.on('connection', (ws: WebSocket) => {
  console.log('Client connected')

  const sendToClient = (msg: unknown) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg))
    }
  }

  ws.on('message', (data: Buffer) => {
    void (async () => {
      try {
        const message = JSON.parse(data.toString()) as ClientMessage

        switch (message.type) {
          case 'create_session': {
            // Close existing session if any
            const existing = activeSessions.get(ws)
            if (existing) {
              existing.close()
            }

            // Create new SDK session
            const controller = createSession(sendToClient, message.options)
            activeSessions.set(ws, controller)

            // Send session created confirmation with SDK session ID
            // Note: sessionId may not be available immediately, it's set after first message
            sendToClient({
              type: 'session_created',
              // Session ID will be sent with first 'start' message
            })
            break
          }

          case 'resume_session': {
            if (!message.sdkSessionId) {
              sendToClient({
                type: 'error',
                error: 'Missing sdkSessionId for resume',
              })
              return
            }

            // Close existing session if any
            const existing = activeSessions.get(ws)
            if (existing) {
              existing.close()
            }

            // Resume existing SDK session
            const controller = resumeSession(
              message.sdkSessionId,
              sendToClient,
              message.options
            )
            activeSessions.set(ws, controller)

            sendToClient({
              type: 'session_resumed',
              sdkSessionId: message.sdkSessionId,
            })
            break
          }

          case 'send_message': {
            if (!message.prompt) {
              const error: ErrorMessage = {
                type: 'error',
                error: 'Missing required field: prompt',
              }
              sendToClient(error)
              return
            }

            let controller = activeSessions.get(ws)

            // Auto-create session if none exists
            if (!controller) {
              controller = createSession(sendToClient, message.options)
              activeSessions.set(ws, controller)
            }

            // Send message to the session
            await controller.sendMessage(message.prompt)
            break
          }

          case 'stop': {
            const controller = activeSessions.get(ws)
            if (controller) {
              controller.close()
              activeSessions.delete(ws)
            }
            sendToClient({
              type: 'end',
              stop_reason: 'user_stopped',
            })
            break
          }

          default:
            // Legacy support: treat as send_message if has prompt
            if ('prompt' in message && message.prompt) {
              let controller = activeSessions.get(ws)
              if (!controller) {
                controller = createSession(sendToClient)
                activeSessions.set(ws, controller)
              }
              await controller.sendMessage(message.prompt)
            }
        }
      } catch (error) {
        const errorMessage: ErrorMessage = {
          type: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        }
        sendToClient(errorMessage)
      }
    })()
  })

  ws.on('close', () => {
    console.log('Client disconnected')
    // Close SDK session when client disconnects
    const controller = activeSessions.get(ws)
    if (controller) {
      controller.close()
      activeSessions.delete(ws)
    }
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
