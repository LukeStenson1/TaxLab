import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CreditCard, Lock, Trash2, Check, Loader2, BadgeCheck } from "lucide-react";
import api, { formatApiErrorDetail } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function Settings() {
  const { user, refresh, logout } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwMsg, setPwMsg] = useState(null);
  const [pwErr, setPwErr] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState("");

  useEffect(() => {
    api.get("/billing/plans").then(({ data }) => setPlans(data.plans || []));
    refresh();
  }, []);

  const changePassword = async (e) => {
    e.preventDefault();
    setPwMsg(null);
    setPwErr("");
    try {
      await api.post("/auth/change-password", { currentPassword, newPassword });
      setPwMsg("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      setPwErr(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    }
  };

  const startCheckout = async (planId) => {
    setCheckoutLoading(planId);
    try {
      const { data } = await api.post("/billing/checkout", {
        planId,
        originUrl: window.location.origin,
      });
      window.location.href = data.url;
    } catch (err) {
      alert(formatApiErrorDetail(err.response?.data?.detail) || err.message);
      setCheckoutLoading("");
    }
  };

  const deleteAccount = async () => {
    if (!window.confirm("This permanently deletes your account and all returns. Continue?")) return;
    await api.delete("/auth/account");
    await logout();
    navigate("/");
  };

  const billingStatus = user?.billingStatus || "free";
  const isPaid = billingStatus !== "free";

  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-heading text-3xl font-bold text-navy-900">Settings</h1>
        <p className="mt-1 text-slate-600">Manage your account and billing.</p>

        {/* Account */}
        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-heading text-lg font-semibold text-navy-900">Account</h2>
          <div className="mt-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Email</p>
            <p data-testid="settings-email" className="mt-1 text-navy-900">{user?.email}</p>
          </div>
        </section>

        {/* Billing */}
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-teal-700" />
            <h2 className="font-heading text-lg font-semibold text-navy-900">Billing</h2>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className="text-sm text-slate-600">Current plan:</span>
            <span
              data-testid="billing-status"
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                isPaid ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700"
              }`}
            >
              {isPaid && <BadgeCheck className="h-3.5 w-3.5" />}
              {billingStatus}
            </span>
          </div>

          {!isPaid && (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {plans.map((p) => (
                <div key={p.id} className="rounded-xl border border-slate-200 p-5">
                  <p className="font-heading text-lg font-semibold text-navy-900">{p.name}</p>
                  <p className="font-heading mt-1 text-2xl font-bold text-navy-900">
                    ${p.amount.toFixed(0)}
                  </p>
                  <button
                    onClick={() => startCheckout(p.id)}
                    disabled={checkoutLoading === p.id}
                    data-testid={`upgrade-${p.id}`}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-teal-700 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-600 disabled:opacity-60"
                  >
                    {checkoutLoading === p.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>Upgrade to {p.name}</>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
          {isPaid && (
            <p className="mt-4 flex items-center gap-2 text-sm text-emerald-700">
              <Check className="h-4 w-4" /> You have full access to all features.
            </p>
          )}
        </section>

        {/* Password */}
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-teal-700" />
            <h2 className="font-heading text-lg font-semibold text-navy-900">Change password</h2>
          </div>
          <form onSubmit={changePassword} className="mt-4 space-y-4">
            {pwMsg && (
              <div data-testid="password-success" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">
                {pwMsg}
              </div>
            )}
            {pwErr && (
              <div data-testid="password-error" className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
                {pwErr}
              </div>
            )}
            <input
              type="password"
              required
              data-testid="current-password"
              placeholder="Current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-transparent focus:ring-2 focus:ring-teal-600"
            />
            <input
              type="password"
              required
              data-testid="new-password"
              placeholder="New password (min 6 chars)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-transparent focus:ring-2 focus:ring-teal-600"
            />
            <button
              type="submit"
              data-testid="change-password-submit"
              className="rounded-lg bg-navy-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-navy-800"
            >
              Update password
            </button>
          </form>
        </section>

        {/* Danger zone */}
        <section className="mt-6 rounded-2xl border border-red-200 bg-red-50/50 p-6">
          <div className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-red-600" />
            <h2 className="font-heading text-lg font-semibold text-red-700">Delete account</h2>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            Permanently delete your account and all analyzed returns. This cannot be undone.
          </p>
          <button
            onClick={deleteAccount}
            data-testid="delete-account-button"
            className="mt-4 rounded-lg border border-red-300 bg-white px-5 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-600 hover:text-white"
          >
            Delete my account
          </button>
        </section>
      </div>
    </div>
  );
}
