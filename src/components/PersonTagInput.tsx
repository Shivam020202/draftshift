"use client";

import React, { useState } from "react";
import { X, UserPlus } from "lucide-react";

interface PersonTagInputProps {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}

const MAX_TAG_LEN = 30;
const SEPARATOR_RE = /[;,\n]/;

function sanitize(input: string): string {
  return input.replace(SEPARATOR_RE, " ").trim().slice(0, MAX_TAG_LEN);
}

export const PersonTagInput: React.FC<PersonTagInputProps> = ({
  value,
  onChange,
  placeholder = "Add person…"
}) => {
  const [draft, setDraft] = useState("");

  const addTag = (raw: string) => {
    const cleaned = sanitize(raw);
    if (!cleaned) return;
    const exists = value.some((t) => t.toLowerCase() === cleaned.toLowerCase());
    if (exists) {
      setDraft("");
      return;
    }
    onChange([...value, cleaned]);
    setDraft("");
  };

  const removeTag = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (draft.trim()) addTag(draft);
    } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
      // Convenience: backspace on empty input removes the last tag.
      removeTag(value.length - 1);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    // Auto-add on comma while typing.
    if (next.includes(",")) {
      const parts = next.split(",");
      const tail = parts.pop() ?? "";
      for (const p of parts) addTag(p);
      setDraft(tail);
      return;
    }
    setDraft(next);
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-2.5 py-2 bg-zinc-950/40 border border-white/5 focus-within:border-indigo-500/50 rounded-lg transition">
      <UserPlus className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
      {value.map((tag, idx) => (
        <span
          key={`${tag}-${idx}`}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-indigo-500/10 border border-indigo-500/20 text-indigo-200"
        >
          <span>{tag}</span>
          <button
            type="button"
            onClick={() => removeTag(idx)}
            className="text-indigo-300/70 hover:text-rose-300 transition cursor-pointer"
            title={`Remove ${tag}`}
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={draft}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (draft.trim()) addTag(draft);
        }}
        placeholder={value.length === 0 ? placeholder : "Add another…"}
        maxLength={MAX_TAG_LEN}
        className="flex-1 min-w-[100px] bg-transparent text-[11px] text-zinc-200 placeholder-zinc-600 focus:outline-none"
      />
    </div>
  );
};
