import React, { useEffect, useMemo, useState } from "react";
import { Search, BookOpen } from "lucide-react";
import api from "../lib/api";

export default function LearningCenter({ heading = true }) {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

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

  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach((s) => {
      (map[s.category] = map[s.category] || []).push(s);
    });
    return Object.entries(map);
  }, [filtered]);

  return (
    <div data-testid="learning-center">
      {heading && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-heading text-2xl font-bold text-navy-900">Learning center</h2>
            <p className="text-sm text-slate-600">Plain-English tax explanations and how-tos.</p>
          </div>
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
        <div className="mt-8 space-y-10">
          {grouped.map(([category, items]) => (
            <div key={category}>
              <h3 className="font-heading text-xs font-bold uppercase tracking-[0.2em] text-teal-700">
                {category}
              </h3>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {items.map((s) => (
                  <article
                    key={s.id}
                    id={s.slug}
                    data-testid={`learning-section-${s.slug}`}
                    className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <h4 className="font-heading text-lg font-semibold text-navy-900">{s.title}</h4>
                    {s.body.split("\n").filter(Boolean).map((p, i) => (
                      <p key={i} className="mt-2 text-[15px] leading-relaxed text-slate-700">
                        {p}
                      </p>
                    ))}
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
