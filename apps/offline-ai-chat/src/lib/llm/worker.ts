import { WebWorkerMLCEngineHandler } from '@mlc-ai/web-llm'

// Runs the WebLLM engine inside a Web Worker so model loading and
// inference never block the UI thread.
const handler = new WebWorkerMLCEngineHandler()

self.onmessage = (msg: MessageEvent) => {
  handler.onmessage(msg)
}
