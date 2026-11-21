import * as THREE from 'three'

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const span = edge1 - edge0
  if (span <= 1e-6) return x >= edge1 ? 1 : 0
  const t = Math.min(1, Math.max(0, (x - edge0) / span))
  return t * t * (3 - 2 * t)
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export type V3 = [number, number, number]

export type CameraKey = {
  t: number
  pos: V3
  target: V3
  up: V3
}

/** Landscape path. Late keys stay inside the office, looking north into the mech room. */
export const desktopKeys: CameraKey[] = [
  { t: 0, pos: [0, 36, -0.25], target: [0, 0, 0], up: [0, 0, 1] },
  { t: 0.12, pos: [0, 28, -0.4], target: [0, 0, 0], up: [0, 0.25, 1] },
  { t: 0.24, pos: [4, 18, 6], target: [0, 0.6, 0], up: [0, 1, 0] },
  { t: 0.4, pos: [14, 8.4, 13], target: [0, 1.3, 0], up: [0, 1, 0] },
  { t: 0.5, pos: [16, 6.5, 0], target: [2, 1.5, -2], up: [0, 1, 0] },
  { t: 0.58, pos: [6, 3.4, -14], target: [0, 1.6, -2], up: [0, 1, 0] },
  { t: 0.68, pos: [0.1, 1.7, -12], target: [0.1, 1.55, 1], up: [0, 1, 0] },
  { t: 0.78, pos: [0.1, 1.7, -7.4], target: [0.1, 1.55, 2], up: [0, 1, 0] },
  { t: 0.88, pos: [0.08, 1.82, -3.6], target: [0, 1.7, 4.2], up: [0, 1, 0] },
  { t: 1, pos: [0.02, 2.08, -1.55], target: [0, 1.9, 4.55], up: [0, 1, 0] },
]

/**
 * Portrait path. The plan is rotated so the long side runs up the phone,
 * and the final camera sits further back so three tags fit a narrow view.
 */
export const portraitKeys: CameraKey[] = [
  { t: 0, pos: [0, 50, -0.3], target: [0, 0, 0], up: [1, 0, 0] },
  { t: 0.1, pos: [0, 44, -0.2], target: [0, 0, 0], up: [1, 0.2, 0] },
  { t: 0.22, pos: [2, 28, 4], target: [0, 0.4, 0], up: [0.2, 1, 0] },
  { t: 0.36, pos: [12, 18, 14], target: [0, 1, 0], up: [0, 1, 0] },
  { t: 0.5, pos: [24, 15, 20], target: [0, 1.2, 0], up: [0, 1, 0] },
  { t: 0.62, pos: [16, 7, -13], target: [0, 1.4, -1], up: [0, 1, 0] },
  { t: 0.74, pos: [0.1, 1.65, -9], target: [0, 1.5, 0], up: [0, 1, 0] },
  { t: 0.86, pos: [0.04, 1.75, -4.1], target: [0, 1.5, 3.4], up: [0, 1, 0] },
  { t: 1, pos: [0, 2.65, -2.7], target: [0, 1.5, 4.4], up: [0, 1, 0] },
]

export function fieldOfView(t: number, portrait: boolean): number {
  const start = portrait ? 36 : 24
  const end = portrait ? 56 : 48
  return lerp(start, end, smoothstep(0.08, 0.68, t))
}

function setV3(out: THREE.Vector3, a: V3, b: V3, u: number): void {
  out.set(lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u))
}

/** Piecewise blend. No spline overshoot, so the path stays outside the walls until the door. */
export function sampleKeys(
  keys: CameraKey[],
  t: number,
  pos: THREE.Vector3,
  target: THREE.Vector3,
  up: THREE.Vector3,
): void {
  const clamped = Math.min(Math.max(t, keys[0].t), keys[keys.length - 1].t)
  let i = 0
  while (i < keys.length - 2 && clamped > keys[i + 1].t) i += 1
  const a = keys[i]
  const b = keys[i + 1]
  const u = smoothstep(0, 1, (clamped - a.t) / Math.max(1e-5, b.t - a.t))
  setV3(pos, a.pos, b.pos, u)
  setV3(target, a.target, b.target, u)
  setV3(up, a.up, b.up, u)
  if (up.lengthSq() < 1e-8) up.set(0, 1, 0)
  else up.normalize()
}

export type Phase = {
  title: string
  hint: string
  step: number
}

export function phaseFor(t: number): Phase {
  if (t < 0.18) return { title: 'Floor plan', hint: 'Scroll to extrude the plan', step: 0 }
  if (t < 0.52) return { title: 'Rising volume', hint: 'Walls leave the sheet', step: 1 }
  if (t < 0.78) return { title: 'Mechanical room', hint: 'Section cut into the mech room', step: 2 }
  return { title: 'Commissioning', hint: 'AHU-1  ·  VAV-1  ·  CH-1', step: 3 }
}
