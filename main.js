function initMobileNav() {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('nav.primary-nav');
  if (!toggle || !nav) return;

  const setMenuState = (isOpen) => {
    nav.classList.toggle('open', isOpen);
    toggle.classList.toggle('is-open', isOpen);
    toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    toggle.textContent = isOpen ? '✕' : '☰';
  };

  toggle.addEventListener('click', () => {
    setMenuState(!nav.classList.contains('open'));
  });

  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => setMenuState(false));
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 760) setMenuState(false);
  });
}

function reloadPageScriptsFromHtml(html) {
  const parser = new DOMParser();
  const newDocument = parser.parseFromString(html, 'text/html');
  const scripts = Array.from(newDocument.querySelectorAll('script'));

  document.title = newDocument.title;
  document.documentElement.innerHTML = newDocument.documentElement.innerHTML;

  // Load external scripts sequentially to ensure they execute before inline scripts
  const externalScripts = scripts.filter(s => s.src);
  const inlineScripts = scripts.filter(s => !s.src);

  const loadExternal = (src) => new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = false;
    s.onload = () => resolve();
    s.onerror = () => resolve();
    document.body.appendChild(s);
  });

  // Return a promise that resolves after all scripts are appended and external ones loaded
  return externalScripts.reduce((p, s) => p.then(() => loadExternal(s.src)), Promise.resolve())
    .then(() => {
      inlineScripts.forEach((script) => {
        const replacement = document.createElement('script');
        replacement.textContent = script.textContent;
        document.body.appendChild(replacement);
      });
    });
}

function loadPageViaAjax(url) {
  fetch(url, { headers: { 'X-Requested-With': 'fetch' } })
    .then((response) => {
      if (!response.ok) throw new Error('Navigation failed');
      return response.text();
    })
    .then((html) => {
      // Update the URL first so inline scripts can read query params immediately
      try {
        window.history.pushState({ url }, '', url);
      } catch (e) {
        // ignore
      }
      return reloadPageScriptsFromHtml(html).then(() => {
        initMobileNav();
        bindAjaxLinks();
      });
    })
    .catch(() => {
      window.location.href = url;
    });
}

function bindAjaxLinks() {
  document.querySelectorAll('a[href]').forEach((link) => {
    if (link.dataset.ajaxBound === 'true') return;

    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) return;
    if (link.target === '_blank' || link.hasAttribute('download')) return;

    try {
      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin) return;
    } catch (error) {
      return;
    }

    link.dataset.ajaxBound = 'true';
    link.addEventListener('click', (event) => {
      event.preventDefault();
      loadPageViaAjax(link.href);
    });
  });
}

window.addEventListener('DOMContentLoaded', () => {
  initMobileNav();
  bindAjaxLinks();
});

