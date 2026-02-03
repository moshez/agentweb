# agentweb

A web-based chat interface for the Claude Agent SDK.

## Project Structure

```
/home/user/agentweb/
├── src/                          # React Frontend (TypeScript)
│   ├── App.tsx                   # Root component, layout, WebSocket setup
│   ├── main.tsx                  # React entry point
│   ├── lib/types.ts              # Shared message type definitions
│   ├── components/
│   │   ├── ConversationView.tsx  # Message display with auto-scroll
│   │   ├── MessageRenderer.tsx   # Individual message rendering (markdown, code)
│   │   ├── StepGroup.tsx         # Collapsible tool step grouping
│   │   ├── InputBox.tsx          # User input textarea + submit
│   │   ├── StatusIndicator.tsx   # Connection status display
│   │   └── *.css                 # Component styles
│   └── hooks/
│       └── useWebSocket.ts       # WebSocket connection management
│
├── server/                       # Express + WebSocket Backend
│   ├── server.ts                 # HTTP server + WebSocket setup
│   ├── query-handler.ts          # Claude Agent SDK integration
│   ├── types.ts                  # Server type definitions
│   ├── cli-extractor.ts          # CLI extraction for compiled binaries
│   ├── stdio.ts                  # Stdio mode handler
│   └── embed-assets.ts           # Asset embedding for binaries
│
├── package.json                  # Dependencies & scripts
├── tsconfig.json                 # Client TypeScript config
├── tsconfig.server.json          # Server TypeScript config
└── vite.config.ts                # Vite build configuration
```

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: CSS (no framework)
- **Backend**: Express, ws (WebSocket)
- **Build**: Vite (client), tsc (server)
- **Runtime**: Node.js / Bun (supports both)

## Key Libraries

- `@anthropic-ai/claude-agent-sdk` - Claude Agent SDK for AI queries
- `react-markdown` - Markdown rendering
- `react-syntax-highlighter` - Code block syntax highlighting (Prism + oneDark theme)

## Development

```bash
npm run dev          # Start Vite dev server (port 5173) + backend
npm run build:all    # Build client + server
npm start            # Production server (port 8765)
```

## Architecture

### Message Flow

1. User types message in `InputBox`
2. `App.handleSubmit()` calls `useWebSocket.send(prompt)`
3. WebSocket sends `{prompt, options}` to server
4. `query-handler.ts` calls Claude Agent SDK
5. SDK streams messages back via WebSocket
6. `transformSDKMessage()` converts SDK format to frontend format
7. React state updates, `ConversationView` renders messages

### Message Types (src/lib/types.ts)

- `TextMessage` - Markdown text content
- `ToolUseMessage` - Tool invocation (name, id, input)
- `ToolResultMessage` - Tool result (content, is_error)
- `ThinkingMessage` - Claude's thinking process
- `ErrorMessage` - Error messages
- `StartMessage` - Session start (includes session_id)
- `EndMessage` - Conversation end (stop_reason)
- `UserMessage` - User's prompt

### WebSocket Hook (src/hooks/useWebSocket.ts)

- Connection states: `connecting`, `connected`, `disconnected`, `error`
- Auto-reconnection on disconnect (3-second interval)
- `isProcessing` flag tracks active response generation

### Tool Message Grouping

Consecutive tool_use/tool_result messages are grouped into collapsible "steps" for cleaner UI. Only the latest step is expanded by default.

## Session Storage

Sessions are stored in `~/.agentweb/sessions/<session-id>.json` with:
- Session metadata (id, name, created/updated timestamps)
- Full message history

## Server Features

- **Self-as-runtime**: Compiled binary can act as its own JavaScript runtime
- **Embedded assets**: React build embedded in compiled binary
- **Stdio mode**: NDJSON protocol for programmatic use

## Ports

- Development: 5173 (Vite) + 8888 (WebSocket proxy)
- Production: 8765 (all-in-one)
