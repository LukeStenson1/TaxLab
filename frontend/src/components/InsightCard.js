import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { TrendingUp, HelpCircle, Lock, X } from "lucide-react";
import { fmtUSD } from "../lib/taxCalc";
import InfoTooltip from "./InfoTooltip";
import GLOSSARY from "../lib/glossary";

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

const MODULE_INFO = {
  bracket_proximity: GLOSSARY.bracketProximity,
  capital_gains: GLOSSARY.capitalGains,
  retirement_headroom: GLOSSARY.retirement,
  deduction_gap: GLOSSARY.deductions,
  credit_phaseout: GLOSSARY.credits,
  underpayment_risk: GLOSSARY.underpayment,
  self_employment: GLOSSARY.selfEmployment,
  niit_proximity: GLOSSARY.niit,
};

const SEVERITY_STYLES = {
  high: "bg-amber-50 text-amber-700 border-amber-200",
  medium: "bg-sky-50 text-sky-700 border-sky-200",
  low: "bg-slate-100 text-slate-600 border-slate-200",
};

function InsightModal({ insight, onClose }) {
  const impact = Number(insight.dollarImpact) || 0;
  const severity = insight.severity || "medium";
  const moduleInfo = MODULE_INFO[insight.module];

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Modal — centered on desktop, bottom sheet feel on mobile */}
      <div className="fixed inset-x-0 bottom-0 z-50 flex flex-col bg-white shadow-2xl sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-[540px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div className="flex flex-col gap-1">
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.15em] text-teal-700">
              {MODULE_LABELS[insight.module] || "Insight"}
              {MODULE_INFO[insight.module] && (
                <InfoTooltip
                  label={MODULE_LABELS[insight.module]}
                  testid={`info-insight-${insight.module}`}
                  text={MODULE_INFO[insight.module]}
                />
              )}
            </span>
            <h2 className="text-xl font-semibold text-slate-900">{insight.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="ml-4 mt-1 rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-5">
          {/* Dollar impact + severity */}
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-600" />
            <span className="text-2xl font-bold text-emerald-600">
              {impact >= 0 ? "+" : "-"}{fmtUSD(Math.abs(impact))}
            </span>
            <span className="text-sm text-slate-400">estimated impact</span>
            <span className={`ml-auto rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${SEVERITY_STYLES[severity] || SEVERITY_STYLES.medium}`}>
              {severity}
            </span>
          </div>

          {/* Explanation */}
          <div>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              What this means for you
            </h3>
            <p className="text-sm leading-relaxed text-slate-700">{insight.explanation}</p>
          </div>

          {/* Glossary background */}
          {moduleInfo && (
            <div className="rounded-xl bg-slate-50 px-4 py-4">
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                Background
              </h3>
              <p className="text-sm leading-relaxed text-slate-600">{moduleInfo}</p>
            </div>
          )}

          {/* Ask your CPA */}
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-4">
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

        {/* Footer */}
        <div className="border-t border-slate-100 px-6 py-4">
          <p className="text-center text-xs text-slate-400">
            Educational purposes only — not tax or financial advice.
          </p>
        </div>
      </div>
    </>,
    document.body
  );
}

export default function InsightCard({ insight, rank, locked = false }) {
  const [modalOpen, setModalOpen] = useState(false);
  const impact = Number(insight.dollarImpact) || 0;
  const severity = insight.severity || "medium";

  return (
    <>
      <div
        data-testid={`insight-card-${insight.module}`}
        onClick={() => !locked && setModalOpen(true)}
        className={`group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md ${!locked ? "cursor-pointer" : ""}`}
      >
        <div className="flex flex-1 flex-col gap-3 p-6">
          {/* Module label + severity */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-[0.15em] text-teal-700">
              {MODULE_LABELS[insight.module] || "Insight"}
            </span>
            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${SEVERITY_STYLES[severity] || SEVERITY_STYLES.medium}`}>
              {severity}
            </span>
          </div>

          {/* Title + Top badge */}
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-heading text-lg font-semibold leading-snug text-navy-900">
              {insight.title}
            </h3>
            {rank === 0 && !locked && (
              <span className="shrink-0 rounded-full bg-navy-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                Top
              </span>
            )}
          </div>

          {locked ? (
            <div data-testid={`insight-locked-${insight.module}`} className="relative mt-1 flex-1">
              <p className="select-none text-sm leading-relaxed text-slate-600 blur-sm">
                {insight.explanation || "This insight includes a detailed explanation and the exact question to bring to your CPA."}
              </p>
              <div className="mt-3 flex items-center gap-2 blur-sm">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
                <span className="font-heading text-2xl font-bold text-emerald-600">+$•••</span>
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-lg bg-white/40">
                <Lock className="h-5 w-5 text-navy-900" />
                <Link
                  to="/app/settings"
                  data-testid={`insight-unlock-${insight.module}`}
                  onClick={(e) => e.stopPropagation()}
                  className="rounded-lg bg-navy-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-navy-800"
                >
                  Unlock full report
                </Link>
              </div>
            </div>
          ) : (
            <>
              <p className="line-clamp-3 text-sm leading-relaxed text-slate-600">
                {insight.explanation}
              </p>
              <div className="mt-auto flex items-center gap-2 pt-2">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
                <span
                  data-testid={`insight-impact-${insight.module}`}
                  className="font-heading text-2xl font-bold text-emerald-600"
                >
                  {impact >= 0 ? "+" : "-"}{fmtUSD(Math.abs(impact))}
                </span>
                <span className="text-xs text-slate-400">estimated impact</span>
              </div>
              <p className="text-xs font-medium text-teal-600">Click to learn more →</p>
            </>
          )}
        </div>

        {!locked && (
          <div className="border-t border-slate-100 bg-slate-50 px-6 py-4">
            <div className="flex gap-2">
              <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <p className="line-clamp-2 text-sm text-slate-700">{insight.askYourCPA}</p>
            </div>
          </div>
        )}
      </div>

      {modalOpen && (
        <InsightModal insight={insight} onClose={() => setModalOpen(false)} />
      )}
    </>
  );
}
