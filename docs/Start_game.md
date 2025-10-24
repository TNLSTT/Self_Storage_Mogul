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
| **Operating Buffer**    | 3 months of expenses      | Minimum cash reserve recommended before closing                |
| **Tutorial Flags**      | All set to `true`         | Enables step-by-step onboarding cues on each start-game screen |

**Starting Obligations:**

- Pre-close diligence fee: `$2,500` is deducted immediately when the player signs a letter of intent. If the player backs out of the purchase, the fee is not refunded.
- Professional services retainer: `$1,000` covers the first month of third-party management oversight and is billed again at the start of month two if the player keeps management enabled.

---

## 2. Credit System Logic

| Event                         | Credit Effect                               |
| ----------------------------- | ------------------------------------------- |
| Make full loan payment        | + (Δ between current credit and 850) × 0.01 |
| Positive monthly net worth    | + 0.25 × % net worth increase               |
| Negative monthly net worth    | − 0.5 × % loss                              |
| Pay off property              | +10 points                                  |
| Default or negative net worth | −20 points                                  |
| Missed utilities payment      | −5 points                                   |
| Debt service reserve ≥ 6 mo   | +5 points (one-time bonus)                  |

**Interest Rate Formula:**

```
interestRate = baseRate + ((850 - creditScore) / 100) * 1.2%
```

Example: Credit 620 → 7% base + (230/100×1.2)= 9.76%

**Stress Testing:**

- When the interest rate exceeds 12%, the simulation prompts the player with a refinancing advisory explaining the long-term cost of high leverage and suggesting larger down payments.
- If the credit score falls below 580, the player receives a warning modal outlining required corrective actions (e.g., positive net income streak, lower leverage) before any additional borrowing is permitted.

---

## 3. Trade Area Selection

The player selects a **region** (trade area) at game start. Each region affects facility performance variables.

| Region              | Demand Index | Competition | Operating Cost Factor | Tenant Mix Snapshot                     | Notes                                  |
| ------------------- | ------------ | ----------- | --------------------- | -------------------------------------- | -------------------------------------- |
| **North Florida**   | Medium       | Low         | Low                   | 45% residential, 35% contractor, 20% RV | Underserved rural/suburban areas       |
| **Central Florida** | High         | High        | Medium                | 55% residential, 25% student, 20% SMB   | Saturated metros; volatile pricing     |
| **South Florida**   | Medium-High  | High        | High                  | 40% residential, 30% seasonal, 30% SMB  | Dense urban market; strong seasonality |

**Dynamic Region Events:**

- **Hurricane Watch (South Florida):** 10% chance each September. Temporarily reduces occupancy by 8% but increases demand for climate-controlled units the following month.
- **Snowbird Migration (North & Central Florida):** Spikes short-term demand by +5% occupancy during Q1, followed by a 3% drop in Q2.
- **University Move-out (Central Florida):** Occurs every May. Occupancy dips 7% for 30 days unless the player has activated the student marketing upgrade.

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

**Sample Facilities Rendered in UI:**

| ID   | Name                           | Price    | Size (sqft) | Occupancy | Avg Rent/sqft | Expense Ratio | Expansion | Narrative Hook                           |
| ---- | ------------------------------ | -------- | ----------- | --------- | ------------- | ------------- | --------- | ---------------------------------------- |
| FL01 | Cypress Lock Self Storage      | $825,000 | 52,000      | 78%       | $1.10         | 38%           | 12%       | Great location but outdated security     |
| FL02 | Palmetto Climate Depot         | $960,000 | 60,500      | 71%       | $1.35         | 42%           | 8%        | High-end units; needs marketing spend    |
| FL03 | Suncoast Budget Storage        | $720,000 | 48,250      | 83%       | $0.95         | 35%           | 18%       | Underpriced units, ample expansion space |

The facility picker should highlight the implied cap rate, cash-on-cash return, and breakeven occupancy for the selected down payment to reinforce the learning goals.

