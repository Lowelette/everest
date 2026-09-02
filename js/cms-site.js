(() => {
  const API_BASE = window.EVEREST_API_BASE || 'https://everest-api.lowelette.ru';
  const FALLBACK = {
    phone_primary: '+7 929 716-57-16',
    phone_secondary: '',
    whatsapp_number: '79297165716',
    max_url: '',
    address: 'ул. Революционная, 28',
    hours: 'Пн–Пт 10:00–19:00 · Сб–Вс 10:00–18:00',
    hours_short: 'Ежедневно с 10:00',
    promo_title: 'Скидка 5% на всю сумму договора',
    promo_text: 'Для работников ВАЗа, пенсионеров и участников СВО. Подробности уточняйте у менеджера.',
    footer_requisites: 'ИП [реквизиты уточнить]'
  };

  const digits = value => String(value || '').replace(/\D/g, '');
  const telHref = value => '+' + digits(value);
  const waHref = (number, text='') => {
    const n = digits(number);
    if (!n) return '#';
    return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
  };
  const boolSetting = (settings, key, fallback=false) => {
    const v = settings[key];
    if (v == null || v === '') return !!fallback;
    return ['1','true','yes','on'].includes(String(v).toLowerCase());
  };

  function apply(settings){
    const s = {...FALLBACK, ...settings};
    window.EverestSettings = s;
    document.querySelectorAll('[data-setting]').forEach(el => {
      const key = el.dataset.setting;
      if (s[key] != null && String(s[key]).trim() !== '') el.textContent = s[key];
    });
    document.querySelectorAll('[data-setting-phone="primary"]').forEach(el => {
      el.href = `tel:${telHref(s.phone_primary)}`;
      const small = el.querySelector('small');
      const nodes = [...el.childNodes].filter(n => n.nodeType === Node.TEXT_NODE);
      if (nodes[0]) nodes[0].nodeValue = s.phone_primary;
      else if (!small) el.textContent = s.phone_primary;
    });
    const secondary = String(s.phone_secondary || '').trim();
    const secondaryVisible = !!secondary && boolSetting(s, 'phone_secondary_enabled', !!secondary);
    document.querySelectorAll('[data-setting-phone="secondary"]').forEach(el => {
      if (secondaryVisible){
        el.hidden = false; el.removeAttribute('hidden');
        el.href = `tel:${telHref(secondary)}`; el.textContent = secondary;
      } else { el.hidden = true; }
    });
    document.querySelectorAll('[data-secondary-contact]').forEach(el => { el.hidden = !secondaryVisible; });

    const waNumber = String(s.whatsapp_number || '').trim();
    const waVisible = !!digits(waNumber) && boolSetting(s, 'whatsapp_enabled', !!digits(waNumber));
    document.querySelectorAll('[data-wa-link]').forEach(el => {
      el.hidden = !waVisible;
      if (waVisible) el.href = waHref(waNumber, el.dataset.waText || '');
    });
    document.querySelectorAll('[data-wa-block]').forEach(el => { el.hidden = !waVisible; });

    const maxUrl = String(s.max_url || '').trim();
    const maxVisible = !!maxUrl && boolSetting(s, 'max_enabled', !!maxUrl);
    document.querySelectorAll('[data-max-link]').forEach(el => { el.hidden = !maxVisible; });
    document.querySelectorAll('[data-max-block]').forEach(el => { el.hidden = !maxVisible; });
    document.querySelectorAll('[data-max-anchor]').forEach(el => { if (maxVisible) el.href = maxUrl; });

    const promoVisible = boolSetting(s, 'promo_enabled', true);
    document.querySelectorAll('[data-promo-block]').forEach(el => { el.hidden = !promoVisible; });

    const footerReq = String(s.footer_requisites || '').trim();
    document.querySelectorAll('[data-footer-requisites]').forEach(el => { el.hidden = !footerReq; });
  }

  window.EverestCms = {applySettings: apply};
  apply(FALLBACK);
  fetch(`${API_BASE}/api/settings`, {headers:{'Accept':'application/json'}})
    .then(r => r.ok ? r.json() : Promise.reject(new Error('settings unavailable')))
    .then(data => apply(data.settings || data))
    .catch(() => {});
})();
