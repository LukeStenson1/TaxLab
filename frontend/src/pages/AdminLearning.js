import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Plus, Pencil, Trash2, Eye, EyeOff, Loader2, X, RefreshCw, BookOpen, GripVertical } from "lucide-react";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Plus, Pencil, Trash2, Eye, EyeOff, Loader2, X, RefreshCw, BookOpen, GripVertical, ArrowLeft } from "lucide-react";

const EMPTY = { title: "", category: "", body: "", hidden: false };

export default function AdminLearning() {
  const { user } = useAuth();
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | {} (new) | section
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [taxMeta, setTaxMeta] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);

  const handleDrop = async (toIndex) => {
    if (dragIndex === null || dragIndex === toIndex) {
      setDragIndex(null);
      return;
    }
    const reordered = [...sections];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(toIndex, 0, moved);
    setSections(reordered);
    setDragIndex(null);
    try {
      await api.post("/learning/reorder", { ids: reordered.map((s) => s.id) });
    } catch {
      load();
    }
  };

  const load = () => {
    setLoading(true);
    api
      .get("/learning/all")
      .then(({ data }) => setSections(data.sections || []))
      .catch(() => setSections([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (user?.isAdmin) {
      load();
      api.get("/admin/tax-data").then(({ data }) => setTaxMeta(data)).catch(() => {});
    }
  }, [user]);

  if (user === null) return null;
  if (!user?.isAdmin) return <Navigate to="/app/dashboard" replace />;

  const openNew = () => {
    setForm(EMPTY);
    setEditing({});
  };
  const openEdit = (s) => {
    setForm({ title: s.title, category: s.category, body: s.body, hidden: s.hidden });
    setEditing(s);
  };

  const save = async () => {
    if (!form.title.trim() || !form.category.trim() || !form.body.trim()) return;
    setSaving(true);
    try {
      if (editing && editing.id) {
        await api.put(`/learning/${editing.id}`, form);
      } else {
        await api.post("/learning", form);
      }
      setEditing(null);
      load();
    } finally {
      setSaving(false);
    }
  };

  const toggleHide = async (s) => {
    await api.patch(`/learning/${s.id}/visibility`);
    load();
  };

  const remove = async (s) => {
    if (!window.confirm(`Delete "${s.title}"? This cannot be undone.`)) return;
    await api.delete(`/learning/${s.id}`);
    load();
  };

  const refreshTaxData = async () => {
    setRefreshing(true);
    try {
      const { data } = await api.post("/admin/tax-data/refresh");
      setTaxMeta((m) => ({ ...(m || {}), lastRefreshed: data.lastRefreshed }));
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              to="/app/admin"
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              title="Back to admin"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="font-heading text-3xl font-bold text-navy-900">Admin · Learning center</h1>
              <p className="mt-1 text-slate-600">Add, edit, hide, or delete the public learning sections.</p>
            </div>
          </div>
          <button
            onClick={openNew}
            data-testid="admin-add-section"
            className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-600"
          >
            <Plus className="h-4 w-4" /> New section
          </button>
        </div>

        {/* Tax data refresh */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <p className="font-heading text-sm font-semibold text-navy-900">Tax reference data</p>
            <p className="text-xs text-slate-500">
              Years loaded: {taxMeta?.reference ? Object.keys(taxMeta.reference).join(", ") : "…"}
              {taxMeta?.lastRefreshed ? ` · Last refreshed ${new Date(taxMeta.lastRefreshed).toLocaleString()}` : ""}
            </p>
          </div>
          <button
            onClick={refreshTaxData}
            disabled={refreshing}
            data-testid="admin-refresh-tax"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
          >
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh tax data
          </button>
        </div>

        {/* List */}
        {loading ? (
          <p className="mt-8 text-sm text-slate-500">Loading…</p>
        ) : (
          <div className="mt-6 space-y-3" data-testid="admin-sections-list">
            <p className="text-xs text-slate-500">Drag the handle to reorder how topics appear on the learning page.</p>
            {sections.map((s, idx) => (
              <div
                key={s.id}
                draggable
                onDragStart={() => setDragIndex(idx)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(idx)}
                data-testid={`admin-section-${s.slug}`}
                className={`flex items-start justify-between gap-4 rounded-xl border bg-white p-4 shadow-sm ${
                  s.hidden ? "opacity-60" : ""
                } ${dragIndex === idx ? "border-teal-400 ring-2 ring-teal-300" : "border-slate-200"}`}
              >
                <div className="flex min-w-0 items-start gap-3">
                  <GripVertical
                    data-testid={`admin-drag-${s.slug}`}
                    className="mt-1 h-4 w-4 shrink-0 cursor-grab text-slate-400 active:cursor-grabbing"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-teal-700">
                        {s.category}
                      </span>
                      {s.hidden && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Hidden
                        </span>
                      )}
                    </div>
                    <p className="mt-1 font-heading font-semibold text-navy-900">{s.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-sm text-slate-500">{s.body}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button onClick={() => toggleHide(s)} title={s.hidden ? "Show" : "Hide"} data-testid={`admin-hide-${s.slug}`} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
                    {s.hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <button onClick={() => openEdit(s)} title="Edit" data-testid={`admin-edit-${s.slug}`} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => remove(s)} title="Delete" data-testid={`admin-delete-${s.slug}`} className="rounded-lg p-2 text-red-500 hover:bg-red-50">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            {sections.length === 0 && (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 py-12 text-center">
                <BookOpen className="h-6 w-6 text-slate-400" />
                <p className="text-sm text-slate-500">No sections yet. Add your first one.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Editor modal */}
      {editing !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/50 p-4" onClick={() => setEditing(null)}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-lg font-semibold text-navy-900">
                {editing.id ? "Edit section" : "New section"}
              </h2>
              <button onClick={() => setEditing(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Title</label>
                <input
                  data-testid="admin-form-title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-transparent focus:ring-2 focus:ring-teal-600"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Category</label>
                <input
                  data-testid="admin-form-category"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="e.g. Filing basics, Investments, How-to calculations"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-transparent focus:ring-2 focus:ring-teal-600"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Body</label>
                <textarea
                  data-testid="admin-form-body"
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  rows={6}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-transparent focus:ring-2 focus:ring-teal-600"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  data-testid="admin-form-hidden"
                  checked={form.hidden}
                  onChange={(e) => setForm({ ...form, hidden: e.target.checked })}
                />
                Hidden (not shown to users)
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                data-testid="admin-form-save"
                className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-600 disabled:opacity-60"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
