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

  // Wait for TMDB data before rendering
 document.addEventListener('dataReady', () => {
  renderAll();
  updateHero(0);
  startHeroTimer();
});

   /* ====================================================
   FILTER SYSTEM — Tabs + Genre + Year + A-Z
==================================================== */

// Build year buttons dynamically
function buildYearButtons() {
  const panel = document.getElementById('panel-year');
  if (!panel) return;
  const currentYear = new Date().getFullYear();
  let html = `<button class="year-btn active" data-year="all">All</button>`;
  for (let y = currentYear + 1; y >= 1970; y--) {
    html += `<button class="year-btn" data-year="${y}">${y}</button>`;
  }
  panel.innerHTML = html;

  // Bind year buttons
  panel.querySelectorAll('.year-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      panel.querySelectorAll('.year-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const year = btn.dataset.year;
      const filtered = year === 'all'
        ? ALL_CONTENT
        : ALL_CONTENT.filter(m => m.year === parseInt(year));
      renderGrid('latestGrid', filtered, 20);
      updateSectionTitle(`📅 ${year === 'all' ? 'All Years' : year}`);
      scrollToLatest();
    });
  });
}

// Filter tabs
$$('.filter-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    $$('.filter-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const tabName = tab.dataset.tab;

    // Hide all panels
    document.querySelectorAll('.filter-panel').forEach(p => p.style.display = 'none');

    if (tabName === 'popular') {
      const sorted = [...ALL_CONTENT].sort((a,b) => b.rating - a.rating);
      renderGrid('latestGrid', sorted, 20);
      updateSectionTitle('🔥 Most Popular');
      scrollToLatest();
    }
    else if (tabName === 'recent') {
      const sorted = [...ALL_CONTENT].sort((a,b) => b.year - a.year);
      renderGrid('latestGrid', sorted, 20);
      updateSectionTitle('🆕 Recently Added');
      scrollToLatest();
    }
    else if (tabName === 'genre') {
      document.getElementById('panel-genre').style.display = 'flex';
    }
    else if (tabName === 'year') {
      document.getElementById('panel-year').style.display = 'flex';
    }
    else if (tabName === 'az') {
      document.getElementById('panel-az').style.display = 'flex';
    }
  });
});

// Genre buttons
$$('.genre-btn[data-genre]').forEach(btn => {
  btn.addEventListener('click', () => {
    $$('.genre-btn[data-genre]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const genre = btn.dataset.genre;
    const filtered = genre === 'all'
      ? ALL_CONTENT
      : ALL_CONTENT.filter(m => m.genre === genre);
    renderGrid('latestGrid', filtered, 20);
    updateSectionTitle(genre === 'all' ? '🎬 All Movies' : `🎬 ${genre.charAt(0).toUpperCase() + genre.slice(1)}`);
    scrollToLatest();
  });
});

// A-Z buttons
$$('.genre-btn[data-letter]').forEach(btn => {
  btn.addEventListener('click', () => {
    $$('.genre-btn[data-letter]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const letter = btn.dataset.letter;
    const filtered = letter === 'all'
      ? ALL_CONTENT
      : ALL_CONTENT.filter(m => m.title.toUpperCase().startsWith(letter));
    renderGrid('latestGrid', filtered, 20);
    updateSectionTitle(letter === 'all' ? '🔤 All Titles' : `🔤 Titles starting with "${letter}"`);
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

// Build year buttons after data loads
document.addEventListener('dataReady', buildYearButtons);
// Also build immediately if data is already loaded
if (ALL_CONTENT.length) buildYearButtons();

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
     VIDEO PLAYER
  ==================================================== */
let currentServers = [];
let uiHideTimer;

function openPlayer(item) {
  $('playerTitle').textContent = item.title;
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

  // Server buttons
  $$('.source-btn').forEach(btn => {
    btn.classList.remove('active');
    btn.addEventListener('click', () => {
      $$('.source-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadServer(parseInt(btn.dataset.server), screen);
    });
  });

  // Fullscreen button
  $('playerFullscreen').onclick = () => toggleFullscreen();

  // Picture in Picture
  $('playerPip').onclick = () => {
    const iframe = screen.querySelector('iframe');
    if (iframe) {
      iframe.contentWindow.postMessage('pip', '*');
      showToast('📺 Picture-in-Picture — use browser PiP button in address bar');
    }
  };

  // Auto-hide UI on mouse stop
  const overlay = $('playerOverlay');
  overlay.addEventListener('mousemove', resetUiTimer);
  overlay.addEventListener('touchstart', resetUiTimer);

  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  resetUiTimer();
}

function loadServer(index, screen) {
  const url = currentServers[index] || currentServers[0];
  screen.innerHTML = `
    <iframe
      src="${url}"
      allowfullscreen
      allow="autoplay; fullscreen; picture-in-picture"
      style="width:100%;height:100%;border:none">
    </iframe>`;
}

function resetUiTimer() {
  const overlay = $('playerOverlay');
  overlay.classList.remove('hide-ui');
  clearTimeout(uiHideTimer);
  uiHideTimer = setTimeout(() => {
    overlay.classList.add('hide-ui');
  }, 3500);
}

function toggleFullscreen() {
  const el = $('playerOverlay');
  if (!document.fullscreenElement) {
    el.requestFullscreen().catch(() => {
      showToast('Fullscreen not supported in this browser');
    });
    $('playerFullscreen').textContent = '⊠ Exit Fullscreen';
  } else {
    document.exitFullscreen();
    $('playerFullscreen').textContent = '⛶ Fullscreen';
  }
}

// Fullscreen change event
document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement) {
    $('playerFullscreen').textContent = '⛶ Fullscreen';
  }
});

function closePlayer() {
  $('playerOverlay').classList.remove('open', 'hide-ui');
  $('playerScreen').innerHTML = '';
  clearTimeout(uiHideTimer);
  if (document.fullscreenElement) document.exitFullscreen();
  document.body.style.overflow = '';
}

$('playerClose').addEventListener('click', closePlayer);
$('playerOverlay').addEventListener('click', e => {
  if (e.target === $('playerOverlay')) closePlayer();
});

// Keyboard: F = fullscreen, Escape = close
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeModal(); closePlayer(); }
  if (e.key === 'f' && $('playerOverlay').classList.contains('open')) toggleFullscreen();
  if (e.key === '/' && !e.target.matches('input')) { e.preventDefault(); searchInput.focus(); }
});
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
