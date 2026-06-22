import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ScanLine, Mail, Lock } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { formatApiErrorDetail } from "../lib/api";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/app/dashboard");
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-navy-900 p-12 text-white lg:flex">
        <Link to="/" className="flex items-center gap-2">
          <ScanLine className="h-6 w-6 text-teal-500" />
          <span className="font-heading text-xl font-bold">TaxLens</span>
        </Link>
        <div>
          <h2 className="font-heading text-3xl font-semibold leading-tight">
            "Here's what your numbers mean — and what to ask your CPA."
          </h2>
          <p className="mt-4 text-slate-400">
            Welcome back. Pick up where you left off and review your insights.
          </p>
        </div>
        <p className="text-xs text-slate-500">
          Educational only — not tax or financial advice.
        </p>
      </div>

      <div className="flex items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-8 flex items-center gap-2 lg:hidden">
            <ScanLine className="h-6 w-6 text-teal-700" />
            <span className="font-heading text-xl font-bold text-navy-900">TaxLens</span>
          </Link>
          <h1 className="font-heading text-3xl font-bold text-navy-900">Log in</h1>
          <p className="mt-2 text-slate-600">Access your tax insight dashboard.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {error && (
              <div data-testid="login-error" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  data-testid="login-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm focus:border-transparent focus:ring-2 focus:ring-teal-600"
                  placeholder="you@example.com"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  required
                  data-testid="login-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm focus:border-transparent focus:ring-2 focus:ring-teal-600"
                  placeholder="••••••••"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              data-testid="login-submit"
              className="w-full rounded-lg bg-navy-900 py-2.5 font-medium text-white transition-colors hover:bg-navy-800 disabled:opacity-60"
            >
              {loading ? "Logging in..." : "Log in"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            Don't have an account?{" "}
            <Link to="/signup" data-testid="goto-signup" className="font-medium text-teal-700 hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
