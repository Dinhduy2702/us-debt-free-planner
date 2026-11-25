# DESIGN SYSTEM CONTRACT: DebtFree US v1.0 (2026 Debt Payoff & 0% Balance Transfer Planner)

> Modeled on US debt & personal finance leaders (**NerdWallet**, **Bankrate**, **Undebt.it**, **SmartAsset**) and locked to `anti-slop`, `frontend-design`, `ui-ux-pro-max`, and `frontend-ui-engineering`.

## 1. Visual Identity & Continuity
- **Product Name:** `DebtFree US` (Sub-label: `2026 Credit Card Payoff & Debt Freedom Planner`)
- **Aesthetic:** Swiss Editorial Fintech (sibling to `SmartMoney US` for seamless cross-navigation). Default **Light Mode** for financial clarity and trust, with full **Dark Mode** parity.
- **Typography:** `'Newsreader', Georgia, serif` for authoritative editorial titles; `'IBM Plex Sans', system-ui, sans-serif` with `tabular-nums` for all inputs, debt rows, and schedules.

## 2. Non-Negotiable Quality Locks (Zero Repeat Mistakes from SP #3)
- **Zero "Coming Soon" or "(Soon)" text anywhere in the DOM:** Every resource card without a live affiliate URL renders an interactive **2026 Actionable Checklist** (`<details>`) plus a live **`Preview 2026 Wealth OS (Free Lite)`** modal.
- **Mobile `390px` First-Screen Discipline:** Single-row horizontally scrollable tool tabs (`<= 56px`), single-row scrollable `Try a scenario` bar (`<= 56px`), and all 4 action buttons (`Share / Copy / Print / Reset`) locked to **1 exact horizontal row** (`0` overflow).
- **Input Alignment:** All multi-column form rows enforce `align-items: end` so input bottoms align at `0px` variance.
- **Decision-Grade Depth from v1.0:**
  1. Multi-card **Snowball vs. Avalanche** side-by-side comparison + **Reverse Target Debt-Free Date Calculator** (`Apply Payment`) + Windfall accelerator + Annual Payoff Schedule (`Export CSV`).
  2. **3-Way Comparison Engine:** Keep Current Cards vs. **0% APR Balance Transfer** (with transfer fee & promo window) vs. **Debt Consolidation Loan**.
  3. **Single Card Payoff & Credit Utilization Meter:** Minimum payment trap comparison + exact dollar amount to drop below `30%` and `10%` FICO utilization.
  4. **2-Way Ecosystem Bridge:** Direct deep-link to `SmartMoney US` (`?tab=compound&monthly=...`) showing how freed-up monthly cash compounds in the S&P 500 once debt-free, plus SP #2 (`US Personal Finance & Wealth OS`) slot.
