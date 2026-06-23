import React from "react";
import { Link } from "react-router-dom";
import { ScanLine, ArrowRight, BookOpen } from "lucide-react";

const TERMS = [
  {
    id: "marginal-vs-effective",
    term: "Marginal vs. effective tax rate",
    body:
      "Your marginal rate is the rate on your NEXT dollar of income — your top bracket. Your effective rate is your AVERAGE rate across all income (total tax ÷ taxable income). Because the U.S. uses graduated brackets, your effective rate is almost always lower than your marginal rate. Example: a single filer with $64,000 of taxable income is in the 22% bracket, but their effective federal rate is closer to 11%.",
  },
  {
    id: "standard-deduction",
    term: "Standard deduction (2025)",
    body:
      "A flat amount you can subtract from income instead of itemizing. For 2025 (including the One Big Beautiful Bill Act increase) it's $15,750 for single filers, $31,500 for married filing jointly, and $23,625 for head of household. You take whichever is larger: the standard deduction or your itemized deductions.",
  },
  {
    id: "capital-gains",
    term: "Capital gains rates",
    body:
      "Profit from selling an investment held MORE than one year is a long-term capital gain, taxed at preferential federal rates of 0%, 15%, or 20% depending on your taxable income. Held one year or less? It's a short-term gain, taxed at your ordinary income rate. Most states tax all gains as ordinary income.",
  },
  {
    id: "niit",
    term: "NIIT — Net Investment Income Tax",
    body:
      "An extra 3.8% federal tax on investment income (interest, dividends, capital gains, rental income) once your modified AGI crosses $200,000 (single) or $250,000 (married filing jointly). Only the income above the threshold is hit. Managing the timing of gains can help you stay under the line.",
  },
  {
    id: "qbi",
    term: "QBI — Qualified Business Income deduction",
    body:
      "Under Section 199A, many self-employed people and pass-through business owners can deduct up to 20% of their qualified business income. It phases out for certain service businesses above income thresholds (around $197,300 single / $394,600 MFJ for 2025). If you have 1099 or Schedule C income, ask your CPA whether you qualify.",
  },
  {
    id: "amt",
    term: "AMT — Alternative Minimum Tax",
    body:
      "A parallel tax system designed to ensure high-income taxpayers with lots of deductions still pay a minimum. You calculate your tax both the normal way and the AMT way, then pay the higher of the two. Common AMT triggers include large state-tax deductions, incentive stock options (ISOs), and certain itemized deductions.",
  },
  {
    id: "duty-days",
    term: "Duty days",
    body:
      "A method used mainly by athletes, entertainers, and remote/multi-state workers to allocate income across states. Your income is split based on the number of working days spent in each state, which determines how much each state can tax. Keeping a detailed calendar matters if you work across state lines.",
  },
  {
    id: "tax-loss-harvesting",
    term: "Tax-loss harvesting",
    body:
      "Selling investments at a loss to offset capital gains. If your losses exceed your gains, you can deduct up to $3,000 against ordinary income each year, and carry the rest forward. Watch the wash-sale rule: rebuying the same (or substantially identical) security within 30 days disallows the loss.",
  },
];

export default function Learn() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2" data-testid="learn-home-link">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-900">
              <ScanLine className="h-5 w-5 text-teal-600" />
            </div>
            <span className="font-heading text-lg font-bold tracking-tight text-navy-900">TaxLens</span>
          </Link>
          <Link
            to="/signup"
            data-testid="learn-signup-cta"
            className="rounded-lg bg-navy-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-navy-800"
          >
            Analyze my return
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-3xl px-6 py-16 text-center">
          <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
            <BookOpen className="h-3.5 w-3.5 text-teal-700" /> Tax terms, in plain English
          </div>
          <h1 className="font-heading text-4xl font-bold tracking-tight text-navy-900 sm:text-5xl">
            The TaxLens learning center
          </h1>
          <p className="mt-4 text-lg text-slate-600">
            Clear, jargon-free explanations of the tax concepts that actually affect your bottom line —
            written so anyone can understand them.
          </p>
        </div>
      </section>

      {/* Feature article */}
      <article className="mx-auto max-w-3xl px-6 py-14" data-testid="learn-article">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">Guide</p>
        <h2 className="font-heading mt-2 text-3xl font-semibold text-navy-900">
          What does my tax bracket actually mean?
        </h2>
        <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-slate-700">
          <p>
            One of the most common tax myths is that "moving into a higher bracket" means all of your
            income gets taxed at that higher rate. It doesn't. The U.S. uses a{" "}
            <strong>graduated (progressive)</strong> system, which means your income is taxed in layers.
          </p>
          <p>
            Picture your income filling a set of buckets. The first bucket is taxed at 10%, the next at
            12%, then 22%, and so on. When you "enter the 22% bracket," only the dollars that land in that
            bucket are taxed at 22% — everything below it is still taxed at the lower rates.
          </p>
          <p>
            That's why a raise never costs you money overall: only the portion of the raise that crosses
            into the next bracket is taxed at the higher rate. Your <strong>marginal rate</strong> (the
            bracket your last dollar lands in) is almost always higher than your{" "}
            <strong>effective rate</strong> (your true average across all income).
          </p>
          <p>
            Why does this matter? Because the smartest tax moves target your <em>marginal</em> rate. A
            pre-tax 401(k) contribution, for example, comes "off the top" — it reduces the income taxed at
            your highest rate first. Knowing your marginal rate tells you exactly how much each deduction
            is really worth.
          </p>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-semibold text-navy-900">Quick example (2025, single filer)</p>
            <p className="mt-2 text-sm text-slate-600">
              Taxable income of $64,000 sits in the 22% bracket. But the first $11,925 is taxed at 10%, the
              next chunk at 12%, and only the income above $48,475 is taxed at 22%. The result is an
              effective federal rate of roughly 11% — half the marginal rate.
            </p>
          </div>
        </div>
        <Link
          to="/signup"
          data-testid="learn-article-cta"
          className="mt-8 inline-flex items-center gap-2 rounded-lg bg-teal-700 px-6 py-3 font-medium text-white transition-colors hover:bg-teal-600"
        >
          See your own brackets in action <ArrowRight className="h-4 w-4" />
        </Link>
      </article>

      {/* Glossary */}
      <section className="border-t border-slate-200 bg-slate-50 py-14">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="font-heading text-3xl font-semibold text-navy-900">Tax glossary</h2>
          <p className="mt-2 text-slate-600">The terms you'll run into, defined simply.</p>
          <div className="mt-8 space-y-4">
            {TERMS.map((t) => (
              <div
                key={t.id}
                id={t.id}
                data-testid={`glossary-${t.id}`}
                className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <h3 className="font-heading text-lg font-semibold text-navy-900">{t.term}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-slate-700">{t.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-3xl px-6 py-16 text-center">
        <h2 className="font-heading text-3xl font-semibold text-navy-900">
          Ready to see what your return is hiding?
        </h2>
        <p className="mt-3 text-slate-600">
          Upload your IRS return and get a plain-English report ranked by dollar impact.
        </p>
        <Link
          to="/signup"
          data-testid="learn-bottom-cta"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-navy-900 px-6 py-3 font-medium text-white transition-colors hover:bg-navy-800"
        >
          Get started free <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      <footer className="border-t border-slate-200 bg-navy-900 py-10 text-center text-xs text-slate-400">
        <p className="mx-auto max-w-xl px-6 leading-relaxed">
          Educational only — not tax or financial advice. TaxLens helps you understand your numbers and
          prepare better questions for a licensed professional.
        </p>
      </footer>
    </div>
  );
}
