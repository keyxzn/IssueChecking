"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";

interface AuthUser {
  email: string;
  name: string;
  role: string;
  token: string;
}

interface AuthCtx {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthCtx | null>(null);
const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const PUBLIC_PATHS = ["/login"];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const stored = localStorage.getItem("hr_user");
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch {}
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user && !PUBLIC_PATHS.includes(pathname)) {
      router.replace("/login");
    }
    if (user && pathname === "/login") {
      router.replace("/dashboard"); // ← fix: ke dashboard bukan screening
    }
  }, [user, loading, pathname]);

  async function login(email: string, password: string) {
    const res = await fetch(`${BASE}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail ?? "Login gagal");
    }
    const data = await res.json();
    const authUser: AuthUser = {
      email: data.user_email,
      name: data.user_name,
      role: data.role,
      token: data.access_token,
    };
    localStorage.setItem("hr_user", JSON.stringify(authUser));
    setUser(authUser);
    router.replace("/dashboard"); // ← fix: ke dashboard bukan screening
  }

  function logout() {
    localStorage.removeItem("hr_user");
    setUser(null);
    router.replace("/login");
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}