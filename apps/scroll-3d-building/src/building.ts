import * as THREE from 'three'
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js'
import { lerp, smoothstep } from './timeline.ts'

/** Meters. +X east, +Z north, +Y up. The sheet's north edge is the mechanical room. */
const T = 0.2
const WALL_H = 3.05
const FLOOR_TOP = 0.12
const INK_Y = FLOOR_TOP + 0.04

const SHEET = new THREE.Color('#123044')
const SHEET_MECH = new THREE.Color('#18384c')
const DAY_FLOOR = new THREE.Color('#d4cdc2')
const DAY_MECH = new THREE.Color('#3c444c')
const BLUEPRINT = new THREE.Color('#163848')
const WALL = new THREE.Color('#e7e2d8')
const WALL_IN = new THREE.Color('#f3f0e8')
const WALL_MECH = new THREE.Color('#d5dbe2')
const COLUMN = new THREE.Color('#c4beb4')
const DAY_BG = new THREE.Color('#c5d2df')
const NIGHT_BG = new THREE.Color('#071018')

type Opening = {
  at: number
  width: number
  sill: number
  height: number
  kind: 'door' | 'window'
}

type WallSpec = {
  axis: 'x' | 'z'
  fixed: number
  from: number
  to: number
  thickness: number
  height: number
  openings: Opening[]
  section?: boolean
}

const exteriorOpenings = {
  south: [
    { at: -4.3, width: 2.2, sill: 0.85, height: 1.2, kind: 'window' },
    { at: 0, width: 2.4, sill: 0, height: 2.4, kind: 'door' },
    { at: 4.6, width: 1.7, sill: 0.85, height: 1.2, kind: 'window' },
  ],
  north: [{ at: 0, width: 6.2, sill: 2.15, height: 0.62, kind: 'window' }],
  west: [
    { at: -3.3, width: 1.8, sill: 0.85, height: 1.2, kind: 'window' },
    { at: -0.5, width: 1.5, sill: 0.85, height: 1.2, kind: 'window' },
  ],
  east: [
    { at: -3.5, width: 1.6, sill: 0.85, height: 1.2, kind: 'window' },
    { at: -0.4, width: 1.4, sill: 0.85, height: 1.2, kind: 'window' },
  ],
} satisfies Record<string, Opening[]>

const walls: WallSpec[] = [
  { axis: 'x', fixed: -5.9, from: -7.8, to: 7.8, thickness: T, height: WALL_H, openings: exteriorOpenings.south },
  { axis: 'x', fixed: 5.9, from: -7.8, to: 7.8, thickness: T, height: WALL_H, openings: exteriorOpenings.north },
  { axis: 'z', fixed: -7.9, from: -6, to: 6, thickness: T, height: WALL_H, openings: exteriorOpenings.west },
  { axis: 'z', fixed: 7.9, from: -6, to: 6, thickness: T, height: WALL_H, openings: exteriorOpenings.east },
  {
    axis: 'z',
    fixed: 2,
    from: -5.8,
    to: 1.92,
    thickness: 0.16,
    height: WALL_H,
    openings: [{ at: -1, width: 1, sill: 0, height: 2.15, kind: 'door' }],
  },
  {
    axis: 'x',
    fixed: 2,
    from: -7.8,
    to: 7.8,
    thickness: 0.16,
    height: WALL_H,
    openings: [{ at: 0, width: 1.5, sill: 0, height: 2.25, kind: 'door' }],
    section: true,
  },
]

type Span = { from: number; to: number; opening?: Opening }

function spans(from: number, to: number, openings: Opening[]): Span[] {
  const sorted = openings.slice().sort((a, b) => a.at - b.at)
  const result: Span[] = []
  let cursor = from
  for (const opening of sorted) {
    const a = Math.max(from, opening.at - opening.width / 2)
    const b = Math.min(to, opening.at + opening.width / 2)
    if (b - a < 0.05) continue
    if (a - cursor > 0.04) result.push({ from: cursor, to: a })
    result.push({ from: a, to: b, opening })
    cursor = Math.max(cursor, b)
  }
  if (to - cursor > 0.04) result.push({ from: cursor, to })
  return result
}

