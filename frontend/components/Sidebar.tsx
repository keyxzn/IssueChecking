"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { useState } from "react";
import {
  LayoutDashboard, Search, Plus, Upload,
  LogOut, ChevronDown, ChevronRight,
  Sun, Moon, Shield, X, PanelLeftClose, PanelLeft, Settings, Radio,
} from "lucide-react";

const getNav = (isAdmin: boolean) => [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  {
    label: "Issue & Keyword", icon: Search,
    children: [
      { label: "Semua Issue",       href: "/candidates",      icon: Search },
      { label: "Tambah Issue",      href: "/candidates/add",  icon: Plus   },
      { label: "Bulk Upload",       href: "/candidates/bulk", icon: Upload },
    ],
  },
  ...(isAdmin ? [{
    label: "Pengaturan", icon: Settings,
    children: [
      { label: "User Management", href: "/settings/users", icon: Shield },
    ],
  }] : []),
];

const BG  = "linear-gradient(180deg,#0d1117 0%,#111827 100%)";
const BDR = "1px solid rgba(255,255,255,0.05)";
const ACC = "#10b981";

interface BodyProps { onNav?: () => void; collapsed?: boolean; }

function Body({ onNav, collapsed }: BodyProps) {
  const path = usePathname();
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const [open, setOpen]  = useState(["Issue & Keyword"]);
  const isAdmin = user?.role === "admin";
  const NAV = getNav(isAdmin);

  function NavLink({ href, icon: Icon, label, exact }: { href: string; icon: any; label: string; exact?: boolean }) {
    const active = exact ? path === href : path === href;
    return (
      <Link href={href} onClick={onNav} title={collapsed ? label : undefined}
        style={{
          display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "flex-start",
          gap: collapsed ? 0 : 10, padding: collapsed ? "10px 12px" : "9px 14px",
          borderRadius: 11, textDecoration: "none", fontSize: 13,
          fontWeight: active ? 600 : 400,
          color: active ? "#0d1117" : "rgba(255,255,255,0.5)",
          background: active ? ACC : "transparent",
          boxShadow: active ? "0 4px 14px rgba(16,185,129,.3)" : "none",
          transition: "all .18s ease",
        }}
        onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; (e.currentTarget as HTMLElement).style.color = "#fff"; } }}
        onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.5)"; } }}>
        <Icon size={15} style={{ flexShrink: 0, color: active ? "#0d1117" : "inherit" }} />
        {!collapsed && label}
      </Link>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>

      {/* Logo */}
      <div style={{ padding: collapsed ? "18px 12px 14px" : "18px 16px 14px", borderBottom: BDR }}>
        <Link href="/dashboard" onClick={onNav}
          style={{ display: "flex", alignItems: "center", gap: collapsed ? 0 : 11, justifyContent: collapsed ? "center" : "flex-start", textDecoration: "none" }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#10b981,#059669)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 6px 18px rgba(16,185,129,.35)" }}>
            <Radio size={16} color="#fff" />
          </div>
          {!collapsed && (
            <div>
              <p style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 17, letterSpacing: "-0.04em", color: "#fff", lineHeight: 1 }}>
                Strapping<span style={{ color: "#10b981" }}>Media</span>
              </p>
              <p style={{ fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: "#1e3a2e", marginTop: 3, fontWeight: 600 }}>Media Intelligence</p>
            </div>
          )}
        </Link>
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, padding: "10px 8px", display: "flex", flexDirection: "column", gap: 2, overflowY: "auto" }}>
        {!collapsed && (
          <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#1e293b", padding: "6px 14px 2px" }}>Menu</p>
        )}

        {NAV.map(item => {
          if (item.href) return <NavLink key={item.href} href={item.href} icon={item.icon} label={item.label} exact />;

          const isOpen    = open.includes(item.label);
          const anyActive = item.children?.some(c => path.startsWith(c.href));

          return (
            <div key={item.label}>
              <button onClick={() => setOpen(o => isOpen ? o.filter(x => x !== item.label) : [...o, item.label])}
                title={collapsed ? item.label : undefined}
                style={{
                  display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "flex-start",
                  gap: collapsed ? 0 : 10, padding: collapsed ? "10px 12px" : "9px 14px", width: "100%",
                  borderRadius: 11, border: "none", cursor: "pointer", fontSize: 13,
                  fontWeight: anyActive ? 600 : 400,
                  color: anyActive ? "#fff" : "rgba(255,255,255,0.5)",
                  background: anyActive ? "rgba(16,185,129,0.1)" : "transparent",
                  transition: "all .18s",
                }}
                onMouseEnter={e => { if (!anyActive) { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; (e.currentTarget as HTMLElement).style.color = "#fff"; } }}
                onMouseLeave={e => { if (!anyActive) { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.5)"; } }}>
                <item.icon size={15} style={{ flexShrink: 0 }} />
                {!collapsed && <><span style={{ flex: 1, textAlign: "left" }}>{item.label}</span>
                  {isOpen ? <ChevronDown size={12} style={{ opacity: .35 }} /> : <ChevronRight size={12} style={{ opacity: .35 }} />}</>}
              </button>

              {isOpen && !collapsed && (
                <div style={{ marginLeft: 12, paddingLeft: 14, marginTop: 2, marginBottom: 2, borderLeft: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", gap: 1 }}>
                  {item.children?.map(c => {
                    const active = path === c.href;
                    return (
                      <Link key={c.href} href={c.href} onClick={onNav}
                        style={{
                          display: "flex", alignItems: "center", gap: 8,
                          padding: "7px 12px", borderRadius: 9, textDecoration: "none",
                          fontSize: 12.5, fontWeight: active ? 600 : 400,
                          color: active ? ACC : "rgba(255,255,255,0.35)",
                          background: active ? "rgba(16,185,129,.1)" : "transparent",
                          transition: "all .15s",
                        }}
                        onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.65)"; (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; } }}
                        onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.35)"; (e.currentTarget as HTMLElement).style.background = "transparent"; } }}>
                        <c.icon size={11} />
                        {c.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        <div style={{ flex: 1 }} />

        {/* Theme toggle */}
        <div style={{ paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.05)", marginTop: 6 }}>
          <button onClick={toggle} title={collapsed ? (dark ? "Light Mode" : "Dark Mode") : undefined}
            style={{
              display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "flex-start",
              gap: collapsed ? 0 : 9, padding: collapsed ? "9px 12px" : "9px 14px", width: "100%",
              borderRadius: 11, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 400,
              color: "rgba(255,255,255,0.35)", background: "transparent", transition: "all .18s",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.65)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.35)"; }}>
            {dark
              ? <Sun size={14} style={{ color: "#fbbf24", flexShrink: 0 }} />
              : <Moon size={14} style={{ flexShrink: 0 }} />}
            {!collapsed && (dark ? "Light Mode" : "Dark Mode")}
          </button>
        </div>
      </nav>

      {/* User */}
      <div style={{ padding: "10px 8px", borderTop: BDR }}>
        <div style={{ display: "flex", alignItems: "center", gap: collapsed ? 0 : 10, justifyContent: collapsed ? "center" : "flex-start", padding: collapsed ? "8px 12px" : "9px 12px", borderRadius: 11, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.05)", marginBottom: 4 }}>
          <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg,#10b981,#059669)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 12, fontWeight: 800, color: "#fff" }}>
            {user?.name?.charAt(0).toUpperCase() ?? "?"}
          </div>
          {!collapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1.3 }}>{user?.name}</p>
              <p style={{ fontSize: 9, color: "#1e3a2e", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 2 }}>{user?.role ?? "Analyst"}</p>
            </div>
          )}
        </div>
        <button onClick={logout} title={collapsed ? "Keluar" : undefined}
          style={{ display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "flex-start", gap: collapsed ? 0 : 8, padding: collapsed ? "8px 12px" : "8px 12px", width: "100%", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 500, color: "rgba(248,113,113,.5)", background: "transparent", transition: "all .18s" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#f87171"; (e.currentTarget as HTMLElement).style.background = "rgba(248,113,113,.07)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(248,113,113,.5)"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
          <LogOut size={12} style={{ flexShrink: 0 }} />
          {!collapsed && "Keluar"}
        </button>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const [mob, setMob]         = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:flex flex-col flex-shrink-0 h-screen sticky top-0"
        style={{ width: collapsed ? 62 : 234, background: BG, borderRight: BDR, transition: "width .25s ease", position: "relative" }}>
        <Body collapsed={collapsed} />
        <button onClick={() => setCollapsed(c => !c)}
          title={collapsed ? "Perlebar" : "Persempit"}
          style={{ position: "absolute", top: 20, right: -11, width: 22, height: 22, borderRadius: 7, background: "#1e293b", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#475569", zIndex: 10, transition: "all .2s" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = ACC; (e.currentTarget as HTMLElement).style.borderColor = "rgba(16,185,129,.35)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#475569"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)"; }}>
          {collapsed ? <PanelLeft size={11} /> : <PanelLeftClose size={11} />}
        </button>
      </aside>

      {/* Mobile topbar */}
      <div className="lg:hidden sticky top-0 z-40 flex items-center justify-between px-4"
        style={{ height: 54, background: BG, borderBottom: BDR }}>
        <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none" }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: "linear-gradient(135deg,#10b981,#059669)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Radio size={13} color="#fff" />
          </div>
          <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 15, color: "#fff" }}>
            Strapping<span style={{ color: ACC }}>Media</span>
          </span>
        </Link>
        <button onClick={() => setMob(true)} style={{ display: "flex", flexDirection: "column", gap: 4.5, padding: 8, background: "none", border: "none", cursor: "pointer" }}>
          <div style={{ width: 20, height: 1.5, background: "#64748b", borderRadius: 2 }} />
          <div style={{ width: 14, height: 1.5, background: "#64748b", borderRadius: 2 }} />
          <div style={{ width: 20, height: 1.5, background: "#64748b", borderRadius: 2 }} />
        </button>
      </div>

      {/* Mobile drawer */}
      {mob && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.72)", backdropFilter: "blur(8px)" }} onClick={() => setMob(false)} />
          <div style={{ position: "relative", width: 240, background: BG, borderRight: BDR, height: "100%", overflowY: "auto" }}>
            <button onClick={() => setMob(false)}
              style={{ position: "absolute", top: 14, right: 14, width: 26, height: 26, borderRadius: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", color: "#475569", cursor: "pointer" }}>
              <X size={13} />
            </button>
            <Body onNav={() => setMob(false)} />
          </div>
        </div>
      )}
    </>
  );
}
