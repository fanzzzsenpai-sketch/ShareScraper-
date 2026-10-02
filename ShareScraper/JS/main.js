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

supabase.auth.onAuthStateChange((event) => {
  console.log('Auth event:', event);
  if (['SIGNED_IN', 'SIGNED_OUT', 'USER_UPDATED'].includes(event)) {
    setTimeout(boot, 100);
  }
});

window.addEventListener('hashchange', () => {
  const path = location.hash.slice(1);
  if (path && !path.startsWith('access_token')) {
    window.dispatchEvent(new CustomEvent('ss:navigate', { detail: path }));
  }
});

boot();
