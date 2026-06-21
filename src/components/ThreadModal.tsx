"use client";

import React, { useEffect, useMemo, useState } from "react";
import { SavedNote } from "@/lib/noteTypes";
import { useAuth } from "@/context/AuthContext";
import { isFirebaseEnabled, db } from "@/lib/firebase";
import { doc, deleteDoc, writeBatch } from "@firebase/firestore";
import {
  X,
  MessagesSquare,
  CornerDownRight,
  RefreshCw,
  Database
} from "lucide-react";
import {
  fetchShiftNotes,
  getThreadRoots,
  getReplyChain,
  reparentAfterDelete
} from "@/lib/noteThreads";
import { ThreadListItem } from "@/components/ThreadListItem";
import { ThreadReplyBubble } from "@/components/ThreadReplyBubble";

const LS_KEY = "draftshift_shift_notes";

interface ThreadModalProps {
  isOpen: boolean;
  initialThreadId: string | null;
  onClose: () => void;
  onReply: (note: SavedNote) => void;
  onAfterDelete: () => void;
}

export const ThreadModal: React.FC<ThreadModalProps> = ({
  isOpen,
  initialThreadId,
  onClose,
  onReply,
  onAfterDelete
}) => {
  const { user, isFallbackMode } = useAuth();
  const [notes, setNotes] = useState<SavedNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeRootId, setActiveRootId] = useState<string | null>(null);

  // Refresh whenever the modal opens (this is the "dynamic on action"
  // behavior — re-fetch every time the user opens Threads).
  useEffect(() => {
    if (!isOpen || !user) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const n = await fetchShiftNotes(user, isFallbackMode, 50);
        if (cancelled) return;
        setNotes(n);
        // Pick a default: the initialThreadId, or the first root.
        if (initialThreadId) {
          setActiveRootId(initialThreadId);
        } else {
          const roots = getThreadRoots(n);
          if (roots.length > 0) setActiveRootId(roots[0].id);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, user, isFallbackMode, initialThreadId]);

  // Escape key to close.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const roots = useMemo(() => getThreadRoots(notes), [notes]);

  // Map of rootId -> reply count (excluding the root itself).
  const replyCountByRoot = useMemo(() => {
    const m = new Map<string, number>();
    for (const n of notes) {
      if (n.parentId) {
        m.set(n.parentId, (m.get(n.parentId) || 0) + 1);
      }
    }
    return m;
  }, [notes]);

  // Map of rootId -> last reply timestamp.
  const lastReplyByRoot = useMemo(() => {
    const m = new Map<string, string>();
    for (const n of notes) {
      if (n.parentId) {
        const existing = m.get(n.parentId);
        if (!existing || n.createdAt > existing) m.set(n.parentId, n.createdAt);
      }
    }
    return m;
  }, [notes]);

  const activeChain = useMemo(() => {
    if (!activeRootId) return [];
    return getReplyChain(notes, activeRootId);
  }, [activeRootId, notes]);

  const handleDelete = async (note: SavedNote) => {
    if (!user) return;
    const isRoot = note.parentId == null;

    // Optimistic update.
    let workingNotes: SavedNote[];
    if (isRoot) {
      workingNotes = reparentAfterDelete(note.id, notes);
    } else {
      workingNotes = notes.filter((n) => n.id !== note.id);
    }
    const previousState = notes;
    setNotes(workingNotes);

    // If we deleted the active root, jump to the next available root.
    if (isRoot && activeRootId === note.id) {
      const remainingRoots = workingNotes.filter((n) => n.parentId == null);
      setActiveRootId(remainingRoots[0]?.id || null);
    }

    try {
      if (!isFirebaseEnabled || isFallbackMode) {
        if (isRoot) {
          // Persist re-parenting changes for any promoted notes.
          const updated = new Map<string, Partial<SavedNote>>();
          for (const w of workingNotes) {
            const prev = previousState.find((p) => p.id === w.id);
            if (prev && (prev.parentId !== w.parentId)) {
              updated.set(w.id, { parentId: w.parentId });
            }
          }
          const raw = localStorage.getItem(LS_KEY) || "[]";
          const items: SavedNote[] = JSON.parse(raw).map((r: Record<string, unknown>) => {
            const id = r.id as string;
            if (updated.has(id)) {
              return { ...r, ...updated.get(id) };
            }
            return r;
          });
          // Remove the deleted one.
          const filtered = items.filter((i) => i.id !== note.id);
          localStorage.setItem(LS_KEY, JSON.stringify(filtered));
        } else {
          const raw = localStorage.getItem(LS_KEY) || "[]";
          const items: SavedNote[] = JSON.parse(raw).filter(
            (r: Record<string, unknown>) => r.id !== note.id
          );
          localStorage.setItem(LS_KEY, JSON.stringify(items));
        }
      } else {
        if (isRoot) {
          // Apply re-parenting then delete root in a batch.
          const batch = writeBatch(db);
          for (const w of workingNotes) {
            const prev = previousState.find((p) => p.id === w.id);
            if (prev && prev.parentId !== w.parentId) {
              batch.update(doc(db, "shift_notes", w.id), { parentId: w.parentId });
            }
          }
          batch.delete(doc(db, "shift_notes", note.id));
          await batch.commit();
        } else {
          await deleteDoc(doc(db, "shift_notes", note.id));
        }
      }
      onAfterDelete();
    } catch (err) {
      console.error("Thread delete failed:", err);
      // Revert optimistic update.
      setNotes(previousState);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="glass-panel rounded-2xl w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden border border-white/10 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
              <MessagesSquare className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Threads</h2>
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                {roots.length} {roots.length === 1 ? "thread" : "threads"} · click a thread to view replies
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Close"
            className="p-2 rounded-lg bg-zinc-900 border border-white/5 hover:border-white/10 text-zinc-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row">
          {/* Left pane — thread roots */}
          <div className="w-full md:w-[320px] md:shrink-0 border-b md:border-b-0 md:border-r border-white/5 p-4 overflow-y-auto">
            {loading ? (
              <div className="space-y-2 animate-pulse">
                {[1, 2, 3].map((n) => (
                  <div
                    key={n}
                    className="h-16 bg-zinc-900/30 border border-white/5 rounded-xl"
                  />
                ))}
              </div>
            ) : roots.length === 0 ? (
              <div className="py-10 px-4 flex flex-col items-center justify-center text-center">
                <div className="p-3 bg-zinc-900/40 rounded-full border border-white/5 mb-3 text-zinc-700">
                  <Database className="w-5 h-5" />
                </div>
                <h4 className="text-xs font-bold text-zinc-400 mb-0.5">No Threads Yet</h4>
                <p className="text-[11px] text-zinc-500 max-w-[200px] leading-relaxed">
                  Save a shift note to start your first thread. Reply to any note to continue the conversation.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {roots.map((root) => (
                  <ThreadListItem
                    key={root.id}
                    root={root}
                    replyCount={replyCountByRoot.get(root.id) || 0}
                    lastReplyAt={lastReplyByRoot.get(root.id) || null}
                    active={activeRootId === root.id}
                    onSelect={() => setActiveRootId(root.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right pane — selected thread */}
          <div className="flex-1 min-h-0 p-5 overflow-y-auto bg-zinc-950/30">
            {!activeRootId ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-zinc-500">
                <CornerDownRight className="w-8 h-8 mb-3 text-zinc-700" />
                <p className="text-xs">Select a thread on the left to view its replies.</p>
              </div>
            ) : activeChain.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-zinc-500">
                <RefreshCw className="w-5 h-5 animate-spin mb-2" />
                <p className="text-xs">Loading thread…</p>
              </div>
            ) : (
              <div className="space-y-3 max-w-3xl mx-auto">
                {activeChain.map((note, idx) => (
                  <ThreadReplyBubble
                    key={note.id}
                    note={note}
                    isRoot={idx === 0}
                    onReply={() => {
                      onReply(note);
                    }}
                    onDelete={() => handleDelete(note)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
