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
  History, 
  Trash2, 
  ArrowUpRight, 
  Copy, 
  Check, 
  Calendar, 
  Terminal,
  ChevronRight,
  Database
} from "lucide-react";

export interface HistoryItem {
  id: string;
  rawNotes: string;
  transformedContent: string;
  format: string;
  tone: string;
  createdAt: string;
}

interface HistoryFeedProps {
  onSelectHandoff: (rawNotes: string, transformedContent: string, format: string, tone: string) => void;
}

export interface HistoryFeedRef {
  refreshHistory: () => void;
}

export const HistoryFeed = forwardRef<HistoryFeedRef, HistoryFeedProps>(({ onSelectHandoff }, ref) => {
  const { user, isFallbackMode } = useAuth();
  const [handoffs, setHandoffs] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Expose refresh function to parent page
  useImperativeHandle(ref, () => ({
    refreshHistory() {
      fetchHistory();
    }
  }));

  const fetchHistory = async () => {
    if (!user) return;
    setLoading(true);

    try {
      if (!isFirebaseEnabled || isFallbackMode) {
        // Fallback local storage fetching
        const historyJson = localStorage.getItem("draftshift_handoffs") || "[]";
        const localItems = JSON.parse(historyJson);
        
        // Map local items to fit our schema
        const formattedItems: HistoryItem[] = localItems.map((item: any) => ({
          id: item.id || `local-item-${Math.random()}`,
          rawNotes: item.rawNotes || "",
          transformedContent: item.transformedContent || "",
          format: item.format || "handover",
          tone: item.tone || "professional",
          createdAt: item.createdAt || new Date().toISOString()
        }));

        setHandoffs(formattedItems.slice(0, 5)); // Keep only latest 5 items
      } else {
        // Cloud Firestore fetching
        const q = query(
          collection(db, "handoffs"),
          where("uid", "==", user.uid),
          orderBy("createdAt", "desc"),
          limit(5)
        );

        const querySnapshot = await getDocs(q);
        const fetchedItems: HistoryItem[] = [];

        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          
          // Handle Firestore Timestamps safely
          let dateStr = new Date().toISOString();
          if (data.createdAt) {
            if (typeof data.createdAt.toDate === "function") {
              dateStr = data.createdAt.toDate().toISOString();
            } else {
              dateStr = new Date(data.createdAt).toISOString();
            }
          }

          fetchedItems.push({
            id: docSnap.id,
            rawNotes: data.rawNotes || "",
            transformedContent: data.transformedContent || "",
            format: data.format || "handover",
            tone: data.tone || "professional",
            createdAt: dateStr
          });
        });

        setHandoffs(fetchedItems);
      }
    } catch (err) {
      console.error("Failed to fetch handover history:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchHistory();
    }
  }, [user]);

  // Copy specific item's output to clipboard
  const handleCopy = async (e: React.MouseEvent, item: HistoryItem) => {
    e.stopPropagation(); // Avoid triggering card click (load item)
    try {
      await navigator.clipboard.writeText(item.transformedContent);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  // Delete history item
  const handleDelete = async (e: React.MouseEvent, item: HistoryItem) => {
    e.stopPropagation(); // Avoid triggering card click
    
    // Smooth optimistic UI delete update
    const previousState = [...handoffs];
    setHandoffs(handoffs.filter((h) => h.id !== item.id));

    try {
      if (!isFirebaseEnabled || isFallbackMode) {
        // Local fallback delete
        const historyJson = localStorage.getItem("draftshift_handoffs") || "[]";
        const currentHistory = JSON.parse(historyJson);
        const filteredHistory = currentHistory.filter((h: any) => h.id !== item.id);
        localStorage.setItem("draftshift_handoffs", JSON.stringify(filteredHistory));
      } else {
        // Cloud Firestore delete
        await deleteDoc(doc(db, "handoffs", item.id));
      }
    } catch (err) {
      console.error("Failed to delete history item:", err);
      // Revert if error
      setHandoffs(previousState);
    }
  };

  const getFormatBadgeColor = (format: string) => {
    switch (format) {
      case "handover": return "bg-indigo-500/10 border-indigo-500/20 text-indigo-300";
      case "standup": return "bg-sky-500/10 border-sky-500/20 text-sky-300";
      case "release-notes": return "bg-pink-500/10 border-pink-500/20 text-pink-300";
      case "email": return "bg-emerald-500/10 border-emerald-500/20 text-emerald-300";
      default: return "bg-zinc-500/10 border-zinc-500/20 text-zinc-300";
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, {
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
      
      <div className="flex items-center justify-between mb-6 pb-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-bold text-white tracking-wide uppercase">Recent Handover Timeline</h3>
        </div>
        <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
          Latest 5 drafts
        </span>
      </div>

      {loading ? (
        // High-fidelity Skeletons
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map((n) => (
            <div key={n} className="p-4 bg-zinc-900/30 border border-white/5 rounded-xl space-y-2">
              <div className="flex justify-between items-center">
                <div className="h-4 bg-zinc-800 rounded w-1/4" />
                <div className="h-3 bg-zinc-800 rounded w-1/6" />
              </div>
              <div className="h-3 bg-zinc-850 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : handoffs.length === 0 ? (
        // Empty State
        <div className="py-12 px-6 flex flex-col items-center justify-center text-center">
          <div className="p-3.5 bg-zinc-900/40 rounded-full border border-white/5 mb-3.5 text-zinc-700">
            <Database className="w-6 h-6" />
          </div>
          <h4 className="text-xs font-bold text-zinc-400 mb-0.5">Timeline Is Empty</h4>
          <p className="text-[11px] text-zinc-500 max-w-[200px] leading-relaxed">
            Your saved notes will organize here in a high-contrast timeline. Try saving your first transformation!
          </p>
        </div>
      ) : (
        // Interactive timeline items
        <div className="space-y-4 relative">
          
          {/* Vertical line through timeline */}
          <div className="absolute left-4 top-2 bottom-8 w-px bg-white/5 z-0" />

          {handoffs.map((item, idx) => (
            <div
              key={item.id}
              onClick={() => onSelectHandoff(item.rawNotes, item.transformedContent, item.format, item.tone)}
              className="relative z-10 p-4 bg-zinc-900/20 hover:bg-zinc-900/60 border border-white/5 hover:border-indigo-500/20 rounded-xl flex items-start gap-4 transition duration-300 cursor-pointer group hover:shadow-lg hover:shadow-black/20"
            >
              {/* Vertical dot indicator */}
              <div className="mt-1 flex items-center justify-center w-8 h-8 rounded-full bg-zinc-900 border border-white/10 shrink-0 text-[10px] font-mono font-bold text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white group-hover:border-indigo-500 transition duration-300">
                {idx + 1}
              </div>

              {/* Handoff Details */}
              <div className="flex-1 space-y-1.5 text-left">
                <div className="flex flex-wrap gap-2 items-center justify-between">
                  <div className="flex gap-1.5 items-center">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-mono uppercase font-semibold border ${getFormatBadgeColor(item.format)}`}>
                      {item.format}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {item.tone}
                    </span>
                  </div>
                  
                  {/* Timestamp */}
                  <div className="flex items-center gap-1 text-[10px] text-zinc-500 font-mono">
                    <Calendar className="w-3 h-3 text-zinc-600" />
                    <span>{formatDate(item.createdAt)}</span>
                  </div>
                </div>

                <p className="text-xs text-zinc-400 group-hover:text-zinc-200 transition duration-200 line-clamp-2 pr-4 leading-relaxed">
                  {item.rawNotes || "No raw notes."}
                </p>

                {/* Micro control strip */}
                <div className="flex items-center justify-between pt-2 border-t border-white/5 mt-2 opacity-60 group-hover:opacity-100 transition duration-200">
                  <span className="text-[9px] font-mono text-zinc-600 flex items-center gap-1">
                    <Terminal className="w-2.5 h-2.5" />
                    <span>Click to edit</span>
                  </span>

                  <div className="flex items-center gap-2">
                    {/* Direct Copy Button */}
                    <button
                      onClick={(e) => handleCopy(e, item)}
                      title="Copy Output"
                      className={`p-1.5 rounded bg-zinc-950 border border-white/5 hover:border-white/10 transition cursor-pointer ${
                        copiedId === item.id ? "text-emerald-400" : "text-zinc-500 hover:text-white"
                      }`}
                    >
                      {copiedId === item.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    </button>

                    {/* Delete Item */}
                    <button
                      onClick={(e) => handleDelete(e, item)}
                      title="Delete Draft"
                      className="p-1.5 rounded bg-zinc-950 border border-white/5 hover:border-rose-500/20 hover:bg-rose-500/10 text-zinc-500 hover:text-rose-400 transition cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

              </div>

              {/* Indicator Arrow */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition duration-200 text-zinc-600">
                <ChevronRight className="w-4 h-4 text-indigo-400" />
              </div>

            </div>
          ))}

        </div>
      )}

    </div>
  );
});

HistoryFeed.displayName = "HistoryFeed";
