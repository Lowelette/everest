/* ============ ЗАЯВКИ: Everest CMS ============ */
const WA_FALLBACK_NUMBER = '79297165716';
const EVEREST_API_BASE = window.EVEREST_API_BASE || 'https://everest-api.lowelette.ru';

async function sendLead(payload){
  const normalized = {
    source: payload['Источник'] || 'Сайт',
    name: payload['Имя'] || 'Не указано',
    phone: payload['Телефон'] || '',
    details: Object.fromEntries(Object.entries(payload).filter(([k]) => !['Источник','Имя','Телефон'].includes(k)))
  };

  const response = await fetch(`${EVEREST_API_BASE}/api/leads`, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(normalized)
  });

  if (!response.ok) throw new Error('Не удалось отправить заявку');
  return response.json().catch(() => ({ok:true}));
}

function setInlineError(container, message=''){
  if (!container) return;
  let error = container.querySelector('[data-form-error]');
  if (!error){
    error = document.createElement('p');
    error.className = 'form-error';
    error.dataset.formError = '';
    error.setAttribute('role','alert');
    const button = container.querySelector('button[type="submit"], .btn');
    if (button) button.insertAdjacentElement('afterend', error);
    else container.appendChild(error);
  }
  error.textContent = message;
  error.hidden = !message;
}

function leadSuccessText(data){
  const id = Number(data?.id || data?.lead_number || 0);
  return id ? `Заявка №${id} принята` : 'Заявка принята';
}

/* ---------- шапка + дверь ---------- */
const header = document.getElementById('header');
const door = document.getElementById('door');

function updateScrollState(){
  const y = window.scrollY;
  if (header && !header.classList.contains('header-catalog')) header.classList.toggle('scrolled', y > 30);
  if (door) door.classList.toggle('opening', y > 150);
}

if (header || door){
  window.addEventListener('scroll', updateScrollState, {passive: true});
  updateScrollState();
}

/* ---------- появление секций ---------- */
const revealItems = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window){
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting){
        entry.target.classList.add('in');
        observer.unobserve(entry.target);
      }
    });
  }, {threshold: .12});
  revealItems.forEach(element => observer.observe(element));
} else revealItems.forEach(element => element.classList.add('in'));

/* ---------- КВИЗ ---------- */
const qBody = document.getElementById('q-body');
const qFill = document.getElementById('q-fill');
const qBack = document.getElementById('q-back');
const qNext = document.getElementById('q-next');

