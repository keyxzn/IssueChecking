"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import RiskBadge from "@/components/RiskBadge";
import { api, Candidate, ScreeningReport } from "@/lib/api";
import {
  Users, ShieldAlert, TrendingUp, Plus, ArrowRight,
  Clock, CheckCircle, Loader2, Activity, Shield, UserCheck,
  AlertTriangle, Zap, BarChart2
} from "lucide-react";

type Row = Candidate & { report?: ScreeningReport };

const DUMMY_ROWS: Row[] = [
  {
    id: 1,
    full_name: "Budi Santoso",
    email: "budi@gmail.com",
    created_at: "2026-05-10T10:00:00",
    report: {
      status: "completed",
      overall_risk: "low",
      risk_scores: {
        professional_risk: 12,
        toxic_language: 5,
        hate_speech: 2,
        explicit_content: 4,
        violence: 3,
        extremism: 1,
      }
    }
  },
  {
    id: 2,
    full_name: "Karina Putri",
    email: "karina@gmail.com",
    created_at: "2026-05-12T10:00:00",
    report: {
      status: "completed",
      overall_risk: "high",
      risk_scores: {
        professional_risk: 75,
        toxic_language: 62,
        hate_speech: 40,
        explicit_content: 15,
        violence: 33,
        extremism: 20,
      }
    }
  },
  {
    id: 3,
    full_name: "Raka Wijaya",
    email: "raka@gmail.com",
    created_at: "2026-05-14T10:00:00",
    report: {
      status: "processing",
      overall_risk: "medium",
      risk_scores: {
        professional_risk: 40,
        toxic_language: 30,
        hate_speech: 15,
        explicit_content: 10,
        violence: 20,
        extremism: 5,
      }
    }
  }
];

const RISK_CATS = [
  { label:"Fraud / Scam",    key:"professional_risk", color:"#ef4444", track:"rgba(239,68,68,0.12)" },
  { label:"Toxic Language",  key:"toxic_language",    color:"#f97316", track:"rgba(249,115,22,0.12)" },
  { label:"Hate Speech",     key:"hate_speech",       color:"#eab308", track:"rgba(234,179,8,0.12)"  },
  { label:"Explicit Content",key:"explicit_content",  color:"#a855f7", track:"rgba(168,85,247,0.12)" },
  { label:"Violence",        key:"violence",          color:"#dc2626", track:"rgba(220,38,38,0.12)"  },
  { label:"Extremism",       key:"extremism",         color:"#64748b", track:"rgba(100,116,139,0.12)" },
];

