/* walky: usable hiking planning without requiring a backend during development. */
const FALLBACK_ROUTES = [
  { id: 'bogd-khan-yagaan-sandal', name: 'Ягаан сандал', image: 'zurag/emoSandal.jpg', area: 'Богд хан уул', difficulty: 'Хөнгөн - Дунд', distanceKm: 4, elevationM: 480, timeHr: '1.5–2', durationHours: 2, season: '5-р сар – 10-р сар', status: 'Богино аялалд тохиромжтой', desc: 'Хотын хажууд, ой дундуур алхаж зураг авах болон амарч суухад тохиромжтой маршрут.', track: [[47.838254,106.890664],[47.838626,106.891865],[47.839131,106.89813],[47.843413,106.903208],[47.84981,106.900783],[47.854116,106.90151],[47.861016,106.903578]] },
  { id: 'bogd-khan-dugui-tsagaan', name: 'Дугуй цагаан', image: 'zurag/duguiTsagaan.jpg', area: 'Зайсан · Богд хан уул', difficulty: 'Хялбар', distanceKm: 3.5, elevationM: 400, timeHr: '1–1.5', durationHours: 1.5, season: 'Жилийн турш', status: 'Анхлан алхагчдад', desc: 'Зайсангаас эхлэх, ой мод ба хотын үзэмж хосолсон богино, ойлгомжтой алхалт.', track: [[47.832885691002, 106.90323888928656],[47.83670170132313, 106.9050817501095],[47.83936435552002, 106.90436334673844],[47.84798203847225, 106.90196114771634],[47.84995240649048, 106.90068051561903],[47.850832759494615, 106.90127397927388],[47.85406059278539, 106.90171126829155],[47.861102440542915, 106.90358536405668]] },
  { id: 'terelj-turtle-rock', name: 'Тэрэлж — Мэлхий хад', image: 'zurag/terelj.jpg', area: 'Горхи-Тэрэлж', difficulty: 'Хялбар', distanceKm: 5, elevationM: 90, timeHr: '1.5–2', durationHours: 2, season: 'Жилийн турш', status: 'Гэр бүлээрээ явахад', desc: 'Танил, тэгшхэн замтай, зураг авч байгальд гарах өдрийн хөнгөн сонголт.', track: [[47.90776211739745, 107.42272359697269],[47.90755649943039, 107.42351751895696],[ 47.907616975387846, 107.42425730989684]] },
  { id: 'bogd-khan-summit', name: 'Цэцээ гүн', image: 'zurag/tsetseeGun.jpg', area: 'Богд хан уул', difficulty: 'Дунд', distanceKm: 6, elevationM: 1100, timeHr: '4–5', durationHours: 5, season: '6-р сар – 9-р сар', status: 'Сайн бэлтгэл шаардлагатай', desc: 'Аялалын замд Манзуширын хийдийн түүхийн дурсгал, музей, амьтан, ургамал, Манзуширын гол зэрэг байгалийн сайхныг мэдэрч, түүхийн дурсгалт, төрийн тахилгат Цэцээ гүний ноён оргил хүрнэ..', track: [[47.80829589687586, 107.00250134653953],[47.80622118144706, 107.00227763432942],[47.79818108673404, 106.99917604385213],[47.79463981962129, 106.99917906967447],[47.79212077774624, 107.00031917915896],[47.78920987629669, 107.00055426348179],[47.78339264729877, 107.00237944424512],[47.78200821708559, 107.00249812791034],[47.7764488085867, 107.00177009833101],[47.77417400620167, 107.00129493404256],[47.77149046020959, 107.00072044478436],[47.76971622441126, 106.99938328071103],[47.76674035755306, 106.99762563578616],[47.76566811108079, 106.99531167418306],[47.7647018920567, 106.99292759254106]] },
  { id: 'tenger-rock', name: 'Тэнгэр хад', image: 'zurag/tengerHad.jpg', area: 'Богд хан уул', difficulty: 'Дунд', distanceKm: 8, elevationM: 300, timeHr: '3–4', durationHours: 4, season: 'Жилийн турш', status: 'Өдрийн адал явдал', desc: 'Уулын зам, ой мод, хад асгыг нэг өдрийн дотор мэдрэх илүү урт сонголт.', track: [[47.92,106.92],[47.93,106.93],[47.94,106.94]] }
];

let ROUTES = [...FALLBACK_ROUTES];
window.ROUTES = ROUTES;

function setRoutes(routes) {
  if (!Array.isArray(routes) || !routes.length) return;
  ROUTES = routes.map((route) => ({
    ...route,
    durationHours: route.durationHours || Number.parseFloat(route.timeHr) || 2,
    // Firestore arrays cannot contain arrays; cloud tracks use coordinate maps.
    track: Array.isArray(route.track) ? route.track.map((point) => Array.isArray(point) ? point : [point?.latitude, point?.longitude])
      .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) : []
  }));
  window.ROUTES = ROUTES;
  window.dispatchEvent(new Event('routes:updated'));
  window.dispatchEvent(new Event('routes:ready'));
}

