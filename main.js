// Mobile nav toggle
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('nav.primary-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      nav.classList.toggle('open');
      const isOpen = nav.classList.contains('open');
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  }
});

// Seed route data — replace with real curated routes.
// This is the actual bottleneck flagged earlier: nothing here is real GPS/elevation data yet.
const ROUTES = [
  {
    id: 'bogd-khan-tsetsee-gun',
    name: 'Цэцээ гүн — Богд хайрхан',
    difficulty: 'Дунд',
    distanceKm: 12,
    elevationM: 480,
    timeHr: '4–5',
    season: '5-р сар – 10-р сар',
    desc: 'Богд хайрханы хамгийн өндөр цэг рүү өгсдөг сонгодог маршрут, ойн бүс дундуур.',
    track: [
      [47.85, 106.75],
      [47.86, 106.76],
      [47.87, 106.77],
      [47.88, 106.78],
      [47.89, 106.79],
      [47.90, 106.80]
    ]
  },
  {
    id: 'zaisan-nukht',
    name: 'Зайсан — Нухт чиглэл',
    difficulty: 'Хялбар',
    distanceKm: 7,
    elevationM: 180,
    timeHr: '2–3',
    season: 'Жилийн турш',
    desc: 'Хотоос ойрхон, гэр бүлээрээ алхахад тохиромжтой, зам сайтай маршрут.',
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
    name: 'Богд хайрхан дунд',
    difficulty: 'Хэцүү',
    distanceKm: 15,
    elevationM: 900,
    timeHr: '6–8',
    season: '6-р сар – 9-р сар',
    desc: 'Богд хайрханы дунд цэцэрлэг, нутаг дуусаанаас хамгийн өндөр.',
    track: [
      [47.80, 106.70],
      [47.82, 106.72],
      [47.84, 106.74],
      [47.86, 106.76],
      [47.88, 106.78]
    ]
  },
  {
    id: 'gunji-loop',
    name: 'Гүнжи удамт',
    difficulty: 'Дунд',
    distanceKm: 8,
    elevationM: 300,
    timeHr: '3–4',
    season: 'Жилийн турш',
    desc: 'Гүнжи уул рүү удамт зам, дунд цэцэрлэг, шигшээ боломжтой.',
    track: [
      [47.92, 106.92],
      [47.93, 106.93],
      [47.94, 106.94]
    ]
  }
];

function routeCardHTML(r) {
  return `
    <a class="route-card" href="route-detail.html?id=${r.id}">
      <div class="route-thumb"><span class="diff">${r.difficulty}</span></div>
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