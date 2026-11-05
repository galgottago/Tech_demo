# PLAN — scroll-3d-building

## Goal

A single-page, scroll-driven site that turns a small commercial floor plan into a 3D building and lands the camera in the mechanical room, with commissioning-style equipment tags. It has to read clearly on a desktop monitor and on a Pixel-sized phone, with every mesh generated in code.

## MVP + outs

**MVP (one vertical slice):**

- Full-viewport Three.js scene over a tall scroll page. Scroll progress (smoothed, touch-friendly) drives the whole sequence. No click-path required.
- Opens as a flat architectural plan: glowing plan strokes, door swings, room names (Office, Lobby, Mech), dark drawing-sheet grid. Camera is high and nearly orthographic.
- Further scroll extrudes walls, columns, and the entry canopy up off the sheet, fades in real materials and daylight, and tilts the camera into a three-quarter view.
- The camera then flies in through the south entry. The roof lifts off and the mechanical-room partition lowers (a section cut) so the room reads on a narrow phone as well as on desktop.
- Inside that view, three code-built units are tagged as they fade in: **AHU-1** air handling unit, **VAV-1** variable air volume box, **CH-1** chiller, with ducts, pipes, and leader lines.
- A fixed HTML overlay (phase title, four-step rail, scroll hint, progress) stays readable on a 412px-wide screen. Safe-area padding included.
- GitHub Pages base comes from `VITE_BASE` (CI sets `/<repo>/scroll-3d-building/`). Local `bun run dev` stays at `/`.
- If WebGL cannot start, the page shows a plain message instead of a blank canvas.

**Out of scope (outs):**

- Imported GLTF/GLB/OBJ or any texture atlas. No auth, analytics, accounts, or backend. No shadcn chrome. No second floor, no live point data, no postprocessing stack, no tests for the render loop.

## Tasks (vertical slices)

1. Write this plan, add `bunfig.toml` with the install cooldown, scaffold Vite + TypeScript with `bunx create-vite --template vanilla-ts` (`--no-immediate`), then `bun install` and `bun add three`. `bun run dev` serves the scaffold.
2. Replace the scaffold page with a fixed WebGL canvas, scroll spacer, and overlay. Scroll progress updates a phase label. Empty scene, correct `VITE_BASE`.
3. Generate the plan and the extruded shell from one wall list (openings, glass, columns, floors, roof). Scroll 0 shows the flat plan; mid-scroll shows a solid building.
4. Add the mechanical room (AHU, VAV, chiller, duct, pipes) and the camera path from plan → three-quarter → section cut → equipment. Tags fade in at the end. Portrait and landscape use different late keyframes and field of view so all three tags fit.
5. Validate in a browser: real scroll changes the phase, `bun run build` succeeds, capture a screenshot and a scroll-through video.

## Stack

- **Bun** — repo runtime and package manager; `bunfig.toml` cooldown before install.
- **Vite + TypeScript (`vanilla-ts`)** — official `create-vite` scaffold. React is skipped because the page is one canvas plus a fixed overlay, not a component UI. The scaffold asked for Vite `^8.3.6`, which was still inside the 3-day install cooldown, so the range is `^8.3.5` (newest version the cooldown allows; same major as the scaffold).
- **Three.js (`WebGLRenderer`)** — maintained, code-only geometry, works on mobile WebGL. WebGPU is skipped so software GL and phones stay on the same path.
- **CSS2DRenderer (Three addons)** — sharp equipment and room labels in HTML, constant size on a phone. No extra UI kit.
- **Native scroll** — the document is the input. A little frame lerp smooths the camera. No scroll library.

## Deferred

- Equipment detail sheets (click a tag, read a point list). The tags are labels only.
- Multi-floor stack and a real reflected ceiling plan.
- Postprocessing (bloom, SSAO) and baked lighting.
- Tests — the sequence is visual; the only pure math is keyframe sampling, checked by scrubbing the page.
