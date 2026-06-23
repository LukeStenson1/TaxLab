// Simplified 2025 state income tax estimates.
// For graduated-rate states, `rate` is an approximate EFFECTIVE rate at a
// typical middle income (it is intentionally below the state's top marginal
// rate, which only applies to very high earners). Flat-tax states use their
// actual flat rate. Nine states have no broad income tax (rate 0).
// This is an educational estimate only — not exact, and not tax advice.

export const STATE_TAX = {
  AL: { name: "Alabama", rate: 0.045, type: "graduated" },
  AK: { name: "Alaska", rate: 0, type: "none" },
  AZ: { name: "Arizona", rate: 0.025, type: "flat" },
  AR: { name: "Arkansas", rate: 0.039, type: "graduated" },
  CA: { name: "California", rate: 0.045, type: "graduated" },
  CO: { name: "Colorado", rate: 0.0425, type: "flat" },
  CT: { name: "Connecticut", rate: 0.05, type: "graduated" },
  DE: { name: "Delaware", rate: 0.05, type: "graduated" },
  DC: { name: "District of Columbia", rate: 0.065, type: "graduated" },
  FL: { name: "Florida", rate: 0, type: "none" },
  GA: { name: "Georgia", rate: 0.0519, type: "flat" },
  HI: { name: "Hawaii", rate: 0.07, type: "graduated" },
  ID: { name: "Idaho", rate: 0.05695, type: "flat" },
  IL: { name: "Illinois", rate: 0.0495, type: "flat" },
  IN: { name: "Indiana", rate: 0.03, type: "flat" },
  IA: { name: "Iowa", rate: 0.038, type: "flat" },
  KS: { name: "Kansas", rate: 0.052, type: "graduated" },
  KY: { name: "Kentucky", rate: 0.04, type: "flat" },
  LA: { name: "Louisiana", rate: 0.03, type: "flat" },
  ME: { name: "Maine", rate: 0.06, type: "graduated" },
  MD: { name: "Maryland", rate: 0.0475, type: "graduated" },
  MA: { name: "Massachusetts", rate: 0.05, type: "flat" },
  MI: { name: "Michigan", rate: 0.0425, type: "flat" },
  MN: { name: "Minnesota", rate: 0.06, type: "graduated" },
  MS: { name: "Mississippi", rate: 0.044, type: "flat" },
  MO: { name: "Missouri", rate: 0.04, type: "graduated" },
  MT: { name: "Montana", rate: 0.055, type: "graduated" },
  NE: { name: "Nebraska", rate: 0.04, type: "graduated" },
  NV: { name: "Nevada", rate: 0, type: "none" },
  NH: { name: "New Hampshire", rate: 0, type: "none" },
  NJ: { name: "New Jersey", rate: 0.04, type: "graduated" },
  NM: { name: "New Mexico", rate: 0.045, type: "graduated" },
  NY: { name: "New York", rate: 0.055, type: "graduated" },
  NC: { name: "North Carolina", rate: 0.0425, type: "flat" },
  ND: { name: "North Dakota", rate: 0.02, type: "graduated" },
  OH: { name: "Ohio", rate: 0.03, type: "graduated" },
  OK: { name: "Oklahoma", rate: 0.04, type: "graduated" },
  OR: { name: "Oregon", rate: 0.08, type: "graduated" },
  PA: { name: "Pennsylvania", rate: 0.0307, type: "flat" },
  RI: { name: "Rhode Island", rate: 0.0475, type: "graduated" },
  SC: { name: "South Carolina", rate: 0.045, type: "graduated" },
  SD: { name: "South Dakota", rate: 0, type: "none" },
  TN: { name: "Tennessee", rate: 0, type: "none" },
  TX: { name: "Texas", rate: 0, type: "none" },
  UT: { name: "Utah", rate: 0.0455, type: "flat" },
  VT: { name: "Vermont", rate: 0.05, type: "graduated" },
  VA: { name: "Virginia", rate: 0.05, type: "graduated" },
  WA: { name: "Washington", rate: 0, type: "none" },
  WV: { name: "West Virginia", rate: 0.04, type: "graduated" },
  WI: { name: "Wisconsin", rate: 0.053, type: "graduated" },
  WY: { name: "Wyoming", rate: 0, type: "none" },
};

export const STATES = Object.entries(STATE_TAX)
  .map(([code, v]) => ({ code, name: v.name }))
  .sort((a, b) => a.name.localeCompare(b.name));

export function stateRate(code) {
  return STATE_TAX[code]?.rate ?? 0;
}

export function stateName(code) {
  return STATE_TAX[code]?.name ?? "";
}

export function hasIncomeTax(code) {
  return code && STATE_TAX[code] && STATE_TAX[code].rate > 0;
}

export function estStateTax(code, taxableIncome) {
  return Math.max(0, Number(taxableIncome) || 0) * stateRate(code);
}
