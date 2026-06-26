import React, { useEffect, useMemo, useState } from "react";
import { Search, BookOpen, ChevronDown, X } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";

// Display order for categories
const CATEGORY_ORDER = [
  "Filing Basics",
  "Income Types",
  "Tax Basics",
  "Deductions & Credits",
  "Self-Employment",
  "Investments",
  "Retirement",
  "Life Events",
  "Planning & Strategy",
  "Advanced",
];

export default function LearningCenter({ heading = true }) {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState(null);
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/learning`)
      .then((r) => r.json())
      .then((data) => setSections(data.sections || []))
      .catch(() => setSections([]))
      .finally(() => setLoading(false));
  }, []);

  // Get unique categories from sections, sorted by CATEGORY_ORDER
  // Normalize a category string — trim whitespace, collapse internal spaces
const normalizeCategory = (cat) =>
  (cat || "").trim().replace(/\s+/g, " ");

const categories = useMemo(() => {
  const seen = new Map(); // normalized → display value
  sections.forEach((s) => {
    const norm = normalizeCategory(s.category);
    if (!seen.has(norm)) seen.set(norm, norm);
  });
  const found = [...seen.keys()];
  return found.sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a);
    const bi = CATEGORY_ORDER.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}, [sections]);

  const filtered = useMemo(() => {
    let result = sections;

    // Apply category filter
   if (activeCategory) {
     result = result.filter((s) => normalizeCategory(s.category) === activeCategory);

    // Apply search filter
    const q = query.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.body.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q)
      );
    }

    return result;
  }, [sections, query, activeCategory]);

  const handleCategoryClick = (cat) => {
    setActiveCategory((prev) => (prev === cat ? null : cat));
    setOpenId(null);
  };

  const clearFilters = () => {
    setActiveCategory(null);
    setQuery("");
    setOpenId(null);
  };

  const hasActiveFilter = activeCategory || query.trim();

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

      {/* Search */}
      <div className="relative mt-5 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          data-testid="learning-search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpenId(null);
          }}
          placeholder="Search terms, e.g. dependent, AMT, capital gains…"
          className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm focus:border-transparent focus:ring-2 focus:ring-teal-600"
        />
      </div>

      {/* Category filters */}
      {!loading && categories.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategoryClick(cat)}
              data-testid={`filter-${cat.toLowerCase().replace(/\s+/g, "-")}`}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                activeCategory === cat
                  ? "border-teal-700 bg-teal-700 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
              }`}
            >
              {cat}
              {activeCategory === cat && (
                <span className="ml-1.5 opacity-70">×</span>
              )}
            </button>
          ))}

          {hasActiveFilter && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100"
            >
              <X className="h-3 w-3" />
              Clear
            </button>
          )}
        </div>
      )}

      {/* Active filter indicator */}
      {(activeCategory || query.trim()) && !loading && (
        <p className="mt-3 text-xs text-slate-500">
          Showing {filtered.length} topic{filtered.length !== 1 ? "s" : ""}
          {activeCategory ? ` in ${activeCategory}` : ""}
          {query.trim() ? ` matching "${query.trim()}"` : ""}
        </p>
      )}

      {/* Content */}
      {loading ? (
        <div className="mt-8 flex flex-col items-center gap-3 py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-teal-600" />
          <p className="text-sm text-slate-500">Loading topics…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 py-12 text-center">
          <BookOpen className="h-6 w-6 text-slate-400" />
          <p className="text-sm text-slate-500">
            {hasActiveFilter ? "No matching topics." : "No topics added yet."}
          </p>
          {hasActiveFilter && (
            <button
              onClick={clearFilters}
              className="mt-2 text-xs font-medium text-teal-600 hover:underline"
            >
              Clear filters
            </button>
          )}
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
                    <span className="font-heading text-base font-semibold text-navy-900">
                      {s.title}
                    </span>
                  </span>
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200 ${
                      open ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {open && (
                  <div className="border-t border-slate-100 px-5 pb-5 pt-4">
                    {s.body.split("\n").filter(Boolean).map((p, i) => (
                      <p key={i} className="mt-2 text-[15px] leading-relaxed text-slate-700">
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
