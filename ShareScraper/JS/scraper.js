import { supabase } from './supabase-client.js';
import { logout } from './auth.js';
import { navigate } from './app.js';

// ================== UTILS ==================
function el(tag, props = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') n.className = v;
    else if (k === 'html') n.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function')
      n.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v != null) n.setAttribute(k, v);
  }
  kids.flat().forEach(c => n.append(c instanceof Node ? c : document.createTextNode(c)));
  return n;
}

function timeAgo(d) {
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60) return 'baru aja';
  if (s < 3600) return Math.floor(s/60) + 'm';
  if (s < 86400) return Math.floor(s/3600) + 'j';
  if (s < 604800) return Math.floor(s/86400) + 'h';
  return new Date(d).toLocaleDateString('id-ID');
}

function initials(name = '?') {
  return name.trim().slice(0, 2).toUpperCase() || '?';
}

// ================== BOTTOM NAV ==================
function renderNav(root, user, active = 'home') {
  root.querySelector('.nav')?.remove();

  const homeBtn = el('button', {
    class: 'nav-btn' + (active === 'home' ? ' active' : ''),
    onclick: () => navigate('home')
  }, el('span', { class: 'emoji' }, '🏠'), 'Home');

  const fabBtn = el('button', {
    class: 'fab',
    onclick: () => navigate('share')
  }, '+');

  const profileBtn = el('button', {
    class: 'nav-btn' + (active === 'profile' ? ' active' : ''),
    onclick: () => navigate('profile', user.id)
  }, el('span', { class: 'emoji' }, '👤'), user.username || 'Profil');

  // Long press logout
  let timer;
  const startPress = () => timer = setTimeout(() => {
    if (confirm('Logout dari ScraperShare?')) logout();
  }, 800);
  const cancelPress = () => clearTimeout(timer);
  ['mousedown','touchstart'].forEach(e => profileBtn.addEventListener(e, startPress));
  ['mouseup','touchend','mouseleave'].forEach(e => profileBtn.addEventListener(e, cancelPress));

  const nav = el('div', { class: 'nav' }, homeBtn, fabBtn, profileBtn);
  root.append(nav);
}

// ================== HOME FEED ==================
export async function renderHome(root, user) {
  root.innerHTML = '';

  const header = el('div', { class: 'header' },
    el('h1', {}, '🏠 Feed Publik'),
    el('button', {
      class: 'icon-btn',
      onclick: () => navigate('search')
    }, '🔍')
  );

  const feed = el('div', { class: 'feed' },
    el('div', { class: 'empty' }, 'Loading...')
  );

  root.append(header, feed);
  renderNav(root, user, 'home');

  const { data, error } = await supabase
    .from('scrapes')
    .select('*, profiles:user_id (id, username, first_name, photo_url)')
    .order('created_at', { ascending: false })
    .limit(50);

  feed.innerHTML = '';
  if (error || !data?.length) {
    feed.append(el('div', { class: 'empty' }, 'Belum ada scrape. Jadilah yang pertama! 🚀'));
  } else {
    data.forEach(row => feed.append(buildCard(row, user)));
  }

  // Realtime subscription
  supabase
    .channel('scrapes-stream')
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'scrapes' },
      async (payload) => {
        const { data: full } = await supabase
          .from('scrapes')
          .select('*, profiles:user_id (id, username, first_name, photo_url)')
          .eq('id', payload.new.id)
          .single();
        if (full) {
          feed.querySelector('.empty')?.remove();
          feed.prepend(buildCard(full, user, true));
        }
      })
    .subscribe();
}

function buildCard(row, user, animate = false) {
  const p = row.profiles || {};
  const name = p.first_name || p.username || 'Anon';

  return el('div', {
    class: 'card',
    'data-id': row.id,
    style: animate ? 'animation:fadeIn .3s' : ''
  },
    el('div', { class: 'user' },
      p.photo_url
        ? el('img', { class: 'avatar', src: p.photo_url })
        : el('div', { class: 'avatar' }, initials(name)),
      el('div', { style: 'flex:1' },
        el('div', { class: 'name' }, name),
        el('div', { class: 'time' }, timeAgo(row.created_at))
      ),
      el('button', {
        class: 'icon-btn',
        style: 'width:32px;height:32px;font-size:14px',
        onclick: () => navigate('profile', p.id)
      }, '→')
    ),
    el('h3', {}, row.title),
    row.description ? el('p', {}, row.description) : null,
    row.preview_image
      ? el('img', { class: 'preview', src: row.preview_image, loading: 'lazy' })
      : null,
    row.tags?.length
      ? el('div', { class: 'tags' },
          ...row.tags.map(t => el('span', { class: 'tag' }, '#' + t)))
      : null,
    el('div', { class: 'actions' },
      el('button', {
        style: 'background:var(--pink)',
        onclick: async (e) => {
          const { error } = await supabase.from('likes')
            .insert({ user_id: user.id, scrape_id: row.id });
          if (!error) {
            e.target.textContent = `❤️ ${(row.likes || 0) + 1}`;
          }
        }
      }, `❤️ ${row.likes || 0}`),
      el('button', {
        style: 'background:var(--blue)',
        onclick: () => {
          navigator.clipboard.writeText(row.url);
          alert('Link dicopy!');
        }
      }, '🔗 Buka')
    )
  );
}

