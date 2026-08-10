(() => {
  'use strict';

  const STORAGE_KEY = 'everest-client-theme';
  const THEMES = [
    {id:'original',number:'00',name:'Original',note:'Исходный кремовый, тёплый графит и медный акцент',scheme:'light',colors:["#EDE4D0", "#35302A", "#C77B2E"]},
    {id:'corrupted-monk',number:'01',name:'Corrupted Monk',note:'Белый, уверенный красный и графит',scheme:'light',colors:["#FFFFFF", "#E54B4B", "#202124"]},
    {id:'riviera',number:'02',name:'Riviera',note:'Винный, коралловый и слоновая кость',scheme:'light',colors:["#F9F8E6", "#9C2525", "#FF8B8B"]},
    {id:'brave-stranger',number:'03',name:'Brave Stranger',note:'Ледяной голубой и алый',scheme:'light',colors:["#B7E3E4", "#F03F35", "#FFFFFF"]},
    {id:'mr-business',number:'04',name:'Mr. Business',note:'Глубокая бирюза и белый',scheme:'light',colors:["#167C80", "#FFFFFF", "#153A3C"]},
    {id:'earnest-proposal',number:'05',name:'Earnest Proposal',note:'Индиго и морская волна',scheme:'light',colors:["#283470", "#15A29C", "#F5F7FC"]},
    {id:'le-carnaval',number:'06',name:'Le Carnaval',note:'Кобальт и пыльный коралл',scheme:'light',colors:["#005397", "#FF8788", "#FFF7F7"]},
    {id:'sanctuary',number:'07',name:'The Sanctuary',note:'Тёмное вино, фарфор и тауп',scheme:'light',colors:["#371722", "#FFFFFF", "#BBAB9B"]},
    {id:'melted-shake',number:'08',name:'Melted Shake',note:'Пыльная роза, чёрный и маджента',scheme:'light',colors:["#DABAAF", "#0B0C11", "#CF2F89"]},
    {id:'favorite-bodega',number:'09',name:'Favorite Bodega',note:'Циан и приглушённый коралл',scheme:'light',colors:["#0BBCD6", "#E6625E", "#F4FBFC"]},
    {id:'nightingale',number:'10',name:'Nightingale',note:'Пыльный mauve, ультрамарин и чёрный',scheme:'light',colors:["#BEA1A5", "#2D1FE8", "#000000"]},
  ];
  const LEGACY_THEME_MAP = {
    'alpine-forest':'corrupted-monk','aubergine-pearl':'riviera','mediterranean-clay':'riviera',
    'cobalt-architecture':'earnest-proposal','saffron-ink':'sanctuary','emerald-deco':'mr-business',
    'japanese-indigo':'earnest-proposal','copper-smoke':'melted-shake','citron-modern':'favorite-bodega',
    'midnight-violet':'nightingale','light-oak':'riviera','white-showroom':'corrupted-monk'
  };

  const themeMap = new Map(THEMES.map(theme => [theme.id, theme]));

  const safeReadStorage = () => {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (_) {
      return null;
    }
  };

  const safeWriteStorage = value => {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch (_) {
      // Страница продолжит работать даже при заблокированном localStorage.
    }
  };

  const queryTheme = new URLSearchParams(location.search).get('theme');
  const storedRawTheme = safeReadStorage();
  const storedTheme = LEGACY_THEME_MAP[storedRawTheme] || storedRawTheme;
  const initialTheme = themeMap.has(queryTheme)
    ? queryTheme
    : themeMap.has(storedTheme)
      ? storedTheme
      : 'original';

  const applyThemeToRoot = themeId => {
    const theme = themeMap.get(themeId) || themeMap.get('original');
    document.documentElement.dataset.theme = theme.id;
    document.documentElement.style.colorScheme = theme.scheme;
    return theme;
  };

  applyThemeToRoot(initialTheme);
  if (themeMap.has(queryTheme)) safeWriteStorage(queryTheme);

  const buildThemeUrl = themeId => {
    const url = new URL(location.href);
    url.searchParams.set('theme', themeId);
    return url;
  };

  const syncInternalLinks = themeId => {
    document.querySelectorAll('a[href]').forEach(link => {
      const rawHref = link.getAttribute('href');
      if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('tel:') || rawHref.startsWith('mailto:') || rawHref.startsWith('javascript:')) return;

      let url;
      try {
        url = new URL(rawHref, location.href);
      } catch (_) {
        return;
      }

      if (url.origin !== location.origin) return;
      if (!/\.html$/i.test(url.pathname) && !url.pathname.endsWith('/')) return;

      url.searchParams.set('theme', themeId);
      link.href = `${url.pathname.split('/').pop() || 'index.html'}${url.search}${url.hash}`;
    });
  };

  const createThemeUI = () => {
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'theme-trigger';
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.innerHTML = `
      <svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9">
        <path d="M12 3a9 9 0 1 0 0 18h1.3a1.7 1.7 0 0 0 0-3.4H12a1.8 1.8 0 0 1 0-3.6h2.7A6.3 6.3 0 0 0 21 7.7C21 5.1 17 3 12 3Z"/>
        <circle cx="7.5" cy="9" r="1" fill="currentColor" stroke="none"/>
        <circle cx="11" cy="6.8" r="1" fill="currentColor" stroke="none"/>
        <circle cx="15" cy="7.4" r="1" fill="currentColor" stroke="none"/>
      </svg>
      <span class="theme-trigger-label">Цвета</span>
      <span class="theme-trigger-number" data-theme-trigger-number></span>
    `;

    const overlay = document.createElement('div');
    overlay.className = 'theme-overlay';
    overlay.hidden = true;
    overlay.innerHTML = `
      <section class="theme-panel" role="dialog" aria-modal="true" aria-labelledby="theme-panel-title" tabindex="-1">
        <header class="theme-panel-header">
          <div>
            <span class="theme-panel-kicker">Original + 10 палитр MyMind</span>
            <h2 id="theme-panel-title">Посмотрите палитру на всём сайте</h2>
            <p>Нажмите на вариант — главная и оба каталога изменятся целиком.</p>
          </div>
          <button class="theme-close" type="button" aria-label="Закрыть выбор палитры">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6 6 18"/></svg>
          </button>
        </header>
        <div class="theme-grid" data-theme-grid></div>
        <footer class="theme-panel-footer">
          <button type="button" class="theme-copy" data-theme-copy>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></svg>
            <span>Скопировать ссылку на вариант</span>
          </button>
          <span class="theme-save-note">Выбор сохранится при переходе между страницами</span>
        </footer>
      </section>
    `;

    const grid = overlay.querySelector('[data-theme-grid]');
    const closeButton = overlay.querySelector('.theme-close');
    const panel = overlay.querySelector('.theme-panel');
    const copyButton = overlay.querySelector('[data-theme-copy]');
    let lastFocused = null;

    THEMES.forEach(theme => {
      const option = document.createElement('button');
      option.type = 'button';
      option.className = 'theme-option';
      option.dataset.themeChoice = theme.id;
      option.setAttribute('aria-pressed', 'false');
      option.innerHTML = `
        <span class="theme-option-number">${theme.number}</span>
        <span class="theme-option-copy">
          <strong>${theme.name}</strong>
          <small>${theme.note}</small>
        </span>
        <span class="theme-swatches" aria-hidden="true">
          ${theme.colors.map(color => `<i style="--swatch:${color}"></i>`).join('')}
        </span>
        <span class="theme-option-check" aria-hidden="true">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3"><path d="M20 6 9 17l-5-5"/></svg>
        </span>
      `;
      grid.appendChild(option);
    });

    const updateUI = themeId => {
      const theme = themeMap.get(themeId) || themeMap.get('original');
      trigger.querySelector('[data-theme-trigger-number]').textContent = theme.number;
      trigger.title = `Текущая палитра: ${theme.name}`;
      overlay.querySelectorAll('[data-theme-choice]').forEach(option => {
        const active = option.dataset.themeChoice === theme.id;
        option.classList.toggle('is-active', active);
        option.setAttribute('aria-pressed', String(active));
      });
    };

    const setTheme = (themeId, options = {}) => {
      if (!themeMap.has(themeId)) return;
      const theme = applyThemeToRoot(themeId);
      safeWriteStorage(theme.id);
      syncInternalLinks(theme.id);
      updateUI(theme.id);

      if (options.updateUrl !== false) {
        const url = buildThemeUrl(theme.id);
        history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
      }

      document.dispatchEvent(new CustomEvent('everest:themechange', { detail: theme }));
    };

    const openPanel = () => {
      lastFocused = document.activeElement;
      overlay.hidden = false;
      document.body.classList.add('theme-panel-open');
      trigger.setAttribute('aria-expanded', 'true');
      requestAnimationFrame(() => {
        overlay.classList.add('is-open');
        panel.focus();
      });
    };

    const closePanel = () => {
      overlay.classList.remove('is-open');
      document.body.classList.remove('theme-panel-open');
      trigger.setAttribute('aria-expanded', 'false');
      window.setTimeout(() => {
        overlay.hidden = true;
        if (lastFocused instanceof HTMLElement) lastFocused.focus();
      }, 220);
    };

    trigger.addEventListener('click', openPanel);
    closeButton.addEventListener('click', closePanel);
    overlay.addEventListener('click', event => {
      if (event.target === overlay) closePanel();
    });

    grid.addEventListener('click', event => {
      const option = event.target.closest('[data-theme-choice]');
      if (!option) return;
      setTheme(option.dataset.themeChoice);
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !overlay.hidden) closePanel();
    });

    copyButton.addEventListener('click', async () => {
      const themeId = document.documentElement.dataset.theme || 'original';
      const url = buildThemeUrl(themeId).toString();
      const label = copyButton.querySelector('span');
      const originalLabel = 'Скопировать ссылку на вариант';

      try {
        await navigator.clipboard.writeText(url);
        label.textContent = 'Ссылка скопирована';
      } catch (_) {
        const helper = document.createElement('textarea');
        helper.value = url;
        helper.setAttribute('readonly', '');
        helper.style.position = 'fixed';
        helper.style.opacity = '0';
        document.body.appendChild(helper);
        helper.select();
        document.execCommand('copy');
        helper.remove();
        label.textContent = 'Ссылка скопирована';
      }

      window.setTimeout(() => {
        label.textContent = originalLabel;
      }, 1800);
    });

    document.body.append(trigger, overlay);
    updateUI(initialTheme);
    syncInternalLinks(initialTheme);

    window.EverestThemeSwitcher = {
      themes: THEMES.map(theme => ({ ...theme })),
      setTheme,
      open: openPanel,
      close: closePanel,
      getCurrent: () => document.documentElement.dataset.theme || 'original'
    };
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createThemeUI, { once: true });
  } else {
    createThemeUI();
  }
})();
