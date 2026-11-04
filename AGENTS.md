# AGENTS.md

This repository is a **monorepo of small, self-contained tech demos**.

## Layout

- Each demo lives in `apps/<kebab-slug>/` and is fully self-contained: `bun install && bun run dev` must work from inside the demo directory with no other setup.
- `skills/` holds reusable agent skills (e.g. `skills/project-planning/SKILL.md`).
- `tracking/` holds bookkeeping files (e.g. `tracking/seen-bookmarks.json` for proposed/built demo ideas).

## Rules for agents

- Only touch `apps/` and `tracking/`. Do not modify repo-level config, other demos, or `skills/` unless explicitly asked.
- **Never create a new repository per demo.** All demos live here, each in its own `apps/<kebab-slug>/` directory.
- Follow `skills/project-planning/SKILL.md` when planning and building a demo: write `apps/<slug>/PLAN.md` first, then build the MVP.
- Every demo PR **must include at least one screenshot AND one video** of the running app, embedded in the PR description.
- Update `tracking/seen-bookmarks.json` when a demo is proposed or built.
