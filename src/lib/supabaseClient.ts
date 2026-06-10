// Supabase client stub.
//
// To activate:
//   1. pnpm add @supabase/supabase-js
//   2. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local
//   3. Uncomment the block below and remove the null export
//
// import { createClient } from '@supabase/supabase-js';
//
// const url = import.meta.env.VITE_SUPABASE_URL as string;
// const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
//
// if (!url || !key) {
//   throw new Error('Missing Supabase env vars: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
// }
//
// export const supabase = createClient(url, key);

// Attempt to create a Supabase client if VITE env vars are present. Keep a null
// fallback so local dev without env vars doesn't crash the app.
import { createClient } from "@supabase/supabase-js";

const url = (import.meta.env.VITE_SUPABASE_URL as string) || "";
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || "";

let _supabase = null as any;
if (url && key) {
	try {
		_supabase = createClient(url, key);
	} catch (e) {
		// If client creation fails, leave as null and allow the app to fallback
		// to static data.
		// eslint-disable-next-line no-console
		console.error("Failed to create Supabase client:", e);
		_supabase = null;
	}
}

export const supabase = _supabase;