function wallBox(
  parent: THREE.Object3D,
  spec: WallSpec,
  from: number,
  to: number,
  y0: number,
  height: number,
  thickness: number,
  mat: THREE.Material,
  shadow: boolean,
): void {
  const len = to - from
  const mid = (from + to) / 2
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(spec.axis === 'x' ? len : thickness, height, spec.axis === 'x' ? thickness : len),
    mat,
  )
  mesh.position.set(spec.axis === 'x' ? mid : spec.fixed, y0 + height / 2, spec.axis === 'x' ? spec.fixed : mid)
  mesh.castShadow = shadow
  mesh.receiveShadow = shadow
  parent.add(mesh)
}

function addWall(parent: THREE.Object3D, spec: WallSpec, mat: THREE.Material, glass: THREE.Material): void {
  for (const span of spans(spec.from, spec.to, spec.openings)) {
    if (!span.opening) {
      wallBox(parent, spec, span.from, span.to, 0, spec.height, spec.thickness, mat, true)
      continue
    }
    const opening = span.opening
    if (opening.sill > 0.02) {
      wallBox(parent, spec, span.from, span.to, 0, opening.sill, spec.thickness, mat, true)
    }
    const top = opening.sill + opening.height
    if (spec.height - top > 0.02) {
      wallBox(parent, spec, span.from, span.to, top, spec.height - top, spec.thickness, mat, true)
    }
    if (opening.kind === 'window') {
      const inset = 0.06
      wallBox(
        parent,
        spec,
        span.from + inset,
        span.to - inset,
        opening.sill + 0.03,
        Math.max(0.05, opening.height - 0.06),
        0.03,
        glass,
        false,
      )
    }
  }
}

function addInk(parent: THREE.Object3D, spec: WallSpec, thick: THREE.Material, thin: THREE.Material): void {
  for (const span of spans(spec.from, spec.to, spec.openings)) {
    if (!span.opening) {
      wallBox(parent, spec, span.from, span.to, INK_Y, 0.02, 0.055, thick, false)
      continue
    }
    if (span.opening.kind === 'window') {
      wallBox(parent, spec, span.from, span.to, INK_Y, 0.015, 0.018, thin, false)
    }
  }
}

function addSwing(
  parent: THREE.Object3D,
  hingeX: number,
  hingeZ: number,
  radius: number,
  a0: number,
  a1: number,
  mat: THREE.LineBasicMaterial,
): void {
  const points: THREE.Vector3[] = []
  const steps = 12
  for (let i = 0; i <= steps; i += 1) {
    const a = lerp(a0, a1, i / steps)
    points.push(new THREE.Vector3(hingeX + Math.cos(a) * radius, INK_Y, hingeZ + Math.sin(a) * radius))
  }
  parent.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), mat))
}

function box(
  parent: THREE.Object3D,
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  mat: THREE.Material,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
  mesh.position.set(x, y, z)
  mesh.castShadow = true
  mesh.receiveShadow = true
  parent.add(mesh)
  return mesh
}

function pipe(
  parent: THREE.Object3D,
  radius: number,
  length: number,
  x: number,
  y: number,
  z: number,
  axis: 'x' | 'y' | 'z',
  mat: THREE.Material,
): void {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 16), mat)
  if (axis === 'x') mesh.rotation.z = Math.PI / 2
  if (axis === 'z') mesh.rotation.x = Math.PI / 2
  mesh.position.set(x, y, z)
  mesh.castShadow = true
  parent.add(mesh)
}

function tag(code: string, name: string): HTMLDivElement {
  const el = document.createElement('div')
  el.className = 'tag'
  const codeEl = document.createElement('span')
  codeEl.className = 'code'
  codeEl.textContent = code
  const nameEl = document.createElement('span')
  nameEl.className = 'name'
  nameEl.textContent = name
  el.append(codeEl, nameEl)
  el.style.opacity = '0'
  return el
}

function room(text: string): HTMLDivElement {
  const el = document.createElement('div')
  el.className = 'room'
  el.textContent = text
  return el
}

function cssLabel(el: HTMLElement, x: number, y: number, z: number): CSS2DObject {
  const obj = new CSS2DObject(el)
  obj.position.set(x, y, z)
  return obj
}

function leader(a: THREE.Vector3, b: THREE.Vector3, mat: THREE.LineBasicMaterial): THREE.Line {
  return new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]), mat)
}

