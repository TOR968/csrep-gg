У мене є Millennium плагін для Steam клієнта. Потрібно додати кнопку csrep-gg на сторінки Steam профілів, аналогічно до того як зроблено в цьому репозиторії: d:\nnnn\leetify-extension

Перед початком прочитай ці файли з референсного репозиторію щоб зрозуміти архітектуру:
- d:\nnnn\leetify-extension\CLAUDE.md
- d:\nnnn\leetify-extension\frontend\index.tsx
- d:\nnnn\leetify-extension\frontend\inject.ts
- d:\nnnn\leetify-extension\webkit\index.tsx

Потім відкрий мій плагін: D:\nnnn\csrep-gg

Зроби наступне (повністю, без зупинок):

1. **Прочитай всі файли** нового плагіна щоб зрозуміти його поточний стан

2. **Перепиши архітектуру** під CDP підхід як у референсі:
   - `frontend/index.tsx` — CDP setup: Target.setDiscoverTargets, слухає targetCreated/targetInfoChanged, 200ms debounce per targetId, attachToTarget + Runtime.evaluate
   - `frontend/inject.ts` — самодостатня функція `[serviceName]InjectMain()` експортована як INJECTION_CODE через `.toString()`. Нуль імпортів, нуль посилань на зовнішній scope
   - `webkit/index.tsx` — порожній stub: `export default async function WebkitMain() {}`
   - URL патерн для профілів: `/steamcommunity\.com\/(id|profiles)\//`

3. **inject.ts** повинен містити всередині `[serviceName]InjectMain()`:
   - Idempotency guard: `if (document.querySelector('.[plugin]-container')) return;`
   - URL guard
   - `getSteamId()` — спочатку `window.g_rgProfileData?.steamid64` / `.steamid`, потім `data-miniprofile` → конвертація через `BigInt('76561197960265728') + BigInt(accountId)`, потім XML fetch `/?xml=1` → `steamID64`
   - НЕ використовувати `g_steamID` — це ID залогіненого юзера, не профілю що переглядається
   - `inject()` — чекає `.profile_rightcol`, вставляє кнопку через `col.insertBefore(div, col.children[1] ?? null)`
   - Styles як `<style id="[plugin]-style">` (idempotent)
   - MutationObserver якщо `.profile_rightcol` ще немає, timeout 15000ms
   - Кнопка веде на: `https://[service-url]/profile/` + steamId64

4. **Мігруй на bun**:
   - Видали `pnpm-lock.yaml`, `pnpm-workspace.yaml` якщо є
   - `bun install`
   - Перевір `package.json` scripts — замість `pnpm` використовуй `bun`
   - Онови release.yml як в d:\nnnn\leetify-extension\.github\workflows\release.yml

5. **Видали зайві залежності** з package.json:
   - `@steambrew/webkit` — не потрібен
   - `react-dom` + `@types/react-dom` — не потрібні (inject.ts чистий JS, index.tsx використовує тільки JSX без createRoot)
   - Будь-які інші невикористані пакети
   - Прибери `"react-dom"` з `types` масивів в tsconfig файлах

6. **plugin.json** повинен мати `"webkitApiVersion": "2.0.0"` — без цього Millennium не завантажує webkit bundle взагалі

7. **declarations.d.ts** — прибери невикористані декларації (*.svg, *.png модулі, API ключі тощо)

8. **Збудуй**: `bun run dev` — має завершитись без помилок

9. **Оновити CLAUDE.md** — описати CDP архітектуру, чому не webkit, flow ін'єкції

Ключові архітектурні обмеження:
- Community browser (steamcommunity.com) — окремий CEF процес, Millennium туди не має доступу
- CDP з frontend context — єдиний спосіб дістатись community browser
- inject.ts серіалізується через `.toString()` — все що потрібно функції має бути всередині неї
- React недоступний в community browser — тільки vanilla DOM
- 200ms debounce важливий: targetInfoChanged може спрацювати двічі підряд для одного URL
