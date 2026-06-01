"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Sparkles, Mail, Lock, User, Terminal, ArrowRight, Globe, ShieldAlert, Cpu } from "lucide-react";

export const AuthScreen: React.FC = () => {
  const { login, signup, loginWithGoogle, loginAsDemo, isFallbackMode } = useAuth();
  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loadingForm, setLoadingForm] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoadingForm(true);

    try {
      if (isSignUp) {
        if (!displayName.trim()) {
          throw new Error("Please enter your name.");
        }
        await signup(email, password, displayName);
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An authentication error occurred.");
    } finally {
      setLoadingForm(false);
    }
  };

  const handleOAuthGoogle = async () => {
    setError(null);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setError(err.message || "Google Sign-In failed.");
    }
  };

  const handleDemoAccess = async () => {
    setError(null);
    try {
      await loginAsDemo();
    } catch (err: any) {
      setError("Demo access failed.");
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-black overflow-hidden px-4 py-12">
      {/* Ambient background glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[100px] animate-radial-slow" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 rounded-full blur-[100px] animate-radial-slow" />

      {/* Grid Pattern overlay */}
      <div 
        className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_at_center,black_60%,transparent_100%)]"
        style={{ pointerEvents: 'none' }}
      />

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-0 glass-panel rounded-2xl border border-white/10 overflow-hidden shadow-2xl relative z-10">
        
        {/* Graphic Panel (Left) */}
        <div className="lg:col-span-5 bg-gradient-to-br from-indigo-950/70 via-slate-900/60 to-purple-950/70 p-8 lg:p-12 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-white/5 relative overflow-hidden">
          {/* Subtle line mesh */}
          <div className="absolute inset-0 bg-radial-gradient from-transparent to-black/40 opacity-70 pointer-events-none" />
          
          <div className="relative z-10 flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-xl shadow-lg shadow-indigo-500/20">
              <Terminal className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-white to-zinc-300 bg-clip-text text-transparent">DraftShift</span>
              <span className="text-xs block text-zinc-500 font-mono">v1.1.0</span>
            </div>
          </div>

          <div className="relative z-10 my-16 lg:my-0 flex-1 flex flex-col justify-center">
            <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight mb-4">
              Turn Messy Notes Into <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">Perfect Engineering</span> Artifacts.
            </h1>
            <p className="text-zinc-400 text-sm lg:text-base leading-relaxed mb-6">
              Stop wasting engineering hours writing handover logs, standup briefs, and release notes. Let Gemini organize your mental draft instantly.
            </p>
            
            <div className="flex flex-col gap-3 font-mono text-xs text-zinc-500 bg-black/40 p-4 rounded-xl border border-white/5 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>100% Client-Side Fallback Capability</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                <span>Tailwind CSS v4 Premium Design System</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                <span>Powered by gemini-2.5-flash AI</span>
              </div>
            </div>
          </div>

          <div className="relative z-10 pt-4 border-t border-white/5 text-zinc-500 text-xs flex justify-between items-center">
            <span>© 2026 DraftShift Team</span>
            <span>Cloud & Local Sync ready</span>
          </div>
        </div>

        {/* Input Form Panel (Right) */}
        <div className="lg:col-span-7 p-8 lg:p-12 flex flex-col justify-center bg-zinc-950/40 relative">
          
          {/* Status Indicator for fallbacks */}
          {isFallbackMode && (
            <div className="mb-6 py-2.5 px-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3 animate-pulse">
              <Cpu className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-semibold text-amber-300">Local Sandbox Mode Enabled</h4>
                <p className="text-[10px] text-zinc-400">Firebase keys missing in .env.local. The app will simulate registration, login, and database states completely on your client browser!</p>
              </div>
            </div>
          )}

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white tracking-tight">
              {isSignUp ? "Create your workspace" : "Welcome back"}
            </h2>
            <p className="text-zinc-400 text-sm mt-1">
              {isSignUp 
                ? "Get started with your premium AI transformation desk." 
                : "Sign in to access your dashboard, workspace history, and notes."}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-3 text-rose-300 text-xs">
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Full Name</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-500">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full bg-zinc-900/60 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-500">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane.doe@draftshift.com"
                  className="w-full bg-zinc-900/60 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Password</label>
                {!isSignUp && (
                  <a href="#" className="text-xs text-indigo-400 hover:text-indigo-300 transition">Forgot password?</a>
                )}
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-500">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-zinc-900/60 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loadingForm}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl py-3.5 text-sm font-semibold shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 active:scale-[0.98] transition flex items-center justify-center gap-2 mt-6 cursor-pointer"
            >
              {loadingForm ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{isSignUp ? "Create Workspace" : "Access Workspace"}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Social login separator */}
          <div className="my-6 flex items-center justify-center gap-3">
            <span className="h-px bg-white/5 flex-1" />
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Or access with</span>
            <span className="h-px bg-white/5 flex-1" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={handleOAuthGoogle}
              className="bg-zinc-900/40 hover:bg-zinc-900/80 border border-white/10 hover:border-white/20 text-zinc-200 rounded-xl py-3 px-4 text-xs font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition cursor-pointer"
            >
              <Globe className="w-4 h-4 text-indigo-400" />
              <span>Google Account</span>
            </button>

            {/* Quick Demo Reviewer Bypass Button */}
            <button
              onClick={handleDemoAccess}
              className="bg-indigo-950/20 hover:bg-indigo-900/30 border border-indigo-500/20 hover:border-indigo-500/40 text-indigo-300 rounded-xl py-3 px-4 text-xs font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition animate-glow-pulse cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Quick Demo Access</span>
            </button>
          </div>

          <div className="text-center mt-8">
            <p className="text-xs text-zinc-400">
              {isSignUp ? "Already have an account?" : "New to DraftShift?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setIsSignUp(!isSignUp);
                }}
                className="text-indigo-400 hover:text-indigo-300 font-semibold transition"
              >
                {isSignUp ? "Sign In instead" : "Create Workspace"}
              </button>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
