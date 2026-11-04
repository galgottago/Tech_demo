import type { ModelOption } from './types'

/**
 * Small, mobile-friendly models from WebLLM's prebuilt list
 * (all flagged `low_resource_required`), ordered smallest first.
 */
export const MODEL_OPTIONS: ModelOption[] = [
  {
    id: 'SmolLM2-360M-Instruct-q4f16_1-MLC',
    label: 'SmolLM2 360M (smallest)',
    vramMB: 376,
  },
  {
    id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
    label: 'Llama 3.2 1B',
    vramMB: 879,
  },
  {
    id: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
    label: 'Qwen2.5 0.5B',
    vramMB: 945,
  },
  {
    id: 'SmolLM2-1.7B-Instruct-q4f16_1-MLC',
    label: 'SmolLM2 1.7B',
    vramMB: 1774,
  },
]

export const DEFAULT_MODEL_ID = MODEL_OPTIONS[0].id