// ================== SHARE ==================
export function renderShare(root, user) {
  root.innerHTML = '';

  const form = el('form', {
    class: 'modal',
    onsubmit: async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const title = fd.get('title').trim();
      const url = fd.get('url').trim();

      if (!title || !url) return alert('Judul & URL wajib diisi');

      const submitBtn = form.querySelector('button[type=submit]');
      submitBtn.disabled = true;
      submitBtn.textContent = '⏳ Nyimpen...';

      const { error } = await supabase.from('scrapes').insert({
        user_id: user.id,
        title,
        description: fd.get('description').trim() || null,
        url,
        tags: fd.get('tags').split(',').map(t => t.trim()).filter(Boolean),
        preview_image: fd.get('preview').trim() || null
      });

      if (error) {
        alert('Gagal: ' + error.message);
        submitBtn.disabled = false;
        submitBtn.textContent = '🚀 Share Sekarang';
        return;
      }

      alert('Berhasil di-share! 🎉');
      navigate('home');
    }
  },
    el('h2', {}, '📤 Share Scrape'),
    el('div', { class: 'field' },
      el('label', {}, 'Judul *'),
      el('input', { name: 'title', required: '', placeholder: 'Judul scrape kamu' })
    ),
    el('div', { class: 'field' },
      el('label', {}, 'URL *'),
      el('input', { name: 'url', required: '', placeholder: 'https://...', type: 'url' })
    ),
    el('div', { class: 'field' },
      el('label', {}, 'Deskripsi'),
      el('textarea', { name: 'description', rows: '3', placeholder: 'Ceritain dikit...' })
    ),
    el('div', { class: 'field' },
      el('label', {}, 'Tags (pisahkan pake koma)'),
      el('input', { name: 'tags', placeholder: 'scrape, tutorial, api' })
    ),
    el('div', { class: 'field' },
      el('label', {}, 'URL Preview Gambar (opsional)'),
      el('input', { name: 'preview', placeholder: 'https://.../image.jpg', type: 'url' })
    ),
    el('button', {
      type: 'submit',
      class: 'btn green',
      style: 'margin-top:8px'
    }, '🚀 Share Sekarang'),
    el('button', {
      type: 'button',
      class: 'btn ghost',
      style: 'margin-top:8px',
      onclick: () => navigate('home')
    }, 'Batal')
  );

  root.append(el('div', { class: 'modal-back' }, form));
  renderNav(root, user, 'home');
}

// ================== PROFILE ==================
export async function renderProfile(root, userId) {
  root.innerHTML = '';

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', userId).single();

  const { data: scrapes } = await supabase
    .from('scrapes').select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  const name = profile?.first_name || profile?.username || 'Anon';

  const header = el('div', { class: 'profile-header' },
    profile?.photo_url
      ? el('img', { class: 'big-avatar', src: profile.photo_url })
      : el('div', { class: 'big-avatar' }, initials(name)),
    el('h2', {}, name),
    el('div', { class: 'handle' }, '@' + (profile?.username || 'anon')),
    el('div', { class: 'stats' },
      el('div', {},
        el('div', { class: 'num' }, String(scrapes?.length || 0)),
        el('div', { class: 'lbl' }, 'Scrapes')
      )
    ),
    el('button', {
      class: 'btn ghost',
      style: 'margin-top:14px;padding:8px 16px;width:auto',
      onclick: () => navigate('home')
    }, '← Kembali')
  );

  const feed = el('div', { class: 'feed' });
  if (!scrapes?.length) {
    feed.append(el('div', { class: 'empty' }, 'Belum ada scrape 😴'));
  } else {
    scrapes.forEach(s => feed.append(buildCard({ ...s, profiles: profile })));
  }

  root.append(header, feed);
}

// ================== SEARCH ==================
export function renderSearch(root, user) {
  root.innerHTML = '';

  const input = el('input', { placeholder: 'Cari scrape...', type: 'search' });
  const results = el('div', { class: 'feed' },
    el('div', { class: 'empty' }, 'Ketik sesuatu buat nyari 🔍')
  );

  const header = el('div', { class: 'header' },
    el('button', {
      class: 'icon-btn',
      onclick: () => navigate('home')
    }, '←'),
    el('h1', {}, '🔍 Cari Scrape')
  );

  const bar = el('div', { class: 'search-bar' }, input);

  async function doSearch() {
    const q = input.value.trim();
    if (!q) {
      results.innerHTML = '';
      results.append(el('div', { class: 'empty' }, 'Ketik sesuatu buat nyari 🔍'));
      return;
    }

    results.innerHTML = '';
    results.append(el('div', { class: 'empty' }, 'Nyari...'));

    const { data } = await supabase
      .from('scrapes')
      .select('*, profiles:user_id (id, username, first_name, photo_url)')
      .or(`title.ilike.%${q}%,description.ilike.%${q}%`)
      .order('created_at', { ascending: false })
      .limit(30);

    results.innerHTML = '';
    if (!data?.length) {
      results.append(el('div', { class: 'empty' }, 'Gak ada hasil 😢'));
    } else {
      data.forEach(r => results.append(buildCard(r, user)));
    }
  }

  let timer;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(doSearch, 400);
  });

  root.append(header, bar, results);
  renderNav(root, user, 'search');
}
