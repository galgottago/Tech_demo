export type ChatRole = 'system' | 'user' | 'assistant'

export interface ChatMessage {
  role: ChatRole
  content: string
}

export interface LoadProgress {
  /** 0..1 */
  progress: number
  /** Human-readable status, e.g. "Fetching param shard 3/24" */
  text: string
}

export interface ModelOption {
  id: string
  label: string
  /** Approximate VRAM needed at runtime, in MB. */
  vramMB: number
}
