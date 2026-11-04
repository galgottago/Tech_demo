# Baddie AI

Chat with an LLM running **fully in your browser** via WebGPU ([WebLLM](https://mlc.ai/web-llm/)). After the first model download, the chat keeps working with **no internet** — on desktop Chrome and Android Chrome (installable as a PWA). Chat history and saved memories stay on the device.

## Run

```sh
bun install
bun run dev
```

Open the printed URL in Chrome (desktop or Android). Pick a model (the smallest one your GPU can run is the default), let it download once, then chat — including offline.

`bun run build && bun run preview` serves the production build with the service worker. Use that to test offline loads, install, and the "Update available" toast.

## How it works

- `src/lib/llm/` — **reusable, UI-free engine**. `ChatEngine` wraps WebLLM in a Web Worker: `load` (with progress), streaming `chat`, `abort`, `reset`, `dispose`. Pass a `ToolRegistry` to reserve a tools/function-calling slot for a host app (handlers are not invoked yet — see `PLAN.md`).
- `src/lib/storage.ts` — chat messages and the memory list in IndexedDB (`idb-keyval`). Restored on reload, offline. Memories are appended to the system prompt.
- Model weights are cached by the browser (Cache API) on first download.
- `vite-plugin-pwa` (`registerType: 'prompt'`) precaches the app shell. When a newer shell is published and the browser is online, an **Update available** toast offers a reload.
- While online, if a stronger model in the built-in list fits this device, a banner offers to switch.
- Online/offline badge via `navigator.onLine` + `online`/`offline` events.
- If WebGPU is unavailable, the app shows an explanation instead of the chat.

## Requirements

- A browser with WebGPU (Chrome 113+ desktop, Chrome on Android 121+; recent Pixels work out of the box). q4f16 models need the `shader-f16` feature; otherwise the picker offers q4f32 builds. A software GPU (SwiftShader) can load the model and then lose the device during generation; a real GPU is required to actually chat.
- Roughly 0.4–1.8 GB of storage per model, depending on the model chosen.
