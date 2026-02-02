# agentweb

A web interface for the Claude Agent SDK. Provides a browser-based UI for interacting with Claude agents.

## Features

- Browser-based UI for Agent SDK interactions
- Real-time streaming via WebSocket
- Syntax highlighting for code blocks
- Markdown rendering
- Dark theme optimized for readability
- Stdio mode for programmatic use

## Installation

```bash
npm install
```

## Usage

### Development

```bash
# Start Vite dev server (client only)
npm run dev

# Build everything
npm run build:all

# Start production server
npm start
```

### Production

```bash
# Build and start
npm run build:all
npm start

# Server runs at http://localhost:8888
```

### Custom Port

```bash
PORT=3000 npm start
```

### Stdio Mode

For programmatic use, run in stdio mode:

```bash
echo '{"prompt":"Hello"}' | npm run start:stdio
```

Protocol:
- Input: JSON objects, one per line: `{"prompt": "...", "options": {...}}`
- Output: Agent SDK messages as NDJSON (one JSON object per line)

### Remote Access via SSH

```bash
ssh -L 8888:localhost:8888 user@remote npm start
# Access locally at http://localhost:8888
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Build client with Vite |
| `npm run build:server` | Compile server TypeScript |
| `npm run build:all` | Build both client and server |
| `npm start` | Start production server |
| `npm run start:stdio` | Start in stdio mode |
| `npm test` | Run unit tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix ESLint issues |
| `npm run typecheck` | Run TypeScript type checking |

## Project Structure

```
agentweb/
  src/                      # React client code
    components/             # UI components
    hooks/                  # React hooks
    lib/                    # Types and utilities
  server/                   # Node.js server code
    server.ts               # Express + WebSocket server
    stdio.ts                # Stdio mode
    query-handler.ts        # Agent SDK integration
  docs/                     # Documentation
  dist/                     # Built client (generated)
  dist-server/              # Built server (generated)
```

## Architecture

The application consists of:

1. **Express Server**: Serves the static React SPA and handles WebSocket connections
2. **WebSocket Endpoint**: Streams Agent SDK messages to the client
3. **React Client**: Renders messages with Markdown, syntax highlighting, and tool visualizations
4. **Stdio Mode**: Alternative interface for programmatic use

## Development

### Type Checking

```bash
npm run typecheck
```

### Linting

```bash
npm run lint
npm run lint:fix  # Auto-fix issues
```

### Testing

```bash
npm test              # Run once
npm run test:watch    # Watch mode
npm run test:coverage # With coverage
```

## License

MIT
