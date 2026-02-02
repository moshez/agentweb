#!/usr/bin/env node

const args = process.argv.slice(2)

if (args.includes('--stdio') || args.includes('-s')) {
  // Stdio mode
  import('../dist-server/stdio.js')
} else if (args.includes('--help') || args.includes('-h')) {
  console.log(`
agentweb - Web interface for the Claude Agent SDK

Usage:
  agentweb [options]

Options:
  --stdio, -s    Run in stdio mode (JSON input/output)
  --help, -h     Show this help message
  --version, -v  Show version

Examples:
  agentweb                              Start web server on port 8888
  echo '{"prompt":"Hello"}' | agentweb --stdio   Use stdio mode
  PORT=3000 agentweb                    Start on custom port
`)
} else if (args.includes('--version') || args.includes('-v')) {
  import('../package.json', { assert: { type: 'json' } })
    .then((pkg) => console.log(pkg.default.version))
    .catch(() => console.log('0.1.0'))
} else {
  // Web server mode (default)
  import('../dist-server/server.js').then((module) => {
    module.startServer()
  })
}
