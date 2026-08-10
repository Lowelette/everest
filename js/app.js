/* ============ НАСТРОЙКИ ЗАЯВОК ============ */
const TG_TOKEN = '';          // токен Telegram-бота (когда будет)
const TG_CHAT  = '';          // id чата/канала
const WA_NUMBER = '79297165716';

function sendLead(payload){
  const lines = Object.entries(payload).map(([key, value]) => `${key}: ${value}`).join('\n');

  if (TG_TOKEN && TG_CHAT){
    fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        chat_id: TG_CHAT,
        text: '🚪 Новая заявка «Эверест»:\n\n' + lines
      })
    }).catch(error => console.warn('TG error:', error));
    return;
  }

  const message = encodeURIComponent('🚪 Заявка с сайта «Эверест»:\n' + lines);
  window.open(`https://wa.me/${WA_NUMBER}?text=${message}`, '_blank', 'noopener');
}

/* ---------- шапка + дверь ---------- */
const header = document.getElementById('header');
const door = document.getElementById('door');

function updateScrollState(){
  const y = window.scrollY;
  if (header && !header.classList.contains('header-catalog')) {
    header.classList.toggle('scrolled', y > 30);
  }
  if (door) {
    door.classList.toggle('opening', y > 150);
  }
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
} else {
  revealItems.forEach(element => element.classList.add('in'));
}

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
        button.addEventListener('click', () => {
          qAnswers[qIdx] = button.dataset.v;
          renderQ();
        });
      });

      qNext.disabled = !qAnswers[qIdx];
      qNext.textContent = qIdx === qSteps.length - 1 ? 'Почти готово →' : 'Далее →';
      return;
    }

    qBody.innerHTML = `
      <div class="q-count">Последний шаг</div>
      <div class="q-title">Куда прислать подходящие варианты?</div>
      <div class="field"><input type="text" id="q-name" placeholder="Как вас зовут?"></div>
      <div class="field"><input type="tel" id="q-phone" placeholder="Телефон или WhatsApp"></div>
      <p class="q-gift">🎁 Заодно закрепим за вами подарок: фурнитуру при заказе установки.</p>`;
    qNext.disabled = false;
    qNext.textContent = 'Получить варианты →';
  }

  qBack.addEventListener('click', () => {
    if (qIdx > 0){
      qIdx -= 1;
      renderQ();
    }
  });

  qNext.addEventListener('click', () => {
    if (qIdx < qSteps.length){
      if (!qAnswers[qIdx]) return;
      qIdx += 1;
      renderQ();
      return;
    }

    const phoneInput = document.getElementById('q-phone');
    const nameInput = document.getElementById('q-name');
    const phone = phoneInput.value.trim();

    if (phone.length < 6){
      phoneInput.focus();
      return;
    }

    sendLead({
      'Источник': 'Подбор двери на сайте',
      'Имя': nameInput.value.trim() || 'Не указано',
      'Телефон': phone,
      ...Object.fromEntries(qSteps.map((step, index) => [step.q.replace('?', ''), qAnswers[index]]))
    });

    qFill.style.width = '100%';
    const quizNav = document.querySelector('.quiz-nav');
    if (quizNav) quizNav.style.display = 'none';
    qBody.innerHTML = `
      <div class="q-done">
        <div class="q-ico"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M20 6L9 17l-5-5"/></svg></div>
        <h3>Готово! Уже подбираем варианты</h3>
        <p>Откроется WhatsApp с готовой заявкой.<br>Ваши ответы:</p>
        ${qAnswers.map(answer => `<span class="q-chip">${answer}</span>`).join('')}
      </div>`;
  });

  renderQ();
}

/* ---------- формы замера ---------- */
document.querySelectorAll('[data-lead-form]').forEach(form => {
  form.addEventListener('submit', event => {
    event.preventDefault();

    const phoneInput = form.querySelector('[name="phone"], #f-phone');
    const nameInput = form.querySelector('[name="name"], #f-name');
    const phone = phoneInput ? phoneInput.value.trim() : '';

    if (!phoneInput || phone.length < 6){
      if (phoneInput) phoneInput.focus();
      return;
    }

    sendLead({
      'Источник': form.dataset.source || 'Форма на сайте',
      'Имя': nameInput && nameInput.value.trim() ? nameInput.value.trim() : 'Не указано',
      'Телефон': phone
    });

    const body = form.querySelector('[data-form-body], #form-body');
    const thanks = form.querySelector('[data-form-thanks], #form-thanks');
    if (body) body.style.display = 'none';
    if (thanks) thanks.style.display = 'block';
  });
});

/* ---------- год ---------- */
document.querySelectorAll('.js-year, #year').forEach(element => {
  element.textContent = new Date().getFullYear();
});
