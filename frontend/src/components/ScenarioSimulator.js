import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Sliders, PiggyBank, TrendingUp, Briefcase, Lock } from "lucide-react";
import { simulate, fmtUSD, fmtPct } from "../lib/taxCalc";
import InfoTooltip from "./InfoTooltip";
import GLOSSARY from "../lib/glossary";
import { useAuth } from "../context/AuthContext";

// Ordered list — the first FREE_SLIDERS are available to free users.
const SLIDERS = [
  { key: "contrib401k", label: "401(k) contribution", max: 23500, step: 500, group: "Contributions & deductions", info: GLOSSARY.contribution401k },
  { key: "contribIRA", label: "IRA contribution", max: 7000, step: 250, group: "Contributions & deductions", info: GLOSSARY.ira },
  { key: "charitable", label: "Charitable giving", max: 50000, step: 500, group: "Contributions & deductions", info: GLOSSARY.charitable },
  { key: "homeOffice", label: "Home office deduction", max: 20000, step: 250, group: "Contributions & deductions", hint: "Reduces taxable income (self-employed)", info: "If you're self-employed and use part of your home regularly and exclusively for business, you can deduct a portion of housing costs. (W-2 employees generally cannot.)" },
  { key: "additionalIncome", label: "Additional W-2 income", max: 100000, step: 1000, group: "Contributions & deductions", info: GLOSSARY.additionalIncome },
  { key: "capitalGains", label: "Long-term capital gains (stocks)", max: 100000, step: 1000, group: "Investments", hint: "Taxed at preferential long-term rates", info: GLOSSARY.capitalGains },
  { key: "qualifiedDividends", label: "Qualified dividends", max: 50000, step: 500, group: "Investments", hint: "Taxed at preferential long-term rates", info: GLOSSARY.qualifiedDividends },
  { key: "bondInterest", label: "Taxable bond / CD interest", max: 50000, step: 500, group: "Investments", hint: "Taxed as ordinary income", info: GLOSSARY.bondInterest },
  { key: "taxLossHarvest", label: "Tax-loss harvesting", max: 3000, step: 100, group: "Investments", hint: "Offsets up to $3,000 of ordinary income", info: GLOSSARY.taxLossHarvest },
  { key: "rentalIncome", label: "Rental income", max: 100000, step: 1000, group: "Other income", hint: "Taxed as ordinary income (Schedule E)", info: "Net income from rental property is taxed as ordinary income. Expenses and depreciation can offset it — ask your CPA about Schedule E." },
  { key: "sideHustleIncome", label: "Side hustle / 1099 income", max: 100000, step: 1000, group: "Other income", hint: "Adds income tax + ~14% self-employment tax", info: "Freelance/contractor income is taxed as ordinary income AND carries self-employment tax (~15.3% on 92.35% of net). You can deduct business expenses and may qualify for the QBI deduction." },
];

const FREE_SLIDERS = 2;
const GROUP_ICONS = {
  "Contributions & deductions": PiggyBank,
  Investments: TrendingUp,
  "Other income": Briefcase,
};

