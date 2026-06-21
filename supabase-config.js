/**
 * YaarBuzz - Supabase Configuration
 * Centralized Supabase client initialization for auth, database, and storage
 *
 * IMPORTANT: For SMS OTP to work, you must configure an SMS provider in Supabase:
 * 1. Go to your Supabase project dashboard
 * 2. Navigate to Authentication > Providers > Phone
 * 3. Configure an SMS provider (Twilio, MessageBird, Vonage, or Textlocal)
 * 4. Without an SMS provider, phone OTP will not be delivered
 */

const SUPABASE_URL = 'https://jcosligfinwwcbzcrryn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impjb3NsaWdmaW53d2NiemNycnluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzNDM4OTEsImV4cCI6MjA5NjkxOTg5MX0.k8P5k7vrEl2hzornICagBXoLtlpqmmgvaYQE4l_aUhI';

// Initialize Supabase client with enhanced configuration
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    storage: window.localStorage,
    detectSessionInUrl: true,
    flowType: 'pkce' // More secure than implicit flow
  },
  global: {
    headers: {
      'x-client-info': 'yaarbuzz-web'
    }
  }
});

// Export for global access
window.supabase = supabase;
window.db = supabase;

// Helper to check session validity
window.isSessionValid = async function() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.error('[Supabase] Session check error:', error);
      return false;
    }
    if (!session) {
      return false;
    }
    // Check if token is expired
    const expiresAt = session.expires_at;
    if (expiresAt && expiresAt * 1000 < Date.now()) {
      // Token expired, try to refresh
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        console.error('[Supabase] Token refresh failed:', refreshError);
        return false;
      }
    }
    return true;
  } catch (e) {
    console.error('[Supabase] Session validation error:', e);
    return false;
  }
};

// Helper to get current user ID
window.getCurrentUserId = async function() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
};

console.log('[Supabase] Client initialized successfully');
console.log('[Supabase] SMS OTP requires SMS provider configuration in Supabase dashboard');
