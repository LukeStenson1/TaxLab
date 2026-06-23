// Client-side 2024 federal tax estimation for the Scenario Simulator.
// Educational approximation only — not tax advice.

export const BRACKETS_2024 = {
  single: [
    [0, 0.1],
    [11600, 0.12],
    [47150, 0.22],
    [100525, 0.24],
    [191950, 0.32],
    [243725, 0.35],
    [609350, 0.37],
  ],
  "married filing jointly": [
    [0, 0.1],
    [23200, 0.12],
    [94300, 0.22],
    [201050, 0.24],
    [383900, 0.32],
    [487450, 0.35],
    [731200, 0.37],
  ],
  "married filing separately": [
    [0, 0.1],
    [11600, 0.12],
    [47150, 0.22],
    [100525, 0.24],
    [191950, 0.32],
    [243725, 0.35],
    [365600, 0.37],
  ],
  "head of household": [
    [0, 0.1],
    [16550, 0.12],
    [63100, 0.22],
    [100500, 0.24],
    [191950, 0.32],
    [243700, 0.35],
    [609350, 0.37],
  ],
};

export const STANDARD_DEDUCTION_2024 = {
  single: 14600,
  "married filing jointly": 29200,
  "married filing separately": 14600,
  "head of household": 21900,
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
  const brackets = BRACKETS_2024[status] || BRACKETS_2024.single;
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
  const brackets = BRACKETS_2024[status] || BRACKETS_2024.single;
  let rate = brackets[0][1];
  for (const [floor, r] of brackets) {
    if (taxableIncome >= floor) rate = r;
  }
  return rate;
}

// Long-term capital gains / qualified dividend breakpoints (2024).
export const LTCG_BREAKPOINTS_2024 = {
  single: [47025, 518900],
  "married filing jointly": [94050, 583750],
  "married filing separately": [47025, 291850],
  "head of household": [63000, 551350],
};

// Preferential rate for long-term gains & qualified dividends, based on the
// total taxable income they stack on top of.
export function ltcgRate(totalTaxableIncome, filingStatus) {
  const status = normalizeStatus(filingStatus);
  const [low, high] = LTCG_BREAKPOINTS_2024[status] || LTCG_BREAKPOINTS_2024.single;
  if (totalTaxableIncome <= low) return 0;
  if (totalTaxableIncome <= high) return 0.15;
  return 0.2;
}

// Given the extracted return + slider deltas, compute estimated tax impact.
export function simulate(rawFields, deltas) {
  const status = rawFields?.filingStatus || "single";
  const baseTaxable = Number(rawFields?.taxableIncome) || 0;
  const baseTax = calcFederalTax(baseTaxable, status);

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
  const newOrdinaryTax = calcFederalTax(newOrdinaryTaxable, status);

  // Long-term capital gains & qualified dividends are taxed at preferential
  // rates, stacked on top of ordinary taxable income.
  const prefIncome = Math.max(0, capitalGains) + Math.max(0, qualifiedDividends);
  const prefRate = ltcgRate(newOrdinaryTaxable + prefIncome, status);
  const prefTax = prefIncome * prefRate;

  const newTax = newOrdinaryTax + prefTax;

  return {
    baseTax,
    newTax,
    delta: newTax - baseTax, // negative = savings
    savings: baseTax - newTax,
    newTaxable: newOrdinaryTaxable + prefIncome,
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
