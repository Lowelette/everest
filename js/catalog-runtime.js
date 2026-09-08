(() => {
  const API_BASE = window.EVEREST_API_BASE || 'https://everest-api.lowelette.ru';
  const WHATSAPP_ICON = 'https://static.whatsapp.net/rsrc.php/y1/r/FJbTMJqMap7.svg';
  const MAX_ICON = 'https://max.ru/s/img/big-logo.png';
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const digits = value => String(value || '').replace(/\D/g,'');
  const formatNumber = value => new Intl.NumberFormat('ru-RU').format(Number(value));
  const formatPrice = product => Number(product.price_amount)>0 ? `${formatNumber(product.price_amount)} ₽` : (product.price_text || 'Цена по запросу');
  const normalizeFeatures = value => (Array.isArray(value)?value:[value]).flatMap(x=>String(x??'').replace(/\\n/g,'\n').split(/\r?\n/)).map(x=>x.trim()).filter(Boolean);
  const normalizeSearch = value => String(value || '').toLocaleLowerCase('ru-RU').replace(/ё/g,'е').trim();
  const waUrl = (productName) => {
    const settings = window.EverestSettings || {};
    const number = String(settings.whatsapp_number || '79297165716').replace(/\D/g,'');
    const text = `Здравствуйте! Хочу узнать подробнее про дверь «${productName}». Подскажите, пожалуйста, актуальную цену и варианты.`;
    return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
  };

  const settingOn = (key, fallback=true) => {
    const v=(window.EverestSettings||{})[key];
    if(v==null||v==='') return fallback;
    return ['1','true','yes','on'].includes(String(v).toLowerCase());
  };
  const maxUrl = () => String((window.EverestSettings||{}).max_url||'').trim();
  function groupedOptions(product){
    const groups=new Map();
    for(const o of product.filter_options||[]){const g=o.group_name||'Параметры';if(!groups.has(g))groups.set(g,[]);groups.get(g).push(o.name)}
    return [...groups.entries()];
  }
  function productImageUrls(product){
    const urls=(Array.isArray(product.images)?product.images:[]).map(x=>String(x?.url||'').trim()).filter(Boolean);
    if(urls.length)return [...new Set(urls)];
    return product.image_url?[String(product.image_url)]:[];
  }
  function placeholderMarkup(product,category,index,detail=false){
    const cls=`${detail?'product-detail-placeholder ':''}catalog-door ${category==='interior'?'interior ':''}${escapeHtml(product.visual_style||`v${(index%6)+1}`)}`;
    return `<div class="${cls}" aria-hidden="true"></div>`;
  }
  function galleryMarkup(product,category,index=0,mode='card'){
    const urls=productImageUrls(product);
    if(!urls.length)return placeholderMarkup(product,category,index,mode==='detail');
    const detail=mode==='detail';
    const slides=urls.map((url,i)=>`<img class="${detail?'product-detail-image':'catalog-product-image'}${i===0?' is-active':''}" src="${escapeHtml(url)}" alt="${escapeHtml(product.name)}${urls.length>1?` — фото ${i+1}`:''}" loading="${i===0?'eager':'lazy'}" data-gallery-slide>`).join('');
    const controls=urls.length>1?`<button class="product-gallery-arrow prev" type="button" data-gallery-step="-1" aria-label="Предыдущее фото">‹</button><button class="product-gallery-arrow next" type="button" data-gallery-step="1" aria-label="Следующее фото">›</button><div class="product-gallery-dots">${urls.map((_,i)=>`<button type="button" class="${i===0?'is-active':''}" data-gallery-dot="${i}" aria-label="Фото ${i+1}"></button>`).join('')}</div>`:'';
    return `<div class="product-gallery ${detail?'is-detail':'is-card'}" data-product-gallery data-gallery-index="0"><div class="product-gallery-stage">${slides}</div>${controls}</div>`;
  }
  function setGalleryIndex(root,index){
    if(!root)return;const slides=[...root.querySelectorAll('[data-gallery-slide]')];if(!slides.length)return;
    const next=((Number(index)%slides.length)+slides.length)%slides.length;root.dataset.galleryIndex=String(next);
    slides.forEach((slide,i)=>slide.classList.toggle('is-active',i===next));
    [...root.querySelectorAll('[data-gallery-dot]')].forEach((dot,i)=>dot.classList.toggle('is-active',i===next));
  }
  function bindProductGalleries(scope){
    scope.querySelectorAll('[data-product-gallery]').forEach(root=>{
      if(root.dataset.galleryBound)return;root.dataset.galleryBound='1';
      root.querySelectorAll('[data-gallery-step]').forEach(btn=>btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();setGalleryIndex(root,Number(root.dataset.galleryIndex||0)+Number(btn.dataset.galleryStep||0))}));
      root.querySelectorAll('[data-gallery-dot]').forEach(btn=>btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();setGalleryIndex(root,Number(btn.dataset.galleryDot))}));
      let startX=null;
      root.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse')return;startX=e.clientX});
      root.addEventListener('pointerup',e=>{if(startX==null)return;const dx=e.clientX-startX;startX=null;if(Math.abs(dx)>38)setGalleryIndex(root,Number(root.dataset.galleryIndex||0)+(dx<0?1:-1))});
      root.addEventListener('pointercancel',()=>{startX=null});
    });
  }
  function ensureDetailsDialog(){
    let dialog=document.querySelector('#product-detail-dialog');
    if(dialog) return dialog;
    dialog=document.createElement('dialog');dialog.id='product-detail-dialog';dialog.className='product-detail-dialog';
    dialog.innerHTML='<div class="product-detail-shell"><button type="button" class="product-detail-close" aria-label="Закрыть">×</button><div data-product-detail-body></div></div>';
    document.body.appendChild(dialog);
    dialog.querySelector('.product-detail-close').addEventListener('click',()=>dialog.close());
    dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});
    dialog.addEventListener('close',()=>document.body.classList.remove('product-dialog-open'));
    return dialog;
  }
  function openProductDetails(product, category, index=0){
    const dialog=ensureDetailsDialog();
    const features=normalizeFeatures(product.features);
    const groups=groupedOptions(product);
    const max=maxUrl();
    const showMax=!!max&&settingOn('max_enabled',true);
    const wa=waUrl(product.name);
    const showWa=settingOn('whatsapp_enabled',true)&&/wa\.me\//.test(wa);
    dialog.querySelector('[data-product-detail-body]').innerHTML=`<div class="product-detail-grid"><div class="product-detail-media">${galleryMarkup(product,category,index,'detail')}${product.badge?`<span class="product-detail-badge">${escapeHtml(product.badge)}</span>`:''}</div><div class="product-detail-info">${product.tagline?`<span class="product-detail-tag">${escapeHtml(product.tagline)}</span>`:''}<h2>${escapeHtml(product.name)}</h2><strong class="product-detail-price">${escapeHtml(formatPrice(product))}</strong>${product.description?`<p class="product-detail-description">${escapeHtml(product.description)}</p>`:''}${features.length?`<section><h3>Характеристики</h3><ul class="product-detail-features">${features.map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ul></section>`:''}${groups.length?`<section><h3>Параметры</h3><div class="product-detail-groups">${groups.map(([g,values])=>`<div><strong>${escapeHtml(g)}</strong><span>${values.map(escapeHtml).join(' · ')}</span></div>`).join('')}</div></section>`:''}<div class="product-detail-actions"><a class="btn btn-primary" href="#form" data-detail-measure>Бесплатный замер</a>${showMax?`<a class="btn btn-max messenger-btn" href="${escapeHtml(max)}" target="_blank" rel="noopener"><img class="messenger-icon" src="${MAX_ICON}" alt="" aria-hidden="true">Написать в MAX</a>`:''}${showWa?`<a class="btn btn-whatsapp messenger-btn" href="${escapeHtml(wa)}" target="_blank" rel="noopener"><img class="messenger-icon" src="${WHATSAPP_ICON}" alt="" aria-hidden="true">WhatsApp</a>`:''}</div></div></div>`;
    bindProductGalleries(dialog);
    dialog.querySelector('[data-detail-measure]')?.addEventListener('click',()=>dialog.close());
    document.body.classList.add('product-dialog-open');
    dialog.showModal();
  }

  function card(product, index, category){
    let features = [];
    try { features = normalizeFeatures(Array.isArray(product.features) ? product.features : JSON.parse(product.features_json || '[]')); } catch(_){}
    const shownFeatures=features.slice(0,2);
    return `<article class="product-card reveal in" data-product-id="${product.id}" tabindex="0" role="button" aria-label="Подробнее о модели ${escapeHtml(product.name)}">
      <div class="product-visual">
        ${product.badge ? `<span class="product-badge">${escapeHtml(product.badge)}</span>` : ''}
        ${galleryMarkup(product,category,index,'card')}
      </div>
      <div class="product-content">
        ${product.tagline ? `<span class="product-tag">${escapeHtml(product.tagline)}</span>` : ''}
        <h3>${escapeHtml(product.name)}</h3>
        ${product.description?`<p class="product-description">${escapeHtml(product.description)}</p>`:''}
        ${shownFeatures.length ? `<ul class="product-points">${shownFeatures.map(f => `<li>${escapeHtml(f)}</li>`).join('')}${features.length>2?`<li><button class="more-point" type="button" data-product-details="${product.id}">+ ещё ${features.length-2}</button></li>`:''}</ul>` : ''}
        <div class="product-footer">
          <strong class="product-price">${escapeHtml(formatPrice(product))}</strong>
          <button class="btn btn-primary" type="button" data-product-details="${product.id}">Подробнее</button>
        </div>
      </div>
    </article>`;
  }

  const productHasOption = (p,id) => (p.filter_options||[]).some(o=>Number(o.id)===Number(id));
  const countFor = (products, predicate) => products.reduce((n,p)=>n+(predicate(p)?1:0),0);
  function productSearchText(product){
    return normalizeSearch([
      product.name, product.tagline, product.badge, product.description, product.price_text,
      product.factory?.name, product.door_class?.name,
      ...normalizeFeatures(product.features),
      ...(product.filter_options||[]).flatMap(o=>[o.group_name,o.name])
    ].filter(Boolean).join(' '));
  }
  function isInStock(product){ return /\bв\s*налич/i.test(String(product.badge||'')); }
  function isNew(product){ return /нов/i.test(String(product.badge||'')); }

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
    results.innerHTML=`
      <div class="catalog-results-head"><span>Каталог</span><strong data-result-count-head>${products.length} моделей</strong></div>
      <div class="catalog-tools" aria-label="Поиск и сортировка каталога">
        <label class="catalog-search"><span>Поиск</span><input type="search" autocomplete="off" placeholder="Найти модель, характеристику…" data-catalog-search><button type="button" data-search-clear aria-label="Очистить поиск" hidden>×</button></label>
        <label class="catalog-sort"><span>Сортировка</span><select data-catalog-sort>
          <option value="default">По порядку</option>
          <option value="stock">Сначала в наличии</option>
          <option value="new">Сначала новые</option>
          <option value="price-asc">Цена: сначала дешевле</option>
          <option value="price-desc">Цена: сначала дороже</option>
          <option value="name">По названию</option>
        </select></label>
      </div>`;
    grid.parentNode.insertBefore(browser,grid);
    browser.appendChild(shell);
    browser.appendChild(results);
    results.appendChild(grid);
    return {browser,shell,results};
  }

  function bindFilters(shell, products, meta, grid, category){
    if(!shell) return;
    const browser=shell.closest('.catalog-browser');
    const optionChecks=[...shell.querySelectorAll('[data-filter-option]')];
    const minInput=shell.querySelector('[data-price-min]');
    const maxInput=shell.querySelector('[data-price-max]');
    const searchInput=browser.querySelector('[data-catalog-search]');
    const searchClear=browser.querySelector('[data-search-clear]');
    const sortSelect=browser.querySelector('[data-catalog-sort]');
    const resultLabels=[...browser.querySelectorAll('[data-result-count], [data-result-count-head]')];
    const mobileToggle=shell.querySelector('[data-filter-toggle]');
    const originalOrder=new Map(products.map((p,i)=>[Number(p.id),i]));
    const searchCache=new Map(products.map(p=>[Number(p.id),productSearchText(p)]));

    shell.classList.toggle('is-sticky', products.length > 12);
    if(!grid.dataset.productDetailsBound){
      grid.dataset.productDetailsBound='1';
      const openFromTarget=e=>{
        const btn=e.target.closest('[data-product-details]');
        const cardEl=e.target.closest('.product-card');
        if(!btn&&!cardEl)return false;
        if(!btn&&e.target.closest('[data-gallery-step],[data-gallery-dot],a,button,input,label,select,textarea'))return false;
        const id=btn?btn.dataset.productDetails:cardEl?.dataset.productId;
        const product=products.find(p=>Number(p.id)===Number(id));if(!product)return false;
        e.preventDefault();openProductDetails(product,category,products.indexOf(product));return true;
      };
      grid.addEventListener('click',openFromTarget);
      grid.addEventListener('keydown',e=>{
        if(!['Enter',' '].includes(e.key))return;
        const cardEl=e.target.closest('.product-card');
        if(!cardEl || e.target!==cardEl)return;
        e.preventDefault();
        const product=products.find(p=>Number(p.id)===Number(cardEl.dataset.productId));
        if(product)openProductDetails(product,category,products.indexOf(product));
      });
    }

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
    function resetAll(){
      optionChecks.forEach(c=>c.checked=false);
      if(minInput)minInput.value='';
      if(maxInput)maxInput.value='';
      if(searchInput)searchInput.value='';
      if(sortSelect)sortSelect.value='default';
      if(searchClear)searchClear.hidden=true;
      apply();
    }
    function sortProducts(items){
      const mode=sortSelect?.value||'default';
      const arr=[...items];
      const original=(a,b)=>(originalOrder.get(Number(a.id))??0)-(originalOrder.get(Number(b.id))??0);
      if(mode==='default') return arr.sort(original);
      if(mode==='stock') return arr.sort((a,b)=>(Number(!isInStock(a))-Number(!isInStock(b)))||original(a,b));
      if(mode==='new') return arr.sort((a,b)=>(Number(!isNew(a))-Number(!isNew(b)))||(new Date(b.created_at||0)-new Date(a.created_at||0))||original(a,b));
      if(mode==='price-asc') return arr.sort((a,b)=>{
        const ap=Number(a.price_amount)||Number.POSITIVE_INFINITY,bp=Number(b.price_amount)||Number.POSITIVE_INFINITY;
        return (ap-bp)||original(a,b);
      });
      if(mode==='price-desc') return arr.sort((a,b)=>{
        const ap=Number(a.price_amount)||-1,bp=Number(b.price_amount)||-1;
        return (bp-ap)||original(a,b);
      });
      if(mode==='name') return arr.sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'ru',{sensitivity:'base'})||original(a,b));
      return arr.sort(original);
    }
    function apply(){
      const groups=selectedOptionsByGroup();
      const min=Number(digits(minInput?.value))||null;
      const max=Number(digits(maxInput?.value))||null;
      const query=normalizeSearch(searchInput?.value);
      let filtered=products.filter(p=>{
        if(query && !(searchCache.get(Number(p.id))||'').includes(query)) return false;
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
      filtered=sortProducts(filtered);
      if(filtered.length){
        grid.innerHTML=filtered.map((p,i)=>card(p,i,category)).join('');
      }else{
        grid.innerHTML=`<div class="catalog-empty" role="status"><div class="catalog-empty-icon" aria-hidden="true">⌕</div><h3>Ничего не нашли</h3><p>Попробуйте изменить поиск, цену или параметры фильтра.</p><button class="btn btn-ghost" type="button" data-empty-reset>Сбросить всё</button></div>`;
      }
      bindProductGalleries(grid);
      setResultCount(filtered.length);
      const activeFilters=optionChecks.some(c=>c.checked)||!!digits(minInput?.value)||!!digits(maxInput?.value)||!!query;
      shell.classList.toggle('has-active-filters',activeFilters);
      if(searchClear)searchClear.hidden=!query;
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
    searchInput?.addEventListener('input',apply);
    searchInput?.addEventListener('search',apply);
    searchClear?.addEventListener('click',()=>{searchInput.value='';searchInput.focus();apply()});
    sortSelect?.addEventListener('change',apply);
    shell.querySelector('[data-filter-reset]')?.addEventListener('click',resetAll);
    grid.addEventListener('click',e=>{if(e.target.closest('[data-empty-reset]'))resetAll()});
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
      }else grid.innerHTML=`<div class="catalog-empty" role="status"><div class="catalog-empty-icon" aria-hidden="true">🚪</div><h3>Каталог пока пуст</h3><p>Скоро здесь появятся новые модели. Пока оставьте заявку — подскажем актуальные варианты.</p><a class="btn btn-primary" href="#form">Оставить заявку</a></div>`;
    } catch (e) {
      grid.innerHTML = `<div class="catalog-empty" role="alert"><div class="catalog-empty-icon" aria-hidden="true">↻</div><h3>Каталог не загрузился</h3><p>Проверьте соединение или попробуйте ещё раз.</p><button class="btn btn-ghost" type="button" data-catalog-retry>Повторить</button></div>`;
      grid.querySelector('[data-catalog-retry]')?.addEventListener('click',()=>{grid.innerHTML='<div class="catalog-loading">Загружаем каталог…</div>';loadGrid(grid)});
    }
  }
  document.addEventListener('DOMContentLoaded', () => document.querySelectorAll('[data-product-grid]').forEach(loadGrid));
})();
