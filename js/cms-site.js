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
    promo_text: 'Для работников ВАЗа, пенсионеров и участников СВО. Подробности уточняйте у менеджера.'
  };

  const digits = value => String(value || '').replace(/\D/g, '');
  const telHref = value => '+' + digits(value);
  const waHref = (number, text='') => {
    const n = digits(number);
    if (!n) return '#';
    return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
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
    document.querySelectorAll('[data-setting-phone="secondary"]').forEach(el => {
      if (secondary){
        el.hidden = false; el.removeAttribute('hidden');
        el.href = `tel:${telHref(secondary)}`; el.textContent = secondary;
      } else { el.hidden = true; }
    });
    document.querySelectorAll('[data-secondary-contact]').forEach(el => { el.hidden = !secondary; });
    document.querySelectorAll('[data-wa-link]').forEach(el => {
      el.href = waHref(s.whatsapp_number, el.dataset.waText || '');
    });
    const maxUrl = String(s.max_url || '').trim();
    document.querySelectorAll('[data-max-link]').forEach(el => { el.hidden = !maxUrl; });
    document.querySelectorAll('[data-max-anchor]').forEach(el => { if (maxUrl) el.href = maxUrl; });
  }

  window.EverestCms = {applySettings: apply};
  apply(FALLBACK);
  fetch(`${API_BASE}/api/settings`, {headers:{'Accept':'application/json'}})
    .then(r => r.ok ? r.json() : Promise.reject(new Error('settings unavailable')))
    .then(data => apply(data.settings || data))
    .catch(() => {});
})();
