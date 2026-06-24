import React, { useEffect, useMemo, useState } from "react";
import { Search, BookOpen, ChevronDown } from "lucide-react";
import api from "../lib/api";

export default function LearningCenter({ heading = true }) {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    api
      .get("/learning")
      .then(({ data }) => setSections(data.sections || []))
      .catch(() => setSections([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sections;
    return sections.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.body.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q)
    );
  }, [sections, query]);

  return (
    <div data-testid="learning-center">
      {heading && (
        <div>
          <h2 className="font-heading text-2xl font-bold text-navy-900">Learning center</h2>
          <p className="text-sm text-slate-600">
            Plain-English tax explanations — tap any topic to expand. Ordered from the basics to the
            more advanced.
          </p>
        </div>
      )}

      <div className="relative mt-5 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          data-testid="learning-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search terms, e.g. dependent, AMT, capital gains…"
          className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm focus:border-transparent focus:ring-2 focus:ring-teal-600"
        />
      </div>

      {loading ? (
        <p className="mt-8 text-sm text-slate-500">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 py-12 text-center">
          <BookOpen className="h-6 w-6 text-slate-400" />
          <p className="text-sm text-slate-500">No matching topics.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {filtered.map((s) => {
            const open = openId === s.id;
            return (
              <div
                key={s.id}
                id={s.slug}
                data-testid={`learning-section-${s.slug}`}
                className={`overflow-hidden rounded-xl border bg-white shadow-sm transition-colors ${
                  open ? "border-teal-400" : "border-slate-200"
                }`}
              >
                <button
                  onClick={() => setOpenId(open ? null : s.id)}
                  data-testid={`learning-toggle-${s.slug}`}
                  className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
                >
                  <span className="flex items-center gap-3">
                    <span className="hidden rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-teal-700 sm:inline">
                      {s.category}
                    </span>
                    <span className="font-heading text-base font-semibold text-navy-900">{s.title}</span>
                  </span>
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                  />
                </button>
                {open && (
                  <div className="border-t border-slate-100 px-5 pb-5 pt-4">
                    {s.body.split("\n").filter(Boolean).map((p, i) => (
                      <p key={i} className="text-[15px] leading-relaxed text-slate-700">
                        {p}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
