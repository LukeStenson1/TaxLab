import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, Sparkles, Lightbulb } from "lucide-react";
import Disclaimer from "../components/Disclaimer";
import InfoTooltip from "../components/InfoTooltip";
import GLOSSARY from "../lib/glossary";
import { projectTax, fmtUSD, fmtPct } from "../lib/taxCalc";
import { STATES } from "../lib/stateTax";

const FILING_STATUSES = [
  "single",
  "married filing jointly",
  "married filing separately",
  "head of household",
];

const LIMIT_401K = 23500;
const LIMIT_IRA = 7000;
const TAX_YEAR = 2025; // matches the bracket + standard-deduction data in taxCalc

function Field({ label, info, children, hint }) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700">
        {label}
        {info && <InfoTooltip text={info} label={label} testid={`info-checkin-${label.toLowerCase().replace(/\s+/g, "-")}`} />}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function NumberInput({ value, onChange, testid, prefix = "$" }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
        {prefix}
      </span>
      <input
        type="number"
        min={0}
        value={value}
        data-testid={testid}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
        className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-7 pr-3 text-sm focus:border-transparent focus:ring-2 focus:ring-teal-600"
      />
    </div>
  );
}

export default function CheckIn() {
  const [filingStatus, setFilingStatus] = useState("single");
  const [stateCode, setStateCode] = useState("");
  const [annualIncome, setAnnualIncome] = useState(80000);
  const [sideIncome, setSideIncome] = useState(0);
  const [contrib401k, setContrib401k] = useState(0);
  const [contribIRA, setContribIRA] = useState(0);
  const [itemized, setItemized] = useState(0);

  const result = useMemo(
    () =>
      projectTax({
        filingStatus,
        state: stateCode,
        annualIncome,
        sideIncome,
        contrib401k,
        contribIRA,
        itemizedDeductions: itemized,
      }),
    [filingStatus, stateCode, annualIncome, sideIncome, contrib401k, contribIRA, itemized]
  );

  const tips = useMemo(() => {
    const t = [];
    const room401k = Math.max(0, LIMIT_401K - contrib401k);
    if (room401k > 0 && annualIncome > 0) {
      const save = room401k * result.marginalRate;
      t.push(
        `You have ${fmtUSD(room401k)} of 401(k) room left this year. Contributing it could lower your taxable income and save roughly ${fmtUSD(save)} at your ${fmtPct(result.marginalRate)} marginal rate.`
      );
    }
    const roomIRA = Math.max(0, LIMIT_IRA - contribIRA);
    if (roomIRA > 0) {
      t.push(`You still have up to ${fmtUSD(roomIRA)} of IRA contribution room (2025 limit ${fmtUSD(LIMIT_IRA)}).`);
    }
    if (sideIncome > 0) {
      t.push(
        `Your ${fmtUSD(sideIncome)} of side income adds about ${fmtUSD(result.seTax)} in self-employment tax. Set aside money for quarterly estimated payments to avoid an underpayment penalty — and ask your CPA about a SEP-IRA and the QBI deduction.`
      );
    }
    if (!result.usedStandard) {
      t.push(`Your itemized deductions (${fmtUSD(itemized)}) beat the standard deduction, so we used them.`);
    } else if (itemized > 0) {
      t.push(`Your standard deduction (${fmtUSD(result.deduction)}) is larger than your itemized total, so the standard deduction is used.`);
    }
    return t;
  }, [contrib401k, contribIRA, sideIncome, itemized, annualIncome, result]);

  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-900">
            <CalendarClock className="h-6 w-6 text-teal-500" />
          </div>
          <div>
            <h1 className="font-heading text-3xl font-bold text-navy-900">Mid-year check-in</h1>
            <p className="mt-1 text-slate-600">
              No PDF needed. Plug in a few numbers for a quick current-year estimate — then adjust
              before December.
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {/* Inputs */}
          <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-heading text-lg font-semibold text-navy-900">Your numbers</h2>

            <Field label="Filing status" info={GLOSSARY.filingStatus}>
              <select
                data-testid="checkin-filing-status"
                value={filingStatus}
                onChange={(e) => setFilingStatus(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm capitalize focus:border-transparent focus:ring-2 focus:ring-teal-600"
              >
                {FILING_STATUSES.map((s) => (
                  <option key={s} value={s} className="capitalize">{s}</option>
                ))}
              </select>
            </Field>

            <Field label="State" info={GLOSSARY.stateTax}>
              <select
                data-testid="checkin-state"
                value={stateCode}
                onChange={(e) => setStateCode(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-transparent focus:ring-2 focus:ring-teal-600"
              >
                <option value="">Select your state (optional)</option>
                {STATES.map((s) => (
                  <option key={s.code} value={s.code}>{s.name}</option>
                ))}
              </select>
            </Field>

            <Field label="Projected annual W-2 income" hint="Your expected salary/wages for the full year.">
              <NumberInput value={annualIncome} onChange={setAnnualIncome} testid="checkin-income" />
            </Field>

            <Field label="Projected side / 1099 income" info={GLOSSARY.selfEmployment} hint="Freelance, contracting, gig work.">
              <NumberInput value={sideIncome} onChange={setSideIncome} testid="checkin-side-income" />
            </Field>

            <Field label="401(k) contributions (planned this year)" info={GLOSSARY.contribution401k}>
              <NumberInput value={contrib401k} onChange={setContrib401k} testid="checkin-401k" />
            </Field>

            <Field label="IRA contributions (planned this year)" info={GLOSSARY.ira}>
              <NumberInput value={contribIRA} onChange={setContribIRA} testid="checkin-ira" />
            </Field>

            <Field label="Itemized deductions (if any)" info={GLOSSARY.itemized} hint="Leave 0 to use the standard deduction automatically.">
              <NumberInput value={itemized} onChange={setItemized} testid="checkin-itemized" />
            </Field>
          </div>

          {/* Results */}
          <div className="space-y-6">
            <div className="rounded-2xl bg-navy-900 p-8 text-white shadow-sm">
              <p className="flex items-center gap-2 text-sm font-medium text-slate-300">
                <Sparkles className="h-4 w-4 text-teal-400" /> Projected {TAX_YEAR} tax (federal + state)
              </p>
              <p data-testid="checkin-combined" className="font-heading mt-1 text-5xl font-bold text-teal-300">
                {fmtUSD(result.combined)}
              </p>
              <div className="mt-6 space-y-2 border-t border-white/10 pt-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Taxable income</span>
                  <span data-testid="checkin-taxable" className="font-medium">{fmtUSD(result.taxableIncome)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Federal income tax</span>
                  <span className="font-medium">{fmtUSD(result.incomeTax)}</span>
                </div>
                {result.seTax > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Self-employment tax</span>
                    <span className="font-medium">{fmtUSD(result.seTax)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="flex items-center gap-1.5 text-slate-400">
                    State tax (est.)
                    <InfoTooltip tone="light" label="state tax" testid="info-checkin-state-tax" text={GLOSSARY.stateTax} />
                  </span>
                  <span className="font-medium">{fmtUSD(result.stateTax)}</span>
                </div>
                <div className="flex justify-between border-t border-white/10 pt-2">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    Combined effective rate
                    <InfoTooltip tone="light" label="combined effective rate" testid="info-checkin-rate" text={GLOSSARY.combinedEffectiveRate} />
                  </span>
                  <span data-testid="checkin-rate" className="font-semibold">{fmtPct(result.effectiveRate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="flex items-center gap-1.5 text-slate-400">
                    Marginal rate
                    <InfoTooltip tone="light" label="marginal rate" testid="info-checkin-marginal" text={GLOSSARY.marginalRate} />
                  </span>
                  <span className="font-medium">{fmtPct(result.marginalRate)}</span>
                </div>
              </div>
              <p className="mt-4 text-xs text-slate-400">
                Simplified estimate using {TAX_YEAR} federal brackets and the {TAX_YEAR} standard
                deduction. Not tax advice.
              </p>
            </div>

            <div data-testid="checkin-tips" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="flex items-center gap-2 font-heading text-lg font-semibold text-navy-900">
                <Lightbulb className="h-5 w-5 text-amber-500" /> Things to consider
              </h3>
              <ul className="mt-3 space-y-3">
                {tips.map((tip, i) => (
                  <li key={i} className="flex gap-2 text-sm leading-relaxed text-slate-600">
                    <span className="mt-0.5 text-teal-700">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
              <Link
                to="/app/upload"
                data-testid="checkin-upload-cta"
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-600"
              >
                Got your return? Run a full analysis →
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <Disclaimer />
        </div>
      </div>
    </div>
  );
}
