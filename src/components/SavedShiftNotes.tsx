"use client";

import React, { useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { useAuth } from "@/context/AuthContext";
import { isFirebaseEnabled, db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  doc,
  deleteDoc
} from "@firebase/firestore";
import {
  StickyNote,
  Trash2,
  ArrowUpRight,
  Calendar,
  FileText
} from "lucide-react";

export interface SavedNote {
  id: string;
  content: string;
  mode: string;
  format: string;
  createdAt: string;
}

interface SavedShiftNotesProps {
  onSelectNote: (content: string) => void;
}

export interface SavedShiftNotesRef {
  refresh: () => void;
}

export const SavedShiftNotes = forwardRef<SavedShiftNotesRef, SavedShiftNotesProps>(
  ({ onSelectNote }, ref) => {
    const { user, isFallbackMode } = useAuth();
    const [notes, setNotes] = useState<SavedNote[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    useImperativeHandle(ref, () => ({
      refresh() {
        fetchNotes();
      }
    }));

    const fetchNotes = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        if (!isFirebaseEnabled || isFallbackMode) {
          const raw = localStorage.getItem("draftshift_shift_notes") || "[]";
          const items = JSON.parse(raw);
          const formatted: SavedNote[] = items.map((item: Record<string, unknown>) => ({
            id: (item.id as string) || `local-${Date.now()}`,
            content: (item.content as string) || "",
            mode: (item.mode as string) || "freeform",
            format: (item.format as string) || "handover",
            createdAt: (item.createdAt as string) || new Date().toISOString()
          }));
          setNotes(formatted.slice(0, 10));
        } else {
          const q = query(
            collection(db, "shift_notes"),
            where("uid", "==", user.uid),
            orderBy("createdAt", "desc"),
            limit(10)
          );
          const snapshot = await getDocs(q);
          const items: SavedNote[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            let dateStr = new Date().toISOString();
            if (data.createdAt) {
              dateStr =
                typeof data.createdAt.toDate === "function"
                  ? data.createdAt.toDate().toISOString()
                  : new Date(data.createdAt).toISOString();
            }
            items.push({
              id: docSnap.id,
              content: data.content || "",
              mode: data.mode || "freeform",
              format: data.format || "handover",
              createdAt: dateStr
            });
          });
          setNotes(items);
        }
      } catch (err) {
        console.error("Failed to fetch shift notes:", err);
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => {
      if (user) fetchNotes();
    }, [user]);

    const handleDelete = async (e: React.MouseEvent, note: SavedNote) => {
      e.stopPropagation();
      const prev = [...notes];
      setNotes(notes.filter((n) => n.id !== note.id));

      try {
        if (!isFirebaseEnabled || isFallbackMode) {
          const raw = localStorage.getItem("draftshift_shift_notes") || "[]";
          const items = JSON.parse(raw).filter((h: Record<string, unknown>) => h.id !== note.id);
          localStorage.setItem("draftshift_shift_notes", JSON.stringify(items));
        } else {
          await deleteDoc(doc(db, "shift_notes", note.id));
        }
      } catch (err) {
        console.error("Delete failed:", err);
        setNotes(prev);
      }
    };

    const formatDate = (iso: string) => {
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
    };

    if (!user) return null;

    return (
      <div className="glass-panel rounded-2xl p-5 relative overflow-hidden">
        <div className="flex items-center justify-between mb-5 pb-2 border-b border-white/5">
          <div className="flex items-center gap-2">
            <StickyNote className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white tracking-wide uppercase">Saved Shift Notes</h3>
          </div>
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
            Latest 10
          </span>
        </div>

        {loading ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3].map((n) => (
              <div key={n} className="p-3 bg-zinc-900/30 border border-white/5 rounded-xl space-y-2">
                <div className="h-3 bg-zinc-800 rounded w-1/3" />
                <div className="h-3 bg-zinc-850 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : notes.length === 0 ? (
          <div className="py-10 px-4 flex flex-col items-center justify-center text-center">
            <div className="p-3 bg-zinc-900/40 rounded-full border border-white/5 mb-3 text-zinc-700">
              <FileText className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-bold text-zinc-400 mb-0.5">No Saved Notes</h4>
            <p className="text-[11px] text-zinc-500 max-w-[180px] leading-relaxed">
              Your saved shift notes will appear here. Click &quot;Save Notes&quot; in the workspace to save.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => (
              <div
                key={note.id}
                onClick={() => onSelectNote(note.content)}
                className="p-3 bg-zinc-900/20 hover:bg-zinc-900/60 border border-white/5 hover:border-amber-500/20 rounded-xl transition duration-300 cursor-pointer group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase font-semibold border bg-amber-500/10 border-amber-500/20 text-amber-300">
                        {note.mode === "guided" ? "guided" : note.format}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono flex items-center gap-1">
                        <Calendar className="w-2.5 h-2.5" />
                        {formatDate(note.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 group-hover:text-zinc-200 transition line-clamp-2 leading-relaxed">
                      {note.content || "No content."}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectNote(note.content);
                      }}
                      title="Load into workspace"
                      className="p-1.5 rounded bg-zinc-950 border border-white/5 hover:border-amber-500/20 hover:bg-amber-500/10 text-zinc-500 hover:text-amber-400 transition cursor-pointer"
                    >
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, note)}
                      title="Delete note"
                      className="p-1.5 rounded bg-zinc-950 border border-white/5 hover:border-rose-500/20 hover:bg-rose-500/10 text-zinc-500 hover:text-rose-400 transition cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
);

SavedShiftNotes.displayName = "SavedShiftNotes";
