# offline-ai-chat

Chat with an LLM running **fully in your browser** via WebGPU ([WebLLM](https://github.com/mlc-ai/web-llm)). After the first model download, everything works with **no internet** — on desktop Chrome and Android Chrome (installable as a PWA).

## Run

```sh
bun install
bun run dev
```

Open the printed URL in Chrome (desktop or Android). Pick a model (the smallest, SmolLM2 360M, is the default), let it download once, then chat — including offline.

`bun run build && bun run preview` serves the production build with the service worker, which is what you want for testing offline/PWA behavior.

## How it works

- `src/lib/llm/` — **reusable, UI-free engine module**: `ChatEngine` wraps WebLLM running in a Web Worker with a small typed API (`load` with progress, streaming `chat`, `abort`, `reset`, `dispose`). Drop this directory into another product to reuse it.
- Model weights are cached by the browser (Cache API) on first download, so later loads are offline.
- `vite-plugin-pwa` precaches the app shell, so the page itself also loads offline and installs on Android.
- Online/offline badge via `navigator.onLine` + `online`/`offline` events.
- If WebGPU is unavailable, the app shows a friendly explanation instead of the chat.

## Requirements

- A browser with WebGPU (Chrome 113+ desktop, Chrome on Android 121+; recent Pixels work out of the box).
- ~0.4–1.8 GB of storage per model, depending on the model chosen.
