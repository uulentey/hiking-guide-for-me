document.addEventListener('DOMContentLoaded', () => {
  const store = window.WalkyHikes;
  const grid = document.querySelector('#hikes-grid');
  const search = document.querySelector('#hikes-search');
  const empty = document.querySelector('#hikes-empty');
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  const toast = document.querySelector('#hikes-toast');
  const labels = { saved: 'Хадгалсан', planned: 'Төлөвлөсөн', completed: 'Алхсан' };
  let filter = 'all';
  let lastRemoved = null;
  let previousScope;
  let lastMarkup;

  function formatHikeDate(value) {
    const date = new Date(value);
    return `${date.getFullYear()} оны ${date.getMonth() + 1}-р сарын ${date.getDate()}`;
  }

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
      loading: 'Хадгалсан жимүүдийг тань ачаалж байна…', local: 'Жимүүд тань энэ төхөөрөмж дээр хадгалагдана. Нэвтэрвэл бусад төхөөрөмжөөсөө ч харж болно.',
      connecting: 'Бүртгэлд тань холбогдож байна. Түр хүлээх зуур хадгалсан жимүүдээ харж болно.', syncing: 'Өөрчлөлтүүдийг тань хадгалж байна…',
      synced: 'Бүртгэлд тань хадгаллаа. Бусад төхөөрөмжөөсөө нэвтрээд хараарай.',
      offline: 'Интернэт холболт тасарсан байна. Холбогдохоор өөрчлөлтүүд тань бүртгэлд хадгалагдана.',
      error: 'Бүртгэлд тань хадгалж чадсангүй. Өөрчлөлтүүд энэ төхөөрөмж дээр байгаа тул дахин оролдоорой.'
    };
    document.querySelector('#hikes-sync-text').textContent = state.storageFailed
      ? 'Энэ хөтөч жимүүдийг тань хадгалж чадсангүй. Бүртгэлд хадгалагдаагүй өөрчлөлтүүд хуудсыг хаахад алдагдаж болзошгүй.' : messages[state.sync];
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
    document.querySelector('#hikes-result-count').textContent = state.ready ? `${filtered.length} жим` : 'Түр хүлээгээрэй…';
    const markup = filtered.map(([id, hike]) => {
      const route = ROUTES.find((item) => item.id === id);
      const title = route?.name || 'Энэ жимийн мэдээлэл одоохондоо алга';
      const content = route ? routeCardHTML(route, false)
        : `<article class="route-card unavailable-hike"><div class="route-body"><p class="eyebrow">ЖИМИЙН МЭДЭЭЛЭЛ</p><h3>${title}</h3><p>Жим тань хадгалсан жагсаалтад байгаа. Мэдээллийг нь дараа дахин шалгаарай.</p></div></article>`;
      const date = hike.completedAt && !Number.isNaN(Date.parse(hike.completedAt))
        ? `<p class="hike-completed-date">✓ ${escapeHTML(formatHikeDate(hike.completedAt))} · Алхсан</p>` : '';
      const controls = `<div class="hike-controls">${date}
        <label for="status-${escapeHTML(id)}">Алхалтын төлөв</label>
        <div class="hike-controls-row"><select id="status-${escapeHTML(id)}" data-hike-status="${escapeHTML(id)}" aria-label="${escapeHTML(title)} — алхалтын төлөв" ${state.ready ? '' : 'disabled'}>
        ${Object.entries(labels).map(([value, label]) => `<option value="${value}" ${hike.status === value ? 'selected' : ''}>${label}</option>`).join('')}
        </select><button type="button" class="remove-hike" data-remove-hike="${escapeHTML(id)}" aria-label="${escapeHTML(title)} — хадгалсан жимүүдээс хасах" ${state.ready ? '' : 'disabled'}>Хасах</button></div></div>`;
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
    const emptyCopy = query ? ['Хайсан жим олдсонгүй', 'Өөр нэрээр хайх эсвэл хайлтын үгээ арилгаад үзээрэй.']
      : filter === 'planned' ? ['Дараа хаашаа алхах вэ?', 'Хадгалсан жимээсээ сонгоод «Төлөвлөсөн» гэж тэмдэглээрэй.']
      : filter === 'completed' ? ['Алхсан жимээ тэмдэглээрэй', 'Яваад ирсэн жимээ «Алхсан» гэж тэмдэглэвэл энд харагдана.']
      : ['Хадгалсан жимүүд энд харагдана', 'Таалагдсан жимийнхээ нэрийн хажуу дахь хадгалах товчийг дараарай.'];
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
    document.querySelector('#hikes-toast-text').textContent = 'Жимийг хадгалсан жагсаалтаас хаслаа.';
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
