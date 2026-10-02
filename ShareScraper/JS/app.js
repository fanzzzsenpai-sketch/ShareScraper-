import { renderHome, renderShare, renderProfile, renderSearch } from './scraper.js';
import { logout } from './auth.js';

let currentUser = null;
let rootEl = null;
let initialized = false;

const routes = {
  home: () => renderHome(rootEl, currentUser),
  share: () => renderShare(rootEl, currentUser),
  profile: (id) => renderProfile(rootEl, id || currentUser.id),
  search: () => renderSearch(rootEl, currentUser)
};

export function navigate(path, ...args) {
  location.hash = path;
  renderRoute(path, ...args);
}

function renderRoute(path, ...args) {
  const fn = routes[path] || routes.home;
  fn(...args);
}

export function bootApp(root, user) {
  rootEl = root;
  currentUser = user;
  
  const initial = location.hash.slice(1) || 'home';
  renderRoute(initial);
  
  if (!initialized) {
    initialized = true;
    window.addEventListener('ss:navigate', (e) => {
      renderRoute(e.detail);
    });
  }
}

export function getCurrentUserRef() {
  return currentUser;
}
