/* Defaults for routes created before editable detail sections were added. */
(function (root) {
  const preparation = ['Ундны ус', 'Хөлд эвтэйхэн гутал', 'Дулаан хувцас', 'Цэнэгтэй утас', 'Өөрт хэрэгтэй эм'];
  function guidance(route = {}) {
    const generated = [];
    if (typeof route.distanceKm === 'number') {
      if (route.distanceKm <= 5) generated.push('Богино алхалт хайж байгаа хүмүүст');
      if (route.distanceKm > 6 && route.distanceKm <= 8) generated.push('Өдрийн алхалт сонирхдог хүмүүст');
      if (route.distanceKm > 8) generated.push('Ууланд алхаж дадсан хүмүүст');
    }
    const difficulty = String(route.difficulty || '');
    if (difficulty.includes('Хялбар') || difficulty.includes('Хөнгөн')) generated.push('Алхаж эхэлж байгаа хүмүүст');
    if (difficulty.includes('Дунд')) generated.push('Ууланд алхах дуртай хүмүүст');
    if (difficulty.includes('Хэцүү') && !generated.includes('Ууланд алхаж дадсан хүмүүст')) generated.push('Ууланд алхаж дадсан хүмүүст');
    const hours = (String(route.timeHr || '').match(/\d+(?:\.\d+)?/g) || []).map(Number);
    if (hours.some(hour => hour >= 6)) generated.push('Удаан алхах дуртай хүмүүст');
    if (!generated.length) generated.push('Алхах дуртай хүмүүст');
    const list = (value, fallback) => Array.isArray(value)
      ? value.filter(item => typeof item === 'string' && item.trim()).map(item => item.trim()) : [...fallback];
    return {
      preparationTitle: typeof route.preparationTitle === 'string' && route.preparationTitle.trim() ? route.preparationTitle.trim() : 'Эдгээрийг аваарай',
      preparation: list(route.preparation, preparation),
      audienceTitle: typeof route.audienceTitle === 'string' && route.audienceTitle.trim() ? route.audienceTitle.trim() : 'Өөрийн бэлтгэлдээ тааруулаарай',
      audience: list(route.audience, generated)
    };
  }
  const api = { guidance };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.WalkyRouteContent = api;
})(typeof window !== 'undefined' ? window : globalThis);
