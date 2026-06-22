import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function BillingSuccess() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const { refresh } = useAuth();
  const [status, setStatus] = useState("checking"); // checking | success | failed

  useEffect(() => {
    if (!sessionId) {
      setStatus("failed");
      return;
    }
    let attempts = 0;
    const poll = async () => {
      try {
        const { data } = await api.get(`/billing/status/${sessionId}`);
        if (data.paymentStatus === "paid") {
          await refresh();
          setStatus("success");
          return;
        }
        if (data.status === "expired") {
          setStatus("failed");
          return;
        }
      } catch {
        // keep trying
      }
      attempts += 1;
      if (attempts >= 6) {
        setStatus("failed");
        return;
      }
      setTimeout(poll, 2000);
    };
    poll();
  }, [sessionId]);

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        {status === "checking" && (
          <>
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-teal-600" />
            <h1 className="font-heading mt-4 text-2xl font-bold text-navy-900">
              Confirming your payment…
            </h1>
            <p className="mt-2 text-slate-600">This will only take a moment.</p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
            <h1 className="font-heading mt-4 text-2xl font-bold text-navy-900">You're all set!</h1>
            <p className="mt-2 text-slate-600">Your plan is now active. Enjoy full access.</p>
            <Link
              to="/app/dashboard"
              data-testid="billing-success-continue"
              className="mt-6 inline-block rounded-lg bg-teal-700 px-6 py-2.5 font-medium text-white hover:bg-teal-600"
            >
              Go to dashboard
            </Link>
          </>
        )}
        {status === "failed" && (
          <>
            <XCircle className="mx-auto h-12 w-12 text-red-500" />
            <h1 className="font-heading mt-4 text-2xl font-bold text-navy-900">
              Payment not confirmed
            </h1>
            <p className="mt-2 text-slate-600">
              We couldn't confirm your payment. If you were charged, it will reflect shortly.
            </p>
            <Link
              to="/app/settings"
              className="mt-6 inline-block rounded-lg border border-slate-300 px-6 py-2.5 font-medium text-navy-900 hover:bg-slate-50"
            >
              Back to settings
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
