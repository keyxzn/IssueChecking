"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import { Clock, CheckCircle2, XCircle, Loader2, Users, Plus, Upload, ChevronRight, FileSpreadsheet, TrendingUp, AlertTriangle } from "lucide-react";

// Stored in localStorage so it persists — no backend changes needed
interface BulkSession {
  id: string;
  uploadedAt: string;
  fileName: string;
  totalIssues: number;
  completed: number;
  failed: number;
  status: "processing" | "completed" | "partial" | "failed";
  riskSummary: { low: number; medium: number; high: number; critical: number };
}

function loadSessions(): BulkSession[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem("bulk_sessions") || "[]"); } catch { return []; }
}

function saveSessions(s: BulkSession[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem("bulk_sessions", JSON.stringify(s));
}

export function addBulkSession(session: Omit<BulkSession, "id" | "uploadedAt">) {
  const sessions = loadSessions();
  const newSession: BulkSession = {
    ...session,
    id: crypto.randomUUID(),
    uploadedAt: new Date().toISOString(),
  };
  sessions.unshift(newSession);
  saveSessions(sessions.slice(0, 50)); // keep last 50
  return newSession;
}

export function updateBulkSession(id: string, update: Partial<BulkSession>) {
  const sessions = loadSessions();
  const idx = sessions.findIndex(s => s.id === id);
  if (idx !== -1) { sessions[idx] = { ...sessions[idx], ...update }; saveSessions(sessions); }
}

const fmt = (d: string) => new Date(d).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export default function BulkHistoryPage() {
  const [sessions, setSessions] = useState<BulkSession[]>([]);

  useEffect(() => { setSessions(loadSessions()); }, []);

  const stats = {
    total:     sessions.length,
    completed: sessions.filter(s => s.status === "completed").length,
    processing:sessions.filter(s => s.status === "processing").length,
    issues:sessions.reduce((a, s) => a + s.totalIssues, 0),
  };

  const statusConfig = {
    completed:  { icon: CheckCircle2, color: "var(--success)",  bg: "var(--accent-d)",   label: "Selesai" },
    processing: { icon: Loader2,      color: "var(--warning)",  bg: "var(--warn-d)",      label: "Diproses" },
    partial:    { icon: AlertTriangle,color: "#f97316",         bg: "rgba(249,115,22,.1)", label: "Sebagian" },
    failed:     { icon: XCircle,      color: "var(--danger)",   bg: "var(--danger-d)",    label: "Gagal" },
  };

  return (
    <AppLayout>
      <div style={{ minHeight: "100vh" }}>
        {/* Header */}
        <div style={{ background: "var(--bg2)", borderBottom: "1px solid var(--border)", padding: "24px 32px" }}>
          <div style={{ maxWidth: 1040, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
            <div>
              <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 6 }}>
                Issue
              </p>
              <h1 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 28, color: "var(--text)", letterSpacing: "-0.03em" }}>
                Riwayat Bulk Upload
              </h1>
            </div>
            <Link href="/issues/bulk/new" className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Upload size={14} /> Upload Baru
            </Link>
          </div>
        </div>

        <div style={{ maxWidth: 1040, margin: "0 auto", padding: "24px 32px" }}>
          {/* Stats row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
            {[
              { label: "Total Sesi",     val: stats.total,      icon: FileSpreadsheet, color: "var(--text3)" },
              { label: "Selesai",        val: stats.completed,  icon: CheckCircle2,    color: "var(--success)" },
              { label: "Diproses",       val: stats.processing, icon: Loader2,         color: "var(--warning)" },
              { label: "Total Issue", val: stats.issues, icon: Users,           color: "var(--accent)" },
            ].map((s) => (
              <div key={s.label} className="card" style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--bg3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <s.icon size={16} style={{ color: s.color }} />
                </div>
                <div>
                  <p style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 22, color: "var(--text)", lineHeight: 1 }}>{s.val}</p>
                  <p style={{ fontSize: 11.5, color: "var(--text3)", marginTop: 3 }}>{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Session list */}
          {sessions.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "80px 0" }}>
              <div style={{ width: 64, height: 64, borderRadius: 18, background: "var(--bg3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <FileSpreadsheet size={28} style={{ color: "var(--text4)" }} />
              </div>
              <p style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 16, color: "var(--text)", marginBottom: 8 }}>
                Belum ada riwayat bulk upload
              </p>
              <p style={{ fontSize: 13, color: "var(--text3)", marginBottom: 24 }}>
                Upload file CSV atau Excel untuk memulai screening massal
              </p>
              <Link href="/issues/bulk/new" className="btn btn-primary" style={{ display: "inline-flex", gap: 8 }}>
                <Upload size={13} /> Upload Issue Massal
              </Link>
            </div>
          ) : (
            <div className="card" style={{ overflow: "hidden" }}>
              <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)", background: "var(--bg3)" }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text3)" }}>{sessions.length} sesi upload</p>
              </div>
              {sessions.map((s, i) => {
                const cfg = statusConfig[s.status];
                const Icon = cfg.icon;
                const completePct = s.totalIssues > 0 ? Math.round((s.completed / s.totalIssues) * 100) : 0;
                return (
                  <div key={s.id} style={{
                    padding: "16px 20px",
                    borderBottom: i < sessions.length - 1 ? "1px solid var(--border)" : "none",
                    transition: "background 0.12s",
                    display: "flex", alignItems: "center", gap: 16,
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--bg3)"}
                    onMouseLeave={e => e.currentTarget.style.background = ""}
                  >
                    {/* Icon */}
                    <div style={{ width: 40, height: 40, borderRadius: 11, background: cfg.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon size={16} style={{ color: cfg.color }} className={s.status === "processing" ? "animate-spin" : ""} />
                    </div>

                    {/* Main info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <p style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {s.fileName}
                        </p>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 999, background: cfg.bg, color: cfg.color, whiteSpace: "nowrap" }}>
                          {cfg.label}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 11.5, color: "var(--text3)", display: "flex", alignItems: "center", gap: 4 }}>
                          <Clock size={10} /> {fmt(s.uploadedAt)}
                        </span>
                        <span style={{ fontSize: 11.5, color: "var(--text3)" }}>
                          <span style={{ color: "var(--accent)", fontWeight: 700 }}>{s.completed}</span> / {s.totalIssues} issue
                        </span>
                        {s.failed > 0 && (
                          <span style={{ fontSize: 11.5, color: "var(--danger)" }}>{s.failed} gagal</span>
                        )}
                      </div>
                      {/* Progress bar */}
                      {s.status === "processing" && (
                        <div style={{ marginTop: 8, height: 4, background: "var(--border)", borderRadius: 99, overflow: "hidden", width: "100%", maxWidth: 300 }}>
                          <div style={{ width: `${completePct}%`, height: "100%", background: "var(--accent)", borderRadius: 99, transition: "width 0.5s" }} />
                        </div>
                      )}
                      {/* Risk summary pills */}
                      {s.status === "completed" && (
                        <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                          {s.riskSummary.critical > 0 && <span style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "rgba(220,38,38,0.1)", color: "#dc2626" }}>⬤ {s.riskSummary.critical} Kritis</span>}
                          {s.riskSummary.high > 0 &&     <span style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "rgba(239,68,68,0.1)",  color: "#ef4444" }}>⬤ {s.riskSummary.high} Tinggi</span>}
                          {s.riskSummary.medium > 0 &&   <span style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "rgba(245,158,11,0.1)", color: "#d97706" }}>⬤ {s.riskSummary.medium} Sedang</span>}
                          {s.riskSummary.low > 0 &&      <span style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "rgba(16,185,129,0.1)", color: "#10b981" }}>⬤ {s.riskSummary.low} Rendah</span>}
                        </div>
                      )}
                    </div>

                    {/* CTA */}
                    <Link href="/issues" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, color: "var(--accent)", textDecoration: "none", whiteSpace: "nowrap" }}>
                      Lihat issue <ChevronRight size={13} />
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}