if (qBody && qFill && qBack && qNext){
  const qSteps = [
    {q: 'Какие двери нужны?', a: ['Входные', 'Межкомнатные', 'Несколько разных']},
    {q: 'Что важнее всего?', a: ['Цена', 'Внешний вид', 'Тишина и тепло', 'Надёжность']},
    {q: 'Когда планируете установку?', a: ['Как можно скорее', 'В течение месяца', 'Пока присматриваюсь']}
  ];

  let qIdx = 0;
  let qSubmitting = false;
  const qAnswers = Array(qSteps.length).fill(null);

  function renderQ(){
    qBack.style.visibility = qIdx === 0 ? 'hidden' : 'visible';
    const pos = Math.min(qIdx, qSteps.length);
    qFill.style.width = `${((pos + 1) / (qSteps.length + 1)) * 100}%`;

    if (qIdx < qSteps.length){
      const step = qSteps[qIdx];
      qBody.innerHTML = `
        <div class="q-count">Вопрос ${qIdx + 1} из ${qSteps.length}</div>
        <div class="q-title">${step.q}</div>
        <div class="q-opts">
          ${step.a.map(answer => `
            <button type="button" class="q-opt ${qAnswers[qIdx] === answer ? 'sel' : ''}" data-v="${answer}">
              <span class="dot"></span>${answer}
            </button>
          `).join('')}
        </div>`;

      qBody.querySelectorAll('.q-opt').forEach(button => {
        button.addEventListener('click', () => { qAnswers[qIdx] = button.dataset.v; renderQ(); });
      });

      qNext.disabled = !qAnswers[qIdx];
      qNext.textContent = qIdx === qSteps.length - 1 ? 'Почти готово →' : 'Далее →';
      return;
    }

    qBody.innerHTML = `
      <div class="q-count">Последний шаг</div>
      <div class="q-title">Как с вами связаться?</div>
      <div class="field"><input type="text" id="q-name" autocomplete="name" placeholder="Как вас зовут?"></div>
      <div class="field"><input type="tel" id="q-phone" autocomplete="tel" placeholder="Телефон"></div>
      <p class="q-gift">Скидка 5% действует для работников ВАЗа, пенсионеров и участников СВО.</p>
      <p class="form-error" data-form-error role="alert" hidden></p>`;
    qNext.disabled = false;
    qNext.textContent = 'Получить варианты →';
  }

  qBack.addEventListener('click', () => {
    if (!qSubmitting && qIdx > 0){ qIdx -= 1; renderQ(); }
  });

  qNext.addEventListener('click', async () => {
    if (qSubmitting) return;
    if (qIdx < qSteps.length){
      if (!qAnswers[qIdx]) return;
      qIdx += 1; renderQ(); return;
    }

    const phoneInput = document.getElementById('q-phone');
    const nameInput = document.getElementById('q-name');
    const phone = phoneInput?.value.trim() || '';
    if (phone.length < 6){ phoneInput?.focus(); setInlineError(qBody,'Укажите телефон, чтобы мы могли связаться.'); return; }

    qSubmitting = true;
    qNext.disabled = true;
    const previousText = qNext.textContent;
    qNext.textContent = 'Отправляем…';
    setInlineError(qBody,'');
    try {
      const data = await sendLead({
        'Источник': 'Подбор двери на сайте',
        'Имя': nameInput?.value.trim() || 'Не указано',
        'Телефон': phone,
        ...Object.fromEntries(qSteps.map((step, index) => [step.q.replace('?', ''), qAnswers[index]]))
      });

      qFill.style.width = '100%';
      const quizNav = document.querySelector('.quiz-nav');
      if (quizNav) quizNav.style.display = 'none';
      qBody.innerHTML = `
        <div class="q-done">
          <div class="q-ico"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M20 6L9 17l-5-5"/></svg></div>
          <h3>${leadSuccessText(data)}</h3>
          <p>Спасибо! Менеджер свяжется с вами в рабочее время.<br>Ваши ответы:</p>
          ${qAnswers.map(answer => `<span class="q-chip">${answer}</span>`).join('')}
        </div>`;
    } catch (error) {
      setInlineError(qBody,'Не получилось отправить заявку. Проверьте интернет и попробуйте ещё раз.');
      qNext.disabled = false;
      qNext.textContent = previousText;
      qSubmitting = false;
    }
  });

  renderQ();
}

/* ---------- формы замера ---------- */
document.querySelectorAll('[data-lead-form]').forEach(form => {
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (form.dataset.submitting === '1') return;

    const phoneInput = form.querySelector('[name="phone"], #f-phone');
    const nameInput = form.querySelector('[name="name"], #f-name');
    const phone = phoneInput ? phoneInput.value.trim() : '';
    const body = form.querySelector('[data-form-body], #form-body');
    const thanks = form.querySelector('[data-form-thanks], #form-thanks');
    const submit = form.querySelector('button[type="submit"]');

    if (!phoneInput || phone.length < 6){
      phoneInput?.focus();
      setInlineError(body || form,'Укажите телефон, чтобы мы могли связаться.');
      return;
    }

    form.dataset.submitting = '1';
    form.setAttribute('aria-busy','true');
    setInlineError(body || form,'');
    const previousText = submit?.textContent || '';
    if (submit){ submit.disabled = true; submit.textContent = 'Отправляем…'; }

    try {
      const data = await sendLead({
        'Источник': form.dataset.source || 'Форма на сайте',
        'Имя': nameInput && nameInput.value.trim() ? nameInput.value.trim() : 'Не указано',
        'Телефон': phone
      });
      if (body) body.style.display = 'none';
      if (thanks){
        const title = thanks.querySelector('h3');
        if (title) title.textContent = `${leadSuccessText(data)} ✓`;
        thanks.style.display = 'block';
        thanks.setAttribute('tabindex','-1');
        thanks.focus({preventScroll:true});
      }
    } catch (error) {
      setInlineError(body || form,'Не получилось отправить заявку. Проверьте интернет и попробуйте ещё раз.');
      if (submit){ submit.disabled = false; submit.textContent = previousText; }
      delete form.dataset.submitting;
    } finally {
      form.removeAttribute('aria-busy');
    }
  });
});

/* ---------- год ---------- */
document.querySelectorAll('.js-year, #year').forEach(element => { element.textContent = new Date().getFullYear(); });
