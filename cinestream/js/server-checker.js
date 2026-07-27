// CineStream — Smart Server Selector
// Tests servers only when user clicks play (not on page load)
window.SmartPlayer = (function() {

  // Servers ranked by quality tier — tier 1 = best
  const MOVIE_SERVERS = [
    { name:'autoembed',   tier:1, url: id      => `https://player.autoembed.cc/embed/movie/${id}` },
    { name:'embed.su',    tier:1, url: id      => `https://embed.su/embed/movie/${id}` },
    { name:'moviesapi',   tier:1, url: id      => `https://moviesapi.club/movie/${id}` },
    { name:'2embed',      tier:2, url: id      => `https://www.2embed.cc/embed/${id}` },
    { name:'multiembed',  tier:2, url: id      => `https://multiembed.mov/?video_id=${id}&tmdb=1` },
    { name:'vidsrc.me',   tier:3, url: id      => `https://vidsrc.me/embed/movie?tmdb=${id}` },
    { name:'smashystream',tier:3, url: id      => `https://embed.smashystream.com/playere.php?tmdb=${id}` },
    { name:'flixembed',   tier:3, url: id      => `https://www.2embed.skin/embed/${id}` },
  ];

  const TV_SERVERS = [
    { name:'autoembed',   tier:1, url:(id,s,e)=> `https://player.autoembed.cc/embed/tv/${id}/${s}/${e}` },
    { name:'embed.su',    tier:1, url:(id,s,e)=> `https://embed.su/embed/tv/${id}/${s}/${e}` },
    { name:'moviesapi',   tier:1, url:(id,s,e)=> `https://moviesapi.club/tv/${id}-${s}-${e}` },
    { name:'2embed',      tier:2, url:(id,s,e)=> `https://www.2embed.cc/embedtv/${id}&s=${s}&e=${e}` },
    { name:'multiembed',  tier:2, url:(id,s,e)=> `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${s}&e=${e}` },
    { name:'vidsrc.me',   tier:3, url:(id,s,e)=> `https://vidsrc.me/embed/tv?tmdb=${id}&season=${s}&episode=${e}` },
    { name:'smashystream',tier:3, url:(id,s,e)=> `https://embed.smashystream.com/playere.php?tmdb=${id}&season=${s}&episode=${e}` },
  ];

  const CACHE_KEY = 'cs_smart_cache';
  const CACHE_TTL = 1000 * 60 * 60 * 4; // 4 hours

  function getCache() {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); }
    catch(e) { return {}; }
  }

  function getCached(key) {
    const c = getCache()[key];
    if (!c || Date.now() - c.ts > CACHE_TTL) return null;
    return c;
  }

  function setCache(key, data) {
    try {
      const c = getCache();
      c[key] = { ...data, ts: Date.now() };
      localStorage.setItem(CACHE_KEY, JSON.stringify(c));
    } catch(e) {}
  }

  // Test a single URL with hidden iframe — resolves true/false
  function pingUrl(url, timeoutMs) {
    return new Promise(resolve => {
      const iframe = document.createElement('iframe');
      iframe.style.cssText = [
        'position:fixed', 'width:1px', 'height:1px',
        'opacity:0', 'pointer-events:none',
        'left:-9999px', 'top:-9999px'
      ].join(';');
      iframe.src = url;

      const timer = setTimeout(() => {
        iframe.remove();
        resolve(false);
      }, timeoutMs);

      iframe.onload  = () => { clearTimeout(timer); iframe.remove(); resolve(true); };
      iframe.onerror = () => { clearTimeout(timer); iframe.remove(); resolve(false); };
      document.body.appendChild(iframe);
    });
  }

  /**
   * Find best server for an item.
   * Tests tier-1 in parallel first, then tier-2, then tier-3.
   * onStatus(msg) = optional callback for loading messages.
   */
  async function findBest(item, season, episode, onStatus) {
    const s   = season  || 1;
    const e   = episode || 1;
    const key = `${item.type}_${item.id}_${s}_${e}`;

    // Return cached result
    const cached = getCached(key);
    if (cached) {
      onStatus && onStatus(`✅ ${cached.name}`);
      return cached;
    }

    const servers = item.type === 'series' ? TV_SERVERS : MOVIE_SERVERS;
    const tiers   = [1, 2, 3];

    for (const tier of tiers) {
      const group = servers.filter(sv => sv.tier === tier);
      onStatus && onStatus(`Checking quality tier ${tier}/${tiers.length}...`);

      // Test all in this tier simultaneously
      const results = await Promise.all(
        group.map(async sv => {
          const url = item.type === 'series'
            ? sv.url(item.id, s, e)
            : sv.url(item.id);
          const ok = await pingUrl(url, tier === 1 ? 7000 : 5000);
          return { ...sv, url, ok };
        })
      );

      const winner = results.find(r => r.ok);
      if (winner) {
        const result = { url: winner.url, name: winner.name, tier: winner.tier };
        setCache(key, result);
        onStatus && onStatus(`✅ ${winner.name}`);
        return result;
      }
    }

    // All failed — use first server as fallback (better than nothing)
    const fb  = servers[0];
    const url = item.type === 'series' ? fb.url(item.id, s, e) : fb.url(item.id);
    onStatus && onStatus(`⚠️ Using ${fb.name}`);
    return { url, name: fb.name, tier: 3 };
  }

  function invalidate(item, season, episode) {
    try {
      const key = `${item.type}_${item.id}_${season||1}_${episode||1}`;
      const c   = getCache();
      delete c[key];
      localStorage.setItem(CACHE_KEY, JSON.stringify(c));
    } catch(e) {}
  }

  function getNextServer(item, currentUrl, season, episode) {
    const s       = season  || 1;
    const ev      = episode || 1;
    const servers = item.type === 'series' ? TV_SERVERS : MOVIE_SERVERS;
    const urls    = servers.map(sv =>
      item.type === 'series' ? sv.url(item.id,s,ev) : sv.url(item.id)
    );
    const idx  = urls.indexOf(currentUrl);
    const next = (idx + 1) % servers.length;
    return { url: urls[next], name: servers[next].name };
  }

  return { findBest, invalidate, getNextServer, MOVIE_SERVERS, TV_SERVERS };
})();
// NOTE: No preWarm on page load — servers only tested when user clicks play
