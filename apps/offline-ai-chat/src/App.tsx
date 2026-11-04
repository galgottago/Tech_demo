import { useEffect, useRef, useState } from 'react'
import { BotIcon, DownloadIcon, SendIcon, SquareIcon, Trash2Icon, WifiIcon, WifiOffIcon } from 'lucide-react'
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
import { useOnline } from '@/hooks/use-online'
import { ChatEngine } from '@/lib/llm/engine'
import { DEFAULT_MODEL_ID, MODEL_OPTIONS } from '@/lib/llm/models'
import type { ChatMessage, LoadProgress } from '@/lib/llm/types'

type EngineStatus = 'unsupported' | 'idle' | 'loading' | 'ready' | 'error'

const SYSTEM_PROMPT: ChatMessage = {
  role: 'system',
  content: 'You are a helpful, concise assistant running fully inside the user\u2019s browser.',
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

export default function App() {
  const engineRef = useRef<ChatEngine | null>(null)
  const [status, setStatus] = useState<EngineStatus>(() =>
    ChatEngine.isWebGPUAvailable() ? 'idle' : 'unsupported',
  )
  const [modelId, setModelId] = useState(DEFAULT_MODEL_ID)
  const [progress, setProgress] = useState<LoadProgress>({ progress: 0, text: '' })
  const [error, setError] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [generating, setGenerating] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages])

  function getEngine(): ChatEngine {
    engineRef.current ??= new ChatEngine()
    return engineRef.current
  }

  async function loadModel() {
    setStatus('loading')
    setProgress({ progress: 0, text: 'Initializing\u2026' })
    try {
      await getEngine().load(modelId, setProgress)
      setStatus('ready')
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
      await getEngine().chat([SYSTEM_PROMPT, ...history], (token) => {
        setMessages((prev) => {
          const next = [...prev]
          const last = next[next.length - 1]
          next[next.length - 1] = { ...last, content: last.content + token }
          return next
        })
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setMessages((prev) => [...prev, { role: 'assistant', content: `Error: ${msg}` }])
    } finally {
      setGenerating(false)
    }
  }

  function stop() {
    getEngine().abort()
  }

  async function clearChat() {
    setMessages([])
    await getEngine().reset()
  }

  const selectedModel = MODEL_OPTIONS.find((m) => m.id === modelId)

  return (
    <div className="flex h-dvh flex-col bg-background text-foreground">
      <header className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <BotIcon className="size-5" />
          <h1 className="text-sm font-semibold">Offline AI Chat</h1>
        </div>
        <div className="flex items-center gap-2">
          <OnlineBadge />
          {status === 'ready' && (
            <Button variant="ghost" size="icon" onClick={clearChat} aria-label="Clear chat">
              <Trash2Icon className="size-4" />
            </Button>
          )}
        </div>
      </header>

      {status === 'unsupported' && (
        <main className="flex flex-1 items-center justify-center p-6">
          <div className="max-w-sm space-y-2 text-center">
            <h2 className="text-lg font-semibold">WebGPU not available</h2>
            <p className="text-sm text-muted-foreground">
              This app runs a language model on your device and needs WebGPU. Use a recent
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
            <Select
              value={modelId}
              onValueChange={(v) => {
                if (v) setModelId(v)
              }}
              disabled={status === 'loading'}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODEL_OPTIONS.map((m) => (
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
              <Button className="w-full" onClick={loadModel}>
                <DownloadIcon className="size-4" />
                Load {selectedModel?.label}
              </Button>
            )}
            {status === 'error' && (
              <p className="text-sm text-destructive" role="alert">
                Failed to load model: {error}
              </p>
            )}
          </div>
        </main>
      )}

      {status === 'ready' && (
        <>
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
                <Button type="button" variant="destructive" size="icon" onClick={stop} aria-label="Stop generating">
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
    </div>
  )
}
