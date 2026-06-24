import React, { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowLeft, Building2, Plus, Trash2, UserPlus, Loader2, CreditCard, X } from "lucide-react";
import api, { formatApiErrorDetail } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function AdminOrgs() {
  const { user } = useAuth();
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newOrg, setNewOrg] = useState({ name: "", seats: 3, ownerEmail: "" });
  const [selected, setSelected] = useState(null); // org detail
  const [memberEmail, setMemberEmail] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => {
    api.get("/orgs").then(({ data }) => setOrgs(data.orgs || [])).finally(() => setLoading(false));
  };
  useEffect(() => {
    if (user?.isAdmin) load();
  }, [user]);

  if (user === null) return null;
  if (!user?.isAdmin) return <Navigate to="/app/dashboard" replace />;

  const openOrg = async (id) => {
    setErr("");
    const { data } = await api.get(`/orgs/${id}`);
    setSelected(data.org);
  };

  const createOrg = async () => {
    if (!newOrg.name.trim()) return;
    setBusy(true);
    setErr("");
    try {
      await api.post("/orgs", {
        name: newOrg.name,
        seats: Number(newOrg.seats),
        ownerEmail: newOrg.ownerEmail || undefined,
      });
      setNewOrg({ name: "", seats: 3, ownerEmail: "" });
      setCreating(false);
      load();
    } catch (e) {
      setErr(formatApiErrorDetail(e.response?.data?.detail) || e.message);
    } finally {
      setBusy(false);
    }
  };

  const addMember = async () => {
    if (!memberEmail.trim()) return;
    setBusy(true);
    setErr("");
    try {
      const { data } = await api.post(`/orgs/${selected.id}/members`, { email: memberEmail });
      setSelected(data.org);
      setMemberEmail("");
      load();
    } catch (e) {
      setErr(formatApiErrorDetail(e.response?.data?.detail) || e.message);
    } finally {
      setBusy(false);
    }
  };

  const removeMember = async (uid) => {
    const { data } = await api.delete(`/orgs/${selected.id}/members/${uid}`);
    setSelected(data.org);
    load();
  };

  const updateSeats = async (seats) => {
    setErr("");
    try {
      const { data } = await api.patch(`/orgs/${selected.id}`, { seats: Number(seats) });
      setSelected({ ...selected, seats: data.org.seats });
      load();
    } catch (e) {
      setErr(formatApiErrorDetail(e.response?.data?.detail) || e.message);
    }
  };

  const deleteOrg = async (id) => {
    if (!window.confirm("Delete this organization and unlink all members?")) return;
    await api.delete(`/orgs/${id}`);
    setSelected(null);
    load();
  };

  const subscribe = async (planId) => {
    setBusy(true);
    setErr("");
    try {
      const { data } = await api.post("/billing/checkout", {
        planId,
        originUrl: window.location.origin,
        seats: selected.seats,
        orgId: selected.id,
      });
      window.location.href = data.url;
    } catch (e) {
      setErr(formatApiErrorDetail(e.response?.data?.detail) || e.message);
      setBusy(false);
    }
  };

  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <Link to="/app/admin" className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-navy-900">
          <ArrowLeft className="h-4 w-4" /> Admin
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-heading text-3xl font-bold text-navy-900">Organizations</h1>
            <p className="mt-1 text-slate-600">Business accounts — one subscription covers all linked seats.</p>
          </div>
          <button
            onClick={() => setCreating(true)}
            data-testid="admin-create-org"
            className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-600"
          >
            <Plus className="h-4 w-4" /> New organization
          </button>
        </div>

        {err && <p data-testid="admin-org-error" className="mt-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{err}</p>}

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          {/* Org list */}
          <div className="space-y-3" data-testid="admin-orgs-list">
            {loading ? (
              <p className="text-sm text-slate-500">Loading…</p>
            ) : orgs.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 py-12 text-center">
                <Building2 className="h-6 w-6 text-slate-400" />
                <p className="text-sm text-slate-500">No organizations yet.</p>
              </div>
            ) : (
              orgs.map((o) => (
                <button
                  key={o.id}
                  onClick={() => openOrg(o.id)}
                  data-testid={`admin-org-${o.id}`}
                  className={`flex w-full items-center justify-between rounded-xl border bg-white p-4 text-left shadow-sm transition-colors hover:border-teal-400 ${
                    selected?.id === o.id ? "border-teal-500 ring-1 ring-teal-500" : "border-slate-200"
                  }`}
                >
                  <div>
                    <p className="font-heading font-semibold text-navy-900">{o.name}</p>
                    <p className="text-xs text-slate-500">
                      {o.memberCount}/{o.seats} seats · {o.billingStatus}
                    </p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${o.billingStatus !== "free" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                    {o.billingStatus !== "free" ? "active" : "free"}
                  </span>
                </button>
              ))
            )}
          </div>

          {/* Org detail */}
          <div>
            {selected ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" data-testid="admin-org-detail">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-heading text-xl font-semibold text-navy-900">{selected.name}</h2>
                    <p className="text-sm text-slate-500">
                      Owner: {selected.ownerEmail || "—"} · Plan: {selected.billingStatus}
                    </p>
                  </div>
                  <button onClick={() => deleteOrg(selected.id)} className="rounded-lg p-2 text-red-500 hover:bg-red-50" title="Delete org">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Seats */}
                <div className="mt-4 flex items-center gap-2">
                  <label className="text-sm text-slate-600">Seats:</label>
                  <input
                    type="number"
                    min={1}
                    defaultValue={selected.seats}
                    data-testid="admin-org-seats"
                    onBlur={(e) => updateSeats(e.target.value)}
                    className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-sm"
                  />
                  <span className="text-xs text-slate-500">{selected.members?.length || 0} used</span>
                </div>

                {/* Members */}
                <div className="mt-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Members</p>
                  <div className="mt-2 space-y-2" data-testid="admin-org-members">
                    {(selected.members || []).map((m) => (
                      <div key={m.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm">
                        <span className="text-navy-900">
                          {m.email}
                          {m.orgRole === "owner" && <span className="ml-2 text-xs text-teal-700">owner</span>}
                        </span>
                        {m.orgRole !== "owner" && (
                          <button onClick={() => removeMember(m.id)} data-testid={`admin-remove-member-${m.email}`} className="text-red-500 hover:text-red-600">
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    {(selected.members || []).length === 0 && (
                      <p className="text-sm text-slate-500">No members yet.</p>
                    )}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <input
                      value={memberEmail}
                      onChange={(e) => setMemberEmail(e.target.value)}
                      placeholder="member@email.com (must have an account)"
                      data-testid="admin-member-email"
                      className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-teal-600"
                    />
                    <button
                      onClick={addMember}
                      disabled={busy}
                      data-testid="admin-add-member"
                      className="inline-flex items-center gap-1 rounded-lg bg-navy-900 px-3 py-2 text-sm font-medium text-white hover:bg-navy-800 disabled:opacity-60"
                    >
                      <UserPlus className="h-4 w-4" /> Add
                    </button>
                  </div>
                </div>

                {/* Subscribe */}
                <div className="mt-6 border-t border-slate-100 pt-4">
                  <p className="flex items-center gap-2 text-sm font-medium text-navy-900">
                    <CreditCard className="h-4 w-4 text-teal-700" /> Subscription ({selected.seats} seats)
                  </p>
                  {selected.billingStatus !== "free" ? (
                    <p className="mt-2 text-sm text-emerald-700">Active — all {selected.members?.length || 0} members have Pro access.</p>
                  ) : (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button onClick={() => subscribe("pro_monthly")} disabled={busy} data-testid="admin-org-sub-monthly" className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-600 disabled:opacity-60">
                        {busy && <Loader2 className="h-4 w-4 animate-spin" />} $20/mo × {selected.seats}
                      </button>
                      <button onClick={() => subscribe("pro_annual")} disabled={busy} data-testid="admin-org-sub-annual" className="inline-flex items-center gap-2 rounded-lg border border-teal-600 px-4 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50 disabled:opacity-60">
                        $200/yr × {selected.seats}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex h-full min-h-[200px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 text-center">
                <Building2 className="h-6 w-6 text-slate-400" />
                <p className="mt-2 text-sm text-slate-500">Select an organization to manage it.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create modal */}
      {creating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/50 p-4" onClick={() => setCreating(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-heading text-lg font-semibold text-navy-900">New organization</h2>
            <div className="mt-4 space-y-4">
              <input
                value={newOrg.name}
                onChange={(e) => setNewOrg({ ...newOrg, name: e.target.value })}
                placeholder="Business name"
                data-testid="new-org-name"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-transparent focus:ring-2 focus:ring-teal-600"
              />
              <div>
                <label className="mb-1 block text-sm text-slate-600">Seats</label>
                <input
                  type="number"
                  min={1}
                  value={newOrg.seats}
                  onChange={(e) => setNewOrg({ ...newOrg, seats: e.target.value })}
                  data-testid="new-org-seats"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-transparent focus:ring-2 focus:ring-teal-600"
                />
              </div>
              <input
                value={newOrg.ownerEmail}
                onChange={(e) => setNewOrg({ ...newOrg, ownerEmail: e.target.value })}
                placeholder="Owner email (optional, must have account)"
                data-testid="new-org-owner"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-transparent focus:ring-2 focus:ring-teal-600"
              />
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setCreating(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
              <button onClick={createOrg} disabled={busy} data-testid="new-org-save" className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-600 disabled:opacity-60">
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
