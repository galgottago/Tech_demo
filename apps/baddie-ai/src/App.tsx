import { useEffect, useRef, useState } from 'react'
import {
  BrainIcon,
  DownloadIcon,
  RefreshCwIcon,
  SendIcon,
  SparklesIcon,
  SquareIcon,
  Trash2Icon,
  WifiIcon,
  WifiOffIcon,
  XIcon,
} from 'lucide-react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { MemoryPanel } from '@/components/memory-panel'
import { useOnline } from '@/hooks/use-online'
import { ChatEngine } from '@/lib/llm/engine'
import { availableModels, betterModel, defaultModel } from '@/lib/llm/models'
import type { ChatMessage, LoadProgress, ModelOption } from '@/lib/llm/types'
import {
  clearMessages,
  loadMemories,
  loadMessages,
  newMemory,
  saveMemories,
  saveMessages,
  type MemoryItem,
} from '@/lib/storage'

type EngineStatus = 'unsupported' | 'idle' | 'loading' | 'ready' | 'error'

function friendlyError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e)
  if (/device was lost|mapAsync|GPUBuffer|out of memory/i.test(msg)) {
    return 'The GPU ran out of memory while running this model. Reload the page and try the smallest model.'
  }
  return msg
}

function buildSystemPrompt(memories: MemoryItem[]): ChatMessage {
  let content =
    'You are Baddie AI, a helpful, concise assistant running fully inside the user\u2019s browser.'
  if (memories.length > 0) {
    content +=
      '\n\nThings to remember about the user:\n' + memories.map((m) => `- ${m.text}`).join('\n')
  }
  return { role: 'system', content }
}

function OnlineBadge() {
  const online = useOnline()
  return (
    <Badge variant={online ? 'secondary' : 'destructive'} className="gap-1">
      {online ? <WifiIcon className="size-3" /> : <WifiOffIcon className="size-3" />}
      {online ? 'Online' : 'Offline'}
    </Badge>
  )
}

// Checks for a newly deployed app shell while the browser is online.
function UpdateToast() {
  const online = useOnline()
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null)
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      registrationRef.current = registration ?? null
    },
  })

  // While online, look for a newly deployed shell. The waiting worker
  // surfaces as the "Update available" toast (registerType: 'prompt').
  useEffect(() => {
    if (!online) return
    const check = () => void registrationRef.current?.update()
    check()
    const id = window.setInterval(check, 20_000)
    return () => window.clearInterval(id)
  }, [online])

  if (!needRefresh) return null
  return (
    <div className="absolute inset-x-0 top-14 z-30 mx-auto flex w-fit items-center gap-2 rounded-lg border bg-background px-3 py-2 shadow-lg">
      <RefreshCwIcon className="size-4" />
      <span className="text-sm">Update available</span>
      <Button size="sm" onClick={() => void updateServiceWorker(true)}>
        Reload
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setNeedRefresh(false)}>
        Later
      </Button>
    </div>
  )
}

