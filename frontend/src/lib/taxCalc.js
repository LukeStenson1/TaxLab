// Client-side 2025 federal tax estimation for the Scenario Simulator.
// Educational approximation only — not tax advice.

import { estStateTax, stateRate } from "./stateTax";

export const BRACKETS_2025 = {
  single: [
    [0, 0.1],
    [11925, 0.12],
    [48475, 0.22],
    [103350, 0.24],
    [197300, 0.32],
    [250525, 0.35],
    [626350, 0.37],
  ],
  "married filing jointly": [
    [0, 0.1],
    [23850, 0.12],
    [96950, 0.22],
    [206700, 0.24],
    [394600, 0.32],
    [501050, 0.35],
    [751600, 0.37],
  ],
  "married filing separately": [
    [0, 0.1],
    [11925, 0.12],
    [48475, 0.22],
    [103350, 0.24],
    [197300, 0.32],
    [250525, 0.35],
    [375800, 0.37],
  ],
  "head of household": [
    [0, 0.1],
    [17000, 0.12],
    [64850, 0.22],
    [103350, 0.24],
    [197300, 0.32],
    [250500, 0.35],
    [626350, 0.37],
  ],
};

// 2025 standard deduction, including the One Big Beautiful Bill Act (OBBBA) increase.
export const STANDARD_DEDUCTION_2025 = {
  single: 15750,
  "married filing jointly": 31500,
  "married filing separately": 15750,
  "head of household": 23625,
};

// 2025 long-term capital gains / qualified dividend breakpoints.
export const LTCG_BREAKPOINTS_2025 = {
  single: [48350, 533400],
  "married filing jointly": [96700, 600050],
  "married filing separately": [48350, 300000],
  "head of household": [64750, 566700],
};

function normalizeStatus(status) {
  if (!status) return "single";
  const s = String(status).toLowerCase();
  if (s.includes("joint")) return "married filing jointly";
  if (s.includes("separate")) return "married filing separately";
  if (s.includes("head")) return "head of household";
  return "single";
}

export function calcFederalTax(taxableIncome, filingStatus) {
  const status = normalizeStatus(filingStatus);
  const brackets = BRACKETS_2025[status] || BRACKETS_2025.single;
  const ti = Math.max(0, taxableIncome);
  let tax = 0;
  for (let i = 0; i < brackets.length; i++) {
    const [floor, rate] = brackets[i];
    const ceil = i + 1 < brackets.length ? brackets[i + 1][0] : Infinity;
    if (ti > floor) {
      tax += (Math.min(ti, ceil) - floor) * rate;
    } else break;
  }
  return tax;
}

export function marginalRate(taxableIncome, filingStatus) {
  const status = normalizeStatus(filingStatus);
  const brackets = BRACKETS_2025[status] || BRACKETS_2025.single;
  let rate = brackets[0][1];
  for (const [floor, r] of brackets) {
    if (taxableIncome >= floor) rate = r;
  }
  return rate;
}

// Preferential rate for long-term gains & qualified dividends, based on the
// total taxable income they stack on top of.
export function ltcgRate(totalTaxableIncome, filingStatus) {
  const status = normalizeStatus(filingStatus);
  const [low, high] = LTCG_BREAKPOINTS_2025[status] || LTCG_BREAKPOINTS_2025.single;
  if (totalTaxableIncome <= low) return 0;
  if (totalTaxableIncome <= high) return 0.15;
  return 0.2;
}

// Given the extracted return + slider deltas, compute estimated tax impact
// for BOTH federal and (estimated) state income tax.
export function simulate(rawFields, deltas) {
  const status = rawFields?.filingStatus || "single";
  const stateCode = rawFields?.state || "";
  const baseTaxable = Number(rawFields?.taxableIncome) || 0;

  const baseFederalTax = calcFederalTax(baseTaxable, status);
  const baseStateTax = estStateTax(stateCode, baseTaxable);
  const baseTax = baseFederalTax + baseStateTax;

  const {
    contrib401k = 0,
    contribIRA = 0,
    additionalIncome = 0,
    charitable = 0,
    capitalGains = 0,
    qualifiedDividends = 0,
    bondInterest = 0,
    taxLossHarvest = 0,
  } = deltas;

  // Tax-loss harvesting offsets up to $3,000 of ordinary income per year.
  const harvest = Math.min(Math.max(0, taxLossHarvest), 3000);

  // Ordinary income: pre-tax contributions, charity & harvesting reduce it;
  // additional income and taxable bond/CD interest increase it.
  const newOrdinaryTaxable = Math.max(
    0,
    baseTaxable - contrib401k - contribIRA - charitable - harvest + additionalIncome + bondInterest
  );
  const newFederalOrdinaryTax = calcFederalTax(newOrdinaryTaxable, status);

  // Long-term capital gains & qualified dividends are taxed at preferential
  // FEDERAL rates, stacked on top of ordinary taxable income.
  const prefIncome = Math.max(0, capitalGains) + Math.max(0, qualifiedDividends);
  const prefRate = ltcgRate(newOrdinaryTaxable + prefIncome, status);
  const prefFederalTax = prefIncome * prefRate;

  const newFederalTax = newFederalOrdinaryTax + prefFederalTax;

  // Most states tax capital gains & dividends as ordinary income (no break).
  const newStateBase = newOrdinaryTaxable + prefIncome;
  const newStateTax = estStateTax(stateCode, newStateBase);

  const newTax = newFederalTax + newStateTax;

  return {
    // combined (federal + state)
    baseTax,
    newTax,
    delta: newTax - baseTax, // negative = savings
    savings: baseTax - newTax,
    // federal-only breakdown
    baseFederalTax,
    newFederalTax,
    // state-only breakdown
    baseStateTax,
    newStateTax,
    stateCode,
    stateRate: stateRate(stateCode),
    // rates
    newTaxable: newStateBase,
    newMarginal: marginalRate(newOrdinaryTaxable, status),
    prefRate,
  };
}

export function fmtUSD(n, opts = {}) {
  const v = Number(n) || 0;
  return v.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: opts.decimals ?? 0,
    minimumFractionDigits: opts.decimals ?? 0,
  });
}

export function fmtPct(n) {
  const v = Number(n) || 0;
  const pct = v <= 1 ? v * 100 : v;
  return `${pct.toFixed(1)}%`;
}
