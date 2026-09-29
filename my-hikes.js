document.addEventListener('DOMContentLoaded', () => {
  const store = window.WalkyHikes;
  const grid = document.querySelector('#hikes-grid');
  const search = document.querySelector('#hikes-search');
  const empty = document.querySelector('#hikes-empty');
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  const toast = document.querySelector('#hikes-toast');
  const labels = { saved: 'Хадгалсан', planned: 'Явахаар төлөвлөсөн', completed: 'Алхсан' };
  let filter = 'all';
  let lastRemoved = null;
  let previousScope;
  let lastMarkup;

  function render(state) {
    const accountScope = state.user?.uid || 'guest';
    if (previousScope !== accountScope) { lastRemoved = null; toast.hidden = true; }
    previousScope = accountScope;
    const hikes = Object.entries(state.items).filter(([, hike]) => hike.status !== 'removed');
    const counts = { all: hikes.length, planned: hikes.filter(([, hike]) => hike.status === 'planned').length,
      completed: hikes.filter(([, hike]) => hike.status === 'completed').length };
    ['all', 'planned', 'completed'].forEach((key) => { document.querySelector(`#count-${key}`).textContent = counts[key]; });
    document.querySelector('#total-hikes').textContent = counts.all;
    document.querySelector('#planned-hikes').textContent = counts.planned;
    document.querySelector('#completed-hikes').textContent = counts.completed;
    const messages = {
      loading: 'Алхалтуудыг ачаалж байна…', local: 'Энэ төхөөрөмж дээр хадгалагдана. Нэвтэрвэл бусад төхөөрөмжөөсөө харах боломжтой.',
      connecting: 'Бүртгэлтэй холбож байна. Хадгалсан хуулбарыг харуулж байна.', syncing: 'Өөрчлөлтүүдийг бүртгэлд хадгалж байна…',
      synced: 'Таны бүртгэлд хадгалагдсан. Бусад төхөөрөмжөөсөө ч харах боломжтой.',
      offline: 'Интернэтгүй байна. Холболт сэргэхэд өөрчлөлтүүдийг илгээнэ.',
      error: 'Бүртгэлтэй синк хийж чадсангүй. Өөрчлөлтүүд энэ төхөөрөмж дээр хадгалагдсан.'
    };
    document.querySelector('#hikes-sync-text').textContent = state.storageFailed
      ? 'Хөтөч хадгалах боломжгүй байна. Хуудсыг хаавал синк хийгдээгүй өөрчлөлтүүд алдагдаж болно.' : messages[state.sync];
    document.querySelector('.hikes-sync').dataset.state = state.storageFailed ? 'error' : state.sync;
    document.querySelector('#hikes-sign-in').hidden = Boolean(state.user) || !state.ready;
    document.querySelector('#hikes-retry').hidden = state.sync !== 'error';
    const missingGuestHikes = state.user && state.ready && state.guestCount;
    document.querySelector('#guest-import').hidden = !missingGuestHikes;

    const query = search.value.trim().toLocaleLowerCase();
    const filtered = hikes.filter(([id, hike]) => {
      const route = ROUTES.find((item) => item.id === id);
      return (filter === 'all' || hike.status === filter) && (!query || `${route?.name || id} ${route?.area || ''}`.toLocaleLowerCase().includes(query));
    });
    grid.setAttribute('aria-busy', String(!state.ready));
    document.querySelector('#hikes-result-count').textContent = state.ready ? `${filtered.length} маршрут` : 'Ачаалж байна…';
    const markup = filtered.map(([id, hike]) => {
      const route = ROUTES.find((item) => item.id === id);
      const title = route?.name || 'Маршрутын мэдээлэл одоогоор олдсонгүй';
      const content = route ? routeCardHTML(route, false)
        : `<article class="route-card unavailable-hike"><div class="route-body"><p class="eyebrow">Мэдээлэл боломжгүй</p><h3>${title}</h3><p>Таны хадгалалт хэвээр байна. Дараа дахин шалгаарай.</p></div></article>`;
      const date = hike.completedAt && !Number.isNaN(Date.parse(hike.completedAt))
        ? `<p class="hike-completed-date">✓ ${escapeHTML(new Date(hike.completedAt).toLocaleDateString('mn-MN'))} · Алхсан</p>` : '';
      const controls = `<div class="hike-controls">${date}
        <label for="status-${escapeHTML(id)}">Миний төлөв</label>
        <div class="hike-controls-row"><select id="status-${escapeHTML(id)}" data-hike-status="${escapeHTML(id)}" aria-label="${escapeHTML(title)} — төлөв" ${state.ready ? '' : 'disabled'}>
        ${Object.entries(labels).map(([value, label]) => `<option value="${value}" ${hike.status === value ? 'selected' : ''}>${label}</option>`).join('')}
        </select><button type="button" class="remove-hike" data-remove-hike="${escapeHTML(id)}" aria-label="${escapeHTML(title)} — хасах" ${state.ready ? '' : 'disabled'}>Хасах</button></div></div>`;
      return content.replace('</article>', `${controls}</article>`);
    }).join('');
    // Metadata-only sync updates should not disrupt focus or an open select.
    if (markup !== lastMarkup) {
      const active = document.activeElement;
      const focusedId = active?.id;
      const wasInGrid = grid.contains(active);
      grid.innerHTML = markup; lastMarkup = markup;
      if (wasInGrid) (document.getElementById(focusedId) || tabs.find((tab) => tab.dataset.filter === filter)).focus();
    }
    empty.hidden = !state.ready || filtered.length > 0;
    const emptyCopy = query ? ['Тохирох жим олдсонгүй', 'Хайлтын үгээ өөрчлөх эсвэл цэвэрлээд үзээрэй.']
      : filter === 'planned' ? ['Дараагийн аяллаа төлөвлөөрэй', 'Хадгалсан жимийнхээ төлөвийг «Явахаар төлөвлөсөн» болгож сонгоорой.']
      : filter === 'completed' ? ['Анхны алхалтаа тэмдэглээрэй', 'Аяллаасаа ирээд жимийнхээ төлөвийг «Алхсан» болгоорой. Дурсамж тань энд үлдэнэ.']
      : ['Анхны жимээ хадгалаарай', 'Маршрутуудаас таалагдсан жимийнхээ ♡ товчийг дараарай. Таны сонголтууд энд харагдана.'];
    document.querySelector('#hikes-empty-title').textContent = emptyCopy[0];
    document.querySelector('#hikes-empty-copy').textContent = emptyCopy[1];
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => {
      filter = tab.dataset.filter;
      tabs.forEach((item) => { item.setAttribute('aria-selected', String(item === tab)); item.tabIndex = item === tab ? 0 : -1; });
      document.querySelector('#hikes-panel').setAttribute('aria-labelledby', tab.id);
      render(store.getState());
    });
    tab.addEventListener('keydown', (event) => {
      const target = { ArrowRight: (index + 1) % tabs.length, ArrowLeft: (index + tabs.length - 1) % tabs.length, Home: 0, End: tabs.length - 1 }[event.key];
      if (target === undefined) return;
      event.preventDefault(); tabs[target].focus(); tabs[target].click();
    });
  });
  grid.addEventListener('change', (event) => {
    const id = event.target.dataset.hikeStatus;
    if (id) store.setStatus(id, event.target.value);
  });
  grid.addEventListener('click', (event) => {
    const button = event.target.closest('[data-remove-hike]');
    if (!button) return;
    const id = button.dataset.removeHike;
    lastRemoved = { id, hike: store.getState().items[id] };
    store.setStatus(id, 'removed');
    document.querySelector('#hikes-toast-text').textContent = 'Жимийг жагсаалтаас хаслаа.';
    toast.hidden = false;
  });
  document.querySelector('#hikes-undo').addEventListener('click', () => {
    if (lastRemoved) store.restore(lastRemoved.id, lastRemoved.hike);
    lastRemoved = null; toast.hidden = true;
  });
  document.querySelector('#hikes-sign-in').addEventListener('click', () => document.querySelector('#sign-in-button').click());
  document.querySelector('#hikes-retry').addEventListener('click', () => store.retry());
  document.querySelector('#import-hikes').addEventListener('click', () => {
    const uid = store.getState().user?.uid;
    if (!uid) return;
    store.importGuest();
  });
  search.addEventListener('input', () => render(store.getState()));
  window.addEventListener('routes:updated', () => render(store.getState()));
  store.subscribe(render);
});
