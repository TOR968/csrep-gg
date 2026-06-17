# CDP Migration Design — csrep-gg

## Goal

Replace the broken webkit-based injection with a CDP-based approach that mirrors `leetify-extension`, so the csrep-gg button appears correctly on Steam community profile pages.

## Why webkit doesn't work

In Millennium v3.2.0+, the webkit bundle executes inside `steamloopback.host` (Steam main UI), not inside `steamcommunity.com` (community browser). The two are separate CEF processes. `Millennium.findElement` and DOM manipulation in `webkit/index.tsx` cannot reach the profile page. CDP (`window.MILLENNIUM_API.ChromeDevToolsProtocol`) from the frontend context is the only bridge to the community browser.

## Architecture

Two active files only — everything else is deleted or stubbed.

### `frontend/index.tsx`

- Imports `INJECTION_CODE` from `./inject`
- Calls `setupCommunityInjection()` which:
  1. `Target.setDiscoverTargets({ discover: true })`
  2. Listens on `Target.targetCreated` / `Target.targetInfoChanged`
  3. Filters URLs matching `/steamcommunity\.com\/(id|profiles)\//`
  4. 200ms debounce per `targetId` (prevents double-injection from rapid events)
  5. `Target.attachToTarget` → `Runtime.evaluate` with `INJECTION_CODE`
  6. Also queries existing targets at startup via `Target.getTargets`
- Registers plugin via `definePlugin` from `@steambrew/client`
- No icon component needed (can return minimal plugin descriptor)

### `frontend/inject.ts`

Contains `csrepGgInjectMain()` — a self-contained vanilla JS function with **zero imports** and **no outer-scope references**.

Exported as: `export const INJECTION_CODE = \`(\${csrepGgInjectMain.toString()})()\``;

Function internals (in order):

1. **Idempotency guard** — `if (document.querySelector('.csrep-gg-container')) return;`
2. **URL guard** — `if (!/steamcommunity\.com\/(id|profiles)\//.test(location.href)) return;`
3. **`getSteamId()`** — three-tier fallback:
   - `window.g_rgProfileData?.steamid64` / `.steamid`
   - `[data-miniprofile]` → `BigInt('76561197960265728') + BigInt(accountId)`
   - XML fetch `location.href + '/?xml=1'` → `<steamID64>` text content
   - Does **not** use `g_steamID` (that's the logged-in user, not the viewed profile)
4. **`inject()`** — async function:
   - Checks `.profile_rightcol` exists and doesn't already have `.csrep-gg-container`
   - Calls `getSteamId()`; logs warning and returns if null
   - Injects `<style id="csrep-gg-style">` idempotently
   - Creates `<div class="account-row csrep-gg-container">` with child `<a class="csrep-btn">` containing `<img src="data:image/webp;base64,…">` (inlined webp logo from existing `csrep-logo.ts`)
   - `a.href = 'https://csrep.gg/player/' + steamId`
   - `col.insertBefore(div, col.children[1] ?? null)`
5. **MutationObserver fallback** — if `.profile_rightcol` isn't present yet, observe `documentElement` with `childList: true, subtree: true`; call `inject()` once found; `setTimeout(() => obs.disconnect(), 15000)`

### `webkit/index.tsx`

Empty stub required by build system:
```ts
export default async function WebkitMain() {}
```

### `backend/main.lua`

Unchanged — minimal Lua backend that calls `millennium.ready()`.

## File changes

| File | Action |
|------|--------|
| `frontend/index.tsx` | Rewrite — CDP setup + definePlugin |
| `frontend/inject.ts` | Create — csrepGgInjectMain() |
| `frontend/csrep.tsx` | Delete |
| `frontend/csrep-button.tsx` | Delete |
| `frontend/csrep-logo.ts` | Delete |
| `webkit/index.tsx` | Replace with empty stub |
| `plugin.json` | Add `"webkitApiVersion": "2.0.0"` |
| `package.json` | Remove unused deps, align with leetify; remove pnpm lock |
| `pnpm-lock.yaml` | Delete |
| `.github/workflows/release.yml` | Rewrite to use bun (match leetify reference) |
| `CLAUDE.md` | Create — document CDP architecture |

## Dependencies

**Remove from `package.json`:**
- `@steambrew/webkit` (dep) — not needed in CDP approach
- `@steambrew/api` (dep) — not needed, ttc provides what's required
- `@babel/preset-env`, `@babel/preset-react`, `@babel/traverse` (devDeps) — ttc handles bundling
- `@types/react-dom`, `@types/webpack` (devDeps) — unused types

**Keep:**
- `@steambrew/client` — needed for `definePlugin`
- `@steambrew/ttc` — build tool
- `react` — needed for JSX in frontend/index.tsx
- `@types/react`, `@types/node` — needed for TS compilation
- All `@semantic-release/*` — CI release pipeline
- `archiver`, `tsx`, `nodemon`, `typescript` — build scripts

## Button visual

Inlined webp base64 logo (from existing `csrep-logo.ts`) as an `<img>` tag inside the anchor. Same dark button styling as current design: `#1a1a1a` background, hover `#2d3748`, flex centering.

## Build

After changes: `bun install` then `bun run dev` must complete without errors.
