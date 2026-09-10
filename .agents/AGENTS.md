# Agent Rules — Manikandan

## User Profile
- **Name**: Manikandan
- **Role**: Web Developer (professional)
- **Interests**: Stock market, trading, finance, fintech applications
- **Primary Stack**: JavaScript, React, Next.js, Node.js, HTML, CSS
- **Tone**: Casual and direct ("bro" tone is perfectly fine)

---

## Communication Rules
- Keep responses concise and to the point
- Be friendly and conversational — like a dev buddy
- Avoid being overly formal or verbose
- When explaining trading/finance concepts, assume intermediate knowledge

## Code Quality Rules
- Write clean, production-ready code — no unexplained TODOs or placeholders
- Use modern JavaScript (ES2022+): async/await, optional chaining, nullish coalescing
- **TDZ Prevention & Top-Level Variable Hoisting**: In all JavaScript files, ALWAYS declare all module-level state variables (`let`/`const`), timer handles, config maps, and DOM element caches at the very top of the script BEFORE any bootstrap functions (`initX()`) or event listeners are invoked.
- **Dynamic Container Hygiene**: Never place hardcoded mock cards or fake static rows directly inside dynamic HTML list containers. Always provide a clean semantic empty-state container (`.empty-trades-dock`), rendering active items exclusively from the dynamic data store to eliminate phantom UI collisions.
- Functional React components only — no class components
- Vanilla CSS preferred unless user asks for Tailwind/other frameworks
- Always add comments for complex logic

## Web Development Rules
- Prioritize performance and accessibility in all UIs
- Design must be visually stunning — use glassmorphism, dark mode, micro-animations
- **Topbar & Navigation Budget**: Always budget horizontal space; enforce `white-space: nowrap; flex-shrink: 0;` on all ticker badges, and keep search placeholders $\le 15$ characters
- **Real Financial Sparklines**: Never render fake oscillating sine waves (`Math.sin`); use smooth trend interpolation ($\text{width} \le 54\text{px}$)
- **Palette Integrity**: Never inject jarring raw colors (e.g. bright yellow buttons); all secondary pills must inherit theme glass tokens (`var(--apple-glass-surface)`)
- **Keyboard-First Trading Forms**: Multi-step loggers must occupy full 12 columns with sequential `tabindex` (1-9) for rapid entry
- Suggest SEO, a11y, responsiveness best practices proactively
- Use Google Fonts (Inter, Outfit, Roboto) — never browser defaults

## Finance / Trading Context Rules
- Know trading terms: candlesticks, OHLCV, RSI, MACD, EMA, SMA, Bollinger Bands, P&L
- **MANDATORY DIRECT UPSTOX REST API EXECUTION (ZERO STALE SEARCH)**: For ALL live market checks, tick queries, option chains, and `/trading-copilot-pro` workflow requests, ALWAYS immediately run a direct Node.js CLI script querying the live Upstox v2 REST API (`https://api.upstox.com/v2/market-quote/quotes`, `/ltp`, `/option/contract`) using the access token from `data/upstox-session.json`.
- **STALE WEB SEARCH BAN**: NEVER use search engine web search for live index prices or option strikes when `data/upstox-session.json` exists. Web search returns cached/yesterday's news articles which misquote stale historical prices. Web search is permitted ONLY if Upstox returns HTTP 401/expired and the user is explicitly alerted to refresh their Upstox token.
- **DATE & TIMESTAMP INVARIANT**: All market quotes presented to the user must explicitly verify that the API timestamp matches today's exact date (`YYYY-MM-DD`) and is from the current active trading session.
- For finance UIs: prioritize real-time data visualization
- Preferred charting libs: TradingView Lightweight Charts, Recharts, Chart.js, D3.js
- Always consider data accuracy and latency in trading applications

## Project Awareness
- Workspace at f:\project\finance is a finance/stock-related project
- Check existing file structure before making assumptions about the project

---

## Preferred Libraries

| Category | Preference |
|---|---|
| Framework | React / Next.js / Vite |
| Charting | TradingView Lightweight Charts, Recharts, Chart.js |
| State | Zustand, React Query / TanStack Query |
| Styling | Vanilla CSS, CSS Modules |
| HTTP | Axios, fetch |
| Validation | Zod |
| Dates | dayjs |
| Animation | Framer Motion |
| Tables | TanStack Table |

---

## Don'ts
- Never suggest jQuery
- Never use class-based React components
- Never create simple/boring UI designs
- Never ask unnecessary clarifying questions for straightforward tasks
- Never use console.log in production code without removing it
- Never let header items wrap or overflow due to unbudgeted flex widths
- Never use `Math.sin()` or random noise for sparkline chart rendering
- Never squeeze multi-step financial forms into cramped 1-column sidebars
- Never declare `let`/`const` module variables below the functions that invoke them (prevents TDZ `ReferenceError`)
- Never leave hardcoded placeholder cards inside dynamic list containers that get overwritten by live data
- Never use web search for live index quotes or option premiums when `data/upstox-session.json` exists (prevents quoting yesterday's stale news)
- Never execute automated `git commit` or `git push` commands (user manages git manually)
