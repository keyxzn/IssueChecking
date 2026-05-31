"use client";
import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { userApi, HRUser, UserCreate } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Plus, Trash2, Edit2, X, Check, User, Shield, Eye, EyeOff, Loader2 } from "lucide-react";

export default function UsersPage() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<HRUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const [form, setForm] = useState<UserCreate & { id?: string }>({
    email: "", full_name: "", password: "", role: "hr",
  });

  const load = async () => {
    try {
      setLoading(true);
      const data = await userApi.list();
      setUsers(data);
    } catch { setError("Gagal memuat daftar user. Pastikan Anda login sebagai Admin."); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editId) {
        const updated = await userApi.update(editId, {
          full_name: form.full_name,
          email: form.email,
          role: form.role,
          ...(form.password ? { password: form.password } : {}),
        });
        setUsers(u => u.map(x => x.id === editId ? updated : x));
      } else {
        const created = await userApi.create(form);
        setUsers(u => [created, ...u]);
      }
      resetForm();
    } catch (e: any) {
      setError(e.message ?? "Gagal menyimpan user");
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Hapus user "${name}"?`)) return;
    try {
      await userApi.delete(id);
      setUsers(u => u.filter(x => x.id !== id));
    } catch (e: any) { setError(e.message ?? "Gagal hapus user"); }
  };

  const startEdit = (u: HRUser) => {
    setEditId(u.id);
    setForm({ id: u.id, email: u.email, full_name: u.full_name, password: "", role: u.role });
    setShowAdd(true);
  };

  const resetForm = () => {
    setShowAdd(false);
    setEditId(null);
    setForm({ email: "", full_name: "", password: "", role: "hr" });
  };

  const roleColor = (role: string) => role === "admin" ? "#f59e0b" : "var(--accent)";

  if (me?.role !== "admin") return (
    <AppLayout>
      <div style={{ padding: 40, textAlign: "center" }}>
        <Shield size={40} style={{ color: "var(--danger)", margin: "0 auto 16px" }} />
        <p style={{ color: "var(--text)", fontWeight: 700, fontSize: 18 }}>Akses Ditolak</p>
        <p style={{ color: "var(--text3)", marginTop: 8 }}>Halaman ini hanya untuk Admin.</p>
      </div>
    </AppLayout>
  );

  return (
    <AppLayout>
      <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "24px 20px 60px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
            <div>
              <h1 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 22, color: "var(--text)", letterSpacing: "-0.03em" }}>
                User Management
              </h1>
              <p style={{ fontSize: 13, color: "var(--text3)", marginTop: 4 }}>
                {users.length} user terdaftar
              </p>
            </div>
            <button onClick={() => { resetForm(); setShowAdd(true); }} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "10px 20px", borderRadius: 12,
              background: "var(--accent)", border: "none",
              color: "#04130f", fontWeight: 700, fontSize: 13,
              cursor: "pointer", fontFamily: "'Syne',sans-serif",
            }}>
              <Plus size={15} /> Tambah User
            </button>
          </div>

          {error && (
            <div style={{ background: "var(--danger-d)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 12, padding: "12px 16px", marginBottom: 16, color: "var(--danger)", fontSize: 13, display: "flex", justifyContent: "space-between" }}>
              {error}
              <button onClick={() => setError("")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)" }}><X size={14} /></button>
            </div>
          )}

          {/* Add/Edit Form */}
          {showAdd && (
            <div style={{ background: "var(--bg2)", border: "1px solid var(--accent)", borderRadius: 18, padding: "22px 24px", marginBottom: 20, boxShadow: "0 0 0 4px var(--accent-d)" }}>
              <p style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15, color: "var(--text)", marginBottom: 18 }}>
                {editId ? "Edit User" : "Tambah User Baru"}
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                {([["full_name","Nama Lengkap","text"], ["email","Email","email"]] as const).map(([key, label, type]) => (
                  <div key={key}>
                    <label style={{ fontSize: 11.5, fontWeight: 600, color: "var(--text3)", display: "block", marginBottom: 6 }}>{label}</label>
                    <input
                      type={type}
                      value={(form as any)[key]}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg3)", color: "var(--text)", fontSize: 13, boxSizing: "border-box" }}
                    />
                  </div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 18 }}>
                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 600, color: "var(--text3)", display: "block", marginBottom: 6 }}>
                    {editId ? "Password Baru (kosongkan jika tidak diubah)" : "Password"}
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showPw ? "text" : "password"}
                      value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      style={{ width: "100%", padding: "10px 40px 10px 14px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg3)", color: "var(--text)", fontSize: 13, boxSizing: "border-box" }}
                    />
                    <button onClick={() => setShowPw(p => !p)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text3)" }}>
                      {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 600, color: "var(--text3)", display: "block", marginBottom: 6 }}>Role</label>
                  <select
                    value={form.role}
                    onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg3)", color: "var(--text)", fontSize: 13 }}
                  >
                    <option value="hr">HR</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={handleSave} disabled={saving || !form.full_name || !form.email || (!editId && !form.password)} style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "10px 22px", borderRadius: 10, border: "none",
                  background: "var(--accent)", color: "#04130f",
                  fontWeight: 700, fontSize: 13, cursor: "pointer",
                  opacity: saving ? 0.7 : 1,
                }}>
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  {editId ? "Simpan Perubahan" : "Buat User"}
                </button>
                <button onClick={resetForm} style={{ padding: "10px 18px", borderRadius: 10, border: "1px solid var(--border)", background: "transparent", color: "var(--text3)", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                  Batal
                </button>
              </div>
            </div>
          )}

          {/* User list */}
          {loading ? (
            <div style={{ textAlign: "center", padding: 60 }}><Loader2 size={28} className="animate-spin" style={{ color: "var(--accent)" }} /></div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {users.map(u => (
                <div key={u.id} style={{
                  background: "var(--bg2)", border: `1px solid ${u.id === me?.id ? "var(--accent)" : "var(--border)"}`,
                  borderRadius: 16, padding: "16px 20px",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  gap: 12, flexWrap: "wrap",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 14,
                      background: u.role === "admin" ? "rgba(245,158,11,0.15)" : "var(--accent-d)",
                      border: `1px solid ${u.role === "admin" ? "rgba(245,158,11,0.3)" : "var(--accent)"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {u.role === "admin" ? <Shield size={18} style={{ color: "#f59e0b" }} /> : <User size={18} style={{ color: "var(--accent)" }} />}
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <p style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>{u.full_name}</p>
                        {u.id === me?.id && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99, background: "var(--accent-d)", color: "var(--accent)", fontWeight: 700 }}>Saya</span>}
                        <span style={{
                          fontSize: 10, padding: "2px 8px", borderRadius: 99, fontWeight: 700,
                          background: u.role === "admin" ? "rgba(245,158,11,0.12)" : "var(--bg3)",
                          color: roleColor(u.role), textTransform: "capitalize",
                        }}>{u.role}</span>
                        {!u.is_active && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99, background: "rgba(239,68,68,0.1)", color: "#ef4444", fontWeight: 700 }}>Nonaktif</span>}
                      </div>
                      <p style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>{u.email}</p>
                      <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 1 }}>
                        Bergabung {new Date(u.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                  {u.id !== me?.id && (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => startEdit(u)} style={{ padding: "7px 14px", borderRadius: 9, border: "1px solid var(--border)", background: "var(--bg3)", color: "var(--text2)", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 12.5 }}>
                        <Edit2 size={12} /> Edit
                      </button>
                      <button onClick={() => handleDelete(u.id, u.full_name)} style={{ padding: "7px 14px", borderRadius: 9, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)", color: "#ef4444", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 12.5 }}>
                        <Trash2 size={12} /> Hapus
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}