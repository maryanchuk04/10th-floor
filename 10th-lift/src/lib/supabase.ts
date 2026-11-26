import { createClient } from "@supabase/supabase-js";

export const supabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:54321",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "missing-key",
  {
    auth: {
      persistSession: true, // keep the session in localStorage across restarts
      autoRefreshToken: true, // silently renew the access token
      detectSessionInUrl: true,
      storageKey: "10thlift-auth",
    },
  },
);

export type Status = "working" | "broken";

export type Elevator = {
  id: number;
  name: string | null;
  status: Status;
  status_changed_at: string;
};

export const elevatorLabel = (e: { id: number; name?: string | null } | undefined, fallbackPrefix: string, id?: number) =>
  e?.name?.trim() || `${fallbackPrefix} ${e?.id ?? id}`;

export type Report = {
  id: string;
  elevator_id: number;
  user_name: string;
  kind: Status;
  comment: string | null;
  changed: boolean;
  created_at: string;
};
