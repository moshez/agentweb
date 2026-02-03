// Type declarations for the auto-generated embedded-assets.ts module
// This file allows TypeScript to type-check code that imports embedded-assets
// even when the generated file doesn't exist yet (e.g., in CI before build)

export interface EmbeddedAsset {
  content: string
  contentType: string
}

export declare const embeddedAssets: Record<string, EmbeddedAsset>

export declare function getAsset(path: string): EmbeddedAsset | undefined

export declare function getIndexHtml(): EmbeddedAsset | undefined