window.addEventListener('popstate', () => {
  if (window.location.href) {
    return;
  }
});
const ROUTES = [
  {
    id: 'bogd-khan-yagaan-sandal',
    name: 'Ягаан сандал',
    image: 'zurag/emoSandal.jpg',
    difficulty: 'Хөнгөн - Дунд',
    distanceKm: 4,
    elevationM: 480,
    timeHr: '1.5–2',
    season: '5-р сар – 10-р сар',
    desc: 'Богд уулын замаар богино хугацаанд алхаж хүрэх боломжтой зураг авах болон амарч суун эморолд ороход тохиромжтой цэг.',
    track: [
      [47.838254302576644, 106.89066403141408],
      [47.838626288239254, 106.89186496158658],
      [47.83874618380668, 106.89400844100138],
      [47.83831798406552, 106.89611364423878],
      [47.83913156052589, 106.89812953559317],
      [47.83970533835782, 106.89986473321467],
      [47.83959400882693, 106.90427928010466],
      [47.843413331684964, 106.9032075405279],
      [47.847806061612786, 106.90196993637862],
      [47.849809639464446, 106.90078336732903],
      [47.85092270479016, 106.90126820195856],
      [47.854116213539356, 106.9015106192655],
      [47.85766052111331, 106.90265891194981],
      [47.86101626051274, 106.90357754599195]
]},
  {
    id: 'bogd-khan-dugui-tsagaan',
    name: 'Дугуй цагаан',
    image: 'zurag/duguiTsagaan.jpg',
    difficulty: 'Хялбар',
    distanceKm: 3.5,
    elevationM: 400,
    timeHr: '1.',
    season: 'Жилийн турш',
    desc: 'Зайсангийн амнаас эхэлж Богдхан уулын ой модон дундуур өгсөн, хотын төвтэй ойрхон байгальд гарах мэдрэмж төрүүлэх богино аяллын чиглэл.',
    track: [
      [47.88, 106.88],
      [47.89, 106.89],
      [47.90, 106.90],
      [47.91, 106.91]
    ]
  },
  {
    id: 'terelj-turtle-rock',
    name: 'Тэрэлж — Мэлхий хад',
    image: 'zurag/terelj.jpg',
    difficulty: 'Хялбар',
    distanceKm: 5,
    elevationM: 90,
    timeHr: '1.5–2',
    season: 'Жилийн турш',
    desc: 'Түгээмэл зорчдог, гэрэл зурагт сайн, богино алхалт.',
    track: [
      [47.95, 107.45],
      [47.96, 107.46],
      [47.97, 107.47]
    ]
  },
  {
    id: 'bogd-khan-summit',
    name: 'Цэцээ гүн — Богд хайрхан дээд цэг',
    image: 'zurag/tsetseeGun.jpg',
    difficulty: 'Дунд',
    distanceKm: 6,
    elevationM: 1100,
    timeHr: '4-5',
    season: '6-р сар – 9-р сар',
    desc: 'Богдхан уулын хамгийн өндөр цэг.',
    track: [
      [47.80, 106.70],
      [47.82, 106.72],
      [47.84, 106.74],
      [47.86, 106.76],
      [47.88, 106.78]
    ]
  },
  {
    id: 'tenger-rock',
    name: 'тэнгэр хад',
    image: 'zurag/tengerHad.jpg',
    difficulty: 'Дунд',
    distanceKm: 8,
    elevationM: 300,
    timeHr: '3–4',
    season: 'Жилийн турш',
    desc: 'Хотын төвөөс холдохгүйгээр уулын зам, ой мод, хад асгыг мэдрэх Богдхан уулын хамгийн хүртээмжтэй маршрутуудын нэг.',
    track: [
      [47.92, 106.92],
      [47.93, 106.93],
      [47.94, 106.94]
    ]
  }
];
window.ROUTES = ROUTES;
// Notify listeners that routes data is available
try {
  window.dispatchEvent(new Event('routes:ready'));
} catch (e) {
  // older browsers support
  const evt = document.createEvent('Event');
  evt.initEvent('routes:ready', true, true);
  window.dispatchEvent(evt);
}

function routeCardHTML(r) {
  return `
    <a class="route-card" href="route-detail.html?id=${r.id}">
      <div class="route-  thumb" style="background-image:url('${r.image}')">
        <span class="diff">${r.difficulty}</span>
      </div>
      <div class="route-body">
        <h3>${r.name}</h3>
        <p>${r.desc}</p>
        <div class="route-stats">
          <span><b>${r.distanceKm}</b> км</span>
          <span><b>${r.elevationM}</b> м өгсөлт</span>
          <span><b>${r.timeHr}</b> цаг</span>
        </div>
      </div>
    </a>`;
}

function renderRoutes(list, targetSelector) {
  const target = document.querySelector(targetSelector);
  if (!target) return;
  target.innerHTML = list.map(routeCardHTML).join('');
}

function initExplore() {
  const grid = '#route-grid';
  renderRoutes(ROUTES, grid);

  const search = document.querySelector('#search-input');
  const diffFilter = document.querySelector('#difficulty-filter');

  function applyFilters() {
    const q = (search?.value || '').toLowerCase();
    const diff = diffFilter?.value || '';
    const filtered = ROUTES.filter(r => {
      const matchesQuery = r.name.toLowerCase().includes(q) || r.desc.toLowerCase().includes(q);
      const matchesDiff = !diff || r.difficulty === diff;
      return matchesQuery && matchesDiff;
    });
    renderRoutes(filtered, grid);
  }

  search?.addEventListener('input', applyFilters);
  diffFilter?.addEventListener('change', applyFilters);
}