import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UploadCloud, FileText, X, Loader2 } from "lucide-react";
import api, { formatApiErrorDetail } from "../lib/api";
import Disclaimer from "../components/Disclaimer";
import InfoTooltip from "../components/InfoTooltip";
import GLOSSARY from "../lib/glossary";
import { STATES } from "../lib/stateTax";

const FILING_STATUSES = [
  "single",
  "married filing jointly",
  "married filing separately",
  "head of household",
];

const GOALS = [
  { value: "reduce taxes", label: "Reduce taxes" },
  { value: "grow investments", label: "Grow investments" },
  { value: "plan for a life event", label: "Plan for a life event" },
  { value: "general awareness", label: "General awareness" },
];

const LIFE_CHANGES = ["New job", "Marriage", "New baby", "Retirement", "Home purchase"];

export default function Upload() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");

  const [filingStatus, setFilingStatus] = useState("single");
  const [stateCode, setStateCode] = useState("");
  const [dependents, setDependents] = useState(0);
  const [selfEmployment, setSelfEmployment] = useState("no");
  const [goal, setGoal] = useState("general awareness");
  const [lifeChanges, setLifeChanges] = useState([]);

  const pickFile = (f) => {
    setError("");
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".pdf")) {
      setError("Please upload a PDF file.");
      return;
    }
    setFile(f);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    pickFile(e.dataTransfer.files?.[0]);
  };

  const toggleLifeChange = (lc) => {
    setLifeChanges((prev) => (prev.includes(lc) ? prev.filter((x) => x !== lc) : [...prev, lc]));
  };

  const handleAnalyze = async () => {
    if (!file) {
      setError("Please upload your tax return PDF first.");
      return;
    }
    setError("");
    setAnalyzing(true);
    const form = new FormData();
    form.append("pdf", file);
    form.append("filingStatus", filingStatus);
    form.append("state", stateCode);
    form.append("dependents", String(dependents));
    form.append("selfEmployment", selfEmployment);
    form.append("goal", goal);
    form.append("lifeChanges", JSON.stringify(lifeChanges));
    try {
      const { data } = await api.post("/returns/analyze", form, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 120000,
      });
      navigate(`/app/analysis/${data.id}`);
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail) || err.message);
      setAnalyzing(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="font-heading text-3xl font-bold text-navy-900">Analyze a tax return</h1>
      <p className="mt-2 text-slate-600">
        Upload your IRS return PDF and answer a few quick questions. We never store the PDF.
      </p>

      {error && (
        <div data-testid="upload-error" className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Dropzone */}
      <div className="mt-8">
        {!file ? (
          <div
            data-testid="dropzone"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 text-center transition-colors ${
              dragOver ? "border-teal-600 bg-teal-50" : "border-slate-300 bg-slate-50 hover:bg-slate-100"
            }`}
          >
            <UploadCloud className="h-10 w-10 text-slate-400" />
            <p className="mt-4 font-medium text-navy-900">Drag and drop your tax return PDF</p>
            <p className="mt-1 text-sm text-slate-500">or click to browse — PDF only</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              data-testid="file-input"
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0])}
            />
          </div>
        ) : (
          <div data-testid="file-selected" className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50">
                <FileText className="h-5 w-5 text-teal-700" />
              </div>
              <div>
                <p className="text-sm font-medium text-navy-900">{file.name}</p>
                <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(0)} KB</p>
              </div>
            </div>
            <button
              onClick={() => setFile(null)}
              data-testid="remove-file"
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>

      {/* Intake form */}
      <div className="mt-10 space-y-6">
        <h2 className="font-heading text-lg font-semibold text-navy-900">A few quick questions</h2>

        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700">
            Filing status
            <InfoTooltip label="filing status" testid="info-filing-status" text={GLOSSARY.filingStatus} />
          </label>
          <select
            data-testid="intake-filing-status"
            value={filingStatus}
            onChange={(e) => setFilingStatus(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm capitalize focus:border-transparent focus:ring-2 focus:ring-teal-600"
          >
            {FILING_STATUSES.map((s) => (
              <option key={s} value={s} className="capitalize">
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700">
            State of residence
            <InfoTooltip label="state tax" testid="info-state" text={GLOSSARY.stateTax} />
          </label>
          <select
            data-testid="intake-state"
            value={stateCode}
            onChange={(e) => setStateCode(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-transparent focus:ring-2 focus:ring-teal-600"
          >
            <option value="">Select your state (for combined federal + state)</option>
            {STATES.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-500">
            Used to estimate your state income tax alongside federal. Optional, but recommended.
          </p>
        </div>

        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700">
            Number of dependents
            <InfoTooltip label="dependents" testid="info-dependents" text={GLOSSARY.dependents} />
          </label>
          <input
            type="number"
            min={0}
            data-testid="intake-dependents"
            value={dependents}
            onChange={(e) => setDependents(Math.max(0, Number(e.target.value)))}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-transparent focus:ring-2 focus:ring-teal-600"
          />
        </div>

        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700">
            Do you have self-employment income?
            <InfoTooltip label="self-employment" testid="info-self-employment" text={GLOSSARY.selfEmployment} />
          </label>
          <div className="flex gap-3">
            {["yes", "no"].map((v) => (
              <button
                key={v}
                type="button"
                data-testid={`intake-self-employment-${v}`}
                onClick={() => setSelfEmployment(v)}
                className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium capitalize transition-colors ${
                  selfEmployment === v
                    ? "border-teal-700 bg-teal-50 text-teal-700"
                    : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700">
            Primary financial goal this year
            <InfoTooltip label="financial goal" testid="info-goal" text={GLOSSARY.goal} />
          </label>
          <select
            data-testid="intake-goal"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-transparent focus:ring-2 focus:ring-teal-600"
          >
            {GOALS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Major life changes expected this year
          </label>
          <div className="flex flex-wrap gap-2">
            {LIFE_CHANGES.map((lc) => (
              <button
                key={lc}
                type="button"
                data-testid={`intake-life-change-${lc.toLowerCase().replace(/\s+/g, "-")}`}
                onClick={() => toggleLifeChange(lc)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                  lifeChanges.includes(lc)
                    ? "border-navy-900 bg-navy-900 text-white"
                    : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {lc}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleAnalyze}
          disabled={analyzing}
          data-testid="analyze-button"
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-700 py-3 font-medium text-white transition-colors hover:bg-teal-600 disabled:opacity-70"
        >
          {analyzing ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" /> Analyzing your return…
            </>
          ) : (
            "Analyze my return"
          )}
        </button>
        {analyzing && (
          <p className="text-center text-sm text-slate-500">
            Reading your PDF with AI — this can take up to a minute.
          </p>
        )}

        <div className="pt-2">
          <Disclaimer />
        </div>
      </div>
    </div>
  );
}
