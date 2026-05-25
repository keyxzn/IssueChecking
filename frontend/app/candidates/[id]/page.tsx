"use client";

import React, { useEffect, useState, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import { useParams } from "next/navigation";
import Link from "next/link";
import RiskBadge from "@/components/RiskBadge";
import { api, Candidate, ScreeningReport } from "@/lib/api";
import {
  ArrowLeft, Loader2, RefreshCw, Camera, MessageCircle,
  Globe, Link2, Newspaper, AlertTriangle, CheckCircle,
  ShieldAlert, Mail, Phone, Clock, ExternalLink,
} from "lucide-react";

const RISK_LABELS: Record<string, { label: string; icon: string; desc: string }> = {
  explicit_content:  { label: "Explicit Content",   icon: "🔞", desc: "Pornografi / konten vulgar" },
  toxic_language:    { label: "Toxic Language",      icon: "🤬", desc: "Kata kasar, bullying, harassment" },
  hate_speech:       { label: "Hate Speech",         icon: "🚫", desc: "Serangan ras, agama, gender" },
  violence:          { label: "Violence",            icon: "💢", desc: "Ancaman kekerasan" },
  extremism:         { label: "Extremism",           icon: "☢️", desc: "Terorisme / kekerasan politik" },
  professional_risk: { label: "Professional Risk",   icon: "💼", desc: "Fraud, scam, fake profile" },
};

/** Normalize URL sosmed → link https yang valid */
function normalizeSocialUrl(url: string | undefined, platform: string): string | undefined {
  if (!url || url.trim() === "" || url === "tidak ada") return undefined;
  const u = url.trim();
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  const handle = u.replace(/^@/, "");
  switch (platform) {
    case "instagram": return `https://www.instagram.com/${handle}/`;
    case "twitter":   return `https://x.com/${handle}`;
    case "facebook":  return `https://www.facebook.com/${handle}`;
    case "linkedin":  return `https://www.linkedin.com/in/${handle}`;
    default:          return `https://${u}`;
  }
}

const PLATFORM_ICONS: Record<string, React.ElementType> = {
  instagram:      Camera,
  twitter:        MessageCircle,
  facebook:       Globe,
  linkedin:       Link2,
  google:         Globe,
  google_results: Globe,
  news:           Newspaper,
};

const PLATFORM_COLORS: Record<string, string> = {
  instagram:      "#e1306c",
  twitter:        "#1d9bf0",
  facebook:       "#1877f2",
  linkedin:       "#0077b5",
  google:         "#4285f4",
  google_results: "#4285f4",
  news:           "#6b7280",
};

function ScoreBar({ score }: { score: number }) {
  const color =
    score < 25 ? "#22c55e" : score < 50 ? "#f59e0b" : score < 75 ? "#f97316" : "#ef4444";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ flex: 1, height: 6, background: "var(--bg3)", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ width: `${score}%`, height: "100%", background: color, borderRadius: 99, transition: "width 0.7s ease" }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color, width: 28, textAlign: "right" }}>{score}</span>
    </div>
  );
}

