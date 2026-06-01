"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";
import { LogOut, Terminal, Cloud, Shield, Database } from "lucide-react";

export const Navbar: React.FC = () => {
  const { user, logout, isFallbackMode } = useAuth();

  if (!user) return null;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-zinc-950/60 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Branding */}
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-lg shadow-md shadow-indigo-500/10">
            <Terminal className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white to-zinc-300 bg-clip-text text-transparent">
              DraftShift
            </span>
            <span className="hidden sm:inline-block ml-2 px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-zinc-900 border border-white/15 rounded text-zinc-500 uppercase tracking-widest align-middle">
              v1.1.0
            </span>
          </div>
        </div>

        {/* Action Controls & Profile info */}
        <div className="flex items-center gap-4">
          
          {/* Dynamic Sync Mode Badge */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium border bg-zinc-950/40">
            {isFallbackMode ? (
              <>
                <Database className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-amber-300 font-semibold">Local Sandbox</span>
                <span className="text-zinc-500 font-mono">(Local History)</span>
              </>
            ) : (
              <>
                <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300 font-semibold">Cloud Synced</span>
                <span className="text-zinc-500 font-mono">(Firestore)</span>
              </>
            )}
          </div>

          {/* User Profile */}
          <div className="flex items-center gap-3 pl-4 border-l border-white/10">
            {user.photoURL && (
              <img
                src={user.photoURL}
                alt={user.displayName || "Avatar"}
                className="w-8 h-8 rounded-full border border-white/10 bg-zinc-900 shrink-0"
              />
            )}
            <div className="hidden sm:block text-left">
              <span className="block text-xs font-semibold text-white leading-tight">
                {user.displayName || "Developer Pro"}
              </span>
              <span className="block text-[10px] text-zinc-500 font-mono">
                {user.email || "demo@draftshift.com"}
              </span>
            </div>

            {/* Logout button */}
            <button
              onClick={logout}
              title="Log Out Workspace"
              className="ml-2 p-2 rounded-lg bg-zinc-900/60 hover:bg-rose-500/10 border border-white/5 hover:border-rose-500/20 text-zinc-400 hover:text-rose-400 active:scale-[0.96] transition duration-200 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

        </div>

      </div>
    </header>
  );
};
