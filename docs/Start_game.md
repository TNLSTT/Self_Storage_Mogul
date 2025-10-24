# Self Storage Mogul – Start Game Specification

## Overview

This file defines the core gameplay and economic parameters for the **player's first experience** when starting a new game of *Self Storage Mogul*. The focus is on **buying an existing facility** using seed capital and financing, with credit rating constraints and region-based dynamics.

---

## 1. Player Setup

| Attribute               | Starting Value            | Description                                                    |
| ----------------------- | ------------------------- | -------------------------------------------------------------- |
| **Cash**                | $100,000                  | Player’s liquid capital                                        |
| **Credit Rating**       | 620                       | Ranges 620–850, determines financing quality                   |
| **Loan-to-Value (LTV)** | Up to 90%                 | Max loan amount available based on credit                      |
| **Max Purchase**        | $1,000,000                | Starting credit allows purchase of facilities up to this price |
| **Build Restriction**   | Locked until credit ≥ 750 | Player cannot build new facilities initially                   |

---

## 2. Credit System Logic

| Event                         | Credit Effect                               |
| ----------------------------- | ------------------------------------------- |
| Make full loan payment        | + (Δ between current credit and 850) × 0.01 |
| Positive monthly net worth    | + 0.25 × % net worth increase               |
| Negative monthly net worth    | − 0.5 × % loss                              |
| Pay off property              | +10 points                                  |
| Default or negative net worth | −20 points                                  |

**Interest Rate Formula:**

```
interestRate = baseRate + ((850 - creditScore) / 100) * 1.2%
```

Example: Credit 620 → 7% base + (230/100×1.2)= 9.76%

---

## 3. Trade Area Selection

The player selects a **region** (trade area) at game start. Each region affects facility performance variables.

| Region              | Demand Index | Competition | Operating Cost Factor | Notes                                  |
| ------------------- | ------------ | ----------- | --------------------- | -------------------------------------- |
| **North Florida**   | Medium       | Low         | Low                   | Underserved rural/suburban areas       |
| **Central Florida** | High         | High        | Medium                | Saturated metros; volatile pricing     |
| **South Florida**   | Medium-High  | High        | High                  | Dense urban market; strong seasonality |

* After **5 in-game years**, the player can unlock new states (e.g., Georgia, Texas).
* Each in-game day advances through the deterministic tick loop (see `simulation-overview.md`).

---

## 4. Facility Acquisition Flow (UI)

### **Screen 1 – Choose Trade Area**

* Map view with clickable regions.
* Tooltip: Avg cap rate, demand index, and loan rate per region.

### **Screen 2 – Select Facility**

Each facility object should contain:

```ts
{
  id: string,
  name: string,
  price: number,
  sizeSqft: number,
  occupancy: number,
  avgRentPerSqft: number,
  expensesAnnual: number,
  debtService: number,
  issues: string[], // examples: ["outdated lighting", "underpriced units"]
  expansionPotential: number // % of additional buildable sqft
}
```

* All facilities are value-add: underpriced, outdated, or expandable.

### **Screen 3 – Purchase Summary**

* Player selects:

  * Down Payment (10–100%)
  * Loan Term (10 / 20 / 25 years)
  * Rate Type (Fixed or Variable)
* Game displays projections:

  * Monthly loan payment
  * Operating cash flow forecast
  * Credit score impact estimate

---

## 5. Financial Model

Monthly tick logic for the financial subsystem:

```ts
revenue = occupancy * sizeSqft * avgRentPerSqft / 12;
expenses = expensesAnnual / 12;
debtService = PMT(interestRate/12, termMonths, loanAmount);
netIncome = revenue - expenses - debtService;
cash += netIncome;
```

**Rules:**

* 3 consecutive months of negative net income → −5 credit points.
* Cash < 0 → Forced asset sale or game over.

---

## 6. Progression and Unlocks

* Unlock **Build New Facility** option when credit ≥ 750.
* Competitor AI will later influence demand and occupancy curves.
* Modular upgrades (automation, marketing, etc.) plug into the same action system.

---

## 7. Simulation Prompt Template

**Prompt Name:** `facility_start_screen.prompt.md`

**Purpose:** Generate JSON facility data and simulate first-purchase flow.

**System Instruction:**

> Simulate the player's first acquisition in Self Storage Mogul. The player starts with $100,000 cash, a 620 credit score, and can buy facilities up to $1,000,000 with 90% LTV. Use the deterministic tick logic and financial model from `simulation-overview.md`. Generate a JSON game state object with player stats, loan terms, facility data, and a 5-year projection of cash flow, credit score, and net worth.

---

## 8. Integration Notes

* Implement store: `src/lib/stores/facilityStart.ts`
* Use Svelte store pattern for player state persistence.
* Integrate into existing tick engine (`simulation/tick.ts`).
* Ensure deterministic behavior via the seeded RNG system.

---

**Goal:** Establish a playable, financially coherent opening scenario where the player buys their first self-storage facility and learns how debt, credit, and operations interact.
