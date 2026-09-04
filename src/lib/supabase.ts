import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL || 'https://mdcgdjurerwzbdshtirc.supabase.co';
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kY2dkanVyZXJ3emJkc2h0aXJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4MDA3MTksImV4cCI6MjEwMTM3NjcxOX0.z6Xr2POz-ec34wCUPQmwPM78QfQlI1Jd9OGFHuDNeWg';

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export type AppUser = {
  id: string;
  email: string;
};