function DonutChart({ data, total }: { data: Record<string,number>; total: number }) {
  const segs = [
    { label:"Rendah", val:data.low||0,      color:"var(--accent)" },
    { label:"Sedang", val:data.medium||0,   color:"var(--warning)" },
    { label:"Tinggi", val:data.high||0,     color:"var(--danger)" },
    { label:"Kritis", val:data.critical||0, color:"#7f1d1d" },
  ];
  const tot = segs.reduce((s,x)=>s+x.val,0)||1;
  const r=15.9155, circ=2*Math.PI*r;
  let offset=0;
  const arcs = segs.map(s=>{
    const pct=s.val/tot, dash=pct*circ, gap=circ-dash;
    const el=<circle key={s.label} cx="21" cy="21" r={r} fill="none" stroke={s.color}
      strokeWidth="5.5" strokeDasharray={`${dash} ${gap}`}
      strokeDashoffset={-offset*circ+circ*0.25} strokeLinecap="round"
      style={{ transition:"stroke-dasharray 0.9s ease" }} />;
    offset+=pct; return el;
  });
  return (
    <div style={{ display:"flex", alignItems:"center", gap:28 }}>
      <div style={{ position:"relative", width:120, height:120, flexShrink:0 }}>
        <svg viewBox="0 0 42 42" style={{ width:"100%", height:"100%", transform:"rotate(-90deg)" }}>
          <circle cx="21" cy="21" r={r} fill="none" stroke="var(--border)" strokeWidth="5.5" />
          {arcs}
        </svg>
        <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
          <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:26, color:"var(--text)", lineHeight:1 }}>{tot}</span>
          <span style={{ fontSize:9, fontWeight:700, color:"var(--text3)", letterSpacing:"0.14em", textTransform:"uppercase", marginTop:3 }}>total</span>
        </div>
      </div>
      <div style={{ flex:1, display:"flex", flexDirection:"column", gap:12 }}>
        {segs.map(s=>(
          <div key={s.label} style={{ display:"flex", alignItems:"center", gap:9 }}>
            <div style={{ width:7, height:7, borderRadius:"50%", background:s.color, flexShrink:0 }} />
            <span style={{ fontSize:12.5, color:"var(--text2)", flex:1, fontWeight:500 }}>{s.label}</span>
            <div style={{ width:60, height:5, borderRadius:999, overflow:"hidden", background:"var(--bg3)" }}>
              <div style={{ height:"100%", width:`${(s.val/tot)*100}%`, background:s.color, borderRadius:999, transition:"width 0.9s ease" }} />
            </div>
            <span style={{ fontSize:13, fontWeight:800, width:18, textAlign:"right", color:"var(--text)", fontFamily:"'Syne',sans-serif" }}>{s.val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [rows, setRows]     = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    (async()=>{
      try {
        const c = await api.listCandidates();
        const w = await Promise.all(c.map(async x=>{ try { return {...x,report:await api.getReport(x.id)} } catch { return x } }));
        setRows(w.length ? w : DUMMY_ROWS);
      } finally { setLoading(false); }
    })();
  },[]);

  const total     = rows.length;
  const completed = rows.filter(r=>r.report?.status==="completed").length;
  const processing= rows.filter(r=>r.report?.status==="processing"||r.report?.status==="pending").length;
  const risk = {
    low:      rows.filter(r=>r.report?.overall_risk==="low").length,
    medium:   rows.filter(r=>r.report?.overall_risk==="medium").length,
    high:     rows.filter(r=>r.report?.overall_risk==="high").length,
    critical: rows.filter(r=>r.report?.overall_risk==="critical").length,
  };
  const highPct = total>0 ? Math.round(((risk.high+risk.critical)/total)*100) : 0;
  const recent  = [...rows].sort((a,b)=>new Date(b.created_at).getTime()-new Date(a.created_at).getTime()).slice(0,5);

  const highRiskCandidates = rows.filter(
    r =>
      r.report?.overall_risk === "high" ||
      r.report?.overall_risk === "critical"
  );

  const mediumRiskCandidates = rows.filter(
    r => r.report?.overall_risk === "medium"
  );

  const goodCandidates = rows.filter(
    r => r.report?.overall_risk === "low"
  );

  const CARDS = [
    { label:"Total Kandidat", val:total,                     sub:`${processing} diproses`,  icon:Users,      style:{ background:"var(--bg2)", border:"1px solid var(--border)" }, iStyle:{ background:"var(--bg3)", color:"var(--text3)" }, vColor:"var(--text)", href:"/candidates" },
    { label:"Selesai",        val:completed,                 sub:"screening selesai",        icon:UserCheck,  style:{ background:"linear-gradient(135deg,#00c896 0%,#009e76 100%)", border:"none", boxShadow:"0 4px 18px rgba(0,0,0,0.08)" }, iStyle:{ background:"rgba(255,255,255,0.2)", color:"#fff" }, vColor:"#fff", href:"/candidates?status=completed" },
    { label:"High / Kritis",  val:risk.high+risk.critical,   sub:`${highPct}% dari total`,  icon:ShieldAlert, style:{ background:"linear-gradient(135deg,#ef4444 0%,#b91c1c 100%)", border:"none", boxShadow:"0 4px 18px rgba(0,0,0,0.08)" }, iStyle:{ background:"rgba(255,255,255,0.2)", color:"#fff" }, vColor:"#fff", href:"/candidates?risk=high" },
    { label:"Low Risk",       val:risk.low,                  sub:"aman dilanjutkan",         icon:TrendingUp,  style:{ background:"linear-gradient(135deg,#3b82f6 0%,#1d4ed8 100%)", border:"none", boxShadow:"0 4px 18px rgba(0,0,0,0.08)" }, iStyle:{ background:"rgba(255,255,255,0.2)", color:"#fff" }, vColor:"#fff", href:"/candidates?risk=low" },
  ];

  const fmt = (d:string) => new Date(d).toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric"});

  return (
    <AppLayout>
      <div style={{ padding:"36px 32px", maxWidth:1280, margin:"0 auto" }}>

        {/* Page Header */}
        <div className="fade-up" style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:36, flexWrap:"wrap", gap:16 }}>
          <div>
            <p style={{ fontFamily:"'Syne',sans-serif", fontSize:10, fontWeight:700, letterSpacing:"0.18em", textTransform:"uppercase", color:"var(--accent)", marginBottom:8 }}>Overview</p>
            <h1 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:34, color:"var(--text)", letterSpacing:"-0.03em", lineHeight:1.05 }}>Dashboard</h1>
            <p style={{ fontSize:13.5, color:"var(--text3)", marginTop:8 }}>Pantau aktivitas HR screening kandidat secara real-time</p>
          </div>
          <Link href="/candidates/add" className="btn btn-primary fade-up d2">
            <Plus size={14} /> Screening Baru
          </Link>
        </div>

        {loading ? (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:28 }}>
            {[1,2,3,4].map(i=><div key={i} className="skeleton" style={{ height:130, borderRadius:20 }} />)}
          </div>
        ) : (<>

        {/* Stat Cards */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:24 }}>
          {CARDS.map((c,i)=>(
            <Link key={c.label} href={c.href} style={{ textDecoration:"none" }}>
              <div className={`fade-up d${i+1}`} style={{
                ...c.style as any, borderRadius:16, padding:"16px",
                position:"relative", overflow:"hidden", cursor:"pointer",
                transition:"transform 0.15s, box-shadow 0.15s",
              }}
                onMouseEnter={e=>{(e.currentTarget as HTMLDivElement).style.transform="translateY(-2px)";(e.currentTarget as HTMLDivElement).style.boxShadow="0 8px 24px rgba(0,0,0,0.15)"}}
                onMouseLeave={e=>{(e.currentTarget as HTMLDivElement).style.transform="";(e.currentTarget as HTMLDivElement).style.boxShadow=""}}
              >
                {i > 0 && <>
                  <div style={{ position:"absolute", right:-15, top:-15, width:70, height:70, borderRadius:"50%", background:"rgba(255,255,255,0.07)" }} />
                  <div style={{ position:"absolute", right:5, top:5, width:40, height:40, borderRadius:"50%", background:"rgba(255,255,255,0.05)" }} />
                </>}
                <div style={{ position:"relative" }}>
                  <div style={{ width:30, height:30, borderRadius:9, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:12, ...c.iStyle as any }}>
                    <c.icon size={13} />
                  </div>
                  <p style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:24, color:c.vColor, lineHeight:1 }}>{c.val}</p>
                  <p style={{ fontSize:12, fontWeight:600, color:i===0?"var(--text)":"rgba(255,255,255,0.9)", marginTop:6 }}>{c.label}</p>
                  <p style={{ fontSize:10.5, color:i===0?"var(--text3)":"rgba(255,255,255,0.45)", marginTop:1 }}>{c.sub}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Charts Row */}
        <div style={{ display:"grid", gridTemplateColumns:"2fr 3fr", gap:20, marginBottom:20 }}>

          {/* Donut */}
          <div className="card fade-up d1" style={{ padding:"26px 24px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:24 }}>
              <div style={{ width:30, height:30, borderRadius:9, background:"var(--accent-d)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Shield size={13} style={{ color:"var(--accent)" }} />
              </div>
              <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:15, color:"var(--text)" }}>Distribusi Risiko</h2>
            </div>
            {total===0
              ? <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"36px 0", gap:8 }}>
                  <div style={{ width:48, height:48, borderRadius:14, background:"var(--bg3)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <Shield size={20} style={{ color:"var(--text4)" }} />
                  </div>
                  <p style={{ fontSize:12.5, color:"var(--text3)", fontWeight:500 }}>Belum ada data</p>
                  <Link href="/candidates/add" style={{ fontSize:12, color:"var(--accent)", fontWeight:600 }}>Mulai screening →</Link>
                </div>
              : <DonutChart data={risk} total={total} />
            }
          </div>

          {/* Bar chart */}
          <div className="card fade-up d2" style={{ padding:"26px 24px" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:30, height:30, borderRadius:9, background:"var(--blue-d)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <BarChart2 size={13} style={{ color:"var(--blue)" }} />
                </div>
                <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:15, color:"var(--text)" }}>Rata-rata Skor per Kategori</h2>
              </div>
              {completed>0 && <span style={{ fontSize:11, color:"var(--text3)", fontWeight:500 }}>{completed} kandidat</span>}
            </div>
            {completed===0
              ? <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"36px 0", gap:8 }}>
                  <div style={{ width:48, height:48, borderRadius:14, background:"var(--bg3)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <Activity size={20} style={{ color:"var(--text4)" }} />
                  </div>
                  <p style={{ fontSize:12.5, color:"var(--text3)", fontWeight:500 }}>Belum ada screening selesai</p>
                </div>
              : <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
                  {RISK_CATS.map(cat=>{
                    const scores = rows.filter(r=>r.report?.risk_scores).map(r=>(r.report!.risk_scores as any)[cat.key]??0);
                    const avg = scores.length>0 ? Math.round(scores.reduce((a:number,b:number)=>a+b,0)/scores.length) : 0;
                    const tag = avg<25?"AMAN":avg<50?"SEDANG":"TINGGI";
                    const tagColor = avg<25?"var(--success)":avg<50?"var(--warning)":"var(--danger)";
                    const tagBg    = avg<25?"var(--succ-d)":avg<50?"var(--warn-d)":"var(--danger-d)";
                    return (
                      <div key={cat.key}>
                        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:7 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                            <div style={{ width:7, height:7, borderRadius:"50%", background:cat.color, flexShrink:0 }} />
                            <span style={{ fontSize:13, color:"var(--text2)", fontWeight:500 }}>{cat.label}</span>
                          </div>
                          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                            <span style={{ fontFamily:"'Syne',sans-serif", fontSize:13, fontWeight:700, color:"var(--text)" }}>{avg}%</span>
                            <span style={{ fontSize:9.5, fontWeight:700, padding:"2px 7px", borderRadius:999, background:tagBg, color:tagColor, letterSpacing:"0.05em" }}>{tag}</span>
                          </div>
                        </div>
                        <div style={{ height:7, borderRadius:999, overflow:"hidden", background:cat.track }}>
                          <div style={{ height:"100%", width:`${avg}%`, background:cat.color, borderRadius:999, transition:"width 1.1s cubic-bezier(0.22,1,0.36,1)" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
            }
          </div>
        </div>

        {/* Alert Banner */}
        {(risk.high+risk.critical)>0 && (
          <div className="fade-up" style={{
            display:"flex", alignItems:"center", gap:16,
            padding:"18px 24px", borderRadius:16, marginBottom:20,
            background:"var(--danger-d)", border:"1px solid rgba(239,68,68,0.18)",
          }}>
            <div style={{ width:42, height:42, borderRadius:12, flexShrink:0, background:"rgba(239,68,68,0.14)", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <AlertTriangle size={18} style={{ color:"var(--danger)" }} />
            </div>
            <div style={{ flex:1 }}>
              <p style={{ fontSize:13.5, fontWeight:700, color:"var(--danger)", fontFamily:"'Syne',sans-serif" }}>
                {risk.high+risk.critical} kandidat memerlukan perhatian segera
              </p>
              <p style={{ fontSize:12, color:"var(--text3)", marginTop:2 }}>Tinjau hasil screening sebelum melanjutkan proses rekrutmen.</p>
            </div>
            <Link href="/candidates" style={{ display:"flex", alignItems:"center", gap:5, fontSize:12.5, fontWeight:700, color:"var(--danger)", textDecoration:"none", flexShrink:0, opacity:0.85 }}
              onMouseEnter={e=>(e.currentTarget.style.opacity="1")}
              onMouseLeave={e=>(e.currentTarget.style.opacity="0.85")}>
              Tinjau <ArrowRight size={12} />
            </Link>
          </div>
        )}

        {/* Candidate Insights */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 20,
            marginBottom: 24,
          }}
        >
          {/* High Risk */}
          <div className="card fade-up d2" style={{ padding: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(239,68,68,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <AlertTriangle size={16} style={{ color: "#ef4444" }} />
              </div>
              <div>
                <h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: 15, fontWeight: 700, color: "var(--text)" }}>Kandidat Risiko Tinggi</h3>
                <p style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>Kandidat yang perlu perhatian HR</p>
              </div>
            </div>
            {highRiskCandidates.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--text3)" }}>Tidak ada kandidat bermasalah</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {highRiskCandidates.map((row) => (
                  <div key={row.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderRadius: 14, background: "var(--bg3)" }}>
                    <div>
                      <p style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text)" }}>{row.full_name}</p>
                      <p style={{ fontSize: 11.5, color: "var(--text3)", marginTop: 2 }}>{row.email}</p>
                    </div>
                    <RiskBadge level={row.report?.overall_risk as any} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Medium Risk */}
          <div className="card fade-up d3" style={{ padding: "24px", border: "1px solid rgba(245,158,11,0.25)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(245,158,11,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Zap size={16} style={{ color: "#f59e0b" }} />
              </div>
              <div>
                <h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: 15, fontWeight: 700, color: "var(--text)" }}>Perlu Pertimbangan</h3>
                <p style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>Diskusikan dengan pihak terkait</p>
              </div>
            </div>

            {mediumRiskCandidates.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--text3)" }}>Tidak ada kandidat sedang</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {mediumRiskCandidates.map((row) => (
                  <Link key={row.id} href={`/candidates/${row.id}`} style={{ textDecoration: "none" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderRadius: 14, background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.18)", cursor: "pointer", transition: "background 0.15s" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(245,158,11,0.12)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "rgba(245,158,11,0.06)")}>
                      <div>
                        <p style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text)" }}>{row.full_name}</p>
                        <p style={{ fontSize: 11.5, color: "var(--text3)", marginTop: 2 }}>{row.email}</p>
                      </div>
                      <RiskBadge level="medium" />
                    </div>
                  </Link>
                ))}
                <div style={{ marginTop: 8, padding: "10px 14px", borderRadius: 12, background: "rgba(245,158,11,0.08)", border: "1px dashed rgba(245,158,11,0.3)" }}>
                  <p style={{ fontSize: 11.5, color: "#d97706", fontWeight: 600, lineHeight: 1.5 }}>
                    ⚠ Kandidat ini memerlukan diskusi lebih lanjut dengan pihak terkait sebelum melanjutkan proses interview.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Good Candidates */}
          <div className="card fade-up d4" style={{ padding: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(16,185,129,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <CheckCircle size={16} style={{ color: "#10b981" }} />
              </div>
              <div>
                <h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: 15, fontWeight: 700, color: "var(--text)" }}>Kandidat Direkomendasikan</h3>
                <p style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>Kandidat dengan risiko rendah</p>
              </div>
            </div>
            {goodCandidates.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--text3)" }}>Belum ada kandidat low risk</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {goodCandidates.map((row) => (
                  <div key={row.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderRadius: 14, background: "var(--bg3)" }}>
                    <div>
                      <p style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text)" }}>{row.full_name}</p>
                      <p style={{ fontSize: 11.5, color: "var(--text3)", marginTop: 2 }}>{row.email}</p>
                    </div>
                    <RiskBadge level="low" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Table */}
        <div className="card fade-up d3" style={{ overflow:"hidden" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"20px 26px", borderBottom:"1px solid var(--border)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <Clock size={14} style={{ color:"var(--accent)" }} />
              <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:15, color:"var(--text)" }}>Screening Terbaru</h2>
              {total>0 && <span style={{ fontSize:11, fontWeight:600, padding:"2px 8px", borderRadius:999, background:"var(--bg3)", color:"var(--text3)" }}>{Math.min(5,total)} dari {total}</span>}
            </div>
            <Link href="/candidates" style={{ display:"flex", alignItems:"center", gap:5, fontSize:12.5, fontWeight:600, color:"var(--accent)", textDecoration:"none" }}>
              Lihat semua <ArrowRight size={11} />
            </Link>
          </div>

          {recent.length===0
            ? <div style={{ textAlign:"center", padding:"72px 0" }}>
                <div style={{ width:52, height:52, borderRadius:16, background:"var(--bg3)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 14px" }}>
                  <Users size={22} style={{ color:"var(--text4)" }} />
                </div>
                <p style={{ fontWeight:600, color:"var(--text)", fontSize:14 }}>Belum ada kandidat</p>
                <p style={{ fontSize:12.5, color:"var(--text3)", marginTop:4, marginBottom:20 }}>Mulai tambah kandidat untuk screening</p>
                <Link href="/candidates/add" className="btn btn-primary" style={{ display:"inline-flex" }}><Plus size={12} /> Tambah Kandidat</Link>
              </div>
            : <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead>
                  <tr style={{ background:"var(--bg3)", borderBottom:"1px solid var(--border)" }}>
                    {["Kandidat","Status","Risiko","Tanggal",""].map(h=>(
                      <th key={h} style={{ textAlign:"left", padding:"12px 22px", fontSize:10.5, fontWeight:700, letterSpacing:"0.09em", textTransform:"uppercase", color:"var(--text3)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recent.map(row=>(
                    <tr key={row.id} style={{ borderBottom:"1px solid var(--border)", transition:"background 0.12s" }}
                      onMouseEnter={e=>(e.currentTarget.style.background="var(--bg3)")}
                      onMouseLeave={e=>(e.currentTarget.style.background="")}>
                      <td style={{ padding:"15px 22px" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                          <div style={{ width:36, height:36, borderRadius:"50%", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", background:"linear-gradient(135deg,var(--accent),#009e76)", fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:13, color:"#061814" }}>
                            {row.full_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p style={{ fontSize:13.5, fontWeight:600, color:"var(--text)" }}>{row.full_name}</p>
                            <p style={{ fontSize:11.5, color:"var(--text3)" }}>{row.email}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding:"15px 22px" }}>
                        {!row.report
                          ? <span style={{ fontSize:11.5, fontWeight:600, padding:"4px 11px", borderRadius:999, background:"var(--bg3)", color:"var(--text3)" }}>Menunggu</span>
                          : row.report.status==="completed"
                            ? <span style={{ fontSize:11.5, fontWeight:700, padding:"4px 11px", borderRadius:999, background:"var(--accent-d)", color:"var(--accent)" }}>✓ Selesai</span>
                            : row.report.status==="failed"
                              ? <span style={{ fontSize:11.5, fontWeight:700, padding:"4px 11px", borderRadius:999, background:"var(--danger-d)", color:"var(--danger)" }}>✗ Gagal</span>
                              : <span style={{ display:"inline-flex", alignItems:"center", gap:5, fontSize:11.5, fontWeight:700, padding:"4px 11px", borderRadius:999, background:"var(--warn-d)", color:"var(--warning)" }}>
                                  <Loader2 size={9} className="animate-spin" />Proses
                                </span>
                        }
                      </td>
                      <td style={{ padding:"15px 22px" }}>
                        {row.report?.overall_risk ? <RiskBadge level={row.report.overall_risk} /> : <span style={{ color:"var(--border2)" }}>—</span>}
                      </td>
                      <td style={{ padding:"15px 22px", fontSize:12, color:"var(--text3)" }}>{fmt(row.created_at)}</td>
                      <td style={{ padding:"15px 22px" }}>
                        <Link href={`/candidates/${row.id}`} style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:12.5, fontWeight:600, color:"var(--accent)", textDecoration:"none" }}>
                          Detail <ArrowRight size={11} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
          }
        </div>
        </>)}
      </div>
    </AppLayout>
  );
}