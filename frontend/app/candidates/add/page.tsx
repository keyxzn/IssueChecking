"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import {
  ArrowLeft, Sparkles, ShieldCheck, AlertCircle,
  Loader2, Brain, Globe, Camera, MessageCircle,
  Link2, CheckCircle2, Search, Radio, Newspaper,
} from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";

const SOCIALS = [
  {
    id: "instagram",
    icon: Camera,
    label: "Instagram",
    color: "#e1306c",
    bg: "rgba(225,48,108,0.08)",
    ph: "https://instagram.com/username",
  },
  {
    id: "twitter",
    icon: MessageCircle,
    label: "X / Twitter",
    color: "#1d9bf0",
    bg: "rgba(29,155,240,0.08)",
    ph: "https://x.com/username",
  },
  {
    id: "facebook",
    icon: Globe,
    label: "Facebook",
    color: "#1877f2",
    bg: "rgba(24,119,242,0.08)",
    ph: "https://facebook.com/username",
  },
];

const PLATFORM_BADGES = [
  { label: "Instagram",  color: "#e1306c" },
  { label: "X/Twitter",  color: "#1d9bf0" },
  { label: "Facebook",   color: "#1877f2" },
  { label: "Google",     color: "#34a853" },
  { label: "Berita",     color: "#64748b" },
  { label: "TV/Radio",   color: "#f97316" },
];

