# 🏗️ Self Storage Mogul

**Self Storage Mogul** is an incremental browser game inspired by *Universal Paperclips*.  
You start as a small developer with one vacant lot and scale up by **building, converting, and expanding** self storage facilities.  
As your empire grows, you’ll unlock automation, financing, and AI-driven management — until your storage empire spans the globe.

The entire simulation runs in-browser — no backend required.

---

## 🧱 Tech Stack

| Layer | Technology | Purpose |
|-------|-------------|----------|
| **Frontend** | [Svelte](https://svelte.dev) + [Vite](https://vitejs.dev) | Fast reactive UI with minimal boilerplate |
| **Styling** | [TailwindCSS](https://tailwindcss.com) | Rapid UI prototyping |
| **Persistence** | Browser `localStorage` | Save/load player progress |
| **Game Loop** | JavaScript `setInterval()` | Tick-based simulation |
| **Deployment** | [Vercel](https://vercel.com) or [Netlify](https://www.netlify.com/) | Free static hosting |

---

## 🎮 Gameplay Loop

1. **Early Game:** Build your first storage units and earn rental income.  
2. **Mid Game:** Automate marketing, financing, and conversions.  
3. **Late Game:** Expand into multiple cities, issue REIT shares, or digitize operations.  
4. **Endgame:** Explore the meta question — how far can growth go?

---

## 🗂 Project Structure

```
self-storage-mogul/
├── src/
│   ├── App.svelte             # Root component
│   ├── main.js                # Entry point
│   ├── game/
│   │   ├── gameState.js       # Store for money, units, upgrades
│   │   ├── tickLoop.js        # Main game tick
│   │   └── saveManager.js     # Save/load logic
│   ├── components/
│   │   ├── BuildPanel.svelte
│   │   ├── UpgradePanel.svelte
│   │   └── SummaryPanel.svelte
│   └── styles.css
├── index.html
├── package.json
└── tailwind.config.js
```

---

## ⚡ Installation

```bash
# 1. Create the project
npm create vite@latest self-storage-mogul -- --template svelte

# 2. Enter directory
cd self-storage-mogul

# 3. Install dependencies
npm install

# 4. Install TailwindCSS
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# 5. Configure Tailwind
# Edit tailwind.config.js:
# content: ["./index.html", "./src/**/*.{svelte,js,ts}"]

# 6. Add Tailwind to styles.css
# @tailwind base;
# @tailwind components;
# @tailwind utilities;

# 7. Run dev server
npm run dev
```

---

## 🧩 Game Logic Overview

### `/src/game/gameState.js`
```js
import { writable } from "svelte/store";

export const gameState = writable({
  money: 10000,
  units: 0,
  occupancy: 0.25,
  rate: 120,
  buildCost: 5000,
});
```

### `/src/game/tickLoop.js`
```js
import { gameState } from "./gameState.js";

let interval;

export function startGameLoop() {
  clearInterval(interval);
  interval = setInterval(() => {
    gameState.update(state => {
      const rented = state.units * state.occupancy;
      const income = (rented * state.rate) / (30 * 24 * 60); // income per minute
      return { ...state, money: state.money + income };
    });
  }, 1000);
}
```

### `/src/game/saveManager.js`
```js
import { gameState } from "./gameState.js";

const KEY = "ssm_save";

export function saveGame() {
  gameState.subscribe(state => {
    localStorage.setItem(KEY, JSON.stringify(state));
  });
}

export function loadGame() {
  const data = localStorage.getItem(KEY);
  if (data) gameState.set(JSON.parse(data));
}
```

---

## 🚀 Deploying

```bash
# Build for production
npm run build

# Preview locally
npm run preview

# Deploy to Vercel
vercel --prod
```

---

## 📋 To-Do List

### 🧩 Setup & Boilerplate
- [ ] Initialize Svelte + Vite project  
- [ ] Add TailwindCSS  
- [ ] Create core files (`gameState.js`, `tickLoop.js`, `saveManager.js`)  
- [ ] Setup autosave/load  

### 🎮 Core Gameplay
- [ ] Implement build action (spend money, add units)  
- [ ] Implement occupancy & marketing mechanics  
- [ ] Implement income & expenses per tick  
- [ ] Add UI components for stats, upgrades, and buttons  

### 🧠 Progression Systems
- [ ] Unlock automation (hire manager, auto-build, etc.)  
- [ ] Add debt/financing mechanics  
- [ ] Add new property types (climate control, conversions)  
- [ ] Add research upgrades and AI optimizations  

### 🌍 Expansion & Polish
- [ ] Add multiple city unlocks  
- [ ] Add prestige/rebirth system (“Form a REIT”)  
- [ ] Implement basic animations (growth counters, transitions)  
- [ ] Add sound effects & notifications  

### 🧰 Future Enhancements
- [ ] Add Supabase backend (leaderboards)  
- [ ] PWA support (offline progress)  
- [ ] Achievements system  
- [ ] “Moral arc” or endgame twist  

---

## 💡 Philosophy

Like *Universal Paperclips*, **Self Storage Mogul** explores exponential growth and optimization —  
but through the lens of real estate capitalism and automation.  

The goal isn’t just to make money — it’s to watch how human ambition, automation, and abstraction  
turn something as humble as self-storage into an unstoppable machine.