### **Screen 3 – Purchase Summary**

* Player selects:

  * Down Payment (10–100%)
  * Loan Term (10 / 20 / 25 years)
  * Rate Type (Fixed or Variable)
* Game displays projections:

  * Monthly loan payment
  * Operating cash flow forecast
  * Credit score impact estimate
  * Debt service coverage ratio (DSCR) trend line for the first 24 months
  * Target reserve balance vs. actual reserves chart

**Advisor Guidance Copy (displayed contextually):**

- “Aim for a DSCR above 1.25 to keep lenders comfortable and avoid credit penalties.”
- “Variable rates can reset every 12 months. Budget for a +1.5% rate shock when rates are rising.”
- “Down payments above 25% reduce interest rate spreads by 0.35% and trigger the debt reserve bonus.”

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
* Maintenance backlog > 6 issues → +10% to expenses until resolved.
* Marketing spend increases demand growth rate by +2% for the next 90 days per $2,000 invested.

**Operational Subsystems:**

- **Occupancy Drift:** Each region has a base monthly demand delta (North +0.4%, Central +0.6%, South +0.5%). The delta is multiplied by a facility quality factor derived from active upgrades and unresolved issues.
- **Operating Expense Buckets:**

  - **Utilities (25%)** – Power, water, and trash contracts; spikes when occupancy exceeds 90% or during extreme weather events.
  - **Operations & Staffing (30%)** – Broken into on-site manager salary ($3,250/mo), part-time associate hours ($1,050/mo), payroll tax/benefits at 12% of wages, and administrative software subscriptions ($450/mo). Overtime flags add $28/hour against the part-time pool. If the player enables remote call-center support, tack on $325/mo but reduce on-site hours by 15%.
  - **Insurance (15%)** – Property and liability policies that re-rate annually; hurricane or vandalism events add 8–12% surcharges for the next renewal cycle.
  - **Maintenance (20%)** – Preventative work orders budgeted at $0.18/sqft annually plus reactive tickets from events; deferred maintenance multiplies this bucket by 1.15 until cleared.
  - **Marketing (10%)** – Digital ads, referral bonuses, and community sponsorships; campaign cards adjust spend in $500 increments tied to demand modifiers.

Specific events (storms, vandalism, promotional campaigns) adjust these buckets individually so the UI can surface “why” changes happened.

**Operations & Staffing Breakdown Example:** For a facility with a 40% expense ratio on $48,000 monthly revenue (≈$19,200 expenses), the 30% staffing allocation equals $5,760/mo. That resolves to $3,250 manager salary + $1,050 part-time labor + $586 payroll burden + $450 software + $424 contingency for training/temp labor. When automation upgrades reduce manager hours by 25%, reallocate $812 (25% of salary) into the cash flow as savings while keeping the other sub-buckets static unless the player reconfigures staffing.
- **Capital Expenditures:** Players can queue optional projects (roof replacement, security upgrade). Each project consumes cash immediately, adds a temporary occupancy penalty, and yields a permanent rent or expense modifier once completed.

---

## 6. Progression and Unlocks

* Unlock **Build New Facility** option when credit ≥ 750.
* Competitor AI will later influence demand and occupancy curves.
* Modular upgrades (automation, marketing, etc.) plug into the same action system.
* Establish milestone goals for the tutorial: Month 6 net worth ≥ $125,000 and credit ≥ 640. Failing either milestone triggers additional guidance but does not end the game.
* Add optional challenge cards (e.g., “Renegotiate Vendor Contract”) that appear every in-game quarter offering short-term trade-offs.

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
* Log significant onboarding events to `src/lib/telemetry/onboarding.ts` so designers can analyze drop-off points.
* Include JSON schema validation for generated facility data using `zod` in `src/lib/validation/facility.ts` to prevent malformed AI outputs from breaking the flow.

---

**Goal:** Establish a playable, financially coherent opening scenario where the player buys their first self-storage facility and learns how debt, credit, and operations interact.
