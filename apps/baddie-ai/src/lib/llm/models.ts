import type { ModelOption } from './types'

/**
 * Small, mobile-friendly models from WebLLM's prebuilt list
 * (all flagged `low_resource_required`), ordered smallest first.
 *
 * q4f16 variants are smaller/faster but need the `shader-f16` WebGPU
 * feature; q4f32 variants run anywhere WebGPU runs. Filter with
 * `availableModels()` before showing them to the user.
 */
export const MODEL_OPTIONS: ModelOption[] = [
  {
    id: 'SmolLM2-360M-Instruct-q4f16_1-MLC',
    label: 'SmolLM2 360M',
    vramMB: 376,
    requiresF16: true,
  },
  {
    id: 'SmolLM2-360M-Instruct-q4f32_1-MLC',
    label: 'SmolLM2 360M (f32)',
    vramMB: 580,
    requiresF16: false,
  },
  {
    id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
    label: 'Llama 3.2 1B',
    vramMB: 879,
    requiresF16: true,
  },
  {
    id: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
    label: 'Qwen2.5 0.5B',
    vramMB: 945,
    requiresF16: true,
  },
  {
    id: 'Llama-3.2-1B-Instruct-q4f32_1-MLC',
    label: 'Llama 3.2 1B (f32)',
    vramMB: 1129,
    requiresF16: false,
  },
  {
    id: 'SmolLM2-1.7B-Instruct-q4f16_1-MLC',
    label: 'SmolLM2 1.7B',
    vramMB: 1774,
    requiresF16: true,
  },
]

/** Models usable on the current device, smallest first. */
export function availableModels(f16Supported: boolean): ModelOption[] {
  return MODEL_OPTIONS.filter((m) => f16Supported || !m.requiresF16)
}

/** Smallest usable model — the default. */
export function defaultModel(f16Supported: boolean): ModelOption {
  return availableModels(f16Supported)[0]
}

/** Higher is a stronger chat model. Used only for the online upgrade hint. */
function quality(model: ModelOption): number {
  if (model.id.startsWith('SmolLM2-1.7B')) return 4
  if (model.id.startsWith('Llama-3.2-1B')) return 3
  if (model.id.startsWith('Qwen2.5-0.5B')) return 2
  return 1
}

/**
 * A stronger model this device can run, or null when `currentId` is already
 * the best. The UI shows this only while online, because switching means
 * downloading new weights.
 */
export function betterModel(currentId: string, f16Supported: boolean): ModelOption | null {
  const models = availableModels(f16Supported)
  const current = models.find((m) => m.id === currentId)
  if (!current) return null
  const best = models.reduce((top, m) => (quality(m) > quality(top) ? m : top))
  return quality(best) > quality(current) ? best : null
}
