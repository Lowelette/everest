(() => {
  const API_BASE = window.EVEREST_API_BASE || 'https://everest-api.lowelette.ru';
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const digits = value => String(value || '').replace(/\D/g,'');
  const formatNumber = value => new Intl.NumberFormat('ru-RU').format(Number(value));
  const formatPrice = product => Number(product.price_amount)>0 ? `${formatNumber(product.price_amount)} ₽` : (product.price_text || 'Цена по запросу');
  const waUrl = (productName) => {
    const settings = window.EverestSettings || {};
    const number = String(settings.whatsapp_number || '79297165716').replace(/\D/g,'');
    const text = `Здравствуйте! Хочу узнать подробнее про дверь «${productName}». Подскажите, пожалуйста, актуальную цену и варианты.`;
    return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
  };

  function card(product, index, category){
    let features = [];
    try { features = Array.isArray(product.features) ? product.features : JSON.parse(product.features_json || '[]'); } catch(_){}
    const visualClass = `catalog-door ${category === 'interior' ? 'interior ' : ''}${escapeHtml(product.visual_style || `v${(index % 6)+1}`)}`;
    const visual = product.image_url
      ? `<img class="catalog-product-image" src="${escapeHtml(product.image_url)}" alt="${escapeHtml(product.name)}" loading="lazy">`
      : `<div class="${visualClass}" aria-hidden="true"></div>`;
    const meta=[];
    if(product.factory?.name) meta.push(product.factory.name);
    if(product.door_class?.name) meta.push(product.door_class.name);
    const shownFeatures=features.slice(0,2);
    return `<article class="product-card reveal in" data-product-id="${product.id}">
      <div class="product-visual">
        ${product.badge ? `<span class="product-badge">${escapeHtml(product.badge)}</span>` : ''}
        ${visual}
      </div>
      <div class="product-content">
        ${meta.length?`<div class="product-meta">${meta.map(x=>`<span>${escapeHtml(x)}</span>`).join('')}</div>`:''}
        ${product.tagline ? `<span class="product-tag">${escapeHtml(product.tagline)}</span>` : ''}
        <h3>${escapeHtml(product.name)}</h3>
        ${product.description?`<p class="product-description">${escapeHtml(product.description)}</p>`:''}
        ${shownFeatures.length ? `<ul class="product-points">${shownFeatures.map(f => `<li>${escapeHtml(f)}</li>`).join('')}${features.length>2?`<li class="more-point">+ ещё ${features.length-2}</li>`:''}</ul>` : ''}
        <div class="product-footer">
          <strong class="product-price">${escapeHtml(formatPrice(product))}</strong>
          <a class="btn btn-primary" href="${waUrl(product.name)}" target="_blank" rel="noopener">Подробнее</a>
        </div>
      </div>
    </article>`;
  }

  function filtersMarkup(meta){
    const hasFilters=(meta.factories?.length||meta.classes?.length||meta.groups?.length||meta.price_min||meta.price_max);
    if(!hasFilters) return '';
    const groups=(meta.groups||[]).map(g=>`<details class="catalog-filter-dropdown" data-filter-group="${g.id}"><summary>${escapeHtml(g.name)} <b data-filter-count="${g.id}"></b></summary><div class="catalog-filter-options">${(g.options||[]).map(o=>`<label><input type="checkbox" value="${o.id}"><span>${escapeHtml(o.name)}</span></label>`).join('')}</div></details>`).join('');
    return `<section class="catalog-filter-shell" data-catalog-filters>
      <div class="catalog-filter-top">
        <div><strong>Фильтры</strong><span data-result-count></span></div>
        <button type="button" class="catalog-reset" data-filter-reset>Сбросить</button>
      </div>
      <div class="catalog-filter-row">
        ${meta.factories?.length?`<label class="catalog-filter-field"><span>Фабрика</span><select data-filter-factory><option value="">Все фабрики</option>${meta.factories.map(f=>`<option value="${f.id}">${escapeHtml(f.name)}</option>`).join('')}</select></label>`:''}
        ${meta.classes?.length?`<label class="catalog-filter-field"><span>Серия / класс</span><select data-filter-class><option value="">Все серии</option>${meta.classes.map(c=>`<option value="${c.id}" data-factory-id="${c.factory_id||''}">${escapeHtml(c.name)}</option>`).join('')}</select></label>`:''}
        ${groups}
        ${(meta.price_min||meta.price_max)?`<div class="catalog-price-filter"><span>Цена, ₽</span><div><input inputmode="numeric" placeholder="от${meta.price_min?` ${formatNumber(meta.price_min)}`:''}" data-price-min><i>—</i><input inputmode="numeric" placeholder="до${meta.price_max?` ${formatNumber(meta.price_max)}`:''}" data-price-max></div></div>`:''}
      </div>
    </section>`;
  }

  function bindFilters(shell, products, meta, grid, category){
    if(!shell) return;
    const factory=shell.querySelector('[data-filter-factory]');
    const classSelect=shell.querySelector('[data-filter-class]');
    const minInput=shell.querySelector('[data-price-min]');
    const maxInput=shell.querySelector('[data-price-max]');
    const checks=[...shell.querySelectorAll('[data-filter-group] input[type="checkbox"]')];
    const result=shell.querySelector('[data-result-count]');
    function updateClassOptions(){
      if(!classSelect) return;
      const fid=factory?.value||'';
      [...classSelect.options].forEach((o,i)=>{if(i===0)return;const own=o.dataset.factoryId||'';o.hidden=!!fid && !!own && own!==fid});
      const selected=classSelect.selectedOptions[0]; if(selected?.hidden) classSelect.value='';
    }
    function selectedByGroup(){
      const map=new Map();
      checks.filter(c=>c.checked).forEach(c=>{const gid=Number(c.closest('[data-filter-group]').dataset.filterGroup);if(!map.has(gid))map.set(gid,new Set());map.get(gid).add(Number(c.value))});
      return map;
    }
    function updateCounts(){
      (meta.groups||[]).forEach(g=>{const n=checks.filter(c=>c.checked&&Number(c.closest('[data-filter-group]').dataset.filterGroup)===Number(g.id)).length;const b=shell.querySelector(`[data-filter-count="${g.id}"]`);if(b)b.textContent=n?`(${n})`:''})
    }
    function apply(){
      const fid=Number(factory?.value)||null;
      const cid=Number(classSelect?.value)||null;
      const min=Number(digits(minInput?.value))||null;
      const max=Number(digits(maxInput?.value))||null;
      const groups=selectedByGroup();
      const filtered=products.filter(p=>{
        if(fid && Number(p.factory?.id)!==fid) return false;
        if(cid && Number(p.door_class?.id)!==cid) return false;
        if(min||max){const price=Number(p.price_amount)||0;if(!price)return false;if(min&&price<min)return false;if(max&&price>max)return false;}
        const productOptions=new Set((p.filter_options||[]).map(x=>Number(x.id)));
        for(const selected of groups.values()){let ok=false;for(const id of selected){if(productOptions.has(id)){ok=true;break}}if(!ok)return false;}
        return true;
      });
      grid.innerHTML=filtered.length?filtered.map((p,i)=>card(p,i,category)).join(''):`<div class="catalog-loading">По выбранным фильтрам моделей пока нет. Попробуйте изменить параметры.</div>`;
      if(result) result.textContent=`Найдено: ${filtered.length}`;
      updateCounts();
    }
    function formatPriceInput(input){if(!input)return;const d=digits(input.value);input.value=d?formatNumber(d):''}
    factory?.addEventListener('change',()=>{updateClassOptions();apply()});
    classSelect?.addEventListener('change',apply);
    checks.forEach(c=>c.addEventListener('change',apply));
    [minInput,maxInput].forEach(i=>{i?.addEventListener('input',()=>{const pos=i.selectionStart;const raw=digits(i.value);i.value=raw?formatNumber(raw):'';try{i.setSelectionRange(i.value.length,i.value.length)}catch(_){};apply()});i?.addEventListener('blur',()=>formatPriceInput(i))});
    shell.querySelector('[data-filter-reset]')?.addEventListener('click',()=>{if(factory)factory.value='';if(classSelect){classSelect.value='';[...classSelect.options].forEach(o=>o.hidden=false)}checks.forEach(c=>c.checked=false);if(minInput)minInput.value='';if(maxInput)maxInput.value='';apply()});
    updateClassOptions(); apply();
  }

  async function loadGrid(grid){
    const category = grid.dataset.category;
    try {
      const r = await fetch(`${API_BASE}/api/products?category=${encodeURIComponent(category)}`);
      if (!r.ok) throw new Error('catalog');
      const data = await r.json();
      const products = data.products || [];
      const meta=data.meta||{};
      const old=grid.parentElement.querySelector('[data-catalog-filters]'); if(old) old.remove();
      if(products.length){
        const wrap=document.createElement('div');wrap.innerHTML=filtersMarkup(meta);const shell=wrap.firstElementChild;if(shell)grid.before(shell);
        bindFilters(shell,products,meta,grid,category);
      }else grid.innerHTML=`<div class="catalog-loading">Пока здесь нет опубликованных моделей.</div>`;
    } catch (e) {
      grid.innerHTML = `<div class="catalog-loading">Не удалось загрузить каталог. Оставьте заявку — подскажем актуальные варианты.</div>`;
    }
  }
  document.addEventListener('DOMContentLoaded', () => document.querySelectorAll('[data-product-grid]').forEach(loadGrid));
})();
