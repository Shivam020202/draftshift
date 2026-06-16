"use client";

import React, { useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { AuthScreen } from "@/components/AuthScreen";
import { Navbar } from "@/components/Navbar";
import { WorkspacePanel } from "@/components/WorkspacePanel";
import { HistoryFeed, HistoryFeedRef } from "@/components/HistoryFeed";
import { SavedShiftNotes, SavedShiftNotesRef } from "@/components/SavedShiftNotes";
import { Sparkles, Terminal, Activity, FileText } from "lucide-react";

export default function Home() {
  const { user, loading, isFallbackMode } = useAuth();
  const historyFeedRef = useRef<HistoryFeedRef>(null);
  const savedNotesRef = useRef<SavedShiftNotesRef>(null);

  // States to hold history items injected into active workspace
  const [activeInput, setActiveInput] = useState<string>("");
  const [activeOutput, setActiveOutput] = useState<string>("");
  const [activeFormat, setActiveFormat] = useState<string>("");
  const [activeTone, setActiveTone] = useState<string>("");

  // Notify HistoryFeed to fetch updated listings
  const handleHandoffSaved = () => {
    historyFeedRef.current?.refreshHistory();
  };

  // Load a historical item back into workspace
  const handleSelectHandoff = (
    rawNotes: string,
    transformedContent: string,
    format: string,
    tone: string
  ) => {
    setActiveInput(rawNotes);
    setActiveOutput(transformedContent);
    setActiveFormat(format);
    setActiveTone(tone);
  };

  const handleClearActiveHistory = () => {
    setActiveInput("");
    setActiveOutput("");
    setActiveFormat("");
    setActiveTone("");
  };

  // Load a saved shift note into workspace input
  const handleSelectSavedNote = (content: string) => {
    setActiveInput(content);
    setActiveOutput("");
    setActiveFormat("");
    setActiveTone("");
  };

  // Premium loading splash screen
  if (loading) {
    return (
      <div className="min-h-screen w-full bg-black flex flex-col items-center justify-center relative overflow-hidden">
        {/* Glowing visual indicators */}
        <div className="absolute w-80 h-80 bg-indigo-500/10 rounded-full blur-[80px] animate-pulse" />
        
        <div className="relative z-10 flex flex-col items-center text-center space-y-6">
          <div className="p-4 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-2xl shadow-xl shadow-indigo-500/20 animate-spin" style={{ animationDuration: '3s' }}>
            <Terminal className="w-8 h-8 text-white" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-xl font-bold tracking-tight text-white">Initializing DraftShift</h2>
            <p className="text-xs text-zinc-500 font-mono">Syncing client workspace & session headers...</p>
          </div>

          <div className="w-32 h-1 bg-zinc-900 rounded-full overflow-hidden relative">
            <div className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-indigo-500 to-purple-500 w-1/2 rounded-full animate-infinite-loading" />
          </div>
        </div>
      </div>
    );
  }

  // Render Login state if unauthenticated
  if (!user) {
    return <AuthScreen />;
  }

  return (
    <main className="min-h-screen bg-black text-zinc-100 flex flex-col relative pb-16">
      
      {/* Ambient background blur elements */}
      <div className="absolute top-[10%] left-[5%] w-[350px] h-[350px] bg-indigo-500/5 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[5%] w-[350px] h-[350px] bg-purple-500/5 rounded-full blur-[80px] pointer-events-none" />

      {/* Grid background mesh */}
      <div 
        className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff02_1px,transparent_1px),linear-gradient(to_bottom,#ffffff02_1px,transparent_1px)] bg-[size:5rem_5rem]"
        style={{ pointerEvents: 'none' }}
      />

      {/* Header Navigation */}
      <Navbar />

      {/* Main Page Layout Container */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8 relative z-10 space-y-6">
        
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-950/40 p-6 rounded-2xl border border-white/5 backdrop-blur-sm">
          <div className="space-y-1 text-left">
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <span>DraftShift Workspace</span>
              <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400">
              Welcome back, <span className="text-indigo-400 font-semibold">{user.displayName || "Developer Pro"}</span>. Paste messy notes in <span className="text-indigo-300 font-semibold">Free-Form</span> mode, or answer 4 simple questions in <span className="text-emerald-300 font-semibold">Guided Shift Note</span> mode — Gemini turns either into a clean, structured report.
            </p>
          </div>

          {/* Quick Metrics / Activity summary in header */}
          <div className="flex items-center gap-4 text-xs font-mono bg-black/40 p-3 rounded-xl border border-white/5">
            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-zinc-500">Status:</span>
              <span className="text-emerald-400 font-bold">Online</span>
            </div>
            <div className="h-4 w-px bg-white/10" />
            <div className="flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-zinc-500">Workspace:</span>
              <span className="text-zinc-300">{isFallbackMode ? "Mock Sandbox" : "Cloud Active"}</span>
            </div>
          </div>
        </div>

        {/* Dashboard Grid layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Main workspace (Left 3 columns) */}
          <div className="lg:col-span-3">
            <WorkspacePanel 
              onHandoffSaved={handleHandoffSaved}
              activeInput={activeInput}
              activeOutput={activeOutput}
              activeFormat={activeFormat}
              activeTone={activeTone}
              onClearActiveHistory={handleClearActiveHistory}
            />
          </div>

          {/* Right sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* History feed */}
            <HistoryFeed 
              ref={historyFeedRef}
              onSelectHandoff={handleSelectHandoff}
            />

            {/* Saved Shift Notes */}
            <SavedShiftNotes
              ref={savedNotesRef}
              onSelectNote={handleSelectSavedNote}
            />
          </div>

        </div>

      </div>
    </main>
  );
}
