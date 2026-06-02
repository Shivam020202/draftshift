"use client";

import React, { useState } from "react";
import { Activity, AlertTriangle, HandHeart, CheckCircle2, MessageSquarePlus, Sparkles } from "lucide-react";

export interface GuidedAnswers {
  activity: string;
  behaviour: string;
  support: string;
  outcome: string;
  extra: string;
}

interface GuidedQAProps {
  answers: GuidedAnswers;
  onChange: (answers: GuidedAnswers) => void;
}

// The 4 questions the client suggested, plus an optional "extra context"
// field for participants' names / shift times. Order = reporting order.
export const GUIDED_QUESTIONS: Array<{
  key: keyof GuidedAnswers;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  helper: string;
  placeholder: string;
  required: boolean;
  tone: string;
}> = [
  {
    key: "activity",
    icon: Activity,
    label: "What activity occurred?",
    helper: "Briefly describe what happened during the shift (e.g. group activity, outing, meal time, therapy session).",
    placeholder: "Supported John and Sarah with a morning cooking group. They made sandwiches and juice…",
    required: true,
    tone: "indigo",
  },
  {
    key: "behaviour",
    icon: AlertTriangle,
    label: "Was there any behavioural incident?",
    helper: "Note any incident, trigger, or escalation. If none, just write \"No\" — leave nothing to guess.",
    placeholder: "No. John was calm throughout. Sarah refused the activity for ~5 minutes but re-engaged after a break.",
    required: true,
    tone: "amber",
  },
  {
    key: "support",
    icon: HandHeart,
    label: "What support was provided?",
    helper: "What did you (or the team) do to help — prompting, de-escalation, 1:1 time, medication, etc.",
    placeholder: "Used low-arousal approach, offered 1:1 time in the sensory room, then re-introduced the activity.",
    required: true,
    tone: "sky",
  },
  {
    key: "outcome",
    icon: CheckCircle2,
    label: "What was the outcome?",
    helper: "How did the participant(s) end the shift? Mood, engagement, any follow-up needed.",
    placeholder: "Both participants finished the activity, ate lunch together, and were in a positive mood at handover.",
    required: true,
    tone: "emerald",
  },
];

export const GuidedQA: React.FC<GuidedQAProps> = ({ answers, onChange }) => {
  const [showExtra, setShowExtra] = useState<boolean>(Boolean(answers.extra?.trim()));

  const handleField = (key: keyof GuidedAnswers, value: string) => {
    onChange({ ...answers, [key]: value });
  };

  const toneRing: Record<string, string> = {
    indigo: "focus-within:border-indigo-500/60 focus-within:ring-indigo-500/20",
    amber: "focus-within:border-amber-500/60 focus-within:ring-amber-500/20",
    sky: "focus-within:border-sky-500/60 focus-within:ring-sky-500/20",
    emerald: "focus-within:border-emerald-500/60 focus-within:ring-emerald-500/20",
  };
  const toneIcon: Record<string, string> = {
    indigo: "text-indigo-400",
    amber: "text-amber-400",
    sky: "text-sky-400",
    emerald: "text-emerald-400",
  };

  return (
    <div className="space-y-4">
      {/* Intro banner */}
      <div className="flex items-start gap-3 p-3 rounded-xl bg-indigo-500/[0.06] border border-indigo-500/15">
        <div className="p-1.5 rounded-lg bg-indigo-500/15 shrink-0 mt-0.5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
        </div>
        <div className="text-[11px] leading-relaxed text-zinc-300">
          <span className="font-semibold text-white">Guided shift-note mode.</span>{" "}
          Answer each question in your own words. DraftShift will turn your answers into a clean, structured
          report that meets handover requirements — no writing effort required.
        </div>
      </div>

      {/* Questions */}
      {GUIDED_QUESTIONS.map((q, idx) => {
        const Icon = q.icon;
        return (
          <div
            key={q.key}
            className={`rounded-xl bg-zinc-950/40 border border-white/5 p-3.5 transition focus-within:ring-1 ${toneRing[q.tone]}`}
          >
            <label className="flex items-center gap-2 mb-1.5">
              <span className="text-[9px] font-mono font-bold text-zinc-500 w-5 h-5 rounded-full bg-zinc-900 border border-white/10 inline-flex items-center justify-center">
                {idx + 1}
              </span>
              <Icon className={`w-3.5 h-3.5 ${toneIcon[q.tone]}`} />
              <span className="text-xs font-semibold text-white tracking-wide">
                {q.label}
                {q.required && <span className="text-rose-400 ml-0.5">*</span>}
              </span>
            </label>

            <p className="text-[10px] text-zinc-500 mb-2 leading-relaxed pl-7">{q.helper}</p>

            <textarea
              value={answers[q.key]}
              onChange={(e) => handleField(q.key, e.target.value)}
              placeholder={q.placeholder}
              rows={3}
              className="w-full bg-zinc-900/50 border border-white/5 focus:border-white/10 rounded-lg p-2.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none resize-y min-h-[64px] leading-relaxed"
            />
          </div>
        );
      })}

      {/* Optional: participants / extra context */}
      {showExtra ? (
        <div className="rounded-xl bg-zinc-950/40 border border-white/5 p-3.5 focus-within:border-purple-500/60 focus-within:ring-1 focus-within:ring-purple-500/20 transition">
          <label className="flex items-center gap-2 mb-1.5">
            <span className="text-[9px] font-mono font-bold text-zinc-500 w-5 h-5 rounded-full bg-zinc-900 border border-white/10 inline-flex items-center justify-center">
              5
            </span>
            <span className="text-xs font-semibold text-white tracking-wide">
              Participant(s) or extra context <span className="text-zinc-500 font-normal">(optional)</span>
            </span>
          </label>
          <p className="text-[10px] text-zinc-500 mb-2 leading-relaxed pl-7">
            List the people you supported, or add any other context (shift time, location, weather…).
          </p>
          <textarea
            value={answers.extra}
            onChange={(e) => handleField("extra", e.target.value)}
            placeholder="John (participant A), Sarah (participant B). Morning shift, 7am–3pm at the day centre."
            rows={2}
            className="w-full bg-zinc-900/50 border border-white/5 focus:border-white/10 rounded-lg p-2.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none resize-y min-h-[48px] leading-relaxed"
          />
          <div className="flex justify-end mt-1.5">
            <button
              type="button"
              onClick={() => {
                setShowExtra(false);
                handleField("extra", "");
              }}
              className="text-[10px] uppercase tracking-wider text-zinc-500 hover:text-zinc-300 cursor-pointer"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowExtra(true)}
          className="w-full flex items-center justify-center gap-2 text-[11px] font-semibold text-zinc-400 hover:text-white py-2 rounded-xl border border-dashed border-white/10 hover:border-white/20 transition cursor-pointer"
        >
          <MessageSquarePlus className="w-3.5 h-3.5" />
          <span>Add participants / extra context (optional)</span>
        </button>
      )}
    </div>
  );
};

// Helper for the parent: detect whether the required questions are filled.
export const isGuidedComplete = (a: GuidedAnswers): boolean => {
  return GUIDED_QUESTIONS.every((q) => a[q.key]?.trim().length > 0);
};
