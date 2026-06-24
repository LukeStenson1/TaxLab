import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, FileWarning, Download, BookText, Lock } from "lucide-react";
import api from "../lib/api";
import InsightCard from "../components/InsightCard";
import ScenarioSimulator from "../components/ScenarioSimulator";
import Disclaimer from "../components/Disclaimer";
import InfoTooltip from "../components/InfoTooltip";
import GLOSSARY from "../lib/glossary";
import { useAuth } from "../context/AuthContext";
import { fmtUSD, fmtPct } from "../lib/taxCalc";
import { estStateTax, stateName, hasIncomeTax } from "../lib/stateTax";

const FREE_INSIGHTS = 2;

function StatTile({ label, value, testid, info }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-1.5">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
        {info && (
          <InfoTooltip
            text={info}
            label={label}
            position="bottom"
            testid={`info-${testid}`}
          />
        )}
      </div>
      <p data-testid={testid} className="font-heading mt-1 text-2xl font-bold text-navy-900">
        {value}
      </p>
    </div>
  );
}

export default function Analysis() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isPaid = !!(user?.isAdmin || (user?.billingStatus && user.billingStatus !== "free"));
  const [ret, setRet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    api
      .get(`/returns/${id}`)
      .then(({ data }) => setRet(data))
      .catch((e) => setError(e.response?.data?.detail || "Could not load this report."))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDownload = async () => {
    if (!isPaid) {
      navigate("/app/settings");
      return;
    }
    setDownloading(true);
    try {
      const res = await api.get(`/returns/${id}/pdf`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `TaxLens_Report_${ret?.taxYear || "report"}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert("Could not generate the PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

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

  const stateCode = rf.state || "";
  const agi = Number(rf.agi) || 0;
  const taxable = Number(rf.taxableIncome) || 0;
  const federalTax = Number(rf.totalTax) || 0;
  const stateTaxEst = estStateTax(stateCode, taxable);
  const combinedTax = federalTax + stateTaxEst;
  const combinedEff = agi > 0 ? combinedTax / agi : 0;

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
          <button
            onClick={handleDownload}
            disabled={downloading}
            data-testid="download-pdf-button"
            className="inline-flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-navy-800 disabled:opacity-60"
          >
            {downloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isPaid ? (
              <Download className="h-4 w-4" />
            ) : (
              <Lock className="h-4 w-4" />
            )}
            {isPaid ? "Download PDF" : "Download PDF (Pro)"}
          </button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        {/* Income context */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatTile label="AGI" value={fmtUSD(rf.agi)} testid="stat-agi" info={GLOSSARY.agi} />
          <StatTile
            label="Taxable income"
            value={fmtUSD(rf.taxableIncome)}
            testid="stat-taxable"
            info={GLOSSARY.taxableIncome}
          />
          <StatTile
            label="Federal effective rate"
            value={fmtPct(rf.effectiveRate)}
            testid="stat-effective"
            info={GLOSSARY.effectiveRate}
          />
          <StatTile
            label="Combined rate"
            value={stateCode ? fmtPct(combinedEff) : "—"}
            testid="stat-combined-rate"
            info={GLOSSARY.combinedEffectiveRate}
          />
        </div>

        {/* Unified tax breakdown: Federal + State = Combined */}
        <div
          data-testid="combined-tax-section"
          className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-navy-900 text-white shadow-sm"
        >
          <div className="flex items-center gap-2 border-b border-white/10 px-6 py-4">
            <h2 className="font-heading text-lg font-semibold">What you owe</h2>
            <InfoTooltip tone="light" label="combined tax" testid="info-combined" text={GLOSSARY.combinedTax} />
            <span className="ml-auto rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              {stateCode ? stateName(stateCode) : "No state selected"}
            </span>
          </div>

          <div className="grid items-center gap-2 px-6 py-6 sm:grid-cols-[1fr_auto_1fr_auto_1.1fr]">
            {/* Federal */}
            <div className="text-center sm:text-left">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Federal tax</p>
              <p data-testid="combined-federal" className="font-heading mt-1 text-2xl font-bold">
                {fmtUSD(federalTax)}
              </p>
            </div>

            <div className="hidden text-2xl font-light text-slate-500 sm:block">+</div>

            {/* State */}
            <div className="text-center sm:text-left">
              <p className="flex items-center justify-center gap-1 text-xs font-bold uppercase tracking-wider text-slate-400 sm:justify-start">
                State tax (est.)
                <InfoTooltip tone="light" label="state tax" testid="info-state-tax" text={GLOSSARY.stateTax} />
              </p>
              <p data-testid="combined-state" className="font-heading mt-1 text-2xl font-bold text-teal-300">
                {stateCode ? fmtUSD(stateTaxEst) : "—"}
              </p>
            </div>

            <div className="hidden text-2xl font-light text-slate-500 sm:block">=</div>

            {/* Combined */}
            <div className="rounded-xl bg-white/5 p-4 text-center sm:text-left">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-300">Combined tax</p>
              <p data-testid="combined-total" className="font-heading mt-1 text-3xl font-bold text-white">
                {fmtUSD(combinedTax)}
              </p>
              <p data-testid="combined-rate" className="mt-0.5 text-xs text-slate-400">
                {stateCode ? `${fmtPct(combinedEff)} of AGI` : `Federal only · ${fmtPct(rf.effectiveRate)}`}
              </p>
            </div>
          </div>

          <p className="border-t border-white/10 px-6 py-3 text-xs text-slate-400">
            {!stateCode
              ? "No state selected, so this shows federal only. Run a new analysis and pick your state to include state income tax."
              : !hasIncomeTax(stateCode)
              ? `${stateName(stateCode)} has no broad state income tax, so your state estimate is $0 and combined equals federal.`
              : `State tax is a simplified estimate using ${stateName(stateCode)}'s typical rate — not an exact figure.`}
          </p>
        </div>

        {/* Insights */}
        <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading text-2xl font-semibold text-navy-900">Your insights</h2>
          {!isPaid && insights.length > FREE_INSIGHTS && (
            <Link
              to="/app/settings"
              data-testid="unlock-report-cta"
              className="inline-flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-navy-800"
            >
              <Lock className="h-4 w-4" />
              Unlock full report
            </Link>
          )}
        </div>
        {!isPaid && insights.length > FREE_INSIGHTS && (
          <p className="mt-1 text-sm text-slate-600">
            You're seeing {FREE_INSIGHTS} of {insights.length} insights in full. Upgrade to Pro to
            reveal the rest and download your report.
          </p>
        )}
        {insights.length === 0 ? (
          <p className="mt-4 text-slate-600">
            No specific insights were generated for this return.
          </p>
        ) : (
          <div data-testid="insights-grid" className="mt-5 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {insights.map((ins, i) => (
              <InsightCard
                key={`${ins.module}-${i}`}
                insight={ins}
                rank={i}
                locked={!isPaid && i >= FREE_INSIGHTS}
              />
            ))}
          </div>
        )}

        {/* Simulator */}
        <h2 className="font-heading mt-12 text-2xl font-semibold text-navy-900">What if?</h2>
        <p className="mb-5 mt-1 text-slate-600">
          Explore how common moves could change your estimated federal tax.
        </p>
        <ScenarioSimulator rawFields={rf} />

        {/* Sources & methodology */}
        {ret.sources && ret.sources.length > 0 && (
          <div
            data-testid="sources-section"
            className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="flex items-center gap-2">
              <BookText className="h-5 w-5 text-teal-700" />
              <h2 className="font-heading text-lg font-semibold text-navy-900">
                Sources & methodology
              </h2>
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Calculations are grounded in official IRS figures for tax year {ret.taxYear}.
            </p>
            <ul className="mt-3 space-y-1.5">
              {ret.sources.map((s, i) => (
                <li key={i} className="flex gap-2 text-sm text-slate-600">
                  <span className="text-teal-700">•</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <Disclaimer fixed />
    </div>
  );
}
