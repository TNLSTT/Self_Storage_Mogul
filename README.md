# 🏗️ Self Storage Mogul

> **Design, automate, and dominate the global self-storage industry from a single browser tab.**

Self Storage Mogul is a feature-rich incremental/tycoon game inspired by titles like *Universal Paperclips* and *Adventure Capitalist*, but grounded in the gritty reality of commercial real estate. You begin with a vacant lot, a sketchy set of blueprints, and a dream. Through clever planning, automation, and ethically questionable financial engineering, you will scale into a globe-spanning empire of climate-controlled cubes, robotic movers, and off-world data vaults.

The entire simulation runs client-side in the browser—no backend dependencies, no waiting on servers, and plenty of room for modding.

---

## 📚 Table of Contents
1. [Feature Highlights](#-feature-highlights)
2. [Gameplay Overview](#-gameplay-overview)
3. [Simulation Systems](#-simulation-systems)
4. [Content & Progression](#-content--progression)
5. [Tech Stack](#-tech-stack)
6. [Project Structure](#-project-structure)
7. [Getting Started](#-getting-started)
8. [Available Scripts](#-available-scripts)
9. [Saving & Data](#-saving--data)
10. [Testing & Quality](#-testing--quality)
11. [Deployment](#-deployment)
12. [Roadmap](#-roadmap)
13. [Contributing](#-contributing)
14. [License & Inspiration](#-license--inspiration)

---

## 🌟 Feature Highlights
- **Dynamic market simulation** — Demand shifts with weather, interest rates, nearby competitors, viral influencers, and interstellar colonization trends.
- **AI facility managers** — Hire and train AI personalities with unique quirks (e.g., "Efficiency-Obsessed Atlas" vs. "Marketing Maven Nebula") that unlock new automation layers.
- **Procedural city builder** — Expand across a stylized world map with neighborhoods that have personalities, zoning rules, and hidden story beats.
- **Robotic logistics & drones** — Transition from forklifts to automated drone fleets that deliver storage pods to customers' doors.
- **Financial engineering playground** — Issue REIT shares, securitize rent rolls, short rivals, and gamble on climate insurance derivatives.
- **Prestige via "Infinity Projects"** — Rebirth into timeline-spanning megaprojects like orbital storage rings or quantum cold-storage for AI cores.
- **Narrative events & moral dilemmas** — Choose between community goodwill, profit maximization, or techno-utopian experiments.
- **Modding hooks** — Data-driven configuration files and scriptable events make it easy to craft custom campaigns and units.

---

## 🎮 Gameplay Overview
### Core Loop
1. **Develop** — Acquire land, construct storage units, and choose layouts (drive-up, climate control, vault, mobile pods).
2. **Operate** — Set pricing, manage occupancy, pay expenses, and react to customer reviews.
3. **Automate** — Deploy marketing funnels, chatbots, robotic movers, and AI facility directors to scale operations.
4. **Leverage** — Use loans, mezzanine debt, and private equity partners to accelerate growth (or risk collapse).
5. **Expand** — Unlock new cities, build flagship mega-depots, and establish franchise partners.

### Mid & Late Game Twists
- **Competitive Bidding:** Participate in procedurally generated auctions for distressed facilities and bankrupt competitors.
- **Climate Events:** Wildfires, floods, and solar flares threaten assets and create rare insurance arbitrage opportunities.
- **Digital Twins:** Simulate your portfolio in a sandbox to test strategies before pushing them live.

### Endgame & Infinity Projects
After dominating Earth, invest in Infinity Projects—insane prestige undertakings like:
- **Lunar Regolith Vaults:** Store priceless moon rocks and scientific relics.
- **Deep-Sea Archives:** Pressure-proof vaults for cultural heritage.
- **Data Nebula:** Quantum-cooled storage arrays supporting post-singularity civilizations.
Each Infinity Project resets parts of your progress while granting permanent meta-bonuses, fresh story arcs, and unique mechanics.

---

## 🧠 Simulation Systems
### Market & Demand Model
- Elastic pricing curves with seasonal adjustments and event-driven spikes.
- Demographics, migration, and traffic data shape micro-market performance.
- Reputation and review algorithms influence organic growth and customer churn.

### Facility Operations
- Grid-based build planner with modular upgrades (solar canopies, humidity control, security AI).
- Real-time occupancy tracking, maintenance scheduling, and energy management.
- Staff morale, union negotiations, and training pipelines for human teams (until you automate them away).

### Automation & AI Agents
- Tiered automation tree with unlockable AI personalities.
- Behavior scripting for managers, marketing bots, drone fleets, and maintenance swarms.
- Event hooks for emergent storytelling when AI agents disagree or malfunction.

### Finance & Risk
- Layered capital stack: construction loans, credit lines, bonds, and REIT equity.
- Monte Carlo risk forecasting to project returns under different macro conditions.
- Hedging instruments, tax strategies, and optional "questionable" shell companies.

---

## 🗺️ Content & Progression
- **Campaign Chapters:** Story-driven objectives across diverse regions (Rust Belt revival, Solar Punk coastlines, Orbital habitats).
- **Freeplay & Endless:** Sandbox mode with adjustable market volatility, disasters, and competitor aggressiveness.
- **Seasonal Events:** Monthly live-ops events featuring limited-time facilities, community goals, and cosmetics.
- **Achievements & Lore Codex:** Track progress, uncover worldbuilding entries, and unlock alternate AI narrators.
- **Accessibility:** Adjustable tick speed, dyslexia-friendly fonts, colorblind-safe palette, remappable hotkeys.

---

## 🧱 Tech Stack
| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | [Svelte](https://svelte.dev) + [Vite](https://vitejs.dev) | Lightning-fast reactive UI |
| **Styling** | [TailwindCSS](https://tailwindcss.com) + custom design tokens | Consistent theming and rapid iteration |
| **State** | [Svelte Stores](https://svelte.dev/docs/svelte-store) + [Immer](https://immerjs.github.io/immer/) | Immutable game state mutations |
| **Game Loop** | `requestAnimationFrame` + fall back `setInterval` | Deterministic tick system |
| **Persistence** | Browser `localStorage` with cloud sync hooks | Automatic save/load |
| **Tooling** | TypeScript, ESLint, Prettier, Vitest | Reliability and DX |
| **Hosting** | Vercel, Netlify, or GitHub Pages | Zero-backend deployment |

---

## 🗂 Project Structure
```
self-storage-mogul/
├── src/
│   ├── App.svelte                # Root application shell
│   ├── main.ts                   # Entry point bootstrapping the game
│   ├── game/
│   │   ├── gameState.ts          # Centralized store for money, units, upgrades
│   │   ├── tickLoop.ts           # Main game loop controller
│   │   ├── simulation/
│   │   │   ├── marketModel.ts    # Demand & competitor dynamics
│   │   │   ├── financeModel.ts   # Loans, interest, risk simulations
│   │   │   └── eventSystem.ts    # Random & scripted events
│   │   ├── systems/
│   │   │   ├── automation.ts     # AI managers & automation tree
│   │   │   ├── facilities.ts     # Build/upgrade logic
│   │   │   └── prestige.ts       # Infinity Project mechanics
│   │   └── persistence/
│   │       ├── saveManager.ts    # Local save/load logic
│   │       └── cloudSync.ts      # Optional cloud storage integration
│   ├── components/
│   │   ├── BuildPanel.svelte
│   │   ├── MarketPanel.svelte
│   │   ├── FinancePanel.svelte
│   │   ├── AutomationPanel.svelte
│   │   ├── InfinityProjects.svelte
│   │   └── HUD/
│   │       ├── ResourceBar.svelte
│   │       └── NotificationFeed.svelte
│   ├── lib/
│   │   ├── uiTheme.ts            # Tailwind + design token bridge
│   │   └── math.ts               # Utility helpers for curves and RNG
│   └── styles.css
├── public/
│   └── favicon.svg
├── tests/
│   ├── simulation.spec.ts
│   └── ui.spec.ts
├── vite.config.ts
├── package.json
└── tailwind.config.cjs
```

---

## 🚀 Getting Started
```bash
# 1. Scaffold the project
npm create vite@latest self-storage-mogul -- --template svelte-ts

# 2. Enter the directory
cd self-storage-mogul

# 3. Install dependencies
npm install

# 4. Add TailwindCSS
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# 5. Configure Tailwind content paths
# tailwind.config.cjs -> content: ["./index.html", "./src/**/*.{svelte,ts}"]

# 6. Enable base styles
# src/styles.css should include:
# @tailwind base;
# @tailwind components;
# @tailwind utilities;

# 7. Run the development server
npm run dev -- --open
```

> 💡 Tip: For a jump-start, clone this repository instead of scaffolding from scratch.

---

## 🛠 Available Scripts
- `npm run dev` — Start the dev server with hot-module reloading.
- `npm run build` — Create an optimized production build.
- `npm run preview` — Serve the production build locally for smoke tests.
- `npm run test` — Run Vitest unit tests (simulation math, reducers, UI stores).
- `npm run lint` — Check code style with ESLint + Prettier.

---

## 💾 Saving & Data
- Automatic save every 60 seconds and on significant milestones.
- Manual save/export to JSON for transferring progress between browsers.
- Optional cloud sync stub ready for integration with Supabase or Firebase.
- Versioned save format with migration helpers to keep old playthroughs compatible.

---

## ✅ Testing & Quality
| Area | Coverage |
|------|----------|
| Simulation math | Deterministic snapshot tests via Vitest |
| UI components | Component-level tests with @testing-library/svelte |
| Accessibility | Axe-core integration in CI to catch regressions |
| Performance | Budget alarms for frame time and heap usage |

CI/CD recommendation: GitHub Actions running `npm run lint`, `npm run test`, and `npm run build` on pull requests.

---

## 🌐 Deployment
```bash
# Production build
npm run build

# Deploy to Vercel (recommended)
vercel --prod

# Deploy to Netlify
netlify deploy --prod

# Deploy to GitHub Pages
npm run build && npx gh-pages -d dist
```

Environment variables (optional):
- `VITE_SUPABASE_URL` & `VITE_SUPABASE_KEY` — enable leaderboard sync.
- `VITE_ANALYTICS_TOKEN` — plug into your analytics provider.

---

## 🗺 Roadmap
### Phase 1 — Core Systems
- [x] Basic build/operate/expand loop
- [x] Local save/load with migration helpers
- [ ] Dynamic pricing, marketing funnels, reputation meters
- [ ] AI manager personalities with dialogue

### Phase 2 — Simulation Depth
- [ ] Competitor AI with bidding wars and sabotage
- [ ] Climate risk model + insurance system
- [ ] Modular facility layouts and manufacturing supply chains

### Phase 3 — Infinity Projects & Live Ops
- [ ] Prestige resets with multi-planet megaprojects
- [ ] Seasonal community events and co-op goals
- [ ] Modding toolkit with YAML/JSON definitions and script runners

---

## 🤝 Contributing
1. Fork the repo and create a feature branch (`git checkout -b feature/amazing-idea`).
2. Ensure linting and tests pass (`npm run lint && npm run test`).
3. Submit a pull request describing your changes and playtest notes.
4. Join the discussion on balancing, narrative events, and mod ideas via GitHub Discussions.

We love contributions ranging from bug fixes to wild new Infinity Projects.

---

## 📜 License & Inspiration
- Licensed under the [MIT License](./LICENSE).
- Inspired by *Universal Paperclips*, *Factorio*, *Cities: Skylines*, and the razor-thin margins of real self-storage REITs.

> *“From broom closets to lunar vaults—stack, optimize, and ascend.”*
