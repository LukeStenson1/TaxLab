import React from "react";
import { Link } from "react-router-dom";
import {
  ScanLine,
  UploadCloud,
  Sparkles,
  ClipboardCheck,
  TrendingUp,
  HelpCircle,
  Check,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import Disclaimer from "../components/Disclaimer";
import InfoTooltip from "../components/InfoTooltip";
import GLOSSARY from "../lib/glossary";

const sampleInsights = [
  {
    tag: "Tax Bracket",
    info: GLOSSARY.bracketProximity,
    title: "You're $4,200 from the next bracket",
    text: "Your taxable income sits near the top of the 22% bracket. A pre-tax contribution could keep more of your next dollar at 22% instead of 24%.",
    impact: "+$1,008",
    cpa: "Should I increase 401(k) deferrals before year-end?",
  },
  {
    tag: "Retirement",
    info: GLOSSARY.retirement,
    title: "Unused IRA contribution room",
    text: "You contributed less than the annual IRA limit. Filling that headroom may reduce taxable income and grow tax-advantaged savings.",
    impact: "+$1,540",
    cpa: "Am I eligible for a deductible IRA given my income?",
  },
  {
    tag: "Investment Tax",
    info: GLOSSARY.niit,
    title: "Approaching the 3.8% NIIT threshold",
    text: "Your modified AGI is close to the Net Investment Income Tax line. Crossing it adds a 3.8% surtax on investment income.",
    impact: "+$760",
    cpa: "How can I manage MAGI to stay under the NIIT threshold?",
  },
];

const steps = [
  {
    icon: UploadCloud,
    title: "Upload your return",
    text: "Drag and drop your IRS tax return PDF. We never store the file — only the extracted numbers.",
  },
  {
    icon: Sparkles,
    title: "AI reads the numbers",
    text: "We extract your key fields and run them through tax insight modules tailored to your situation.",
  },
  {
    icon: ClipboardCheck,
    title: "Get your report",
    text: "Receive plain-English insights ranked by dollar impact — and the exact questions to ask your CPA.",
  },
];

const plans = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    tagline: "Try it on one return",
    features: ["1 return analysis", "Core insight modules", "Scenario simulator", "Educational reports"],
    cta: "Get started",
    popular: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: "$29",
    tagline: "For the proactive filer",
    features: [
      "Unlimited return analyses",
      "All 8 insight modules",
      "Year-over-year dashboard",
      "Priority Gemini analysis",
      "Downloadable reports",
    ],
    cta: "Go Pro",
    popular: true,
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-900">
              <ScanLine className="h-5 w-5 text-teal-600" />
            </div>
            <span className="font-heading text-lg font-bold tracking-tight text-navy-900">TaxLens</span>
          </div>
          <nav className="hidden items-center gap-8 md:flex">
            <a href="#how" className="text-sm font-medium text-slate-600 hover:text-navy-900">How it works</a>
            <a href="#insights" className="text-sm font-medium text-slate-600 hover:text-navy-900">Insights</a>
            <a href="#pricing" className="text-sm font-medium text-slate-600 hover:text-navy-900">Pricing</a>
            <Link to="/learn" data-testid="nav-learn-link" className="text-sm font-medium text-slate-600 hover:text-navy-900">Learn</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/login" data-testid="nav-login-link" className="text-sm font-medium text-slate-600 hover:text-navy-900">
              Log in
            </Link>
            <Link
              to="/signup"
              data-testid="nav-signup-link"
              className="rounded-lg bg-navy-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-navy-800"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-slate-200">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-20 lg:grid-cols-2 lg:py-28">
          <div className="animate-fade-in-up">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
              <ShieldCheck className="h-3.5 w-3.5 text-teal-700" />
              Your PDF is never stored — only the insights
            </div>
            <h1 className="font-heading text-4xl font-bold leading-[1.1] tracking-tight text-navy-900 sm:text-5xl lg:text-6xl">
              Your tax return contains insights your CPA never told you.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-slate-600">
              Upload your IRS return and get a personalized, plain-English report ranked by dollar
              impact — plus the exact questions to bring to your accountant.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                to="/signup"
                data-testid="hero-cta"
                className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-6 py-3 font-medium text-white transition-colors hover:bg-teal-600"
              >
                Analyze my return <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#how" className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-6 py-3 font-medium text-navy-900 transition-colors hover:bg-slate-50">
                See how it works
              </a>
            </div>
            <p className="mt-6 text-xs text-slate-500">
              Educational only — not tax or financial advice.
            </p>
          </div>
          <div className="relative">
            <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-xl">
              <img
                src="https://images.unsplash.com/photo-1644088379091-d574269d422f?crop=entropy&cs=srgb&fm=jpg&w=1200&q=80"
                alt="Abstract financial data visualization"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="absolute -bottom-6 -left-6 hidden w-56 rounded-xl border border-slate-200 bg-white p-4 shadow-lg sm:block">
              <p className="text-xs font-bold uppercase tracking-wider text-teal-700">Top insight</p>
              <p className="mt-1 text-sm font-semibold text-navy-900">Retirement headroom</p>
              <p className="font-heading mt-1 text-2xl font-bold text-emerald-600">+$1,540</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-7xl px-6 py-20">
        <div className="mb-12 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">How it works</p>
          <h2 className="font-heading mt-3 text-3xl font-semibold text-navy-900 sm:text-4xl">
            From PDF to plain-English in three steps
          </h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {steps.map((s, i) => (
            <div key={i} className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-navy-900">
                <s.icon className="h-6 w-6 text-teal-600" />
              </div>
              <div className="font-heading mt-5 text-sm font-bold text-teal-700">Step {i + 1}</div>
              <h3 className="font-heading mt-1 text-xl font-semibold text-navy-900">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Sample insights */}
      <section id="insights" className="border-y border-slate-200 bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-12 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Sample insights</p>
            <h2 className="font-heading mt-3 text-3xl font-semibold text-navy-900 sm:text-4xl">
              The kind of report you'll receive
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {sampleInsights.map((c, i) => (
              <div key={i} className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-1 flex-col gap-3 p-6">
                  <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.15em] text-teal-700">
                    {c.tag}
                    {c.info && <InfoTooltip label={c.tag} testid={`info-sample-${i}`} text={c.info} />}
                  </span>
                  <h3 className="font-heading text-lg font-semibold text-navy-900">{c.title}</h3>
                  <p className="text-sm leading-relaxed text-slate-600">{c.text}</p>
                  <div className="mt-auto flex items-center gap-2 pt-2">
                    <TrendingUp className="h-5 w-5 text-emerald-600" />
                    <span className="font-heading text-2xl font-bold text-emerald-600">{c.impact}</span>
                  </div>
                </div>
                <div className="border-t border-slate-100 bg-slate-50 px-6 py-4">
                  <div className="flex gap-2">
                    <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Ask your CPA</p>
                      <p className="mt-1 text-sm text-slate-700">{c.cpa}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-5xl px-6 py-20">
        <div className="mb-12 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Pricing</p>
          <h2 className="font-heading mt-3 text-3xl font-semibold text-navy-900 sm:text-4xl">
            Simple, honest pricing
          </h2>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {plans.map((p) => (
            <div
              key={p.id}
              className={`relative flex flex-col rounded-2xl border p-8 ${
                p.popular ? "border-teal-700 bg-white shadow-lg" : "border-slate-200 bg-white shadow-sm"
              }`}
            >
              {p.popular && (
                <span className="absolute -top-3 left-8 rounded-full bg-teal-700 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
                  Most popular
                </span>
              )}
              <h3 className="font-heading text-xl font-semibold text-navy-900">{p.name}</h3>
              <p className="text-sm text-slate-500">{p.tagline}</p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="font-heading text-4xl font-bold text-navy-900">{p.price}</span>
                {p.id === "pro" && <span className="text-sm text-slate-500">/ year</span>}
              </div>
              <ul className="mt-6 flex flex-1 flex-col gap-3">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-700">
                    <Check className="h-4 w-4 text-teal-700" /> {f}
                  </li>
                ))}
              </ul>
              <Link
                to="/signup"
                data-testid={`pricing-cta-${p.id}`}
                className={`mt-8 inline-flex items-center justify-center rounded-lg px-6 py-3 font-medium transition-colors ${
                  p.popular
                    ? "bg-teal-700 text-white hover:bg-teal-600"
                    : "border border-slate-300 text-navy-900 hover:bg-slate-50"
                }`}
              >
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-navy-900 py-12 text-slate-300">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div className="flex items-center gap-2">
              <ScanLine className="h-5 w-5 text-teal-500" />
              <span className="font-heading text-lg font-bold text-white">TaxLens</span>
            </div>
            <p className="max-w-md text-xs leading-relaxed text-slate-400">
              This is for educational purposes only and does not constitute tax or financial advice.
              TaxLens helps you understand your numbers and prepare better questions for a licensed
              professional.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
