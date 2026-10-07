/* Shared validation for the admin forms and Firebase writes. */
(function (root) {
  function invalid(message) {
    const error = new Error(message);
    error.code = 'content/invalid';
    throw error;
  }
  function text(value, label, max, optional = false) {
    const result = typeof value === 'string' ? value.trim() : '';
    if ((!optional && !result) || result.length > max) invalid(`${label}: ${max} хүртэл тэмдэгт оруулна уу.`);
    return result;
  }
  function number(value, label, min, max) {
    if (value == null || !['string', 'number'].includes(typeof value) || (typeof value === 'string' && !value.trim())) invalid(`${label}: тоо оруулна уу.`);
    const result = Number(value);
    if (!Number.isFinite(result) || result < min || result > max) invalid(`${label}: ${min}–${max} хооронд тоо оруулна уу.`);
    return result;
  }
  function image(value) {
    const result = text(value, 'Зургийн хаяг', 2048);
    if (/^zurag\/[a-zA-Z0-9_./-]+$/.test(result) && !result.split('/').includes('..')) return result;
    try {
      const url = new URL(result);
      if (url.protocol === 'https:' && url.hostname && !url.username && !url.password) return url.href;
    } catch (_) { /* Show the same validation message for malformed URLs. */ }
    invalid('Зургийн хаяг нь https:// эсвэл zurag/ гэж эхлэх ёстой.');
  }
  function track(value) {
    let points = value || [];
    if (typeof points === 'string') {
      points = points.trim() ? points.trim().split(/\r?\n/).map(line => {
        const pair = line.split(',').map(part => part.trim());
        if (pair.length !== 2 || pair.some(part => !part)) invalid('Координат бүрийг өргөрөг, уртраг гэж тусдаа мөрөнд оруулна уу.');
        return pair;
      }) : [];
    }
    if (!Array.isArray(points) || points.length > 2000 || points.length === 1) invalid('Газрын зургийн жимд 2–2000 цэг оруулна уу, эсвэл хоосон үлдээнэ үү.');
    return points.map(point => {
      if (Array.isArray(point) && point.length !== 2) invalid('Координат бүр хоёр тоотой байх ёстой.');
      return {
        latitude: number(Array.isArray(point) ? point[0] : point?.latitude, 'Өргөрөг', -90, 90),
        longitude: number(Array.isArray(point) ? point[1] : point?.longitude, 'Уртраг', -180, 180)
      };
    });
  }
  function date(value) {
    const result = text(value, 'Мэдээний огноо', 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(result)) invalid('Мэдээний огноог зөв оруулна уу.');
    const parsed = new Date(`${result}T00:00:00Z`);
    if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== result) invalid('Мэдээний огноог зөв оруулна уу.');
    return result;
  }
  function route(data) {
    const difficulty = text(data.difficulty, 'Түвшин', 40);
    if (!['Хялбар', 'Хөнгөн - Дунд', 'Дунд', 'Хэцүү'].includes(difficulty)) invalid('Хүндрэлийн түвшнээ сонгоно уу.');
    if (typeof data.published !== 'boolean') invalid('Нийтлэх төлөвөө сонгоно уу.');
    return {
      name: text(data.name, 'Жимийн нэр', 160),
      area: text(data.area, 'Байршил', 160),
      image: image(data.image),
      difficulty,
      distanceKm: number(data.distanceKm, 'Алхах зай', 0.1, 1000),
      elevationM: number(data.elevationM, 'Өгсөлт', 0, 10000),
      timeHr: text(data.timeHr, 'Хугацаа', 40),
      durationHours: number(data.durationHours, 'Хамгийн их хугацаа', 0.1, 720),
      season: text(data.season, 'Алхах улирал', 160),
      status: text(data.status, 'Товч тэмдэглэл', 160, true),
      desc: text(data.desc, 'Тайлбар', 5000),
      track: track(data.track),
      published: data.published
    };
  }
  function news(data) {
    if (typeof data.published !== 'boolean') invalid('Нийтлэх төлөвөө сонгоно уу.');
    return {
      title: text(data.title, 'Гарчиг', 160),
      summary: text(data.summary, 'Товч агуулга', 400),
      body: text(data.body, 'Дэлгэрэнгүй мэдээ', 12000),
      date: date(data.date),
      published: data.published
    };
  }
  const api = { route, news, track };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.WalkyContent = api;
})(typeof window !== 'undefined' ? window : globalThis);
