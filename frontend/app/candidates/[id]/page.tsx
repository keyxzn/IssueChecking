"use client";

import React, { useEffect, useState, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import { useParams } from "next/navigation";
import Link from "next/link";
import RiskBadge from "@/components/RiskBadge";
import { api, assessReport, Candidate, ScreeningReport } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  ArrowLeft, Loader2, RefreshCw, Camera, MessageCircle,
  Globe, Link2, Newspaper, AlertTriangle, CheckCircle,
  ShieldAlert, Mail, Phone, Clock, ExternalLink, Download,
  ThumbsUp, ThumbsDown, User, Calendar,
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
  const { user } = useAuth();
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [report, setReport] = useState<ScreeningReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "details" | "flags">("overview");
  const [elapsed, setElapsed] = useState(0);
  const [assessing, setAssessing] = useState(false);

  const handleAssess = async (status: "appropriate" | "inappropriate") => {
    if (!report) return;
    setAssessing(true);
    try {
      const updated = await assessReport(report.id, { assessment_status: status });
      setReport(updated);
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      alert("Gagal menyimpan keputusan HR: " + msg);
      console.error("assess error:", e);
    } finally { setAssessing(false); }
  };

  const handleDownload = async () => {
    if (!candidate || !report) return;
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    const scores  = report.risk_scores  ?? {};
    const flagged = report.flagged_content ?? [];
    const W = 210, margin = 18;
    let y = 0;

    const riskLabel: Record<string,string> = { low:"Rendah", medium:"Sedang", high:"Tinggi", critical:"Kritis" };
    const riskHex:   Record<string,string> = { low:"#10B981", medium:"#F59E0B", high:"#EF4444", critical:"#7F1D1D" };
    const riskRGB: Record<string,[number,number,number]> = {
      low:[16,185,129], medium:[245,158,11], high:[239,68,68], critical:[127,29,29]
    };
    const risk = report.overall_risk ?? "low";
    const mc   = riskRGB[risk] ?? [16,185,129];

    const addPage = () => { doc.addPage(); y = 20; };
    const checkY  = (need:number) => { if (y+need>275) addPage(); };
    const hline   = (yy:number, r=220,g=232,b=240) => {
      doc.setDrawColor(r,g,b); doc.setLineWidth(0.25); doc.line(margin,yy,W-margin,yy);
    };
    const sectionTitle = (title:string) => {
      checkY(16);
      doc.setFillColor(...mc);
      doc.rect(margin, y, 3, 8, "F");
      doc.setFont("helvetica","bold"); doc.setFontSize(10); doc.setTextColor(15,23,42);
      doc.text(title, margin+6, y+6);
      doc.setDrawColor(...mc); doc.setLineWidth(0.3); doc.line(margin+6, y+9, W-margin, y+9);
      y += 14;
    };

    // ══════════════════════════════════════════════
    // PAGE 1 — COVER
    // ══════════════════════════════════════════════

    // Deep dark header
    doc.setFillColor(10,14,20);
    doc.rect(0,0,W,55,"F");

    // Accent stripe
    doc.setFillColor(...mc);
    doc.rect(0,52,W,3,"F");

    // Logo area
    doc.setFillColor(...mc);
    doc.roundedRect(margin,10,28,28,4,4,"F");
    doc.setFont("helvetica","bold"); doc.setFontSize(14); doc.setTextColor(255,255,255);
    doc.text("HR",margin+14,27,{align:"center"});

    // Title
    doc.setFont("helvetica","bold"); doc.setFontSize(20); doc.setTextColor(240,245,255);
    doc.text("StrappingMedia",margin+34,22);
    doc.setFont("helvetica","normal"); doc.setFontSize(9); doc.setTextColor(100,116,139);
    doc.text("Media Intelligence Platform",margin+34,29);

    // Report label
    doc.setFont("helvetica","bold"); doc.setFontSize(10); doc.setTextColor(180,190,210);
    doc.text("MEDIA MONITORING REPORT",W-margin,20,{align:"right"});
    doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.setTextColor(80,100,130);
    doc.text(new Date().toLocaleString("id-ID"),W-margin,28,{align:"right"});
    doc.text(`Report ID: ${report.id.slice(0,16)}...`,W-margin,35,{align:"right"});

    y = 66;

    // ── Candidate card ──────────────────────────────
    // Shadow effect (faint rect behind)
    doc.setFillColor(220,230,240);
    doc.roundedRect(margin+1,y+1,W-margin*2,38,4,4,"F");
    // Main card
    doc.setFillColor(250,252,255);
    doc.roundedRect(margin,y,W-margin*2,38,4,4,"F");
    doc.setDrawColor(210,220,235); doc.setLineWidth(0.4);
    doc.roundedRect(margin,y,W-margin*2,38,4,4,"S");

    // Left accent bar
    doc.setFillColor(...mc);
    doc.roundedRect(margin,y,3,38,2,2,"F");

    // Avatar circle
    doc.setFillColor(...mc);
    doc.circle(margin+18,y+19,12,"F");
    doc.setFont("helvetica","bold"); doc.setFontSize(14); doc.setTextColor(255,255,255);
    doc.text(candidate.full_name.charAt(0).toUpperCase(),margin+18,y+24,{align:"center"});

    // Name & info
    doc.setFont("helvetica","bold"); doc.setFontSize(14); doc.setTextColor(10,20,40);
    doc.text(candidate.full_name,margin+34,y+13);
    doc.setFont("helvetica","normal"); doc.setFontSize(8.5); doc.setTextColor(70,90,115);
    doc.text(`✉  ${candidate.email}`,margin+34,y+21);
    doc.text(`☎  ${candidate.phone ?? "-"}`,margin+34,y+28);
    doc.setFontSize(7.5); doc.setTextColor(140,155,175);
    doc.text(`Issue ID: ${candidate.id}`,margin+34,y+35);

    // Risk badge (right side of card)
    const badgeX = W-margin-38;
    const badgeY = y+9;
    doc.setFillColor(...mc);
    doc.roundedRect(badgeX,badgeY,32,20,3,3,"F");
    doc.setFont("helvetica","bold"); doc.setFontSize(7); doc.setTextColor(255,255,255);
    doc.text("RISK LEVEL",badgeX+16,badgeY+7,{align:"center"});
    doc.setFontSize(11);
    doc.text((riskLabel[risk]??"").toUpperCase(),badgeX+16,badgeY+16,{align:"center"});

    y += 48;

    // ── Social profiles found ───────────────────────
    const profiles = report.found_profiles ?? {};
    const profKeys = Object.keys(profiles).filter(k=>k!=="google_results");
    if (profKeys.length > 0) {
      doc.setFillColor(245,248,252);
      doc.roundedRect(margin,y,W-margin*2,10,2,2,"F");
      doc.setFont("helvetica","bold"); doc.setFontSize(7.5); doc.setTextColor(80,100,130);
      doc.text("PROFIL DITEMUKAN:",margin+5,y+6.5);
      let px = margin+45;
      profKeys.forEach(k=>{
        const val = String(profiles[k]);
        doc.setFont("helvetica","normal"); doc.setFontSize(7.5); doc.setTextColor(30,70,180);
        doc.text(`${k.charAt(0).toUpperCase()+k.slice(1)}: ${val}`,px,y+6.5);
        px += doc.getTextWidth(`${k}: ${val}`) + 10;
      });
      y += 16;
    }

    // ══════════════════════════════════════════════
    // SECTION: Risk Scores
    // ══════════════════════════════════════════════
    sectionTitle("SKOR RISIKO PER KATEGORI");

    const cats = [
      { label:"Explicit Content",  key:"explicit_content",  rgb:[139,92,246]  as [number,number,number], emoji:"🔞" },
      { label:"Toxic Language",    key:"toxic_language",    rgb:[249,115,22]  as [number,number,number], emoji:"😡" },
      { label:"Hate Speech",       key:"hate_speech",       rgb:[234,179,8]   as [number,number,number], emoji:"🚫" },
      { label:"Violence",          key:"violence",          rgb:[220,38,38]   as [number,number,number], emoji:"⚠️" },
      { label:"Extremism",         key:"extremism",         rgb:[71,85,105]   as [number,number,number], emoji:"☢️" },
      { label:"Professional Risk", key:"professional_risk", rgb:[239,68,68]   as [number,number,number], emoji:"💼" },
    ];

    const barAreaW = W-margin*2-55;
    cats.forEach((cat,i)=>{
      checkY(14);
      const score = Math.round((scores[cat.key]??0) as number);
      const fill  = (score/100)*barAreaW;
      const tagC: [number,number,number] = score<25?[16,185,129]:score<50?[245,158,11]:[239,68,68];
      const tag   = score<25?"AMAN":score<50?"PERHATIAN":score<75?"TINGGI":"KRITIS";

      // Alternating row bg
      if (i%2===0) {
        doc.setFillColor(248,250,253);
        doc.roundedRect(margin,y-1,W-margin*2,12,1,1,"F");
      }

      // Label
      doc.setFont("helvetica","normal"); doc.setFontSize(8.5); doc.setTextColor(50,65,85);
      doc.text(cat.label,margin+2,y+7);

      // Bar track
      doc.setFillColor(220,228,240);
      doc.roundedRect(margin+47,y+2,barAreaW,5,1.5,1.5,"F");

      // Bar fill
      if (fill>0) {
        doc.setFillColor(...cat.rgb);
        doc.roundedRect(margin+47,y+2,Math.min(fill,barAreaW),5,1.5,1.5,"F");
      }

      // Score
      doc.setFont("helvetica","bold"); doc.setFontSize(8.5); doc.setTextColor(...tagC);
      doc.text(`${score}`,W-margin-22,y+7,{align:"right"});
      doc.text("%",W-margin-16,y+7);

      // Tag pill
      doc.setFillColor(...tagC);
      doc.roundedRect(W-margin-14,y+1,12,7,1.5,1.5,"F");
      doc.setFont("helvetica","bold"); doc.setFontSize(6); doc.setTextColor(255,255,255);
      doc.text(tag,W-margin-8,y+6,{align:"center"});

      y+=12;
    });

    y+=6;

    // ══════════════════════════════════════════════
    // SECTION: AI Summary
    // ══════════════════════════════════════════════
    sectionTitle("AI SUMMARY");

    // Summary box
    checkY(20);
    const summaryText = report.ai_summary ?? "Tidak ada ringkasan.";
    const summaryLines = doc.splitTextToSize(summaryText,W-margin*2-8);
    const boxH = Math.max(20, summaryLines.length*5+10);
    doc.setFillColor(245,248,255);
    doc.roundedRect(margin,y,W-margin*2,boxH,3,3,"F");
    doc.setDrawColor(210,220,240); doc.setLineWidth(0.3);
    doc.roundedRect(margin,y,W-margin*2,boxH,3,3,"S");
    doc.setFont("helvetica","normal"); doc.setFontSize(8.5); doc.setTextColor(50,65,90);
    summaryLines.forEach((l:string,i:number)=>{
      if (y+8+(i*5)>270) { addPage(); }
      doc.text(l,margin+4,y+8+(i*5));
    });
    y += boxH+6;

    // ══════════════════════════════════════════════
    // SECTION: Flagged Content
    // ══════════════════════════════════════════════
    sectionTitle(`KONTEN BERMASALAH (${flagged.length})`);

    if (flagged.length===0) {
      checkY(18);
      doc.setFillColor(235,253,245);
      doc.roundedRect(margin,y,W-margin*2,16,3,3,"F");
      doc.setDrawColor(16,185,129); doc.setLineWidth(0.4);
      doc.roundedRect(margin,y,W-margin*2,16,3,3,"S");
      // Green checkmark circle
      doc.setFillColor(16,185,129);
      doc.circle(margin+12,y+8,5,"F");
      doc.setFont("helvetica","bold"); doc.setFontSize(10); doc.setTextColor(255,255,255);
      doc.text("✓",margin+12,y+11.5,{align:"center"});
      doc.setFont("helvetica","bold"); doc.setFontSize(9.5); doc.setTextColor(10,90,60);
      doc.text("Tidak ada konten bermasalah ditemukan",margin+22,y+7.5);
      doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.setTextColor(30,120,80);
      doc.text("Issue ini tidak ada temuan tanpa flag.",margin+22,y+13.5);
      y+=22;
    } else {
      flagged.forEach((f:any,i:number)=>{
        checkY(26);
        const sev = (f.severity??"").toLowerCase();
        const sevC: [number,number,number] = sev==="tinggi"||sev==="high"?[239,68,68]:sev==="sedang"||sev==="medium"?[245,158,11]:[16,185,129];
        const sevBg: [number,number,number] = sev==="tinggi"||sev==="high"?[254,242,242]:sev==="sedang"||sev==="medium"?[254,249,235]:[240,253,244];

        // Card shadow
        doc.setFillColor(215,225,235);
        doc.roundedRect(margin+1,y+1,W-margin*2,22,3,3,"F");
        // Card bg
        doc.setFillColor(...sevBg);
        doc.roundedRect(margin,y,W-margin*2,22,3,3,"F");
        doc.setDrawColor(...sevC); doc.setLineWidth(0.35);
        doc.roundedRect(margin,y,W-margin*2,22,3,3,"S");
        // Left accent
        doc.setFillColor(...sevC);
        doc.roundedRect(margin,y,3,22,1.5,1.5,"F");

        // Number badge
        doc.setFillColor(...sevC);
        doc.circle(margin+12,y+11,5,"F");
        doc.setFont("helvetica","bold"); doc.setFontSize(8); doc.setTextColor(255,255,255);
        doc.text(String(i+1),margin+12,y+14,{align:"center"});

        // Platform & category
        doc.setFont("helvetica","bold"); doc.setFontSize(8.5); doc.setTextColor(20,30,50);
        doc.text(`[${(f.platform??"").toUpperCase()}] ${f.category??""}`,margin+21,y+8);

        // Severity badge
        doc.setFillColor(...sevC);
        doc.roundedRect(W-margin-24,y+2,20,7,2,2,"F");
        doc.setFont("helvetica","bold"); doc.setFontSize(7); doc.setTextColor(255,255,255);
        doc.text((f.severity??"").toUpperCase(),W-margin-14,y+7,{align:"center"});

        // Snippet
        if (f.content_snippet) {
          const snip = doc.splitTextToSize(f.content_snippet,W-margin*2-28);
          doc.setFont("helvetica","normal"); doc.setFontSize(7.5); doc.setTextColor(60,75,95);
          snip.slice(0,2).forEach((l:string,li:number)=>doc.text(l,margin+21,y+14+(li*4.5)));
        }
        y+=26;
      });
    }

    y+=4;

    // ══════════════════════════════════════════════
    // SECTION: HR Assessment
    // ══════════════════════════════════════════════
    if (report.assessment_status) {
      sectionTitle("KEPUTUSAN ANALISIS");
      checkY(28);
      const isApp = report.assessment_status==="appropriate";
      const assC: [number,number,number] = isApp?[16,185,129]:[239,68,68];
      const assBg: [number,number,number] = isApp?[235,252,244]:[254,242,242];

      doc.setFillColor(...assBg);
      doc.roundedRect(margin,y,W-margin*2,26,3,3,"F");
      doc.setDrawColor(...assC); doc.setLineWidth(0.5);
      doc.roundedRect(margin,y,W-margin*2,26,3,3,"S");

      // Big icon circle
      doc.setFillColor(...assC);
      doc.circle(margin+15,y+13,9,"F");
      doc.setFont("helvetica","bold"); doc.setFontSize(14); doc.setTextColor(255,255,255);
      doc.text(isApp?"✓":"✗",margin+15,y+18,{align:"center"});

      doc.setFont("helvetica","bold"); doc.setFontSize(13); doc.setTextColor(...assC);
      doc.text(isApp?"APPROPRIATE — LANJUT PROSES":"INAPPROPRIATE — TIDAK DILANJUTKAN",margin+28,y+11);

      doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.setTextColor(70,85,110);
      doc.text(`Dinilai oleh: ${report.assessed_by_name??"-"} (${report.assessed_by??"-"})`,margin+28,y+18);
      doc.text(`Waktu penilaian: ${report.assessed_at?new Date(report.assessed_at).toLocaleString("id-ID"):"-"}`,margin+28,y+23);
      y+=32;
    }

    // ══════════════════════════════════════════════
    // FOOTER on all pages
    // ══════════════════════════════════════════════
    const pageCount = doc.getNumberOfPages();
    for (let i=1;i<=pageCount;i++) {
      doc.setPage(i);
      // Footer bar
      doc.setFillColor(10,14,20);
      doc.rect(0,283,W,14,"F");
      doc.setFillColor(...mc);
      doc.rect(0,283,W,1.5,"F");

      doc.setFont("helvetica","normal"); doc.setFontSize(7); doc.setTextColor(100,116,139);
      doc.text("StrappingMedia Media Intelligence Platform  ·  Dokumen Rahasia & Terbatas",margin,290);
      doc.setTextColor(80,100,130);
      doc.text(`Halaman ${i} dari ${pageCount}`,W-margin,290,{align:"right"});

      // Watermark text diagonal
      doc.setGState(new (doc as any).GState({opacity:0.04}));
      doc.setFont("helvetica","bold"); doc.setFontSize(42); doc.setTextColor(100,100,100);
      doc.text("STRAPPING MEDIA CONFIDENTIAL",W/2,160,{align:"center",angle:45});
      doc.setGState(new (doc as any).GState({opacity:1}));
    }

    doc.save(`StrappingMedia_${candidate.full_name.replace(/\s+/g,"_")}_${new Date().toISOString().slice(0,10)}.pdf`);
  };


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
            Memuat data issue...
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
            <ArrowLeft size={13} /> Semua Issue
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

                {/* Download button */}
                <button onClick={handleDownload} style={{
                  marginTop: 10, display: "flex", alignItems: "center", gap: 6,
                  padding: "7px 14px", borderRadius: 10, fontSize: 12, fontWeight: 600,
                  background: "var(--bg3)", border: "1px solid var(--border)",
                  color: "var(--text2)", cursor: "pointer", transition: "all 0.15s", marginLeft: "auto",
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text2)"; }}
                >
                  <Download size={12} /> Download Report
                </button>
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
                  Analisis Media Berjalan
                </p>
                <p style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.6, maxWidth: 420 }}>
                  Sistem sedang menganalisis platform & media yang terkait dengan issue ini. Proses ini biasanya memakan waktu 1–3 menit. Halaman akan otomatis diperbarui.
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

              {/* Assessment Panel (No. 1 BCA) */}
              <div style={{
                background: "var(--bg2)", border: "1px solid var(--border)",
                borderRadius: 18, padding: "20px 24px", marginBottom: 16,
                boxShadow: "var(--sh-sm)",
              }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14 }}>
                  Keputusan Analisis
                </p>

                {report.assessment_status ? (
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{
                        width: 42, height: 42, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
                        background: report.assessment_status === "appropriate" ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.12)",
                        border: `1px solid ${report.assessment_status === "appropriate" ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.25)"}`,
                      }}>
                        {report.assessment_status === "appropriate"
                          ? <ThumbsUp size={18} style={{ color: "#22c55e" }} />
                          : <ThumbsDown size={18} style={{ color: "#ef4444" }} />}
                      </div>
                      <div>
                        <p style={{
                          fontWeight: 700, fontSize: 15,
                          color: report.assessment_status === "appropriate" ? "#22c55e" : "#ef4444",
                          marginBottom: 3,
                        }}>
                          {report.assessment_status === "appropriate" ? "✅ Appropriate" : "❌ Inappropriate"}
                        </p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
                          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--text3)" }}>
                            <User size={11} /> {report.assessed_by_name ?? "-"} ({report.assessed_by ?? "-"})
                          </span>
                          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--text3)" }}>
                            <Calendar size={11} /> {report.assessed_at ? new Date(report.assessed_at).toLocaleString("id-ID") : "-"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => setReport({ ...report, assessment_status: undefined as any })} style={{
                      fontSize: 11.5, padding: "5px 12px", borderRadius: 8,
                      background: "var(--bg3)", border: "1px solid var(--border)",
                      color: "var(--text3)", cursor: "pointer",
                    }}>Ubah</button>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button
                      disabled={assessing}
                      onClick={() => handleAssess("appropriate")}
                      style={{
                        display: "flex", alignItems: "center", gap: 8, padding: "10px 20px",
                        borderRadius: 12, border: "1px solid rgba(34,197,94,0.4)",
                        background: "rgba(34,197,94,0.08)", color: "#22c55e",
                        fontWeight: 700, fontSize: 13, cursor: "pointer", transition: "all 0.15s",
                        opacity: assessing ? 0.6 : 1,
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(34,197,94,0.18)"}
                      onMouseLeave={e => e.currentTarget.style.background = "rgba(34,197,94,0.08)"}
                    >
                      <ThumbsUp size={14} /> Appropriate
                    </button>
                    <button
                      disabled={assessing}
                      onClick={() => handleAssess("inappropriate")}
                      style={{
                        display: "flex", alignItems: "center", gap: 8, padding: "10px 20px",
                        borderRadius: 12, border: "1px solid rgba(239,68,68,0.4)",
                        background: "rgba(239,68,68,0.08)", color: "#ef4444",
                        fontWeight: 700, fontSize: 13, cursor: "pointer", transition: "all 0.15s",
                        opacity: assessing ? 0.6 : 1,
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,0.18)"}
                      onMouseLeave={e => e.currentTarget.style.background = "rgba(239,68,68,0.08)"}
                    >
                      <ThumbsDown size={14} /> Inappropriate
                    </button>
                    {assessing && <Loader2 size={16} className="animate-spin" style={{ color: "var(--accent)", alignSelf: "center" }} />}
                  </div>
                )}
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
                      <p style={{ fontSize: 13 }}>Issue ini tidak ada temuan tanpa flag.</p>
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