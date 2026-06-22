import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Plus,
  Loader2,
  Trash2,
  FileText,
  TrendingUp,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import api from "../lib/api";
import Disclaimer from "../components/Disclaimer";
import YearOverYear from "../components/YearOverYear";
import { fmtUSD, fmtPct } from "../lib/taxCalc";

export default function Dashboard() {
  const navigate = useNavigate();
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api
      .get("/returns")
      .then(({ data }) => setReturns(data.returns || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    e.preventDefault();
    if (!window.confirm("Delete this return analysis?")) return;
    await api.delete(`/returns/${id}`);
    load();
  };

  const chartData = [...returns]
    .sort((a, b) => a.taxYear - b.taxYear)
    .map((r) => ({
      year: r.taxYear,
      rate: Number(((r.rawFields?.effectiveRate || 0) <= 1
        ? (r.rawFields?.effectiveRate || 0) * 100
        : r.rawFields?.effectiveRate || 0
      ).toFixed(2)),
    }));

  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-3xl font-bold text-navy-900">Dashboard</h1>
            <p className="mt-1 text-slate-600">Your analyzed returns by tax year.</p>
          </div>
          <Link
            to="/app/upload"
            data-testid="upload-new-button"
            className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-5 py-2.5 font-medium text-white transition-colors hover:bg-teal-600"
          >
            <Plus className="h-4 w-4" /> New return
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
          </div>
        ) : returns.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <FileText className="mx-auto h-10 w-10 text-slate-400" />
            <h3 className="font-heading mt-4 text-lg font-semibold text-navy-900">No returns yet</h3>
            <p className="mt-1 text-slate-600">Upload your first tax return to see your insights.</p>
            <Link
              to="/app/upload"
              data-testid="empty-upload-button"
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-navy-900 px-5 py-2.5 font-medium text-white hover:bg-navy-800"
            >
              <Plus className="h-4 w-4" /> Upload a return
            </Link>
          </div>
        ) : (
          <>
            {/* YoY trend */}
            {chartData.length >= 2 && (
              <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-teal-700" />
                  <h2 className="font-heading text-lg font-semibold text-navy-900">
                    Effective rate trend
                  </h2>
                </div>
                <div className="h-64 w-full" data-testid="trend-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ left: -10, right: 10, top: 10 }}>
                      <defs>
                        <linearGradient id="rateFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#0F766E" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#0F766E" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                      <XAxis dataKey="year" stroke="#64748B" fontSize={12} />
                      <YAxis stroke="#64748B" fontSize={12} unit="%" />
                      <Tooltip formatter={(v) => [`${v}%`, "Effective rate"]} />
                      <Area
                        type="monotone"
                        dataKey="rate"
                        stroke="#0F766E"
                        strokeWidth={2.5}
                        fill="url(#rateFill)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Year-over-year comparison */}
            <YearOverYear returns={returns} />

            {/* Year cards */}
            <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {returns.map((r) => {
                const rf = r.rawFields || {};
                return (
                  <Link
                    key={r.id}
                    to={`/app/analysis/${r.id}`}
                    data-testid={`return-card-${r.taxYear}`}
                    className="group flex flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-heading text-xl font-bold text-navy-900">
                        Tax Year {r.taxYear}
                      </span>
                      <button
                        onClick={(e) => handleDelete(r.id, e)}
                        data-testid={`delete-return-${r.taxYear}`}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">AGI</p>
                        <p className="mt-0.5 text-sm font-semibold text-navy-900">{fmtUSD(rf.agi)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Eff. rate</p>
                        <p className="mt-0.5 text-sm font-semibold text-navy-900">{fmtPct(rf.effectiveRate)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tax paid</p>
                        <p className="mt-0.5 text-sm font-semibold text-navy-900">{fmtUSD(rf.totalTax)}</p>
                      </div>
                    </div>
                    <span className="mt-4 text-sm font-medium text-teal-700 group-hover:underline">
                      View report →
                    </span>
                  </Link>
                );
              })}
            </div>
          </>
        )}

        <div className="mt-10">
          <Disclaimer />
        </div>
      </div>
    </div>
  );
}
