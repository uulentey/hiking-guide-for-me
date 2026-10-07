(function () {
  const store = window.WalkyStore;
  const $ = selector => document.querySelector(selector);
  const form = $('#content-form');
  const editor = $('#editor-dialog');
  const deletion = $('#delete-dialog');
  let collection = 'routes';
  let records = { routes: [], news: [] };
  let editingId = null;
  let deleting = null;
  let authVersion = 0;
  let loadVersion = 0;
  let authorizedUid = null;
  let busy = false;
  let loading = false;
  let loaded = false;

  function errorMessage(error) {
    if (error.code === 'content/invalid') return error.message;
    if (error.code === 'permission-denied') return 'Энэ үйлдлийг хийх эрхгүй байна. Админ эрх болон холболтоо шалгаад дахин оролдоорой.';
    if (error.code === 'not-found') return 'Энэ мэдээлэл устгагдсан байна. Жагсаалтаа дахин ачаалаарай.';
    if (['unavailable', 'deadline-exceeded'].includes(error.code)) return 'Сервертэй холбогдож чадсангүй. Интернэт холболтоо шалгаад дахин оролдоорой.';
    return 'Үйлдлийг хийж чадсангүй. Дахин оролдоорой.';
  }
  function actions() {
    const disabled = busy || loading || !loaded;
    $('#add-content').disabled = disabled;
    $('#import-routes').disabled = disabled;
    document.querySelectorAll('[data-collection], [data-edit], [data-delete]').forEach(button => { button.disabled = busy || loading; });
    $('#content-fields').disabled = busy;
    ['#editor-close', '#editor-cancel', '#save-content', '#delete-cancel', '#delete-confirm'].forEach(selector => { $(selector).disabled = busy; });
    $('#save-content').textContent = busy ? 'Хадгалж байна…' : 'Хадгалах';
    $('#delete-confirm').textContent = busy ? 'Устгаж байна…' : 'Устгах';
  }
  function showError(error) {
    $('#admin-error-text').textContent = errorMessage(error);
    $('#admin-error').hidden = false;
  }
  function render() {
    $('#admin-route-count').textContent = records.routes.length;
    $('#admin-news-count').textContent = records.news.length;
    const query = $('#admin-search').value.trim().toLowerCase();
    const status = $('#admin-status').value;
    const rows = records[collection].filter(record =>
      (!query || `${record.name || record.title} ${record.area || record.summary || ''}`.toLowerCase().includes(query)) &&
      (status === 'all' || (status === 'published') === (record.published === true))
    ).sort((a, b) => collection === 'news' ? String(b.date || '').localeCompare(String(a.date || '')) : String(a.name || '').localeCompare(String(b.name || ''), 'mn'));
    $('#admin-list-heading').textContent = collection === 'routes' ? 'Жимийн жагсаалт' : 'Мэдээний жагсаалт';
    $('#admin-result-count').textContent = loaded ? `${rows.length} / ${records[collection].length}` : '';
    $('#admin-list').setAttribute('aria-busy', String(loading));
    if (!loaded) {
      $('#admin-list').replaceChildren();
    } else if (!rows.length) {
      $('#admin-list').innerHTML = `<li class="empty-state"><strong>${records[collection].length ? 'Хайсан мэдээлэл олдсонгүй.' : collection === 'routes' ? 'Жим одоогоор алга.' : 'Мэдээ одоогоор алга.'}</strong><span>${records[collection].length ? 'Хайлт болон төлөвийн сонголтоо өөрчлөөрэй.' : 'Нэмэх товчоор эхний мэдээллээ оруулаарай.'}</span></li>`;
    } else {
      $('#admin-list').innerHTML = rows.map(record => {
        const name = escapeHTML(record.name || record.title);
        const image = /^(https:\/\/|zurag\/)[^\s]+$/i.test(record.image || '') ? record.image : 'zurag/bogdGorhi.jpg';
        return `<li class="admin-row">
          ${collection === 'routes' ? `<img class="admin-row-image" src="${escapeHTML(image)}" alt="" loading="lazy">` : '<span class="admin-news-mark" aria-hidden="true">М</span>'}
          <div class="admin-row-copy"><h3>${name}</h3><p>${escapeHTML(collection === 'routes' ? `${record.area || ''} · ${record.distanceKm ?? ''} км · ${record.timeHr || ''} цаг` : `${record.date || ''} · ${record.summary || ''}`)}</p></div>
          <span class="publication-badge ${record.published === true ? 'is-published' : ''}">${record.published === true ? 'Нийтэлсэн' : 'Ноорог'}</span>
          <div class="admin-row-actions"><button type="button" data-edit="${escapeHTML(record.id)}" aria-label="${name} засах">Засах</button><button type="button" class="delete-action" data-delete="${escapeHTML(record.id)}" aria-label="${name} устгах">Устгах</button></div>
        </li>`;
      }).join('');
    }
    $('#admin-import').hidden = !loaded || collection !== 'routes' || window.WALKY_DEFAULT_ROUTES.every(route => records.routes.some(record => record.id === route.id));
    actions();
  }
  async function reload(notice = '') {
    const version = ++loadVersion;
    const session = authVersion;
    loading = true;
    loaded = false;
    records = { routes: [], news: [] };
    $('#admin-message').textContent = 'Мэдээллийг ачаалж байна…';
    $('#admin-error').hidden = true;
    render();
    try {
      const [routes, news] = await Promise.all([store.listContent('routes'), store.listContent('news')]);
      if (session !== authVersion || version !== loadVersion) return;
      records = { routes, news };
      loaded = true;
      $('#admin-message').textContent = notice;
    } catch (error) {
      if (session !== authVersion || version !== loadVersion) return;
      $('#admin-message').textContent = notice;
      showError(error);
    } finally {
      if (session === authVersion && version === loadVersion) { loading = false; render(); }
    }
  }
  function openEditor(record) {
    editingId = record?.id || null;
    form.reset();
    $('#form-error').hidden = true;
    const isRoute = collection === 'routes';
    $('#route-fields').hidden = !isRoute;
    $('#news-fields').hidden = isRoute;
    document.querySelectorAll('#route-fields input, #route-fields select, #route-fields textarea').forEach(input => { input.disabled = !isRoute; });
    document.querySelectorAll('#news-fields input, #news-fields textarea').forEach(input => { input.disabled = isRoute; });
    $('#editor-kind').textContent = isRoute ? 'ЖИМ' : 'ӨДӨР ТУТМЫН МЭДЭЭ';
    $('#editor-title').textContent = `${isRoute ? 'Жим' : 'Мэдээ'} ${record ? 'засах' : 'нэмэх'}`;
    const values = record || (isRoute ? { image: 'zurag/bogdGorhi.jpg', difficulty: 'Хялбар', season: 'Жилийн турш', elevationM: 0 } : { date: new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ulaanbaatar' }).format(new Date()) });
    Object.entries(values).forEach(([name, value]) => {
      const input = form.elements.namedItem(name);
      if (!input) return;
      if (input.type === 'checkbox') input.checked = value === true;
      else if (name === 'track') input.value = Array.isArray(value) ? value.map(point => Array.isArray(point) ? point.join(', ') : `${point.latitude}, ${point.longitude}`).join('\n') : '';
      else input.value = value ?? '';
    });
    editor.showModal();
    form.elements.namedItem(isRoute ? 'name' : 'title').focus();
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy) return;
    const session = authVersion;
    const data = Object.fromEntries(new FormData(form));
    data.published = form.elements.namedItem('published').checked;
    $('#form-error').hidden = true;
    busy = true; actions();
    try {
      await store.saveContent(collection, editingId, data);
      if (session !== authVersion) return;
      editor.close();
      await reload(data.published ? 'Мэдээллийг хадгалж, сайтад нийтэллээ.' : 'Нооргийг хадгаллаа.');
    } catch (error) {
      if (session !== authVersion) return;
      $('#form-error').textContent = errorMessage(error);
      $('#form-error').hidden = false;
    } finally {
      if (session === authVersion) { busy = false; actions(); }
    }
  });
  $('#admin-list').addEventListener('click', event => {
    if (busy || loading) return;
    const edit = event.target.closest('[data-edit]');
    const remove = event.target.closest('[data-delete]');
    const record = records[collection].find(row => row.id === (edit?.dataset.edit || remove?.dataset.delete));
    if (!record) return;
    if (edit) openEditor(record);
    else if (remove) {
      deleting = { collection, id: record.id };
      $('#delete-description').textContent = `«${record.name || record.title}» мэдээллийг устгах гэж байна.`;
      $('#delete-error').hidden = true;
      deletion.showModal();
      $('#delete-cancel').focus();
    }
  });
  $('#delete-confirm').addEventListener('click', async () => {
    if (busy || !deleting) return;
    const session = authVersion;
    busy = true; actions();
    $('#delete-error').hidden = true;
    try {
      await store.deleteContent(deleting.collection, deleting.id);
      if (session !== authVersion) return;
      deletion.close();
      await reload('Мэдээллийг устгалаа.');
    } catch (error) {
      if (session !== authVersion) return;
      $('#delete-error').textContent = errorMessage(error);
      $('#delete-error').hidden = false;
    } finally {
      if (session === authVersion) { busy = false; actions(); }
    }
  });
  $('#import-routes').addEventListener('click', async () => {
    const session = authVersion;
    busy = true; actions();
    try {
      const count = await store.importRoutes(window.WALKY_DEFAULT_ROUTES);
      if (session !== authVersion) return;
      await reload(`${count} жим нэмлээ.`);
    } catch (error) {
      if (session === authVersion) showError(error);
    } finally {
      if (session === authVersion) { busy = false; actions(); }
    }
  });
  document.querySelectorAll('[data-collection]').forEach(button => button.addEventListener('click', () => {
    collection = button.dataset.collection;
    document.querySelectorAll('[data-collection]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    $('#admin-search').value = '';
    $('#admin-status').value = 'all';
    $('#admin-search').placeholder = collection === 'routes' ? 'Нэр, байршлаар хайх…' : 'Гарчиг, агуулгаар хайх…';
    $('#add-content').textContent = collection === 'routes' ? '+ Жим нэмэх' : '+ Мэдээ нэмэх';
    render();
  }));
  $('#admin-search').addEventListener('input', render);
  $('#admin-status').addEventListener('change', render);
  $('#add-content').addEventListener('click', () => openEditor());
  ['#editor-close', '#editor-cancel'].forEach(selector => $(selector).addEventListener('click', () => editor.close()));
  $('#delete-cancel').addEventListener('click', () => deletion.close());
  [editor, deletion].forEach(dialog => dialog.addEventListener('cancel', event => { if (busy) event.preventDefault(); }));
  $('#content-retry').addEventListener('click', () => reload());
  $('#access-retry').addEventListener('click', () => store.refreshAdminAccess());
  $('#admin-sign-in').addEventListener('click', () => $('#sign-in-button').click());

  store.onAdminStateChanged(state => {
    const allowed = state.ready && state.isAdmin;
    $('#admin-gate').hidden = allowed;
    $('#admin-workspace').hidden = !allowed;
    $('#admin-sign-in').hidden = !state.ready || Boolean(state.user && !state.user.isAnonymous) || !store.configured;
    $('#access-retry').hidden = !state.ready || !state.user;
    if (!allowed) {
      authVersion++;
      authorizedUid = null;
      loaded = false; busy = false; loading = false;
      records = { routes: [], news: [] };
      editor.close(); deletion.close();
      render();
      $('#gate-title').textContent = !store.configured ? 'Холболт одоогоор боломжгүй байна' : !state.ready ? 'Эрхийг шалгаж байна…' : state.error ? 'Эрхийг шалгаж чадсангүй' : state.user && !state.user.isAnonymous ? 'Админ эрх шаардлагатай' : 'Админ бүртгэлээрээ нэвтэрнэ үү';
      $('#gate-message').textContent = !store.configured ? 'Админ хэсгийг ашиглахын тулд Firebase холболтыг тохируулна уу.' : !state.ready ? 'Түр хүлээнэ үү.' : state.error ? 'Интернэт холболтоо шалгаад эрхээ дахин шалгаарай.' : state.user && !state.user.isAnonymous ? 'Энэ бүртгэлд мэдээлэл удирдах эрх олгоогүй байна. Сайтын хариуцагчтай холбогдоорой.' : 'Жим болон мэдээг зөвхөн эрх олгосон админ бүртгэлээр удирдана.';
      return;
    }
    if (authorizedUid !== state.user.uid) {
      authVersion++;
      authorizedUid = state.user.uid;
      reload();
    }
  });
})();