function initMobileNav() {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.primary-nav');
  if (!toggle || !nav || toggle.dataset.ready) return;
  toggle.dataset.ready = 'true';
  toggle.addEventListener('click', () => {
    const open = !nav.classList.contains('open');
    nav.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? '×' : '☰';
  });
}

function initAccount() {
  const header = document.querySelector('.site-header .wrap');
  if (!header || document.querySelector('#account-area')) return;

  const account = document.createElement('div');
  account.className = 'account-area';
  account.id = 'account-area';
  account.innerHTML = `
    <button class="sign-in-button" id="sign-in-button" type="button"><span class="google-mark">G</span><span>Нэвтрэх</span></button>
    <div class="profile-wrap" id="profile-wrap" hidden>
      <button class="profile-button" id="profile-button" type="button" aria-expanded="false" aria-controls="profile-menu">
        <img id="profile-image" alt=""><span id="profile-name"></span><span class="profile-chevron">⌄</span>
      </button>
      <div class="profile-menu" id="profile-menu" hidden>
        <div class="profile-summary"><strong id="profile-menu-name"></strong><span id="profile-email"></span></div>
        <a href="my-hikes.html" class="profile-saved-link">♡ Миний алхалтууд</a>
        <button type="button" id="sign-out-button">Гарах</button>
      </div>
    </div>
    <p class="auth-message" id="auth-message" role="status" hidden></p>`;
  header.appendChild(account);

  const signInButton = account.querySelector('#sign-in-button');
  const profileWrap = account.querySelector('#profile-wrap');
  const profileButton = account.querySelector('#profile-button');
  const profileMenu = account.querySelector('#profile-menu');
  const message = account.querySelector('#auth-message');
  const showMessage = (text, shouldDismiss = false) => {
    message.textContent = text;
    message.hidden = false;
    if (shouldDismiss) window.setTimeout(() => { message.hidden = true; }, 5000);
  };
  const render = (user) => {
    const isSignedInWithGoogle = Boolean(user && !user.isAnonymous);
    signInButton.hidden = isSignedInWithGoogle;
    profileWrap.hidden = !isSignedInWithGoogle;
    if (!isSignedInWithGoogle) return;
    const displayName = user.displayName || user.email?.split('@')[0] || 'Алхагч';
    account.querySelector('#profile-name').textContent = displayName;
    account.querySelector('#profile-menu-name').textContent = displayName;
    account.querySelector('#profile-email').textContent = user.email || '';
    const image = account.querySelector('#profile-image');
    image.src = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=d5e681&color=153d2e`;
    image.alt = `${displayName}-ийн профайл`;
  };

  signInButton.addEventListener('click', async () => {
    signInButton.disabled = true;
    signInButton.querySelector('span:last-child').textContent = 'Нэвтэрч байна…';
    message.hidden = true;
    try { await window.WalkyStore?.signInWithGoogle(); }
    catch (error) {
      const errors = {
        'auth/unauthorized-domain': 'Энэ домэйн Firebase-д зөвшөөрөгдөөгүй байна. Firebase Authentication → Settings → Authorized domains хэсэгт localhost (эсвэл байршуулсан сайтын домэйн)-оо нэмээрэй.',
        'auth/operation-not-allowed': 'Firebase Authentication дээр Google sign-in provider идэвхгүй байна.',
        'auth/popup-blocked': 'Хөтөч Google нэвтрэх попапыг хаалаа. Попапыг зөвшөөрөөд дахин оролдоорой.',
        'auth/popup-closed-by-user': 'Google нэвтрэх цонх хаагдсан байна. Дахин оролдоорой.',
        'auth/cancelled-popup-request': 'Нэвтрэх хүсэлт цуцлагдсан. Дахин оролдоорой.'
      };
      showMessage(errors[error.code] || `Нэвтрэхэд асуудал гарлаа: ${error.message || 'дахин оролдоорой.'}`);
    } finally {
      signInButton.disabled = false;
      signInButton.querySelector('span:last-child').textContent = 'Нэвтрэх';
    }
  });
  profileButton.addEventListener('click', () => {
    const isOpen = !profileMenu.hidden;
    profileMenu.hidden = isOpen;
    profileButton.setAttribute('aria-expanded', String(!isOpen));
  });
  account.querySelector('#sign-out-button').addEventListener('click', async () => {
    await window.WalkyStore?.signOut();
    profileMenu.hidden = true;
  });
  document.addEventListener('click', (event) => {
    if (!account.contains(event.target)) { profileMenu.hidden = true; profileButton.setAttribute('aria-expanded', 'false'); }
  });
  window.WalkyStore?.onAuthStateChanged?.(render);
}

function formatDifficulty(difficulty) {
  if (difficulty === 'Хялбар') return 'easy';
  if (difficulty.includes('Дунд')) return 'moderate';
  return 'hard';
}

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function routeCardHTML(route, includeSave = true) {
  const r = Object.fromEntries(Object.entries(route).map(([key, value]) => [key, escapeHTML(value)]));
  const image = /^(https:\/\/|zurag\/)[^\s]+$/i.test(route.image || '') ? r.image : 'zurag/bogdGorhi.jpg';
  return `<article class="route-card">
    <a class="route-card-link" href="route-detail.html?id=${encodeURIComponent(route.id)}" aria-label="${r.name} дэлгэрэнгүй">
      <div class="route-thumb">
        <img src="${image}" alt="" loading="lazy">
        <span class="route-area">${r.area || 'Улаанбаатар орчим'}</span>
        <span class="diff ${formatDifficulty(String(route.difficulty || ''))}">${r.difficulty}</span>
      </div>
      <div class="route-body">
        <p class="route-status">${r.status || 'Маршрут'}</p>
        <h3>${r.name}</h3>
        <p>${r.desc}</p>
        <div class="route-stats"><span>↔ <b>${r.distanceKm}</b> км</span><span>↗ <b>${r.elevationM}</b> м</span><span>◷ <b>${r.timeHr}</b> цаг</span></div>
      </div>
    </a>
    ${includeSave ? `<button class="save-route" data-route-id="${r.id}" data-route-name="${r.name}" type="button" aria-label="${r.name} хадгалах">♡ <span>Хадгалах</span></button>` : ''}
  </article>`;
}

function getSavedRouteIds() {
  return Object.entries(window.WalkyHikes.getState().items).filter(([, hike]) => hike.status !== 'removed').map(([id]) => id);
}

function updateSaveButtons() {
  const saved = getSavedRouteIds();
  document.querySelectorAll('.save-route').forEach((button) => {
    const isSaved = saved.includes(button.dataset.routeId);
    button.disabled = !window.WalkyHikes.getState().ready;
    button.classList.toggle('saved', isSaved);
    button.setAttribute('aria-pressed', String(isSaved));
    button.setAttribute('aria-label', `${button.dataset.routeName} ${isSaved ? 'хадгалалтаас хасах' : 'хадгалах'}`);
    button.innerHTML = isSaved ? '♥ <span>Хадгалсан</span>' : '♡ <span>Хадгалах</span>';
  });
}

function bindSaveButtons() {
  document.querySelectorAll('.save-route').forEach((button) => {
    if (button.dataset.ready) return;
    button.dataset.ready = 'true';
    button.addEventListener('click', () => {
      const id = button.dataset.routeId;
      const saved = getSavedRouteIds();
      window.WalkyHikes.setStatus(id, saved.includes(id) ? 'removed' : 'saved');
      updateSaveButtons();
    });
  });
}

function renderRoutes(list = ROUTES, targetSelector = '#route-grid') {
  const target = document.querySelector(targetSelector);
  if (!target) return;
  target.innerHTML = list.length ? list.map((route) => routeCardHTML(route)).join('') : '<div class="empty-state"><strong>Тохирох маршрут олдсонгүй.</strong><span>Хайлтаа эсвэл шүүлтүүрээ өөрчилж үзээрэй.</span></div>';
  bindSaveButtons();
  updateSaveButtons();
}

function initExplore() {
  const search = document.querySelector('#search-input');
  const difficulty = document.querySelector('#difficulty-filter');
  const duration = document.querySelector('#duration-filter');
  const count = document.querySelector('#route-count');
  const applyFilters = () => {
    const query = (search?.value || '').trim().toLowerCase();
    const selectedDifficulty = difficulty?.value || '';
    const selectedDuration = duration?.value || '';
    const filtered = ROUTES.filter((route) => {
      const searchable = `${route.name} ${route.desc} ${route.area}`.toLowerCase();
      return (!query || searchable.includes(query)) && (!selectedDifficulty || route.difficulty === selectedDifficulty) && (!selectedDuration || route.durationHours <= Number(selectedDuration));
    });
    renderRoutes(filtered);
    if (count) count.textContent = `${filtered.length} маршрут`;
  };
  [search, difficulty, duration].forEach((input) => input?.addEventListener('input', applyFilters));
  window.addEventListener('routes:updated', applyFilters);
  applyFilters();
}

function initHome() {
  renderRoutes(ROUTES.slice(0, 3));
  window.addEventListener('routes:updated', () => renderRoutes(ROUTES.slice(0, 3)));
}

document.addEventListener('DOMContentLoaded', async () => {
  initMobileNav();
  initAccount();
  window.WalkyHikes.subscribe(updateSaveButtons);
  if (document.body.dataset.page === 'home') initHome();
  if (document.body.dataset.page === 'explore') initExplore();
  if (['home', 'explore', 'my-hikes', 'detail'].includes(document.body.dataset.page) && window.WalkyStore?.loadRoutes) {
    const remoteRoutes = await window.WalkyStore.loadRoutes();
    if (remoteRoutes?.length) setRoutes(remoteRoutes);
  }
});
