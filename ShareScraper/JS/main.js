import { supabase } from './supabase-client.js';
import { getCurrentUser } from './auth.js';
import { renderLogin } from './login.js';
import { bootApp } from './app.js';

const root = document.getElementById('app');
let booting = false;

async function boot() {
  if (booting) return;
  booting = true;
  try {
    const user = await getCurrentUser();
    if (!user) {
      renderLogin(root);
      return;
    }
    bootApp(root, user);
  } catch (err) {
    console.error('Boot error:', err);
    renderLogin(root);
  } finally {
    booting = false;
  }
}

// ===== BERSIHIN URL DARI TOKEN =====
function cleanUrl() {
  const hash = window.location.hash;
  if (
    hash &&
    (hash.includes('access_token') ||
     hash.includes('refresh_token') ||
     hash.includes('error_description'))
  ) {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }
}

// ===== AUTH STATE LISTENER =====
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth event:', event);

  if (event === 'SIGNED_IN') {
    cleanUrl();
    setTimeout(boot, 100);
  } else if (event === 'SIGNED_OUT') {
    setTimeout(boot, 100);
  } else if (event === 'USER_UPDATED') {
    setTimeout(boot, 100);
  } else if (event === 'TOKEN_REFRESHED') {
    // diem aja, gak perlu render ulang
  }
});

// ===== HANDLE HASH CHANGE (navigasi manual) =====
window.addEventListener('hashchange', () => {
  const hash = window.location.hash.slice(1);
  // Skip kalau itu token OAuth
  if (
    hash &&
    !hash.includes('access_token') &&
    !hash.includes('refresh_token') &&
    !hash.includes('error_description')
  ) {
    window.dispatchEvent(new CustomEvent('ss:navigate', { detail: hash }));
  }
});

// ===== CEK URL AWAL — kalau ada token, biarin Supabase proses dulu =====
(async function init() {
  const hash = window.location.hash;
  const hasToken = hash.includes('access_token') || hash.includes('refresh_token');

  if (hasToken) {
    // Kasih waktu Supabase parse token dulu
    setTimeout(async () => {
      cleanUrl();
      await boot();
    }, 500);
  } else {
    // Langsung boot
    await boot();
  }
})();
