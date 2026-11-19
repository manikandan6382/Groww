# Design QA

final result: passed

Reference image:
`C:\Users\LAP-249\AppData\Local\Temp\codex-clipboard-e63d2a92-9eb8-4c7e-896a-25eb087315bb.png`

Prototype:
`http://127.0.0.1:3000/`

## Checked

- Desktop capture at `1536x1024` with Playwright.
- Wide desktop capture at `1920x1080` with Playwright.
- Compact desktop capture at `1366x768` with Playwright.
- Mobile capture at `390x844` with Playwright.
- Reference image and rendered prototype were both visually inspected.
- Local server responded with HTTP 200.
- Frontend script passed `node --check`.

## Comparison Notes

- Layout matches the reference structure: left profile rail, top market strip, main portfolio overview, right promo panel, allocation/health/insight row, holdings table, and watchlist.
- Palette matches the reference direction: deep navy/black surfaces, thin cyan borders, blue glow, white primary text, cyan/green gain text.
- Data is real-data-first: Zerodha holdings drive portfolio value, allocation, health, holdings table, and watchlist symbols. No dummy holdings are shown.
- Yahoo Finance is used only for market references and holding quote watchlist where available.
- Mobile layout stacks cards cleanly and preserves the premium visual system without table overflow.
- Layout switches to a controlled two-column dashboard below 1500px so sub-1400 screens do not break.
- Wide screens are constrained with a max dashboard canvas so the UI does not over-stretch above 1600px.
- Theme switcher is present in the header with blue, emerald, and violet accent themes; blue is the default.
- Theme switcher was changed from unlabeled dots to labeled buttons so the user can clearly change color.
- Promo panel text width is constrained so copy cannot overlap the orbit graphic.
- Dashboard text selection is suppressed for app chrome to avoid accidental blue selection blocks that look like layout overlap.

## Intentional Differences

- The reference is crypto/staking-themed; this prototype is adapted to an Indian Zerodha equity/ETF portfolio.
- The hero chart uses NIFTY 50 as a reference chart because historical portfolio NAV is not available yet.
- Icons and illustration are code-native, styled to match the reference mood while avoiding external asset dependencies.
