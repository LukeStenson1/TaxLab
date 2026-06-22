import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Loader2, FileWarning } from "lucide-react";
import api from "../lib/api";
import InsightCard from "../components/InsightCard";
import ScenarioSimulator from "../components/ScenarioSimulator";
import Disclaimer from "../components/Disclaimer";
import { fmtUSD, fmtPct } from "../lib/taxCalc";

function StatTile({ label, value, testid }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p data-testid={testid} className="font-heading mt-1 text-2xl font-bold text-navy-900">
        {value}
      </p>
    </div>
  );
}

export default function Analysis() {
  const { id } = useParams();
  const [ret, setRet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get(`/returns/${id}`)
      .then(({ data }) => setRet(data))
      .catch((e) => setError(e.response?.data?.detail || "Could not load this report."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (error || !ret) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <FileWarning className="mx-auto h-10 w-10 text-slate-400" />
        <p className="mt-4 text-slate-600">{error || "Report not found."}</p>
        <Link to="/app/dashboard" className="mt-4 inline-block font-medium text-teal-700 hover:underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const rf = ret.rawFields || {};
  const insights = ret.insights || [];

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link to="/app/dashboard" data-testid="back-to-dashboard" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="font-heading text-xl font-bold text-navy-900">
                Tax Year {ret.taxYear} Report
              </h1>
              <p className="text-xs text-slate-500">
                {insights.length} insights ranked by estimated dollar impact
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        {/* Summary stats */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatTile label="AGI" value={fmtUSD(rf.agi)} testid="stat-agi" />
          <StatTile label="Taxable income" value={fmtUSD(rf.taxableIncome)} testid="stat-taxable" />
          <StatTile label="Total tax" value={fmtUSD(rf.totalTax)} testid="stat-total-tax" />
          <StatTile label="Effective rate" value={fmtPct(rf.effectiveRate)} testid="stat-effective" />
        </div>

        {/* Insights */}
        <h2 className="font-heading mt-10 text-2xl font-semibold text-navy-900">Your insights</h2>
        {insights.length === 0 ? (
          <p className="mt-4 text-slate-600">
            No specific insights were generated for this return.
          </p>
        ) : (
          <div data-testid="insights-grid" className="mt-5 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {insights.map((ins, i) => (
              <InsightCard key={`${ins.module}-${i}`} insight={ins} rank={i} />
            ))}
          </div>
        )}

        {/* Simulator */}
        <h2 className="font-heading mt-12 text-2xl font-semibold text-navy-900">What if?</h2>
        <p className="mb-5 mt-1 text-slate-600">
          Explore how common moves could change your estimated federal tax.
        </p>
        <ScenarioSimulator rawFields={rf} />
      </div>

      <Disclaimer fixed />
    </div>
  );
}