export default function App() {
  const engineRef = useRef<ChatEngine | null>(null)
  const online = useOnline()
  const [status, setStatus] = useState<EngineStatus>(() =>
    ChatEngine.isWebGPUAvailable() ? 'idle' : 'unsupported',
  )
  const [f16, setF16] = useState<boolean | null>(null)
  const [modelId, setModelId] = useState<string | null>(null)
  const [progress, setProgress] = useState<LoadProgress>({ progress: 0, text: '' })
  const [error, setError] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [memories, setMemories] = useState<MemoryItem[]>([])
  const [hydrated, setHydrated] = useState(false)
  const [memoryOpen, setMemoryOpen] = useState(false)
  const [upgradeDismissed, setUpgradeDismissed] = useState(false)
  const [input, setInput] = useState('')
  const [generating, setGenerating] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ChatEngine.isWebGPUAvailable()) return
    void ChatEngine.supportsF16().then((supported) => {
      setF16(supported)
      setModelId((current) => current ?? defaultModel(supported).id)
    })
  }, [])

  // Restore chat + memories once. Later edits are written back below.
  useEffect(() => {
    let cancelled = false
    void Promise.all([loadMessages(), loadMemories()]).then(([msgs, mems]) => {
      if (cancelled) return
      setMessages(msgs)
      setMemories(mems)
      setHydrated(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!hydrated) return
    const id = window.setTimeout(() => void saveMessages(messages), 300)
    return () => window.clearTimeout(id)
  }, [messages, hydrated])

  useEffect(() => {
    if (!hydrated) return
    const id = window.setTimeout(() => void saveMemories(memories), 300)
    return () => window.clearTimeout(id)
  }, [memories, hydrated])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages])

  function getEngine(): ChatEngine {
    engineRef.current ??= new ChatEngine()
    return engineRef.current
  }

  async function loadModel(id: string) {
    setModelId(id)
    setStatus('loading')
    setProgress({ progress: 0, text: 'Initializing\u2026' })
    try {
      await getEngine().load(id, setProgress)
      setStatus('ready')
      setUpgradeDismissed(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setStatus('error')
    }
  }

  async function send() {
    const text = input.trim()
    if (!text || generating || status !== 'ready') return
    setInput('')
    const history: ChatMessage[] = [...messages, { role: 'user', content: text }]
    setMessages([...history, { role: 'assistant', content: '' }])
    setGenerating(true)
    try {
      await getEngine().chat([buildSystemPrompt(memories), ...history], (token) => {
        setMessages((prev) => {
          const next = [...prev]
          const last = next[next.length - 1]
          next[next.length - 1] = { ...last, content: last.content + token }
          return next
        })
      })
    } catch (e) {
      setMessages((prev) => {
        const next = [...prev]
        next[next.length - 1] = { role: 'assistant', content: `Error: ${friendlyError(e)}` }
        return next
      })
    } finally {
      setGenerating(false)
    }
  }

  function stop() {
    getEngine().abort()
  }

  async function clearChat() {
    setMessages([])
    await clearMessages()
    await getEngine().reset()
  }

  const models: ModelOption[] = f16 === null ? [] : availableModels(f16)
  const selectedModel = models.find((m) => m.id === modelId)
  const upgrade = f16 === null || modelId === null || upgradeDismissed ? null : betterModel(modelId, f16)
  const showUpgrade = status === 'ready' && online && upgrade !== null

  return (
    <div className="relative flex h-dvh flex-col bg-background text-foreground">
      <header className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <SparklesIcon className="size-5" />
          <h1 className="text-sm font-semibold">Baddie AI</h1>
        </div>
        <div className="flex items-center gap-1.5">
          <OnlineBadge />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMemoryOpen(true)}
            aria-label="Open memory panel"
          >
            <BrainIcon className="size-4" />
          </Button>
          {status === 'ready' && (
            <Button variant="ghost" size="icon" onClick={clearChat} aria-label="Clear chat">
              <Trash2Icon className="size-4" />
            </Button>
          )}
        </div>
      </header>

      <UpdateToast />

      {status === 'unsupported' && (
        <main className="flex flex-1 items-center justify-center p-6">
          <div className="max-w-sm space-y-2 text-center">
            <h2 className="text-lg font-semibold">WebGPU not available</h2>
            <p className="text-sm text-muted-foreground">
              Baddie AI runs a language model on your device and needs WebGPU. Use a recent
              version of Chrome (desktop or Android). On some devices you may need to enable
              it at <code className="font-mono">chrome://flags/#enable-unsafe-webgpu</code>.
            </p>
          </div>
        </main>
      )}

      {(status === 'idle' || status === 'loading' || status === 'error') && (
        <main className="flex flex-1 items-center justify-center p-6">
          <div className="w-full max-w-sm space-y-4">
            <div className="space-y-1 text-center">
              <h2 className="text-lg font-semibold">Pick a model</h2>
              <p className="text-sm text-muted-foreground">
                The model runs entirely in your browser. It downloads once and is cached, so
                later loads work with no internet.
              </p>
            </div>
            {modelId === null ? (
              <p className="text-center text-sm text-muted-foreground">Checking your GPU&hellip;</p>
            ) : (
              <>
                <Select
                  value={modelId}
                  onValueChange={(v) => {
                    if (v) setModelId(v)
                  }}
                  disabled={status === 'loading'}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {(value: string | null) => {
                        const model = models.find((m) => m.id === value)
                        return model ? `${model.label} (~${model.vramMB} MB)` : 'Choose a model'
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {models.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.label} (~{m.vramMB} MB)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {status === 'loading' ? (
                  <div className="space-y-2">
                    <Progress value={progress.progress * 100} />
                    <p className="truncate text-xs text-muted-foreground" title={progress.text}>
                      {progress.text || 'Starting\u2026'}
                    </p>
                  </div>
                ) : (
                  <Button className="w-full" onClick={() => void loadModel(modelId)}>
                    <DownloadIcon className="size-4" />
                    Load {selectedModel?.label}
                  </Button>
                )}
                {status === 'error' && (
                  <p className="text-sm text-destructive" role="alert">
                    Failed to load model: {error}
                  </p>
                )}
                {hydrated && messages.length > 0 && (
                  <p className="text-center text-xs text-muted-foreground">
                    {messages.length} saved message{messages.length === 1 ? '' : 's'} will come
                    back after the model loads.
                  </p>
                )}
              </>
            )}
          </div>
        </main>
      )}

      {status === 'ready' && (
        <>
          {showUpgrade && upgrade && (
            <div className="flex items-center gap-2 border-b bg-muted/50 px-4 py-2">
              <SparklesIcon className="size-4 shrink-0" />
              <p className="flex-1 text-xs">
                You&rsquo;re online &mdash; {upgrade.label} (~{upgrade.vramMB} MB) gives better
                answers than {selectedModel?.label}.
              </p>
              <Button size="sm" variant="outline" onClick={() => void loadModel(upgrade.id)}>
                Switch
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="size-7"
                onClick={() => setUpgradeDismissed(true)}
                aria-label="Dismiss"
              >
                <XIcon className="size-3.5" />
              </Button>
            </div>
          )}
          <div ref={scrollRef} className="flex-1 overflow-y-auto">
            <div className="mx-auto flex max-w-2xl flex-col gap-3 p-4">
              {messages.length === 0 && (
                <p className="mt-10 text-center text-sm text-muted-foreground">
                  {selectedModel?.label} is ready. Everything you type stays on this device
                  &mdash; try turning off your internet.
                </p>
              )}
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={
                    m.role === 'user'
                      ? 'ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2 text-sm text-primary-foreground'
                      : 'mr-auto max-w-[85%] whitespace-pre-wrap text-sm leading-relaxed'
                  }
                >
                  {m.content || (generating && i === messages.length - 1 ? '\u2026' : '')}
                </div>
              ))}
            </div>
          </div>
          <footer className="border-t p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <form
              className="mx-auto flex max-w-2xl items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                void send()
              }}
            >
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    void send()
                  }
                }}
                placeholder="Message…"
                rows={1}
                className="max-h-32 min-h-10 flex-1 resize-none"
              />
              {generating ? (
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  onClick={stop}
                  aria-label="Stop generating"
                >
                  <SquareIcon className="size-4" />
                </Button>
              ) : (
                <Button type="submit" size="icon" disabled={!input.trim()} aria-label="Send">
                  <SendIcon className="size-4" />
                </Button>
              )}
            </form>
          </footer>
        </>
      )}

      {memoryOpen && (
        <MemoryPanel
          memories={memories}
          onAdd={(text) => setMemories((prev) => [...prev, newMemory(text)])}
          onDelete={(id) => setMemories((prev) => prev.filter((m) => m.id !== id))}
          onClose={() => setMemoryOpen(false)}
        />
      )}
    </div>
  )
}
