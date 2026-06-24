import React from "react";
import { Link, Navigate } from "react-router-dom";
import { BookOpen, Users, Building2, ArrowRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const CARDS = [
  { to: "/app/admin/learning", icon: BookOpen, title: "Learning center", desc: "Add, edit, hide, or delete learning sections, and refresh tax data." },
  { to: "/app/admin/users", icon: Users, title: "Users", desc: "Grant access, change plans, and assign people to organizations." },
  { to: "/app/admin/orgs", icon: Building2, title: "Organizations", desc: "Create business accounts, manage seats, and link member accounts." },
];

export default function AdminHome() {
  const { user } = useAuth();
  if (user === null) return null;
  if (!user?.isAdmin) return <Navigate to="/app/dashboard" replace />;

  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <h1 className="font-heading text-3xl font-bold text-navy-900">Admin</h1>
        <p className="mt-1 text-slate-600">Manage content, users, and business accounts.</p>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {CARDS.map((c) => (
            <Link
              key={c.to}
              to={c.to}
              data-testid={`admin-card-${c.title.toLowerCase().split(" ")[0]}`}
              className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-900">
                <c.icon className="h-6 w-6 text-teal-500" />
              </div>
              <h2 className="font-heading mt-4 text-lg font-semibold text-navy-900">{c.title}</h2>
              <p className="mt-1 flex-1 text-sm text-slate-600">{c.desc}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-teal-700">
                Open <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
