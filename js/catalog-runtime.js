(() => {
  const API_BASE = window.EVEREST_API_BASE || 'https://everest-api.lowelette.ru';
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const waUrl = (productName) => {
    const settings = window.EverestSettings || {};
    const number = String(settings.whatsapp_number || '79297165716').replace(/\D/g,'');
    const text = `Здравствуйте! Хочу узнать подробнее про дверь «${productName}». Пришлите, пожалуйста, актуальную цену и варианты.`;
    return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
  };
  function card(product, index, category){
    let features = [];
    try { features = Array.isArray(product.features) ? product.features : JSON.parse(product.features_json || '[]'); } catch(_){}
    const visualClass = `catalog-door ${category === 'interior' ? 'interior ' : ''}${escapeHtml(product.visual_style || `v${(index % 6)+1}`)}`;
    const visual = product.image_url
      ? `<img class="catalog-product-image" src="${escapeHtml(product.image_url)}" alt="${escapeHtml(product.name)}" loading="lazy">`
      : `<div class="${visualClass}" aria-hidden="true"></div>`;
    return `<article class="product-card reveal in" data-product-id="${product.id}">
      <div class="product-visual">
        ${product.badge ? `<span class="product-badge">${escapeHtml(product.badge)}</span>` : ''}
        ${visual}
      </div>
      <div class="product-content">
        ${product.tagline ? `<span class="product-tag">${escapeHtml(product.tagline)}</span>` : ''}
        <h3>${escapeHtml(product.name)}</h3>
        <p>${escapeHtml(product.description || '')}</p>
        ${features.length ? `<ul class="product-points">${features.map(f => `<li>${escapeHtml(f)}</li>`).join('')}</ul>` : ''}
        <div class="product-footer">
          <span class="product-price">${escapeHtml(product.price_text || 'Цена — по запросу')}</span>
          <a class="btn btn-primary" href="${waUrl(product.name)}" target="_blank" rel="noopener">Узнать подробнее</a>
        </div>
      </div>
    </article>`;
  }
  async function loadGrid(grid){
    const category = grid.dataset.category;
    try {
      const r = await fetch(`${API_BASE}/api/products?category=${encodeURIComponent(category)}`);
      if (!r.ok) throw new Error('catalog');
      const data = await r.json();
      const products = data.products || [];
      grid.innerHTML = products.length
        ? products.map((p,i)=>card(p,i,category)).join('')
        : `<div class="catalog-loading">Пока здесь нет опубликованных моделей.</div>`;
    } catch (e) {
      grid.innerHTML = `<div class="catalog-loading">Не удалось загрузить каталог. Оставьте заявку — подскажем актуальные варианты.</div>`;
    }
  }
  document.addEventListener('DOMContentLoaded', () => document.querySelectorAll('[data-product-grid]').forEach(loadGrid));
})();
