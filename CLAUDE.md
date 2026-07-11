# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A [Millennium](https://steambrew.app/) plugin that injects a CSrep.gg profile button into Steam community profile pages. It runs inside the Steam client using the Millennium framework.

## Commands

```bash
bun install           # install dependencies
bun run dev           # build for development (one-shot)
bun run watch         # rebuild on file changes
bun run build         # production build
```

There are no automated tests. The build does no type checking — run `npx tsc -p frontend/tsconfig.json --noEmit` (and `webkit/tsconfig.json`) separately to catch type errors.

## Architecture

The plugin is **webkit-only by design**: the button is injected by the webkit bundle, which runs inside the Steam community browser. The Plugin Database maintainers explicitly require this shape — an earlier revision had a CDP (Chrome DevTools Protocol) fallback injection path with a mode selector and status badge, and it was rejected for unnecessary complexity ("for a plugin like this, you'd simply need a webkit"). Do not reintroduce CDP injection, `window.MILLENNIUM_API` raw access, or custom-styled settings UI.

**`frontend/index.tsx`** — Millennium plugin entrypoint. Registers the plugin via `definePlugin` from `@steambrew/client` (the definition callback is async: it awaits `initSettings()` before returning the panel) and renders the settings panel (gear icon) using **Steam native components only** (`ToggleField`). The store review requires native components for settings UI.

**`frontend/services/settings.ts`** — settings store. Wraps the backend RPCs (`GetSettings` / `SaveSettings`) via `callable` from `@steambrew/client`, keeps an in-memory `cachedSettings`, and exposes `initSettings()` (load once on startup), `getSettings()` (synchronous read), and `saveSettings()` (optimistic update + persist, revert on failure).

**`webkit/index.tsx`** — the injection path. Runs inside the Steam community browser (`steamcommunity.com`): URL guard → read `openExternal` via `callable('GetSettings')` from `@steambrew/webkit` → call `csrepGgInjectMain(openExternal)`.

**`webkit/inject.ts`** — `csrepGgInjectMain(openExternal)`, vanilla DOM injection (React is not available in the community browser). A normal module with real imports.

**`backend/main.lua`** — Lua backend (`backendType: "lua"`). Signals `millennium.ready()` and exposes two frontend-callable RPCs, `GetSettings` (returns the raw `settings.json` contents, or `"{}"`) and `SaveSettings(settings_json)` (writes the string verbatim, returns `"1"`/`"0"`). It does **no JSON parsing** (the frontend does that). It resolves the plugin directory via Millennium's `utils` module — `require("utils").get_backend_path()` returns the absolute `backend/` directory (the reviewers require using this instead of `debug.getinfo` hacks) — and uses `utils.read_file` / `utils.write_file` for I/O. The two RPCs are declared as **global** functions, not `local` (see Key details).

## Store review rules (Plugin Database)

Learned from PluginDatabase PR reviews — do not violate these:

1. Backend must use the `utils` Lua module (`require("utils").get_backend_path()`) to resolve paths, not `debug.getinfo` hacks.
2. Never touch `window.MILLENNIUM_API` — import everything from `@steambrew/client` / `@steambrew/webkit`.
3. Settings UI must use Steam native components only (`ToggleField` etc.); no custom-styled divs, buttons, or badges.
4. No CDP injection machinery for simple button plugins. Webkit is the only injection path.

## Key details

- SteamID resolution order (inside `webkit/inject.ts`): `g_rgProfileData.steamid64` / `.steamid` → `data-miniprofile` attribute (converted via `BigInt('76561197960265728') + BigInt(accountId)`) → Steam profile XML fetch (`/?xml=1`)
- Do **not** use `g_steamID` — that is the logged-in user's ID, not the viewed profile
- The button links to `https://csrep.gg/player/{steamId64}`
- The `openExternal` flag (default `false`) controls whether the link opens in `steam://openurl_external/` or inline. If CSrep.gg is behind Cloudflare, `openExternal: true` avoids the in-app browser hitting a challenge wall.
- **Settings changes are NOT pushed to already-open profile pages.** The earlier CDP-based auto-reload was removed with the CDP path; the user reopens the profile page to see changes.
- Styles injected as `<style id="csrep-gg-style">` (idempotent guard prevents duplicates)
- **Lua callables must be GLOBAL functions.** This runtime resolves `callable('Name')` by global function name, not by the module's return table — `local function SaveSettings` (even if listed in the return table) fails with `Millennium Error: function not found: SaveSettings`. Lifecycle hooks (`on_load` etc.) still go in the return table.
- Idempotency guards: `.csrep-gg-container` (button) and `#csrep-gg-style` (styles)
- `types/*.lua` are editor-only stubs (`---@meta`) for the Lua modules Millennium preloads (`logger`, `millennium`, `utils`); keep them in sync if new module functions are used.
- `plugin.json` version must stay in sync with `package.json`; `scripts/sync-version.ts` does this
- `plugin.json` must include `"webkitApiVersion": "2.0.0"` — without it Millennium does not load the webkit bundle at all
- Build tool is `millennium-ttc` from `@steambrew/ttc`
