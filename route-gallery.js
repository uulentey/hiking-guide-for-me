/* Route and surrounding-area photos. Source and license details are retained in zurag/gallery/sources.json. */
const GALLERY_PHOTOS = {
  "bogd-forest": {
    "src": "zurag/gallery/bogd-forest.jpg",
    "thumbnail": "zurag/gallery/bogd-forest-thumb.jpg",
    "caption": "Богд хан уулын хөндий",
    "alt": "Богд хан уулын ой мод, ногоон хөндий",
    "author": "Chongkian",
    "source": "https://commons.wikimedia.org/wiki/File:Bogd_Khan_Mountain.jpg",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0/"
  },
  "bogd-river": {
    "src": "zurag/gallery/bogd-river.png",
    "thumbnail": "zurag/gallery/bogd-river-thumb.png",
    "caption": "Богд хан уулын горхи",
    "alt": "Ой модны дундуур урсах Богд хан уулын горхи",
    "author": "MN5",
    "source": "https://commons.wikimedia.org/wiki/File:Mountain_river_Bogd_khaan_mountain_Mongolia.png",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0/"
  },
  "dugui-view": {
    "src": "zurag/gallery/dugui-view.jpg",
    "thumbnail": "zurag/gallery/dugui-view-thumb.jpg",
    "caption": "Дугуй цагааны амрах хэсэг",
    "alt": "Дугуй цагааны модон саравч, ой мод",
    "author": "Shinetungalag",
    "source": "https://commons.wikimedia.org/wiki/File:Dugui_Tsagaan_of_Bogd_Khan_Mountain.jpg",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0/"
  },
  "manzushir": {
    "src": "zurag/gallery/manzushir.jpg",
    "thumbnail": "zurag/gallery/manzushir-thumb.jpg",
    "caption": "Манзуширын хийд",
    "alt": "Богд хан уулын бэл дэх Манзуширын хийдийн барилга",
    "author": "Chongkian",
    "source": "https://commons.wikimedia.org/wiki/File:Manzushir_Monastery.jpg",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0/"
  },
  "manzushir-ruins": {
    "src": "zurag/gallery/manzushir-ruins.jpg",
    "thumbnail": "zurag/gallery/manzushir-ruins-thumb.jpg",
    "caption": "Манзуширын хийдийн туурь",
    "alt": "Манзуширын хийдийн тууриас харагдах уулын хөндий",
    "author": "Yaan",
    "source": "https://commons.wikimedia.org/wiki/File:Manzushir.jpg",
    "license": "CC BY-SA 3.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0/"
  },
  "bogd-panorama": {
    "src": "zurag/gallery/bogd-panorama.jpg",
    "thumbnail": "zurag/gallery/bogd-panorama-thumb.jpg",
    "caption": "Хотоос харагдах Богд хан уул",
    "alt": "Улаанбаатарын цаана харагдах Богд хан уул",
    "author": "Bogomolov.PL",
    "source": "https://commons.wikimedia.org/wiki/File:Bogd_Khan_Uul_Mount_view_from_Ulan_Bator,_Mongolia.JPG",
    "license": "Public domain"
  },
  "turtle-autumn": {
    "src": "zurag/gallery/turtle-autumn.jpg",
    "thumbnail": "zurag/gallery/turtle-autumn-thumb.jpg",
    "caption": "Мэлхий хад · намрын өнгө",
    "alt": "Намрын шаргал хөндий дэх Мэлхий хад",
    "author": "GlacierNPS",
    "source": "https://commons.wikimedia.org/wiki/File:20191001_TurtleRock_(49526875751).jpg",
    "license": "Public domain"
  },
  "turtle-landscape": {
    "src": "zurag/gallery/turtle-landscape.jpg",
    "thumbnail": "zurag/gallery/turtle-landscape-thumb.jpg",
    "caption": "Мэлхий хад · ойроос",
    "alt": "Мэлхий хадны тогтоц, хадны ойрын харагдац",
    "author": "Vidor at English Wikipedia",
    "source": "https://commons.wikimedia.org/wiki/File:Turtle_Rock_Mongolia.jpg",
    "license": "Public domain"
  },
  "turtle-valley": {
    "src": "zurag/gallery/turtle-valley.jpg",
    "thumbnail": "zurag/gallery/turtle-valley-thumb.jpg",
    "caption": "Мэлхий хадны орчим",
    "alt": "Мэлхий хад, ойр орчмын хөндий, монгол гэр",
    "author": "CeeGee",
    "source": "https://commons.wikimedia.org/wiki/File:TurtleRockGorkhi-TereljNP_(2).jpg",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0/"
  },
  "turtle-close": {
    "src": "zurag/gallery/turtle-close.jpg",
    "thumbnail": "zurag/gallery/turtle-close-thumb.jpg",
    "caption": "Мэлхий хад · зуны өнгө",
    "alt": "Зуны ногоон хөндий дэх Мэлхий хад",
    "author": "Brücke-Osteuropa",
    "source": "https://commons.wikimedia.org/wiki/File:Gorkhi-Terelj_National_Park_46.JPG",
    "license": "Public domain"
  }
};

