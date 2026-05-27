/**
 * Supabase Client Configuration
 * Handles authentication and database operations via Supabase
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // No persistent session on server
    autoRefreshToken: false, // No auto refresh on server
  },
});

console.log("[Supabase] Client initialized with URL:", supabaseUrl);
