import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const isConfigured = Boolean(url && anonKey);

const realClient: SupabaseClient | null = isConfigured
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

type AuthCallback = (event: string, session: unknown) => void;

const stubClient = {
  auth: {
    getSession: async () => ({ data: { session: null }, error: null }),
    onAuthStateChange: (_cb: AuthCallback) => ({
      data: { subscription: { unsubscribe: () => {} } },
    }),
    signInWithPassword: async () => ({
      data: { user: null, session: null },
      error: { message: 'Authentication is not configured.' } as never,
    }),
    signUp: async () => ({
      data: { user: null, session: null },
      error: { message: 'Authentication is not configured.' } as never,
    }),
    signInWithOtp: async () => ({
      data: { user: null, session: null },
      error: { message: 'Authentication is not configured.' } as never,
    }),
    verifyOtp: async () => ({
      data: { user: null, session: null },
      error: { message: 'Authentication is not configured.' } as never,
    }),
    signOut: async () => ({ error: null }),
  },
};

export const supabase = (realClient ?? stubClient) as SupabaseClient;

export type AppUser = {
  id: string;
  email: string;
};
