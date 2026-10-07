/* walky: usable hiking planning without requiring a backend during development. */
const FALLBACK_ROUTES = [
  { id: 'bogd-khan-yagaan-sandal', name: 'Ягаан сандал', image: 'zurag/emoSandal.jpg', area: 'Богд хан уул', difficulty: 'Хөнгөн - Дунд', distanceKm: 4, elevationM: 480, timeHr: '1.5–2', durationHours: 2, season: '5-р сар – 10-р сар', status: 'Хэсэгхэн салхинд гарахад', desc: 'Хотын ойролцоо ой дундуур алхаж, түр амарч суух жим. Ягаан сандал дээр түр тухалж, зураг авч болно.', track: [[47.838254,106.890664],[47.838626,106.891865],[47.839131,106.89813],[47.843413,106.903208],[47.84981,106.900783],[47.854116,106.90151],[47.861016,106.903578]] },
  { id: 'bogd-khan-dugui-tsagaan', name: 'Дугуй цагаан', image: 'zurag/duguiTsagaan.jpg', area: 'Зайсан · Богд хан уул', difficulty: 'Хялбар', distanceKm: 3.5, elevationM: 400, timeHr: '1–1.5', durationHours: 1.5, season: 'Жилийн турш', status: 'Алхаж эхэлж байгаа хүмүүст', desc: 'Зайсангаас эхэлж, ой дундуур өгсөх богино жим. Дугуй цагаанд хүрээд хотоо дээрээс нь харан амраарай.', track: [[47.832885691002, 106.90323888928656],[47.83670170132313, 106.9050817501095],[47.83936435552002, 106.90436334673844],[47.84798203847225, 106.90196114771634],[47.84995240649048, 106.90068051561903],[47.850832759494615, 106.90127397927388],[47.85406059278539, 106.90171126829155],[47.861102440542915, 106.90358536405668]] },
  { id: 'terelj-turtle-rock', name: 'Тэрэлж — Мэлхий хад', image: 'zurag/terelj.jpg', area: 'Горхи-Тэрэлж', difficulty: 'Хялбар', distanceKm: 5, elevationM: 90, timeHr: '1.5–2', durationHours: 2, season: 'Жилийн турш', status: 'Гэр бүлээрээ явахад', desc: 'Тэрэлжид салхинд гарахдаа Мэлхий хадны орчмоор тайван алхаарай. Харьцангуй тэгш замтай, гэр бүлээрээ зугаалж, зураг авахад тохиромжтой.', track: [[47.90776211739745, 107.42272359697269],[47.90755649943039, 107.42351751895696],[ 47.907616975387846, 107.42425730989684]] },
  { id: 'bogd-khan-summit', name: 'Цэцээ гүн', image: 'zurag/tsetseeGun.jpg', area: 'Богд хан уул', difficulty: 'Дунд', distanceKm: 6, elevationM: 1100, timeHr: '4–5', durationHours: 5, season: '6-р сар – 9-р сар', status: 'Бэлтгэлээ базааж яваарай', desc: 'Манзуширын хийдийн орчмоос эхэлж, ой дундуур өгсөн Цэцээ гүний оргилд хүрнэ. Илүү их цаг, бэлтгэл хэрэгтэй тул өдрөө төлөвлөж, өөрийн хэмнэлээр алхаарай.', track: [[47.80829589687586, 107.00250134653953],[47.80622118144706, 107.00227763432942],[47.79818108673404, 106.99917604385213],[47.79463981962129, 106.99917906967447],[47.79212077774624, 107.00031917915896],[47.78920987629669, 107.00055426348179],[47.78339264729877, 107.00237944424512],[47.78200821708559, 107.00249812791034],[47.7764488085867, 107.00177009833101],[47.77417400620167, 107.00129493404256],[47.77149046020959, 107.00072044478436],[47.76971622441126, 106.99938328071103],[47.76674035755306, 106.99762563578616],[47.76566811108079, 106.99531167418306],[47.7647018920567, 106.99292759254106]] },
  { id: 'tenger-rock', name: 'Тэнгэр хад', image: 'zurag/tengerHad.jpg', area: 'Богд хан уул', difficulty: 'Дунд', distanceKm: 8, elevationM: 300, timeHr: '3–4', durationHours: 4, season: 'Жилийн турш', status: 'Өдрөө гаргаад алхахад', desc: 'Ой мод, хадтай хэсгээр дайрч алхах арай урт жим. Яаралгүй алхаж, замдаа амрах цаг гаргаарай.', track: [[47.92,106.92],[47.93,106.93],[47.94,106.94]] }
];

