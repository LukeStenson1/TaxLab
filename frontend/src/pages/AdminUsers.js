import React, { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowLeft, Shield, Loader2 } from "lucide-react";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";

const PLAN_BADGE = {
  free: "bg-slate-100 text-slate-600",
  pro: "bg-emerald-50 text-emerald-700",
  lifetime: "bg-indigo-50 text-indigo-700",
  admin: "bg-amber-50 text-amber-700",
};

export default function AdminUsers() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");

  const load = () => {
    Promise.all([api.get("/admin/users"), api.get("/orgs")])
      .then(([u, o]) => {
        setUsers(u.data.users || []);
        setOrgs(o.data.orgs || []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (user?.isAdmin) load();
  }, [user]);

  if (user === null) return null;
  if (!user?.isAdmin) return <Navigate to="/app/dashboard" replace />;

  const update = async (id, payload) => {
    setSavingId(id);
    try {
      await api.patch(`/admin/users/${id}`, payload);
      load();
    } finally {
      setSavingId("");
    }
  };

  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <Link to="/app/admin" className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-navy-900">
          <ArrowLeft className="h-4 w-4" /> Admin
        </Link>
        <h1 className="font-heading mt-2 text-3xl font-bold text-navy-900">Users</h1>
        <p className="mt-1 text-slate-600">Grant access, change plans, and assign people to organizations.</p>

        {loading ? (
          <p className="mt-8 text-sm text-slate-500">Loading…</p>
        ) : (
          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm" data-testid="admin-users-table">
              <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Plan / access</th>
                  <th className="px-4 py-3">Organization</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} data-testid={`admin-user-row-${u.email}`}>
                    <td className="px-4 py-3">
                      <span className="font-medium text-navy-900">{u.email}</span>
                      {u.isAdmin && (
                        <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700">
                          <Shield className="h-3 w-3" /> Admin
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {u.isAdmin ? (
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${PLAN_BADGE.admin}`}>admin</span>
                      ) : (
                        <select
                          data-testid={`admin-user-plan-${u.email}`}
                          value={u.billingStatus}
                          disabled={savingId === u.id}
                          onChange={(e) => update(u.id, { billingStatus: e.target.value })}
                          className={`rounded-lg border-0 px-2.5 py-1 text-xs font-semibold ${PLAN_BADGE[u.billingStatus] || PLAN_BADGE.free}`}
                        >
                          <option value="free">free</option>
                          <option value="pro">pro (granted)</option>
                          <option value="lifetime">lifetime</option>
                        </select>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        data-testid={`admin-user-org-${u.email}`}
                        value={u.orgId || ""}
                        disabled={savingId === u.id || u.isAdmin}
                        onChange={(e) => update(u.id, { orgId: e.target.value })}
                        className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs"
                      >
                        <option value="">— none —</option>
                        {orgs.map((o) => (
                          <option key={o.id} value={o.id}>{o.name}</option>
                        ))}
                      </select>
                      {savingId === u.id && <Loader2 className="ml-2 inline h-3.5 w-3.5 animate-spin text-slate-400" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
