import React from "react";
import { ArrowUpRight, ArrowDownRight, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { fmtUSD, fmtPct } from "../lib/taxCalc";
import { estStateTax } from "../lib/stateTax";
import InfoTooltip from "./InfoTooltip";
import GLOSSARY from "../lib/glossary";

function totalOpportunity(ret) {
  return (ret.insights || []).reduce((sum, i) => sum + (Number(i.dollarImpact) || 0), 0);
}

function pctVal(n) {
  const v = Number(n) || 0;
  return v <= 1 ? v * 100 : v;
}

// direction: "lower-better" (tax/rate) | "neutral"
function Delta({ current, previous, kind, direction = "neutral" }) {
  if (previous === undefined || previous === null) {
    return <span className="text-xs text-slate-400">—</span>;
  }
  const diff = current - previous;
  const flat = Math.abs(diff) < (kind === "pct" ? 0.05 : 1);
  let tone = "text-slate-500";
  if (!flat && direction === "lower-better") {
    tone = diff < 0 ? "text-emerald-600" : "text-red-600";
  } else if (!flat) {
    tone = "text-teal-700";
  }
  const Icon = flat ? Minus : diff > 0 ? ArrowUpRight : ArrowDownRight;
  const display =
    kind === "pct"
      ? `${Math.abs(diff).toFixed(1)} pts`
      : fmtUSD(Math.abs(diff));
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${tone}`}>
      <Icon className="h-3.5 w-3.5" />
      {flat ? "no change" : display}
    </span>
  );
}

export default function YearOverYear({ returns }) {
  // ascending by year
  const data = [...returns].sort((a, b) => a.taxYear - b.taxYear);
  if (data.length < 2) return null;

  const rows = [
    { key: "agi", label: "AGI", info: GLOSSARY.agi, kind: "usd", direction: "neutral", get: (r) => Number(r.rawFields?.agi) || 0, fmt: fmtUSD },
    { key: "taxable", label: "Taxable income", info: GLOSSARY.taxableIncome, kind: "usd", direction: "neutral", get: (r) => Number(r.rawFields?.taxableIncome) || 0, fmt: fmtUSD },
    { key: "tax", label: "Federal tax", info: GLOSSARY.federalTax, kind: "usd", direction: "lower-better", get: (r) => Number(r.rawFields?.totalTax) || 0, fmt: fmtUSD },
    { key: "statetax", label: "State tax (est.)", info: GLOSSARY.stateTax, kind: "usd", direction: "lower-better", get: (r) => estStateTax(r.rawFields?.state, r.rawFields?.taxableIncome), fmt: fmtUSD },
    { key: "combined", label: "Combined rate", info: GLOSSARY.combinedEffectiveRate, kind: "pct", direction: "lower-better", get: (r) => {
      const agi = Number(r.rawFields?.agi) || 0;
      const combined = (Number(r.rawFields?.totalTax) || 0) + estStateTax(r.rawFields?.state, r.rawFields?.taxableIncome);
      return agi > 0 ? (combined / agi) * 100 : 0;
    }, fmt: (v) => `${v.toFixed(1)}%` },
    { key: "eff", label: "Federal effective rate", info: GLOSSARY.effectiveRate, kind: "pct", direction: "lower-better", get: (r) => pctVal(r.rawFields?.effectiveRate), fmt: (v) => `${v.toFixed(1)}%` },
    { key: "opp", label: "Est. total opportunity", info: GLOSSARY.dollarImpact, kind: "usd", direction: "neutral", get: (r) => totalOpportunity(r), fmt: fmtUSD },
  ];

  const latest = data[data.length - 1];
  const prior = data[data.length - 2];
  const effLatest = pctVal(latest.rawFields?.effectiveRate);
  const effPrior = pctVal(prior.rawFields?.effectiveRate);
  const effDiff = effLatest - effPrior;
  const oppLatest = totalOpportunity(latest);

  // Insight module shifts (new opportunities this year vs last)
  const priorModules = new Set((prior.insights || []).map((i) => i.module));
  const newModules = (latest.insights || []).filter((i) => !priorModules.has(i.module));

  return (
    <div
      data-testid="year-over-year"
      className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-900">
          {effDiff <= 0 ? (
            <TrendingDown className="h-5 w-5 text-emerald-400" />
          ) : (
            <TrendingUp className="h-5 w-5 text-amber-400" />
          )}
        </div>
        <div>
          <h2 className="font-heading text-xl font-semibold text-navy-900">Year-over-year comparison</h2>
          <p className="text-sm text-slate-500">How your numbers and opportunities shifted across tax years.</p>
        </div>
      </div>

      {/* Headline shift */}
      <div className="grid gap-px bg-slate-100 sm:grid-cols-3">
        <div className="bg-white p-5" data-testid="yoy-eff-shift">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Effective rate</p>
          <p className="font-heading mt-1 text-2xl font-bold text-navy-900">
            {effPrior.toFixed(1)}% <span className="text-slate-400">→</span> {effLatest.toFixed(1)}%
          </p>
          <p className={`mt-1 text-sm font-medium ${effDiff <= 0 ? "text-emerald-600" : "text-red-600"}`}>
            {effDiff <= 0 ? "Down" : "Up"} {Math.abs(effDiff).toFixed(1)} pts vs {prior.taxYear}
          </p>
        </div>
        <div className="bg-white p-5" data-testid="yoy-opportunity">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Opportunity in {latest.taxYear}
          </p>
          <p className="font-heading mt-1 text-2xl font-bold text-emerald-600">{fmtUSD(oppLatest)}</p>
          <p className="mt-1 text-sm text-slate-500">across {(latest.insights || []).length} insights</p>
        </div>
        <div className="bg-white p-5" data-testid="yoy-new-opportunities">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">New this year</p>
          {newModules.length ? (
            <p className="font-heading mt-1 text-base font-semibold text-navy-900">
              {newModules.map((m) => m.title).slice(0, 2).join(", ")}
              {newModules.length > 2 ? ` +${newModules.length - 2} more` : ""}
            </p>
          ) : (
            <p className="mt-2 text-sm text-slate-500">No new insight categories vs {prior.taxYear}.</p>
          )}
        </div>
      </div>

      {/* Comparison table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left">
              <th className="px-6 py-3 font-medium text-slate-500">Metric</th>
              {data.map((r) => (
                <th key={r.id} className="px-4 py-3 text-right font-semibold text-navy-900">
                  TY {r.taxYear}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-b border-slate-50" data-testid={`yoy-row-${row.key}`}>
                <td className="px-6 py-3 font-medium text-slate-700">
                  <span className="flex items-center gap-1.5">
                    {row.label}
                    {row.info && <InfoTooltip label={row.label} testid={`info-yoy-${row.key}`} text={row.info} />}
                  </span>
                </td>
                {data.map((r, idx) => {
                  const val = row.get(r);
                  const prev = idx > 0 ? row.get(data[idx - 1]) : null;
                  return (
                    <td key={r.id} className="px-4 py-3 text-right">
                      <div className="font-semibold text-navy-900">{row.fmt(val)}</div>
                      {idx > 0 && (
                        <Delta current={val} previous={prev} kind={row.kind} direction={row.direction} />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
