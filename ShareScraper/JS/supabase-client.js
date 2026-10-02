import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = "https://ccrrbqdqbtlvqpoekuir.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjcnJicWRxYnRsdnFwb2VrdWlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA5MjI1NjEsImV4cCI6MjEwNjQ5ODU2MX0.4ob6-3uiE18G58vHUx4EDSjhSkMtKM-ZmrP8HB20mnI";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: window.localStorage
  },
  realtime: { params: { eventsPerSecond: 10 } }
});
