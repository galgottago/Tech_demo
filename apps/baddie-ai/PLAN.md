# PLAN — baddie-ai

## Goal

**Baddie AI** is a chat app that runs an LLM **fully in the browser** via WebGPU and keeps working with **no internet**, on desktop Chrome and an Android phone (Pixel, Chrome). The model-loading + chat engine lives in a small, clean module separate from the UI so the owner can reuse it in her own product.

## MVP + outs

**MVP (one vertical slice):**

- Pick a model from a short list of small, mobile-friendly WebLLM prebuilt models; default to the smallest the device can run (f16 models only when `shader-f16` is available).
- Download the model with visible progress; weights are cached by the browser (WebLLM uses the Cache API), so later loads work offline.
- Chat with streaming responses, a stop button, and a clear-chat action.
- Persist the chat and a simple saved-notes ("memory") list in IndexedDB. Restore both on reload, fully offline. Feed saved memories into the system prompt. A Memory panel to view, add, and delete items.
- PWA with a service worker so the app shell itself loads offline and is installable on Android. `registerType: 'prompt'` with an "Update available" toast when a newer shell is deployed and the device is online.
- When online, if a stronger model in the list can run on this device, offer to switch to it.
- Online/offline badge driven by `navigator.onLine` + `online`/`offline` events.
- Graceful full-screen message when WebGPU is unavailable.
- Mobile-first layout. App title, PWA name, and header: **Baddie AI**.
- Engine accepts a tool registry (`ToolRegistry`) so a host app can plug in tools later. Registering tools does not change inference yet.

**Out of scope (outs):**

- Auth, backend, file uploads, cloud history sync, multi-conversation management, markdown rendering of responses, model fine-tuning or custom models, actually executing tool calls.

## Tasks (vertical slices)

1. Scaffold Vite + React + TypeScript via `bunx create-vite`, add `bunfig.toml` (install cooldown) **before any install**, install deps, app runs.
2. Tailwind + shadcn/ui (vega preset — the minimalist neutral option in current shadcn); add only the components needed (button, select, badge, textarea, progress).
3. Reusable engine module (`src/lib/llm/`): WebLLM running in a Web Worker, typed API for `load(model, onProgress)`, `chat(messages, onToken)`, `abort()`, `reset()`, plus a `ToolRegistry` accepted by the constructor. No React imports in this module.
4. Chat UI wired to the engine: model picker, download progress, streaming messages, stop, clear, WebGPU-unsupported state.
5. IndexedDB persistence (idb-keyval) for chat history and memories; Memory panel; memories injected into the system prompt.
6. Online/offline badge. While online, offer a stronger cached-list model and check for a new PWA shell ("Update available" toast).
7. PWA via `vite-plugin-pwa`: precache the app shell, installable manifest named Baddie AI.
8. Validate: build, run, capture screenshots + video (desktop + mobile viewport).

## Stack

- **Bun** — repo-standard runtime/package manager.
- **Vite + React + TypeScript** — official scaffold, boring default for a small SPA.
- **@mlc-ai/web-llm** — mature in-browser WebGPU LLM runtime with a prebuilt model list and built-in weight caching.
- **Web Worker** — keeps model inference off the main thread so the UI stays responsive on a phone.
- **idb-keyval** — tiny IndexedDB wrapper; chat and memories persist offline without a bespoke schema layer.
- **shadcn/ui + Tailwind** — repo-standard component kit; vega is the minimalist preset; components added on demand.
- **vite-plugin-pwa** — boring default for service worker + manifest; `prompt` mode so an update never reloads mid-chat.

## Deferred

- **Tool-call execution loop.** `ToolRegistry` (`src/lib/llm/tools.ts`) is the extension point: a host app registers tools (name, JSON-schema parameters, handler) on the engine. The prompting and tool-execution loop is not implemented, so registered tools are unused at inference time. Next step when a host needs it (for example BACnet point lookups): render the registry as a tool spec in the prompt, parse model tool calls, run handlers, and feed results back. No UI for tools until then.
- Markdown/code rendering in responses — plain text is fine for MVP.
- Model deletion / cache management UI — browser devtools can clear the cache.
- Tests — no critical pure logic beyond what WebLLM provides; the engine module is a thin typed wrapper validated by running the app.
