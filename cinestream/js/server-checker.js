// CineStream — Smart Server Selector
// Silently tests servers, picks best by quality + speed
window.SmartPlayer = (function() {

  // Quality tiers — higher = better
  // Each server is tested; first responding server in highest tier wins
  const MOVIE_SERVERS = [
    { name:'moviesapi',  tier:1, url: id      => `https://moviesapi.club/movie/${id}` },
    { name:'vidsrc.cc',  tier:1, url: id      => `https://vidsrc.cc/v2/embed/movie/${id}` },
    { name:'autoembed',  tier:1, url: id      => `https://player.autoembed.cc/embed/movie/${id}` },
    { name:'embed.su',   tier:2, url: id      => `https://embed.su/embed/movie/${id}` },
    { name:'2embed',     tier:2, url: id      => `https://www.2embed.cc/embed/${id}` },
    { name:'multiembed', tier:2, url: id      => `https://multiembed.mov/?video_id=${id}&tmdb=1` },
    { name:'vidsrc.me',  tier:3, url: id      => `https://vidsrc.me/embed/movie?tmdb=${id}` },
    { name:'vidsrc.xyz', tier:3, url: id      => `https://vidsrc.xyz/embed/movie?tmdb=${id}` },
    { name:'smashystream',tier:3,url: id      => `https://embed.smashystream.com/playere.php?tmdb=${id}` },
    { name:'flixembed',  tier:3, url: id      => `https://www.2embed.skin/embed/${id}` },
  ];

  const TV_SERVERS = [
    { name:'moviesapi',   tier:1, url:(id,s,e)=>`https://moviesapi.club/tv/${id}-${s}-${e}` },
    { name:'vidsrc.cc',   tier:1, url:(id,s,e)=>`https://vidsrc.cc/v2/embed/tv/${id}/${s}/${e}` },
    { name:'autoembed',   tier:1, url:(id,s,e)=>`https://player.autoembed.cc/embed/tv/${id}/${s}/${e}` },
    { name:'embed.su',    tier:2, url:(id,s,e)=>`https://embed.su/embed/tv/${id}/${s}/${e}` },
    { name:'2embed',      tier:2, url:(id,s,e)=>`https://www.2embed.cc/embedtv/${id}&s=${s}&e=${e}` },
    { name:'multiembed',  tier:2, url:(id,s,e)=>`https://multiembed.mov/?video_id=${id}&tmdb=1&s=${s}&e=${e}` },
    { name:'vidsrc.me',   tier:3, url:(id,s,e)=>`https://vidsrc.me/embed/tv?tmdb=${id}&season=${s}&episode=${e}` },
    { name:'vidsrc.xyz',  tier:3, url:(id,s,e)=>`https://vidsrc.xyz/embed/tv?tmdb=${id}&season=${s}&episode=${e}` },
    { name:'smashystream',tier:3, url:(id,s,e)=>`https://embed.smashystream.com/playere.php?tmdb=${id}&season=${s}&episode=${e}` },
  ];

  const CACHE_KEY = 'cs_smart_server_cache';
  const CACHE_TTL = 1000 * 60 * 60 * 4; // 4 hours

  function getCache() {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); }
    catch(e) { return {}; }
  }

  function setCache(key, value) {
    try {
      const c = getCache();
      c[key] = { ...value, ts: Date.now() };
      localStorage.setItem(CACHE_KEY, JSON.stringify(c));
    } catch(e) {}
  }

  function getCached(key) {
    const c = getCache();
    if (!c[key]) return null;
    if (Date.now() - c[key].ts > CACHE_TTL) return null;
    return c[key];
  }

  // Test a single server with a hidden iframe
  function testServer(url, timeoutMs) {
    return new Promise(resolve => {
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;left:-9999px;top:-9999px';
      iframe.src = url;
      const timer = setTimeout(() => { iframe.remove(); resolve(false); }, timeoutMs);
      iframe.onload  = () => { clearTimeout(timer); iframe.remove(); resolve(true); };
      iframe.onerror = () => { clearTimeout(timer); iframe.remove(); resolve(false); };
      document.body.appendChild(iframe);
    });
  }

  /**
   * Find best server for an item.
   * Tests tier-1 servers first (best quality), then tier-2, then tier-3.
   * Returns { url, name, tier } of first responding server.
   * onProgress(msg) callback for loading status updates.
   */
  async function findBest(item, season, episode, onProgress) {
    const s   = season  || 1;
    const e   = episode || 1;
    const key = `${item.type}_${item.id}_${s}_${e}`;

    // Return cached result instantly
    const cached = getCached(key);
    if (cached) {
      onProgress && onProgress(`✅ ${cached.name} (cached)`);
      return cached;
    }

    const servers = item.type === 'series' ? TV_SERVERS : MOVIE_SERVERS;
    const tiers   = [1, 2, 3];

    for (const tier of tiers) {
      const tierServers = servers.filter(sv => sv.tier === tier);
      onProgress && onProgress(`Testing quality tier ${tier}/${tiers.length}...`);

      // Test all servers in this tier simultaneously
      const results = await Promise.all(
        tierServers.map(async sv => {
          const url = item.type === 'series' ? sv.url(item.id, s, e) : sv.url(item.id);
          const ok  = await testServer(url, tier === 1 ? 6000 : 4000);
          return { ...sv, url, ok };
        })
      );

      // Find first working server in this tier
      const working = results.find(r => r.ok);
      if (working) {
        const result = { url: working.url, name: working.name, tier: working.tier };
        setCache(key, result);
        onProgress && onProgress(`✅ ${working.name}`);
        return result;
      }
    }

    // All failed — return first server as last resort
    const fallback = servers[0];
    const fallbackUrl = item.type === 'series' ? fallback.url(item.id, s, e) : fallback.url(item.id);
    onProgress && onProgress('⚠️ Using fallback server');
    return { url: fallbackUrl, name: fallback.name, tier: 3 };
  }

  // Pre-warm: test tier-1 servers in background on page load
  async function preWarm() {
    const testMovieId = 27205; // Inception
    const testTvId    = 1396;  // Breaking Bad
    const servers = [
      ...MOVIE_SERVERS.filter(s=>s.tier===1).map(s=>({...s,url:s.url(testMovieId)})),
      ...TV_SERVERS.filter(s=>s.tier===1).map(s=>({...s,url:s.url(testTvId,1,1)})),
    ];
    const alive = { movie:[], tv:[] };
    await Promise.all(servers.map(async sv => {
      const ok = await testServer(sv.url, 5000);
      if (ok) alive.movie.push(sv.name);
    }));
    try {
      localStorage.setItem('cs_alive_servers', JSON.stringify({ ...alive, ts: Date.now() }));
    } catch(e) {}
  }

  // Invalidate cache for an item (retry)
  function invalidate(item, season, episode) {
    const key = `${item.type}_${item.id}_${season||1}_${episode||1}`;
    const c   = getCache();
    delete c[key];
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch(e) {}
  }

  return { findBest, preWarm, invalidate, MOVIE_SERVERS, TV_SERVERS };
})();

// Pre-warm in background after 4 seconds (non-blocking)
setTimeout(() => window.SmartPlayer.preWarm().catch(()=>{}), 4000);
