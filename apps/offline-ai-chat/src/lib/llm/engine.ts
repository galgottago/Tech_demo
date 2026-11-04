import { WebWorkerMLCEngine } from '@mlc-ai/web-llm'
import type { ChatMessage, LoadProgress } from './types'

/**
 * Framework-agnostic chat engine backed by WebLLM running in a Web Worker.
 *
 * Model weights are downloaded once and cached by the browser (Cache API),
 * so subsequent loads work fully offline. This module has no UI
 * dependencies and can be reused in other products as-is.
 */
export class ChatEngine {
  private engine: WebWorkerMLCEngine | null = null
  private loadedModelId: string | null = null
  private onProgress: ((p: LoadProgress) => void) | null = null

  /** WebGPU is required to run the model. */
  static isWebGPUAvailable(): boolean {
    return typeof navigator !== 'undefined' && 'gpu' in navigator
  }

  get currentModelId(): string | null {
    return this.loadedModelId
  }

  /**
   * Download (or restore from cache) and initialize a model.
   * Progress is reported via `onProgress` as a 0..1 fraction plus status text.
   */
  async load(modelId: string, onProgress?: (p: LoadProgress) => void): Promise<void> {
    this.onProgress = onProgress ?? null
    if (!this.engine) {
      this.engine = new WebWorkerMLCEngine(
        new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' }),
        {
          initProgressCallback: (report) => {
            this.onProgress?.({ progress: report.progress, text: report.text })
          },
        },
      )
    }
    await this.engine.reload(modelId)
    this.loadedModelId = modelId
  }

  /**
   * Stream a chat completion for the given message history.
   * Calls `onToken` for each generated token and resolves with the full text.
   */
  async chat(
    messages: ChatMessage[],
    onToken: (token: string) => void,
  ): Promise<string> {
    if (!this.engine || !this.loadedModelId) {
      throw new Error('No model loaded. Call load() first.')
    }
    const stream = await this.engine.chat.completions.create({
      messages,
      stream: true,
    })
    let full = ''
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content ?? ''
      if (delta) {
        full += delta
        onToken(delta)
      }
    }
    return full
  }

  /** Stop the in-flight generation (the chat() promise resolves with partial text). */
  abort(): void {
    void this.engine?.interruptGenerate()
  }

  /** Clear the engine-side conversation state. */
  async reset(): Promise<void> {
    await this.engine?.resetChat()
  }

  /** Tear down the worker and free GPU memory. */
  async dispose(): Promise<void> {
    await this.engine?.unload()
    this.engine = null
    this.loadedModelId = null
  }
}
