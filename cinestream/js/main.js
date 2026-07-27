// CineStream — main.js v4 (bulletproof hero + working filters)
(function() {
  'use strict';

  const $ = id => document.getElementById(id);
  const $$ = sel => document.querySelectorAll(sel);

  // Safe global accessors — works even if data.js hasn't run yet
  function movies()  { return window.MOVIES      || []; }
  function series()  { return window.SERIES      || []; }
  function content() { return window.ALL_CONTENT || []; }
  function hero()    { return window.HERO_ITEMS  || []; }

  /* ====================================================
     HERO SLIDER
  ==================================================== */
  let heroIdx = 0, heroTimer = null;

  function updateHero(idx) {
    const items = hero();
    if (!items.length) { console.warn('updateHero: HERO_ITEMS empty'); return; }

    const item = items[idx % items.length];
    if (!item) return;

    console.log(`🎬 Hero[${idx}]: ${item.title}`);

    const bg = $('heroBg');
    if (bg) {
      bg.style.backgroundImage = `url('${item.backdrop || item.poster}')`;
    }

    const setText = (id, val) => {
      const el = $(id);
      if (el) el.textContent = String(val);
    };

    setText('heroTitle',    item.title);
    setText('heroDesc',     item.desc  || '');
    setText('heroRating',   '⭐ ' + item.rating);
    setText('heroYear',     item.year  || '');
    setText('heroDuration', item.duration || '—');
    setText('heroGenre',    item.genre
      ? item.genre.charAt(0).toUpperCase() + item.genre.slice(1) : '');

    $$('.hero-dot').forEach((d, i) => d.classList.toggle('active', i === idx));

    const wb = $('heroWatchBtn');
    if (wb) wb.onclick = () => openPlayer(item);
    const ib = $('heroInfoBtn');
    if (ib) ib.onclick = () => openModal(item);
  }

  function startHeroTimer() {
    clearInterval(heroTimer);
    heroTimer = setInterval(() => {
      const items = hero();
      if (!items.length) return;
      heroIdx = (heroIdx + 1) % items.length;
      updateHero(heroIdx);
    }, 6000);
  }

  $$('.hero-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      heroIdx = parseInt(dot.dataset.idx || 0);
      updateHero(heroIdx);
      startHeroTimer();
    });
  });

  /* ====================================================
     NAVBAR
  ==================================================== */
  window.addEventListener('scroll', () => {
    const n = $('navbar');
    if (n) n.classList.toggle('scrolled', window.scrollY > 60);
  }, { passive: true });

  const menuBtn = $('menuBtn');
  const mobileMenu = $('mobileMenu');
  if (menuBtn && mobileMenu) {
    menuBtn.addEventListener('click', () => mobileMenu.classList.toggle('open'));
    document.addEventListener('click', e => {
      if (!e.target.closest('#menuBtn') && !e.target.closest('#mobileMenu'))
        mobileMenu.classList.remove('open');
    });
  }

  /* ====================================================
     CARD BUILDER
  ==================================================== */
  function buildCard(item) {
    const card = document.createElement('div');
    card.className = 'movie-card';
    const isNew  = item.tags?.includes('New');
    const isHot  = item.tags?.includes('Trending');
    const badge  = isNew ? 'NEW' : isHot ? 'HOT' : 'HD';
    const bClass = isNew ? 'new-badge' : '';

    card.innerHTML = `
      <img class="card-poster" src="${item.poster}" alt="${item.title}"
           loading="lazy" onerror="this.style.display='none'">
      <div class="card-overlay"></div>
      <div class="card-info">
        <div class="card-title">${item.title}</div>
        <div class="card-meta">
          <span class="card-rating">⭐ ${item.rating}</span>
          <span>${item.year || ''}</span>
          ${item.type === 'series' ? '<span>📺</span>' : ''}
        </div>
      </div>
      <div class="card-play">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
          <path d="M8 5v14l11-7z"/>
        </svg>
      </div>
      <div class="card-badge hd ${bClass}">${badge}</div>`;

    card.addEventListener('click', () => openModal(item));
    return card;
  }
  window.buildCard = buildCard;

  /* ====================================================
     RENDER GRIDS
  ==================================================== */
  function renderGrid(gridId, items, limit) {
    const grid = $(gridId);
    if (!grid) return;
    grid.innerHTML = '';
    const slice = limit ? items.slice(0, limit) : items;
    slice.forEach(item => grid.appendChild(buildCard(item)));
  }
  window.renderGrid = renderGrid;

  function renderAll() {
    const mv = movies(), sv = series(), ac = content();
    if (!ac.length) return;

    const trending = ac.filter(m => m.tags?.includes('Trending')).slice(0, 8);
    const latest   = mv.filter(m => m.year >= 2024).slice(0, 10);
    const topRated = [...ac].sort((a, b) => b.rating - a.rating).slice(0, 10);

    renderGrid('trendingGrid', trending.length ? trending : mv.slice(0, 8), 8);
    renderGrid('latestGrid',   latest.length   ? latest   : mv.slice(0, 10), 10);
    renderGrid('topRatedGrid', topRated, 10);
    renderGrid('seriesGrid',   sv.slice(0, 8), 8);
  }

  /* ====================================================
     FILTER TABS (event delegation — works on any page)
  ==================================================== */
  function updateSectionTitle(t) {
    const el = document.querySelector('#latestSection .section-title');
    if (el) el.textContent = t;
  }
  function scrollToLatest() {
    const el = $('latestSection');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function hideAllPanels() {
    document.querySelectorAll('.sub-filter, .filter-panel').forEach(p => {
      p.classList.remove('visible');
      p.style.display = '';
    });
  }
  function showPanel(id) {
    const el = $(id);
    if (el) {
      el.classList.add('visible');
      el.style.display = 'flex';
    }
  }

  // Tab clicks
  document.addEventListener('click', e => {
    const tab = e.target.closest('[data-tab]');
    if (!tab) return;

    $$('[data-tab]').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    hideAllPanels();

    const ac = content();
    const name = tab.dataset.tab;

    if (name === 'popular') {
      const s = [...ac].sort((a, b) => b.popularity - a.popularity);
      renderGrid('latestGrid', s, 20);
      updateSectionTitle('🔥 Popular');
      scrollToLatest();
    } else if (name === 'recent') {
      const s = [...ac].sort((a, b) => b.year - a.year);
      renderGrid('latestGrid', s, 20);
      updateSectionTitle('🆕 Recent');
      scrollToLatest();
    } else if (name === 'genre') {
      showPanel('panel-genre');
      showPanel('sub-genre');
    } else if (name === 'year') {
      showPanel('panel-year');
      showPanel('sub-year');
    } else if (name === 'az') {
      showPanel('panel-az');
      showPanel('sub-az');
    }
  });

  // Genre buttons
  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-genre]');
    if (!btn) return;
    const panel = btn.closest('.sub-filter, .filter-panel');
    if (panel) panel.querySelectorAll('[data-genre]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const g = btn.dataset.genre;
    const ac = content();
    const f = g === 'all' ? ac : ac.filter(m => m.genre === g);
    renderGrid('latestGrid', f, 20);
    updateSectionTitle('🎬 ' + (g === 'all' ? 'All' : g.charAt(0).toUpperCase() + g.slice(1)));
    scrollToLatest();
  });

  // A-Z buttons
  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-letter]');
    if (!btn) return;
    const panel = btn.closest('.sub-filter, .filter-panel');
    if (panel) panel.querySelectorAll('[data-letter]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const l = btn.dataset.letter;
    const ac = content();
    const f = l === 'all' ? ac
      : l === '#' ? ac.filter(m => /^[0-9]/.test(m.title))
      : ac.filter(m => m.title?.toUpperCase().startsWith(l));
    renderGrid('latestGrid', f, 20);
    updateSectionTitle(l === 'all' ? '🔤 All' : `🔤 "${l}"`);
    scrollToLatest();
  });

  /* ====================================================
     YEAR BUTTONS
  ==================================================== */
  function buildYearButtons() {
    const panel = $('panel-year') || $('sub-year');
    if (!panel) return;

    const cur = new Date().getFullYear();
    let html  = '<button class="sfbtn active" data-year="all" style="flex-shrink:0">All</button>';
    for (let y = cur + 1; y >= 1970; y--) {
      html += `<button class="sfbtn" data-year="${y}" style="flex-shrink:0">${y}</button>`;
    }
    panel.innerHTML = html;

    panel.addEventListener('click', e => {
      const btn = e.target.closest('[data-year]');
      if (!btn) return;
      panel.querySelectorAll('[data-year]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const yr = btn.dataset.year;
      const ac = content();
      const f  = yr === 'all' ? ac : ac.filter(m => String(m.year) === yr);
      renderGrid('latestGrid', f, 20);
      updateSectionTitle('📅 ' + (yr === 'all' ? 'All Years' : yr));
      scrollToLatest();
    });
  }

  /* ====================================================
     LIVE SEARCH (TMDB)
  ==================================================== */
  const searchInput    = $('searchInput');
  const searchDropdown = $('searchDropdown');

  if (searchInput && searchDropdown) {
    let timer = null;

    async function doSearch(q) {
      const KEY  = window.CS_API_KEY;
      const BASE = window.CS_BASE_URL || 'https://api.themoviedb.org/3';
      const IMG  = window.CS_IMG_URL  || 'https://image.tmdb.org/t/p/w500';
      const BACK = window.CS_BACK_URL || 'https://image.tmdb.org/t/p/w1280';

      if (!KEY) {
        searchDropdown.innerHTML = '<div style="padding:14px;text-align:center;color:#7a7a90">API key missing in data.js</div>';
        searchDropdown.classList.add('open');
        return;
      }

      try {
        const [movRes, tvRes] = await Promise.all([
          fetch(`${BASE}/search/movie?api_key=${KEY}&query=${encodeURIComponent(q)}&page=1`)
            .then(r => r.json()).catch(() => ({ results: [] })),
          fetch(`${BASE}/search/tv?api_key=${KEY}&query=${encodeURIComponent(q)}&page=1`)
            .then(r => r.json()).catch(() => ({ results: [] })),
        ]);

        const toMovie = m => ({
          id: m.id, title: m.title, year: m.release_date?.slice(0, 4) || '—',
          rating: Math.round((m.vote_average || 0) * 10) / 10,
          type: 'movie', genre: getGenreName(m.genre_ids?.[0]),
          desc: m.overview || '',
          poster:   IMG  + m.poster_path,
          backdrop: m.backdrop_path ? BACK + m.backdrop_path : IMG + m.poster_path,
          tags: ['HD'], duration: '—', popularity: m.popularity || 0,
        });
        const toShow = s => ({
          id: s.id, title: s.name, year: s.first_air_date?.slice(0, 4) || '—',
          rating: Math.round((s.vote_average || 0) * 10) / 10,
          type: 'series', genre: getGenreName(s.genre_ids?.[0]),
          desc: s.overview || '',
          poster:   IMG  + s.poster_path,
          backdrop: s.backdrop_path ? BACK + s.backdrop_path : IMG + s.poster_path,
          tags: ['HD', 'Series'], duration: '—', popularity: s.popularity || 0,
        });

        const mv = (movRes.results || []).filter(m => m.poster_path).slice(0, 5).map(toMovie);
        const sh = (tvRes.results  || []).filter(s => s.poster_path).slice(0, 3).map(toShow);
        const results = [...mv, ...sh].slice(0, 8);

        // Add to local cache
        results.forEach(item => {
          if (!window.ALL_CONTENT) window.ALL_CONTENT = [];
          if (!ALL_CONTENT.find(x => x.id === item.id && x.type === item.type)) {
            ALL_CONTENT.push(item);
            if (item.type === 'movie') { if (!MOVIES) window.MOVIES=[]; MOVIES.push(item); }
            else { if (!SERIES) window.SERIES=[]; SERIES.push(item); }
          }
        });

        if (!results.length) {
          searchDropdown.innerHTML = `<div style="padding:14px;text-align:center;color:#7a7a90">No results for "${q}"</div>`;
          searchDropdown.classList.add('open');
          return;
        }

        searchDropdown.innerHTML = results.map(m => `
          <div class="search-result-item" data-sid="${m.id}" data-stype="${m.type}">
            <img src="${m.poster}" alt="${m.title}" onerror="this.style.display='none'">
            <div class="search-result-info">
              <strong>${m.title}</strong>
              <span>⭐${m.rating} · ${m.year}
                <span style="color:${m.type==='series'?'#00d4ff':'#e50914'};font-size:10px;font-weight:700;margin-left:4px">
                  ${m.type === 'series' ? '📺' : '🎬'}
                </span>
              </span>
            </div>
          </div>`).join('');
        searchDropdown.classList.add('open');

        searchDropdown.querySelectorAll('.search-result-item').forEach(el => {
          el.addEventListener('click', () => {
            const item = (window.ALL_CONTENT || []).find(m =>
              m.id === parseInt(el.dataset.sid) && m.type === el.dataset.stype);
            if (item) {
              openModal(item);
              searchDropdown.classList.remove('open');
              searchInput.value = '';
            }
          });
        });
      } catch(e) { console.error('Search:', e); }
    }

    searchInput.addEventListener('input', () => {
      clearTimeout(timer);
      const q = searchInput.value.trim();
      if (q.length < 2) { searchDropdown.classList.remove('open'); return; }
      timer = setTimeout(() => doSearch(q), 400);
    });

    document.addEventListener('click', e => {
      if (!e.target.closest('.search-wrap')) searchDropdown.classList.remove('open');
    });

    const sb = $('searchBtn');
    if (sb) sb.addEventListener('click', () => {
      if (searchInput.value.trim().length > 1) doSearch(searchInput.value.trim());
    });

    searchInput.addEventListener('keydown', e => {
      if (e.key === 'Enter' && searchInput.value.trim().length > 1)
        doSearch(searchInput.value.trim());
    });
  }

  /* ====================================================
     MODAL
  ==================================================== */
  function openModal(item) {
    const overlay = $('modalOverlay');
    if (!overlay) return;

    const setT = (id, val) => { const e=$(id); if(e) e.textContent = String(val); };
    const setH = (id, val) => { const e=$(id); if(e) e.innerHTML = val; };

    const bd = $('modalBackdrop');
    if (bd) bd.src = item.backdrop || item.poster || '';

    setT('modalTitle', item.title);
    setT('modalDesc',  item.desc || '');

    setH('modalBadges', `
      <span class="badge badge-hd">HD</span>
      <span class="badge badge-free">FREE</span>
      ${item.type === 'series' ? '<span class="badge" style="background:rgba(255,255,255,.15)">SERIES</span>' : ''}`);

    const wl   = JSON.parse(localStorage.getItem('cs_watchlist') || '[]');
    const inWl = wl.includes(item.id);
    const wBtn = $('modalWatchlistBtn');
    if (wBtn) {
      wBtn.textContent = inWl ? '✓ In Watchlist' : '+ Watchlist';
      wBtn.className   = 'btn-watchlist' + (inWl ? ' added' : '');
      wBtn.onclick     = () => toggleWatchlist(item.id, wBtn);
    }

    setH('modalMeta', `
      <span style="color:#f5c518;font-weight:600">⭐ ${item.rating}</span>
      <span>${item.year || '—'}</span>
      <span>${item.duration || '—'}</span>
      <span style="text-transform:capitalize">${item.genre || '—'}</span>
      ${item.seasons ? `<span>${item.seasons} Season${item.seasons > 1 ? 's' : ''}</span>` : ''}`);

    setH('modalDetails', `
      <div class="detail-row">
        <span class="detail-label">Genre</span>
        <span class="detail-val" style="text-transform:capitalize">${item.genre || '—'}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Year</span>
        <span class="detail-val">${item.year || '—'}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Rating</span>
        <span class="detail-val">⭐ ${item.rating}/10</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Quality</span>
        <span class="detail-val" style="color:var(--accent)">Auto HD</span>
      </div>`);

    const ac = content();
    const related = ac
      .filter(m => m.genre === item.genre && m.id !== item.id && m.poster)
      .sort(() => Math.random() - 0.5)
      .slice(0, 4);

    const rg = $('relatedGrid');
    if (rg) {
      rg.innerHTML = related.map(m => `
        <div class="related-card" data-rid="${m.id}" data-rtype="${m.type}">
          <img src="${m.poster}" alt="${m.title}" loading="lazy" onerror="this.style.opacity=0">
          <div class="related-card-title">${m.title}</div>
        </div>`).join('');
      rg.querySelectorAll('.related-card').forEach(el => {
        el.addEventListener('click', () => {
          const rel = ac.find(m => m.id === parseInt(el.dataset.rid) && m.type === el.dataset.rtype);
          if (rel) openModal(rel);
        });
      });
    }

    const mwb = $('modalWatchBtn');
    if (mwb) mwb.onclick = () => { closeModal(); openPlayer(item); };

    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    const o = $('modalOverlay');
    if (o) o.classList.remove('open');
    document.body.style.overflow = '';
  }

  const mc = $('modalClose');
  if (mc) mc.addEventListener('click', closeModal);
  const mo = $('modalOverlay');
  if (mo) mo.addEventListener('click', e => { if (e.target === mo) closeModal(); });

  /* ====================================================
     WATCHLIST
  ==================================================== */
  function toggleWatchlist(id, btn) {
    const wl  = JSON.parse(localStorage.getItem('cs_watchlist') || '[]');
    const idx = wl.indexOf(id);
    if (idx === -1) {
      wl.push(id);
      if (btn) { btn.textContent = '✓ In Watchlist'; btn.classList.add('added'); }
      showToast('✅ Added to Watchlist');
    } else {
      wl.splice(idx, 1);
      if (btn) { btn.textContent = '+ Watchlist'; btn.classList.remove('added'); }
      showToast('Removed from Watchlist');
    }
    localStorage.setItem('cs_watchlist', JSON.stringify(wl));
    updateWatchlistCount();
  }

  function updateWatchlistCount() {
    const wl = JSON.parse(localStorage.getItem('cs_watchlist') || '[]');
    const c  = $('wlCount');
    if (c) c.textContent = wl.length;
  }
  updateWatchlistCount();

  const navWl = $('navWatchlist');
  if (navWl) {
    navWl.addEventListener('click', () => {
      const wl    = JSON.parse(localStorage.getItem('cs_watchlist') || '[]');
      const items = content().filter(m => wl.includes(m.id));
      if (!items.length) { showToast('Your watchlist is empty'); return; }

      const div = document.createElement('div');
      div.id = 'wlOverlay';
      div.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:5000;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(6px)';
      div.innerHTML = `
        <div style="background:#16161f;border-radius:16px;max-width:700px;width:100%;max-height:80vh;overflow-y:auto;padding:24px;border:1px solid rgba(255,255,255,.08)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
            <h2 style="font-family:'Bebas Neue',sans-serif;font-size:24px;letter-spacing:1.5px;color:#fff">❤️ MY WATCHLIST</h2>
            <button onclick="document.getElementById('wlOverlay').remove()"
              style="width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.1);color:#fff;font-size:16px;border:none;cursor:pointer">✕</button>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:12px">
            ${items.map(m => `
              <div style="cursor:pointer;border-radius:8px;overflow:hidden;position:relative"
                data-wlid="${m.id}" data-wltype="${m.type}">
                <img src="${m.poster}" style="width:100%;aspect-ratio:2/3;object-fit:cover;display:block;background:#1a1a24">
                <div style="position:absolute;bottom:0;left:0;right:0;padding:6px;background:linear-gradient(transparent,rgba(0,0,0,.9));font-size:11px;font-weight:600;color:#fff">${m.title}</div>
              </div>`).join('')}
          </div>
        </div>`;
      document.body.appendChild(div);
      div.querySelectorAll('[data-wlid]').forEach(el => {
        el.addEventListener('click', () => {
          const item = content().find(m => m.id === parseInt(el.dataset.wlid) && m.type === el.dataset.wltype);
          if (item) { div.remove(); openModal(item); }
        });
      });
      div.addEventListener('click', e => { if (e.target === div) div.remove(); });
    });
  }

  /* ====================================================
     TOAST
  ==================================================== */
  let toastTimer;
  function showToast(msg) {
    const t = $('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
  }

  /* ====================================================
     KEYBOARD
  ==================================================== */
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeModal(); window.CSPlayer?.close(); }
    if (e.key === '/' && !e.target.matches('input,textarea')) {
      e.preventDefault(); searchInput?.focus();
    }
  });

  /* ====================================================
     NAV LINKS
  ==================================================== */
  document.addEventListener('click', e => {
    const link = e.target.closest('[data-page]');
    if (!link) return;
    e.preventDefault();
    const page = link.dataset.page;
    const ac   = content();
    const mv   = movies();
    const sv   = series();
    let items  = ac, title = '🎬 All';

    if (page === 'movies')   { items = mv;  title = '🎬 Movies'; }
    if (page === 'series')   { items = sv;  title = '📺 TV Series'; }
    if (page === 'trending') { items = ac.filter(m => m.tags?.includes('Trending')); title = '🔥 Trending'; }
    if (page === 'top250')   { items = [...ac].sort((a,b) => b.rating - a.rating); title = '⭐ Top Rated'; }

    renderGrid('latestGrid', items, 24);
    updateSectionTitle(title);
    const ts = $('trendingSection');
    if (ts) ts.style.display = 'none';
    $$('.nav-link').forEach(l => l.classList.remove('active'));
    link.classList.add('active');
    if (mobileMenu) mobileMenu.classList.remove('open');
    scrollToLatest();
  });

  /* ====================================================
     BOOT — THE KEY FIX
  ==================================================== */
  function bootApp() {
    const mv = movies(), sv = series(), ac = content();
    let hi = hero();

    console.log(`🚀 CineStream boot: ${mv.length} movies | ${sv.length} series | ${hi.length} hero items`);

    // HERO FALLBACK — if HERO_ITEMS is empty, build from trending or first movies
    if (!hi.length && mv.length) {
      const trending = mv.filter(m => m.tags?.includes('Trending'));
      window.HERO_ITEMS = trending.length >= 3 ? trending.slice(0, 5) : mv.slice(0, 5);
      hi = hero();
      console.log(`Hero fallback: ${hi.length} items from ${trending.length >= 3 ? 'trending' : 'popular'}`);
    }

    buildYearButtons();
    renderAll();

    if (hi.length) {
      updateHero(0);
      startHeroTimer();
      console.log(`✅ Hero started with: ${hi[0].title}`);
    } else {
      console.error('❌ Hero failed — no movies loaded');
    }

    updateWatchlistCount();
  }

  // Handle race condition safely
  if (window.__dataReady) {
    // data.js already finished — boot immediately
    console.log('🔄 Data was ready before main.js — booting now');
    bootApp();
  } else {
    // Wait for data
    document.addEventListener('dataReady', e => {
      console.log('📡 dataReady received:', e.detail);
      bootApp();
    });
  }

})();