export type Building = {
  update: (t: number) => void
}

export function createBuilding(scene: THREE.Scene, renderer: THREE.WebGLRenderer): Building {
  const exteriorMat = new THREE.MeshStandardMaterial({ color: WALL, roughness: 0.92, metalness: 0 })
  const interiorMat = new THREE.MeshStandardMaterial({ color: WALL_IN, roughness: 0.9, metalness: 0 })
  const mechWallMat = new THREE.MeshStandardMaterial({ color: WALL_MECH, roughness: 0.88, metalness: 0 })
  const columnMat = new THREE.MeshStandardMaterial({ color: COLUMN, roughness: 0.75, metalness: 0.04 })
  const floorMat = new THREE.MeshStandardMaterial({ color: DAY_FLOOR, roughness: 1, metalness: 0 })
  const mechFloorMat = new THREE.MeshStandardMaterial({ color: DAY_MECH, roughness: 0.86, metalness: 0.08 })
  const glassMat = new THREE.MeshStandardMaterial({
    color: '#c5dcea',
    roughness: 0.05,
    metalness: 0.04,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
  const roofMat = new THREE.MeshStandardMaterial({
    color: '#b7b1a6',
    roughness: 0.82,
    metalness: 0.02,
    transparent: true,
    opacity: 0,
  })
  const inkMat = new THREE.MeshBasicMaterial({ color: '#9be7ff', transparent: true, toneMapped: false })
  const inkThin = new THREE.MeshBasicMaterial({
    color: '#d8f7ff',
    transparent: true,
    toneMapped: false,
    opacity: 0.85,
  })
  const arcMat = new THREE.LineBasicMaterial({ color: '#9be7ff', transparent: true, toneMapped: false })
  const wood = new THREE.MeshStandardMaterial({ color: '#b58962', roughness: 0.7, metalness: 0 })
  const steel = new THREE.MeshStandardMaterial({ color: '#aeb6bf', roughness: 0.38, metalness: 0.72 })
  const ahuBody = new THREE.MeshStandardMaterial({ color: '#d5dce3', roughness: 0.42, metalness: 0.4 })
  const ahuDark = new THREE.MeshStandardMaterial({ color: '#66717a', roughness: 0.48, metalness: 0.45 })
  const chillerMat = new THREE.MeshStandardMaterial({ color: '#4f738c', roughness: 0.38, metalness: 0.55 })
  const vavMat = new THREE.MeshStandardMaterial({ color: '#c6b59a', roughness: 0.5, metalness: 0.35 })
  const ductMat = new THREE.MeshStandardMaterial({ color: '#e7edf2', roughness: 0.36, metalness: 0.5 })
  const skid = new THREE.MeshStandardMaterial({ color: '#5c656e', roughness: 0.55, metalness: 0.4 })
  const pipeBlue = new THREE.MeshStandardMaterial({ color: '#2c74d8', roughness: 0.28, metalness: 0.65 })
  const pipeAmber = new THREE.MeshStandardMaterial({ color: '#d08a32', roughness: 0.32, metalness: 0.6 })
  const accent = new THREE.MeshStandardMaterial({
    color: '#e3a23a',
    emissive: '#e3a23a',
    emissiveIntensity: 0,
    roughness: 0.4,
    metalness: 0.3,
  })
  const groundMat = new THREE.MeshStandardMaterial({
    color: '#8e9894',
    roughness: 1,
    metalness: 0,
    transparent: true,
    opacity: 0,
  })
  const padMat = new THREE.MeshStandardMaterial({
    color: '#b7b2a8',
    roughness: 0.95,
    metalness: 0,
    transparent: true,
    opacity: 0,
  })

  const ground = new THREE.Mesh(new THREE.CircleGeometry(48, 48), groundMat)
  ground.rotation.x = -Math.PI / 2
  ground.position.y = -0.06
  ground.receiveShadow = true
  scene.add(ground)

  const pad = new THREE.Mesh(new THREE.BoxGeometry(24, 0.04, 18), padMat)
  pad.position.y = 0.02
  pad.receiveShadow = true
  scene.add(pad)

  const floor = new THREE.Mesh(new THREE.BoxGeometry(16.5, FLOOR_TOP, 12.5), floorMat)
  floor.position.y = FLOOR_TOP / 2
  floor.receiveShadow = true
  scene.add(floor)

  const mechFloor = new THREE.Mesh(new THREE.BoxGeometry(15.5, 0.02, 3.7), mechFloorMat)
  mechFloor.position.set(0, FLOOR_TOP + 0.01, 3.95)
  mechFloor.receiveShadow = true
  scene.add(mechFloor)

  const grid = new THREE.GridHelper(40, 40, 0x2a6d86, 0x16384a)
  grid.position.y = 0.005
  const gridMat = grid.material
  const gridMats = Array.isArray(gridMat) ? gridMat : [gridMat]
  for (const mat of gridMats) {
    mat.transparent = true
    mat.toneMapped = false
  }
  scene.add(grid)

  const ink = new THREE.Group()
  const structure = new THREE.Group()
  structure.position.y = FLOOR_TOP
  const section = new THREE.Group()
  structure.add(section)
  for (const spec of walls) {
    addInk(ink, spec, inkMat, inkThin)
    if (spec.section) addWall(section, spec, mechWallMat, glassMat)
    else if (spec.axis === 'z' && spec.fixed === 2) addWall(structure, spec, interiorMat, glassMat)
    else addWall(structure, spec, exteriorMat, glassMat)
  }
  addSwing(ink, 1.2, -5.9, 2.4, Math.PI, Math.PI / 2, arcMat)
  addSwing(ink, 0.75, 2, 1.5, Math.PI, Math.PI / 2, arcMat)
  addSwing(ink, 2, -0.5, 1, -Math.PI / 2, -Math.PI, arcMat)
  scene.add(ink)

  for (const [x, z] of [
    [-6.3, -3.7],
    [-6.3, -0.6],
    [-6.3, 1.15],
    [6.3, -3.8],
    [6.3, -1.2],
  ] as const) {
    box(structure, 0.28, WALL_H, 0.28, x, WALL_H / 2, z, columnMat)
  }

  box(structure, 3.4, 0.07, 1.15, 0, 2.55, -6.75, exteriorMat)
  box(structure, 0.08, 2.5, 0.08, -1.55, 1.25, -7.05, exteriorMat)
  box(structure, 0.08, 2.5, 0.08, 1.55, 1.25, -7.05, exteriorMat)
  scene.add(structure)

  const roof = new THREE.Mesh(new THREE.BoxGeometry(16.7, 0.12, 12.7), roofMat)
  roof.position.y = FLOOR_TOP + WALL_H + 0.06
  roof.castShadow = true
  roof.receiveShadow = true
  scene.add(roof)

  const furniture = new THREE.Group()
  furniture.position.y = FLOOR_TOP
  box(furniture, 1.7, 0.74, 0.78, -4.7, 0.37, -2.5, wood)
  box(furniture, 1.45, 0.76, 0.66, 5.05, 0.38, -1.55, wood)
  scene.add(furniture)

  const equipment = new THREE.Group()
  equipment.position.y = FLOOR_TOP

  const ahu = new THREE.Group()
  ahu.position.set(0.15, 0, 4.4)
  box(ahu, 1.32, 0.1, 0.86, 0, 0.05, 0, skid)
  box(ahu, 1.2, 1.1, 0.76, 0, 0.65, 0, ahuBody)
  box(ahu, 0.62, 0.7, 0.03, 0, 0.72, 0.395, ahuDark)
  box(ahu, 1.2, 0.07, 0.78, 0, 0.46, 0, pipeBlue)
  box(ahu, 1.2, 0.045, 0.78, 0, 1.02, 0, accent)
  box(ahu, 0.46, 0.22, 0.38, 0.12, 1.31, 0, ductMat)
  equipment.add(ahu)

  const ch = new THREE.Group()
  ch.position.set(-1.25, 0, 4.55)
  box(ch, 1.02, 0.1, 0.68, 0, 0.05, 0, skid)
  box(ch, 0.9, 0.56, 0.56, 0, 0.38, 0, chillerMat)
  box(ch, 0.9, 0.045, 0.58, 0, 0.78, 0, accent)
  pipe(ch, 0.13, 0.34, -0.2, 0.95, 0.05, 'y', steel)
  pipe(ch, 0.13, 0.34, 0.2, 0.95, -0.05, 'y', steel)
  pipe(ch, 0.18, 0.05, 0, 1.16, 0, 'y', ahuDark)
  equipment.add(ch)

  const vav = new THREE.Group()
  vav.position.set(1.35, 2.02, 3.62)
  box(vav, 0.52, 0.3, 0.38, 0, 0, 0, vavMat)
  box(vav, 0.16, 0.1, 0.16, 0, 0.2, 0, ahuDark)
  box(vav, 0.08, 0.2, 0.26, 0.3, 0, 0, pipeAmber)
  box(vav, 0.54, 0.035, 0.4, 0, 0.16, 0, accent)
  equipment.add(vav)

  box(equipment, 0.34, 0.78, 0.28, 0.27, 1.83, 4.4, ductMat)
  box(equipment, 1.15, 0.26, 0.32, 0.82, 2.22, 4.4, ductMat)
  box(equipment, 0.3, 0.26, 0.85, 1.35, 2.22, 4.0, ductMat)

  pipe(equipment, 0.045, 3.9, -0.35, 2.15, 5.45, 'x', pipeBlue)
  pipe(equipment, 0.04, 3.9, -0.35, 2.4, 5.45, 'x', pipeAmber)
  pipe(equipment, 0.04, 1.15, -1.25, 1.45, 4.9, 'z', pipeBlue)
  pipe(equipment, 0.035, 1.05, -1.25, 1.55, 4.9, 'y', pipeBlue)
  pipe(equipment, 0.035, 0.7, -1.05, 2.05, 5.45, 'y', pipeAmber)

  scene.add(equipment)

  const leaderMat = (color: string): THREE.LineBasicMaterial =>
    new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0, toneMapped: false })
  const leaders = [
    leader(new THREE.Vector3(-1.25, FLOOR_TOP + 1.2, 4.55), new THREE.Vector3(-1.05, 2.55, 4.3), leaderMat('#e3a23a')),
    leader(new THREE.Vector3(0.15, FLOOR_TOP + 1.45, 4.4), new THREE.Vector3(0.1, 2.05, 3.75), leaderMat('#9be7ff')),
    leader(new THREE.Vector3(1.35, FLOOR_TOP + 2.2, 3.62), new THREE.Vector3(1.0, 2.85, 3.45), leaderMat('#e3a23a')),
  ]
  for (const line of leaders) scene.add(line)

  const equipTags = [
    { el: tag('CH-1', 'Chiller'), at: [-1.05, 2.55, 4.3] as const, start: 0.78 },
    { el: tag('AHU-1', 'Air handler'), at: [0.1, 2.05, 3.75] as const, start: 0.84 },
    { el: tag('VAV-1', 'VAV box'), at: [1.0, 2.85, 3.45] as const, start: 0.9 },
  ]
  for (const item of equipTags) scene.add(cssLabel(item.el, item.at[0], item.at[1], item.at[2]))

  const rooms = [
    cssLabel(room('Office'), -3.1, INK_Y + 0.05, -2.1),
    cssLabel(room('Lobby'), 5, INK_Y + 0.05, -2.1),
    cssLabel(room('Mech'), 0, INK_Y + 0.05, 4),
  ]
  for (const label of rooms) scene.add(label)

  const hemi = new THREE.HemisphereLight('#d7e6f4', '#8d8274', 0.15)
  scene.add(hemi)
  const sun = new THREE.DirectionalLight('#fff3e4', 0.08)
  sun.position.set(14, 18, 8)
  sun.castShadow = true
  const shadowSize = Math.min(window.innerWidth, window.innerHeight) < 800 ? 1024 : 2048
  sun.shadow.mapSize.set(shadowSize, shadowSize)
  sun.shadow.camera.near = 2
  sun.shadow.camera.far = 55
  sun.shadow.camera.left = -16
  sun.shadow.camera.right = 16
  sun.shadow.camera.top = 16
  sun.shadow.camera.bottom = -16
  sun.shadow.bias = -0.0004
  sun.shadow.normalBias = 0.04
  scene.add(sun)
  const fill = new THREE.DirectionalLight('#c9d8ea', 0)
  fill.position.set(-10, 8, -8)
  scene.add(fill)
  const mechLight = new THREE.PointLight('#fff1d2', 0, 14, 2)
  mechLight.position.set(0.2, 2.7, 4.1)
  scene.add(mechLight)
  const cool = new THREE.PointLight('#9ecbff', 0, 7, 2)
  cool.position.set(-1.2, 1.5, 4.5)
  scene.add(cool)

  scene.fog = new THREE.Fog(NIGHT_BG, 28, 78)
  scene.background = NIGHT_BG

  const bg = new THREE.Color()

  return {
    update(t: number) {
      const extrude = smoothstep(0.1, 0.46, t)
      const day = smoothstep(0.16, 0.5, t)
      const cut = smoothstep(0.64, 0.82, t)
      const lift = smoothstep(0.56, 0.74, t)
      const furnish = smoothstep(0.5, 0.64, t)
      const mix = smoothstep(0.14, 0.42, t)

      structure.scale.y = Math.max(extrude, 0.001)
      structure.visible = extrude > 0.015
      section.scale.y = Math.max(0.001, 1 - cut)
      furniture.scale.y = Math.max(furnish, 0.001)
      furniture.visible = furnish > 0.02
      equipment.visible = t > 0.54

      const roofOpacity = smoothstep(0.38, 0.5, t) * (1 - lift)
      roof.position.y = FLOOR_TOP + WALL_H + 0.06 + lift * 2.6
      roofMat.opacity = roofOpacity
      roofMat.depthWrite = roofOpacity > 0.85
      roof.visible = roofOpacity > 0.02

      exteriorMat.color.copy(BLUEPRINT).lerp(WALL, mix)
      interiorMat.color.copy(BLUEPRINT).lerp(WALL_IN, mix)
      mechWallMat.color.copy(BLUEPRINT).lerp(WALL_MECH, mix)
      columnMat.color.copy(BLUEPRINT).lerp(COLUMN, mix)
      floorMat.color.copy(SHEET).lerp(DAY_FLOOR, day)
      floorMat.emissive.copy(SHEET)
      floorMat.emissiveIntensity = lerp(0.9, 0, day)
      mechFloorMat.color.copy(SHEET_MECH).lerp(DAY_MECH, day)
      mechFloorMat.emissive.copy(SHEET_MECH)
      mechFloorMat.emissiveIntensity = lerp(0.75, 0, day)

      glassMat.opacity = 0.3 * mix
      inkMat.opacity = 1 - smoothstep(0.18, 0.36, t)
      inkThin.opacity = 0.85 * inkMat.opacity
      arcMat.opacity = inkMat.opacity
      ink.visible = inkMat.opacity > 0.02

      const gridOpacity = 1 - smoothstep(0.18, 0.46, t)
      for (const mat of gridMats) mat.opacity = gridOpacity
      grid.visible = gridOpacity > 0.02

      groundMat.opacity = day
      groundMat.transparent = day < 0.98
      ground.visible = day > 0.02
      padMat.opacity = smoothstep(0.22, 0.48, t)
      padMat.transparent = padMat.opacity < 0.98
      pad.visible = padMat.opacity > 0.02

      sun.intensity = lerp(0.05, 2.5, day)
      hemi.intensity = lerp(0.14, 0.78, day)
      fill.intensity = lerp(0, 0.55, day)
      const inside = smoothstep(0.6, 0.84, t)
      mechLight.intensity = lerp(0, 4.2, inside)
      cool.intensity = lerp(0, 1.6, inside)
      accent.emissiveIntensity = lerp(0, 0.55, smoothstep(0.8, 0.95, t))

      bg.copy(NIGHT_BG).lerp(DAY_BG, day)
      scene.background = bg
      if (scene.fog instanceof THREE.Fog) scene.fog.color.copy(bg)
      renderer.toneMappingExposure = lerp(1.12, 1.02, day)

      const roomOpacity = String(1 - smoothstep(0.2, 0.4, t))
      for (const label of rooms) {
        label.element.style.opacity = roomOpacity
      }
      equipTags.forEach((item, index) => {
        const fade = smoothstep(item.start, item.start + 0.08, t)
        item.el.style.opacity = String(fade)
        const mat = leaders[index].material
        if (mat instanceof THREE.LineBasicMaterial) mat.opacity = fade
      })
    },
  }
}
