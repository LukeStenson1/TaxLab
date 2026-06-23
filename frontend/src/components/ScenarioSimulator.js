import React, { useMemo, useState } from "react";
import { Sliders, PiggyBank, TrendingUp } from "lucide-react";
import { simulate, fmtUSD, fmtPct } from "../lib/taxCalc";

function SliderRow({ label, value, onChange, max, step, testid, hint }) {
  return (
    <div data-testid={testid}>
      <div className="mb-2 flex items-center justify-between">
        <label className="text-sm font-medium text-slate-700">{label}</label>
        <span className="font-heading text-sm font-semibold text-navy-900">{fmtUSD(value)}</span>
      </div>
      <input
        type="range"
        min={0}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
        data-testid={`${testid}-input`}
      />
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

export default function ScenarioSimulator({ rawFields }) {
  const [contrib401k, set401k] = useState(0);
  const [contribIRA, setIRA] = useState(0);
  const [additionalIncome, setAddIncome] = useState(0);
  const [charitable, setCharitable] = useState(0);
  const [capitalGains, setCapitalGains] = useState(0);
  const [qualifiedDividends, setQualifiedDividends] = useState(0);
  const [bondInterest, setBondInterest] = useState(0);
  const [taxLossHarvest, setTaxLossHarvest] = useState(0);

  const result = useMemo(
    () =>
      simulate(rawFields, {
        contrib401k,
        contribIRA,
        additionalIncome,
        charitable,
        capitalGains,
        qualifiedDividends,
        bondInterest,
        taxLossHarvest,
      }),
    [
      rawFields,
      contrib401k,
      contribIRA,
      additionalIncome,
      charitable,
      capitalGains,
      qualifiedDividends,
      bondInterest,
      taxLossHarvest,
    ]
  );

  const savings = result.savings; // positive = savings
  const isSaving = savings >= 0;

  const reset = () => {
    set401k(0);
    setIRA(0);
    setAddIncome(0);
    setCharitable(0);
    setCapitalGains(0);
    setQualifiedDividends(0);
    setBondInterest(0);
    setTaxLossHarvest(0);
  };

  return (
    <div
      data-testid="scenario-simulator"
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-900">
          <Sliders className="h-5 w-5 text-teal-600" />
        </div>
        <div>
          <h2 className="font-heading text-xl font-semibold text-navy-900">Scenario Simulator</h2>
          <p className="text-sm text-slate-500">
            Move the sliders to see how changes could affect your estimated federal tax.
          </p>
        </div>
      </div>

      <div className="grid gap-8 p-6 md:grid-cols-2">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-2">
            <PiggyBank className="h-4 w-4 text-teal-700" />
            <h3 className="font-heading text-sm font-semibold uppercase tracking-wider text-navy-900">
              Contributions & deductions
            </h3>
          </div>
          <SliderRow
            label="401(k) contribution"
            value={contrib401k}
            onChange={set401k}
            max={23500}
            step={500}
            testid="sim-401k"
          />
          <SliderRow
            label="IRA contribution"
            value={contribIRA}
            onChange={setIRA}
            max={7000}
            step={250}
            testid="sim-ira"
          />
          <SliderRow
            label="Additional income"
            value={additionalIncome}
            onChange={setAddIncome}
            max={100000}
            step={1000}
            testid="sim-income"
          />
          <SliderRow
            label="Charitable giving"
            value={charitable}
            onChange={setCharitable}
            max={50000}
            step={500}
            testid="sim-charity"
          />

          <div className="mt-2 flex items-center gap-2 border-t border-slate-100 pt-5">
            <TrendingUp className="h-4 w-4 text-teal-700" />
            <h3 className="font-heading text-sm font-semibold uppercase tracking-wider text-navy-900">
              Investments
            </h3>
          </div>
          <SliderRow
            label="Long-term capital gains (stocks)"
            value={capitalGains}
            onChange={setCapitalGains}
            max={100000}
            step={1000}
            testid="sim-capital-gains"
            hint="Taxed at preferential long-term rates"
          />
          <SliderRow
            label="Qualified dividends"
            value={qualifiedDividends}
            onChange={setQualifiedDividends}
            max={50000}
            step={500}
            testid="sim-dividends"
            hint="Taxed at preferential long-term rates"
          />
          <SliderRow
            label="Taxable bond / CD interest"
            value={bondInterest}
            onChange={setBondInterest}
            max={50000}
            step={500}
            testid="sim-bond-interest"
            hint="Taxed as ordinary income"
          />
          <SliderRow
            label="Tax-loss harvesting"
            value={taxLossHarvest}
            onChange={setTaxLossHarvest}
            max={3000}
            step={100}
            testid="sim-tax-loss"
            hint="Offsets up to $3,000 of ordinary income"
          />

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
          </p>
          <p
            data-testid="sim-result"
            className={`font-heading mt-1 text-5xl font-bold ${
              isSaving ? "text-emerald-400" : "text-amber-400"
            }`}
          >
            {isSaving ? "" : "+"}
            {fmtUSD(Math.abs(savings))}
          </p>
          <div className="mt-6 space-y-2 border-t border-white/10 pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Current est. tax</span>
              <span className="font-medium">{fmtUSD(result.baseTax)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">New est. tax</span>
              <span className="font-medium">{fmtUSD(result.newTax)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">New marginal rate</span>
              <span className="font-medium">{fmtPct(result.newMarginal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Cap-gains / dividend rate</span>
              <span className="font-medium">{fmtPct(result.prefRate)}</span>
            </div>
          </div>
          <p className="mt-4 text-xs text-slate-400">
            Calculated live in your browser using 2024 federal brackets. Capital gains &
            qualified dividends use long-term rates. Estimates only.
          </p>
        </div>
      </div>
    </div>
  );
}
