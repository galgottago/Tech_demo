# PLAN — offline-ai-chat

## Goal

A chat app that runs an LLM **fully in the browser** via WebGPU and keeps working with **no internet**, on desktop Chrome and an Android phone (Pixel, Chrome). The model-loading + chat engine lives in a small, clean module separate from the UI so the owner can reuse it in her own product.

## MVP + outs

**MVP (one vertical slice):**

- Pick a model from a short list of small, mobile-friendly WebLLM prebuilt models; default to the smallest.
- Download the model with visible progress; weights are cached by the browser (WebLLM uses the Cache API), so later loads work offline.
- Chat with streaming responses, a stop button, and a clear-chat action.
- PWA with a service worker so the app shell itself loads offline and is installable on Android.
- Online/offline badge driven by `navigator.onLine` + `online`/`offline` events.
- Graceful full-screen message when WebGPU is unavailable.
- Mobile-first layout.

**Out of scope (outs):**

- Auth, backend, file uploads, chat history sync/persistence, multi-conversation management, markdown rendering of responses, model fine-tuning or custom models.

## Tasks (vertical slices)

1. Scaffold Vite + React + TypeScript via `bunx create-vite`, add `bunfig.toml` (install cooldown) **before any install**, install deps, app runs.
2. Tailwind + shadcn/ui (minimal preset); add only the components needed (button, select, card, badge, textarea, progress).
3. Reusable engine module (`src/lib/llm/`): WebLLM running in a Web Worker, typed API for `load(model, onProgress)`, `chat(messages, onToken)`, `abort()`, `reset()`. No React imports in this module.
4. Chat UI wired to the engine: model picker, download progress, streaming messages, stop, clear, WebGPU-unsupported state.
5. Online/offline badge.
6. PWA via `vite-plugin-pwa`: precache the app shell, installable manifest.
7. Validate: build, run, capture screenshots + video (desktop + mobile viewport).

## Stack

- **Bun** — repo-standard runtime/package manager.
- **Vite + React + TypeScript** — official scaffold, boring default for a small SPA.
- **@mlc-ai/web-llm** — mature in-browser WebGPU LLM runtime with a prebuilt model list and built-in weight caching.
- **Web Worker** — keeps model inference off the main thread so the UI stays responsive on a phone.
- **shadcn/ui + Tailwind** — repo-standard minimal component kit; components added on demand.
- **vite-plugin-pwa** — boring default for service worker + manifest; precaches the shell for offline loads.

## Deferred

- Persisting chat history (localStorage/IndexedDB) — easy to add later, not needed to prove the demo.
- Markdown/code rendering in responses — plain text is fine for MVP.
- Model deletion / cache management UI — browser devtools can clear the cache.
- Tests — no critical pure logic beyond what WebLLM provides; the engine module is a thin typed wrapper validated by running the app.
