"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { useAuth } from "@/context/AuthContext";
import { isFirebaseEnabled, db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "@firebase/firestore";
import {
  Sparkles,
  Copy,
  Check,
  Download,
  Save,
  FileText,
  RefreshCw,
  AlertCircle,
  ChevronDown,
  BookOpen,
  AlignLeft,
  ClipboardList,
  PencilLine,
  Mic,
  MicOff,
  FileDown,
  StickyNote
} from "lucide-react";
import { GuidedQA, GuidedAnswers, isGuidedComplete } from "@/components/GuidedQA";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

type InputMode = "freeform" | "guided";

// Sample Technical Note Templates to make reviewing incredibly fast & easy
const TEMPLATES = [
  {
    name: "🚀 Standard Dev Shift (Messy Slack Logs)",
    rawNotes: `merged the critical dashboard hotfix onto master branch (PR #342) around 2 PM.
then the Postgres DB CPU usage spiked to 98% because of an unindexed query in workspace-panel.tsx. I ran a migration to add an index on user_id in handoffs table. Resolved!
also setup the firebase client config file and verified local sandbox bypass works perfectly.
Still need to fix CSS responsiveness on mobile for the navbar - jane is taking a look at this tomorrow.
Also forgot to deploy the staging package to hosting. Someone needs to run npm run build on main.`
  },
  {
    name: "📅 Daily Standup Brainstorm (Raw Thoughts)",
    rawNotes: `Yesterday: I battled with React Markdown and Tailwind v4 theme configurations. Got custom glow animations working in globals.css.
Today: Working on the AuthScreen component. Want to implement the demo sign-in bypass so charlie doesn't have to fill in forms. Afterwards, I'll work on the API endpoint /api/transform-notes.
Blockers: Gemini API key has rate limit alerts on my dashboard. Hope it doesn't crash during the review!`
  },
  {
    name: "🐛 Outage Incident Report (Unstructured)",
    rawNotes: `We got a Datadog alert at 04:12 AM about API router returning 500s.
I looked at the logs, it was a Gemini API timeout in /api/transform-notes because of a massive payload (user tried to paste a 10MB text file).
I wrote a quick input length validator on the backend to cap character count at 12,000 characters.
Also redeployed the serverless route on Vercel.
Need to update the front-end textarea today to enforce max-length as well and show a red alert box.`
  },
  {
    name: "🩺 Guided Shift Note (Pre-filled Answers)",
    // Special marker — when this template is picked and we're in guided mode
    // the WorkspacePanel will pre-fill the Q&A fields instead of the textarea.
    rawNotes: "__guided__"
  }
];

interface WorkspacePanelProps {
  onHandoffSaved: () => void;
  // Load note from history feed into workspace
  activeInput: string;
  activeOutput: string;
  activeFormat: string;
  activeTone: string;
  onClearActiveHistory: () => void;
}

export const WorkspacePanel: React.FC<WorkspacePanelProps> = ({
  onHandoffSaved,
  activeInput,
  activeOutput,
  activeFormat,
  activeTone,
  onClearActiveHistory
}) => {
  const { user, isFallbackMode } = useAuth();

  // Workspace states
  const [rawNotes, setRawNotes] = useState<string>("");
  const [format, setFormat] = useState<string>("handover");
  const [tone, setTone] = useState<string>("professional");
  const [mode, setMode] = useState<InputMode>("freeform");
  const [guidedAnswers, setGuidedAnswers] = useState<GuidedAnswers>({
    activity: "",
    behaviour: "",
    support: "",
    outcome: "",
    extra: "",
  });

  // Output and processing states
  const [transformedOutput, setTransformedOutput] = useState<string>("");
  const [isTransforming, setIsTransforming] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Actions states
  const [copied, setCopied] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [hasSavedCurrent, setHasSavedCurrent] = useState<boolean>(false);
  const [modelUsed, setModelUsed] = useState<string>("");

  // Voice-to-text states
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState<boolean>(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // PDF export states
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const outputRef = useRef<HTMLDivElement>(null);

  // Save Shift Notes states
  const [isSavingNotes, setIsSavingNotes] = useState<boolean>(false);
  const [hasSavedNotes, setHasSavedNotes] = useState<boolean>(false);

  // Initialize Speech Recognition on mount
  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
      setIsSpeechSupported(true);
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + " ";
          }
        }

        if (finalTranscript) {
          setRawNotes((prev) => (prev + " " + finalTranscript).trim());
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error("Speech recognition error:", event.error);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  // Sync with historical load if selected
  React.useEffect(() => {
    if (activeInput) {
      setRawNotes(activeInput);
    }
    if (activeOutput) {
      setTransformedOutput(activeOutput);
      setHasSavedCurrent(true); // Don't prompt to save historical items as new
    }
    if (activeFormat) setFormat(activeFormat);
    if (activeTone) setTone(activeTone);
  }, [activeInput, activeOutput, activeFormat, activeTone]);

  // Template pre-populator
  const handleApplyTemplate = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedIndex = parseInt(e.target.value);
    if (!isNaN(selectedIndex) && TEMPLATES[selectedIndex]) {
      const tpl = TEMPLATES[selectedIndex];
      if (tpl.rawNotes === "__guided__") {
        // Switch to guided mode and pre-fill answers with a realistic example
        setMode("guided");
        setGuidedAnswers({
          activity:
            "Supported John and Sarah with a morning cooking group. They made sandwiches and fresh orange juice. Sarah engaged well, John needed prompting to stay on task but completed his portion.",
          behaviour:
            "No. Both participants were calm throughout. John showed mild frustration once when the toaster jammed, but recovered quickly after a 2-minute break.",
          support:
            "Used positive prompting, demonstrated each step, offered 1:1 time with John, then re-joined the group. Applied low-arousal approach when John was briefly frustrated.",
          outcome:
            "Both participants finished the activity, ate lunch together, and were in a positive mood at handover.",
          extra: "John (participant A), Sarah (participant B). Morning shift, 7am–3pm at the day centre.",
        });
      } else {
        setMode("freeform");
        setRawNotes(tpl.rawNotes);
      }
      setErrorMsg(null);
      setTransformedOutput("");
      setHasSavedCurrent(false);
      onClearActiveHistory();
    }
  };

  // Perform AI note transformation
  const handleTransform = async () => {
    if (mode === "guided") {
      if (!isGuidedComplete(guidedAnswers)) {
        setErrorMsg("Please answer all four questions before generating a shift note.");
        return;
      }
    } else {
      if (!rawNotes.trim()) {
        setErrorMsg("Please enter or select some notes to transform first.");
        return;
      }
    }

    setIsTransforming(true);
    setErrorMsg(null);
    setTransformedOutput("");
    setHasSavedCurrent(false);

    try {
      const payload =
        mode === "guided"
          ? { mode, answers: guidedAnswers, format: "shift-notes", tone }
          : { mode, notes: rawNotes, format, tone };

      const response = await fetch("/api/transform-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to transform notes.");
      }

      setTransformedOutput(data.text);
      setModelUsed(data.model || "gemini-2.5-flash");
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "An unexpected error occurred during note transformation.");
    } finally {
      setIsTransforming(false);
    }
  };

  // Copy to clipboard with instant feedback
  const handleCopyToClipboard = async () => {
    if (!transformedOutput) return;
    try {
      await navigator.clipboard.writeText(transformedOutput);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  // Download Output as Markdown file
  const handleDownloadFile = () => {
    if (!transformedOutput) return;
    try {
      const element = document.createElement("a");
      const file = new Blob([transformedOutput], { type: "text/markdown" });
      element.href = URL.createObjectURL(file);
      element.download = `draftshift-${format}-${Date.now()}.md`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    } catch (err) {
      console.error("Download failed:", err);
    }
  };

  // Save current handover to history feed
  const handleSaveToHistory = async () => {
    if (!transformedOutput || !user) return;
    setIsSaving(true);

    try {
      // For guided mode, persist the worker's answers as the "raw notes" so
      // history items remain readable and re-loadable.
      const sourceNotes =
        mode === "guided"
          ? [
              "Q1 — Activity: " + (guidedAnswers.activity || ""),
              "Q2 — Behavioural incident: " + (guidedAnswers.behaviour || ""),
              "Q3 — Support provided: " + (guidedAnswers.support || ""),
              "Q4 — Outcome: " + (guidedAnswers.outcome || ""),
              guidedAnswers.extra ? "Context: " + guidedAnswers.extra : "",
            ]
              .filter(Boolean)
              .join("\n")
          : rawNotes;

      const payload = {
        uid: user.uid,
        rawNotes: sourceNotes,
        transformedContent: transformedOutput,
        format: mode === "guided" ? "shift-notes" : format,
        tone,
        createdAt: new Date().toISOString()
      };

      if (!isFirebaseEnabled || isFallbackMode) {
        // Local fallback storage
        const historyJson = localStorage.getItem("draftshift_handoffs") || "[]";
        const currentHistory = JSON.parse(historyJson);
        
        // Prepend new record
        currentHistory.unshift({
          id: `local-item-${Date.now()}`,
          ...payload
        });
        
        // Slice to max 20 to save storage space
        localStorage.setItem("draftshift_handoffs", JSON.stringify(currentHistory.slice(0, 20)));
      } else {
        // Firestore storage
        await addDoc(collection(db, "handoffs"), {
          ...payload,
          createdAt: serverTimestamp() // Use firebase server timestamp
        });
      }

      setHasSavedCurrent(true);
      onHandoffSaved(); // Refresh history feed in parent
    } catch (err) {
      console.error("Save failed:", err);
      setErrorMsg("Failed to save handoff to history feed.");
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle voice recording
  const handleToggleRecording = useCallback(() => {
    if (!recognitionRef.current) return;

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      recognitionRef.current.start();
      setIsRecording(true);
    }
  }, [isRecording]);

  // Download Output as PDF
  const handleDownloadPdf = async () => {
    if (!transformedOutput || !outputRef.current) return;
    setIsExportingPdf(true);

    try {
      const element = outputRef.current;
      const canvas = await html2canvas(element, {
        backgroundColor: "#09090b",
        scale: 2,
        useCORS: true,
        logging: false
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 0;

      pdf.addImage(imgData, "PNG", imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      pdf.save(`draftshift-${format}-${Date.now()}.pdf`);
    } catch (err) {
      console.error("PDF export failed:", err);
      setErrorMsg("Failed to export PDF. Please try again.");
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Save raw shift notes to storage (independent of transformation)
  const handleSaveShiftNotes = async () => {
    const notesToSave = mode === "guided"
      ? [
          "Q1 — Activity: " + (guidedAnswers.activity || ""),
          "Q2 — Behavioural incident: " + (guidedAnswers.behaviour || ""),
          "Q3 — Support provided: " + (guidedAnswers.support || ""),
          "Q4 — Outcome: " + (guidedAnswers.outcome || ""),
          guidedAnswers.extra ? "Context: " + guidedAnswers.extra : "",
        ].filter(Boolean).join("\n")
      : rawNotes;

    if (!notesToSave.trim()) {
      return;
    }

    setIsSavingNotes(true);

    try {
      const payload = {
        uid: user?.uid || "local",
        content: notesToSave,
        mode,
        format: mode === "guided" ? "shift-notes" : format,
        createdAt: new Date().toISOString()
      };

      if (!isFirebaseEnabled || isFallbackMode) {
        const key = "draftshift_shift_notes";
        const existing = JSON.parse(localStorage.getItem(key) || "[]");
        existing.unshift({ id: `note-${Date.now()}`, ...payload });
        localStorage.setItem(key, JSON.stringify(existing.slice(0, 50)));
      } else {
        await addDoc(collection(db, "shift_notes"), {
          ...payload,
          createdAt: serverTimestamp()
        });
      }

      setHasSavedNotes(true);
      setTimeout(() => setHasSavedNotes(false), 3000);
    } catch (err: unknown) {
      console.error("Save shift notes failed:", err);
    } finally {
      setIsSavingNotes(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* Mode Toggle (Free-Form vs Guided Q&A) */}
      <div className="glass-panel p-3 rounded-xl flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Input mode</span>
        </div>
        <div className="inline-flex p-1 bg-zinc-900/70 border border-white/10 rounded-xl gap-1">
          <button
            type="button"
            onClick={() => {
              setMode("freeform");
              setErrorMsg(null);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              mode === "freeform"
                ? "bg-indigo-500/15 text-indigo-200 border border-indigo-500/30"
                : "text-zinc-400 hover:text-white border border-transparent"
            }`}
            title="Paste free-form messy notes and let the AI restructure them"
          >
            <PencilLine className="w-3.5 h-3.5" />
            <span>Free-Form Notes</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("guided");
              setErrorMsg(null);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              mode === "guided"
                ? "bg-emerald-500/15 text-emerald-200 border border-emerald-500/30"
                : "text-zinc-400 hover:text-white border border-transparent"
            }`}
            title="Answer 4 simple questions and the AI generates a structured shift note"
          >
            <ClipboardList className="w-3.5 h-3.5" />
            <span>Guided Shift Note</span>
          </button>
        </div>
      </div>

      {/* Configuration Header Controls */}
      <div className="glass-panel p-4 rounded-xl flex flex-wrap gap-4 items-center justify-between">
        
        {/* Template Selector */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <BookOpen className="w-4 h-4 text-indigo-400 shrink-0" />
          <span className="text-xs font-semibold text-zinc-300 whitespace-nowrap">Load Template:</span>
          <div className="relative flex-1 md:w-64">
            <select
              onChange={handleApplyTemplate}
              defaultValue=""
              className="w-full bg-zinc-900 border border-white/10 rounded-lg py-1.5 pl-3 pr-8 text-xs text-white appearance-none focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="" disabled>-- Select a Messy Developer Draft --</option>
              {TEMPLATES.map((tpl, idx) => (
                <option key={idx} value={idx}>{tpl.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
          </div>
        </div>

        {/* Configurations (Tone, Format) */}
        <div className="flex flex-wrap gap-4 items-center w-full md:w-auto justify-end">
          
          {/* Format Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400">Format:</span>
            <select
              value={format}
              onChange={(e) => {
                setFormat(e.target.value);
                setHasSavedCurrent(false);
              }}
              className="bg-zinc-900 border border-white/10 rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="handover">🚀 Shift Handover</option>
              <option value="standup">📅 Daily Standup</option>
              <option value="release-notes">📦 Release Notes</option>
              <option value="email">✉️ Status Email</option>
            </select>
          </div>

          {/* Tone Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400">Tone:</span>
            <select
              value={tone}
              onChange={(e) => {
                setTone(e.target.value);
                setHasSavedCurrent(false);
              }}
              className="bg-zinc-900 border border-white/10 rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="professional">👔 Professional</option>
              <option value="bullet-points">📊 Bullet-Points</option>
              <option value="action-oriented">🎯 Action-Oriented</option>
              <option value="casual">💬 Casual</option>
            </select>
          </div>

        </div>

      </div>

      {/* Main Workspace double-pane */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Input Panel (Left) */}
        <div className="glass-panel rounded-2xl p-5 flex flex-col h-[520px] relative">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {mode === "guided" ? (
                <ClipboardList className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlignLeft className="w-4 h-4 text-indigo-400" />
              )}
              <h3 className="text-sm font-bold text-white tracking-wide uppercase">
                {mode === "guided" ? "Guided Q&A Workspace" : "Raw Input Workspace"}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              {/* Save Shift Notes Button */}
              <button
                onClick={handleSaveShiftNotes}
                disabled={isSavingNotes || !(mode === "guided" ? isGuidedComplete(guidedAnswers) : rawNotes.trim())}
                title="Save shift notes"
                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  hasSavedNotes
                    ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                    : "bg-zinc-900 hover:bg-zinc-800 border border-white/5 text-zinc-400 hover:text-white"
                }`}
              >
                {isSavingNotes ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : hasSavedNotes ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <StickyNote className="w-3 h-3" />
                )}
                <span>{hasSavedNotes ? "Saved" : "Save Notes"}</span>
              </button>

              <button
                onClick={() => {
                  setRawNotes("");
                  setGuidedAnswers({ activity: "", behaviour: "", support: "", outcome: "", extra: "" });
                  setTransformedOutput("");
                  setHasSavedCurrent(false);
                  setHasSavedNotes(false);
                  onClearActiveHistory();
                }}
                className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 hover:text-zinc-300 transition duration-150"
              >
                Clear Workspace
              </button>
            </div>
          </div>

          {mode === "guided" ? (
            <div className="flex-1 overflow-y-auto pr-1 -mr-1">
              <GuidedQA answers={guidedAnswers} onChange={(a) => {
                setGuidedAnswers(a);
                setHasSavedCurrent(false);
              }} />
            </div>
          ) : (
            <>
              <div className="flex-1 relative">
                <textarea
                  value={rawNotes}
                  onChange={(e) => {
                    setRawNotes(e.target.value);
                    setHasSavedCurrent(false);
                    setHasSavedNotes(false);
                  }}
                  placeholder="Type or paste your messy developer logs, terminal outputs, DB migration scripts, or standup blurbs here... (Use the load template dropdown above for a quick test!)"
                  className="w-full h-full bg-zinc-950/40 border border-white/5 focus:border-indigo-500/50 rounded-xl p-4 pr-12 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none resize-none focus:ring-1 focus:ring-indigo-500/20 transition leading-relaxed"
                />

                {/* Voice-to-Text Button */}
                {isSpeechSupported && (
                  <button
                    onClick={handleToggleRecording}
                    title={isRecording ? "Stop recording" : "Start voice input"}
                    className={`absolute top-3 right-3 p-2 rounded-lg transition cursor-pointer ${
                      isRecording
                        ? "bg-red-500/20 border border-red-500/30 text-red-400 animate-pulse"
                        : "bg-zinc-900/50 border border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-800"
                    }`}
                  >
                    {isRecording ? (
                      <MicOff className="w-4 h-4" />
                    ) : (
                      <Mic className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between mt-3 text-xs text-zinc-500 font-mono">
                <div>
                  <span>Words: {rawNotes.trim() === "" ? 0 : rawNotes.trim().split(/\s+/).length}</span>
                  <span className="mx-2">•</span>
                  <span>Chars: {rawNotes.length}</span>
                </div>
                <div className="flex items-center gap-3">
                  {isRecording && (
                    <span className="text-red-400 flex items-center gap-1">
                      <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                      Recording...
                    </span>
                  )}
                  <span className="text-[10px] text-zinc-600">Supports markdown logs</span>
                </div>
              </div>
            </>
          )}

          {/* Glowing CTA Button inside left pane at bottom right */}
          <div className="absolute bottom-5 right-5">
            <button
              onClick={handleTransform}
              disabled={
                isTransforming ||
                (mode === "guided" ? !isGuidedComplete(guidedAnswers) : !rawNotes.trim())
              }
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:from-zinc-800 disabled:to-zinc-800 text-white disabled:text-zinc-500 rounded-xl px-5 py-2.5 text-xs font-bold shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 active:scale-[0.97] transition duration-200 flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed group relative overflow-hidden"
            >
              {isTransforming ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>AI Transforming...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-indigo-200 group-hover:scale-110 transition duration-200" />
                  <span>{mode === "guided" ? "Generate Shift Note" : "Transform Draft"}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Output Panel (Right) */}
        <div className="glass-panel rounded-2xl p-5 flex flex-col h-[520px] bg-zinc-950/20 relative" ref={outputRef}>
          
          <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-bold text-white tracking-wide uppercase">AI Processed Output</h3>
            </div>

            {/* Display Model used if output is generated */}
            {transformedOutput && modelUsed && (
              <span className="text-[9px] font-mono bg-zinc-900 border border-white/5 text-indigo-400 py-0.5 px-2 rounded">
                {modelUsed}
              </span>
            )}
          </div>

          {/* Loading Skeleton Panel */}
          {isTransforming ? (
            <div className="flex-1 space-y-4 animate-pulse pt-4">
              <div className="h-6 bg-zinc-800/40 rounded w-2/3" />
              <div className="space-y-2">
                <div className="h-4 bg-zinc-800/20 rounded w-full" />
                <div className="h-4 bg-zinc-800/20 rounded w-11/12" />
                <div className="h-4 bg-zinc-800/20 rounded w-full" />
              </div>
              <div className="h-5 bg-zinc-800/40 rounded w-1/3 mt-6" />
              <div className="space-y-2">
                <div className="h-4 bg-zinc-800/20 rounded w-full" />
                <div className="h-4 bg-zinc-800/20 rounded w-4/5" />
              </div>
              <div className="h-10 bg-zinc-800/10 rounded w-full mt-6" />
            </div>
          ) : transformedOutput ? (
            // Formatted Markdown Render
            <div className="flex-1 overflow-y-auto pr-1 text-left select-text markdown-preview pt-1">
              <ReactMarkdown>{transformedOutput}</ReactMarkdown>
            </div>
          ) : (
            // Unpopulated State
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="p-4 bg-zinc-900/50 rounded-full border border-white/5 mb-4 text-zinc-600 animate-float-slow">
                <FileText className="w-8 h-8" />
              </div>
              <h4 className="text-sm font-bold text-zinc-300 mb-1">Awaiting AI Transformation</h4>
              <p className="text-xs text-zinc-500 max-w-xs leading-relaxed">
                Add your messy items on the left and click **Transform Draft** to observe premium Markdown output formatting in real time.
              </p>
            </div>
          )}

          {/* Action Toolbar on populated outputs */}
          {transformedOutput && !isTransforming && (
            <div className="flex items-center justify-between border-t border-white/5 pt-3.5 mt-3 relative z-10">
              
              <button
                onClick={handleCopyToClipboard}
                className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 active:scale-[0.97] transition duration-200 cursor-pointer ${
                  copied 
                    ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" 
                    : "bg-zinc-900 hover:bg-zinc-800 border border-white/5 text-zinc-300 hover:text-white"
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Draft</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-2">
                
                {/* Download as Markdown Button */}
                <button
                  onClick={handleDownloadFile}
                  title="Download as Markdown"
                  className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/5 hover:border-white/10 text-zinc-400 hover:text-white active:scale-[0.97] transition duration-200 flex items-center justify-center cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                </button>

                {/* Download as PDF Button */}
                <button
                  onClick={handleDownloadPdf}
                  disabled={isExportingPdf}
                  title="Download as PDF"
                  className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/5 hover:border-white/10 text-zinc-400 hover:text-white active:scale-[0.97] transition duration-200 flex items-center justify-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isExportingPdf ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileDown className="w-4 h-4" />
                  )}
                </button>

                {/* Save To History Button */}
                <button
                  onClick={handleSaveToHistory}
                  disabled={hasSavedCurrent || isSaving}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 active:scale-[0.97] transition duration-200 cursor-pointer disabled:cursor-not-allowed ${
                    hasSavedCurrent
                      ? "bg-indigo-950/20 border border-indigo-500/15 text-indigo-400/80"
                      : "bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white shadow shadow-indigo-600/10"
                  }`}
                >
                  {isSaving ? (
                    <div className="w-3.5 h-3.5 border border-white border-t-transparent rounded-full animate-spin" />
                  ) : hasSavedCurrent ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Saved to history</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5 text-indigo-200" />
                      <span>Save Handoff</span>
                    </>
                  )}
                </button>

              </div>

            </div>
          )}

          {/* Feedback error logs */}
          {errorMsg && (
            <div className="absolute bottom-5 left-5 right-5 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-start gap-2 animate-bounce">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <span className="font-semibold block">Transformation Failed</span>
                <span className="text-[10px] text-rose-300/80">{errorMsg}</span>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
