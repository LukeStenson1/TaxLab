import React from "react";
import { Link } from "react-router-dom";
import { ScanLine, ArrowRight, BookOpen } from "lucide-react";
import LearningCenter from "../components/LearningCenter";

export default function Learn() {
  return (
    <div className="min-h-screen bg-white">
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
            from what counts as a dependent to AMT, NIIT, and QBI.
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-5xl px-6 py-14">
        <LearningCenter heading={false} />
      </main>

      <section className="border-t border-slate-200 bg-slate-50 py-16 text-center">
        <div className="mx-auto max-w-3xl px-6">
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
        </div>
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
