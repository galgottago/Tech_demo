import { createStore, del, get, set } from 'idb-keyval'
import type { ChatMessage } from '@/lib/llm/types'

/**
 * Offline persistence (IndexedDB via idb-keyval): chat history and the
 * user's saved memories survive reloads with no network at all.
 */

export interface MemoryItem {
  id: string
  text: string
  createdAt: number
}

const store = createStore('baddie-ai', 'state')

const MESSAGES_KEY = 'chat-messages'
const MEMORIES_KEY = 'memories'

export async function loadMessages(): Promise<ChatMessage[]> {
  return (await get<ChatMessage[]>(MESSAGES_KEY, store)) ?? []
}

export async function saveMessages(messages: ChatMessage[]): Promise<void> {
  await set(MESSAGES_KEY, messages, store)
}

export async function clearMessages(): Promise<void> {
  await del(MESSAGES_KEY, store)
}

export async function loadMemories(): Promise<MemoryItem[]> {
  return (await get<MemoryItem[]>(MEMORIES_KEY, store)) ?? []
}

export async function saveMemories(memories: MemoryItem[]): Promise<void> {
  await set(MEMORIES_KEY, memories, store)
}

export function newMemory(text: string): MemoryItem {
  return { id: crypto.randomUUID(), text, createdAt: Date.now() }
}
