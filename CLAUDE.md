# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run start` — Vite dev server at http://localhost:8000/demo/ with `vite build --watch` running in parallel.
- `npm run build` — Production library build to `dist/` (ES module, sourcemaps).
- `npm run watch` — Library build in watch mode without dev server.
- `npm run types` — Regenerate `src/definition-schema.d.ts` from `src/definition-schema.json` via `json2ts` (requires `json-schema-to-typescript` installed globally or via `npx`; the script uses `cat | json2ts`).
- `npm run analyze` — Generate Custom Elements Manifest via `@custom-elements-manifest/analyzer --litelement`.
- `npm run release` — Build, regenerate types, `npm version patch` (no `v` tag prefix), push commits + tag. The pushed tag triggers `.github/workflows/build-publish.yml`, which publishes to npm and creates a GitHub Release.
- `npm run link` / `npm run unlink` — Local-link this package into the sibling `../RESWARM/frontend` project.
- No test runner is configured.
- Engines: Node `>=24.9.0`, npm `>=10.0.2`.

## Architecture

Single-component Lit 3 web component published as `@record-evolution/widget-switch` for the IronFlock platform. Renders one or more Material Design 3 toggle switches (`md-switch`) and emits action events to control IoT devices.

**Versioned custom element tag.** The source defines `@customElement('widget-switch-versionplaceholder')`. At build time, `@rollup/plugin-replace` (in `vite.config.ts`) replaces every `versionplaceholder` occurrence with the `version` string from `package.json`, yielding e.g. `widget-switch-1.1.3`. Consumers must use the version-suffixed tag — this lets multiple widget versions coexist on one page. The `version` instance field on `WidgetSwitch` is replaced the same way. Bumping the version (via `npm version` / `npm run release`) is what regenerates the tag; do not hardcode versions elsewhere.

**Build pipeline (`vite.config.ts`).** Library mode, single entry `src/widget-switch.ts`, ES output only. `lit`, `@lit/*`, and `@material/web/*` are externalized — the consumer (or an import map) must provide them. `@material/web` is a peerDependency for this reason. `tslib` is aliased to its ES build; browser conditions are forced.

**Data flow.**
1. Host sets the `inputData` property (shape defined by `src/definition-schema.json` → generated `src/definition-schema.d.ts`). The schema is the source of truth and drives the platform's config UI; regenerate the `.d.ts` after schema edits via `npm run types`.
2. `update()` / `firstUpdated()` calls `transformData()`, which pivots `inputData.dataseries` into a `Map<label, Dataseries>` (deduplicating duplicate labels by appending `-<idx>`) and computes each switch's initial `selected` via `isSelected()`.
3. `isSelected()` interprets `stateMap.on` / `stateMap.off`:
   - Operator prefixes `<=`, `<`, `>=`, `>` on `on` (or fallback `off`) drive numeric comparison.
   - Otherwise comma-separated value lists are matched as strings (quotes stripped).
   - Returns `undefined` for unknown — switch shows neutral.
4. `render()` renders each switch with `repeat()` keyed by label, attaching `actionApp` / `actionDevice` / `actionTopic` / `label` as Lit properties on the `md-switch` element.
5. On `change`, `handleActionSubmit()` dispatches a non-bubbling `action-submit` `CustomEvent` with `{ args, actionApp, actionDevice, actionTopic, label }` — the IronFlock host listens for this to invoke device actions.

**Theming.** `registerTheme()` reads CSS custom properties (`--re-text-color`, `--re-tile-background-color`, `--re-primary-color`) from the host and falls back to a `theme` property of shape `{ theme_name, theme_object }` (ECharts-like: `backgroundColor`, `title.textStyle.color`, `title.subtextStyle.color`, `color[0]`). Resolved values are pushed into `--switch-primary-color` / `--switch-text-color` which drive the `md-switch` Material tokens in the static styles. The default primary color is `#5470c6`.

**Demo (`demo/index.html`).** Imports the source TS directly, builds the version-suffixed tag at runtime from `package.json`, applies `demo/themes/light.json`, and randomizes `dataseries.0.data.0.value` every second via the external `ObjectRandomizer.js` from `storage.googleapis.com/reswarm-images`. Use this to exercise reactive updates locally.

**`applyData()` is currently a no-op** — kept as a hook for the resize-observer-driven layout pattern shared with sibling widgets in this repo.
