import { renderHome, renderShare, renderProfile, renderSearch } from './scraper.js';

let currentUser = null;
let rootEl = null;
let listenerAttached = false;

const routes = {
  home:    () => renderHome(rootEl, currentUser),
  share:   () => renderShare(rootEl, currentUser),
  profile: (id) => renderProfile(rootEl, id || currentUser.id),
  search:  () => renderSearch(rootEl, currentUser)
};

export function navigate(path, ...args) {
  window.location.hash = path;
  renderRoute(path, ...args);
}

function renderRoute(path, ...args) {
  const fn = routes[path] || routes.home;
  fn(...args);
}

export function bootApp(root, user) {
  rootEl = root;
  currentUser = user;

  const initial = window.location.hash.slice(1) || 'home';
  const safeInitial = initial.includes('access_token') ? 'home' : initial;
  renderRoute(safeInitial);

  if (!listenerAttached) {
    listenerAttached = true;
    window.addEventListener('ss:navigate', (e) => {
      renderRoute(e.detail);
    });
  }
}
