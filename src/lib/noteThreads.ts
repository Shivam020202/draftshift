// Thread grouping + fetching utilities for shift notes.
// Threads are derived at read time from the `threadId` field on each SavedNote
// (no separate collection).

import { SavedNote } from "@/lib/noteTypes";
import { isFirebaseEnabled, db } from "@/lib/firebase";
import { collection, query, where, orderBy, limit, getDocs } from "@firebase/firestore";
import { UserSession } from "@/context/AuthContext";

const LS_KEY = "draftshift_shift_notes";

// Stable shape used by both the sidebar (limit 10) and the modal (limit 50).
// Defaults fill in missing fields for legacy notes written before the
// tags / threading feature existed.
export function normalizeNote(raw: Record<string, unknown>): SavedNote {
  return {
    id: (raw.id as string) || `local-${Date.now()}`,
    content: (raw.content as string) || "",
    mode: (raw.mode as string) || "freeform",
    format: (raw.format as string) || "handover",
    createdAt: (raw.createdAt as string) || new Date().toISOString(),
    tags: (raw.tags as string[] | undefined) || [],
    threadId: ((raw.threadId as string | null | undefined) ?? null) as string | null,
    parentId: ((raw.parentId as string | null | undefined) ?? null) as string | null,
  };
}

function toIso(createdAt: unknown): string {
  if (!createdAt) return new Date().toISOString();
  if (typeof (createdAt as { toDate?: () => Date }).toDate === "function") {
    return (createdAt as { toDate: () => Date }).toDate().toISOString();
  }
  try {
    return new Date(createdAt as string).toISOString();
  } catch {
    return new Date().toISOString();
  }
}

// Shared fetch — branches on Firebase vs sandbox exactly the way the rest of
// the app does. Returns SavedNote[] sorted newest-first.
export async function fetchShiftNotes(
  user: UserSession,
  isFallbackMode: boolean,
  max: number = 50
): Promise<SavedNote[]> {
  if (!user) return [];

  try {
    if (!isFirebaseEnabled || isFallbackMode) {
      const raw = localStorage.getItem(LS_KEY) || "[]";
      const items: SavedNote[] = JSON.parse(raw).map((r: Record<string, unknown>) =>
        normalizeNote(r)
      );
      // Newest first; honor the requested cap.
      return items
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
        .slice(0, max);
    }

    const q = query(
      collection(db, "shift_notes"),
      where("uid", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(max)
    );
    const snapshot = await getDocs(q);
    const items: SavedNote[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      items.push(
        normalizeNote({
          ...data,
          id: docSnap.id,
          createdAt: toIso(data.createdAt)
        })
      );
    });
    return items;
  } catch (err) {
    console.error("fetchShiftNotes failed:", err);
    return [];
  }
}

// Fresh thread id — used when a new root is created or a reply is attached
// to a legacy note that has no threadId.
export function generateThreadId(): string {
  return `thread-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// Group flat notes by threadId. Notes without a threadId (legacy) are placed
// under a synthetic "__legacy__" bucket so they still appear in the UI.
export function groupByThread(notes: SavedNote[]): Map<string, SavedNote[]> {
  const groups = new Map<string, SavedNote[]>();
  for (const n of notes) {
    const key = n.threadId || "__legacy__";
    const arr = groups.get(key) || [];
    arr.push(n);
    groups.set(key, arr);
  }
  // Sort each thread chronologically (oldest first for display).
  for (const arr of groups.values()) {
    arr.sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
  }
  return groups;
}

// Notes that are the root of their thread (parentId null) — used to render
// the left pane of the modal.
export function getThreadRoots(notes: SavedNote[]): SavedNote[] {
  return notes
    .filter((n) => n.parentId == null)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

// Walk parent pointers from the root, returning root + every direct or
// indirect reply, in chronological order. Orphans (parentId pointing at a
// missing note) are silently skipped — v1 limitation.
export function getReplyChain(notes: SavedNote[], rootId: string): SavedNote[] {
  const byId = new Map(notes.map((n) => [n.id, n]));
  const root = byId.get(rootId);
  if (!root) return [];

  const chain: SavedNote[] = [root];
  const remaining = notes.filter((n) => n.id !== rootId);

  // Keep walking: at each step, find children whose parentId === the
  // previous tail of the chain. Flatten one level at a time so the visual
  // order is "root → next direct child → next direct child".
  let tail = root;
  const used = new Set<string>([rootId]);
  let progressed = true;
  while (progressed) {
    progressed = false;
    const child = remaining
      .filter((n) => n.parentId === tail.id && !used.has(n.id))
      .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))[0];
    if (child) {
      chain.push(child);
      used.add(child.id);
      tail = child;
      progressed = true;
    }
  }
  return chain;
}

// Re-parent children of a deleted note. Used when a thread root is deleted —
// promotes the oldest direct child to root and re-parents its siblings under
// it. Returns a new array with the updated notes (caller is responsible for
// persisting). The deleted note itself is NOT included in the output.
export function reparentAfterDelete(
  deletedId: string,
  notes: SavedNote[]
): SavedNote[] {
  const children = notes
    .filter((n) => n.parentId === deletedId)
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));

  if (children.length === 0) {
    return notes.filter((n) => n.id !== deletedId);
  }

  const [newRoot, ...siblings] = children;
  const updatedSiblings = siblings.map((s) => ({
    ...s,
    parentId: newRoot.id
  }));
  const updatedNewRoot: SavedNote = { ...newRoot, parentId: null };

  return notes
    .filter((n) => n.id !== deletedId && n.id !== newRoot.id && !siblings.some((s) => s.id === n.id))
    .concat(updatedNewRoot, updatedSiblings);
}

// Tiny helper — derive a stable color seed from a string id. Used for
// initials avatars in thread bubbles so colors are deterministic.
export function colorFromId(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0;
  }
  const hue = h % 360;
  return `hsl(${hue} 70% 45%)`;
}

// Initials for a tag, or a fallback. Used in reply bubbles.
export function initialsForTag(tag: string | null | undefined, fallback = "WS"): string {
  if (!tag) return fallback;
  const cleaned = tag.trim();
  if (!cleaned) return fallback;
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
