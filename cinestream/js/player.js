// CineStream — Player Module
// Auto-selects best server, no UI buttons needed
window.CSPlayer = (function() {

  const $ = id => document.getElementById(id);

  let currentItem    = null;
  let currentSeason  = 1;
  let currentEpisode = 1;
  let currentUrl     = '';
  let uiHideTimer    = null;

  /* ---- Open Player ---- */
  async function open(item, season, episode) {
    currentItem    = item;
    currentSeason  = season  || 1;
    currentEpisode = episode || 1;

    // Set title + breadcrumb
    const pt = $('playerTitle');
    if (pt) pt.textContent = item.title +
      (item.type==='series' ? ` — S${currentSeason}E${currentEpisode}` : '');

    const bc = $('breadcrumbHome');
    if (bc) bc.onclick = e => { e.preventDefault(); close(); window.scrollTo({top:0,behavior:'smooth'}); };

    // Show overlay
    const ov = $('playerOverlay');
    if (ov) { ov.classList.add('open'); document.body.style.overflow = 'hidden'; }
    resetUiTimer();

    // Show loading screen
    showLoading(item.title, 'Analysing available servers...');

    // Find best server
    let result;
    try {
      result = await window.SmartPlayer.findBest(
        item, currentSeason, currentEpisode,
        msg => updateLoadingStatus(msg)
      );
    } catch(e) {
      showError(item);
      return;
    }

    if (result && result.url) {
      currentUrl = result.url;
      embedVideo(result.url, result.name, result.tier);
    } else {
      showError(item);
    }
  }

  /* ---- Embed Video ---- */
  function embedVideo(url, name, tier) {
    const screen = $('playerScreen');
    if (!screen) return;

    const qualityLabel = tier === 1 ? '🟢 HD 1080p' : tier === 2 ? '🟡 HD 720p' : '🟠 SD';

    screen.innerHTML = `
      <iframe
        src="${url}"
        allowfullscreen
        allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
        referrerpolicy="no-referrer"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation allow-pointer-lock"
        style="width:100%;height:100%;border:none;display:block">
      </iframe>`;

    // Update quality badge
    const qb = $('qualityBadge');
    if (qb) {
      qb.textContent  = qualityLabel;
      qb.style.display = 'inline-flex';
    }
  }

  /* ---- Loading Screen ---- */
  function showLoading(title, msg) {
    const screen = $('playerScreen');
    if (!screen) return;
    screen.innerHTML = `
      <div style="
        display:flex;flex-direction:column;align-items:center;
        justify-content:center;height:100%;width:100%;
        color:#fff;text-align:center;padding:20px;background:#000">
        <div style="
          width:56px;height:56px;
          border:3px solid rgba(255,255,255,.1);
          border-top-color:#e50914;
          border-radius:50%;
          animation:spin .8s linear infinite;
          margin-bottom:24px">
        </div>
        <div style="
          font-family:'Bebas Neue',sans-serif;
          font-size:24px;letter-spacing:2px;
          margin-bottom:10px">
          ${title}
        </div>
        <div id="loadingStatus" style="
          font-size:13px;color:#7a7a90;
          transition:opacity .3s">
          ${msg}
        </div>
        <div style="
          width:200px;height:2px;
          background:rgba(255,255,255,.1);
          border-radius:2px;margin-top:20px;
          overflow:hidden">
          <div id="loadingBar" style="
            height:100%;width:0%;
            background:linear-gradient(90deg,#e50914,#ff6b6b);
            border-radius:2px;
            animation:loadingPulse 1.5s ease-in-out infinite">
          </div>
        </div>
        <p style="font-size:11px;color:rgba(255,255,255,.2);margin-top:16px">
          Selecting highest quality available
        </p>
      </div>`;
  }

  function updateLoadingStatus(msg) {
    const el = $('loadingStatus');
    if (el) {
      el.style.opacity = '0';
      setTimeout(() => { el.textContent = msg; el.style.opacity = '1'; }, 150);
    }
    // Animate bar
    const bar = $('loadingBar');
    if (bar) {
      const cur = parseInt(bar.style.width) || 0;
      bar.style.width = Math.min(cur + 20, 90) + '%';
    }
  }

  /* ---- Error Screen ---- */
  function showError(item) {
    const screen = $('playerScreen');
    if (!screen) return;
    screen.innerHTML = `
      <div style="
        display:flex;flex-direction:column;align-items:center;
        justify-content:center;height:100%;width:100%;
        color:#fff;text-align:center;padding:20px;background:#000">
        <div style="font-size:56px;margin-bottom:16px">😔</div>
        <div style="
          font-family:'Bebas Neue',sans-serif;
          font-size:22px;letter-spacing:2px;margin-bottom:12px">
          No Server Available
        </div>
        <p style="color:#7a7a90;font-size:14px;margin-bottom:24px;max-width:340px">
          All servers are currently unavailable for<br>
          <strong style="color:#fff">${item.title}</strong>.<br>
          Please try again later.
        </p>
        <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center">
          <button id="retryBtn"
            style="padding:11px 28px;background:#e50914;color:#fff;
            border:none;border-radius:8px;font-size:14px;
            font-weight:600;cursor:pointer">
            🔄 Retry
          </button>
          <button id="closePlayerBtn"
            style="padding:11px 28px;background:rgba(255,255,255,.1);color:#fff;
            border:1px solid rgba(255,255,255,.2);border-radius:8px;
            font-size:14px;font-weight:600;cursor:pointer">
            ✕ Close
          </button>
        </div>
      </div>`;

    const rb = $('retryBtn');
    if (rb) rb.onclick = () => {
      window.SmartPlayer.invalidate(item, currentSeason, currentEpisode);
      open(item, currentSeason, currentEpisode);
    };

    const cb = $('closePlayerBtn');
    if (cb) cb.onclick = () => close();
  }

  /* ---- Close ---- */
  function close() {
    const ov = $('playerOverlay');
    const sc = $('playerScreen');
    if (ov) ov.classList.remove('open', 'hide-ui');
    if (sc) sc.innerHTML = '';
    clearTimeout(uiHideTimer);
    if (document.fullscreenElement) document.exitFullscreen();
    document.body.style.overflow = '';
    currentItem = null; currentUrl = '';

    // Hide quality badge
    const qb = $('qualityBadge');
    if (qb) qb.style.display = 'none';
  }

  /* ---- Fullscreen ---- */
  function toggleFullscreen() {
    const el = $('playerOverlay');
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().catch(() => {
        // Fallback: expand player manually
        el.style.position = 'fixed';
      });
    } else {
      document.exitFullscreen();
    }
  }

  document.addEventListener('fullscreenchange', () => {
    const btn = $('playerFullscreen');
    if (btn) btn.innerHTML = document.fullscreenElement ? '⊠ Exit' : '⛶ Fullscreen';
  });

  /* ---- UI Auto-hide ---- */
  function resetUiTimer() {
    const ov = $('playerOverlay');
    if (!ov) return;
    ov.classList.remove('hide-ui');
    clearTimeout(uiHideTimer);
    uiHideTimer = setTimeout(() => ov.classList.add('hide-ui'), 4000);
  }

  /* ---- Bind Controls ---- */
  function bindControls() {
    const pc = $('playerClose');
    if (pc) pc.addEventListener('click', close);

    const pf = $('playerFullscreen');
    if (pf) pf.addEventListener('click', toggleFullscreen);

    const pr = $('playerRetry');
    if (pr) pr.addEventListener('click', () => {
      if (!currentItem) return;
      window.SmartPlayer.invalidate(currentItem, currentSeason, currentEpisode);
      open(currentItem, currentSeason, currentEpisode);
    });

    const po = $('playerOverlay');
    if (po) {
      po.addEventListener('click', e => { if (e.target === po) close(); });
      po.addEventListener('mousemove',  resetUiTimer);
      po.addEventListener('touchstart', resetUiTimer, { passive: true });
    }

    // Keyboard
    document.addEventListener('keydown', e => {
      if (!$('playerOverlay')?.classList.contains('open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'f')      toggleFullscreen();
    });
  }

  bindControls();

  return { open, close, toggleFullscreen };
})();

// Global openPlayer function for backward compatibility
function openPlayer(item, season, episode) {
  window.CSPlayer.open(item, season, episode);
}
