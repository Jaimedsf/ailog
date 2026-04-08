import { createClient } from '@supabase/supabase-js';

const SURL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SKEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SURL || !SKEY) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in environment variables.");
}

export const db = createClient(SURL, SKEY);
