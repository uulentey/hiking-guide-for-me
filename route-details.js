let detailMap = null;
let currentDetailRoute = null;
let previousDetailHikeKey = null;
function renderDetailHikeActions(state = window.WalkyHikes.getState()) {
  const button = document.getElementById('detail-plan-route');
  const feedback = document.getElementById('detail-hike-state');
  const hike = currentDetailRoute ? state.items[currentDetailRoute.id] : null;
  const key = `${state.user?.uid || 'guest'}:${currentDetailRoute?.id || ''}:${hike?.status || ''}`;
  if (key !== previousDetailHikeKey) document.getElementById('save-feedback').textContent = '';
  previousDetailHikeKey = key;
  const planned = hike?.status === 'planned';
  const completed = hike?.status === 'completed';
  button.disabled = !currentDetailRoute || !state.ready || completed;
  button.setAttribute('aria-pressed', String(planned));
  button.textContent = completed ? 'Алхсан' : planned ? 'Төлөвлөсөн ✓' : 'Төлөвлөх';
  button.setAttribute('aria-label', completed ? 'Энэ жимээр алхсан' : planned ? 'Төлөвлөсөн. Төлөвлөгөөнөөс хасах' : 'Алхалтаа төлөвлөх');
  const labels = { saved: 'Хадгалсан', planned: 'Төлөвлөсөн', completed: 'Алхсан' };
  const messages = {
    local: 'Энэ төхөөрөмж дээр хадгаллаа.', synced: 'Бүртгэлд хадгаллаа.',
    syncing: 'Бүртгэлд хадгалж байна…', connecting: 'Бүртгэлтэй холбогдож байна…',
    offline: 'Холбогдох үед бүртгэлд хадгална.',
    error: 'Бүртгэлд хадгалж чадсангүй. Миний алхалтууд хэсгээс дахин оролдоорой.'
  };
  feedback.textContent = !state.ready ? 'Алхалтуудыг ачаалж байна…' : hike && labels[hike.status]
    ? `${labels[hike.status]} · ${state.storageFailed ? 'Энэ хөтөч өөрчлөлтийг хадгалж чадсангүй.' : messages[state.sync] || ''}` : '';
  feedback.dataset.state = state.storageFailed ? 'error' : state.sync;
}

  function renderRouteDetails() {
    if (detailMap) { detailMap.remove(); detailMap = null; }
    document.getElementById('map').replaceChildren();
    const allRoutes = Array.isArray(window.ROUTES) ? window.ROUTES : [];
    const params = new URLSearchParams(window.location.search);
    const routeId = params.get('id');
    const route = routeId ? allRoutes.find((item) => item.id === routeId) : allRoutes[0];
    currentDetailRoute = route || null;
    renderDetailHikeActions();
    document.querySelector('.detail-section').hidden = !route;
    renderRouteGallery(route);

    if (!route) {
      document.getElementById('detail-save-route').hidden = true;
      document.getElementById('route-name').textContent = 'Энэ жим олдсонгүй';
      document.getElementById('route-desc').textContent = 'Жимүүдийн жагсаалт руу буцаад дахин сонгоорой.';
      document.getElementById('route-story').textContent = 'Жимийн мэдээллийг харуулж чадсангүй.';
      document.getElementById('route-badge').textContent = 'Мэдээлэлгүй';
      document.getElementById('map').innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--ink-soft);font-family:var(--font-mono);font-size:0.85rem;">Жимийн мэдээлэл одоохондоо алга</div>';
      return;
    }

    document.getElementById('route-name').textContent = route.name;
    const saveButton = document.getElementById('detail-save-route');
    saveButton.dataset.routeId = route.id;
    saveButton.dataset.routeName = route.name;
    saveButton.hidden = false;
    bindSaveButtons();
    updateSaveButtons();
    document.getElementById('route-desc').textContent = route.desc;
    document.getElementById('route-badge').textContent = route.difficulty;
    document.getElementById('route-story').textContent = route.desc;
    document.getElementById('route-area').textContent = route.area || 'Улаанбаатар орчим';

    document.getElementById('stat-row').innerHTML = `
      <div><b>${escapeHTML(route.distanceKm)} км</b><span>Алхах зай</span></div>
      <div><b>${escapeHTML(route.elevationM)} м</b><span>Өгсөлт</span></div>
      <div><b>${escapeHTML(route.timeHr)}</b><span>Хугацаа (цаг)</span></div>
      <div><b>${escapeHTML(route.difficulty)}</b><span>Түвшин</span></div>
      <div><b>${escapeHTML(route.season)}</b><span>Алхах улирал</span></div>
    `;

    const guidance = window.WalkyRouteContent.guidance(route);
    document.getElementById('preparation-title').textContent = guidance.preparationTitle;
    document.getElementById('audience-title').textContent = guidance.audienceTitle;
    const preparation = document.getElementById('route-preparation');
    preparation.replaceChildren();
    guidance.preparation.forEach(item => {
      const line = document.createElement('span');
      line.textContent = `✓ ${item}`;
      preparation.appendChild(line);
    });
    const audience = document.getElementById('route-audience');
    audience.replaceChildren();
    guidance.audience.forEach(item => {
      const line = document.createElement('li');
      line.textContent = item;
      audience.appendChild(line);
    });
    document.getElementById('preparation-section').hidden = !guidance.preparation.length;
    document.getElementById('audience-section').hidden = !guidance.audience.length;
    document.querySelector('.detail-shell').classList.toggle('without-preparation', !guidance.preparation.length);

    const mapsLink = document.getElementById('google-maps-link');
    if (route.track && route.track.length > 0) {
      const [lat, lng] = route.track[0];
      mapsLink.href = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
      mapsLink.textContent = ' Тэмдэглэсэн цэгийг харах ↗';
      mapsLink.removeAttribute('aria-disabled');
    } else {
      mapsLink.removeAttribute('href');
      mapsLink.textContent = 'Тэмдэглэсэн цэг нь одоохондоо алга';
      mapsLink.setAttribute('aria-disabled', 'true');
    }

    let safetyText = '';
    switch (route.difficulty) {
      case 'Хялбар':
        safetyText = 'Хөнгөн жим байсан ч явах өдрийнхөө цаг агаар, замын нөхцөлийг шалгаарай.';
        break;
      case 'Хөнгөн - Дунд':
        safetyText = 'Өгсүүр хэсэгт өөрийн хэмнэлээр алхаж, хэрэгтэй үедээ амраарай.';
        break;
      case 'Дунд':
        safetyText = 'Өгсүүр, хадтай хэсэгт яаралгүй алхаж, хэрэгтэй үедээ амраарай.';
        break;
      case 'Хэцүү':
        safetyText = 'Явах замынхаа нөхцөлийг урьдчилан шалгаж, өөрийн бэлтгэлдээ тохируулаарай.';
        break;
      default:
        safetyText = 'Явах өдрийнхөө цаг агаар, замын нөхцөлийг шалгаарай.';
    }
    document.getElementById('safety-text').textContent = safetyText;

    if (window.L && route.track && route.track.length >= 2) {
      const map = detailMap = L.map('map', { zoomControl: false }).setView(route.track[0], 13);
      L.control.zoom({ zoomInTitle: 'Ойртуулах', zoomOutTitle: 'Холдуулах' }).addTo(map);
      L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://opentopomap.org">OpenTopoMap</a>'
      }).addTo(map);

      const polyline = L.polyline(route.track, { color: '#235843', weight: 4 }).addTo(map);
      map.fitBounds(polyline.getBounds(), { padding: [24, 24] });
    } else {
      document.getElementById('map').innerHTML =
        '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--ink-soft);font-family:var(--font-mono);font-size:0.85rem;">Энэ жимийг газрын зураг дээр харуулж чадсангүй.</div>';
    }
  }

  window.addEventListener('routes:updated', renderRouteDetails);

  // If routes data is already available use it immediately, otherwise wait for the event
  if (Array.isArray(window.ROUTES) && window.ROUTES.length > 0) {
    renderRouteDetails();
  } else {
    window.addEventListener('routes:ready', () => {
      renderRouteDetails();
    }, { once: true });
    // As a fallback, try again after a short delay
    setTimeout(() => {
      if (!Array.isArray(window.ROUTES) || window.ROUTES.length === 0) renderRouteDetails();
    }, 250);
  }

window.WalkyHikes.subscribe(renderDetailHikeActions);
document.getElementById('detail-plan-route').addEventListener('click', () => {
  if (!currentDetailRoute) return;
  const hike = window.WalkyHikes.getState().items[currentDetailRoute.id];
  if (hike?.status === 'completed') return;
  const planned = hike?.status === 'planned';
  if (window.WalkyHikes.setStatus(currentDetailRoute.id, planned ? 'saved' : 'planned')) {
    document.getElementById('save-feedback').textContent = planned
      ? 'Төлөвлөгөөнөөс хаслаа. Жим хадгалсан жагсаалтад хэвээр байна.'
      : 'Алхалтаа төлөвлөлөө. Миний алхалтууд хэсгээс хараарай.';
  }
});