function SliderRow({ cfg, value, onChange, locked }) {
  if (locked) {
    return (
      <div data-testid={`sim-${cfg.key}-locked`} className="select-none opacity-70">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <label className="text-sm font-medium text-slate-400">{cfg.label}</label>
            <Lock className="h-3.5 w-3.5 text-slate-400" />
          </div>
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
            Pro
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-slate-200" />
        {cfg.hint && <p className="mt-1 text-xs text-slate-400">{cfg.hint}</p>}
      </div>
    );
  }
  return (
    <div data-testid={`sim-${cfg.key}`}>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <label className="text-sm font-medium text-slate-700">{cfg.label}</label>
          {cfg.info && <InfoTooltip text={cfg.info} label={cfg.label} testid={`info-sim-${cfg.key}`} />}
        </div>
        <span className="font-heading text-sm font-semibold text-navy-900">{fmtUSD(value)}</span>
      </div>
      <input
        type="range"
        min={0}
        max={cfg.max}
        step={cfg.step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
        data-testid={`sim-${cfg.key}-input`}
      />
      {cfg.hint && <p className="mt-1 text-xs text-slate-400">{cfg.hint}</p>}
    </div>
  );
}

export default function ScenarioSimulator({ rawFields }) {
  const { user } = useAuth();
  const isPaid = !!(user?.isAdmin || (user?.billingStatus && user.billingStatus !== "free"));

  const [values, setValues] = useState(() =>
    SLIDERS.reduce((acc, s) => ({ ...acc, [s.key]: 0 }), {})
  );

  const isLocked = (idx) => !isPaid && idx >= FREE_SLIDERS;

  // Only feed UNLOCKED slider values into the calculation.
  const activeDeltas = useMemo(() => {
    const d = {};
    SLIDERS.forEach((s, idx) => {
      d[s.key] = isLocked(idx) ? 0 : values[s.key];
    });
    return d;
  }, [values, isPaid]);

  const result = useMemo(() => simulate(rawFields, activeDeltas), [rawFields, activeDeltas]);

  const savings = result.savings;
  const isSaving = savings >= 0;

  const setVal = (key) => (v) => setValues((prev) => ({ ...prev, [key]: v }));
  const reset = () => setValues(SLIDERS.reduce((acc, s) => ({ ...acc, [s.key]: 0 }), {}));

  const groups = [...new Set(SLIDERS.map((s) => s.group))];
  const lockedCount = isPaid ? 0 : SLIDERS.length - FREE_SLIDERS;

  return (
    <div data-testid="scenario-simulator" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-900">
          <Sliders className="h-5 w-5 text-teal-600" />
        </div>
        <div>
          <h2 className="font-heading text-xl font-semibold text-navy-900">Scenario Simulator</h2>
          <p className="text-sm text-slate-500">
            Move the sliders to see how changes could affect your estimated federal + state tax.
          </p>
        </div>
      </div>

      {lockedCount > 0 && (
        <div
          data-testid="sim-upgrade-banner"
          className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-100 bg-amber-50 px-6 py-3"
        >
          <p className="flex items-center gap-2 text-sm text-amber-800">
            <Lock className="h-4 w-4" />
            You're using 2 of {SLIDERS.length} scenarios. Unlock all {SLIDERS.length} with Pro.
          </p>
          <Link
            to="/app/settings"
            data-testid="sim-upgrade-cta"
            className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-500"
          >
            Unlock all scenarios
          </Link>
        </div>
      )}

      <div className="grid gap-8 p-6 md:grid-cols-2">
        <div className="flex flex-col gap-6">
          {groups.map((group, gi) => {
            const Icon = GROUP_ICONS[group] || PiggyBank;
            return (
              <React.Fragment key={group}>
                <div className={`flex items-center gap-2 ${gi > 0 ? "mt-2 border-t border-slate-100 pt-5" : ""}`}>
                  <Icon className="h-4 w-4 text-teal-700" />
                  <h3 className="font-heading text-sm font-semibold uppercase tracking-wider text-navy-900">
                    {group}
                  </h3>
                </div>
                {SLIDERS.map((cfg, idx) =>
                  cfg.group === group ? (
                    <SliderRow
                      key={cfg.key}
                      cfg={cfg}
                      value={values[cfg.key]}
                      onChange={setVal(cfg.key)}
                      locked={isLocked(idx)}
                    />
                  ) : null
                )}
              </React.Fragment>
            );
          })}

          <button
            onClick={reset}
            data-testid="sim-reset"
            className="self-start rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            Reset sliders
          </button>
        </div>

        <div className="flex flex-col justify-center rounded-2xl bg-navy-900 p-8 text-white">
          <p className="text-sm font-medium text-slate-300">
            {isSaving ? "Estimated tax savings" : "Estimated additional tax"}
            <span className="ml-1 text-xs text-slate-400">(federal + state)</span>
          </p>
          <p
            data-testid="sim-result"
            className={`font-heading mt-1 text-5xl font-bold ${isSaving ? "text-emerald-400" : "text-amber-400"}`}
          >
            {isSaving ? "" : "+"}
            {fmtUSD(Math.abs(savings))}
          </p>
          <div className="mt-6 space-y-2 border-t border-white/10 pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Federal tax</span>
              <span className="font-medium">
                {fmtUSD(result.baseFederalTax)} <span className="text-slate-500">→</span> {fmtUSD(result.newFederalTax)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="flex items-center gap-1.5 text-slate-400">
                State tax (est.)
                <InfoTooltip tone="light" label="state tax" testid="info-sim-state" text={GLOSSARY.stateTax} />
              </span>
              <span className="font-medium">
                {fmtUSD(result.baseStateTax)} <span className="text-slate-500">→</span> {fmtUSD(result.newStateTax)}
              </span>
            </div>
            <div className="flex justify-between border-t border-white/10 pt-2">
              <span className="font-medium text-slate-200">Combined tax</span>
              <span className="font-semibold">
                {fmtUSD(result.baseTax)} <span className="text-slate-500">→</span> {fmtUSD(result.newTax)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="flex items-center gap-1.5 text-slate-400">
                New marginal rate
                <InfoTooltip tone="light" label="marginal rate" testid="info-marginal-rate" text={GLOSSARY.marginalRate} />
              </span>
              <span className="font-medium">{fmtPct(result.newMarginal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="flex items-center gap-1.5 text-slate-400">
                Cap-gains / dividend rate
                <InfoTooltip tone="light" label="capital gains rate" testid="info-ltcg-rate" text={GLOSSARY.capitalGainsRate} />
              </span>
              <span className="font-medium">{fmtPct(result.prefRate)}</span>
            </div>
          </div>
          <p className="mt-4 text-xs text-slate-400">
            {result.stateCode
              ? `Federal uses 2025 brackets; state is a simplified estimate (~${fmtPct(result.stateRate)}). `
              : "Federal uses 2025 brackets. Add your state on upload for a state estimate. "}
            Capital gains & qualified dividends use long-term federal rates. Estimates only.
          </p>
        </div>
      </div>
    </div>
  );
}
