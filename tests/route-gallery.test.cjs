const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { getRoutePhotos } = require('../route-gallery.js');

test('gallery keeps the cover, removes duplicates, and caps the total at five photos', () => {
  const cover = 'https://example.com/cover.jpg';
  const images = [cover, ...Array.from({ length: 8 }, (_, i) => `https://example.com/${i}.jpg`)];
  const photos = getRoutePhotos({ id: 'custom', name: 'Жим', image: cover, images });
  assert.equal(photos.length, 5);
  assert.equal(photos[0].src, cover);
  assert.equal(new Set(photos.map(photo => photo.src)).size, 5);
});

test('custom route photos replace curated extras and retain their captions and credits', () => {
  const cover = { src: 'https://example.com/cover.jpg', caption: 'Оргил', alt: 'Оргилын зураг', author: 'Photographer', source: 'https://example.com/source', license: 'CC BY 4.0' };
  const photos = getRoutePhotos({ id: 'bogd-khan-summit', name: 'Жим', image: cover.src, images: [cover, 'https://example.com/second.jpg'] });
  assert.deepEqual(photos.map(photo => photo.src), [cover.src, 'https://example.com/second.jpg']);
  assert.equal(photos[0].caption, cover.caption);
  assert.equal(photos[0].alt, cover.alt);
  assert.equal(photos[0].author, cover.author);
  assert.equal(photos[0].license, cover.license);
});

test('unsafe or malformed sources are excluded without losing valid photos', () => {
  const images = [null, {}, 42, 'javascript:alert(1)', 'data:image/png;base64,abc', 'http://example.com/photo.jpg', 'zurag/../private.jpg', 'zurag/photo with spaces.jpg', 'zurag/tsetseeGun.jpg'];
  const photos = getRoutePhotos({ id: 'custom', name: 'Жим', images });
  assert.deepEqual(photos.map(photo => photo.src), ['zurag/tsetseeGun.jpg']);
  assert.deepEqual(getRoutePhotos(null), []);
  assert.deepEqual(getRoutePhotos({ id: 'custom', name: 'Жим' }), []);
});

test('every existing route has several distinct local photos and source credits for new assets', () => {
  const root = path.resolve(__dirname, '..');
  const routes = {
    'bogd-khan-yagaan-sandal': 'emoSandal.jpg',
    'bogd-khan-dugui-tsagaan': 'duguiTsagaan.jpg',
    'bogd-khan-summit': 'tsetseeGun.jpg',
    'tenger-rock': 'tengerHad.jpg',
    'terelj-turtle-rock': 'terelj.jpg'
  };
  for (const [id, image] of Object.entries(routes)) {
    const photos = getRoutePhotos({ id, name: id, image: `zurag/${image}` });
    assert.ok(photos.length >= 3 && photos.length <= 5, id);
    for (const photo of photos) {
      assert.ok(fs.existsSync(path.join(root, photo.src)), photo.src);
      assert.ok(fs.existsSync(path.join(root, photo.thumbnail)), photo.thumbnail);
      assert.ok(photo.alt && photo.caption, photo.src);
      if (photo.src.startsWith('zurag/gallery/')) assert.ok(photo.author && photo.source && photo.license, photo.src);
    }
  }
});
