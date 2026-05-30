"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import RiskBadge from "@/components/RiskBadge";
import { api, assessReport, Issue, MonitoringReport } from "@/lib/api";
import { Plus, Trash2, Eye, Loader2, Users, Search, UserPlus, FileSpreadsheet, Download, ChevronDown, ThumbsUp, ThumbsDown } from "lucide-react";

type Row = Issue & { report?: MonitoringReport };

export default function IssuesPage() {
  const [rows, setRows]           = useState<Row[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [filter, setFilter]       = useState("all");
  const [dlOpen, setDlOpen]       = useState(false);
  const [dlLoading, setDlLoading] = useState(false);
  const [assessing, setAssessing] = useState<string | null>(null); // reportId being assessed

  async function load() {
    try {
      const c = await api.listIssues();
      const w = await Promise.all(c.map(async x => {
        try { return { ...x, report: await api.getReport(x.id) } } catch { return x }
      }));
      setRows(w);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function del(id: string) {
    if (!confirm("Hapus issue ini?")) return;
    await api.deleteIssue(id);
    setRows(r => r.filter(x => x.id !== id));
  }

  async function handleAssess(row: Row, status: "relevant" | "irrelevant") {
    if (!row.report) return;
    // toggle off if same value
    const newStatus = row.report.assessment_status === status ? undefined : status;
    setAssessing(row.report.id);
    try {
      if (newStatus) {
        const updated = await assessReport(row.report.id, { assessment_status: newStatus as "relevant" | "irrelevant" });
        setRows(prev => prev.map(r => r.id === row.id ? { ...r, report: updated } : r));
      } else {
        // clear by patching with a "clear" approach — send a neutral patch if backend supports,
        // otherwise just optimistically update local state
        setRows(prev => prev.map(r =>
          r.id === row.id ? { ...r, report: { ...r.report!, assessment_status: undefined } } : r
        ));
      }
    } catch (e) {
      alert("Gagal menyimpan keputusan.");
    } finally {
      setAssessing(null);
    }
  }

  // ── jsPDF bulk download ──────────────────────────────────────────────
  async function downloadBulk(riskFilter: string) {
    const targets = rows.filter(r => {
      if (!r.report || r.report.status !== "completed") return false;
      if (riskFilter === "all") return true;
      return r.report.overall_risk === riskFilter;
    });
    if (targets.length === 0) {
      alert(`Tidak ada issue ${riskFilter === "all" ? "" : `risiko ${riskFilter} `}yang sudah selesai screening.`);
      setDlOpen(false);
      return;
    }
    setDlLoading(true);
    setDlOpen(false);
    try {
      const { jsPDF } = await import("jspdf");
      const riskColorMap: Record<string, [number, number, number]> = {
        low: [16, 185, 129], medium: [245, 158, 11], high: [239, 68, 68], critical: [127, 29, 29]
      };
      const riskLabel: Record<string, string> = { low: "Rendah", medium: "Sedang", high: "Tinggi", critical: "Kritis" };
      const cats = [
        { label: "Explicit Content",  key: "explicit_content",  color: [139, 92, 246] as [number, number, number] },
        { label: "Toxic Language",    key: "toxic_language",    color: [249, 115, 22] as [number, number, number] },
        { label: "Hate Speech",       key: "hate_speech",       color: [234, 179, 8]  as [number, number, number] },
        { label: "Violence",          key: "violence",          color: [220, 38, 38]  as [number, number, number] },
        { label: "Extremism",         key: "extremism",         color: [71, 85, 105]  as [number, number, number] },
        { label: "Professional Risk", key: "professional_risk", color: [239, 68, 68]  as [number, number, number] },
      ];
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const W = 210, margin = 18;

      function buildPage(cand: Row, isFirst: boolean) {
        if (!isFirst) doc.addPage();
        const report = cand.report!;
        const scores = report.risk_scores ?? {};
        const flagged = report.flagged_content ?? [];
        const risk = report.overall_risk ?? "low";
        const rc = riskColorMap[risk] ?? [16, 185, 129];
        let y = 0;
        const line = (x1: number, y1: number, x2: number, y2: number, r = 180, g = 180, b = 180) => {
          doc.setDrawColor(r, g, b); doc.setLineWidth(0.3); doc.line(x1, y1, x2, y2);
        };
        const checkY = (need: number) => { if (y + need > 275) { doc.addPage(); y = 20; } };

        doc.setFillColor(13, 17, 23); doc.rect(0, 0, W, 38, "F");
        doc.setFillColor(...rc); doc.rect(0, 35, W, 3, "F");
        doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(255, 255, 255);
        doc.text("Strapping Media", margin, 16);
        doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(100, 116, 139);
        doc.text("Media Intelligence Platform", margin, 22);
        doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(230, 237, 243);
        doc.text("MEDIA MONITORING REPORT", W - margin, 16, { align: "right" });
        doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(100, 116, 139);
        doc.text(new Date().toLocaleString("id-ID"), W - margin, 22, { align: "right" });
        doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(148, 163, 184);
        doc.text(`${targets.indexOf(cand) + 1} / ${targets.length}`, W - margin, 8, { align: "right" });
        y = 48;

        doc.setFillColor(248, 250, 252); doc.roundedRect(margin, y, W - margin * 2, 28, 3, 3, "F");
        doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.3); doc.roundedRect(margin, y, W - margin * 2, 28, 3, 3, "S");
        doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.setTextColor(15, 23, 42);
        doc.text(cand.keyword, margin + 5, y + 9);
        doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(71, 85, 105);
        doc.text(`ID: ${cand.id.slice(0, 8)}...`, margin + 5, y + 26);
        doc.setFillColor(...rc); doc.roundedRect(W - margin - 35, y + 5, 30, 12, 2, 2, "F");
        doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(255, 255, 255);
        doc.text(`RISK: ${(riskLabel[risk] ?? "").toUpperCase()}`, W - margin - 20, y + 13, { align: "center" });
        y += 36;

        // Assessment status in PDF
        if (report.assessment_status) {
          const isApp = report.assessment_status === "relevant";
          const assC: [number, number, number] = isApp ? [16, 185, 129] : [239, 68, 68];
          doc.setFillColor(isApp ? 240 : 254, isApp ? 253 : 242, isApp ? 244 : 242);
          doc.setDrawColor(...assC); doc.setLineWidth(0.4);
          doc.roundedRect(margin, y, W - margin * 2, 14, 2, 2, "FD");
          doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...assC);
          doc.text(isApp ? "KEPUTUSAN HR: APPROPRIATE" : "KEPUTUSAN HR: INAPPROPRIATE", margin + 5, y + 9);
          if (report.assessed_by_name) {
            doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(100, 116, 139);
            doc.text(`Dinilai oleh: ${report.assessed_by_name}`, W - margin, y + 9, { align: "right" });
          }
          y += 20;
        }

        doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(15, 23, 42);
        doc.text("SKOR RISIKO PER KATEGORI", margin, y);
        line(margin, y + 2, W - margin, y + 2, ...rc);
        y += 8;
        cats.forEach(cat => {
          checkY(12);
          const score = Math.round((scores[cat.key] ?? 0) as number);
          const barW = W - margin * 2 - 50;
          const fillW = (score / 100) * barW;
          const tag = score < 25 ? "AMAN" : score < 50 ? "SEDANG" : score < 75 ? "TINGGI" : "KRITIS";
          const tagC: [number, number, number] = score < 25 ? [16, 185, 129] : score < 50 ? [245, 158, 11] : [239, 68, 68];
          doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(71, 85, 105);
          doc.text(cat.label, margin, y + 4);
          doc.setFillColor(226, 232, 240); doc.roundedRect(margin + 45, y, barW, 4, 1, 1, "F");
          if (fillW > 0) { doc.setFillColor(...cat.color); doc.roundedRect(margin + 45, y, fillW, 4, 1, 1, "F"); }
          doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(...tagC);
          doc.text(`${score}%`, W - margin - 20, y + 4);
          doc.setFontSize(7); doc.text(tag, W - margin, y + 4, { align: "right" });
          y += 9;
        });
        y += 4;

        checkY(30);
        doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(15, 23, 42);
        doc.text("AI SUMMARY", margin, y);
        line(margin, y + 2, W - margin, y + 2, ...rc);
        y += 7;
        const summaryLines = doc.splitTextToSize(report.ai_summary ?? "Tidak ada ringkasan.", W - margin * 2);
        doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(71, 85, 105);
        summaryLines.forEach((l: string) => { checkY(6); doc.text(l, margin, y); y += 5; });
        y += 5;

        checkY(15);
        doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(15, 23, 42);
        doc.text(`KONTEN BERMASALAH (${flagged.length})`, margin, y);
        line(margin, y + 2, W - margin, y + 2, ...rc);
        y += 7;
        if (flagged.length === 0) {
          doc.setFillColor(240, 253, 244); doc.roundedRect(margin, y, W - margin * 2, 12, 2, 2, "F");
          doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(22, 163, 74);
          doc.text("✓  Tidak ada konten bermasalah ditemukan", margin + 5, y + 8); y += 18;
        } else {
          flagged.forEach((f: any, i: number) => {
            checkY(22);
            const sevC: [number, number, number] = f.severity === "tinggi" ? [239, 68, 68] : f.severity === "sedang" ? [245, 158, 11] : [16, 185, 129];
            doc.setFillColor(249, 250, 251); doc.roundedRect(margin, y, W - margin * 2, 18, 2, 2, "F");
            doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.25); doc.roundedRect(margin, y, W - margin * 2, 18, 2, 2, "S");
            doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(15, 23, 42);
            doc.text(`${i + 1}. [${(f.platform ?? "").toUpperCase()}] ${f.category ?? ""}`, margin + 4, y + 6);
            doc.setFillColor(...sevC); doc.roundedRect(W - margin - 22, y + 2, 18, 6, 1, 1, "F");
            doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.setTextColor(255, 255, 255);
            doc.text((f.severity ?? "").toUpperCase(), W - margin - 13, y + 6.5, { align: "center" });
            doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(71, 85, 105);
            const snippet = doc.splitTextToSize(f.content_snippet ?? "", W - margin * 2 - 10);
            snippet.slice(0, 2).forEach((l: string, li: number) => { doc.text(l, margin + 4, y + 11 + (li * 4)); });
            y += 22;
          });
        }
      }

      targets.forEach((row, idx) => buildPage(row, idx === 0));
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFillColor(248, 250, 252); doc.rect(0, 285, W, 12, "F");
        doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.3); doc.line(0, 285, W, 285);
        doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(148, 163, 184);
        doc.text("Strapping Media — Media Intelligence Platform · Dokumen Rahasia", margin, 291);
        doc.text(`Halaman ${i} dari ${pageCount}`, W - margin, 291, { align: "right" });
      }
      const riskSlug: Record<string, string> = { all: "Semua", low: "LowRisk", medium: "MedRisk", high: "HighRisk", critical: "Critical" };
      doc.save(`Strapping Media_Bulk_${riskSlug[riskFilter]}_${new Date().toISOString().slice(0, 10)}.pdf`);
    } finally { setDlLoading(false); }
  }

  const filtered = rows.filter(r => {
    const ms = r.keyword.toLowerCase().includes(search.toLowerCase());
    const mf = filter === "all" || r.report?.overall_risk === filter ||
      (filter === "processing" && (r.report?.status === "processing" || r.report?.status === "pending"));
    return ms && mf;
  });

  const cnts = {
    all:        rows.length,
    low:        rows.filter(r => r.report?.overall_risk === "low").length,
    medium:     rows.filter(r => r.report?.overall_risk === "medium").length,
    high:       rows.filter(r => r.report?.overall_risk === "high").length,
    critical:   rows.filter(r => r.report?.overall_risk === "critical").length,
    processing: rows.filter(r => r.report?.status === "processing" || r.report?.status === "pending").length,
  };

  const FILTERS = [
    { key: "all",        label: "Semua",    count: cnts.all,        dot: "" },
    { key: "low",        label: "Rendah",   count: cnts.low,        dot: "var(--success)" },
    { key: "medium",     label: "Sedang",   count: cnts.medium,     dot: "var(--warning)" },
    { key: "high",       label: "Tinggi",   count: cnts.high,       dot: "var(--danger)" },
    { key: "critical",   label: "Kritis",   count: cnts.critical,   dot: "#dc2626" },
    { key: "processing", label: "Diproses", count: cnts.processing, dot: "var(--blue)" },
  ];

  const DL_OPTIONS = [
    { key: "all",      label: "Semua Issue", count: rows.filter(r => r.report?.status === "completed").length },
    { key: "low",      label: "Risiko Rendah",  count: cnts.low },
    { key: "medium",   label: "Risiko Sedang",  count: cnts.medium },
    { key: "high",     label: "Risiko Tinggi",  count: cnts.high },
    { key: "critical", label: "Risiko Kritis",  count: cnts.critical },
  ];

  const fmt = (d: string) => new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

  // Assessment button styles
  const assessBtn = (active: boolean, type: "relevant" | "irrelevant") => ({
    display: "flex" as const, alignItems: "center" as const, gap: 4,
    padding: "5px 10px", borderRadius: 8, fontSize: 11.5, fontWeight: 600,
    cursor: "pointer", transition: "all 0.15s", border: "1px solid",
    ...(active && type === "relevant"
      ? { background: "#E1F5EE", borderColor: "#5DCAA5", color: "#0F6E56" }
      : active && type === "irrelevant"
      ? { background: "#FCEBEB", borderColor: "#F7C1C1", color: "#A32D2D" }
      : { background: "var(--bg2)", borderColor: "var(--border)", color: "var(--text3)" }
    ),
  });

  return (
    <AppLayout>
      <div style={{ minHeight: "100vh" }} onClick={() => dlOpen && setDlOpen(false)}>
        {/* Header */}
        <div style={{ background: "var(--bg2)", borderBottom: "1px solid var(--border)", padding: "24px 32px" }}>
          <div style={{ maxWidth: 1160, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
            <div>
              <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 6 }}>Database</p>
              <h1 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 30, color: "var(--text)", letterSpacing: "-0.03em" }}>Semua Issue</h1>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              {/* Download dropdown */}
              <div style={{ position: "relative" }} onClick={e => e.stopPropagation()}>
                <button onClick={() => setDlOpen(o => !o)} disabled={dlLoading} style={{
                  display: "flex", alignItems: "center", gap: 7, padding: "9px 16px",
                  borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: dlLoading ? "wait" : "pointer",
                  background: "var(--bg2)", border: "1.5px solid var(--border)", color: "var(--text2)",
                  transition: "all 0.15s", opacity: dlLoading ? 0.7 : 1,
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text2)"; }}
                >
                  {dlLoading ? <><Loader2 size={13} className="animate-spin" /> Generating…</> : <><Download size={13} /> Download PDF <ChevronDown size={11} style={{ opacity: 0.6 }} /></>}
                </button>
                {dlOpen && (
                  <div style={{
                    position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 999,
                    background: "var(--bg2)", border: "1.5px solid var(--border)",
                    borderRadius: 14, padding: "6px", minWidth: 230,
                    boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
                  }}>
                    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text4)", padding: "6px 10px 4px" }}>Export laporan</p>
                    {DL_OPTIONS.map(opt => (
                      <button key={opt.key} onClick={() => downloadBulk(opt.key)} style={{
                        width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                        gap: 10, padding: "9px 10px", borderRadius: 9,
                        background: "transparent", border: "none", cursor: "pointer",
                        color: "var(--text)", fontSize: 13, fontWeight: 500, transition: "background 0.12s",
                      }}
                        onMouseEnter={e => e.currentTarget.style.background = "var(--bg3)"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{
                            width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                            background: opt.key === "all" ? "var(--text3)" : opt.key === "low" ? "var(--success)" : opt.key === "medium" ? "var(--warning)" : opt.key === "high" ? "var(--danger)" : "#dc2626",
                          }} />
                          {opt.label}
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "var(--bg3)", color: "var(--text3)" }}>{opt.count}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Link href="/issues/bulk" className="btn btn-ghost"><FileSpreadsheet size={13} /> Bulk Upload</Link>
              <Link href="/issues/add" className="btn btn-primary"><UserPlus size={13} /> Add Issue</Link>
            </div>
          </div>
        </div>

        <div style={{ maxWidth: 1160, margin: "0 auto", padding: "24px 32px" }}>
          {/* Filter pills */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            {FILTERS.map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)} style={{
                display: "flex", alignItems: "center", gap: 6, padding: "8px 16px",
                borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: "pointer",
                transition: "all 0.15s", fontFamily: "'DM Sans',sans-serif",
                background: filter === f.key ? "var(--text)" : "var(--bg2)",
                color: filter === f.key ? "var(--bg)" : "var(--text2)",
                border: `1.5px solid ${filter === f.key ? "var(--text)" : "var(--border)"}`,
              }}>
                {f.dot && <span style={{ width: 6, height: 6, borderRadius: "50%", background: f.dot }} />}
                {f.label}
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: "1px 7px", borderRadius: 999,
                  background: filter === f.key ? "rgba(255,255,255,0.18)" : "var(--bg3)",
                  color: filter === f.key ? "inherit" : "var(--text3)",
                }}>{f.count}</span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div style={{ position: "relative", marginBottom: 20 }}>
            <Search size={14} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text3)" }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Cari keyword atau issue..."
              className="input-base" style={{ paddingLeft: 42 }} />
          </div>

          {/* Table */}
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 64 }} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "80px 0" }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: "var(--bg3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <Users size={24} style={{ color: "var(--text4)" }} />
              </div>
              <p style={{ fontWeight: 700, color: "var(--text)", fontSize: 15, marginBottom: 6, fontFamily: "'Syne',sans-serif" }}>Tidak ada issue</p>
              <p style={{ fontSize: 13, color: "var(--text3)", marginBottom: 24 }}>Coba ubah filter atau tambah issue baru</p>
              <Link href="/issues/add" className="btn btn-primary" style={{ display: "inline-flex" }}><Plus size={12} /> Tambah Issue</Link>
            </div>
          ) : (
            <div className="card" style={{ overflow: "hidden" }}>
              <div style={{ padding: "12px 22px", borderBottom: "1px solid var(--border)", background: "var(--bg3)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text3)" }}>{filtered.length} issue ditemukan</p>
                {filter !== "all" && filter !== "processing" && (
                  <button onClick={() => downloadBulk(filter)} disabled={dlLoading} style={{
                    display: "flex", alignItems: "center", gap: 5, padding: "5px 12px",
                    borderRadius: 8, fontSize: 11.5, fontWeight: 600, cursor: "pointer",
                    background: "var(--bg2)", border: "1px solid var(--border)", color: "var(--text3)", transition: "all 0.15s",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.color = "var(--accent)"; e.currentTarget.style.borderColor = "var(--accent)"; }}
                    onMouseLeave={e => { e.currentTarget.style.color = "var(--text3)"; e.currentTarget.style.borderColor = "var(--border)"; }}
                  >
                    <Download size={11} /> Download PDF risiko ini
                  </button>
                )}
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 820 }}>
                  <thead>
                    <tr style={{ background: "var(--bg3)", borderBottom: "1px solid var(--border)" }}>
                      {["Issue / Keyword", "Status", "Risiko", "Keputusan Analyst", "Tanggal", ""].map(h => (
                        <th key={h} style={{ textAlign: "left", padding: "11px 18px", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text3)", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(row => {
                      const assessed = row.report?.assessment_status;
                      const isCompleted = row.report?.status === "completed";
                      const isAssessing = assessing === row.report?.id;
                      return (
                        <tr key={row.id} style={{ borderBottom: "1px solid var(--border)", transition: "background 0.12s" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "var(--bg3)")}
                          onMouseLeave={e => (e.currentTarget.style.background = "")}>
                          <td style={{ padding: "14px 18px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,var(--accent),#009e76)", fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 13, color: "#061814" }}>
                                {row.keyword.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", margin: 0 }}>{row.keyword}</p>
                                <p style={{ fontSize: 10.5, color: "var(--text3)", fontFamily: "'JetBrains Mono',monospace", margin: 0 }}>{row.id.slice(0, 8)}…</p>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: "14px 18px" }}>
                            {!row.report
                              ? <span style={{ fontSize: 11.5, fontWeight: 600, padding: "4px 11px", borderRadius: 999, background: "var(--bg3)", color: "var(--text3)" }}>Menunggu</span>
                              : row.report.status === "completed"
                                ? <span style={{ fontSize: 11.5, fontWeight: 700, padding: "4px 11px", borderRadius: 999, background: "var(--accent-d)", color: "var(--accent)" }}>✓ Selesai</span>
                                : row.report.status === "failed"
                                  ? <span style={{ fontSize: 11.5, fontWeight: 700, padding: "4px 11px", borderRadius: 999, background: "var(--danger-d)", color: "var(--danger)" }}>✗ Gagal</span>
                                  : <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 700, padding: "4px 11px", borderRadius: 999, background: "var(--warn-d)", color: "var(--warning)" }}>
                                    <Loader2 size={9} className="animate-spin" />Proses
                                  </span>
                            }
                          </td>
                          <td style={{ padding: "14px 18px" }}>
                            {row.report?.overall_risk ? <RiskBadge level={row.report.overall_risk} /> : <span style={{ color: "var(--border2)" }}>—</span>}
                          </td>
                          {/* Keputusan HR column — only show result here, assess from detail page */}
                          <td style={{ padding: "14px 18px" }}>
                            {!isCompleted ? (
                              <span style={{ fontSize: 12, color: "var(--text4)" }}>—</span>
                            ) : isAssessing ? (
                              <Loader2 size={14} className="animate-spin" style={{ color: "var(--text3)" }} />
                            ) : !assessed ? (
                              <span style={{ fontSize: 12, color: "var(--text4)", fontStyle: "italic" }}>Belum dinilai</span>
                            ) : assessed === "relevant" ? (
                              <span style={{
                                display: "inline-flex", alignItems: "center", gap: 5,
                                fontSize: 12, fontWeight: 700, padding: "4px 12px",
                                borderRadius: 999, background: "#E1F5EE", color: "#0F6E56",
                              }}>
                                <ThumbsUp size={11} /> Relevant
                              </span>
                            ) : (
                              <span style={{
                                display: "inline-flex", alignItems: "center", gap: 5,
                                fontSize: 12, fontWeight: 700, padding: "4px 12px",
                                borderRadius: 999, background: "#FCEBEB", color: "#A32D2D",
                              }}>
                                <ThumbsDown size={11} /> Irrelevant
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "14px 18px", fontSize: 12, color: "var(--text3)", whiteSpace: "nowrap" }}>{fmt(row.created_at)}</td>
                          <td style={{ padding: "14px 18px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              <Link href={`/issues/${row.id}`} style={{ width: 30, height: 30, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text3)", textDecoration: "none", transition: "all 0.15s" }}
                                onMouseEnter={e => { e.currentTarget.style.color = "var(--accent)"; e.currentTarget.style.background = "var(--accent-d)"; }}
                                onMouseLeave={e => { e.currentTarget.style.color = "var(--text3)"; e.currentTarget.style.background = "transparent"; }}>
                                <Eye size={13} />
                              </Link>
                              <button onClick={() => del(row.id)} style={{ width: 30, height: 30, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text3)", background: "transparent", border: "none", cursor: "pointer", transition: "all 0.15s" }}
                                onMouseEnter={e => { e.currentTarget.style.color = "var(--danger)"; e.currentTarget.style.background = "var(--danger-d)"; }}
                                onMouseLeave={e => { e.currentTarget.style.color = "var(--text3)"; e.currentTarget.style.background = "transparent"; }}>
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}