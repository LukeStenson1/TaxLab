import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Upload from "./pages/Upload";
import Analysis from "./pages/Analysis";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import BillingSuccess from "./pages/BillingSuccess";
import CheckIn from "./pages/CheckIn";
import Learn from "./pages/Learn";
import LearnApp from "./pages/LearnApp";
import AdminLearning from "./pages/AdminLearning";

function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-teal-600" />
    </div>
  );
}

function Protected({ children }) {
  const { user } = useAuth();
  if (user === null) return <Loading />;
  if (user === false) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

function PublicOnly({ children }) {
  const { user } = useAuth();
  if (user === null) return <Loading />;
  if (user) return <Navigate to="/app/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/learn" element={<Learn />} />
          <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
          <Route path="/signup" element={<PublicOnly><Signup /></PublicOnly>} />
          <Route path="/app/dashboard" element={<Protected><Dashboard /></Protected>} />
          <Route path="/app/upload" element={<Protected><Upload /></Protected>} />
          <Route path="/app/checkin" element={<Protected><CheckIn /></Protected>} />
          <Route path="/app/learn" element={<Protected><LearnApp /></Protected>} />
          <Route path="/app/admin/learning" element={<Protected><AdminLearning /></Protected>} />
          <Route path="/app/analysis/:id" element={<Protected><Analysis /></Protected>} />
          <Route path="/app/settings" element={<Protected><Settings /></Protected>} />
          <Route path="/billing/success" element={<Protected><BillingSuccess /></Protected>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
