(function () {
  "use strict";

  const THEME_KEY = "debtfree_us_theme_v1";
  const STATE_KEY = "debtfree_us_state_v1";
  const CONFIG = window.DEBTFREE_CONFIG;

  const TOOL_META = {
    planner: {
      title: "2026 Debt Snowball vs. Avalanche Payoff Planner",
      desc: "Compare Debt Avalanche vs. Snowball across all your credit cards and loans, reverse-calculate your target debt-free date, and see how extra payments erase thousands in interest."
    },
    transfer: {
      title: "0% APR Balance Transfer vs. Debt Consolidation Calculator",
      desc: "Compare keeping high-APR credit cards against an 18-month 0% APR balance transfer card or a fixed-rate consolidation loan after fees."
    },
    card: {
      title: "Single Credit Card Payoff & Credit Utilization Calculator",
      desc: "Expose the Minimum Payment Trap, reverse-calculate your payoff target, and find the exact payment to drop below 30% FICO utilization."
    }
  };

  const DEFAULT_DEBTS = [
    { name: "Chase Sapphire", balance: 6800, apr: 24.99, minPay: 185 },
    { name: "Amex Cash Card", balance: 4200, apr: 21.49, minPay: 120 },
    { name: "Personal / Auto Loan", balance: 7500, apr: 10.5, minPay: 225 }
  ];

  const PRESETS = {
    planner: [
      {
        label: "Avg US Cards ($18.5k)",
        extra: 250, windfall: 0, strategy: "avalanche", target: 24,
        debts: [
          { name: "Chase Sapphire", balance: 6800, apr: 24.99, minPay: 185 },
          { name: "Amex Cash Card", balance: 4200, apr: 21.49, minPay: 120 },
          { name: "Personal / Auto Loan", balance: 7500, apr: 10.5, minPay: 225 }
        ]
      },
      {
        label: "High-APR Trap ($32k)",
        extra: 450, windfall: 2000, strategy: "avalanche", target: 30,
        debts: [
          { name: "Store Card (29.9%)", balance: 5400, apr: 29.9, minPay: 165 },
          { name: "Visa Rewards", balance: 14600, apr: 24.49, minPay: 380 },
          { name: "Discover Card", balance: 12000, apr: 22.99, minPay: 310 }
        ]
      },
      {
        label: "Quick Snowball ($9.5k)",
        extra: 300, windfall: 500, strategy: "snowball", target: 15,
        debts: [
          { name: "Medical Bill", balance: 1200, apr: 0, minPay: 75 },
          { name: "Capital One", balance: 3300, apr: 25.99, minPay: 95 },
          { name: "Citi Custom", balance: 5000, apr: 22.49, minPay: 140 }
        ]
      }
    ],
    transfer: [
      { label: "Standard ($15k · 18m 0%)", set: { trBalance: 15000, trCurrentApr: 23.9, trMonthlyPay: 550, trFeePct: 3, trPromoMonths: 18, trPostApr: 21.9, trLoanApr: 11.5, trLoanMonths: "36" } },
      { label: "Aggressive ($10k · 21m 0%)", set: { trBalance: 10000, trCurrentApr: 26.5, trMonthlyPay: 525, trFeePct: 3, trPromoMonths: 21, trPostApr: 23.9, trLoanApr: 10.9, trLoanMonths: "24" } },
      { label: "Large Debt ($28k · 48m Loan)", set: { trBalance: 28000, trCurrentApr: 24.99, trMonthlyPay: 780, trFeePct: 5, trPromoMonths: 15, trPostApr: 24.99, trLoanApr: 11.25, trLoanMonths: "48" } }
    ],
    card: [
      { label: "Maxed Out ($6.5k / $10k)", set: { ccBalance: 6500, ccLimit: 10000, ccApr: 24.99, ccPayment: 275, ccTargetMonths: 18 } },
      { label: "Near Limit ($11k / $12k)", set: { ccBalance: 11000, ccLimit: 12000, ccApr: 27.99, ccPayment: 420, ccTargetMonths: 24 } },
      { label: "Quick Cleanup ($2.8k / $8k)", set: { ccBalance: 2800, ccLimit: 8000, ccApr: 21.99, ccPayment: 250, ccTargetMonths: 12 } }
    ]
  };

  const RESULT_CTA_COPY = {
    planner: {
      title: "Track Every Monthly Rollover Automatically in Google Sheets",
      desc: "Pair DebtFree US with the 2026 US Personal Finance & Wealth OS to log payments, 50/30/20 budgets, and net worth."
    },
    transfer: {
      title: "Never Miss a 0% Promo Deadline With an Automated Payoff Sheet",
      desc: "Track balance transfer countdowns, monthly budgets, and FIRE targets inside one Google Sheet."
    },
    card: {
      title: "Track Card Utilization & Monthly Cash Flow in One Dashboard",
      desc: "Keep every card under 30% utilization and build your emergency fund with the 2026 Wealth OS."
    }
  };

  const SCALAR_FIELDS = [
    "planExtra", "planStrategy", "planWindfall", "planTargetMonths",
    "trBalance", "trCurrentApr", "trMonthlyPay", "trFeePct", "trPromoMonths", "trPostApr", "trLoanApr", "trLoanMonths",
    "ccBalance", "ccLimit", "ccApr", "ccPayment", "ccTargetMonths"
  ];

  let activeTool = "planner";
  let debts = DEFAULT_DEBTS.map((d) => ({ ...d }));
  let lastSummaryText = "";
  let lastSchedule = [];
  let lastRequiredExtra = 0;
  let toastTimer = null;

  const $ = (id) => document.getElementById(id);

  function fmtUSD(n) {
    const val = Math.round(Number(n) || 0);
    return (val < 0 ? "-$" : "$") + Math.abs(val).toLocaleString("en-US");
  }

  function fmtCompactUSD(n) {
    const v = Number(n) || 0;
    if (v >= 1000000) return "$" + (v / 1000000).toFixed(2) + "M";
    if (v >= 1000) return "$" + Math.round(v / 1000) + "k";
    return fmtUSD(v);
  }

  function fmtMonths(m) {
    if (!Number.isFinite(m) || m <= 0) return "0 mos";
    if (m >= 600) return "50+ yrs";
    const yrs = Math.floor(m / 12);
    const rem = m % 12;
    if (yrs === 0) return `${rem} mo${rem !== 1 ? "s" : ""}`;
    if (rem === 0) return `${yrs} yr${yrs !== 1 ? "s" : ""}`;
    return `${yrs} yr${yrs > 1 ? "s" : ""} ${rem} mo${rem !== 1 ? "s" : ""}`;
  }

  function addMonthsLabel(months) {
    if (!Number.isFinite(months) || months >= 600) return "50+ Years";
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() + months);
    return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }

  function showToast(msg) {
    const box = $("toastBox");
    box.textContent = msg;
    box.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { box.hidden = true; }, 2600);
  }

  function downloadCsv(filename, headers, rows) {
    const lines = [headers.join(",")].concat(
      rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    );
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Downloaded ${filename}`);
  }

  /* Save & Restore State */
  function saveState() {
    const scalars = {};
    SCALAR_FIELDS.forEach((id) => {
      const el = $(id);
      if (el) scalars[id] = el.value;
    });
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify({ debts, scalars }));
    } catch (_) {}
  }

  function restoreState() {
    try {
      const raw = localStorage.getItem(STATE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.debts) && parsed.debts.length > 0) {
        debts = parsed.debts.map((d) => ({
          name: String(d.name || "Debt"),
          balance: Math.max(0, Number(d.balance) || 0),
          apr: Math.max(0, Number(d.apr) || 0),
          minPay: Math.max(0, Number(d.minPay) || 0)
        }));
      }
      if (parsed.scalars) {
        SCALAR_FIELDS.forEach((id) => {
          const el = $(id);
          if (el && parsed.scalars[id] !== undefined) el.value = parsed.scalars[id];
        });
      }
    } catch (_) {}
  }

  /* Shareable URL Query Params */
  function buildShareUrl() {
    const params = new URLSearchParams();
    params.set("tab", activeTool);
    if (activeTool === "planner") {
      params.set("extra", $("planExtra").value);
      params.set("strategy", $("planStrategy").value);
      params.set("windfall", $("planWindfall").value);
      params.set("target", $("planTargetMonths").value);
      const compactDebts = debts.map((d) => `${encodeURIComponent(d.name)}:${Math.round(d.balance)}:${d.apr}:${Math.round(d.minPay)}`).join("|");
      params.set("debts", compactDebts);
    } else if (activeTool === "transfer") {
      ["trBalance", "trCurrentApr", "trMonthlyPay", "trFeePct", "trPromoMonths", "trPostApr", "trLoanApr", "trLoanMonths"].forEach((id) => {
        params.set(id, $(id).value);
      });
    } else if (activeTool === "card") {
      ["ccBalance", "ccLimit", "ccApr", "ccPayment", "ccTargetMonths"].forEach((id) => {
        params.set(id, $(id).value);
      });
    }
    return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
  }

  function applyUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab");
    const targetTab = TOOL_META[tabParam] ? tabParam : null;
    if (!targetTab) return null;

    if (targetTab === "planner") {
      if (params.has("extra")) $("planExtra").value = params.get("extra");
      if (params.has("strategy")) $("planStrategy").value = params.get("strategy");
      if (params.has("windfall")) $("planWindfall").value = params.get("windfall");
      if (params.has("target")) $("planTargetMonths").value = params.get("target");
      if (params.has("debts")) {
        const parsed = params.get("debts").split("|").map((chunk) => {
          const [n, b, a, m] = chunk.split(":");
          return {
            name: decodeURIComponent(n || "Card"),
            balance: Math.max(0, Number(b) || 0),
            apr: Math.max(0, Number(a) || 0),
            minPay: Math.max(0, Number(m) || 0)
          };
        }).filter((d) => d.balance > 0);
        if (parsed.length > 0) debts = parsed;
      }
    } else if (targetTab === "transfer") {
      ["trBalance", "trCurrentApr", "trMonthlyPay", "trFeePct", "trPromoMonths", "trPostApr", "trLoanApr", "trLoanMonths"].forEach((id) => {
        if (params.has(id)) $(id).value = params.get(id);
      });
    } else if (targetTab === "card") {
      ["ccBalance", "ccLimit", "ccApr", "ccPayment", "ccTargetMonths"].forEach((id) => {
        if (params.has(id)) $(id).value = params.get(id);
      });
    }
    return targetTab;
  }

  function syncSliders() {
    $("planExtraSlider").value = Math.min(2000, Math.max(0, Number($("planExtra").value) || 0));
    $("trMonthlySlider").value = Math.min(2500, Math.max(200, Number($("trMonthlyPay").value) || 200));
  }

  /* Core Multi-Debt Simulation Engine (Avalanche / Snowball / Minimums) */
  function simulateDebts(debtItems, extraMonthly, strategy, windfall) {
    const items = debtItems
      .map((d, idx) => ({
        id: idx,
        name: d.name,
        balance: Math.max(0, Number(d.balance) || 0),
        apr: Math.max(0, Number(d.apr) || 0) / 100,
        minPay: Math.max(10, Number(d.minPay) || 0)
      }))
      .filter((d) => d.balance > 0);

    const startTotal = items.reduce((s, d) => s + d.balance, 0);
    const baseMinTotal = items.reduce((s, d) => s + d.minPay, 0);
    if (startTotal <= 0) {
      return { months: 0, totalInterest: 0, startTotal: 0, baseMinTotal: 0, yearly: [] };
    }

    const sortTarget = (arr) => {
      if (strategy === "snowball") arr.sort((a, b) => a.balance - b.balance || b.apr - a.apr);
      else arr.sort((a, b) => b.apr - a.apr || a.balance - b.balance);
    };

    // Apply one-time windfall in month 0 to priority debt
    let wf = Math.max(0, Number(windfall) || 0);
    if (wf > 0) {
      sortTarget(items);
      for (const d of items) {
        if (wf <= 0) break;
        const cut = Math.min(d.balance, wf);
        d.balance -= cut;
        wf -= cut;
      }
    }

    const totalBudget = baseMinTotal + Math.max(0, extraMonthly);
    let months = 0;
    let totalInterest = 0;
    const yearly = [];
    let yrPaid = 0;
    let yrInterest = 0;
    let yrPrincipal = 0;

    while (months < 600) {
      const active = items.filter((d) => d.balance > 0.01);
      if (active.length === 0) break;
      months++;

      // 1. Accrue monthly interest
      for (const d of active) {
        const intr = d.balance * (d.apr / 12);
        d.balance += intr;
        totalInterest += intr;
        yrInterest += intr;
      }

      // 2. Pay minimums first
      let remainingBudget = strategy === "minimums"
        ? active.reduce((s, d) => s + Math.min(d.balance, d.minPay), 0)
        : totalBudget;

      for (const d of active) {
        const pay = Math.min(d.balance, d.minPay, remainingBudget);
        d.balance -= pay;
        remainingBudget -= pay;
        yrPaid += pay;
      }

      // 3. Rollover freed minimums + extra payment to target debt
      if (strategy !== "minimums" && remainingBudget > 0.01) {
        const stillOpen = active.filter((d) => d.balance > 0.01);
        sortTarget(stillOpen);
        for (const d of stillOpen) {
          if (remainingBudget <= 0.01) break;
          const extraPay = Math.min(d.balance, remainingBudget);
          d.balance -= extraPay;
          remainingBudget -= extraPay;
          yrPaid += extraPay;
        }
      }

      const endBal = items.reduce((s, d) => s + Math.max(0, d.balance), 0);
      yrPrincipal = Math.max(0, yrPaid - yrInterest);

      if (months % 12 === 0 || endBal <= 0.01) {
        yearly.push({
          year: Math.ceil(months / 12),
          paid: yrPaid,
          interest: yrInterest,
          principal: yrPrincipal,
          endBalance: endBal,
          cumPrincipalPaid: Math.max(0, startTotal - endBal)
        });
        yrPaid = 0;
        yrInterest = 0;
        yrPrincipal = 0;
      }
    }

    return { months, totalInterest, startTotal, baseMinTotal, yearly };
  }

  /* Render Debt Editor List */
  function renderDebtInputs() {
    $("debtListContainer").innerHTML = debts.map((d, idx) => `
      <div class="debt-item" data-debt-idx="${idx}">
        <div class="debt-item-top">
          <input class="debt-name-input" type="text" value="${d.name.replace(/"/g, "&quot;")}" data-field="name" aria-label="Debt ${idx + 1} name">
          ${debts.length > 1 ? `<button type="button" class="btn btn-danger-ghost" data-remove-debt="${idx}">Remove</button>` : ""}
        </div>
        <div class="field-row-3">
          <div class="field">
            <label>Balance ($)</label>
            <input class="input-box tabular" type="number" min="0" max="500000" step="100" value="${d.balance}" data-field="balance">
          </div>
          <div class="field">
            <label>APR (%)</label>
            <input class="input-box tabular" type="number" min="0" max="40" step="0.25" value="${d.apr}" data-field="apr">
          </div>
          <div class="field">
            <label>Min Pay ($/mo)</label>
            <input class="input-box tabular" type="number" min="10" max="20000" step="5" value="${d.minPay}" data-field="minPay">
          </div>
        </div>
      </div>
    `).join("");

    $("debtListContainer").querySelectorAll(".debt-item").forEach((row) => {
      const idx = Number(row.dataset.debtIdx);
      row.querySelectorAll("[data-field]").forEach((inp) => {
        inp.addEventListener("input", () => {
          const f = inp.dataset.field;
          debts[idx][f] = f === "name" ? inp.value : Math.max(0, Number(inp.value) || 0);
          updatePlanner();
          saveState();
        });
      });
    });

    $("debtListContainer").querySelectorAll("[data-remove-debt]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.dataset.removeDebt);
        debts.splice(idx, 1);
        renderDebtInputs();
        updatePlanner();
        saveState();
      });
    });
  }

  /* TAB 1: PLANNER UPDATE */
  function updatePlanner() {
    const extra = Math.max(0, Number($("planExtra").value) || 0);
    const strategy = $("planStrategy").value;
    const windfall = Math.max(0, Number($("planWindfall").value) || 0);
    const targetMonths = Math.max(1, Number($("planTargetMonths").value) || 24);

    $("planExtraHint").textContent = `${fmtUSD(extra)} / mo`;

    const aval = simulateDebts(debts, extra, "avalanche", windfall);
    const snow = simulateDebts(debts, extra, "snowball", windfall);
    const mins = simulateDebts(debts, 0, "minimums", 0);
    const active = strategy === "snowball" ? snow : aval;
    lastSchedule = active.yearly;

    const totalDebt = active.startTotal;
    const weightedApr = totalDebt > 0
      ? debts.reduce((s, d) => s + (Math.max(0, d.balance) * Math.max(0, d.apr)), 0) / totalDebt
      : 0;

    const monthlyTotal = active.baseMinTotal + extra;
    const savedVsMin = Math.max(0, mins.totalInterest - active.totalInterest);

    $("planMethodLabel").textContent = `Projected Debt-Free Date (${strategy === "snowball" ? "Snowball" : "Avalanche"})`;
    $("planFreeDate").textContent = totalDebt > 0 ? addMonthsLabel(active.months) : "Debt-Free!";
    $("planMonthsSub").textContent = `${fmtMonths(active.months)} total (${active.months} monthly payments)`;
    $("planTotalDebtBadge").textContent = `Total Debt: ${fmtUSD(totalDebt)}`;

    $("planMonthlyTotal").textContent = `${fmtUSD(monthlyTotal)}/mo`;
    $("planTotalInterest").textContent = fmtUSD(active.totalInterest);
    $("planSavedVsMin").textContent = fmtUSD(savedVsMin);
    $("planAvgApr").textContent = `${weightedApr.toFixed(1)}%`;

    // Snowball vs Avalanche Comparison
    const interestDiff = Math.round(snow.totalInterest - aval.totalInterest);
    const monthDiff = snow.months - aval.months;
    if (interestDiff > 25) {
      $("planCompareBox").innerHTML = `<strong>Avalanche vs. Snowball:</strong> Avalanche saves <span class="compare-delta">${fmtUSD(interestDiff)}</span> more in interest${monthDiff > 0 ? ` and finishes <strong>${monthDiff} mo faster</strong>` : ""} than Snowball (Snowball: ${fmtUSD(snow.totalInterest)} interest vs. Avalanche: ${fmtUSD(aval.totalInterest)}).`;
    } else {
      $("planCompareBox").innerHTML = `<strong>Avalanche vs. Snowball:</strong> Both methods finish in <strong>${fmtMonths(active.months)}</strong> with nearly identical interest (within ${fmtUSD(Math.abs(interestDiff))}). Pick Snowball if quick wins keep you motivated!`;
    }

    // Reverse Target Debt-Free Date Binary Search
    let lo = 0;
    let hi = Math.max(500, totalDebt);
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      const sim = simulateDebts(debts, mid, strategy, windfall);
      if (sim.months <= targetMonths) hi = mid;
      else lo = mid;
    }
    lastRequiredExtra = Math.ceil(hi / 10) * 10;
    $("planRequiredExtra").textContent = `+${fmtUSD(lastRequiredExtra)} / mo`;
    $("planRequiredTotalNote").textContent = `Total monthly budget to finish in ${targetMonths} months: ${fmtUSD(active.baseMinTotal + lastRequiredExtra)}/mo (Current: ${fmtUSD(monthlyTotal)}/mo)`;

    // Chart Bars (up to 7 yearly milestones)
    const yearly = active.yearly;
    if (yearly.length > 0 && totalDebt > 0) {
      const step = Math.max(1, Math.ceil(yearly.length / 7));
      const sampled = [];
      for (let i = 0; i < yearly.length; i += step) sampled.push(yearly[i]);
      if (sampled[sampled.length - 1] !== yearly[yearly.length - 1]) sampled.push(yearly[yearly.length - 1]);

      $("planChartBars").innerHTML = sampled.map((pt) => {
        const remPct = Math.max(0, Math.round((pt.endBalance / totalDebt) * 100));
        const paidPct = Math.max(0, 100 - remPct);
        return `
          <div class="bar-col" title="Year ${pt.year}: Remaining ${fmtUSD(pt.endBalance)}, Paid ${fmtUSD(pt.cumPrincipalPaid)}">
            <span class="bar-val-top tabular">${fmtCompactUSD(pt.endBalance)}</span>
            <div class="bar-stack" style="height:100%;">
              <div class="bar-seg-principal" style="height:${remPct}%;"></div>
              <div class="bar-seg-growth" style="height:${paidPct}%;"></div>
            </div>
            <span class="bar-yr tabular">Yr ${pt.year}</span>
          </div>
        `;
      }).join("");
    } else {
      $("planChartBars").innerHTML = "";
    }

    // 2-Way Bridge to SP #3 SmartMoney US Compound Calculator
    const freedMonthly = Math.max(50, Math.round(monthlyTotal));
    const r = 0.10 / 12;
    const n = 20 * 12;
    const future20yr = freedMonthly * ((Math.pow(1 + r, n) - 1) / r);
    const bridgeUrl = `${CONFIG.ecosystem.smartMoneyCompoundBase}?tab=compound&initial=0&monthly=${freedMonthly}&rate=10&years=20`;
    $("planBridgeBox").innerHTML = `
      <div>
        <strong>What Happens After ${addMonthsLabel(active.months)}?</strong><br>
        Investing your freed-up <strong>${fmtUSD(freedMonthly)}/mo</strong> in an S&amp;P 500 index fund (10% avg) could grow to <strong>${fmtUSD(future20yr)}</strong> in 20 years.
      </div>
      <a class="btn btn-primary btn-sm" href="${bridgeUrl}" target="_blank" rel="noopener noreferrer" style="flex-shrink:0;">Model on SmartMoney US &rarr;</a>
    `;

    // Annual Schedule Table
    $("planScheduleBody").innerHTML = yearly.map((rRow) => `
      <tr>
        <td>Year ${rRow.year}</td>
        <td>${fmtUSD(rRow.paid)}</td>
        <td>${fmtUSD(rRow.interest)}</td>
        <td>${fmtUSD(rRow.principal)}</td>
        <td><strong>${fmtUSD(rRow.endBalance)}</strong></td>
      </tr>
    `).join("");

    if (activeTool === "planner") {
      lastSummaryText = `DebtFree US (2026): ${fmtUSD(totalDebt)} debt (${strategy}) at ${fmtUSD(monthlyTotal)}/mo -> Debt-free by ${addMonthsLabel(active.months)} (${fmtUSD(active.totalInterest)} interest, saving ${fmtUSD(savedVsMin)} vs minimums).`;
    }
  }

  /* TAB 2: 0% BALANCE TRANSFER VS CONSOLIDATION */
  function simSingleCard(balance, aprPct, monthlyPay, promoMonths, promoPostAprPct, feePct) {
    let bal = balance * (1 + (feePct || 0) / 100);
    const feeCost = balance * ((feePct || 0) / 100);
    let months = 0;
    let interest = 0;
    while (bal > 0.01 && months < 600) {
      months++;
      const activeApr = (promoMonths && months <= promoMonths) ? 0 : (promoPostAprPct !== undefined ? promoPostAprPct : aprPct);
      const intr = bal * ((activeApr / 100) / 12);
      if (monthlyPay <= intr && activeApr > 0) return { months: 600, totalCost: Infinity };
      bal += intr;
      interest += intr;
      const pay = Math.min(bal, monthlyPay);
      bal -= pay;
    }
    return { months, totalCost: interest + feeCost, interest, feeCost };
  }

  function updateTransfer() {
    const bal = Math.max(0, Number($("trBalance").value) || 0);
    const curApr = Math.max(0, Number($("trCurrentApr").value) || 0);
    const monthly = Math.max(25, Number($("trMonthlyPay").value) || 25);
    const feePct = Math.max(0, Number($("trFeePct").value) || 0);
    const promoMo = Math.max(0, Number($("trPromoMonths").value) || 0);
    const postApr = Math.max(0, Number($("trPostApr").value) || 0);
    const loanApr = Math.max(0, Number($("trLoanApr").value) || 0);
    const loanMo = Math.max(6, Number($("trLoanMonths").value) || 36);

    $("trMonthlyHint").textContent = `${fmtUSD(monthly)} / mo`;

    const cur = simSingleCard(bal, curApr, monthly, 0, curApr, 0);
    const bt = simSingleCard(bal, 0, monthly, promoMo, postApr, feePct);

    // Fixed Consolidation Loan
    const rLoan = (loanApr / 100) / 12;
    const loanPay = rLoan > 0 ? (bal * (rLoan * Math.pow(1 + rLoan, loanMo))) / (Math.pow(1 + rLoan, loanMo) - 1) : bal / loanMo;
    const loanInterest = Math.max(0, loanPay * loanMo - bal);

    const options = [
      { key: "cur", name: `Keep Current Cards (${curApr.toFixed(1)}% APR)`, months: cur.months, cost: cur.totalCost, note: `${fmtUSD(monthly)}/mo` },
      { key: "bt", name: `0% Balance Transfer (${promoMo}m + ${feePct}% fee)`, months: bt.months, cost: bt.totalCost, note: `${fmtUSD(monthly)}/mo` },
      { key: "loan", name: `Consolidation Loan (${loanApr.toFixed(1)}% · ${loanMo}m)`, months: loanMo, cost: loanInterest, note: `${fmtUSD(loanPay)}/mo fixed` }
    ];

    const sorted = [...options].sort((a, b) => a.cost - b.cost);
    const winner = sorted[0];
    const bestSavings = Number.isFinite(cur.totalCost) ? Math.max(0, cur.totalCost - winner.cost) : 0;

    $("trWinnerName").textContent = winner.key === "bt" ? "0% Balance Transfer" : (winner.key === "loan" ? "Consolidation Loan" : "Keep Current Cards");
    $("trWinnerSub").textContent = Number.isFinite(cur.totalCost)
      ? `Saves ${fmtUSD(bestSavings)} vs. keeping current cards (${fmtMonths(winner.months)} payoff)`
      : `Increase monthly payment above interest charges to pay off current cards.`;

    $("trCompareBody").innerHTML = options.map((opt) => {
      const isWin = opt.key === winner.key;
      const sav = Number.isFinite(cur.totalCost) && Number.isFinite(opt.cost) ? cur.totalCost - opt.cost : 0;
      const savTxt = opt.key === "cur" ? "Baseline" : (sav > 0 ? `<span class="status-pill pass">Save ${fmtUSD(sav)}</span>` : fmtUSD(sav));
      return `
        <tr class="${isWin ? "is-active-row" : ""}">
          <td>${opt.name}${isWin ? " · Best" : ""}<br><span style="font-size:0.74rem; color:var(--text-muted); font-weight:500;">${opt.note}</span></td>
          <td>${fmtMonths(opt.months)}</td>
          <td>${Number.isFinite(opt.cost) ? fmtUSD(opt.cost) : "Never"}</td>
          <td>${savTxt}</td>
        </tr>
      `;
    }).join("");

    const zeroPayTarget = promoMo > 0 ? Math.ceil((bal * (1 + feePct / 100)) / promoMo) : 0;
    $("trInsightBox").innerHTML = `<strong>0% Promo Rule of Thumb:</strong> To wipe out the entire transferred balance before the ${promoMo}-month 0% window expires (avoiding ${postApr.toFixed(1)}% post-promo APR), pay at least <strong>${fmtUSD(zeroPayTarget)}/mo</strong>. Always confirm true 0% intro APR rather than store deferred interest.`;

    if (activeTool === "transfer") {
      lastSummaryText = `DebtFree US 3-Way Check (${fmtUSD(bal)}): Best option is ${winner.name}, saving ${fmtUSD(bestSavings)} vs keeping ${curApr}% cards.`;
    }
  }

  /* TAB 3: SINGLE CARD & UTILIZATION */
  function updateCard() {
    const bal = Math.max(0, Number($("ccBalance").value) || 0);
    const limit = Math.max(100, Number($("ccLimit").value) || 100);
    const apr = Math.max(0, Number($("ccApr").value) || 0);
    const pay = Math.max(10, Number($("ccPayment").value) || 10);
    const targetMo = Math.max(1, Number($("ccTargetMonths").value) || 18);

    const sim = simSingleCard(bal, apr, pay, 0, apr, 0);
    const minPayApprox = Math.max(25, Math.round(bal * 0.025));
    const minSim = simSingleCard(bal, apr, minPayApprox, 0, apr, 0);

    // Reverse payment for target months
    const r = (apr / 100) / 12;
    const reqPay = r > 0 ? (bal * (r * Math.pow(1 + r, targetMo))) / (Math.pow(1 + r, targetMo) - 1) : bal / targetMo;
    $("ccTargetPayOut").textContent = `${fmtUSD(Math.ceil(reqPay))} / mo`;

    $("ccMonthsOut").textContent = Number.isFinite(sim.totalCost) ? fmtMonths(sim.months) : "Payment Too Low";
    $("ccInterestSub").textContent = Number.isFinite(sim.totalCost)
      ? `Total interest paid: ${fmtUSD(sim.totalCost)} (Debt-free by ${addMonthsLabel(sim.months)})`
      : `Monthly interest is ${fmtUSD(bal * r)}/mo. Increase payment above interest to reduce principal.`;

    const util = (bal / limit) * 100;
    const payTo30 = Math.max(0, bal - limit * 0.30);
    const payTo10 = Math.max(0, bal - limit * 0.10);

    $("ccPayTo30").textContent = payTo30 > 0 ? fmtUSD(payTo30) : "$0 (Under 30%)";
    $("ccPayTo10").textContent = payTo10 > 0 ? fmtUSD(payTo10) : "$0 (Under 10%)";
    $("ccMinTrap").textContent = Number.isFinite(minSim.totalCost) ? `${fmtUSD(minSim.totalCost)} (${fmtMonths(minSim.months)})` : "Decades";

    const badge = $("ccUtilBadge");
    badge.textContent = `${util.toFixed(0)}% Utilization`;
    badge.className = util <= 30 ? "status-pill pass" : "status-pill warn";

    $("ccUtilPctText").textContent = `${util.toFixed(1)}% (${fmtUSD(bal)} / ${fmtUSD(limit)})`;
    const bar = $("ccUtilBar");
    bar.style.width = `${Math.min(100, util).toFixed(1)}%`;
    bar.className = util <= 30 ? "util-fill is-good" : "util-fill";

    $("ccInsightBox").innerHTML = util > 30
      ? `<strong>FICO Score Lever:</strong> Paying down <strong>${fmtUSD(payTo30)}</strong> drops this card under the 30% utilization threshold, which is often the fastest way to boost your score before applying for a 0% Balance Transfer card.`
      : `<strong>Healthy Utilization:</strong> You are already at <strong>${util.toFixed(1)}%</strong> utilization (below 30%). Keep paying ${fmtUSD(pay)}/mo to eliminate the remaining ${fmtUSD(bal)} in ${fmtMonths(sim.months)}.`;

    if (activeTool === "card") {
      lastSummaryText = `DebtFree US Card Check (${fmtUSD(bal)} @ ${apr}%): Paying ${fmtUSD(pay)}/mo clears it in ${fmtMonths(sim.months)} (${util.toFixed(0)}% utilization).`;
    }
  }

  /* Presets Bar */
  function renderPresets() {
    const list = PRESETS[activeTool] || [];
    $("quickPresetsRow").innerHTML = list.map((p, idx) =>
      `<button type="button" class="preset-chip" data-preset-idx="${idx}">${p.label}</button>`
    ).join("");

    $("quickPresetsRow").querySelectorAll(".preset-chip").forEach((btn) => {
      btn.addEventListener("click", () => {
        const preset = list[Number(btn.dataset.presetIdx)];
        if (!preset) return;
        if (activeTool === "planner") {
          debts = preset.debts.map((d) => ({ ...d }));
          $("planExtra").value = preset.extra;
          $("planWindfall").value = preset.windfall;
          $("planStrategy").value = preset.strategy;
          $("planTargetMonths").value = preset.target;
          renderDebtInputs();
        } else if (preset.set) {
          Object.entries(preset.set).forEach(([id, val]) => {
            const el = $(id);
            if (el) el.value = val;
          });
        }
        syncSliders();
        recalcAll();
        saveState();
        showToast(`Loaded scenario: ${preset.label}`);
      });
    });
  }

  /* Offers & Contextual CTAs (Zero "Coming Soon" / "(Soon)") */
  function openWealthModal() {
    const modal = $("wealthOsModal");
    if (modal && typeof modal.showModal === "function") modal.showModal();
  }

  function renderOffers() {
    const matched = CONFIG.affiliates.filter((a) => a.context.includes(activeTool));
    const displayList = matched.length >= 3 ? matched.slice(0, 3) : CONFIG.affiliates.slice(0, 3);

    $("offersGrid").innerHTML = displayList.map((offer) => {
      const hasUrl = Boolean(offer.url && offer.url.trim());
      let actionHtml = "";
      if (hasUrl) {
        actionHtml = `<a class="btn btn-primary btn-sm" href="${offer.url}" target="_blank" rel="noopener noreferrer sponsored">${offer.ctaLabel}</a>`;
      } else {
        const itemsHtml = (offer.checklist || []).map((line) => `<li>${line}</li>`).join("");
        actionHtml = `
          <details class="offer-guide">
            <summary class="btn btn-sm">${offer.checklistTitle || "View 2026 Playbook"}</summary>
            <ul class="offer-guide-list">${itemsHtml}</ul>
          </details>
        `;
      }

      return `
        <article class="offer-card">
          <div>
            <span class="offer-badge">${offer.badge}</span>
            <h3>${offer.title}</h3>
            <p>${offer.summary}</p>
          </div>
          <div>${actionHtml}</div>
        </article>
      `;
    }).join("");

    const sheetOffer = CONFIG.ecosystem.gumroadWealthOs;
    const ytOffer = CONFIG.ecosystem.youtubeFinance;
    const hasSheetUrl = Boolean(sheetOffer.url && sheetOffer.url.trim());
    const hasYtUrl = Boolean(ytOffer.url && ytOffer.url.trim());

    const ecoBtns = [
      `<a class="btn btn-sm" href="${CONFIG.ecosystem.smartMoneyCompoundBase}" target="_blank" rel="noopener noreferrer">SmartMoney US</a>`,
      `<a class="btn btn-sm" href="${CONFIG.ecosystem.soloTaxUrl}" target="_blank" rel="noopener noreferrer">SoloTax US (S-Corp)</a>`,
      `<a class="btn btn-sm" href="${CONFIG.ecosystem.propYieldUrl}" target="_blank" rel="noopener noreferrer">PropYield US (Real Estate)</a>`
    ];
    if (hasYtUrl) {
      ecoBtns.push(`<a class="btn btn-sm" href="${ytOffer.url}" target="_blank" rel="noopener noreferrer">${ytOffer.label}</a>`);
    }
    if (hasSheetUrl) {
      ecoBtns.push(`<a class="btn btn-sm btn-primary" href="${sheetOffer.url}" target="_blank" rel="noopener noreferrer">${sheetOffer.label}</a>`);
    } else {
      ecoBtns.push(`<button type="button" class="btn btn-sm btn-primary" data-open-wealth-modal="1">Preview 2026 Wealth OS (Free Lite)</button>`);
    }
    $("ecoLinksContainer").innerHTML = ecoBtns.join("");

    document.querySelectorAll("[data-result-cta]").forEach((box) => {
      const key = box.dataset.resultCta;
      const copy = RESULT_CTA_COPY[key] || RESULT_CTA_COPY.planner;
      const btn = hasSheetUrl
        ? `<a class="btn btn-primary btn-sm" href="${sheetOffer.url}" target="_blank" rel="noopener noreferrer">${sheetOffer.label}</a>`
        : `<button type="button" class="btn btn-primary btn-sm" data-open-wealth-modal="1">Preview 2026 Wealth OS (Free Lite)</button>`;
      box.innerHTML = `
        <div class="result-cta-copy">
          <strong>${copy.title}</strong>
          <p>${copy.desc}</p>
        </div>
        <div style="flex-shrink:0;">${btn}</div>
      `;
    });

    document.querySelectorAll("[data-open-wealth-modal]").forEach((b) => {
      b.addEventListener("click", openWealthModal);
    });
  }

  function switchTool(toolId, updateHash) {
    if (!TOOL_META[toolId]) toolId = "planner";
    activeTool = toolId;

    document.querySelectorAll(".tool-tab").forEach((btn) => {
      btn.setAttribute("aria-selected", String(btn.dataset.tool === toolId));
    });
    document.querySelectorAll(".calc-panel").forEach((panel) => {
      panel.hidden = panel.id !== "panel-" + toolId;
    });

    $("activeToolHeading").textContent = TOOL_META[toolId].title;
    $("activeToolDesc").textContent = TOOL_META[toolId].desc;

    if (updateHash) history.replaceState(null, "", "#" + toolId);

    renderPresets();
    recalcAll();
    renderOffers();
  }

  function recalcAll() {
    updatePlanner();
    updateTransfer();
    updateCard();
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch (_) {}
    $("themeToggleBtn").textContent = theme === "dark" ? "Light Mode" : "Dark Mode";
  }

  function init() {
    $("brandNameText").textContent = CONFIG.brand.name;
    $("brandSubText").textContent = CONFIG.brand.subtitle;

    restoreState();
    const urlTab = applyUrlParams();
    renderDebtInputs();
    syncSliders();
    applyTheme(localStorage.getItem(THEME_KEY) || "light");

    document.querySelectorAll(".tool-tab").forEach((btn) => {
      btn.addEventListener("click", () => switchTool(btn.dataset.tool, true));
    });

    $("themeToggleBtn").addEventListener("click", () => {
      const cur = document.documentElement.getAttribute("data-theme") || "light";
      applyTheme(cur === "dark" ? "light" : "dark");
    });

    $("shareLinkBtn").addEventListener("click", () => {
      const url = buildShareUrl();
      history.replaceState(null, "", url);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(() => showToast("Shareable link copied to clipboard!")).catch(() => showToast("Share link updated in address bar."));
      } else {
        showToast("Share link updated in address bar.");
      }
    });

    $("copyScenarioBtn").addEventListener("click", () => {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(lastSummaryText).then(() => showToast("Summary copied to clipboard.")).catch(() => showToast(lastSummaryText));
      } else {
        showToast(lastSummaryText);
      }
    });

    $("printReportBtn").addEventListener("click", () => window.print());

    $("resetDefaultsBtn").addEventListener("click", () => {
      try { localStorage.removeItem(STATE_KEY); } catch (_) {}
      window.location.href = window.location.pathname;
    });

    $("addDebtBtn").addEventListener("click", () => {
      debts.push({ name: `Credit Card ${debts.length + 1}`, balance: 3000, apr: 22.99, minPay: 90 });
      renderDebtInputs();
      updatePlanner();
      saveState();
    });

    $("planApplyTargetBtn").addEventListener("click", () => {
      $("planExtra").value = lastRequiredExtra;
      $("planExtraSlider").value = Math.min(2000, Math.max(0, lastRequiredExtra));
      updatePlanner();
      saveState();
      showToast(`Applied +${fmtUSD(lastRequiredExtra)}/mo extra payment.`);
    });

    $("planExportCsvBtn").addEventListener("click", () => {
      downloadCsv(
        "debtfree-us-payoff-schedule.csv",
        ["Year", "Total Paid ($)", "Interest Paid ($)", "Principal Paid ($)", "Ending Balance ($)"],
        lastSchedule.map((r) => [r.year, Math.round(r.paid), Math.round(r.interest), Math.round(r.principal), Math.round(r.endBalance)])
      );
    });

    const closeModal = () => {
      const m = $("wealthOsModal");
      if (m && m.open) m.close();
    };
    $("closeWealthModalBtn").addEventListener("click", closeModal);
    $("modalCloseFooterBtn").addEventListener("click", closeModal);
    $("modalPrintBtn").addEventListener("click", () => { closeModal(); window.print(); });

    const bind = (id, fn) => {
      const el = $(id);
      if (!el) return;
      const h = () => { fn(); saveState(); };
      el.addEventListener("input", h);
      el.addEventListener("change", h);
    };

    $("planExtra").addEventListener("input", (e) => {
      $("planExtraSlider").value = Math.min(2000, Math.max(0, Number(e.target.value) || 0));
      updatePlanner();
      saveState();
    });
    $("planExtraSlider").addEventListener("input", (e) => {
      $("planExtra").value = e.target.value;
      updatePlanner();
      saveState();
    });
    ["planStrategy", "planWindfall", "planTargetMonths"].forEach((id) => bind(id, updatePlanner));

    $("trMonthlyPay").addEventListener("input", (e) => {
      $("trMonthlySlider").value = Math.min(2500, Math.max(200, Number(e.target.value) || 200));
      updateTransfer();
      saveState();
    });
    $("trMonthlySlider").addEventListener("input", (e) => {
      $("trMonthlyPay").value = e.target.value;
      updateTransfer();
      saveState();
    });
    ["trBalance", "trCurrentApr", "trFeePct", "trPromoMonths", "trPostApr", "trLoanApr", "trLoanMonths"].forEach((id) => bind(id, updateTransfer));
    ["ccBalance", "ccLimit", "ccApr", "ccPayment", "ccTargetMonths"].forEach((id) => bind(id, updateCard));

    const initialHash = (window.location.hash || "").replace("#", "");
    const startTab = urlTab || (TOOL_META[initialHash] ? initialHash : "planner");
    switchTool(startTab, false);
  }

  init();
})();
