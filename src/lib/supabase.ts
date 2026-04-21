import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn("Supabase credentials missing from environment.");
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export type UserProfile = {
  id: string;
  email: string;
  full_name?: string;
  total_questions: number;
  created_at: string;
};

// Supabase User type from auth
export type SupabaseUser = {
  id: string;
  email?: string;
  full_name?: string;
};
