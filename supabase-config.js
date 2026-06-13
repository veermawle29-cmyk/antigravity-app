/**
 * YaarBuzz - Supabase Configuration
 * Centralized Supabase client initialization for auth, database, and storage
 */

const SUPABASE_URL = 'https://jcosligfinwwcbzcrryn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impjb3NsaWdmaW53d2NiemNycnluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzNDM4OTEsImV4cCI6MjA5NjkxOTg5MX0.k8P5k7vrEl2hzornICagBXoLtlpqmmgvaYQE4l_aUhI';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    storage: window.localStorage,
    detectSessionInUrl: true
  }
});

// Export for global access
window.supabase = supabase;
window.db = supabase;

console.log('[Supabase] Client initialized successfully');
