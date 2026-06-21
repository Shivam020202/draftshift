"use client";

import React from "react";
import { SavedNote } from "@/lib/noteTypes";
import { CornerDownRight, Trash2, Calendar } from "lucide-react";
import { colorFromId, initialsForTag } from "@/lib/noteThreads";

interface ThreadReplyBubbleProps {
  note: SavedNote;
  isRoot: boolean;
  onReply: () => void;
  onDelete: () => void;
}

function formatStamp(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return "Just now";
  }
}

export const ThreadReplyBubble: React.FC<ThreadReplyBubbleProps> = ({
  note,
  isRoot,
  onReply,
  onDelete
}) => {
  const tags = note.tags || [];
  const author = tags[0];
  const initials = initialsForTag(author);
  const bg = colorFromId(note.id);

  return (
    <div
      className={`relative flex items-start gap-3 p-3.5 rounded-2xl border ${
        isRoot
          ? "bg-indigo-500/5 border-indigo-500/20"
          : "ml-6 bg-zinc-900/40 border-white/5"
      }`}
    >
      {!isRoot && (
        <CornerDownRight className="absolute -left-5 top-4 w-3.5 h-3.5 text-zinc-700" />
      )}
      <div
        className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
        style={{ background: bg }}
      >
        {initials}
      </div>
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-semibold text-zinc-100">
              {author || (isRoot ? "Thread root" : "Workspace")}
            </span>
            {isRoot && (
              <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
                Root
              </span>
            )}
            {tags.length > 1 && (
              <div className="flex items-center gap-1 flex-wrap">
                {tags.slice(1).map((t, i) => (
                  <span
                    key={`${t}-${i}`}
                    className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-800/60 border border-white/5 text-zinc-400"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
          <span className="text-[9px] font-mono text-zinc-500 flex items-center gap-1">
            <Calendar className="w-2.5 h-2.5" />
            {formatStamp(note.createdAt)}
          </span>
        </div>
        <p className="text-[12px] text-zinc-200 whitespace-pre-wrap break-words leading-relaxed">
          {note.content || "(empty)"}
        </p>
        <div className="flex items-center gap-2 pt-2 border-t border-white/5">
          <button
            type="button"
            onClick={onReply}
            className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-indigo-300 hover:text-indigo-200 transition cursor-pointer"
            title="Reply to this note"
          >
            <CornerDownRight className="w-3 h-3" />
            Reply
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 hover:text-rose-300 transition cursor-pointer ml-auto"
            title="Delete this note"
          >
            <Trash2 className="w-3 h-3" />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};