# agentweb Design Document - Phase 1

## Overview

agentweb is a web interface for the Claude Agent SDK. It replaces the Claude Code TUI with a browser-based UI, providing a more accessible and feature-rich experience for interacting with Claude agents.

## Goals

- Provide a browser-based UI for the Claude Agent SDK
- Support both web server mode and stdio mode for programmatic use
- Work locally and over SSH tunnels
- Simple, focused implementation

## Architecture

### Core Modes

1. **Web Server Mode** (default): `agentweb`
   - Starts Express server on port 8888
   - Serves React SPA
   - WebSocket endpoint for Agent SDK streaming

2. **Stdio Mode**: `agentweb --stdio`
   - JSON input on stdin
   - Agent SDK messages on stdout (NDJSON)
   - For programmatic use and piping

### Project Structure

```
agentweb/
  src/                      # React client code
    components/
      ConversationView.tsx  # Message list with auto-scroll
      MessageRenderer.tsx   # Switches on message type
      InputBox.tsx          # User input with submit
      FileViewer.tsx        # File diffs and edits
    hooks/
      useWebSocket.ts       # WebSocket connection management
    lib/
      types.ts              # Agent SDK message types
    App.tsx                 # Main component
    main.tsx                # Entry point
  server/                   # Node.js server code
    server.ts               # Web server (Express + WebSocket)
    stdio.ts                # Stdio mode
  docs/
    DESIGN.md               # This file
  dist/                     # Built client (generated)
  dist-server/              # Built server (generated)
```

## Components

### 1. Server (`server/server.ts`)

Express server with WebSocket support:

- Serves static React build from `dist/`
- WebSocket endpoint at root for Agent SDK streaming
- Handles single session at a time (simplest implementation)
- No authentication (rely on SSH tunnel or reverse proxy)

**WebSocket Protocol:**
- Client sends: `{ prompt: string, options?: AgentOptions }`
- Server streams: Agent SDK messages as JSON

### 2. Stdio Mode (`server/stdio.ts`)

Line-based JSON protocol:

- **Input**: One JSON object per line: `{ prompt: string, options?: AgentOptions }`
- **Output**: Agent SDK messages, one JSON object per line (NDJSON)

### 3. React Client

**Components:**

- `ConversationView`: Scrollable list of messages with auto-scroll to bottom
- `MessageRenderer`: Renders different message types (text, tool_use, tool_result, thinking)
- `InputBox`: Text input with submit button, handles Enter key
- `FileViewer`: Syntax highlighting for code, diff view for edits

**Hooks:**

- `useWebSocket`: Manages WebSocket connection, message state, and sending

**Types:**

- SDK message types matching Claude Agent SDK output

## Build Configuration

### Scripts

- `npm run dev` - Start Vite dev server for client
- `npm run build` - Build client with Vite
- `npm run build:server` - Compile server TypeScript
- `npm start` - Run production server
- `npm run start:stdio` - Run stdio mode
- `npm test` - Run unit tests
- `npm run lint` - Run ESLint

### TypeScript Configuration

- `tsconfig.json` - Base config for client (Vite/React)
- `tsconfig.server.json` - Server-specific config (Node.js)

## Usage

### Development

```bash
# Install dependencies
npm install

# Start dev server (client only)
npm run dev

# Build everything
npm run build && npm run build:server

# Start production server
npm start
```

### Production

```bash
npm install -g agentweb
agentweb
# Opens http://localhost:8888
```

### Remote via SSH

```bash
ssh -L 8888:localhost:8888 user@remote agentweb
# Access locally at http://localhost:8888
```

### Stdio Mode

```bash
echo '{"prompt":"Hello"}' | agentweb --stdio
```

## Testing

- Unit tests with Vitest
- Tests for server logic, React components, and hooks
- CI runs tests, linting, and type checking

## CI/CD

GitHub Actions workflow:

1. Install dependencies
2. Run linting
3. Run type checking
4. Run unit tests
5. Build client and server

## Security Considerations

- No built-in authentication
- Intended for local use or behind SSH tunnel/reverse proxy
- WebSocket accepts connections from any origin (CORS not restricted)

## Future Phases

See full design document for Phase 2 (Electron Desktop App) and Phase 3 (Hierarchical Orchestration).
