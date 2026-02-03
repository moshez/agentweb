/**
 * CLI Extractor for compiled Bun binaries
 *
 * When running as a compiled Bun binary, the Claude Agent SDK's cli.js is embedded
 * in Bun's virtual filesystem (/$bunfs/). Child processes can't access this virtual
 * filesystem, so we need to extract the CLI to a real file on disk.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, chmodSync, symlinkSync, unlinkSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'
import { createHash } from 'crypto'

// Cache for the bin directory containing our runtime symlink
let runtimeBinDir: string | undefined

// Cache the extracted path to avoid re-extracting on every query
let extractedCliPath: string | undefined

/**
 * Check if we're running as a compiled Bun binary
 */
export function isCompiledBinary(): boolean {
  // Bun compiled binaries have __dirname paths starting with /$bunfs/
  // This is the most reliable indicator
  if (import.meta.dirname?.startsWith('/$bunfs')) {
    return true
  }

  // Also check if Bun.version exists and we're not in node_modules
  // This helps detect compiled binaries on systems where the path might differ
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
  const isBunRuntime = typeof (globalThis as any).Bun !== 'undefined'
  if (!isBunRuntime) {
    return false
  }

  // In a compiled binary, the SDK won't be in a normal node_modules path
  const distPath = path.join(import.meta.dirname ?? '.', '../dist')
  return !existsSync(distPath)
}

/**
 * Get the path to the Claude Agent SDK CLI
 *
 * If running as a compiled binary, this extracts the CLI to a temp file.
 * Otherwise, it returns undefined to let the SDK use its default detection.
 */
export function getClaudeCodeCliPath(): string | undefined {
  // If already extracted, return cached path
  if (extractedCliPath && existsSync(extractedCliPath)) {
    return extractedCliPath
  }

  // Not a compiled binary - let the SDK use its default detection
  if (!isCompiledBinary()) {
    return undefined
  }

  console.log('Running as compiled binary, extracting Claude Agent SDK CLI...')

  try {
    // The SDK's cli.js path - this works even in compiled binaries for reading
    const sdkCliPath = resolveSdkCliPath()
    if (!sdkCliPath) {
      console.error('Could not resolve Claude Agent SDK CLI path')
      return undefined
    }

    // Read the embedded CLI content
    const cliContent = readFileSync(sdkCliPath)

    // Create a hash of the content for cache invalidation
    const contentHash = createHash('md5').update(cliContent).digest('hex').substring(0, 8)

    // Create temp directory for extracted CLI
    const extractDir = path.join(tmpdir(), 'agentweb-cli')
    if (!existsSync(extractDir)) {
      mkdirSync(extractDir, { recursive: true })
    }

    // Write to a file with hash in name to handle updates
    extractedCliPath = path.join(extractDir, `claude-cli-${contentHash}.js`)

    if (!existsSync(extractedCliPath)) {
      writeFileSync(extractedCliPath, cliContent)
      chmodSync(extractedCliPath, 0o755)
      console.log(`Extracted Claude CLI to: ${extractedCliPath}`)
    }

    return extractedCliPath
  } catch (error) {
    console.error('Failed to extract Claude Agent SDK CLI:', error)
    return undefined
  }
}

/**
 * Resolve the path to the SDK's cli.js
 */
function resolveSdkCliPath(): string | undefined {
  try {
    // Try relative path first - this works in both compiled and non-compiled scenarios
    const relativePath = path.join(
      import.meta.dirname ?? '.',
      '../node_modules/@anthropic-ai/claude-agent-sdk/cli.js'
    )
    if (existsSync(relativePath)) {
      return relativePath
    }

    // Try using import.meta.resolve if available
    if (typeof import.meta.resolve === 'function') {
      try {
        const sdkModulePath = import.meta.resolve('@anthropic-ai/claude-agent-sdk')
        const sdkDir = path.dirname(sdkModulePath.replace('file://', ''))
        const cliPath = path.join(sdkDir, 'cli.js')

        if (existsSync(cliPath)) {
          return cliPath
        }
      } catch {
        // import.meta.resolve failed, continue to other methods
      }
    }

    // Try common node_modules locations
    const commonPaths = [
      path.join(process.cwd(), 'node_modules/@anthropic-ai/claude-agent-sdk/cli.js'),
      path.join(import.meta.dirname ?? '.', '../../node_modules/@anthropic-ai/claude-agent-sdk/cli.js'),
    ]

    for (const cliPath of commonPaths) {
      if (existsSync(cliPath)) {
        return cliPath
      }
    }

    console.error('Could not find Claude Agent SDK cli.js in any expected location')
    return undefined
  } catch (error) {
    console.error('Error resolving SDK CLI path:', error)
    return undefined
  }
}

/**
 * Clean up extracted CLI files on exit
 */
export function cleanupExtractedCli(): void {
  // Cleanup is optional - temp files will be cleaned up by OS eventually
  // We keep them around for reuse between restarts
}

// Track whether we've set up self as runtime
let usingSelfAsRuntime = false

/**
 * Get the JavaScript runtime for executing CLI
 *
 * When running as a compiled Bun binary, we always use the binary itself
 * as the runtime to ensure consistent behavior regardless of what's
 * installed on the user's system.
 */
export function getJsRuntime(): 'node' | 'bun' | undefined {
  // Not a compiled binary - let SDK auto-detect
  if (!isCompiledBinary()) {
    return undefined
  }

  // Always use self as runtime for compiled binaries
  // This ensures consistent behavior regardless of system node/bun versions
  if (!usingSelfAsRuntime) {
    setupSelfAsRuntime()
    usingSelfAsRuntime = true
  }
  return 'bun'
}

/**
 * Set up the compiled binary to act as its own runtime.
 * Creates a symlink named 'bun' pointing to our executable.
 */
function setupSelfAsRuntime(): void {
  if (runtimeBinDir) {
    return // Already set up
  }

  try {
    // Get path to our executable
    const execPath = process.execPath

    // Create temp bin directory
    runtimeBinDir = path.join(tmpdir(), 'agentweb-bin')
    if (!existsSync(runtimeBinDir)) {
      mkdirSync(runtimeBinDir, { recursive: true })
    }

    // Create symlink: bun -> our executable
    const bunLink = path.join(runtimeBinDir, 'bun')
    if (existsSync(bunLink)) {
      unlinkSync(bunLink)
    }
    symlinkSync(execPath, bunLink)
    console.log(`Created runtime symlink: ${bunLink} -> ${execPath}`)
  } catch (error) {
    console.error('Failed to set up self as runtime:', error)
  }
}

/**
 * Get environment variables for SDK execution.
 * If using self as runtime, prepends our bin directory to PATH.
 */
export function getRuntimeEnv(): Record<string, string> {
  const env = { ...process.env } as Record<string, string>

  if (usingSelfAsRuntime && runtimeBinDir) {
    // Prepend our bin directory to PATH so SDK finds our 'bun' symlink
    const currentPath = env.PATH || ''
    env.PATH = `${runtimeBinDir}${path.delimiter}${currentPath}`
  }

  return env
}
