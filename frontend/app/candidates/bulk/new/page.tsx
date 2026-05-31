"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { addBulkSession } from "../page";
import AppLayout from "@/components/AppLayout";
import { api } from "@/lib/api";
import { Upload, Download, FileSpreadsheet, CheckCircle, AlertCircle, Loader2, X, Zap, Shield, Globe, Camera, MessageCircle, Link2, Newspaper, Search, ArrowRight } from "lucide-react";

interface BulkRow { full_name:string; email:string; phone:string; instagram_url:string; twitter_url:string; facebook_url:string; linkedin_url:string; }

const PLATFORMS = [
  { icon:Camera,        label:"Instagram",  color:"#e1306c", bg:"rgba(225,48,108,0.10)" },
  { icon:MessageCircle, label:"Twitter/X",  color:"#1d9bf0", bg:"rgba(29,155,240,0.10)" },
  { icon:Globe,         label:"Facebook",   color:"#1877f2", bg:"rgba(24,119,242,0.10)" },
  { icon:Link2,         label:"LinkedIn",   color:"#0077b5", bg:"rgba(0,119,181,0.10)"  },
  { icon:Search,        label:"Google",     color:"#34a853", bg:"rgba(52,168,83,0.10)"  },
  { icon:Newspaper,     label:"Berita",     color:"#64748b", bg:"rgba(100,116,139,0.10)"},
];

const TMPL_HEADS = ["Full Name","Email","Phone","Instagram","Twitter/X","Facebook","LinkedIn"];
const TMPL_ROWS  = [
  ["John Doe",   "john@email.com",  "+62 812 0000", "instagram.com/john", "x.com/john",  "facebook.com/john",  "linkedin.com/in/john"],
  ["Jane Smith", "jane@email.com",  "+62 813 0001", "instagram.com/jane", "tidak ada",   "facebook.com/jane",  "linkedin.com/in/jane"],
  ["Budi S.",    "budi@email.com",  "+62 857 0002", "instagram.com/budi", "x.com/budi",  "facebook.com/budi",  "linkedin.com/in/budi"],
];

