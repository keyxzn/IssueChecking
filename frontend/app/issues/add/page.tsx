"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { api } from "@/lib/api";

import {
  Hash,
  AlertCircle,
  Loader2,
  Zap,
  Globe,
  Camera,
  MessageCircle,
  Video,
  Youtube,
} from "lucide-react";

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
  {
    id: "tiktok",
    icon: Video,
    label: "TikTok",
    color: "#010101",
    bg: "rgba(255,255,255,0.06)",
    ph: "https://tiktok.com/@username",
  },
  {
    id: "youtube",
    icon: Youtube,
    label: "YouTube",
    color: "#ff0000",
    bg: "rgba(255,0,0,0.08)",
    ph: "https://youtube.com/@channel",
  },
];

const PLATFORM_BADGES = [
  { label: "Instagram", color: "#e1306c" },
  { label: "X/Twitter", color: "#1d9bf0" },
  { label: "Facebook",  color: "#1877f2" },
  { label: "TikTok",    color: "#69C9D0" },
  { label: "YouTube",   color: "#ff0000" },
  { label: "Google",    color: "#34a853" },
  { label: "Berita",    color: "#64748b" },
];

export default function AddIssuePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const [form, setForm] = useState({
    keyword:       "",
    instagram_url: "",
    twitter_url:   "",
    facebook_url:  "",
    tiktok_url:    "",
    youtube_url:   "",
  });

  const set =
    (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit() {
    if (!form.keyword.trim()) {
      setError("Keyword/nama issue wajib diisi.");
      return;
    }

    if (
      !form.instagram_url &&
      !form.twitter_url &&
      !form.facebook_url &&
      !form.tiktok_url &&
      !form.youtube_url
    ) {
      setError("Minimal satu URL platform harus diisi (opsional, bisa dikosongkan).");
    }

    setError("");
    setLoading(true);

    try {
      const issue = await api.createIssue({
        ...form,
        consent_given: true,
      });

      router.push(`/issues/${issue.id}`);
    } catch (e: any) {
      setError(e.message ?? "Terjadi kesalahan.");
      setLoading(false);
    }
  }

  const LabelField = ({ children }: { children: React.ReactNode }) => (
    <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text3)" }}>
      {children}
    </span>
  );

  return (
    <AppLayout>
      <div style={{ minHeight: "100vh" }}>
        {/* HERO */}
        <div style={{ background: "linear-gradient(180deg,#070d1a 0%,#0d1e33 100%)", borderBottom: "1px solid rgba(56,189,248,0.08)", padding: "36px 32px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -60, right: -60, width: 280, height: 280, borderRadius: "50%", background: "rgba(56,189,248,0.04)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: -40, right: 160, width: 180, height: 180, borderRadius: "50%", background: "rgba(99,179,237,0.03)", pointerEvents: "none" }} />

          <div style={{ maxWidth: 680, margin: "0 auto", position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
              <span style={{ fontSize: 10.5, color: "var(--accent)", fontWeight: 600 }}>Issues</span>
              <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 12 }}>/</span>
              <span style={{ fontSize: 10.5, color: "rgba(255,255,255,0.65)", fontWeight: 600 }}>Tambah Issue</span>
            </div>

            <h1 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 32, color: "#fff", letterSpacing: "-0.03em", marginBottom: 10 }}>
              Tambah Issue / Keyword Baru
            </h1>

            <p style={{ color: "rgba(255,255,255,0.72)", fontSize: 14, marginBottom: 24 }}>
              Masukkan keyword atau nama issue untuk memulai AI media monitoring di semua platform.
            </p>

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {PLATFORM_BADGES.map((p) => (
                <span key={p.label} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 600, padding: "5px 11px", borderRadius: 999, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.72)" }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: p.color }} />
                  {p.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* FORM */}
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "28px 32px", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Keyword */}
          <div className="card fade-up" style={{ padding: "28px 28px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, paddingBottom: 18, borderBottom: "1px solid var(--border)" }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(56,189,248,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Hash size={14} style={{ color: "var(--accent)" }} />
              </div>
              <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 16, color: "var(--text)" }}>
                Keyword / Issue
              </h2>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: 8 }}>
                <LabelField>Keyword atau Nama Issue <span style={{ color: "var(--danger)" }}>*</span></LabelField>
              </label>
              <div style={{ position: "relative" }}>
                <Hash size={13} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "var(--text3)" }} />
                <input
                  value={form.keyword}
                  onChange={set("keyword")}
                  placeholder="Contoh: Gibran Rakabuming, Polusi Jakarta, UU ITE..."
                  className="input-base"
                  style={{ paddingLeft: 40 }}
                />
              </div>
              <p style={{ fontSize: 11.5, color: "var(--text3)", marginTop: 6 }}>
                Bisa berupa nama tokoh, topik, hashtag, atau isu yang ingin dipantau.
              </p>
            </div>
          </div>

          {/* Sosial Media */}
          <div className="card fade-up d2" style={{ padding: "28px 28px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 24, paddingBottom: 18, borderBottom: "1px solid var(--border)" }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(56,189,248,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Globe size={14} style={{ color: "var(--accent)" }} />
              </div>
              <div>
                <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 16, color: "var(--text)" }}>
                  URL Platform (Opsional)
                </h2>
                <p style={{ fontSize: 12.5, color: "var(--text3)", marginTop: 4, lineHeight: 1.5 }}>
                  Tambahkan URL akun spesifik untuk hasil lebih akurat, atau biarkan kosong untuk pencarian umum.
                </p>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {SOCIALS.map(({ id, icon: Icon, label, color, bg, ph }) => (
                <div key={id}>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <span style={{ width: 20, height: 20, borderRadius: 6, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon size={10} style={{ color }} />
                    </span>
                    <LabelField>{label}</LabelField>
                  </label>
                  <input
                    value={(form as any)[`${id}_url`]}
                    onChange={set(`${id}_url`)}
                    placeholder={ph}
                    className="input-base"
                    style={{ fontSize: 12.5 }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="fade-up d3">
            {error && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderRadius: 12, marginBottom: 16, background: "var(--danger-d)", border: "1px solid rgba(239,68,68,0.2)", color: "var(--danger)", fontSize: 13 }}>
                <AlertCircle size={14} />
                {error}
              </div>
            )}

            <button
              onClick={submit}
              disabled={loading}
              className="btn btn-primary"
              style={{ width: "100%", justifyContent: "center", fontSize: 14.5, padding: "14px 24px" }}
            >
              {loading ? (
                <><Loader2 size={15} className="animate-spin" /> Memproses...</>
              ) : (
                <><Zap size={15} /> Mulai Monitoring Issue</>
              )}
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
