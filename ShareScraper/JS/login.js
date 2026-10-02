import { loginWithGoogle } from './auth.js';

export function renderLogin(root) {
  root.innerHTML = '';

  const btn = document.createElement('button');
  btn.className = 'btn blue mb-12';
  btn.textContent = '🔵  Login dengan Google';

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    btn.textContent = '⏳ Redirecting...';
    try {
      await loginWithGoogle();
    } catch (err) {
      btn.disabled = false;
      btn.textContent = '🔵  Login dengan Google';
      alert(err.message || 'Login gagal');
    }
  });

  const wrap = document.createElement('div');
  wrap.className = 'login-wrap';
  wrap.innerHTML = `
    <div class="login-card">
      <div class="logo-big">SS</div>
      <div class="logo-sub">ScraperShare</div>
      <p class="login-desc">
        Platform sharing hasil scrape kamu ke publik. Real-time, gratis, buat komunitas.
      </p>
    </div>
  `;
  wrap.querySelector('.login-card').appendChild(btn);

  root.appendChild(wrap);
}
