// CineStream — Main Application (Fixed)
(function () {
  'use strict';

  /* ── DOM helpers ───────────────────────────────────────── */
  const $ = id => document.getElementById(id);
  const $$ = sel => document.querySelectorAll(sel);

  /* ── State ─────────────────────────────────────────────── */
  const ITEMS_PER_PAGE = 24;
  let currentFiltered  = [];
  let currentPage      = 1;
  let currentHero      = 0;
  let heroTimer        = null;
  let watchlist        = JSON.parse(localStorage.getItem('cs_watchlist') || '[]');
  let dataLoaded       = false;

  /* ====================================================
     CARD BUILDER
  ==================================================== */
  function buildCard(item) {
    const card = document.createElement('div');
    card.className = 'movie-card';
    card.dataset.id = item.id;

    const badge = item.tags?.includes('New')
      ? '<div class="card-badge new-badge">NEW</div>'
      : item.tags?.includes('Trending')
        ? '<div class="card-badge" style="background:#f59e0b">HOT</div>'
        : '<div class="card-badge hd">HD</div>';

    card.innerHTML = `
      <img class="card-poster" src="${item.poster}" alt="${item.title}" loading="lazy"
           onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
      <div class="card-poster-placeholder" style="display:none">🎬</div>
      <div class="card-overlay"></div>
      <div class="card-info">
        <div class="card-title">${item.title}</div>
        <div class="card-meta">
          <span class="card-rating">⭐ ${item.rating}</span>
          <span>${item.year}</span>
          ${item.type === 'series' ? '<span>📺</span>' : ''}
        </div>
      </div>
      <div class="card-play">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
      </div>
      ${badge}`;

    card.addEventListener('click', () => openModal(item));
    return card;
  }

  /* ====================================================
     PAGINATION — core render
  ==================================================== */
  function renderPage(page) {
    currentPage   = page;
    const start   = (page - 1) * ITEMS_PER_PAGE;
    const slice   = currentFiltered.slice(start, start + ITEMS_PER_PAGE);
    const grid    = $('latestGrid');

    // Completely clear the grid
    grid.innerHTML = '';

    // Add only this page's cards
    slice.forEach(item => grid.appendChild(buildCard(item)));

    // Rebuild pagination
    buildPagination();

    // Scroll to grid
    $('latestSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function applyFilter(items, title) {
    currentFiltered = items;
    currentPage     = 1;

    const titleEl = document.querySelector('#latestSection .section-title');
    if (titleEl) titleEl.textContent = title;

    renderPage(1);
  }

  function buildPagination() {
    // Remove old
    const old = $('paginationWrap');
    if (old) old.remove();

    const total = Math.ceil(currentFiltered.length / ITEMS_PER_PAGE);
    if (total <= 1) return; // hide if not needed

    const wrap = document.createElement('div');
    wrap.id = 'paginationWrap';

    let html = '<div class="pagination">';

    // Prev
    html += `<button class="page-btn ${currentPage === 1 ? 'disabled' : ''}"
      data-page="${currentPage - 1}">‹ Prev</button>`;

    // Page numbers
    const pages = getPageNumbers(currentPage, total);
    pages.forEach(p => {
      if (p === '...') {
        html += `<span class="page-ellipsis">…</span>`;
      } else {
        html += `<button class="page-btn ${p === currentPage ? 'active' : ''}"
          data-page="${p}">${p}</button>`;
      }
    });

    // Next
    html += `<button class="page-btn ${currentPage === total ? 'disabled' : ''}"
      data-page="${currentPage + 1}">Next ›</button>`;

    html += `<span class="page-info">Page ${currentPage} of ${total} · ${currentFiltered.length} titles</span>`;
    html += '</div>';

    wrap.innerHTML = html;

    // Insert after the grid inside latestSection container
    const container = $('latestSection').querySelector('.container');
    container.appendChild(wrap);

    // Bind clicks
    wrap.querySelectorAll('.page-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.classList.contains('disabled') || btn.classList.contains('active')) return;
        const p = parseInt(btn.dataset.page);
        if (!isNaN(p)) renderPage(p);
      });
    });
  }

  function getPageNumbers(current, total) {
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const pages = [1];
    if (current > 3) pages.push('...');
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
      pages.push(i);
    }
    if (current < total - 2) pages.push('...');
    pages.push(total);
    return pages;
  }

  /* ====================================================
     FILTER SYSTEM
  ==================================================== */
  function buildYearButtons() {
    const panel = $('panel-year');
    if (!panel) return;

    const now  = new Date().getFullYear();
    let   html = `<button class="year-btn active" data-year="all">All</button>`;
    for (let y = now + 1; y >= 1970; y--) {
      html += `<button class="year-btn" data-year="${y}">${y}</button>`;
    }
    panel.innerHTML = html;

    panel.querySelectorAll('.year-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        panel.querySelectorAll('.year-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const yr = btn.dataset.year;
        const filtered = yr === 'all'
          ? [...ALL_CONTENT]
          : ALL_CONTENT.filter(m => String(m.year) === String(yr));
        applyFilter(filtered, yr === 'all' ? '📅 All Years' : `📅 ${yr} — ${filtered.length} titles`);
      });
    });
  }

  function initFilterTabs() {
    $$('.filter-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        $$('.filter-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        $$('.filter-panel').forEach(p => p.style.display = 'none');

        const name = tab.dataset.tab;
        if (name === 'popular') {
          applyFilter([...ALL_CONTENT].sort((a, b) => b.rating - a.rating), '🔥 Most Popular');
        } else if (name === 'recent') {
          applyFilter([...ALL_CONTENT].sort((a, b) => b.year - a.year), '🆕 Most Recent');
        } else if (name === 'genre') {
          $('panel-genre').style.display = 'flex';
        } else if (name === 'year') {
          $('panel-year').style.display = 'flex';
        } else if (name === 'az') {
          $('panel-az').style.display = 'flex';
        }
      });
    });

    $$('.genre-btn[data-genre]').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.genre-btn[data-genre]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const g = btn.dataset.genre;
        const f = g === 'all' ? [...ALL_CONTENT] : ALL_CONTENT.filter(m => m.genre === g);
        applyFilter(f, g === 'all' ? '🎬 All' : `🎬 ${g.charAt(0).toUpperCase() + g.slice(1)}`);
      });
    });

    $$('.genre-btn[data-letter]').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.genre-btn[data-letter]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const l = btn.dataset.letter;
        const f = l === 'all' ? [...ALL_CONTENT] : ALL_CONTENT.filter(m => m.title.toUpperCase().startsWith(l));
        applyFilter(f, l === 'all' ? '🔤 All Titles' : `🔤 "${l}"`);
      });
    });
  }

  /* ====================================================
     HERO SLIDER
  ==================================================== */
  function updateHero(idx) {
    const items = HERO_ITEMS.length ? HERO_ITEMS : ALL_CONTENT.slice(0, 5);
    const item  = items[idx];
    if (!item) return;

    if ($('heroBg'))      $('heroBg').style.backgroundImage = `url('${item.backdrop}')`;
    if ($('heroTitle'))   $('heroTitle').textContent   = item.title;
    if ($('heroDesc'))    $('heroDesc').textContent    = item.desc;
    if ($('heroRating'))  $('heroRating').textContent  = `⭐ ${item.rating}`;
    if ($('heroYear'))    $('heroYear').textContent    = item.year;
    if ($('heroDuration'))$('heroDuration').textContent= item.duration;
    if ($('heroGenre'))   $('heroGenre').textContent   = item.genre?.charAt(0).toUpperCase() + item.genre?.slice(1);

    $$('.hero-dot').forEach((d, i) => d.classList.toggle('active', i === idx));

    if ($('heroWatchBtn')) $('heroWatchBtn').onclick = () => openPlayer(item);
    if ($('heroInfoBtn'))  $('heroInfoBtn').onclick  = () => openModal(item);
  }

  function startHeroTimer() {
    clearInterval(heroTimer);
    heroTimer = setInterval(() => {
      const items = HERO_ITEMS.length ? HERO_ITEMS : ALL_CONTENT.slice(0, 5);
      currentHero = (currentHero + 1) % items.length;
      updateHero(currentHero);
    }, 6000);
  }

  $$('.hero-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      currentHero = parseInt(dot.dataset.idx);
      updateHero(currentHero);
      startHeroTimer();
    });
  });

  /* ====================================================
     NAVBAR
  ==================================================== */
  window.addEventListener('scroll', () => {
    document.getElementById('navbar')?.classList.toggle('scrolled', window.scrollY > 60);
  }, { passive: true });

  $('menuBtn')?.addEventListener('click', () => $('mobileMenu')?.classList.toggle('open'));

  document.addEventListener('click', e => {
    if (!e.target.closest('#menuBtn') && !e.target.closest('#mobileMenu')) {
      $('mobileMenu')?.classList.remove('open');
    }
  });

  /* ====================================================
     SEARCH
  ==================================================== */
  const searchInput    = $('searchInput');
  const searchDropdown = $('searchDropdown');

  if (searchInput) {
    searchInput.addEventListener('input', async () => {
      const q = searchInput.value.trim().toLowerCase();
      if (q.length < 2) { searchDropdown?.classList.remove('open'); return; }

      let results = ALL_CONTENT.filter(m =>
        m.title.toLowerCase().includes(q) ||
        m.genre.toLowerCase().includes(q)
      ).slice(0, 6);

      // Live TMDB search for missing titles
      if (q.length >= 3 && window.TMDB_KEY) {
        try {
          const res  = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${window.TMDB_KEY}&query=${encodeURIComponent(q)}`);
          const data = await res.json();
          const ids  = new Set(results.map(m => m.id));
          data.results.filter(m => m.poster_path && !ids.has(m.id)).slice(0, 4).forEach(m => {
            results.push({
              id: m.id, title: m.title,
              year: m.release_date ? new Date(m.release_date).getFullYear() : '—',
              rating: Math.round(m.vote_average * 10) / 10,
              genre: 'drama', type: 'movie', desc: m.overview,
              poster:   `https://image.tmdb.org/t/p/w500${m.poster_path}`,
              backdrop: m.backdrop_path ? `https://image.tmdb.org/t/p/w1280${m.backdrop_path}` : `https://image.tmdb.org/t/p/w500${m.poster_path}`,
              tags: ['HD'], duration: '—',
            });
          });
        } catch(e) {}
      }

      if (!searchDropdown) return;
      searchDropdown.innerHTML = results.length
        ? results.slice(0, 8).map(m => `
            <div class="search-result-item" data-id="${m.id}">
              <img src="${m.poster}" alt="${m.title}" onerror="this.style.opacity=0">
              <div class="search-result-info">
                <strong>${m.title}</strong>
                <span>⭐ ${m.rating} · ${m.year} · ${m.genre}</span>
              </div>
            </div>`).join('')
        : '<div style="padding:16px;text-align:center;color:#7a7a90;font-size:13px">No results found</div>';

      searchDropdown.classList.add('open');

      searchDropdown.querySelectorAll('.search-result-item').forEach(el => {
        el.addEventListener('click', () => {
          let item = ALL_CONTENT.find(m => m.id === parseInt(el.dataset.id));
          if (!item) item = results.find(m => m.id === parseInt(el.dataset.id));
          if (item) {
            if (!ALL_CONTENT.find(m => m.id === item.id)) ALL_CONTENT.push(item);
            openModal(item);
          }
          searchDropdown.classList.remove('open');
          searchInput.value = '';
        });
      });
    });

    document.addEventListener('click', e => {
      if (!e.target.closest('.search-wrap')) searchDropdown?.classList.remove('open');
    });
  }

  /* ====================================================
     MODAL
  ==================================================== */
  function openModal(item) {
    const overlay = $('modalOverlay');
    if (!overlay) return;

    $('modalBackdrop').src    = item.backdrop || item.poster;
    $('modalTitle').textContent = item.title;
    $('modalDesc').textContent  = item.desc;

    $('modalBadges').innerHTML = `
      <span class="badge badge-hd">HD</span>
      <span class="badge badge-free">FREE</span>
      ${item.type === 'series' ? '<span class="badge" style="background:rgba(255,255,255,.15)">SERIES</span>' : ''}`;

    const inWl  = watchlist.includes(item.id);
    const wBtn  = $('modalWatchlistBtn');
    wBtn.textContent = inWl ? '✓ In Watchlist' : '+ Watchlist';
    wBtn.className   = 'btn-watchlist' + (inWl ? ' added' : '');

    $('modalMeta').innerHTML = `
      <span style="color:#f5c518;font-weight:600">⭐ ${item.rating}</span>
      <span>${item.year}</span>
      <span>${item.duration}</span>
      <span style="text-transform:capitalize">${item.genre}</span>
      ${item.seasons ? `<span>${item.seasons} Season${item.seasons > 1 ? 's' : ''}</span>` : ''}`;

    $('modalDetails').innerHTML = `
      ${item.director ? `<div class="detail-row"><span class="detail-label">Director</span><span class="detail-val">${item.director}</span></div>` : ''}
      ${item.cast     ? `<div class="detail-row"><span class="detail-label">Cast</span><span class="detail-val">${item.cast}</span></div>` : ''}
      <div class="detail-row"><span class="detail-label">Genre</span><span class="detail-val" style="text-transform:capitalize">${item.genre}</span></div>
      <div class="detail-row"><span class="detail-label">Year</span><span class="detail-val">${item.year}</span></div>
      <div class="detail-row"><span class="detail-label">Rating</span><span class="detail-val">⭐ ${item.rating} / 10</span></div>
      <div class="detail-row"><span class="detail-label">Quality</span><span class="detail-val" style="color:var(--accent)">HD 1080p</span></div>`;

    const related = ALL_CONTENT
      .filter(m => m.genre === item.genre && m.id !== item.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 4);

    $('relatedGrid').innerHTML = related.map(m => `
      <div class="related-card" data-id="${m.id}">
        <img src="${m.poster}" alt="${m.title}" loading="lazy" onerror="this.style.opacity=0">
        <div class="related-card-title">${m.title}</div>
      </div>`).join('');

    $('relatedGrid').querySelectorAll('.related-card').forEach(el => {
      el.addEventListener('click', () => {
        const rel = ALL_CONTENT.find(m => m.id === parseInt(el.dataset.id));
        if (rel) openModal(rel);
      });
    });

    $('modalWatchBtn').onclick   = () => { closeModal(); openPlayer(item); };
    $('modalTrailerBtn').onclick = () => showToast('🎬 Trailer — connect YouTube API');
    wBtn.onclick = () => {
      const idx = watchlist.indexOf(item.id);
      if (idx === -1) {
        watchlist.push(item.id);
        wBtn.textContent = '✓ In Watchlist';
        wBtn.classList.add('added');
        showToast('✅ Added to Watchlist');
      } else {
        watchlist.splice(idx, 1);
        wBtn.textContent = '+ Watchlist';
        wBtn.classList.remove('added');
        showToast('Removed from Watchlist');
      }
      localStorage.setItem('cs_watchlist', JSON.stringify(watchlist));
    };

    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    $('modalOverlay')?.classList.remove('open');
    document.body.style.overflow = '';
  }

  $('modalClose')?.addEventListener('click', closeModal);
  $('modalOverlay')?.addEventListener('click', e => { if (e.target === $('modalOverlay')) closeModal(); });

  /* ====================================================
     PLAYER
  ==================================================== */
  let currentServers = [];
  let uiHideTimer;

  function openPlayer(item) {
    if ($('playerTitle')) $('playerTitle').textContent = item.title;
    const screen = $('playerScreen');

    currentServers = item.type === 'series'
      ? [
          `https://vidsrc.to/embed/tv/${item.id}/1/1`,
          `https://www.2embed.cc/embedtv/${item.id}&s=1&e=1`,
          `https://multiembed.mov/?video_id=${item.id}&tmdb=1&s=1&e=1`,
        ]
      : [
          `https://vidsrc.to/embed/movie/${item.id}`,
          `https://www.2embed.cc/embed/${item.id}`,
          `https://multiembed.mov/?video_id=${item.id}&tmdb=1`,
        ];

    loadServer(0, screen);

    $$('.source-btn').forEach((btn, i) => {
      btn.classList.toggle('active', i === 0);
      btn.onclick = () => {
        $$('.source-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        loadServer(i, screen);
      };
    });

    if ($('playerFullscreen')) $('playerFullscreen').onclick = toggleFullscreen;
    if ($('playerPip'))        $('playerPip').onclick = () => showToast('📺 Use browser PiP button');

    const overlay = $('playerOverlay');
    overlay.addEventListener('mousemove', resetUiTimer);
    overlay.addEventListener('touchstart', resetUiTimer);
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    resetUiTimer();
  }

  function loadServer(index, screen) {
    const url = currentServers[index] || currentServers[0];
    screen.innerHTML = `<iframe src="${url}" allowfullscreen allow="autoplay;fullscreen;picture-in-picture" style="width:100%;height:100%;border:none"></iframe>`;
  }

  function resetUiTimer() {
    $('playerOverlay')?.classList.remove('hide-ui');
    clearTimeout(uiHideTimer);
    uiHideTimer = setTimeout(() => $('playerOverlay')?.classList.add('hide-ui'), 3500);
  }

  function toggleFullscreen() {
    const el = $('playerOverlay');
    if (!document.fullscreenElement) {
      el.requestFullscreen().catch(() => showToast('Fullscreen not supported'));
      if ($('playerFullscreen')) $('playerFullscreen').textContent = '⊠ Exit Fullscreen';
    } else {
      document.exitFullscreen();
      if ($('playerFullscreen')) $('playerFullscreen').textContent = '⛶ Fullscreen';
    }
  }

  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && $('playerFullscreen')) {
      $('playerFullscreen').textContent = '⛶ Fullscreen';
    }
  });

  function closePlayer() {
    $('playerOverlay')?.classList.remove('open', 'hide-ui');
    if ($('playerScreen')) $('playerScreen').innerHTML = '';
    clearTimeout(uiHideTimer);
    if (document.fullscreenElement) document.exitFullscreen();
    document.body.style.overflow = '';
  }

  $('playerClose')?.addEventListener('click', closePlayer);
  $('playerOverlay')?.addEventListener('click', e => { if (e.target === $('playerOverlay')) closePlayer(); });

  // Player back link
  $('playerCloseLink')?.addEventListener('click', e => {
    e.preventDefault();
    closePlayer();
    $('latestSection')?.scrollIntoView({ behavior: 'smooth' });
  });

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
    toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
  }

  /* ====================================================
     KEYBOARD SHORTCUTS
  ==================================================== */
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeModal(); closePlayer(); }
    if (e.key === 'f' && $('playerOverlay')?.classList.contains('open')) toggleFullscreen();
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
    const pg = link.dataset.page;
    let items = ALL_CONTENT, title = '🎬 All Content';
    if (pg === 'movies')   { items = MOVIES; title = '🎬 All Movies'; }
    if (pg === 'series')   { items = SERIES; title = '📺 All TV Series'; }
    if (pg === 'trending') { items = ALL_CONTENT.filter(m => m.tags?.includes('Trending')); title = '🔥 Trending'; }
    if (pg === 'top250')   { items = [...ALL_CONTENT].sort((a,b) => b.rating - a.rating); title = '⭐ Top Rated'; }
    applyFilter(items, title);
    $$('.nav-link').forEach(l => l.classList.remove('active'));
    link.classList?.add('active');
    $('mobileMenu')?.classList.remove('open');
  });

  /* ====================================================
     DATA READY — boot everything
  ==================================================== */
  function onDataReady() {
    if (dataLoaded) return; // prevent double-init on first dataReady
    dataLoaded = true;

    // Hero
    updateHero(0);
    startHeroTimer();

    // Build year buttons
    buildYearButtons();

    // Filter tabs
    initFilterTabs();

    // Default view: show latest movies first
    const latest = [...ALL_CONTENT].sort((a, b) => b.year - a.year);
    applyFilter(latest, '🆕 Latest Movies');

    // Hide loader
    const loader = $('loader');
    if (loader) loader.style.display = 'none';
  }

  // Second dataReady (full historical data loaded) — refresh with more data
  let readyCount = 0;
  document.addEventListener('dataReady', () => {
    readyCount++;
    if (readyCount === 1) {
      onDataReady();
    } else {
      // Rebuild year buttons with full data, keep current filter
      buildYearButtons();
      // Re-apply current filter with updated ALL_CONTENT
      const latest = [...ALL_CONTENT].sort((a, b) => b.year - a.year);
      applyFilter(latest, '🆕 Latest Movies');
      const loader = $('loader');
      if (loader) loader.style.display = 'none';
    }
  });

  // If data already loaded (static data.js with no async)
  if (typeof ALL_CONTENT !== 'undefined' && ALL_CONTENT.length) {
    onDataReady();
  }

})();
