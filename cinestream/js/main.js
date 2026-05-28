// CineStream — Main Application v3 (Complete Fix)
(function () {
  'use strict';

  /* ─────────────────────────────────────────────────────
     HELPERS
  ───────────────────────────────────────────────────── */
  const $  = id  => document.getElementById(id);
  const $$ = sel => document.querySelectorAll(sel);

  /* ─────────────────────────────────────────────────────
     STATE
  ───────────────────────────────────────────────────── */
  const PER_PAGE   = 24;
  let filteredList = [];   // current filtered dataset
  let curPage      = 1;    // current pagination page
  let heroIdx      = 0;
  let heroTimer    = null;
  let playerSrvs   = [];
  let uiTimer      = null;
  let watchlist    = JSON.parse(localStorage.getItem('cs_watchlist') || '[]');
  let bootCount    = 0;    // how many times dataReady fired

  /* ─────────────────────────────────────────────────────
     BUILD A MOVIE CARD
  ───────────────────────────────────────────────────── */
  function buildCard(item) {
    const div = document.createElement('div');
    div.className = 'movie-card';

    const badgeText  = item.tags?.includes('New')      ? 'NEW'
                     : item.tags?.includes('Trending') ? 'HOT' : 'HD';
    const badgeStyle = item.tags?.includes('New')      ? 'background:#00c853'
                     : item.tags?.includes('Trending') ? 'background:#f59e0b' : '';

    div.innerHTML = `
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
      <div class="card-badge hd" style="${badgeStyle}">${badgeText}</div>`;

    div.addEventListener('click', () => openModal(item));
    return div;
  }

  /* ─────────────────────────────────────────────────────
     FILL A GRID  (trending, top-rated, series sections)
  ───────────────────────────────────────────────────── */
  function fillGrid(gridId, items, limit) {
    const g = $(gridId);
    if (!g) return;
    g.innerHTML = '';
    items.slice(0, limit || 12).forEach(i => g.appendChild(buildCard(i)));
  }

  /* ─────────────────────────────────────────────────────
     RENDER STATIC SECTIONS
     (Trending Now, Top Rated, Popular TV Series)
  ───────────────────────────────────────────────────── */
  function renderSections() {
    const trending = ALL_CONTENT
      .filter(m => m.tags?.includes('Trending'))
      .slice(0, 12);

    const topRated = [...ALL_CONTENT]
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 12);

    const series = (SERIES && SERIES.length ? SERIES : ALL_CONTENT.filter(m => m.type === 'series'))
      .slice(0, 12);

    fillGrid('trendingGrid', trending, 12);
    fillGrid('topRatedGrid', topRated, 12);
    fillGrid('seriesGrid',   series,   12);

    // Show/hide trending section
    const ts = $('trendingSection');
    if (ts) ts.style.display = trending.length ? '' : 'none';
  }

  /* ─────────────────────────────────────────────────────
     PAGINATED MAIN GRID
  ───────────────────────────────────────────────────── */

  /** Set filteredList + title, reset to page 1, render */
  function applyFilter(items, title) {
    filteredList = Array.isArray(items) ? items : [];
    curPage      = 1;

    const el = document.querySelector('#latestSection .section-title');
    if (el) el.textContent = title || '';

    renderPage();

    const sec = $('latestSection');
    if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /** Render curPage from filteredList into #latestGrid */
  function renderPage() {
    const grid  = $('latestGrid');
    if (!grid) return;

    const start = (curPage - 1) * PER_PAGE;
    const slice = filteredList.slice(start, start + PER_PAGE);

    // ── completely clear, then fill ──
    grid.innerHTML = '';
    slice.forEach(item => grid.appendChild(buildCard(item)));

    // ── rebuild pagination below the grid ──
    buildPagination();
  }

  function buildPagination() {
    // remove old
    const old = $('pgWrap');
    if (old) old.remove();

    const total = Math.ceil(filteredList.length / PER_PAGE);
    if (total <= 1) return;   // nothing to show

    const wrap = document.createElement('div');
    wrap.id    = 'pgWrap';

    const nums = smartPageNums(curPage, total);
    let   html = '<div class="pagination">';

    // Prev
    html += pgBtn(curPage - 1, '‹ Prev', curPage === 1, false);

    // Numbers
    nums.forEach(n => {
      if (n === '…') html += '<span class="page-ellipsis">…</span>';
      else           html += pgBtn(n, n, false, n === curPage);
    });

    // Next
    html += pgBtn(curPage + 1, 'Next ›', curPage === total, false);

    html += `<span class="page-info">Page ${curPage} of ${total} · ${filteredList.length} titles</span>`;
    html += '</div>';

    wrap.innerHTML = html;

    // insert after grid inside its container
    const container = $('latestSection')?.querySelector('.container');
    if (container) container.appendChild(wrap);

    // bind all buttons
    wrap.querySelectorAll('[data-pg]').forEach(btn => {
      btn.addEventListener('click', function () {
        if (this.classList.contains('disabled') || this.classList.contains('active')) return;
        curPage = parseInt(this.dataset.pg, 10);
        renderPage();
        $('latestSection')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  function pgBtn(page, label, disabled, active) {
    return `<button class="page-btn${active ? ' active' : ''}${disabled ? ' disabled' : ''}" data-pg="${page}">${label}</button>`;
  }

  function smartPageNums(cur, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const r = [1];
    if (cur > 3)        r.push('…');
    for (let i = Math.max(2, cur - 1); i <= Math.min(total - 1, cur + 1); i++) r.push(i);
    if (cur < total - 2) r.push('…');
    r.push(total);
    return r;
  }

  /* ─────────────────────────────────────────────────────
     FILTER SYSTEM  (tabs + genre + year + A-Z)
  ───────────────────────────────────────────────────── */

  function buildYearButtons() {
    const panel = $('panel-year');
    if (!panel) return;
    const now = new Date().getFullYear();
    let html  = `<button class="year-btn active" data-year="all">All</button>`;
    for (let y = now + 1; y >= 1970; y--) {
      html += `<button class="year-btn" data-year="${y}">${y}</button>`;
    }
    panel.innerHTML = html;

    panel.querySelectorAll('.year-btn').forEach(b => {
      b.addEventListener('click', () => {
        panel.querySelectorAll('.year-btn').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        const yr = b.dataset.year;
        const f  = yr === 'all'
          ? [...ALL_CONTENT]
          : ALL_CONTENT.filter(m => String(m.year) === String(yr));
        applyFilter(f, yr === 'all' ? '📅 All Years' : `📅 ${yr} — ${f.length} title${f.length !== 1 ? 's' : ''}`);
      });
    });
  }

  function initFilterSystem() {
    // ── Tab clicks ──
    $$('.filter-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        $$('.filter-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        $$('.filter-panel').forEach(p => p.style.display = 'none');

        switch (tab.dataset.tab) {
          case 'popular':
            applyFilter([...ALL_CONTENT].sort((a, b) => b.rating - a.rating), '🔥 Most Popular');
            break;
          case 'recent':
            applyFilter([...ALL_CONTENT].sort((a, b) => b.year - a.year), '🆕 Most Recent');
            break;
          case 'genre':
            $('panel-genre').style.display = 'flex';
            break;
          case 'year':
            $('panel-year').style.display = 'flex';
            break;
          case 'az':
            $('panel-az').style.display = 'flex';
            break;
        }
      });
    });

    // ── Genre buttons ──
    $$('.genre-btn[data-genre]').forEach(b => {
      b.addEventListener('click', () => {
        $$('.genre-btn[data-genre]').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        const g = b.dataset.genre;
        const f = g === 'all' ? [...ALL_CONTENT] : ALL_CONTENT.filter(m => m.genre === g);
        applyFilter(f, g === 'all' ? '🎬 All' : `🎬 ${g.charAt(0).toUpperCase() + g.slice(1)}`);
      });
    });

    // ── A-Z buttons ──
    $$('.genre-btn[data-letter]').forEach(b => {
      b.addEventListener('click', () => {
        $$('.genre-btn[data-letter]').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        const l = b.dataset.letter;
        const f = l === 'all' ? [...ALL_CONTENT] : ALL_CONTENT.filter(m => m.title.toUpperCase().startsWith(l));
        applyFilter(f, l === 'all' ? '🔤 All Titles' : `🔤 "${l}"`);
      });
    });
  }

  /* ─────────────────────────────────────────────────────
     HERO SLIDER
  ───────────────────────────────────────────────────── */
  function updateHero(idx) {
    const pool = (HERO_ITEMS && HERO_ITEMS.length) ? HERO_ITEMS : ALL_CONTENT.slice(0, 5);
    const item = pool[idx];
    if (!item) return;

    if ($('heroBg'))       $('heroBg').style.backgroundImage = `url('${item.backdrop}')`;
    if ($('heroTitle'))    $('heroTitle').textContent    = item.title;
    if ($('heroDesc'))     $('heroDesc').textContent     = item.desc;
    if ($('heroRating'))   $('heroRating').textContent   = `⭐ ${item.rating}`;
    if ($('heroYear'))     $('heroYear').textContent     = item.year;
    if ($('heroDuration')) $('heroDuration').textContent = item.duration;
    if ($('heroGenre'))    $('heroGenre').textContent    = (item.genre || '').charAt(0).toUpperCase() + (item.genre || '').slice(1);

    $$('.hero-dot').forEach((d, i) => d.classList.toggle('active', i === idx));

    if ($('heroWatchBtn')) $('heroWatchBtn').onclick = () => openPlayer(item);
    if ($('heroInfoBtn'))  $('heroInfoBtn').onclick  = () => openModal(item);
  }

  function startHeroTimer() {
    clearInterval(heroTimer);
    heroTimer = setInterval(() => {
      const pool = (HERO_ITEMS && HERO_ITEMS.length) ? HERO_ITEMS : ALL_CONTENT.slice(0, 5);
      heroIdx    = (heroIdx + 1) % pool.length;
      updateHero(heroIdx);
    }, 6000);
  }

  $$('.hero-dot').forEach(d => {
    d.addEventListener('click', () => {
      heroIdx = parseInt(d.dataset.idx, 10);
      updateHero(heroIdx);
      startHeroTimer();
    });
  });

  /* ─────────────────────────────────────────────────────
     NAVBAR
  ───────────────────────────────────────────────────── */
  window.addEventListener('scroll', () => {
    $('navbar')?.classList.toggle('scrolled', window.scrollY > 60);
  }, { passive: true });

  $('menuBtn')?.addEventListener('click', () => $('mobileMenu')?.classList.toggle('open'));

  document.addEventListener('click', e => {
    if (!e.target.closest('#menuBtn') && !e.target.closest('#mobileMenu')) {
      $('mobileMenu')?.classList.remove('open');
    }
  });

  /* ─────────────────────────────────────────────────────
     SEARCH (navbar dropdown)
  ───────────────────────────────────────────────────── */
  const sInput = $('searchInput');
  const sDrop  = $('searchDropdown');

  if (sInput) {
    sInput.addEventListener('input', async () => {
      const q = sInput.value.trim().toLowerCase();
      if (q.length < 2) { sDrop?.classList.remove('open'); return; }

      // local match
      let res = ALL_CONTENT.filter(m =>
        m.title.toLowerCase().includes(q) || m.genre.toLowerCase().includes(q)
      ).slice(0, 6);

      // live TMDB top-up
      if (q.length >= 3 && window.TMDB_KEY) {
        try {
          const r  = await fetch(`https://api.themoviedb.org/3/search/multi?api_key=${window.TMDB_KEY}&query=${encodeURIComponent(q)}`);
          const d  = await r.json();
          const existing = new Set(res.map(m => m.id));
          (d.results || []).filter(m => m.poster_path && !existing.has(m.id)).slice(0, 4).forEach(m => {
            const isTv = m.media_type === 'tv' || !!m.name;
            res.push({
              id:       m.id,
              title:    m.title || m.name,
              year:     new Date(m.release_date || m.first_air_date || '2024').getFullYear(),
              rating:   Math.round((m.vote_average || 0) * 10) / 10,
              genre:    'drama', type: isTv ? 'series' : 'movie',
              desc:     m.overview || '', duration: '—',
              poster:   `https://image.tmdb.org/t/p/w500${m.poster_path}`,
              backdrop: m.backdrop_path ? `https://image.tmdb.org/t/p/w1280${m.backdrop_path}` : `https://image.tmdb.org/t/p/w500${m.poster_path}`,
              tags:     ['HD'],
            });
          });
        } catch (_) {}
      }

      if (!sDrop) return;
      sDrop.innerHTML = res.length
        ? res.slice(0, 8).map(m => `
            <div class="search-result-item" data-id="${m.id}">
              <img src="${m.poster}" alt="${m.title}" onerror="this.style.opacity=0">
              <div class="search-result-info">
                <strong>${m.title}</strong>
                <span>⭐ ${m.rating} · ${m.year} · ${m.genre}</span>
              </div>
            </div>`).join('')
        : '<div style="padding:16px;text-align:center;color:#7a7a90;font-size:13px">No results found</div>';

      sDrop.classList.add('open');

      sDrop.querySelectorAll('.search-result-item').forEach(el => {
        el.addEventListener('click', () => {
          let item = ALL_CONTENT.find(m => m.id === parseInt(el.dataset.id));
          if (!item) {
            item = res.find(m => m.id === parseInt(el.dataset.id));
            if (item && !ALL_CONTENT.find(m => m.id === item.id)) ALL_CONTENT.push(item);
          }
          if (item) openModal(item);
          sDrop.classList.remove('open');
          sInput.value = '';
        });
      });
    });

    sInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        window.location.href = `search.html?q=${encodeURIComponent(sInput.value.trim())}`;
      }
    });

    document.addEventListener('click', e => {
      if (!e.target.closest('.search-wrap')) sDrop?.classList.remove('open');
    });
  }

  /* ─────────────────────────────────────────────────────
     MODAL
  ───────────────────────────────────────────────────── */
  function openModal(item) {
    const ov = $('modalOverlay');
    if (!ov) return;

    $('modalBackdrop').src      = item.backdrop || item.poster;
    $('modalTitle').textContent = item.title;
    $('modalDesc').textContent  = item.desc || 'No description available.';

    $('modalBadges').innerHTML = `
      <span class="badge badge-hd">HD</span>
      <span class="badge badge-free">FREE</span>
      ${item.type === 'series' ? '<span class="badge" style="background:rgba(255,255,255,.15)">SERIES</span>' : ''}`;

    const inWl = watchlist.includes(item.id);
    const wBtn = $('modalWatchlistBtn');
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

    // Related
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
        const r = ALL_CONTENT.find(m => m.id === parseInt(el.dataset.id));
        if (r) openModal(r);
      });
    });

    $('modalWatchBtn').onclick = () => { closeModal(); openPlayer(item); };
    if ($('modalTrailerBtn')) $('modalTrailerBtn').onclick = () => showToast('🎬 Trailer — connect YouTube API');

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

    ov.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    $('modalOverlay')?.classList.remove('open');
    document.body.style.overflow = '';
  }

  $('modalClose')?.addEventListener('click', closeModal);
  $('modalOverlay')?.addEventListener('click', e => {
    if (e.target === $('modalOverlay')) closeModal();
  });

  /* ─────────────────────────────────────────────────────
     PLAYER
  ───────────────────────────────────────────────────── */
  function openPlayer(item) {
  // Breadcrumb
  $('playerTitle').textContent = `${item.title} (${item.year})`;
  const breadcrumbHome = $('breadcrumbHome');
if (breadcrumbHome) {
  breadcrumbHome.textContent = item.type === 'series' ? 'TV Series' : 'Movies';
  breadcrumbHome.onclick = (e) => {
    e.preventDefault();
    closePlayer();
    if (item.type === 'series') {
      window.location.href = 'series.html';
    } else {
      const section = document.getElementById('latestSection');
      if (section) section.scrollIntoView({ behavior: 'smooth' });
    }
  };
}
  breadcrumbHome.onclick = (e) => {
    e.preventDefault();
    closePlayer();
    if (item.type === 'series') {
      window.location.href = 'series.html';
    } else {
      const section = document.getElementById('latestSection');
      if (section) section.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const screen = $('playerScreen');

  // Build server URLs
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

  // Load default server
  loadServer(0, screen);

  // Reset server buttons
  $$('.source-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.server === '0') btn.classList.add('active');
    btn.onclick = () => {
      $$('.source-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadServer(parseInt(btn.dataset.server), screen);
    };
  });

  // Fullscreen button
  $('playerFullscreen').onclick = () => toggleFullscreen();

  // Picture in Picture
  $('playerPip').onclick = () => {
    showToast('📺 Use the browser PiP button in the address bar');
  };

  // Auto-hide UI on mouse stop
  const overlay = $('playerOverlay');
  overlay.onmousemove = resetUiTimer;
  overlay.ontouchstart = resetUiTimer;

  // Open player
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  resetUiTimer();
}

  function loadServer(i, sc) {
    const url = playerSrvs[i] || playerSrvs[0];
    sc.innerHTML = `<iframe src="${url}" allowfullscreen allow="autoplay;fullscreen;picture-in-picture" style="width:100%;height:100%;border:none"></iframe>`;
  }

  function resetUiTimer() {
    $('playerOverlay')?.classList.remove('hide-ui');
    clearTimeout(uiTimer);
    uiTimer = setTimeout(() => $('playerOverlay')?.classList.add('hide-ui'), 3500);
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      $('playerOverlay')?.requestFullscreen();
      if ($('playerFullscreen')) $('playerFullscreen').textContent = '⊠ Exit';
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
    clearTimeout(uiTimer);
    if (document.fullscreenElement) document.exitFullscreen();
    document.body.style.overflow = '';
  }

  $('playerClose')?.addEventListener('click', closePlayer);
  $('playerOverlay')?.addEventListener('click', e => {
    if (e.target === $('playerOverlay')) closePlayer();
  });
  $('playerCloseLink')?.addEventListener('click', e => {
    e.preventDefault();
    closePlayer();
    $('latestSection')?.scrollIntoView({ behavior: 'smooth' });
  });

  /* ─────────────────────────────────────────────────────
     TOAST
  ───────────────────────────────────────────────────── */
  let toastTimer;
  function showToast(msg) {
    const t = $('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
  }

  /* ─────────────────────────────────────────────────────
     KEYBOARD
  ───────────────────────────────────────────────────── */
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeModal(); closePlayer(); }
    if (e.key === 'f' && $('playerOverlay')?.classList.contains('open')) toggleFullscreen();
    if (e.key === '/' && !e.target.matches('input,textarea')) {
      e.preventDefault();
      sInput?.focus();
    }
  });

  /* ─────────────────────────────────────────────────────
     TOP-LEVEL NAV LINKS  (Home / Movies / Series etc.)
  ───────────────────────────────────────────────────── */
  document.addEventListener('click', e => {
    const link = e.target.closest('[data-page]');
    if (!link) return;
    e.preventDefault();

    let items = ALL_CONTENT, title = '🎬 All Content';
    switch (link.dataset.page) {
      case 'movies':   items = MOVIES;  title = '🎬 All Movies';  break;
      case 'series':   items = SERIES;  title = '📺 All TV Series'; break;
      case 'trending': items = ALL_CONTENT.filter(m => m.tags?.includes('Trending')); title = '🔥 Trending'; break;
      case 'top250':   items = [...ALL_CONTENT].sort((a, b) => b.rating - a.rating); title = '⭐ Top Rated'; break;
    }

    applyFilter(items, title);
    $$('.nav-link').forEach(l => l.classList.remove('active'));
    link.classList?.add('active');
    $('mobileMenu')?.classList.remove('open');
  });

  /* ─────────────────────────────────────────────────────
     SEE-ALL LINKS
  ───────────────────────────────────────────────────── */
  document.querySelectorAll('.see-all[data-page]').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      const pg = a.dataset.page;
      document.querySelector(`[data-page="${pg}"]`)?.click();
    });
  });

  /* ─────────────────────────────────────────────────────
     BOOT  — called once data is ready
  ───────────────────────────────────────────────────── */
  function boot() {
    // 1. Hero slider
    updateHero(0);
    startHeroTimer();

    // 2. Fill section grids (trending / top-rated / series)
    renderSections();

    // 3. Build year buttons for filter
    buildYearButtons();

    // 4. Bind filter tabs / genre / A-Z
    initFilterSystem();

    // 5. Default paginated grid — show latest movies
    const latest = [...ALL_CONTENT].sort((a, b) => b.year - a.year || b.rating - a.rating);
    applyFilter(latest, '🆕 Latest Movies');

    // 6. Hide loader
    const loader = $('loader');
    if (loader) loader.style.display = 'none';
  }

  function onDataReady() {
    bootCount++;
    if (bootCount === 1) {
      // First fire — phase-1 data (latest + series)
      boot();
    } else {
      // Second fire — full historical data merged in
      renderSections();          // refresh trending / top-rated grids
      buildYearButtons();        // rebuild year list with all years
      // Re-render the paginated grid with all data, same sort
      const latest = [...ALL_CONTENT].sort((a, b) => b.year - a.year || b.rating - a.rating);
      applyFilter(latest, '🆕 Latest Movies');
      const loader = $('loader');
      if (loader) loader.style.display = 'none';
    }
  }

  document.addEventListener('dataReady', onDataReady);

  // Fallback: if data.js is synchronous (no async fetch)
  if (typeof ALL_CONTENT !== 'undefined' && ALL_CONTENT.length) boot();

})();
