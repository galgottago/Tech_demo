import { useState } from 'react'
import { PlusIcon, Trash2Icon, XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { MemoryItem } from '@/lib/storage'

interface MemoryPanelProps {
  memories: MemoryItem[]
  onAdd: (text: string) => void
  onDelete: (id: string) => void
  onClose: () => void
}

/**
 * Slide-over panel for the user's saved memories. Memories are persisted
 * in IndexedDB and injected into the model's system prompt on every chat.
 */
export function MemoryPanel({ memories, onAdd, onDelete, onClose }: MemoryPanelProps) {
  const [draft, setDraft] = useState('')

  function add() {
    const text = draft.trim()
    if (!text) return
    onAdd(text)
    setDraft('')
  }

  return (
    <div className="absolute inset-0 z-20 flex justify-end bg-black/40" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-sm flex-col border-l bg-background shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">Memory</h2>
            <p className="text-xs text-muted-foreground">
              Saved on this device, fed into every chat.
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close memory panel">
            <XIcon className="size-4" />
          </Button>
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto p-4">
          {memories.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No memories yet. Add things the assistant should always know, e.g. &ldquo;My
              favorite color is teal&rdquo;.
            </p>
          )}
          {memories.map((m) => (
            <div key={m.id} className="flex items-start gap-2 rounded-lg border p-3">
              <p className="flex-1 whitespace-pre-wrap text-sm">{m.text}</p>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 shrink-0"
                onClick={() => onDelete(m.id)}
                aria-label="Delete memory"
              >
                <Trash2Icon className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
        <div className="flex items-end gap-2 border-t p-3">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                add()
              }
            }}
            placeholder="Add a memory…"
            rows={1}
            className="max-h-24 min-h-10 flex-1 resize-none"
          />
          <Button size="icon" onClick={add} disabled={!draft.trim()} aria-label="Add memory">
            <PlusIcon className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
