"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";

import {
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  User2,
  Mail,
  Phone,
  Instagram,
  Twitter,
  Linkedin,
  Globe,
  CheckCircle2,
  Loader2,
  Brain,
  Upload,
} from "lucide-react";

import Link from "next/link";
import { api } from "@/lib/api";

export default function NewCandidatePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    instagram_url: "",
    twitter_url: "",
    facebook_url: "",
    linkedin_url: "",
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);

    try {
      const candidate = await api.createCandidate(form);

      router.push(`/candidates/${candidate.id}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-emerald-50 relative overflow-hidden">

        {/* BG EFFECT */}
        <div className="absolute top-0 left-0 w-[400px] h-[400px] bg-emerald-200/30 blur-3xl rounded-full" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-cyan-200/20 blur-3xl rounded-full" />

        <div className="relative max-w-7xl mx-auto px-6 py-10">

          {/* TOP */}
          <div className="flex items-center justify-between flex-wrap gap-4 mb-8">

            <div>
              <Link
                href="/candidates"
                className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition mb-4"
              >
                <ArrowLeft size={16} />
                Kembali ke Issue
              </Link>

              <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full text-xs font-bold tracking-wide mb-4">
                <Sparkles size={14} />
                AI MEDIA MONITORING
              </div>

              <h1 className="text-5xl font-black text-slate-900 tracking-tight leading-tight">
                Tambah Issue
              </h1>

              <p className="text-slate-500 mt-3 text-lg max-w-2xl leading-relaxed">
                Mulai screening otomatis untuk analisa social media,
                toxic behavior, fraud risk, dan reputasi digital issue.
              </p>
            </div>

            <div className="bg-white/70 backdrop-blur-xl border border-white rounded-3xl p-5 shadow-xl min-w-[260px]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center">
                  <Brain size={20} className="text-emerald-600" />
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400 font-bold">
                    AI STATUS
                  </p>

                  <h3 className="font-black text-slate-900">
                    Screening Engine Ready
                  </h3>
                </div>
              </div>

              <div className="space-y-3">

                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">
                    Instagram Analysis
                  </span>

                  <CheckCircle2
                    size={18}
                    className="text-emerald-500"
                  />
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">
                    Facebook Analysis
                  </span>

                  <CheckCircle2
                    size={18}
                    className="text-emerald-500"
                  />
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">
                    LinkedIn Analysis
                  </span>

                  <CheckCircle2
                    size={18}
                    className="text-emerald-500"
                  />
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">
                    Toxic Detection AI
                  </span>

                  <CheckCircle2
                    size={18}
                    className="text-emerald-500"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

            {/* FORM */}
            <div className="xl:col-span-2 bg-white/80 backdrop-blur-xl border border-white rounded-[32px] p-8 shadow-2xl">

              <div className="flex items-center gap-3 mb-8">

                <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center">
                  <User2 size={24} className="text-emerald-600" />
                </div>

                <div>
                  <h2 className="text-2xl font-black text-slate-900">
                    Data Issue
                  </h2>

                  <p className="text-slate-500 mt-1">
                    Isi informasi issue untuk mulai screening
                  </p>
                </div>
              </div>

              <form onSubmit={submit} className="space-y-8">

                {/* BASIC */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                  <div>
                    <label className="text-sm font-bold text-slate-700 mb-2 block">
                      Nama Lengkap
                    </label>

                    <div className="relative">
                      <User2
                        size={18}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      />

                      <input
                        required
                        value={form.full_name}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            full_name: e.target.value,
                          })
                        }
                        placeholder="Nama lengkap issue"
                        className="w-full h-14 rounded-2xl border border-slate-200 bg-white px-12 text-sm font-medium outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-bold text-slate-700 mb-2 block">
                      Email
                    </label>

                    <div className="relative">
                      <Mail
                        size={18}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      />

                      <input
                        required
                        type="email"
                        value={form.email}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            email: e.target.value,
                          })
                        }
                        placeholder="email@domain.com"
                        className="w-full h-14 rounded-2xl border border-slate-200 bg-white px-12 text-sm font-medium outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 transition"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-bold text-slate-700 mb-2 block">
                    Nomor HP
                  </label>

                  <div className="relative">
                    <Phone
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      required
                      value={form.phone}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          phone: e.target.value,
                        })
                      }
                      placeholder="+62 812 xxxx xxxx"
                      className="w-full h-14 rounded-2xl border border-slate-200 bg-white px-12 text-sm font-medium outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 transition"
                    />
                  </div>
                </div>

                {/* SOCIAL */}
                <div>

                  <div className="flex items-center justify-between mb-5 flex-wrap gap-3">

                    <div>
                      <h3 className="text-xl font-black text-slate-900">
                        Social Media URL
                      </h3>

                      <p className="text-slate-500 text-sm mt-1">
                        Platform akan dianalisa otomatis oleh AI
                      </p>
                    </div>

                    <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full text-xs font-bold">
                      Multi Platform Analysis
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                    {[
                      {
                        label: "Instagram",
                        icon: Instagram,
                        key: "instagram_url",
                        placeholder:
                          "https://instagram.com/username",
                        color: "from-pink-500 to-orange-400",
                      },

                      {
                        label: "Twitter / X",
                        icon: Twitter,
                        key: "twitter_url",
                        placeholder: "https://x.com/username",
                        color: "from-sky-500 to-cyan-400",
                      },

                      {
                        label: "Facebook",
                        icon: Globe,
                        key: "facebook_url",
                        placeholder:
                          "https://facebook.com/username",
                        color: "from-blue-500 to-indigo-400",
                      },

                      {
                        label: "LinkedIn",
                        icon: Linkedin,
                        key: "linkedin_url",
                        placeholder:
                          "https://linkedin.com/in/username",
                        color: "from-blue-700 to-sky-500",
                      },
                    ].map((item) => {
                      const Icon = item.icon;

                      return (
                        <div key={item.key}>
                          <label className="text-sm font-bold text-slate-700 mb-2 block">
                            {item.label}
                          </label>

                          <div className="relative">

                            <div
                              className={`absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-xl bg-gradient-to-r ${item.color} flex items-center justify-center text-white`}
                            >
                              <Icon size={16} />
                            </div>

                            <input
                              value={(form as any)[item.key]}
                              onChange={(e) =>
                                setForm({
                                  ...form,
                                  [item.key]: e.target.value,
                                })
                              }
                              placeholder={item.placeholder}
                              className="w-full h-14 rounded-2xl border border-slate-200 bg-white pl-14 pr-4 text-sm font-medium outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 transition"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* CONSENT */}
                <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 flex items-start gap-4">

                  <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <ShieldCheck
                      size={20}
                      className="text-amber-600"
                    />
                  </div>

                  <div>
                    <h3 className="font-black text-amber-900 mb-2">
                      Consent & PDP Compliance
                    </h3>

                    <p className="text-sm text-amber-700 leading-relaxed">
                      Pastikan issue telah memberikan
                      persetujuan tertulis untuk proses
                      background screening sesuai dengan
                      regulasi UU PDP Indonesia.
                    </p>
                  </div>
                </div>

                {/* BUTTON */}
                <div className="flex gap-4 flex-wrap">

                  <button
                    type="submit"
                    disabled={loading}
                    className="h-14 px-8 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-90 transition text-white font-black text-sm shadow-2xl flex items-center gap-3"
                  >
                    {loading ? (
                      <>
                        <Loader2
                          size={18}
                          className="animate-spin"
                        />
                        Memulai Screening...
                      </>
                    ) : (
                      <>
                        <Sparkles size={18} />
                        Mulai Screening Issue
                      </>
                    )}
                  </button>

                  <Link
                    href="/candidates/bulk"
                    className="h-14 px-8 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 transition text-slate-700 font-bold text-sm flex items-center gap-3"
                  >
                    <Upload size={18} />
                    Upload Massal
                  </Link>
                </div>
              </form>
            </div>

            {/* SIDE */}
            <div className="space-y-6">

              <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[32px] p-7 text-white shadow-2xl">

                <p className="text-xs uppercase tracking-[0.25em] text-emerald-300 font-bold mb-3">
                  AI FEATURES
                </p>

                <h2 className="text-3xl font-black leading-tight mb-5">
                  Smart Social Media Detection
                </h2>

                <div className="space-y-4">

                  {[
                    "Instagram behavior analysis",
                    "Facebook public post detection",
                    "Toxic language recognition",
                    "Professional fraud detection",
                    "News & reputation monitoring",
                    "AI-generated risk scoring",
                  ].map((x) => (
                    <div
                      key={x}
                      className="flex items-center gap-3"
                    >
                      <CheckCircle2
                        size={18}
                        className="text-emerald-400"
                      />

                      <span className="text-sm text-slate-300">
                        {x}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-xl border border-white rounded-[32px] p-7 shadow-xl">

                <h3 className="text-xl font-black text-slate-900 mb-6">
                  Platform Screening
                </h3>

                <div className="grid grid-cols-2 gap-4">

                  {[
                    {
                      icon: "📸",
                      label: "Instagram",
                    },
                    {
                      icon: "🐦",
                      label: "Twitter/X",
                    },
                    {
                      icon: "👤",
                      label: "Facebook",
                    },
                    {
                      icon: "💼",
                      label: "LinkedIn",
                    },
                    {
                      icon: "🔍",
                      label: "Google",
                    },
                    {
                      icon: "📰",
                      label: "News",
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-center"
                    >
                      <div className="text-3xl mb-2">
                        {item.icon}
                      </div>

                      <p className="text-xs font-bold text-slate-700">
                        {item.label}
                      </p>
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