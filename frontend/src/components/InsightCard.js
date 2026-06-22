import React from "react";
import { TrendingUp, HelpCircle } from "lucide-react";
import { fmtUSD } from "../lib/taxCalc";

const MODULE_LABELS = {
  bracket_proximity: "Tax Bracket",
  capital_gains: "Capital Gains",
  retirement_headroom: "Retirement",
  deduction_gap: "Deductions",
  credit_phaseout: "Credits",
  underpayment_risk: "Underpayment",
  self_employment: "Self-Employment",
  niit_proximity: "Investment Tax",
};

const SEVERITY_STYLES = {
  high: "bg-amber-50 text-amber-700 border-amber-200",
  medium: "bg-sky-50 text-sky-700 border-sky-200",
  low: "bg-slate-100 text-slate-600 border-slate-200",
};

export default function InsightCard({ insight, rank }) {
  const impact = Number(insight.dollarImpact) || 0;
  const severity = insight.severity || "medium";

  return (
    <div
      data-testid={`insight-card-${insight.module}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
    >
      <div className="flex flex-1 flex-col gap-3 p-6">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-[0.15em] text-teal-700">
            {MODULE_LABELS[insight.module] || "Insight"}
          </span>
          <span
            className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${
              SEVERITY_STYLES[severity] || SEVERITY_STYLES.medium
            }`}
          >
            {severity}
          </span>
        </div>

        <div className="flex items-start justify-between gap-3">
          <h3 className="font-heading text-lg font-semibold leading-snug text-navy-900">
            {insight.title}
          </h3>
          {rank === 0 && (
            <span className="shrink-0 rounded-full bg-navy-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
              Top
            </span>
          )}
        </div>

        <p className="text-sm leading-relaxed text-slate-600">{insight.explanation}</p>

        <div className="mt-auto flex items-center gap-2 pt-2">
          <TrendingUp className="h-5 w-5 text-emerald-600" />
          <span
            data-testid={`insight-impact-${insight.module}`}
            className="font-heading text-2xl font-bold text-emerald-600"
          >
            {impact >= 0 ? "+" : "-"}
            {fmtUSD(Math.abs(impact))}
          </span>
          <span className="text-xs text-slate-400">estimated impact</span>
        </div>
      </div>

      <div className="border-t border-slate-100 bg-slate-50 px-6 py-4">
        <div className="flex gap-2">
          <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Ask your CPA
            </p>
            <p className="mt-1 text-sm text-slate-700">{insight.askYourCPA}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
