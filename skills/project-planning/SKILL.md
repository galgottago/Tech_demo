# Project Planning Skill — MVP First

Use this skill when planning any new demo or project in this repo. The output of planning is a `PLAN.md` in the project directory, written **before** any code.

## Core rules

1. **Build for one user.** The owner is the only user. No auth, no multi-tenancy, no scale concerns, no analytics. If a feature only matters with many users, cut it.
2. **Bun everywhere.** Bun is the runtime and package manager (`bun install`, `bun run dev`, `bunx`). No npm/yarn/pnpm.
3. **Start from an official scaffold.** Bootstrap with the official generator via `bunx create-*` (e.g. `bunx create-vite`). Never hand-roll project structure that a scaffold provides.
4. **Supply-chain cooldown.** Every Bun project must contain a `bunfig.toml` with the following **before any install is run**:

   ```toml
   [install]
   minimumReleaseAge = 259200
   ```

   (3 days in seconds — newly published package versions are not installed until they've aged.)
5. **shadcn/ui, minimalist preset.** Use shadcn/ui for UI components, initialized with the minimal/neutral preset. Add components on demand (`bunx shadcn@latest add <component>`), never the whole library up front.
6. **Prefer prebuilt over bespoke.** Reach for an existing well-maintained library or platform feature before writing custom code. Custom code is a last resort.
7. **Boring defaults.** Default stack, default config, default styling conventions. Deviate only with a stated reason.
8. **Tests only for critical logic.** Test the parts that are hard to verify by eye (core algorithms, data transforms). No test ceremony for UI glue.
9. **Git hooks only for formatting/fast checks.** Hooks may format and run fast lints. Never put slow builds or test suites in hooks.

## Plan structure

Every `PLAN.md` must contain, in order:

1. **Goal** — one or two sentences: what the demo proves, for whom.
2. **MVP + outs** — the smallest vertical slice that proves the goal, plus an explicit "out of scope" list (the "outs").
3. **Tasks** — ordered vertical-slice tasks. Each task ends with something runnable/visible, not a horizontal layer.
4. **Stack** — each technology choice with a one-line rationale.
5. **Deferred** — items consciously postponed, so they aren't relitigated mid-build.
