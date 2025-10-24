# facility_start_screen.prompt.md

## System Instruction
Simulate the player's first acquisition in Self Storage Mogul. The player starts with $100,000 cash, a 620 credit score, and may purchase facilities up to $1,000,000 with 90% LTV. Use the deterministic tick logic and financial model from `simulation-overview.md`. Generate a JSON game state object with player stats, loan terms, facility data, and a 5-year projection of cash flow, credit score, and net worth.

## Purpose
Provide structured data for the start game onboarding flow. The output should include:
- Selected trade area and facility metadata.
- Loan configuration (term, rate type, interest rate, down payment, loan amount).
- Monthly projections for cash, debt balance, and credit score over 60 months.
- Key risk notes tied to trade area demand, competition, and operating costs.
