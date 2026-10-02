import { supabase } from './supabase-client.js';

// ===== LOGIN GOOGLE =====
export async function loginWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
      scopes: 'email profile',
      queryParams: {
        access_type: 'offline',
        prompt: 'consent'
      }
    }
  });
  if (error) throw error;
}

// ===== LOGOUT =====
export async function logout() {
  await supabase.auth.signOut();
  localStorage.clear();
  window.location.href = window.location.origin;
}

// ===== AMBIL USER AKTIF =====
export async function getCurrentUser() {
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return null;

  // Cek profile di database
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (profile) return profile;

  // Belum ada → bikin profile baru
  const username = user.email?.split('@')[0] || `user_${user.id.slice(0, 6)}`;
  const { data: newProfile, error } = await supabase
    .from('profiles')
    .insert({
      id: user.id,
      email: user.email,
      username,
      first_name: user.user_metadata?.full_name || user.user_metadata?.name || username,
      last_name: user.user_metadata?.last_name || null,
      photo_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
      is_guest: false
    })
    .select()
    .single();

  if (error) {
    console.error('Gagal bikin profile:', error);
    return null;
  }
  return newProfile;
}