export default function AddIssuePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [consent, setConsent] = useState(false);

  const [form, setForm] = useState({
    full_name:     "",
    email:         "",
    phone:         "",
    instagram_url: "",
    twitter_url:   "",
    facebook_url:  "",
    linkedin_url:  "",
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  async function submit() {
    if (!form.full_name) {
      setError("Nama issue / keyword wajib diisi.");
      return;
    }
    if (!consent) {
      setError("Centang pernyataan konfirmasi terlebih dahulu.");
      return;
    }

    // Auto-generate email identifier jika kosong
    const autoEmail = form.email.trim() ||
      `${form.full_name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}-${Date.now()}@strapping.internal`;

    setError("");
    setLoading(true);
    try {
      const issue = await api.createCandidate({ ...form, email: autoEmail, consent_given: true });
      router.push(`/candidates/${issue.id}`);
    } catch (e: any) {
      setError(e.message ?? "Terjadi kesalahan.");
      setLoading(false);
    }
  }

  return (
    <AppLayout>
      <div style={{ minHeight: "100vh" }}>
        {/* HERO */}
        <div style={{
          background: "var(--bg2)", borderBottom: "1px solid var(--border)",
          padding: "28px 32px 24px",
        }}>
          <div style={{ maxWidth: 960, margin: "0 auto" }}>
            <Link href="/candidates" style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              fontSize: 12, fontWeight: 600, color: "var(--text3)", textDecoration: "none",
              marginBottom: 14, transition: "color 0.15s",
            }}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--accent)")}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--text3)")}
            >
              <ArrowLeft size={13} /> Kembali ke Semua Issue
            </Link>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
              <div>
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  background: "var(--accent-d)", color: "var(--accent)", padding: "5px 14px",
                  borderRadius: 999, fontSize: 10, fontWeight: 700, letterSpacing: "0.12em",
                  textTransform: "uppercase", marginBottom: 10,
                }}>
                  <Radio size={11} /> Media Intelligence Engine
                </div>
                <h1 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 28, color: "var(--text)", letterSpacing: "-0.03em", marginBottom: 6 }}>
                  Tambah Issue / Keyword
                </h1>
                <p style={{ fontSize: 13, color: "var(--text3)", maxWidth: 520, lineHeight: 1.6 }}>
                  Masukkan nama issue, tokoh, atau keyword yang ingin dimonitor di berbagai platform media — Instagram, X, Facebook, Berita, hingga TV & Radio.
                </p>
              </div>
              {/* Platform badges */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7, maxWidth: 300 }}>
                {PLATFORM_BADGES.map(p => (
                  <span key={p.label} style={{
                    fontSize: 11, fontWeight: 700, padding: "4px 11px", borderRadius: 999,
                    background: `${p.color}18`, color: p.color, border: `1px solid ${p.color}33`,
                  }}>{p.label}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div style={{ maxWidth: 960, margin: "0 auto", padding: "28px 32px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24, alignItems: "start" }}>

            {/* FORM */}
            <div className="card" style={{ padding: 28 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, paddingBottom: 20, borderBottom: "1px solid var(--border)" }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: "var(--accent-d)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Search size={18} style={{ color: "var(--accent)" }} />
                </div>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 800, color: "var(--text)", fontFamily: "'Syne',sans-serif" }}>Data Issue / Keyword</h2>
                  <p style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>Isi info untuk memulai monitoring</p>
                </div>
              </div>

              {error && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 10, background: "var(--danger-d)", border: "1px solid var(--danger)", marginBottom: 20 }}>
                  <AlertCircle size={14} style={{ color: "var(--danger)", flexShrink: 0 }} />
                  <p style={{ fontSize: 13, color: "var(--danger)", fontWeight: 500 }}>{error}</p>
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

                {/* Issue name */}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text3)", display: "block", marginBottom: 8 }}>
                    Nama Issue / Keyword / Tokoh *
                  </label>
                  <input value={form.full_name} onChange={set("full_name")}
                    placeholder="cth: Prabowo Subianto, IKN Nusantara, Kasus Korupsi BJB..."
                    className="input-base" />
                  <p style={{ fontSize: 11, color: "var(--text4)", marginTop: 5 }}>AI akan otomatis mencari di Google, Berita, dan semua platform media.</p>
                </div>



                {/* Social media URLs */}
                <div>
                  <div style={{ marginBottom: 14 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", fontFamily: "'Syne',sans-serif", marginBottom: 4 }}>URL Sosial Media <span style={{ fontSize: 11, fontWeight: 500, color: "var(--text4)" }}>(opsional)</span></h3>
                    <p style={{ fontSize: 12, color: "var(--text3)" }}>Jika ada, masukkan URL akun untuk hasil monitoring lebih akurat</p>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {SOCIALS.map(s => (
                      <div key={s.id} style={{ position: "relative" }}>
                        <div style={{
                          position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
                          width: 30, height: 30, borderRadius: 8, background: s.bg,
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <s.icon size={14} style={{ color: s.color }} />
                        </div>
                        <input
                          value={(form as any)[`${s.id}_url`]}
                          onChange={set(`${s.id}_url`)}
                          placeholder={`${s.label} — ${s.ph}`}
                          className="input-base"
                          style={{ paddingLeft: 52 }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Consent */}
                <div style={{
                  display: "flex", alignItems: "flex-start", gap: 12,
                  padding: 16, borderRadius: 12, background: "var(--warn-d)",
                  border: "1px solid var(--warning)",
                }}>
                  <div style={{ flexShrink: 0, marginTop: 1 }}>
                    <ShieldCheck size={16} style={{ color: "var(--warning)" }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>Konfirmasi Monitoring</p>
                    <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
                      <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}
                        style={{ marginTop: 2, accentColor: "var(--accent)", width: 14, height: 14 }} />
                      <span style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.5 }}>
                        Monitoring ini dilakukan sesuai kebijakan internal dan tujuan pemantauan media yang sah. Data yang dikumpulkan bersumber dari informasi publik.
                      </span>
                    </label>
                  </div>
                </div>

                {/* Submit */}
                <button onClick={submit} disabled={loading} style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  height: 48, borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: loading ? "wait" : "pointer",
                  background: "var(--accent)", color: "#0a1f18", border: "none",
                  opacity: loading ? 0.7 : 1, transition: "all 0.15s",
                }}>
                  {loading ? <><Loader2 size={16} className="animate-spin" /> Memulai Analisis…</> : <><Sparkles size={16} /> Mulai Media Monitoring</>}
                </button>
              </div>
            </div>

            {/* SIDE PANEL */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* AI status */}
              <div className="card" style={{ padding: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--accent-d)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Brain size={16} style={{ color: "var(--accent)" }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text4)" }}>AI STATUS</p>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>Engine Ready</p>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[
                    "Instagram monitoring",
                    "Facebook public detection",
                    "X / Twitter tracking",
                    "Toxic language recognition",
                    "News & media scanning",
                    "AI risk scoring",
                  ].map(x => (
                    <div key={x} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <CheckCircle2 size={13} style={{ color: "var(--accent)", flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: "var(--text2)" }}>{x}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Platform grid */}
              <div className="card" style={{ padding: 20 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", marginBottom: 14, fontFamily: "'Syne',sans-serif" }}>Platform Monitoring</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {[
                    { icon: "📸", label: "Instagram" },
                    { icon: "🐦", label: "Twitter/X" },
                    { icon: "👥", label: "Facebook" },
                    { icon: "🔍", label: "Google" },
                    { icon: "📰", label: "Berita" },
                    { icon: "📡", label: "TV/Radio" },
                  ].map(item => (
                    <div key={item.label} style={{
                      padding: "10px 8px", borderRadius: 10,
                      border: "1px solid var(--border)", background: "var(--bg3)",
                      textAlign: "center",
                    }}>
                      <div style={{ fontSize: 20, marginBottom: 4 }}>{item.icon}</div>
                      <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text2)" }}>{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
