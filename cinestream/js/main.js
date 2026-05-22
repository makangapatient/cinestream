// CineStream — Main Application

(function() {
  'use strict';

  /* ---- State ---- */
  const state = {
    currentHero: 0,
    heroTimer: null,
    watchlist: JSON.parse(localStorage.getItem('cs_watchlist') || '[]'),
    currentGenre: 'all',
    currentModal: null,
  };

  /* ---- DOM ---- */
  const $ = id => document.getElementById(id);
  const $$ = sel => document.querySelectorAll(sel);

  /* ====================================================
     HERO SLIDER
  ==================================================== */
  function updateHero(idx) {
    const item = HERO_ITEMS[idx];
    if (!item) return;

    $('heroBg').style.backgroundImage = `url('${item.backdrop}')`;
    $('heroTitle').textContent = item.title;
    $('heroDesc').textContent = item.desc;
    $('heroRating').textContent = `⭐ ${item.rating}`;
    $('heroYear').textContent = item.year;
    $('heroDuration').textContent = item.duration;
    $('heroGenre').textContent = item.genre.charAt(0).toUpperCase() + item.genre.slice(1);

    $$('.hero-dot').forEach((d, i) => d.classList.toggle('active', i === idx));

    $('heroWatchBtn').onclick = () => openPlayer(item);
    $('heroInfoBtn').onclick = () => openModal(item);
  }

  function startHeroTimer() {
    clearInterval(state.heroTimer);
    state.heroTimer = setInterval(() => {
      state.currentHero = (state.currentHero + 1) % HERO_ITEMS.length;
      updateHero(state.currentHero);
    }, 6000);
  }

  $$('.hero-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      state.currentHero = parseInt(dot.dataset.idx);
      updateHero(state.currentHero);
      startHeroTimer();
    });
  });

  updateHero(0);
  startHeroTimer();

  /* ====================================================
     NAVBAR SCROLL
  ==================================================== */
  window.addEventListener('scroll', () => {
    document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 60);
  }, { passive: true });

  /* ====================================================
     MOBILE MENU
  ==================================================== */
  $('menuBtn').addEventListener('click', () => {
    $('mobileMenu').classList.toggle('open');
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('#menuBtn') && !e.target.closest('#mobileMenu')) {
      $('mobileMenu').classList.remove('open');
    }
  });

  /* ====================================================
     MOVIE CARD BUILDER
  ==================================================== */
  function buildCard(item) {
    const card = document.createElement('div');
    card.className = 'movie-card';
    card.dataset.id = item.id;

    const mainBadge = item.tags?.includes('New') ? 'NEW' : (item.tags?.includes('Trending') ? 'HOT' : '');
    const badgeClass = item.tags?.includes('New') ? 'new-badge' : '';

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
      ${mainBadge ? `<div class="card-badge hd ${badgeClass}">${mainBadge}</div>` : '<div class="card-badge hd">HD</div>'}
    `;

    card.addEventListener('click', () => openModal(item));
    return card;
  }

  function renderGrid(gridId, items, limit = 10) {
    const grid = $(gridId);
    if (!grid) return;
    grid.innerHTML = '';
    items.slice(0, limit).forEach(item => grid.appendChild(buildCard(item)));
  }

  /* ====================================================
     RENDER SECTIONS
  ==================================================== */
  function renderAll() {
    const trending = ALL_CONTENT.filter(m => m.tags?.includes('Trending'));
    const latest   = MOVIES.filter(m => m.year >= 2024).slice(0, 10);
    const topRated = [...ALL_CONTENT].sort((a, b) => b.rating - a.rating).slice(0, 10);
    const series   = SERIES.slice(0, 8);

    renderGrid('trendingGrid', trending, 8);
    renderGrid('latestGrid', latest, 10);
    renderGrid('topRatedGrid', topRated, 10);
    renderGrid('seriesGrid', series, 8);
  }

  renderAll();

  /* ====================================================
     GENRE FILTER
  ==================================================== */
  $$('.genre-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.genre-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.currentGenre = btn.dataset.genre;
      filterByGenre(state.currentGenre);
    });
  });

  function filterByGenre(genre) {
    const filtered = genre === 'all' ? ALL_CONTENT : ALL_CONTENT.filter(m => m.genre === genre);
    renderGrid('latestGrid', filtered, 12);
    $('latestSection').querySelector('.section-title').textContent =
      genre === 'all' ? '🎬 Latest Movies' : `🎬 ${genre.charAt(0).toUpperCase() + genre.slice(1)}`;
    $('latestSection').querySelector('.section-header').style.display = 'flex';
    document.getElementById('latestSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ====================================================
     SEARCH
  ==================================================== */
  const searchInput  = $('searchInput');
  const searchDropdown = $('searchDropdown');

  searchInput.addEventListener('input', () => {
    const q = searchInput.value.trim().toLowerCase();
    if (q.length < 2) { searchDropdown.classList.remove('open'); return; }

    const results = ALL_CONTENT.filter(m =>
      m.title.toLowerCase().includes(q) ||
      m.genre.toLowerCase().includes(q) ||
      (m.cast && m.cast.toLowerCase().includes(q))
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
    const filtered = ALL_CONTENT.filter(m => m.title.toLowerCase().includes(q) || m.genre.toLowerCase().includes(q));
    renderGrid('latestGrid', filtered.length ? filtered : ALL_CONTENT, 12);
    searchDropdown.classList.remove('open');
    document.getElementById('latestSection').scrollIntoView({ behavior: 'smooth' });
  });

  searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') $('searchBtn').click(); });

  /* ====================================================
     MODAL
  ==================================================== */
  function openModal(item) {
    state.currentModal = item;
    const overlay = $('modalOverlay');

    $('modalBackdrop').src = item.backdrop || item.poster;
    $('modalTitle').textContent = item.title;
    $('modalDesc').textContent = item.desc;

    $('modalBadges').innerHTML = `
      <span class="badge badge-hd">HD</span>
      <span class="badge badge-free">FREE</span>
      ${item.type === 'series' ? '<span class="badge" style="background:rgba(255,255,255,.15)">SERIES</span>' : ''}
    `;

    const inWatchlist = state.watchlist.includes(item.id);
    const wBtn = $('modalWatchlistBtn');
    wBtn.textContent = inWatchlist ? '✓ In Watchlist' : '+ Watchlist';
    wBtn.className = 'btn-watchlist' + (inWatchlist ? ' added' : '');

    $('modalMeta').innerHTML = `
      <span style="color:#f5c518;font-weight:600">⭐ ${item.rating}</span>
      <span>${item.year}</span>
      <span>${item.duration}</span>
      <span style="text-transform:capitalize">${item.genre}</span>
      ${item.seasons ? `<span>${item.seasons} Season${item.seasons > 1 ? 's' : ''}</span>` : ''}
    `;

    $('modalDetails').innerHTML = `
      ${item.director ? `<div class="detail-row"><span class="detail-label">Director</span><span class="detail-val">${item.director}</span></div>` : ''}
      ${item.cast ? `<div class="detail-row"><span class="detail-label">Cast</span><span class="detail-val">${item.cast}</span></div>` : ''}
      <div class="detail-row"><span class="detail-label">Genre</span><span class="detail-val" style="text-transform:capitalize">${item.genre}</span></div>
      <div class="detail-row"><span class="detail-label">Year</span><span class="detail-val">${item.year}</span></div>
      <div class="detail-row"><span class="detail-label">Rating</span><span class="detail-val">⭐ ${item.rating} / 10</span></div>
      <div class="detail-row"><span class="detail-label">Quality</span><span class="detail-val" style="color:var(--accent)">HD 1080p</span></div>
    `;

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
        const rel = ALL_CONTENT.find(m => m.id === parseInt(el.dataset.id));
        if (rel) openModal(rel);
      });
    });

    $('modalWatchBtn').onclick = () => { closeModal(); openPlayer(item); };
    $('modalTrailerBtn').onclick = () => {
      showToast('🎬 Trailer feature — connect YouTube API');
    };
    wBtn.onclick = () => toggleWatchlist(item.id, wBtn);

    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    $('modalOverlay').classList.remove('open');
    document.body.style.overflow = '';
  }

  $('modalClose').addEventListener('click', closeModal);
  $('modalOverlay').addEventListener('click', e => { if (e.target === $('modalOverlay')) closeModal(); });

  /* ====================================================
     PLAYER
  ==================================================== */
  function openPlayer(item) {
    $('playerTitle').textContent = item.title;

    // Replace with real embed URL — examples:
    // VidSrc: `https://vidsrc.to/embed/movie/${imdbId}`
    // 2embed: `https://www.2embed.cc/embed/${imdbId}`
    // SuperEmbed: `https://multiembed.mov/?video_id=${imdbId}&tmdb=1`
    const embedUrl = ''; // Set your embed URL here

    const screen = $('playerScreen');
    if (embedUrl) {
      screen.innerHTML = `<iframe src="${embedUrl}" allowfullscreen allow="autoplay; fullscreen"></iframe>`;
    } else {
      screen.innerHTML = `
        <div class="player-placeholder">
          <div class="player-logo">▶</div>
          <p style="font-size:18px;color:#fff;margin-bottom:8px">${item.title}</p>
          <p style="color:#7a7a90">Connect a video source to enable playback</p>
          <p class="player-sub">Edit js/main.js → openPlayer() → set embedUrl</p>
        </div>`;
    }

    // Source buttons
    $$('.source-btn').forEach((btn, i) => {
      btn.addEventListener('click', () => {
        $$('.source-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    $('playerOverlay').classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closePlayer() {
    $('playerOverlay').classList.remove('open');
    $('playerScreen').innerHTML = '';
    document.body.style.overflow = '';
  }

  $('playerClose').addEventListener('click', closePlayer);
  $('playerOverlay').addEventListener('click', e => { if (e.target === $('playerOverlay')) closePlayer(); });

  /* ====================================================
     WATCHLIST
  ==================================================== */
  function toggleWatchlist(id, btn) {
    const idx = state.watchlist.indexOf(id);
    if (idx === -1) {
      state.watchlist.push(id);
      btn.textContent = '✓ In Watchlist';
      btn.classList.add('added');
      showToast('✅ Added to Watchlist');
    } else {
      state.watchlist.splice(idx, 1);
      btn.textContent = '+ Watchlist';
      btn.classList.remove('added');
      showToast('Removed from Watchlist');
    }
    localStorage.setItem('cs_watchlist', JSON.stringify(state.watchlist));
  }

  /* ====================================================
     TOAST
  ==================================================== */
  let toastTimer;
  function showToast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
  }

  /* ====================================================
     NAV PAGE LINKS
  ==================================================== */
  document.addEventListener('click', e => {
    const link = e.target.closest('[data-page]');
    if (!link) return;
    e.preventDefault();
    const page = link.dataset.page;
    let items = ALL_CONTENT;
    let title = '🎬 All Content';

    if (page === 'movies')   { items = MOVIES; title = '🎬 All Movies'; }
    if (page === 'series')   { items = SERIES; title = '📺 All TV Series'; }
    if (page === 'trending') { items = ALL_CONTENT.filter(m => m.tags?.includes('Trending')); title = '🔥 Trending'; }
    if (page === 'top250')   { items = [...ALL_CONTENT].sort((a,b) => b.rating - a.rating); title = '⭐ Top Rated'; }

    renderGrid('latestGrid', items, 24);
    document.getElementById('latestSection').querySelector('.section-title').textContent = title;
    document.getElementById('trendingSection').style.display = 'none';

    $$('.nav-link').forEach(l => l.classList.remove('active'));
    link.classList.add('active');

    $('mobileMenu').classList.remove('open');
    document.getElementById('latestSection').scrollIntoView({ behavior: 'smooth' });
  });

  /* ====================================================
     KEYBOARD SHORTCUTS
  ==================================================== */
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeModal(); closePlayer(); }
    if (e.key === '/' && !e.target.matches('input')) { e.preventDefault(); searchInput.focus(); }
  });

  /* ====================================================
     FOOTER LINKS (genre)
  ==================================================== */
  document.querySelectorAll('.footer-links a').forEach(a => {
    a.addEventListener('click', e => {
      const genre = a.textContent.toLowerCase().replace(/\s+/g, '-');
      const genreBtn = document.querySelector(`.genre-btn[data-genre="${genre}"]`);
      if (genreBtn) { e.preventDefault(); genreBtn.click(); }
    });
  });

})();
