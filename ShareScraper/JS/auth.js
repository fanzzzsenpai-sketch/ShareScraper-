import { supabase } from './supabase-client.js';

export async function loginWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin + window.location.pathname,
      scopes: 'email profile'
    }
  });
  if (error) throw error;
}

export async function logout() {
  await supabase.auth.signOut();
  localStorage.clear();
  location.href = window.location.pathname;
}

export async function getCurrentUser() {
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return null;
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();
  
  if (profile) return profile;
  
  const username = user.email?.split('@')[0] || `user_${user.id.slice(0, 6)}`;
  const { data: newProfile, error } = await supabase
    .from('profiles')
    .insert({
      id: user.id,
      email: user.email,
      username,
      first_name: user.user_metadata?.full_name || username,
      last_name: user.user_metadata?.last_name || null,
      photo_url: user.user_metadata?.avatar_url || null,
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