const ROUTE_GALLERY_KEYS = {
  'bogd-khan-yagaan-sandal': ['dugui-view', 'bogd-forest', 'bogd-river', 'bogd-panorama'],
  'bogd-khan-dugui-tsagaan': ['dugui-view', 'bogd-forest', 'bogd-river', 'bogd-panorama'],
  'bogd-khan-summit': ['manzushir', 'manzushir-ruins', 'bogd-forest', 'bogd-river'],
  'tenger-rock': ['bogd-forest', 'bogd-river', 'bogd-panorama'],
  'terelj-turtle-rock': ['turtle-autumn', 'turtle-landscape', 'turtle-valley', 'turtle-close']
};

function isGalleryImage(source) {
  if (typeof source !== 'string' || /[\s<>]/.test(source)) return false;
  if (source.startsWith('zurag/') && !source.split(/[/?#]/).includes('..')) return true;
  try { return new URL(source).protocol === 'https:'; } catch { return false; }
}

function getRoutePhotos(route) {
  if (!route) return [];
  // A route's own images replace the curated extras; its cover remains first.
  const extras = Array.isArray(route.images) && route.images.length
    ? route.images : (ROUTE_GALLERY_KEYS[route.id] || []).map(key => GALLERY_PHOTOS[key]);
  const coverMetadata = extras.find(photo => photo && typeof photo === 'object' && photo.src === route.image) || {};
  const cover = {
    ...coverMetadata,
    src: route.image, alt: coverMetadata.alt || `${route.name} — жимийн зураг`, caption: coverMetadata.caption || route.name,
    position: coverMetadata.position || (route.id === 'bogd-khan-yagaan-sandal' ? 'center 75%' : 'center')
  };
  const seen = new Set();
  return [cover, ...extras].flatMap((entry) => {
    const photo = typeof entry === 'string' ? { src: entry } : entry;
    if (!photo || !isGalleryImage(photo.src) || seen.has(photo.src)) return [];
    seen.add(photo.src);
    return [{ ...photo, thumbnail: isGalleryImage(photo.thumbnail) ? photo.thumbnail : photo.src, alt: photo.alt || photo.caption || `${route.name} — зураг`, caption: photo.caption || route.name }];
  }).slice(0, 5);
}

let routeGalleryVersion = 0;

function renderRouteGallery(route) {
  const gallery = document.getElementById('route-gallery');
  if (!gallery) return;
  const version = ++routeGalleryVersion;
  gallery.hidden = !route;
  if (!route) return;

  const image = gallery.querySelector('#gallery-image');
  const thumbnails = gallery.querySelector('#gallery-thumbnails');
  const counter = gallery.querySelector('#gallery-counter');
  const caption = gallery.querySelector('#gallery-caption');
  const credit = gallery.querySelector('#gallery-credit');
  const status = gallery.querySelector('#gallery-status');
  const unavailable = gallery.querySelector('#gallery-unavailable');
  const previous = gallery.querySelector('#gallery-previous');
  const next = gallery.querySelector('#gallery-next');
  const currentSource = gallery.dataset.routeId === route.id ? image.getAttribute('src') : null;
  let photos = getRoutePhotos(route);
  let selected = Math.max(0, photos.findIndex(photo => photo.src === currentSource));
  gallery.dataset.routeId = route.id;

  function addCreditLink(text, url) {
    let valid = false;
    try { valid = new URL(url).protocol === 'https:'; } catch { /* Show plain text if no source link is provided. */ }
    if (!valid) { credit.append(document.createTextNode(text)); return; }
    const link = document.createElement('a');
    link.textContent = text; link.href = url; link.target = '_blank'; link.rel = 'noopener noreferrer';
    credit.append(link);
  }

  function selectPhoto(index, announce = true) {
    if (!photos.length) return;
    selected = (index + photos.length) % photos.length;
    const photo = photos[selected];
    image.alt = photo.alt;
    image.style.objectPosition = photo.position || 'center';
    if (image.getAttribute('src') !== photo.src) image.src = photo.src;
    counter.textContent = `${selected + 1} / ${photos.length}`;
    caption.textContent = photo.caption;
    credit.replaceChildren();
    if (photo.author) {
      credit.append(document.createTextNode('Зураг: '));
      addCreditLink(photo.author, photo.source);
    } else if (photo.source) { addCreditLink('Зургийн эх сурвалж', photo.source); }
    if (photo.license) {
      if (credit.childNodes.length) credit.append(document.createTextNode(' · '));
      addCreditLink(photo.license === 'Public domain' ? 'Нийтийн өмч' : photo.license, photo.licenseUrl);
      if (photo.license !== 'Public domain') credit.append(document.createTextNode(' · Хэмжээг тааруулсан'));
    }
    [...thumbnails.children].forEach((button, i) => button.setAttribute('aria-pressed', String(i === selected)));
    status.textContent = announce ? `${selected + 1} / ${photos.length} зураг. ${photo.caption}` : '';
  }

  function removeUnavailable(source) {
    if (version !== routeGalleryVersion) return;
    if (!photos.some(photo => photo.src === source)) return;
    const current = photos[selected]?.src;
    const focusedThumbnail = thumbnails.contains(document.activeElement);
    photos = photos.filter(photo => photo.src !== source);
    selected = Math.max(0, photos.findIndex(photo => photo.src === current));
    drawThumbnails(true);
    selectPhoto(selected);
    if (focusedThumbnail) thumbnails.children[selected]?.focus();
  }

  function drawThumbnails(failed = false) {
    gallery.querySelector('figure').hidden = !photos.length;
    unavailable.hidden = photos.length > 0;
    unavailable.textContent = failed
      ? 'Зургийг харуулж чадсангүй. Түр хүлээгээд хуудсаа дахин нээгээрэй.' : 'Энэ жимийн зураг одоохондоо алга.';
    if (!photos.length) status.textContent = unavailable.textContent;
    previous.hidden = next.hidden = counter.hidden = thumbnails.hidden = photos.length < 2;
    thumbnails.style.gridTemplateColumns = `repeat(${Math.max(1, photos.length)}, minmax(0, 1fr))`;
    thumbnails.replaceChildren();
    photos.forEach((photo, index) => {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'gallery-thumbnail';
      button.setAttribute('aria-label', `${index + 1}-р зураг: ${photo.caption}`);
      button.setAttribute('aria-controls', 'gallery-image');
      const thumbnail = document.createElement('img');
      thumbnail.alt = ''; thumbnail.loading = 'lazy'; thumbnail.decoding = 'async';
      thumbnail.style.objectPosition = photo.position || 'center';
      thumbnail.addEventListener('error', () => {
        if (thumbnail.getAttribute('src') !== photo.src) thumbnail.src = photo.src;
        else removeUnavailable(photo.src);
      });
      thumbnail.src = photo.thumbnail;
      button.append(thumbnail);
      button.addEventListener('click', () => selectPhoto(index));
      thumbnails.append(button);
    });
  }

  previous.onclick = () => selectPhoto(selected - 1);
  next.onclick = () => selectPhoto(selected + 1);
  gallery.onkeydown = (event) => {
    if (!photos.length || !event.target.closest('button')) return;
    const index = { ArrowLeft: selected - 1, ArrowRight: selected + 1, Home: 0, End: photos.length - 1 }[event.key];
    if (index === undefined) return;
    event.preventDefault(); selectPhoto(index);
    if (thumbnails.contains(event.target)) thumbnails.children[selected]?.focus();
  };
  image.onerror = () => {
    if (image.complete && !image.naturalWidth) removeUnavailable(image.getAttribute('src'));
  };
  drawThumbnails();
  selectPhoto(selected, false);
}

if (typeof module !== 'undefined' && module.exports) module.exports = { getRoutePhotos };
