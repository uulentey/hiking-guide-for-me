/* Run against a local server. All Firebase calls use the test fixture. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const base = process.env.WALKY_BASE_URL || 'http://127.0.0.1:4173';
const fixture = fs.readFileSync(path.join(__dirname, 'fixtures/firebase-browser.js'), 'utf8');
const output = process.env.WALKY_SCREENSHOTS || '/tmp/walky-admin-screenshots';
fs.mkdirSync(output, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  await context.route('https://www.gstatic.com/firebasejs/**', route => route.fulfill({ contentType: 'application/javascript', body: route.request().url().includes('firebase-app-compat') ? fixture : '' }));
  // Keep visual and interaction checks independent of third-party services.
  await context.route('https://fonts.googleapis.com/**', route => route.fulfill({ contentType: 'text/css', body: '' }));
  await context.route('https://unpkg.com/**', route => route.fulfill({ contentType: route.request().url().includes('.css') ? 'text/css' : 'application/javascript', body: '' }));
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  const visible = selector => page.locator(selector).waitFor({ state: 'visible' });
  const settled = () => page.waitForFunction(() => !document.querySelector('#add-content').disabled);
  const noOverflow = async () => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  try {
    await page.goto(`${base}/admin.html`);
    await visible('#admin-sign-in');
    await page.screenshot({ path: path.join(output, 'signed-out.png'), fullPage: true });
    assert.equal(await page.locator('#admin-workspace').isVisible(), false);
    await page.evaluate(() => { window.__walkyTest.seed({ 'admins/admin': { enabled: true } }); window.__walkyTest.setUser('regular'); });
    await page.waitForFunction(() => document.querySelector('#gate-title').textContent === 'Админ эрх шаардлагатай');
    assert.equal(await page.evaluate(async () => { try { await WalkyStore.saveContent('news', null, {}); return false; } catch (error) { return error.code === 'permission-denied'; } }), true);

    await page.evaluate(() => window.__walkyTest.setUser('admin'));
    await settled();
    await page.locator('#import-routes').click();
    await settled();
    assert.equal(await page.locator('.admin-row').count(), 5);
    await page.screenshot({ path: path.join(output, 'routes-desktop.png'), fullPage: true });
    await page.locator('[data-edit="bogd-khan-yagaan-sandal"]').click();
    await page.locator('[name="desc"]').fill('Админ шинэчилсэн тайлбар.');
    await page.locator('[name="season"]').fill('<img src=x onerror=alert(1)>');
    await page.locator('[name="track"]').fill('91, 106\n47, 106');
    await page.locator('#save-content').click();
    await visible('#form-error');
    assert.equal(await page.locator('#editor-dialog').isVisible(), true);
    await page.locator('[name="track"]').fill('47.838254, 106.890664\n47.861016, 106.903578');
    await page.locator('#save-content').click();
    await settled();
    await page.waitForFunction(() => !document.querySelector('#editor-dialog').open);
    const detail = await context.newPage();
    detail.on('pageerror', error => errors.push(error.message));
    await detail.goto(`${base}/route-detail.html?id=bogd-khan-yagaan-sandal`);
    await detail.waitForFunction(() => document.querySelector('#route-desc').textContent === 'Админ шинэчилсэн тайлбар.');
    assert.equal(await detail.locator('#stat-row img').count(), 0);
    await detail.goto(`${base}/map.html?id=bogd-khan-yagaan-sandal`);
    await detail.waitForFunction(() => document.querySelector('#route-desc').textContent === 'Админ шинэчилсэн тайлбар.');
    assert.equal(await detail.locator('#route-selector option').count(), 5);

    await page.locator('#add-content').click();
    const fields = { name: 'Шинэ жим', area: 'Богд хан уул', distanceKm: '6.5', elevationM: '350', timeHr: '2–3', durationHours: '3', desc: 'Шинэ жимийн мэдээлэл.' };
    for (const [name, value] of Object.entries(fields)) await page.locator(`[name="${name}"]`).fill(value);
    await page.screenshot({ path: path.join(output, 'route-editor-desktop.png'), fullPage: true });
    await page.locator('#save-content').click();
    await settled();
    assert.equal(await page.locator('.admin-row').count(), 6);
    await detail.goto(`${base}/explore.html`);
    await detail.waitForFunction(() => document.querySelectorAll('.route-card').length === 5);
    assert.equal(await detail.getByRole('heading', { name: 'Шинэ жим', exact: true }).count(), 0);

    await page.locator('[data-collection="news"]').click();
    await page.locator('#add-content').click();
    await page.locator('[name="title"]').fill('Өнөөдрийн алхалтын мэдээ');
    await page.locator('[name="summary"]').fill('Жимийн шинэ мэдээлэл.');
    await page.locator('[name="body"]').fill('Дэлгэрэнгүй мэдээ.\n<script>window.injected = true</script>');
    await page.locator('[name="published"]').check();
    await page.screenshot({ path: path.join(output, 'news-editor-desktop.png'), fullPage: true });
    await page.locator('#save-content').click();
    await settled();
    await detail.goto(`${base}/index.html`);
    await detail.getByRole('heading', { name: 'Өнөөдрийн алхалтын мэдээ' }).waitFor();
    await detail.locator('.news-item summary').click();
    assert.equal(await detail.evaluate(() => window.injected), undefined);
    await detail.evaluate(() => window.scrollTo(0, 0));
    await detail.screenshot({ path: path.join(output, 'home-news-desktop.png'), fullPage: true });

    await page.locator('[data-edit]').click();
    await page.locator('[name="title"]').fill('Шинэчилсэн мэдээ');
    await page.locator('#save-content').click();
    await settled();
    await page.setViewportSize({ width: 390, height: 844 });
    await noOverflow();
    await page.screenshot({ path: path.join(output, 'news-mobile.png'), fullPage: true });
    await page.locator('[data-edit]').click();
    await noOverflow();
    await page.screenshot({ path: path.join(output, 'news-editor-mobile.png'), fullPage: true });
    await page.locator('#editor-cancel').click();
    for (const width of [320, 768]) {
      await page.setViewportSize({ width, height: 844 });
      await noOverflow();
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('[data-delete]').click();
    await page.locator('#delete-cancel').click();
    assert.equal(await page.locator('.admin-row').count(), 1);
    await page.locator('[data-delete]').click();
    await page.locator('#delete-confirm').click();
    await settled();
    assert.equal(await page.locator('.admin-row').count(), 0);
    await detail.reload();
    await detail.waitForFunction(() => document.querySelector('#news-status').textContent.includes('Одоогоор'));
    assert.equal(await detail.locator('.news-item').count(), 0);

    await page.locator('[data-collection="routes"]').click();
    await page.screenshot({ path: path.join(output, 'routes-mobile.png'), fullPage: true });
    await noOverflow();
    await page.locator('[data-edit]').first().click();
    await page.screenshot({ path: path.join(output, 'route-editor-mobile.png'), fullPage: true });
    await noOverflow();
    await page.locator('#save-content').scrollIntoViewIfNeeded();
    assert.equal(await page.locator('#save-content').isVisible(), true);
    await page.evaluate(() => window.__walkyTest.setUser('regular'));
    await visible('#admin-gate');
    assert.equal(await page.locator('#editor-dialog').isVisible(), false);
    assert.equal(await page.locator('.admin-row').count(), 0);

    await detail.evaluate(() => window.__walkyTest.clearContent());
    await detail.goto(`${base}/explore.html`);
    await detail.waitForFunction(() => document.querySelector('#route-count').textContent === '0 жим');
    assert.equal(await detail.locator('.route-card').count(), 0);
    await detail.goto(`${base}/map.html`);
    await detail.waitForFunction(() => document.querySelector('#route-selector').disabled);
    assert.equal(await detail.locator('#route-selector option').count(), 0);
    await detail.goto(`${base}/route-detail.html?id=bogd-khan-yagaan-sandal`);
    await detail.waitForFunction(() => document.querySelector('#route-name').textContent === 'Энэ жим олдсонгүй');
    assert.equal(await detail.locator('#detail-save-route').isVisible(), false);
    assert.deepEqual(errors, []);
    console.log('Browser checks passed: access control, route and news CRUD, validation, public updates, deletion, safe text rendering, mobile overflow and empty collections.');
    console.log(`Screenshots: ${output}`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
