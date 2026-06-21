// Shared types for shift notes + threads.
// Lives in src/lib so both components and util modules can import without
// circular dependencies.

export interface SavedNote {
  id: string;
  content: string;
  mode: string; // "freeform" | "guided"
  format: string; // "handover" | "standup" | "release-notes" | "email" | "shift-notes"
  createdAt: string;
  // Thread + tagging fields — all optional at read time so legacy notes
  // written before this feature still parse correctly.
  tags?: string[];
  threadId?: string | null;
  parentId?: string | null;
}