export default function CandidateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [report, setReport] = useState<ScreeningReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "details" | "flags">("overview");
  const [elapsed, setElapsed] = useState(0);

  const load = useCallback(async () => {
    try {
      const [c, r] = await Promise.all([api.getCandidate(id), api.getReport(id)]);
      setCandidate(c);
      setReport(r);
    } catch {
      try { setCandidate(await api.getCandidate(id)); } catch {}
    } finally { setLoading(false); }
  }, [id]);

  // Auto-refresh every 4s while processing
  useEffect(() => {
    load();
    const iv = setInterval(async () => {
      try {
        const r = await api.getReport(id);
        setReport(r);
        if (r.status === "completed" || r.status === "failed") clearInterval(iv);
      } catch {}
    }, 4000);
    return () => clearInterval(iv);
  }, [id, load]);

  // Elapsed timer for processing state
  useEffect(() => {
    if (!report || report.status === "completed" || report.status === "failed") return;
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, [report?.status]);

  if (loading)
    return (
      <AppLayout>
        <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--text3)", fontSize: 14 }}>
            <Loader2 size={20} className="animate-spin" />
            Memuat data kandidat...
          </div>
        </div>
      </AppLayout>
    );

  const isProcessing = !report || report.status === "pending" || report.status === "processing";
  const riskScores = report?.risk_scores ?? {};
  const flagged = report?.flagged_content ?? [];
  const profiles = report?.found_profiles ?? {};
  const overallRisk = report?.overall_risk ?? "low";

  const socials = [
    { url: normalizeSocialUrl(candidate?.instagram_url, "instagram"), Icon: Camera,        color: "#e1306c", label: "Instagram" },
    { url: normalizeSocialUrl(candidate?.twitter_url,   "twitter"),   Icon: MessageCircle, color: "#1d9bf0", label: "Twitter/X" },
    { url: normalizeSocialUrl(candidate?.facebook_url,  "facebook"),  Icon: Globe,         color: "#1877f2", label: "Facebook"  },
    { url: normalizeSocialUrl(candidate?.linkedin_url,  "linkedin"),  Icon: Link2,         color: "#0077b5", label: "LinkedIn"  },
  ].filter(x => x.url);

  return (
    <AppLayout>
      <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "0 0 60px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "32px 20px 0" }}>

          {/* Back */}
          <Link href="/candidates" style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            fontSize: 12, fontWeight: 600, color: "var(--text3)",
            textDecoration: "none", marginBottom: 24,
            transition: "color 0.15s",
          }}
            onMouseEnter={e => e.currentTarget.style.color = "var(--text)"}
            onMouseLeave={e => e.currentTarget.style.color = "var(--text3)"}
          >
            <ArrowLeft size={13} /> Semua Kandidat
          </Link>

          {/* Header card */}
          <div style={{
            background: "var(--bg2)", border: "1px solid var(--border)",
            borderRadius: 20, padding: "24px 28px",
            boxShadow: "var(--sh-sm)", marginBottom: 16,
            display: "flex", alignItems: "flex-start", justifyContent: "space-between",
            gap: 16, flexWrap: "wrap",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              {/* Avatar */}
              <div style={{
                width: 60, height: 60, borderRadius: 18, flexShrink: 0,
                background: "linear-gradient(135deg, var(--accent), #009e76)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 22, color: "#04130f",
                boxShadow: "0 6px 20px var(--accent-g)",
              }}>
                {candidate?.full_name.charAt(0).toUpperCase()}
              </div>

              <div>
                <h1 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 22, color: "var(--text)", letterSpacing: "-0.03em", marginBottom: 6 }}>
                  {candidate?.full_name}
                </h1>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 10 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, color: "var(--text3)" }}>
                    <Mail size={12} style={{ color: "var(--accent)" }} />
                    {candidate?.email}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, color: "var(--text3)" }}>
                    <Phone size={12} style={{ color: "var(--accent)" }} />
                    {candidate?.phone}
                  </span>
                </div>
                {/* Socials */}
                {socials.length > 0 && (
                  <div style={{ display: "flex", gap: 8 }}>
                    {socials.map(({ url, Icon, color, label }, i) => (
                      <a key={i} href={url!} target="_blank" rel="noopener noreferrer"
                        title={label}
                        style={{
                          width: 32, height: 32, borderRadius: 10, display: "flex",
                          alignItems: "center", justifyContent: "center",
                          background: "var(--bg3)", border: "1px solid var(--border)",
                          color, transition: "all 0.15s", textDecoration: "none",
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.12)"; e.currentTarget.style.borderColor = color; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.borderColor = "var(--border)"; }}
                      >
                        <Icon size={14} />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Risk badge or processing */}
            {isProcessing ? (
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6,
              }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  background: "var(--warn-d)", border: "1px solid rgba(245,158,11,0.2)",
                  borderRadius: 12, padding: "8px 14px",
                }}>
                  <Loader2 size={14} className="animate-spin" style={{ color: "var(--warning)" }} />
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--warning)" }}>
                    {report?.status === "pending" ? "Menunggu..." : "Sedang diproses"}
                  </span>
                </div>
                <span style={{ fontSize: 11, color: "var(--text3)", display: "flex", alignItems: "center", gap: 4 }}>
                  <Clock size={11} /> {elapsed}s • auto-refresh tiap 4 detik
                </span>
              </div>
            ) : (
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: 10.5, fontWeight: 700, color: "var(--text3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>Risk Overall</p>
                <RiskBadge level={overallRisk} large />
              </div>
            )}
          </div>

          {/* Processing banner */}
          {isProcessing && (
            <div style={{
              background: "var(--bg2)", border: "1px solid var(--border)",
              borderRadius: 16, padding: "28px 28px",
              boxShadow: "var(--sh-sm)", marginBottom: 16,
              display: "flex", flexDirection: "column", alignItems: "center",
              gap: 14, textAlign: "center",
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: "50%",
                background: "var(--accent-d)", border: "2px solid var(--accent)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <ShieldAlert size={24} style={{ color: "var(--accent)" }} />
              </div>
              <div>
                <p style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 16, color: "var(--text)", marginBottom: 6 }}>
                  AI Screening Berjalan
                </p>
                <p style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.6, maxWidth: 420 }}>
                  Sistem sedang menganalisis profil sosial media kandidat. Proses ini biasanya memakan waktu 1–3 menit. Halaman akan otomatis diperbarui.
                </p>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                {["Instagram", "Twitter/X", "Facebook", "LinkedIn", "Google", "Berita"].map(p => (
                  <span key={p} style={{
                    fontSize: 11.5, fontWeight: 600, padding: "4px 12px", borderRadius: 99,
                    background: "var(--bg3)", color: "var(--text3)", border: "1px solid var(--border)",
                    display: "flex", alignItems: "center", gap: 5,
                  }}>
                    <Loader2 size={10} className="animate-spin" style={{ opacity: 0.5 }} />
                    {p}
                  </span>
                ))}
              </div>
              <button onClick={load} style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 18px", borderRadius: 10,
                background: "transparent", border: "1px solid var(--border)",
                color: "var(--text3)", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
                transition: "all 0.15s",
              }}
                onMouseEnter={e => { e.currentTarget.style.background = "var(--bg3)"; e.currentTarget.style.color = "var(--text)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text3)"; }}
              >
                <RefreshCw size={13} /> Refresh Manual
              </button>
            </div>
          )}

          {/* Results */}
          {!isProcessing && report?.status === "completed" && (
            <>
              {/* Tabs */}
              <div style={{ display: "flex", gap: 4, marginBottom: 16, background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14, padding: 4 }}>
                {(["overview", "details", "flags"] as const).map(t => (
                  <button key={t} onClick={() => setTab(t)} style={{
                    flex: 1, padding: "9px 0", borderRadius: 10, border: "none",
                    background: tab === t ? "var(--accent)" : "transparent",
                    color: tab === t ? "#04130f" : "var(--text3)",
                    fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 12.5,
                    cursor: "pointer", transition: "all 0.18s", textTransform: "capitalize",
                    letterSpacing: "-0.01em",
                  }}>
                    {t === "overview" ? "Ringkasan" : t === "details" ? "Skor Risiko" : `Konten Flagged ${flagged.length > 0 ? `(${flagged.length})` : ""}`}
                  </button>
                ))}
              </div>

              {/* Overview */}
              {tab === "overview" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {/* AI Summary */}
                  {report.ai_summary && (
                    <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 18, padding: "22px 24px", boxShadow: "var(--sh-sm)" }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>AI Summary</p>
                      <p style={{ fontSize: 14, color: "var(--text2)", lineHeight: 1.75 }}>{report.ai_summary}</p>
                    </div>
                  )}

                  {/* Found profiles */}
                  {Object.keys(profiles).length > 0 && (
                    <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 18, padding: "22px 24px", boxShadow: "var(--sh-sm)" }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14 }}>Profil Ditemukan</p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {Object.entries(profiles).map(([platform, url]) => {
                          const key = platform.toLowerCase();
                          const Icon  = PLATFORM_ICONS[key] ?? Globe;
                          const color = PLATFORM_COLORS[key] ?? "var(--accent)";
                          const normalizedUrl = normalizeSocialUrl(url as string, key) ?? (url as string);
                          const displayHandle = (() => {
                            try {
                              const u = new URL(normalizedUrl);
                              const parts = u.pathname.replace(/\//g, " ").trim().split(" ").filter(Boolean);
                              return "@" + parts[parts.length - 1];
                            } catch { return url as string; }
                          })();
                          const platformLabel = key === "google_results" ? "Google" : key.charAt(0).toUpperCase() + key.slice(1);
                          return (
                            <a key={platform} href={normalizedUrl} target="_blank" rel="noopener noreferrer" style={{
                              display: "flex", alignItems: "center", gap: 12,
                              padding: "10px 14px", borderRadius: 12,
                              background: "var(--bg3)", border: "1px solid var(--border)",
                              textDecoration: "none", transition: "all 0.15s",
                            }}
                              onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.background = "var(--accent-d)"; }}
                              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--bg3)"; }}
                            >
                              <Icon size={15} style={{ color, flexShrink: 0 }} />
                              <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text)", flex: 1 }}>{platformLabel}</span>
                              <span style={{ fontSize: 11.5, color: "var(--text3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>{displayHandle}</span>
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Skor risiko */}
              {tab === "details" && (
                <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 18, padding: "22px 24px", boxShadow: "var(--sh-sm)" }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 18 }}>Skor Per Kategori</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {Object.entries(riskScores).map(([key, score]) => {
                      const info = RISK_LABELS[key];
                      return (
                        <div key={key}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                              {info?.icon} {info?.label ?? key}
                            </span>
                            <span style={{ fontSize: 11.5, color: "var(--text3)" }}>{info?.desc}</span>
                          </div>
                          <ScoreBar score={score} />
                        </div>
                      );
                    })}
                    {Object.keys(riskScores).length === 0 && (
                      <p style={{ fontSize: 13, color: "var(--text3)", textAlign: "center", padding: "20px 0" }}>Tidak ada skor risiko tersedia.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Flagged content */}
              {tab === "flags" && (
                <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 18, padding: "22px 24px", boxShadow: "var(--sh-sm)" }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 18 }}>Konten Bermasalah</p>
                  {flagged.length === 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "28px 0", color: "var(--text3)" }}>
                      <CheckCircle size={32} style={{ color: "var(--accent)" }} />
                      <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>Tidak ada konten bermasalah</p>
                      <p style={{ fontSize: 13 }}>Kandidat ini lolos screening tanpa flag.</p>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {flagged.map((f, i) => {
                        const platformColor: Record<string, string> = {
                          instagram: "#e1306c", twitter: "#1d9bf0", facebook: "#1877f2",
                          linkedin: "#0077b5", "google search": "#4285f4", "berita media": "#f59e0b",
                          google: "#4285f4", news: "#f59e0b",
                        };
                        const pKey = (f.platform ?? "").toLowerCase();
                        const pColor = platformColor[pKey] ?? "var(--danger)";
                        const hasUrl = f.source_url && f.source_url.startsWith("http");
                        return (
                          <div key={i} style={{
                            padding: "14px 16px", borderRadius: 14,
                            background: "var(--danger-d)", border: "1px solid rgba(239,68,68,0.15)",
                            transition: "border-color 0.15s",
                          }}>
                            {/* Header row */}
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                              <AlertTriangle size={13} style={{ color: "var(--danger)", flexShrink: 0 }} />
                              <span style={{ fontSize: 12, fontWeight: 700, color: pColor, textTransform: "capitalize" }}>{f.platform}</span>
                              <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, background: "rgba(239,68,68,0.12)", color: "var(--danger)", fontWeight: 600 }}>{f.category}</span>
                              <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, background: "var(--bg3)", color: "var(--text3)", fontWeight: 600, marginLeft: "auto" }}>{f.severity}</span>
                            </div>
                            {/* Snippet */}
                            <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.6, marginBottom: hasUrl ? 10 : 0 }}>{f.content_snippet}</p>
                            {/* Evidence button */}
                            {hasUrl && (
                              <a
                                href={f.source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  display: "inline-flex", alignItems: "center", gap: 5,
                                  padding: "5px 12px", borderRadius: 8,
                                  background: "var(--bg3)", border: `1px solid ${pColor}40`,
                                  color: pColor, fontSize: 11.5, fontWeight: 600,
                                  textDecoration: "none", transition: "all 0.15s",
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = pColor + "18"; }}
                                onMouseLeave={e => { e.currentTarget.style.background = "var(--bg3)"; }}
                              >
                                <ExternalLink size={11} />
                                Lihat Bukti
                              </a>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Failed */}
          {report?.status === "failed" && (
            <div style={{
              background: "var(--bg2)", border: "1px solid var(--border)",
              borderRadius: 18, padding: "32px 28px", boxShadow: "var(--sh-sm)",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center",
            }}>
              <AlertTriangle size={32} style={{ color: "var(--danger)" }} />
              <p style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 16, color: "var(--text)" }}>Screening Gagal</p>
              <p style={{ fontSize: 13, color: "var(--text3)" }}>{report.error_message ?? "Terjadi kesalahan saat proses screening."}</p>
              <button onClick={load} style={{
                display: "flex", alignItems: "center", gap: 6, padding: "9px 20px",
                borderRadius: 10, background: "var(--danger-d)", border: "1px solid rgba(239,68,68,0.2)",
                color: "var(--danger)", fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}>
                <RefreshCw size={13} /> Coba Lagi
              </button>
            </div>
          )}

        </div>
      </div>
    </AppLayout>
  );
}