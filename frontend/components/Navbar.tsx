"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield, LayoutDashboard, Users, LogOut, ChevronDown, Plus } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useState } from "react";

export default function Navbar() {
  const path = usePathname();
  const { user, logout } = useAuth();
  const [showMenu, setShowMenu] = useState(false);

  const links = [
    { href: "/dashboard",  label: "Dashboard",       icon: LayoutDashboard },
    { href: "/candidates", label: "Kandidat",         icon: Users },
  ];

  return (
    <nav className="bg-slate-900 border-b border-slate-800 px-6 h-14 flex items-center justify-between sticky top-0 z-50">
      <Link href="/dashboard" className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center">
          <Shield size={14} className="text-white" />
        </div>
        <span className="font-extrabold text-white text-sm tracking-tight">
          HR<span className="text-emerald-400">Check</span>
        </span>
        <span className="text-[9px] font-bold text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded tracking-widest uppercase">Beta</span>
      </Link>

      <div className="flex items-center gap-1">
        {links.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              path === href || path.startsWith(href + "/") ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}>
            <Icon size={13} /> {label}
          </Link>
        ))}

        <Link href="/candidates/new"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all ml-1">
          <Plus size={13} /> Baru
        </Link>

        {/* User menu */}
        <div className="relative ml-2">
          <button onClick={() => setShowMenu(s => !s)}
            className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-all">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white text-[10px] font-bold">
              {user?.name?.charAt(0).toUpperCase() ?? "?"}
            </div>
            <span className="hidden sm:block max-w-24 truncate">{user?.name}</span>
            <ChevronDown size={11} />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-slate-700">
                <p className="text-xs font-bold text-white truncate">{user?.name}</p>
                <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
                <span className="inline-block mt-1 text-[9px] font-bold bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded uppercase tracking-wider">{user?.role}</span>
              </div>
              <button onClick={() => { setShowMenu(false); logout(); }}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-red-400 hover:bg-red-500/10 transition">
                <LogOut size={13} /> Keluar
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}