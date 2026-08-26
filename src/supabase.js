// Supabase integration skeleton
// Implements the sync model from docs/sincronizacao.html
//
// Structure:
// 1. Auth: Email + password for adults, PIN for kids (managed by adults)
// 2. Casa (house) — owned by casa, written by admins
// 3. Membros — self-editable, roles by admin
// 4. Events, Tasks, Items, Budgets, Health, Equipment — per spec
// 5. Write queue — offline changes enqueued, sync on reconnect
// 6. Real-time — only shopping list needs live updates
// 7. Files — invoices, health exams stored with signed URLs

const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key'; // From .env.local

// TODO: Initialize client
// import { createClient } from '@supabase/supabase-js';
// const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const supabaseAPI = {
  // Auth: Sign in adult or child (via PIN)
  signInAdult: async (email, password) => {
    // const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    // return { data, error };
    console.warn('Supabase not configured yet');
  },

  signInChild: async (houseName, childName, pin) => {
    // Resolve house ID from name, validate PIN for child
    // Return session token + house context
  },

  // Fetch initial state (read-only snapshot)
  fetchHouse: async (houseId) => {
    // Pull all tables: casa, membros, events, tasks, items, budget, health, equipment
    // filtered by visibility rules (RLS policies)
  },

  // Write queue: deferred writes that sync on reconnect
  enqueueWrite: async (table, operation, data) => {
    // operation: 'INSERT' | 'UPDATE' | 'DELETE'
    // Stored locally with timestamp + idempotency key
  },

  flushQueue: async () => {
    // Send all queued writes to server, retry with exponential backoff
  },

  // Real-time subscription (shopping list only, for now)
  subscribeToItems: (houseId, onUpdate) => {
    // Listen for item changes via Realtime channel
    // onUpdate({ type: 'INSERT'|'UPDATE'|'DELETE', data: item })
  },

  // File storage: invoices, health exams
  uploadFile: async (houseId, filePath, file) => {
    // Upload to storage bucket, return signed URL
  },

  downloadFile: async (signedUrl) => {
    // Fetch file from storage (already authenticated via signed URL)
  },

  signOut: async () => {
    // Clear session + local queue
  },
};

// Sync orchestrator
export const syncManager = {
  startSync: async (store, setState) => {
    // 1. Fetch initial snapshot via fetchHouse()
    // 2. Merge remote into local store (no conflicts for first sync)
    // 3. Flush any pending writes
    // 4. Subscribe to real-time channels
    // 5. Set up periodic sync (every 5-10 min if not realtime)
  },

  stopSync: () => {
    // Unsubscribe from channels, cancel timers
  },
};

// Row-level security policies (implemented on server, documented here)
const RLS_RULES = {
  casa: 'Admins only',
  membros: 'Self + admins for roles',
  events: 'Adults; private=author only',
  tasks: 'Adults define; all complete',
  items: 'All members',
  envelopes: 'Adults; budgets by admin',
  vault: 'Adults write; kids read',
  health: 'Adults see own; all see kids',
  equipments: 'Adults',
  files: 'Who uploaded + admin can read',
};
