"use client";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Shield, Mail, Lock, Eye, EyeOff, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [pw, setPw]       = useState("");
  const [show, setShow]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!email || !pw) { setError("Email dan password wajib diisi."); return; }
    setError(""); setLoading(true);
    try { await login(email, pw); }
    catch (e: any) { setError(e.message ?? "Login gagal."); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "#080d14", fontFamily: "'Inter',sans-serif" }}>

      {/* ── LEFT PANEL ── */}
      <div className="hidden lg:flex flex-col justify-between" style={{ width: 480, flexShrink: 0, padding: "40px 48px", position: "relative", overflow: "hidden", background: "linear-gradient(160deg,#071a11 0%,#090f1e 60%,#080d14 100%)" }}>

        {/* Grid pattern */}
        <div style={{ position: "absolute", inset: 0, opacity: 0.06, backgroundImage: "linear-gradient(#10b981 1px,transparent 1px),linear-gradient(90deg,#10b981 1px,transparent 1px)", backgroundSize: "56px 56px", pointerEvents: "none" }} />
        {/* Glow blobs */}
        <div style={{ position: "absolute", top: "20%", left: "-80px", width: 320, height: 320, borderRadius: "50%", background: "#10b981", opacity: 0.08, filter: "blur(80px)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "15%", right: "-60px", width: 200, height: 200, borderRadius: "50%", background: "#3b82f6", opacity: 0.06, filter: "blur(60px)", pointerEvents: "none" }} />

        {/* Logo */}
        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,#10b981,#059669)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 24px rgba(16,185,129,.35)" }}>
            <Shield size={18} color="#fff" />
          </div>
          <div>
            <p style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 20, color: "#fff", letterSpacing: "-0.04em", lineHeight: 1 }}>
              HR<span style={{ color: "#10b981" }}>Check</span>
            </p>
            <p style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "#1a3a28", fontWeight: 600, marginTop: 3 }}>Media Intelligence</p>
          </div>
        </div>

        {/* Hero */}
        <div style={{ position: "relative" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 99, background: "rgba(16,185,129,.1)", border: "1px solid rgba(16,185,129,.2)", color: "#10b981", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 20 }}>
            ⚡ AI-Powered Platform
          </div>
          <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 38, fontWeight: 800, color: "#e2e8f0", lineHeight: 1.15, letterSpacing: "-0.03em", marginBottom: 16 }}>
            Background<br />Screening yang<br /><span style={{ color: "#10b981" }}>Lebih Cerdas</span>
          </h2>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: "#334155", marginBottom: 28, maxWidth: 360 }}>
            Pantau isu dan keyword di 6+ platform media secara real-time, akurat, dan otomatis berbasis AI.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { icon: "🛡️", text: "Legal & Sesuai UU PDP Indonesia" },
              { icon: "🤖", text: "AI analisis Ollama + Llama 3" },
              { icon: "📊", text: "Risk report otomatis per kategori" },
              { icon: "⚡", text: "Bulk monitoring ratusan keyword" },
            ].map(f => (
              <div key={f.text} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 16, width: 24, flexShrink: 0 }}>{f.icon}</span>
                <span style={{ fontSize: 13, color: "#334155" }}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        <p style={{ position: "relative", fontSize: 11, color: "#0f1f18" }}>© 2026 Strapping Media · Confidential</p>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
        <div style={{ width: "100%", maxWidth: 380 }}>

          {/* Mobile logo */}
          <div className="lg:hidden" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 36 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg,#10b981,#059669)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Shield size={15} color="#fff" />
            </div>
            <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 18, color: "#fff" }}>
              HR<span style={{ color: "#10b981" }}>Check</span>
            </span>
          </div>

          {/* Heading */}
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 26, fontWeight: 800, color: "#e2e8f0", letterSpacing: "-0.03em", marginBottom: 4 }}>Selamat Datang</h1>
            <p style={{ fontSize: 14, color: "#374151" }}>Masuk ke platform HR Screening</p>
          </div>

          {/* Error */}
          {error && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 14px", borderRadius: 10, background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.2)", color: "#f87171", fontSize: 13, marginBottom: 20 }}>
              <AlertCircle size={14} style={{ flexShrink: 0 }} /> {error}
            </div>
          )}

          {/* Form */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Email */}
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#1f2937", marginBottom: 8 }}>Email</label>
              <div style={{ position: "relative" }}>
                <Mail size={14} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#374151", pointerEvents: "none" }} />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()}
                  placeholder="hr@perusahaan.com"
                  style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px 12px 42px", background: "#0f1520", border: "1.5px solid #1e2b3a", borderRadius: 10, color: "#e2e8f0", fontSize: 14, outline: "none", fontFamily: "'Inter',sans-serif", transition: "border-color .15s" }}
                  onFocus={e => e.target.style.borderColor = "#10b981"}
                  onBlur={e => e.target.style.borderColor = "#1e2b3a"} />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#1f2937", marginBottom: 8 }}>Password</label>
              <div style={{ position: "relative" }}>
                <Lock size={14} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#374151", pointerEvents: "none" }} />
                <input type={show ? "text" : "password"} value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()}
                  placeholder="••••••••"
                  style={{ width: "100%", boxSizing: "border-box", padding: "12px 44px 12px 42px", background: "#0f1520", border: "1.5px solid #1e2b3a", borderRadius: 10, color: "#e2e8f0", fontSize: 14, outline: "none", fontFamily: "'Inter',sans-serif", transition: "border-color .15s" }}
                  onFocus={e => e.target.style.borderColor = "#10b981"}
                  onBlur={e => e.target.style.borderColor = "#1e2b3a"} />
                <button type="button" onClick={() => setShow(s => !s)}
                  style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "#374151", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", padding: 0, transition: "color .15s" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#94a3b8")}
                  onMouseLeave={e => (e.currentTarget.style.color = "#374151")}>
                  {show ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          </div>

          {/* Submit */}
          <button onClick={submit} disabled={loading}
            style={{ width: "100%", marginTop: 24, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "13px 20px", background: loading ? "#0f1520" : "linear-gradient(135deg,#10b981,#059669)", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, fontFamily: "'Syne',sans-serif", cursor: loading ? "not-allowed" : "pointer", letterSpacing: "-0.01em", boxShadow: loading ? "none" : "0 4px 20px rgba(16,185,129,.35)", transition: "all .2s" }}
            onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 6px 28px rgba(16,185,129,.5)"; }}
            onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 20px rgba(16,185,129,.35)"; }}>
            {loading ? (
              <>
                <div style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,.25)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                Masuk...
              </>
            ) : (
              <><Shield size={14} /> Masuk ke Strapping Media</>
            )}
          </button>

          <p style={{ textAlign: "center", fontSize: 12, color: "#111827", marginTop: 20 }}>
            Akses hanya untuk HR & personel berwenang
          </p>

          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    </div>
  );
}