// Keep the edited Mongolian descriptions consistent when cloud routes load.
const ROUTE_DESCRIPTIONS = new Map(FALLBACK_ROUTES.map(({ id, desc }) => [id, desc]));
let ROUTES = [...FALLBACK_ROUTES];
window.ROUTES = ROUTES;

function setRoutes(routes) {
  if (!Array.isArray(routes) || !routes.length) return;
  ROUTES = routes.map((route) => ({
    ...route,
    desc: ROUTE_DESCRIPTIONS.get(route.id) || route.desc,
    durationHours: route.durationHours || Number.parseFloat(route.timeHr) || 2,
    // Firestore arrays cannot contain arrays; cloud tracks use coordinate maps.
    track: Array.isArray(route.track) ? route.track.map((point) => Array.isArray(point) ? point : [point?.latitude, point?.longitude])
      .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) : []
  }));
  window.ROUTES = ROUTES;
  window.dispatchEvent(new Event('routes:updated'));
  window.dispatchEvent(new Event('routes:ready'));
}

function icon(name) {
  return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><use href="icons.svg#${name}"></use></svg>`;
}

function initMobileNav() {
  if (document.querySelector('.mobile-nav')) return;
  const page = document.body.dataset.page;
  const destinations = [
    ['home', 'index.html', 'Нүүр', 'home'],
    ['explore', 'explore.html', 'Жимүүд', 'compass'],
    ['map', 'map.html', 'Газрын зураг', 'map'],
    ['my-hikes', 'my-hikes.html', 'Миний алхалт', 'bookmark']
  ];
  const nav = document.createElement('nav');
  nav.className = 'mobile-nav';
  nav.setAttribute('aria-label', 'Үндсэн цэс');
  nav.innerHTML = destinations.map(([id, href, label, symbol]) => {
    const active = id === page || (page === 'detail' && id === 'explore');
    return `<a href="${href}" ${active ? 'class="active" aria-current="page"' : ''}>${icon(symbol)}<span>${label}</span></a>`;
  }).join('');
  document.body.appendChild(nav);
  document.querySelectorAll('.primary-nav a.active').forEach(link => link.setAttribute('aria-current', 'page'));
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
        <a href="my-hikes.html" class="profile-saved-link">Миний алхалтууд</a>
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
    image.alt = `${displayName} — бүртгэлийн зураг`;
  };

  signInButton.addEventListener('click', async () => {
    signInButton.disabled = true;
    signInButton.querySelector('span:last-child').textContent = 'Нэвтэрч байна…';
    message.hidden = true;
    try { await window.WalkyStore?.signInWithGoogle(); }
    catch (error) {
      const errors = {
        'auth/unauthorized-domain': 'Энэ хаягаар Google-ээр нэвтрэх боломжгүй байна. Жимээ энэ төхөөрөмж дээр хадгалаад ашиглаж болно.',
        'auth/operation-not-allowed': 'Google-ээр нэвтрэх одоогоор боломжгүй байна. Жимээ энэ төхөөрөмж дээр хадгалаарай.',
        'auth/popup-blocked': 'Нэвтрэх цонхыг хөтөч хаажээ. Цонх нээхийг зөвшөөрөөд дахин оролдоорой.',
        'auth/popup-closed-by-user': 'Нэвтрэх цонх хаагдлаа. Нэвтрэхийг хүсвэл дахин оролдоорой.',
        'auth/cancelled-popup-request': 'Нэвтрэх үйлдэл цуцлагдлаа. Дахин оролдоорой.'
      };
      showMessage(errors[error.code] || 'Нэвтэрч чадсангүй. Түр хүлээгээд дахин оролдоорой.');
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
    <a class="route-card-link" href="route-detail.html?id=${encodeURIComponent(route.id)}" aria-label="${r.name} — жимийн тухай үзэх">
      <div class="route-thumb">
        <img src="${image}" alt="" loading="lazy">
        <span class="diff ${formatDifficulty(String(route.difficulty || ''))}">${r.difficulty}</span>
      </div>
    </a>
    <div class="route-body">
      <p class="route-area">${r.area || 'Улаанбаатар орчим'}</p>
      <div class="route-title-row">
        <h3><a href="route-detail.html?id=${encodeURIComponent(route.id)}">${r.name}</a></h3>
        ${includeSave ? `<button class="save-route" data-route-id="${r.id}" data-route-name="${r.name}" type="button" aria-label="${r.name} хадгалах">${icon('bookmark')}</button>` : ''}
      </div>
      <p class="route-description">${r.desc}</p>
      <div class="route-stats"><span><b>${r.distanceKm}</b> км</span><span><b>${r.timeHr}</b> цаг</span><span>↑ <b>${r.elevationM}</b> м</span></div>
    </div>
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
    button.setAttribute('aria-label', `${button.dataset.routeName} ${isSaved ? 'хадгалсан жимүүдээс хасах' : 'хадгалах'}`);
    button.innerHTML = `${icon('bookmark')}${button.id === 'detail-save-route' ? `<span>${isSaved ? 'Хадгалсан' : 'Хадгалах'}</span>` : ''}`;
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
      const feedback = document.querySelector('#save-feedback');
      if (feedback) feedback.textContent = saved.includes(id)
        ? `«${button.dataset.routeName}» жимийг хадгалсан жагсаалтаас хаслаа.`
        : `«${button.dataset.routeName}» жимийг хадгаллаа. «Миний алхалтууд»-аас хараарай.`;
    });
  });
}

function renderRoutes(list = ROUTES, targetSelector = '#route-grid') {
  const target = document.querySelector(targetSelector);
  if (!target) return;
  target.innerHTML = list.length ? list.map((route) => routeCardHTML(route)).join('') : '<div class="empty-state"><strong>Хайсан жим олдсонгүй.</strong><span>Өөр нэрээр хайх эсвэл сонгосон нөхцөлөө өөрчлөөд үзээрэй.</span><button class="text-button" type="button" data-reset-filters>Бүх жимийг харах</button></div>';
  bindSaveButtons();
  updateSaveButtons();
}

function initExplore() {
  const search = document.querySelector('#search-input');
  const difficulty = document.querySelector('#difficulty-filter');
  const duration = document.querySelector('#duration-filter');
  const count = document.querySelector('#route-count');
  const params = new URLSearchParams(window.location.search);
  if (search) search.value = params.get('q') || '';
  if (duration && [...duration.options].some(option => option.value === params.get('duration'))) duration.value = params.get('duration');
  let quickFilter = duration?.value === '2' && !difficulty?.value ? 'short' : (difficulty?.value || duration?.value ? null : '');
  const chips = [...document.querySelectorAll('[data-quick-filter]')];
  const syncChips = () => chips.forEach(chip => chip.setAttribute('aria-pressed', String(chip.dataset.quickFilter === quickFilter)));
  const applyFilters = () => {
    const query = (search?.value || '').trim().toLowerCase();
    const selectedDifficulty = difficulty?.value || '';
    const selectedDuration = duration?.value || '';
    const filtered = ROUTES.filter((route) => {
      const searchable = `${route.name} ${route.desc} ${route.area}`.toLowerCase();
      return (!query || searchable.includes(query)) && (!selectedDifficulty || route.difficulty === selectedDifficulty) && (!selectedDuration || route.durationHours <= Number(selectedDuration)) && (quickFilter !== 'long' || route.durationHours > 2);
    });
    const list = document.body.dataset.page === 'home' && !query && !selectedDifficulty && !selectedDuration && !quickFilter ? filtered.slice(0, 3) : filtered;
    renderRoutes(list);
    if (count) count.textContent = `${list.length} жим`;
  };
  [search, difficulty, duration].forEach(input => input?.addEventListener('input', () => {
    if (input !== search) { quickFilter = difficulty?.value || duration?.value ? null : ''; syncChips(); }
    applyFilters();
  }));
  chips.forEach(chip => chip.addEventListener('click', () => {
    quickFilter = chip.dataset.quickFilter;
    if (duration) duration.value = quickFilter === 'short' ? '2' : '';
    if (difficulty) difficulty.value = '';
    syncChips(); applyFilters();
  }));
  document.querySelector('#route-grid')?.addEventListener('click', event => {
    if (!event.target.closest('[data-reset-filters]')) return;
    [search, difficulty, duration].forEach(input => { if (input) input.value = ''; });
    quickFilter = ''; syncChips(); applyFilters(); search?.focus();
  });
  window.addEventListener('routes:updated', applyFilters);
  syncChips();
  applyFilters();
}

function initHome() {
  initExplore();
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
