"use client";

import React from "react";
import { SavedNote } from "@/lib/noteTypes";
import { MessagesSquare, Calendar } from "lucide-react";
import { colorFromId, initialsForTag } from "@/lib/noteThreads";

interface ThreadListItemProps {
  root: SavedNote;
  replyCount: number;
  lastReplyAt: string | null;
  active: boolean;
  onSelect: () => void;
}

function formatStamp(iso: string | null): string {
  if (!iso) return "—";
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

export const ThreadListItem: React.FC<ThreadListItemProps> = ({
  root,
  replyCount,
  lastReplyAt,
  active,
  onSelect
}) => {
  const tags = root.tags || [];
  const tagPreview = tags[0];
  const initials = initialsForTag(tagPreview);
  const bg = colorFromId(root.id);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left p-3 rounded-xl border transition cursor-pointer ${
        active
          ? "bg-indigo-500/10 border-indigo-500/30 shadow-lg shadow-indigo-500/10"
          : "bg-zinc-900/30 hover:bg-zinc-900/60 border-white/5 hover:border-indigo-500/20"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
          style={{ background: bg }}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] text-zinc-200 font-semibold truncate">
              {tagPreview || "Thread"}
            </p>
            <span className="text-[9px] font-mono text-zinc-500 flex items-center gap-1 shrink-0">
              <Calendar className="w-2.5 h-2.5" />
              {formatStamp(lastReplyAt || root.createdAt)}
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
            {root.content || "(empty)"}
          </p>
          <div className="flex items-center gap-2 pt-1 border-t border-white/5">
            <span className="inline-flex items-center gap-1 text-[9px] font-mono text-indigo-300">
              <MessagesSquare className="w-2.5 h-2.5" />
              {replyCount === 0 ? "No replies" : `${replyCount} ${replyCount === 1 ? "reply" : "replies"}`}
            </span>
            {tags.length > 1 && (
              <span className="text-[9px] font-mono text-zinc-500">
                +{tags.length - 1} tag{tags.length - 1 === 1 ? "" : "s"}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
};