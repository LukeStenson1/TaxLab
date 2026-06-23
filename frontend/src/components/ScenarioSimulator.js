import React, { useMemo, useState } from "react";
import { Sliders, PiggyBank, TrendingUp } from "lucide-react";
import { simulate, fmtUSD, fmtPct } from "../lib/taxCalc";
import InfoTooltip from "./InfoTooltip";

function SliderRow({ label, value, onChange, max, step, testid, hint, info }) {
  return (
    <div data-testid={testid}>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <label className="text-sm font-medium text-slate-700">{label}</label>
          {info && <InfoTooltip text={info} label={label} testid={`info-${testid}`} />}
        </div>
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
            info="Money you put into an employer retirement plan before taxes. It lowers your taxable income today — you pay tax later when you withdraw in retirement. 2025 limit: $23,500 (under age 50)."
          />
          <SliderRow
            label="IRA contribution"
            value={contribIRA}
            onChange={setIRA}
            max={7000}
            step={250}
            testid="sim-ira"
            info="A personal retirement account. Traditional IRA contributions may reduce your taxable income now. 2025 limit: $7,000 (under age 50)."
          />
          <SliderRow
            label="Additional income"
            value={additionalIncome}
            onChange={setAddIncome}
            max={100000}
            step={1000}
            testid="sim-income"
            info="Extra taxable income — a raise, bonus, or side gig. This increases your taxable income and the tax you owe."
          />
          <SliderRow
            label="Charitable giving"
            value={charitable}
            onChange={setCharitable}
            max={50000}
            step={500}
            testid="sim-charity"
            info="Donations to qualified charities can reduce your taxable income — but only if you itemize deductions instead of taking the standard deduction."
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
            info="Profit from selling an investment (like a stock) you held for MORE than one year. These get lower tax rates (0%, 15%, or 20%). Held one year or less? It's a 'short-term' gain, taxed as ordinary income."
          />
          <SliderRow
            label="Qualified dividends"
            value={qualifiedDividends}
            onChange={setQualifiedDividends}
            max={50000}
            step={500}
            testid="sim-dividends"
            hint="Taxed at preferential long-term rates"
            info="Dividends from U.S. (and many foreign) stocks you've held long enough. They're taxed at the lower long-term capital-gains rates instead of your regular income rate."
          />
          <SliderRow
            label="Taxable bond / CD interest"
            value={bondInterest}
            onChange={setBondInterest}
            max={50000}
            step={500}
            testid="sim-bond-interest"
            hint="Taxed as ordinary income"
            info="Interest from corporate bonds, CDs, and savings accounts is taxed as ordinary income. Tip: interest from municipal (state/local government) bonds is usually FEDERALLY TAX-FREE."
          />
          <SliderRow
            label="Tax-loss harvesting"
            value={taxLossHarvest}
            onChange={setTaxLossHarvest}
            max={3000}
            step={100}
            testid="sim-tax-loss"
            hint="Offsets up to $3,000 of ordinary income"
            info="Selling losing investments to offset gains. Up to $3,000 of net losses can also reduce your ordinary income each year; any extra carries over to future years."
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
              <span className="flex items-center gap-1.5 text-slate-400">
                New marginal rate
                <InfoTooltip
                  tone="light"
                  label="marginal rate"
                  testid="info-marginal-rate"
                  text="The tax rate on your NEXT dollar of income — your top tax bracket. It's different from your effective (average) rate, which spreads across all your income."
                />
              </span>
              <span className="font-medium">{fmtPct(result.newMarginal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="flex items-center gap-1.5 text-slate-400">
                Cap-gains / dividend rate
                <InfoTooltip
                  tone="light"
                  label="capital gains rate"
                  testid="info-ltcg-rate"
                  text="The long-term rate applied to your capital gains and qualified dividends — 0%, 15%, or 20% depending on your taxable income."
                />
              </span>
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
