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
    const shownFeatures=features.slice(0,2);
    return `<article class="product-card reveal in" data-product-id="${product.id}">
      <div class="product-visual">
        ${product.badge ? `<span class="product-badge">${escapeHtml(product.badge)}</span>` : ''}
        ${visual}
      </div>
      <div class="product-content">
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

  const productHasOption = (p,id) => (p.filter_options||[]).some(o=>Number(o.id)===Number(id));
  const countFor = (products, predicate) => products.reduce((n,p)=>n+(predicate(p)?1:0),0);

  function checkRow({kind,id,name,count,factoryId='',groupId=''}){
    return `<label class="catalog-check" ${factoryId!==''?`data-factory-id="${factoryId}"`:''}>
      <input type="checkbox" value="${id}" data-filter-${kind} ${groupId!==''?`data-group-id="${groupId}"`:''}>
      <span class="catalog-check-box" aria-hidden="true"></span>
      <span class="catalog-check-name">${escapeHtml(name)}</span>
      <small>${Number(count) > 0 ? count : ''}</small>
    </label>`;
  }

  function filtersMarkup(meta, products){
    const sections=[];
    for(const g of meta.groups||[]){
      const rows=(g.options||[]).map(o=>checkRow({kind:'option',id:o.id,name:o.name,count:countFor(products,p=>productHasOption(p,o.id)),groupId:g.id})).join('');
      if(rows) sections.push(`<section class="catalog-filter-section" data-filter-group="${g.id}"><h3>${escapeHtml(g.name)}</h3><div class="catalog-check-list">${rows}</div></section>`);
    }
    if(meta.price_min||meta.price_max){
      sections.push(`<section class="catalog-filter-section"><h3>Цена</h3><div class="catalog-price-filter"><label><span>от</span><input inputmode="numeric" autocomplete="off" placeholder="${meta.price_min ? 'от '+formatNumber(meta.price_min) : 'от'}" data-price-min></label><span class="catalog-price-dash">—</span><label><span>до</span><input inputmode="numeric" autocomplete="off" placeholder="${meta.price_max ? 'до '+formatNumber(meta.price_max) : 'до'}" data-price-max></label></div></section>`);
    }
    return `<aside class="catalog-filter-shell" data-catalog-filters>
      <div class="catalog-filter-inner">
        <div class="catalog-filter-top">
          <div><strong>Фильтры</strong><span data-result-count>Найдено: ${products.length}</span></div>
          <button type="button" class="catalog-reset" data-filter-reset>Сбросить</button>
        </div>
        <button type="button" class="catalog-filter-mobile-toggle" data-filter-toggle aria-expanded="false">Показать фильтры</button>
        <div class="catalog-filter-body" data-filter-body>${sections.join('')}</div>
      </div>
    </aside>`;
  }

  function createBrowser(grid, meta, products){
    const browser=document.createElement('div');
    browser.className='catalog-browser';
    const temp=document.createElement('div');
    temp.innerHTML=filtersMarkup(meta,products);
    const shell=temp.firstElementChild;
    const results=document.createElement('div');
    results.className='catalog-results';
    results.innerHTML=`<div class="catalog-results-head"><span>Каталог</span><strong data-result-count-head>${products.length} моделей</strong></div>`;
    grid.parentNode.insertBefore(browser,grid);
    browser.appendChild(shell);
    browser.appendChild(results);
    results.appendChild(grid);
    return {browser,shell,results};
  }

  function bindFilters(shell, products, meta, grid, category){
    if(!shell) return;
    const optionChecks=[...shell.querySelectorAll('[data-filter-option]')];
    const minInput=shell.querySelector('[data-price-min]');
    const maxInput=shell.querySelector('[data-price-max]');
    const resultLabels=[...shell.closest('.catalog-browser').querySelectorAll('[data-result-count], [data-result-count-head]')];
    const mobileToggle=shell.querySelector('[data-filter-toggle]');
    const body=shell.querySelector('[data-filter-body]');
    // На коротком каталоге боковушка обычная; на длинном остаётся рядом при прокрутке.
    shell.classList.toggle('is-sticky', products.length > 12);

    const selectedSet = checks => new Set(checks.filter(c=>c.checked).map(c=>Number(c.value)));
    function selectedOptionsByGroup(){
      const map=new Map();
      optionChecks.filter(c=>c.checked).forEach(c=>{
        const gid=Number(c.dataset.groupId);
        if(!map.has(gid)) map.set(gid,new Set());
        map.get(gid).add(Number(c.value));
      });
      return map;
    }
    function setResultCount(n){
      resultLabels.forEach(el=>{
        if(el.hasAttribute('data-result-count')) el.textContent=`Найдено: ${n}`;
        else el.textContent=`${n} ${n%10===1&&n%100!==11?'модель':(n%10>=2&&n%10<=4&&(n%100<10||n%100>=20)?'модели':'моделей')}`;
      });
    }
    function apply(){
      const groups=selectedOptionsByGroup();
      const min=Number(digits(minInput?.value))||null;
      const max=Number(digits(maxInput?.value))||null;
      const filtered=products.filter(p=>{
        if(min||max){
          const price=Number(p.price_amount)||0;
          if(!price) return false;
          if(min&&price<min) return false;
          if(max&&price>max) return false;
        }
        const productOptions=new Set((p.filter_options||[]).map(x=>Number(x.id)));
        for(const selected of groups.values()){
          let ok=false;
          for(const id of selected){ if(productOptions.has(id)){ok=true;break;} }
          if(!ok) return false;
        }
        return true;
      });
      grid.innerHTML=filtered.length?filtered.map((p,i)=>card(p,i,category)).join(''):`<div class="catalog-loading">По выбранным фильтрам моделей пока нет. Попробуйте изменить параметры.</div>`;
      setResultCount(filtered.length);
      shell.classList.toggle('has-active-filters',optionChecks.some(c=>c.checked)||!!digits(minInput?.value)||!!digits(maxInput?.value));
    }
    function formatPriceInput(input){
      if(!input)return;
      const d=digits(input.value);
      input.value=d?formatNumber(d):'';
    }
    optionChecks.forEach(c=>c.addEventListener('change',apply));
    [minInput,maxInput].forEach(i=>{
      i?.addEventListener('input',()=>{const raw=digits(i.value);i.value=raw?formatNumber(raw):'';try{i.setSelectionRange(i.value.length,i.value.length)}catch(_){};apply();});
      i?.addEventListener('blur',()=>formatPriceInput(i));
    });
    shell.querySelector('[data-filter-reset]')?.addEventListener('click',()=>{
      optionChecks.forEach(c=>c.checked=false);
      if(minInput)minInput.value='';
      if(maxInput)maxInput.value='';
      apply();
    });
    mobileToggle?.addEventListener('click',()=>{
      const open=shell.classList.toggle('mobile-open');
      mobileToggle.setAttribute('aria-expanded',String(open));
      mobileToggle.textContent=open?'Скрыть фильтры':'Показать фильтры';
    });
    apply();
  }

  async function loadGrid(grid){
    const category = grid.dataset.category;
    try {
      const r = await fetch(`${API_BASE}/api/products?category=${encodeURIComponent(category)}`);
      if (!r.ok) throw new Error('catalog');
      const data = await r.json();
      const products = data.products || [];
      const meta=data.meta||{};
      const existing=grid.closest('.catalog-browser');
      if(existing){ const parent=existing.parentNode; parent.insertBefore(grid,existing); existing.remove(); }
      if(products.length){
        const {shell}=createBrowser(grid,meta,products);
        bindFilters(shell,products,meta,grid,category);
      }else grid.innerHTML=`<div class="catalog-loading">Пока здесь нет опубликованных моделей.</div>`;
    } catch (e) {
      grid.innerHTML = `<div class="catalog-loading">Не удалось загрузить каталог. Оставьте заявку — подскажем актуальные варианты.</div>`;
    }
  }
  document.addEventListener('DOMContentLoaded', () => document.querySelectorAll('[data-product-grid]').forEach(loadGrid));
})();
