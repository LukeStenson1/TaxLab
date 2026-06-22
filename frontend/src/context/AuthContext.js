import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null = checking, false = logged out, object = logged in

  useEffect(() => {
    let mounted = true;
    const finish = (val) => {
      if (mounted) setUser(val);
    };
    api
      .get("/auth/me")
      .then(({ data }) => finish(data.user))
      .catch(() => finish(false));
    // Safety: never leave the app stuck on the loading spinner.
    const safety = setTimeout(() => finish(false), 12000);
    return () => {
      mounted = false;
      clearTimeout(safety);
    };
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    setUser(data.user);
    return data.user;
  };

  const register = async (email, password) => {
    const { data } = await api.post("/auth/register", { email, password });
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    await api.post("/auth/logout");
    setUser(false);
  };

  const refresh = async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data.user);
      return data.user;
    } catch {
      setUser(false);
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