export default function BulkPage() {
  const router = useRouter();
  const [file, setFile]       = useState<File|null>(null);
  const [preview, setPreview] = useState<BulkRow[]>([]);
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(false);
  const [consent, setConsent] = useState(false);
  const [drag, setDrag]       = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(f:File) {
    setFile(f); setError(""); setPreview([]);
    try {
      const XLSX = await import("xlsx");
      const buf  = await f.arrayBuffer();
      const wb   = XLSX.read(buf);
      const ws   = wb.Sheets[wb.SheetNames[0]];
      const raw  = XLSX.utils.sheet_to_json<Record<string,string>>(ws);
      if (raw.length===0) { setError("File kosong atau format tidak sesuai."); return; }
      const rows = raw.map(normalizeRow);
      setPreview(rows.slice(0,5));
    } catch { setError("Gagal membaca file. Pastikan format sesuai template."); }
  }

  /** Normalize berbagai format header CSV → BulkRow */
  function normalizeRow(r: Record<string,string>): BulkRow {
    const g = (...keys:string[]) => {
      for (const k of keys) {
        const found = Object.keys(r).find(h => h.toLowerCase().replace(/[^a-z0-9]/g,"") === k.toLowerCase().replace(/[^a-z0-9]/g,""));
        if (found && r[found]) return r[found];
      }
      return "";
    };
    return {
      full_name:     g("full_name","nama","name","fullname","nama_lengkap"),
      email:         g("email","e_mail","emailaddress"),
      phone:         g("phone","hp","no_hp","telepon","telp","nohp","phonenumber","no_telepon"),
      instagram_url: g("instagram_url","instagram","ig","instagram_url"),
      twitter_url:   g("twitter_url","twitter","x","twitter_x"),
      facebook_url:  g("facebook_url","facebook","fb"),
      linkedin_url:  g("linkedin_url","linkedin","li"),
    };
  }

  function downloadTemplate() {
    const csv = ["full_name,email,phone,instagram_url,twitter_url,facebook_url,linkedin_url",
      "John Doe,john@email.com,+62 812 0000 0000,https://instagram.com/johndoe,https://x.com/johndoe,https://facebook.com/johndoe,https://linkedin.com/in/johndoe",
      "Jane Smith,jane@email.com,+62 813 0001 0001,https://instagram.com/janesmith,tidak ada,https://facebook.com/janesmith,https://linkedin.com/in/janesmith",
    ].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
    a.download = "template_hr_screening.csv"; a.click();
  }

  async function startBulk() {
    if (!file||!consent) return;
    setLoading(true);
    try {
      const XLSX = await import("xlsx");
      const buf  = await file.arrayBuffer();
      const wb   = XLSX.read(buf);
      const ws   = wb.Sheets[wb.SheetNames[0]];
      const raw  = XLSX.utils.sheet_to_json<Record<string,string>>(ws);
      const rows = raw.map(normalizeRow).filter(r => r.full_name && r.email);
      if (rows.length === 0) { setError("Tidak ada data valid. Pastikan kolom Nama dan Email terisi."); setLoading(false); return; }

      let successCount = 0;
      let failCount = 0;
      for (const row of rows) {
        try {
          await api.createCandidate({ ...row, consent_given: true });
          successCount++;
        } catch { failCount++; }
      }
      // Save to history
      addBulkSession({
        fileName: file?.name ?? "upload.xlsx",
        totalCandidates: rows.length,
        completed: successCount,
        failed: failCount,
        status: failCount === rows.length ? "failed" : successCount < rows.length ? "partial" : "completed",
        riskSummary: { low: 0, medium: 0, high: 0, critical: 0 },
      });
      setDone(true);
    } catch { setError("Terjadi kesalahan saat upload."); }
    finally { setLoading(false); }
  }

  if (done) return (
    <AppLayout>
      <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"var(--bg)" }}>
        <div className="card scale-in" style={{ padding:"52px 60px", textAlign:"center", maxWidth:420 }}>
          <div style={{ width:64, height:64, borderRadius:20, background:"var(--accent-d)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px" }}>
            <CheckCircle size={30} style={{ color:"var(--accent)" }} />
          </div>
          <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:26, color:"var(--text)", marginBottom:10 }}>Screening Dimulai!</h2>
          <p style={{ fontSize:13.5, color:"var(--text3)", lineHeight:1.65, marginBottom:28 }}>Semua kandidat sedang diproses oleh AI. Pantau progress di halaman Kandidat.</p>
          <a href="/candidates" className="btn btn-primary" style={{ display:"flex", justifyContent:"center" }}>
            Lihat Kandidat <ArrowRight size={14} />
          </a>
        </div>
      </div>
    </AppLayout>
  );

  return (
    <AppLayout>
      <div style={{ minHeight:"100vh" }}>
        {/* Hero */}
        <div style={{ background:"var(--sidebar)", borderBottom:"1px solid rgba(255,255,255,0.05)", padding:"40px 32px", position:"relative", overflow:"hidden" }}>
          <div style={{ position:"absolute", top:-50, right:-50, width:260, height:260, borderRadius:"50%", background:"rgba(0,200,150,0.05)", pointerEvents:"none" }} />
          <div style={{ position:"absolute", bottom:-30, right:200, width:160, height:160, borderRadius:"50%", background:"rgba(59,130,246,0.04)", pointerEvents:"none" }} />
          <div style={{ maxWidth:960, margin:"0 auto", position:"relative" }}>
            <div style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"5px 12px", borderRadius:999, background:"rgba(0,200,150,0.1)", border:"1px solid rgba(0,200,150,0.18)", marginBottom:18 }}>
              <Zap size={9} style={{ color:"var(--accent)" }} />
              <span style={{ fontSize:10, fontWeight:700, letterSpacing:"0.15em", textTransform:"uppercase", color:"var(--accent)" }}>Bulk Screening System</span>
            </div>
            <h1 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:36, color:"#fff", letterSpacing:"-0.03em", marginBottom:10, lineHeight:1.1 }}>Upload Kandidat Massal</h1>
            <p style={{ color:"#475569", fontSize:14, maxWidth:500, lineHeight:1.65, marginBottom:28 }}>Upload file CSV atau Excel untuk screening banyak kandidat sekaligus menggunakan AI background checking.</p>
            <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:32 }}>
              <button onClick={downloadTemplate} className="btn btn-primary"><Download size={13} /> Download Template</button>
              <button onClick={()=>inputRef.current?.click()} style={{
                display:"inline-flex", alignItems:"center", gap:8, padding:"11px 22px", borderRadius:12,
                background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.10)",
                color:"#cbd5e1", fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:13, cursor:"pointer",
                transition:"all 0.15s",
              }}
                onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,0.11)";}}
                onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.07)";}}>
                <Upload size={13} /> Upload Sekarang
              </button>
            </div>
            <div style={{ display:"flex", gap:36 }}>
              {[{v:"6+",l:"Platform"},{v:"AI",l:"Powered"},{v:"100+",l:"Batch / Upload"},{v:"CSV",l:"& XLSX"}].map(s=>(
                <div key={s.l}>
                  <p style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:22, color:"var(--accent)", lineHeight:1 }}>{s.v}</p>
                  <p style={{ fontSize:11, color:"#475569", fontWeight:500, marginTop:4 }}>{s.l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ maxWidth:960, margin:"0 auto", padding:"28px 32px", display:"grid", gridTemplateColumns:"1fr 280px", gap:24 }}>
          <div style={{ display:"flex", flexDirection:"column", gap:20 }}>

            {/* Template Preview — Spreadsheet Style */}
            <div className="card fade-up" style={{ overflow:"hidden" }}>
              <div style={{ padding:"20px 24px", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ width:34, height:34, borderRadius:10, background:"var(--accent-d)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <FileSpreadsheet size={15} style={{ color:"var(--accent)" }} />
                  </div>
                  <div>
                    <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:15, color:"var(--text)" }}>Download Template</h2>
                    <p style={{ fontSize:11.5, color:"var(--text3)", marginTop:2 }}>Gunakan template berikut untuk upload kandidat</p>
                  </div>
                </div>
                <button onClick={downloadTemplate} className="btn btn-primary" style={{ padding:"9px 18px" }}>
                  <Download size={12} /> Download CSV
                </button>
              </div>
              <p style={{ padding:"10px 24px", fontSize:12, color:"var(--text3)", borderBottom:"1px solid var(--border)", background:"var(--bg3)" }}>
                Tulis <code style={{ padding:"1px 6px", borderRadius:5, background:"var(--bg4)", border:"1px solid var(--border)", fontFamily:"'JetBrains Mono',monospace", fontSize:11 }}>tidak ada</code> untuk platform yang tidak dimiliki kandidat.
              </p>
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12.5 }}>
                  <thead>
                    <tr style={{ background:"linear-gradient(to right, rgba(0,200,150,0.06), rgba(59,130,246,0.05))" }}>
                      <th style={{ padding:"8px 12px", textAlign:"center", fontSize:10.5, fontWeight:700, color:"var(--text4)", borderRight:"1px solid var(--border)", borderBottom:"2px solid var(--border)", width:30 }}>#</th>
                      {TMPL_HEADS.map((h,i)=>(
                        <th key={h} style={{ padding:"10px 14px", textAlign:"left", fontWeight:700, fontSize:11, color:"var(--accent)", letterSpacing:"0.04em", borderRight:i<TMPL_HEADS.length-1?"1px solid var(--border)":"none", borderBottom:"2px solid rgba(0,200,150,0.15)", whiteSpace:"nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {TMPL_ROWS.map((row,ri)=>(
                      <tr key={ri} style={{ borderBottom:ri<TMPL_ROWS.length-1?"1px solid var(--border)":"none", background:ri%2===1?"var(--bg3)":"transparent" }}>
                        <td style={{ padding:"10px 12px", textAlign:"center", fontSize:10, fontWeight:700, color:"var(--text4)", borderRight:"1px solid var(--border)" }}>{ri+1}</td>
                        {row.map((cell,ci)=>(
                          <td key={ci} style={{
                            padding:"10px 14px", borderRight:ci<row.length-1?"1px solid var(--border)":"none",
                            whiteSpace:"nowrap",
                            color: cell==="tidak ada" ? "var(--text4)" : ci===0 ? "var(--text)" : ci===1 ? "var(--blue)" : "var(--text2)",
                            fontWeight: ci===0 ? 600 : 400,
                            fontFamily: ci>=3 ? "'JetBrains Mono',monospace" : "inherit",
                            fontSize: ci>=3 ? 11.5 : 13,
                            fontStyle: cell==="tidak ada" ? "italic" : "normal",
                          }}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Upload Zone */}
            <div className="card fade-up d2" style={{ padding:"24px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
                <div style={{ width:34, height:34, borderRadius:10, background:"var(--blue-d)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <Upload size={15} style={{ color:"var(--blue)" }} />
                </div>
                <div>
                  <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:15, color:"var(--text)" }}>Upload File Kandidat</h2>
                  <p style={{ fontSize:11.5, color:"var(--text3)", marginTop:2 }}>Upload file Excel atau CSV yang sudah diisi.</p>
                </div>
              </div>

              <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" style={{ display:"none" }}
                onChange={e=>e.target.files?.[0]&&handleFile(e.target.files[0])} />

              {!file ? (
                <div onClick={()=>inputRef.current?.click()}
                  onDragOver={e=>{e.preventDefault();setDrag(true);}}
                  onDragLeave={()=>setDrag(false)}
                  onDrop={e=>{e.preventDefault();setDrag(false);e.dataTransfer.files[0]&&handleFile(e.dataTransfer.files[0]);}}
                  style={{
                    borderRadius:16, padding:"44px 24px", textAlign:"center", cursor:"pointer",
                    transition:"all 0.2s",
                    border:`2px dashed ${drag?"var(--accent)":"var(--border)"}`,
                    background: drag?"var(--accent-d)":"var(--bg3)",
                  }}>
                  <div style={{ width:56, height:56, borderRadius:16, margin:"0 auto 18px", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.2s", background:drag?"var(--accent-d)":"var(--bg4)" }}>
                    <Upload size={24} style={{ color:drag?"var(--accent)":"var(--text3)" }} />
                  </div>
                  <p style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:17, color:"var(--text)", marginBottom:6 }}>Drag & Drop File</p>
                  <p style={{ fontSize:13, color:"var(--text3)", marginBottom:18 }}>Mendukung .csv, .xlsx, dan .xls</p>
                  <button className="btn btn-ghost" style={{ display:"inline-flex" }}>Pilih File</button>
                </div>
              ) : (
                <div>
                  <div style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 16px", borderRadius:12, marginBottom:16, background:"var(--accent-d)", border:"1px solid rgba(0,200,150,0.2)" }}>
                    <FileSpreadsheet size={18} style={{ color:"var(--accent)", flexShrink:0 }} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:13.5, fontWeight:600, color:"var(--text)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{file.name}</p>
                      <p style={{ fontSize:11, color:"var(--text3)", marginTop:2 }}>{(file.size/1024).toFixed(1)} KB · {preview.length} baris</p>
                    </div>
                    <button onClick={()=>{setFile(null);setPreview([]);}} style={{ color:"var(--text3)", background:"none", border:"none", cursor:"pointer", padding:4, borderRadius:6 }}><X size={14} /></button>
                  </div>

                  {preview.length>0 && (
                    <div style={{ borderRadius:12, overflow:"hidden", marginBottom:16, border:"1px solid var(--border)" }}>
                      <p style={{ padding:"8px 14px", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em", background:"var(--bg3)", color:"var(--text3)", borderBottom:"1px solid var(--border)" }}>Preview · {preview.length} baris pertama</p>
                      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12.5 }}>
                        <thead>
                          <tr style={{ borderBottom:"1px solid var(--border)", background:"var(--bg3)" }}>
                            {["Nama","Email","HP"].map(h=>(
                              <th key={h} style={{ textAlign:"left", padding:"8px 14px", fontWeight:700, fontSize:10.5, color:"var(--text3)", textTransform:"uppercase", letterSpacing:"0.06em" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {preview.map((r,i)=>(
                            <tr key={i} style={{ borderBottom:i<preview.length-1?"1px solid var(--border)":"none" }}>
                              <td style={{ padding:"10px 14px", fontWeight:600, color:"var(--text)" }}>{r.full_name}</td>
                              <td style={{ padding:"10px 14px", color:"var(--blue)" }}>{r.email}</td>
                              <td style={{ padding:"10px 14px", color:"var(--text2)" }}>{r.phone}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div onClick={()=>setConsent(c=>!c)} style={{
                    padding:"14px 16px", borderRadius:12, marginBottom:16, cursor:"pointer", transition:"all 0.15s",
                    background: consent?"var(--accent-d)":"var(--bg3)",
                    border:`1.5px solid ${consent?"rgba(0,200,150,0.3)":"var(--border)"}`,
                  }}>
                    <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
                      <div style={{ width:20, height:20, borderRadius:6, flexShrink:0, marginTop:1, display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.15s", background:consent?"var(--accent)":"transparent", border:`2px solid ${consent?"var(--accent)":"var(--border2)"}` }}>
                        {consent&&<span style={{ color:"#061814", fontSize:11, fontWeight:900 }}>✓</span>}
                      </div>
                      <p style={{ fontSize:12.5, color:"var(--text2)", lineHeight:1.5 }}>
                        <strong style={{ color:"var(--text)" }}>Consent</strong> — Semua kandidat telah memberikan persetujuan sesuai <strong style={{ color:"var(--accent)" }}>UU PDP Indonesia</strong>.
                      </p>
                    </div>
                  </div>

                  {error && <div style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 14px", borderRadius:10, marginBottom:14, background:"var(--danger-d)", border:"1px solid rgba(239,68,68,0.2)", color:"var(--danger)", fontSize:12.5 }}><AlertCircle size={13}/>{error}</div>}

                  <button onClick={startBulk} disabled={loading||!consent} className="btn btn-primary"
                    style={{ width:"100%", justifyContent:"center", fontSize:14, padding:"13px 20px" }}>
                    {loading ? <><Loader2 size={14} className="animate-spin"/>Memproses...</> : <><Zap size={14}/>Mulai Bulk Screening</>}
                  </button>
                </div>
              )}

              {error&&!file&&<div style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 14px", borderRadius:10, marginTop:12, background:"var(--danger-d)", border:"1px solid rgba(239,68,68,0.2)", color:"var(--danger)", fontSize:12.5 }}><AlertCircle size={13}/>{error}</div>}
            </div>
          </div>

          {/* Right sidebar */}
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div className="card fade-up d3" style={{ padding:20 }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <Shield size={13} style={{ color:"var(--accent)" }} />
                  <h3 style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:14, color:"var(--text)" }}>AI Screening</h3>
                </div>
                <span style={{ fontSize:9.5, fontWeight:700, padding:"3px 8px", borderRadius:999, background:"var(--accent-d)", color:"var(--accent)" }}>Platform dicek</span>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {PLATFORMS.map(p=>(
                  <div key={p.label} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:10, border:"1px solid var(--border)", transition:"all 0.15s" }}
                    onMouseEnter={e=>{ e.currentTarget.style.borderColor=p.color+"44"; e.currentTarget.style.background=p.bg; }}
                    onMouseLeave={e=>{ e.currentTarget.style.borderColor="var(--border)"; e.currentTarget.style.background="transparent"; }}>
                    <div style={{ width:28, height:28, borderRadius:8, background:p.bg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <p.icon size={12} style={{ color:p.color }} />
                    </div>
                    <div style={{ flex:1 }}>
                      <p style={{ fontSize:12.5, fontWeight:600, color:"var(--text)" }}>{p.label}</p>
                      <p style={{ fontSize:10.5, color:"var(--text3)" }}>AI automated analysis</p>
                    </div>
                    <div style={{ width:6, height:6, borderRadius:"50%", background:"var(--accent)" }} />
                  </div>
                ))}
              </div>
            </div>

            <div className="card fade-up d4" style={{ padding:20, background:"var(--sidebar)", border:"1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:10 }}>
                <Zap size={11} style={{ color:"var(--accent)" }} />
                <p style={{ fontSize:9.5, fontWeight:700, letterSpacing:"0.14em", textTransform:"uppercase", color:"var(--accent)" }}>AI Insight</p>
              </div>
              <h3 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:18, color:"#fff", marginBottom:8 }}>Smart Detection</h3>
              <p style={{ fontSize:12.5, color:"#475569", lineHeight:1.65 }}>AI mendeteksi toxic language, fraud, hate speech, explicit content, dan professional risk dari semua platform publik secara otomatis.</p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}