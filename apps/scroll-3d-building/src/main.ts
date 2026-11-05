import './style.css'
import * as THREE from 'three'
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js'
import { createBuilding } from './building.ts'
import { desktopKeys, fieldOfView, phaseFor, portraitKeys, sampleKeys } from './timeline.ts'

const canvas = document.querySelector<HTMLCanvasElement>('#webgl')
const fallback = document.querySelector<HTMLElement>('#fallback')
const phaseEl = document.querySelector<HTMLElement>('#phase')
const hintEl = document.querySelector<HTMLElement>('#hint')
const fillEl = document.querySelector<HTMLElement>('#bar-fill')
const steps = [...document.querySelectorAll<HTMLElement>('#steps li')]

function fail(message: string): void {
  if (!fallback) return
  fallback.hidden = false
  fallback.textContent = message
}

if (!canvas || !phaseEl || !hintEl || !fillEl) {
  fail('This page is missing its canvas.')
} else {
  let renderer: THREE.WebGLRenderer
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    })
  } catch {
    fail('WebGL is not available in this browser.')
    throw new Error('WebGL unavailable')
  }

  if (!renderer.getContext()) {
    fail('WebGL is not available in this browser.')
  } else {
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.1
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(24, 1, 0.08, 200)
    const labels = new CSS2DRenderer()
    labels.domElement.id = 'labels'
    document.body.append(labels.domElement)

    const building = createBuilding(scene, renderer)
    const pos = new THREE.Vector3()
    const look = new THREE.Vector3()
    const up = new THREE.Vector3()

    const coarse = window.matchMedia('(pointer: coarse)').matches
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let locked: number | null = null
    let current = 0
    let last = performance.now()
    let ready = false

    const portrait = (): boolean => window.innerWidth / window.innerHeight < 0.9

    const resize = (): void => {
      const width = window.innerWidth
      const height = window.innerHeight
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, width < 800 ? 1.75 : 2))
      renderer.setSize(width, height, false)
      labels.setSize(width, height)
      camera.aspect = width / Math.max(1, height)
      camera.updateProjectionMatrix()
    }

    const scrollTarget = (): number => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      if (max <= 0) return 0
      return Math.min(1, Math.max(0, window.scrollY / max))
    }

    const render = (now: number): void => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const target = locked ?? scrollTarget()
      if (reduce || locked !== null) current = target
      else {
        const response = coarse ? 0.34 : 0.16
        const alpha = 1 - Math.pow(1 - response, dt * 60)
        current += (target - current) * alpha
        if (Math.abs(target - current) < 0.0004) current = target
      }

      const narrow = portrait()
      sampleKeys(narrow ? portraitKeys : desktopKeys, current, pos, look, up)
      camera.position.copy(pos)
      camera.up.copy(up)
      camera.lookAt(look)
      camera.fov = fieldOfView(current, narrow)
      camera.updateProjectionMatrix()
      building.update(current)

      const phase = phaseFor(current)
      if (phaseEl.textContent !== phase.title) phaseEl.textContent = phase.title
      if (hintEl.textContent !== phase.hint) hintEl.textContent = phase.hint
      fillEl.style.width = `${(current * 100).toFixed(2)}%`
      for (const step of steps) {
        const index = Number(step.dataset.step)
        step.classList.toggle('on', index === phase.step)
        step.classList.toggle('done', index < phase.step)
      }

      renderer.render(scene, camera)
      labels.render(scene, camera)
      if (!ready) {
        ready = true
        document.body.dataset.ready = '1'
      }
      requestAnimationFrame(render)
    }

    if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
    window.scrollTo(0, 0)
    resize()
    window.addEventListener('resize', resize)
    window.visualViewport?.addEventListener('resize', resize)

    const params = new URLSearchParams(location.search)
    if (params.has('capture')) {
      ;(window as Window & { __setScrollProgress?: (t: number) => void }).__setScrollProgress = (t: number) => {
        locked = Math.min(1, Math.max(0, t))
      }
    }

    requestAnimationFrame(render)
  }
}
