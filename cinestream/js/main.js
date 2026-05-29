// CineStream — Main Application

let currentServers = [];
let uiHideTimer;

(function () {
  'use strict';

  const $ = id => document.getElementById(id);
  const $$ = sel => document.querySelectorAll(sel);

  /* ====================================================
     HERO SLIDER
  ==================================================== */
  let heroIndex = 0;
  let heroTimer = null;

  function updateHero(idx) {
    const item = HERO_ITEMS[idx];
    if (!item) return;
    $('heroBg').style.backgroundImage = `url('${item.backdrop}')`;
    $('heroTitle').textContent        = item.title;
    $('heroDesc').textContent         = item.desc;
    $('heroRating').textContent       = `⭐ ${item.rating}`;
    $('heroYear').textContent         = item.year;
    $('heroDuration').textContent     = item.duration;
    $('heroGenre').textContent        = item.genre.charAt(0).toUpperCase() + item.genre.slice(1);
    $$('.hero-dot').forEach((d, i) => d.classList.toggle('active', i === idx));
    $('heroWatchBtn').onclick = () => openPlayer(item);
    $('heroInfoBtn').onclick  = () => openModal(item);
  }

  function startHeroTimer() {
    clearInterval(heroTimer);
    heroTimer = setInterval(() => {
      heroIndex = (heroIndex + 1) % HERO_ITEMS.length;
      updateHero(heroIndex);
    }, 6000);
  }

  $$('.hero-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      heroIndex = parseInt(dot.dataset.idx);
      updateHero(heroIndex);
      startHeroTimer();
    });
  });

  /* ====================================================
     NAVBAR SCROLL
  ==================================================== */
  window.addEventListener('scroll', () => {
    document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 60);
  }, { passive: true });

  /* ====================================================
     MOBILE MENU
  ==================================================== */
  $('menuBtn').addEventListener('click', () => $('mobileMenu').classList.toggle('open'));
  document.addEventListener('click', e => {
    if (!e.target.closest('#menuBtn') && !e.target.closest('#mobileMenu'))
      $('mobileMenu').classList.remove('open');
  });

  /* ====================================================
     MOVIE CARD BUILDER
  ==================================================== */
  function buildCard(item) {
    const card = document.createElement('div');
    card.className  = 'movie-card';
    card.dataset.id = item.id;
    const isTrending = item.tags && item.tags.includes('Trending');
    const isNew      = item.tags && item.tags.includes('New');
    const badgeText  = isNew ? 'NEW' : isTrending ? 'HOT' : 'HD';
    const badgeClass = isNew ? 'new-badge' : '';
    card.innerHTML = `
      <img class="card-poster" src="${item.poster}" alt="${item.title}" loading="lazy"
           onerror="this.style.display='none'">
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
      <div class="card-badge ${badgeClass}">${badgeText}</div>`;
    card.addEventListener('click', () => openModal(item));
    return card;
  }

  function renderGrid(gridId, items, limit) {
    const grid = $(gridId);
    if (!grid) return;
    grid.innerHTML = '';
    (limit ? items.slice(0, limit) : items).forEach(item => grid.appendChild(buildCard(item)));
  }

  /* ====================================================
     RENDER SECTIONS
  ==================================================== */
  function renderAll() {
    const trending = ALL_CONTENT.filter(m => m.tags && m.tags.includes('Trending'));
    const latest   = [...MOVIES].sort((a, b) => b.year - a.year).slice(0, 10);
    const topRated = [...ALL_CONTENT].sort((a, b) => b.rating - a.rating).slice(0, 10);
    const series   = SERIES.slice(0, 8);
    renderGrid('trendingGrid', trending.length ? trending : topRated, 8);
    renderGrid('latestGrid',   latest,   10);
    renderGrid('topRatedGrid', topRated, 10);
    renderGrid('seriesGrid',   series,   8);
  }

  /* ====================================================
     FILTER SYSTEM
  ==================================================== */
  function buildYearButtons() {
    const panel = document.getElementById('panel-year');
    if (!panel) return;
    const currentYear = new Date().getFullYear();
    let html = `<button class="year-btn active" data-year="all">All</button>`;
    for (let y = currentYear + 1; y >= 1970; y--) {
      html += `<button class="year-btn" data-year="${y}">${y}</button>`;
    }
    panel.innerHTML = html;
    panel.querySelectorAll('.year-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        panel.querySelectorAll('.year-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const year     = btn.dataset.year;
        const filtered = year === 'all'
          ? ALL_CONTENT
          : ALL_CONTENT.filter(m => m.year === parseInt(year));
        renderGrid('latestGrid', filtered, 24);
        updateSectionTitle(`📅 ${year === 'all' ? 'All Years' : year} — ${filtered.length} titles`);
        scrollToLatest();
      });
    });
  }

  $$('.filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      $$('.filter-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.filter-panel').forEach(p => p.style.display = 'none');
      const name = tab.dataset.tab;
      if (name === 'popular') {
        renderGrid('latestGrid', [...ALL_CONTENT].sort((a, b) => b.rating - a.rating), 24);
        updateSectionTitle('🔥 Most Popular');
        scrollToLatest();
      } else if (name === 'recent') {
        renderGrid('latestGrid', [...ALL_CONTENT].sort((a, b) => b.year - a.year), 24);
        updateSectionTitle('🆕 Recently Added');
        scrollToLatest();
      } else if (name === 'genre') {
        document.getElementById('panel-genre').style.display = 'flex';
      } else if (name === 'year') {
        document.getElementById('panel-year').style.display = 'flex';
      } else if (name === 'az') {
        document.getElementById('panel-az').style.display = 'flex';
      }
    });
  });

  $$('.genre-btn[data-genre]').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.genre-btn[data-genre]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const genre    = btn.dataset.genre;
      const filtered = genre === 'all' ? ALL_CONTENT : ALL_CONTENT.filter(m => m.genre === genre);
      renderGrid('latestGrid', filtered, 24);
      updateSectionTitle(genre === 'all' ? '🎬 All Movies' : `🎬 ${genre.charAt(0).toUpperCase() + genre.slice(1)} — ${filtered.length} titles`);
      scrollToLatest();
    });
  });

  $$('.genre-btn[data-letter]').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.genre-btn[data-letter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const letter   = btn.dataset.letter;
      const filtered = letter === 'all'
        ? ALL_CONTENT
        : ALL_CONTENT.filter(m => m.title.toUpperCase().startsWith(letter));
      renderGrid('latestGrid', filtered, 24);
      updateSectionTitle(letter === 'all' ? '🔤 All Titles' : `🔤 Titles: "${letter}" — ${filtered.length} found`);
      scrollToLatest();
    });
  });

  function updateSectionTitle(title) {
    const el = document.querySelector('#latestSection .section-title');
    if (el) el.textContent = title;
  }
  function scrollToLatest() {
    const el = document.getElementById('latestSection');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ====================================================
     SEARCH
  ==================================================== */
  const searchInput    = $('searchInput');
  const searchDropdown = $('searchDropdown');

  searchInput.addEventListener('input', () => {
    const q = searchInput.value.trim().toLowerCase();
    if (q.length < 2) { searchDropdown.classList.remove('open'); return; }
    const results = ALL_CONTENT.filter(m =>
      m.title.toLowerCase().includes(q) || m.genre.toLowerCase().includes(q)
    ).slice(0, 8);
    searchDropdown.innerHTML = results.length
      ? results.map(m => `
          <div class="search-result-item" data-id="${m.id}">
            <img src="${m.poster}" alt="${m.title}" onerror="this.src=''">
            <div class="search-result-info">
              <strong>${m.title}</strong>
              <span>⭐ ${m.rating} · ${m.year} · ${m.genre}</span>
            </div>
          </div>`).join('')
      : '<div style="padding:16px;text-align:center;color:#7a7a90;font-size:13px">No results found</div>';
    searchDropdown.classList.add('open');
    searchDropdown.querySelectorAll('.search-result-item').forEach(el => {
      el.addEventListener('click', () => {
        const item = ALL_CONTENT.find(m => m.id === parseInt(el.dataset.id));
        if (item) { openModal(item); searchDropdown.classList.remove('open'); searchInput.value = ''; }
      });
    });
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('.search-wrap')) searchDropdown.classList.remove('open');
  });

  $('searchBtn').addEventListener('click', () => {
    const q = searchInput.value.trim().toLowerCase();
    if (!q) return;
    const filtered = ALL_CONTENT.filter(m =>
      m.title.toLowerCase().includes(q) || m.genre.toLowerCase().includes(q)
    );
    renderGrid('latestGrid', filtered.length ? filtered : ALL_CONTENT, 24);
    searchDropdown.classList.remove('open');
    scrollToLatest();
  });

  searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') $('searchBtn').click(); });

  /* ====================================================
     MODAL
  ==================================================== */
  function openModal(item) {
    $('modalBackdrop').src      = item.backdrop || item.poster;
    $('modalTitle').textContent = item.title;
    $('modalDesc').textContent  = item.desc;
    $('modalBadges').innerHTML  = `
      <span class="badge badge-hd">HD</span>
      <span class="badge badge-free">FREE</span>
      ${item.type === 'series' ? '<span class="badge" style="background:rgba(255,255,255,.15)">SERIES</span>' : ''}`;
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

    const watchlist = JSON.parse(localStorage.getItem('cs_watchlist') || '[]');
    const wBtn      = $('modalWatchlistBtn');
    const inList    = watchlist.includes(item.id);
    wBtn.textContent = inList ? '✓ In Watchlist' : '+ Watchlist';
    wBtn.className   = 'btn-watchlist' + (inList ? ' added' : '');

    $('modalWatchBtn').onclick   = () => { closeModal(); openPlayer(item); };
    $('modalTrailerBtn').onclick = () => showToast('🎬 Trailer — connect YouTube API');
    wBtn.onclick = () => {
      const list = JSON.parse(localStorage.getItem('cs_watchlist') || '[]');
      const idx  = list.indexOf(item.id);
      if (idx === -1) {
        list.push(item.id);
        wBtn.textContent = '✓ In Watchlist';
        wBtn.classList.add('added');
        showToast('✅ Added to Watchlist');
      } else {
        list.splice(idx, 1);
        wBtn.textContent = '+ Watchlist';
        wBtn.classList.remove('added');
        showToast('Removed from Watchlist');
      }
      localStorage.setItem('cs_watchlist', JSON.stringify(list));
    };

    $('modalOverlay').classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    $('modalOverlay').classList.remove('open');
    document.body.style.overflow = '';
  }

  $('modalClose').addEventListener('click', closeModal);
  $('modalOverlay').addEventListener('click', e => {
    if (e.target === $('modalOverlay')) closeModal();
  });

  /* ====================================================
     PLAYER — loadServer
  ==================================================== */
  function loadServer(index, screen) {
    const url = currentServers[index] || currentServers[0];
    console.log('[Player] Loading URL:', url);
    if (!url || url.includes('undefined')) {
      screen.innerHTML = `
        <div class="player-placeholder">
          <div class="player-logo">▶</div>
          <p style="color:#fff;font-size:16px;margin-bottom:8px">Not available on this server</p>
          <p style="color:#7a7a90;font-size:13px">Try another server below</p>
        </div>`;
      return;
    }
    screen.innerHTML = `
      <iframe
        src="${url}"
        allowfullscreen
        allow="autoplay; fullscreen; picture-in-picture"
        style="width:100%;height:100%;border:none"
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-presentation">
      </iframe>`;
  }

  /* ====================================================
     PLAYER — openPlayer
  ==================================================== */
  function openPlayer(item) {
    console.log('[Player] Opening:', item ? item.title : 'none', '| ID:', item ? item.id : 'none');

    if (!item || !item.id) {
      showToast('Error: Movie data missing.');
      return;
    }

    const id = item.id;

    // Title
    const playerTitle = $('playerTitle');
    if (playerTitle) playerTitle.textContent = `${item.title} (${item.year})`;

    // Breadcrumb
    const breadcrumbHome = $('breadcrumbHome');
    if (breadcrumbHome) {
      breadcrumbHome.textContent = item.type === 'series' ? 'TV Series' : 'Movies';
      breadcrumbHome.onclick = (e) => {
        e.preventDefault();
        closePlayer();
        if (item.type === 'series') {
          window.location.href = 'series.html';
        } else {
          const s = document.getElementById('latestSection');
          if (s) s.scrollIntoView({ behavior: 'smooth' });
        }
      };
    }

    // Build server list — 6 servers for maximum coverage
    if (item.type === 'series') {
      currentServers = [
        `https://vidsrc.cc/v2/embed/tv/${id}/1/1`,
        `https://embed.su/embed/tv/${id}/1/1`,
        `https://autoembed.co/tv/tmdb/${id}-1-1`,
        `https://player.videasy.net/tv/${id}/1/1`,
        `https://vidsrc.me/embed/tv?tmdb=${id}&season=1&episode=1`,
        `https://multiembed.mov/?video_id=${id}&tmdb=1&s=1&e=1`,
      ];
    } else {
      currentServers = [
        `https://vidsrc.cc/v2/embed/movie/${id}`,
        `https://embed.su/embed/movie/${id}`,
        `https://autoembed.co/movie/tmdb/${id}`,
        `https://player.videasy.net/movie/${id}`,
        `https://vidsrc.me/embed/movie?tmdb=${id}`,
        `https://multiembed.mov/?video_id=${id}&tmdb=1`,
      ];
    }

    console.log('[Player] Servers:', currentServers);

    // Load first available server
    const screen = $('playerScreen');
    if (screen) loadServer(0, screen);

    // Update server button labels
    const serverLabels = ['vidsrc.cc', 'embed.su', 'autoembed', 'videasy', 'vidsrc.me', 'multiembed'];
    $$('.source-btn').forEach((btn, i) => {
      btn.classList.remove('active');
      if (i === 0) btn.classList.add('active');
      if (serverLabels[i]) btn.textContent = serverLabels[i];
      btn.dataset.server = String(i);
      btn.onclick = () => {
        $$('.source-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const s = $('playerScreen');
        if (s) loadServer(i, s);
      };
    });

    // Fullscreen button
    const fsBtn = $('playerFullscreen');
    if (fsBtn) {
      fsBtn.textContent = '⛶ Fullscreen';
      fsBtn.onclick = () => {
        const el = $('playerOverlay');
        if (!document.fullscreenElement) {
          el.requestFullscreen().catch(() => showToast('Fullscreen not supported'));
          fsBtn.textContent = '⊠ Exit Fullscreen';
        } else {
          document.exitFullscreen();
          fsBtn.textContent = '⛶ Fullscreen';
        }
      };
    }

    document.addEventListener('fullscreenchange', () => {
      const f = $('playerFullscreen');
      if (f && !document.fullscreenElement) f.textContent = '⛶ Fullscreen';
    }, { once: true });

    // PiP button
    const pipBtn = $('playerPip');
    if (pipBtn) pipBtn.onclick = () => showToast('📺 Use browser PiP button in address bar');

    // Auto-hide UI
    const overlay = $('playerOverlay');
    if (overlay) {
      const resetUiTimer = () => {
        overlay.classList.remove('hide-ui');
        clearTimeout(uiHideTimer);
        uiHideTimer = setTimeout(() => overlay.classList.add('hide-ui'), 4000);
      };
      overlay.onmousemove  = resetUiTimer;
      overlay.ontouchstart = resetUiTimer;
      overlay.classList.add('open');
      document.body.style.overflow = 'hidden';
      resetUiTimer();
    }
  }

  /* ====================================================
     PLAYER — closePlayer
  ==================================================== */
  function closePlayer() {
    const overlay = $('playerOverlay');
    if (overlay) overlay.classList.remove('open', 'hide-ui');
    const screen = $('playerScreen');
    if (screen) screen.innerHTML = '';
    clearTimeout(uiHideTimer);
    if (document.fullscreenElement) document.exitFullscreen();
    document.body.style.overflow = '';
  }

  $('playerClose').addEventListener('click', closePlayer);
  $('playerOverlay').addEventListener('click', e => {
    if (e.target === $('playerOverlay')) closePlayer();
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
    if (e.key === '/' && !e.target.matches('input')) {
      e.preventDefault();
      searchInput.focus();
    }
  });

  /* ====================================================
     NAV PAGE LINKS
  ==================================================== */
  document.addEventListener('click', e => {
    const link = e.target.closest('[data-page]');
    if (!link) return;
    e.preventDefault();
    const page = link.dataset.page;
    let items = ALL_CONTENT, title = '🎬 All Content';
    if (page === 'movies')   { items = MOVIES;  title = '🎬 All Movies'; }
    if (page === 'series')   { items = SERIES;  title = '📺 All TV Series'; }
    if (page === 'trending') {
      items = ALL_CONTENT.filter(m => m.tags && m.tags.includes('Trending'));
      title = '🔥 Trending';
    }
    if (page === 'top250') {
      items = [...ALL_CONTENT].sort((a, b) => b.rating - a.rating);
      title = '⭐ Top Rated';
    }
    renderGrid('latestGrid', items, 24);
    updateSectionTitle(title);
    const ts = document.getElementById('trendingSection');
    if (ts) ts.style.display = 'none';
    $$('.nav-link').forEach(l => l.classList.remove('active'));
    link.classList.add('active');
    const mm = $('mobileMenu');
    if (mm) mm.classList.remove('open');
    scrollToLatest();
  });

  /* ====================================================
     BOOT
  ==================================================== */
  function boot() {
    renderAll();
    buildYearButtons();
    if (HERO_ITEMS.length) { updateHero(0); startHeroTimer(); }
  }

  document.addEventListener('dataReady', boot);
  if (typeof ALL_CONTENT !== 'undefined' && ALL_CONTENT.length) boot();

}());
