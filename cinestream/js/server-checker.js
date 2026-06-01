// CineStream — Auto Server Checker
// Silently tests all servers and picks the best working one

const ServerChecker = (function() {

  // All available servers — ranked by quality preference
  const MOVIE_SERVERS = [
    { name: 'vidsrc.me',    url: id => `https://vidsrc.me/embed/movie?tmdb=${id}`,                 quality: 'HD' },
    { name: 'vidsrc.cc',    url: id => `https://vidsrc.cc/v2/embed/movie/${id}`,                   quality: 'HD' },
    { name: 'autoembed',    url: id => `https://player.autoembed.cc/embed/movie/${id}`,             quality: 'HD' },
    { name: '2embed',       url: id => `https://www.2embed.cc/embed/${id}`,                        quality: 'HD' },
    { name: 'multiembed',   url: id => `https://multiembed.mov/?video_id=${id}&tmdb=1`,            quality: 'HD' },
    { name: 'embed.su',     url: id => `https://embed.su/embed/movie/${id}`,                       quality: 'HD' },
    { name: 'moviesapi',    url: id => `https://moviesapi.club/movie/${id}`,                       quality: 'FHD'},
    { name: 'smashystream', url: id => `https://embed.smashystream.com/playere.php?tmdb=${id}`,    quality: 'HD' },
  ];

  const TV_SERVERS = [
    { name: 'vidsrc.me',    url: (id,s,e) => `https://vidsrc.me/embed/tv?tmdb=${id}&season=${s}&episode=${e}`,                quality: 'HD' },
    { name: 'vidsrc.cc',    url: (id,s,e) => `https://vidsrc.cc/v2/embed/tv/${id}/${s}/${e}`,                                  quality: 'HD' },
    { name: 'autoembed',    url: (id,s,e) => `https://player.autoembed.cc/embed/tv/${id}/${s}/${e}`,                           quality: 'HD' },
    { name: '2embed',       url: (id,s,e) => `https://www.2embed.cc/embedtv/${id}&s=${s}&e=${e}`,                              quality: 'HD' },
    { name: 'multiembed',   url: (id,s,e) => `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${s}&e=${e}`,                    quality: 'HD' },
    { name: 'embed.su',     url: (id,s,e) => `https://embed.su/embed/tv/${id}/${s}/${e}`,                                      quality: 'HD' },
    { name: 'smashystream', url: (id,s,e) => `https://embed.smashystream.com/playere.php?tmdb=${id}&season=${s}&episode=${e}`, quality: 'HD' },
  ];

  // Cache: { [tmdbId]: { url, name, timestamp } }
  const cache = JSON.parse(localStorage.getItem('cs_server_cache') || '{}');
  const CACHE_TTL = 1000 * 60 * 60 * 6; // 6 hours

  /**
   * Check if a URL responds (using a hidden iframe with timeout).
   * Returns true/false.
   */
  function pingServer(url) {
    return new Promise(resolve => {
      const timeout = setTimeout(() => {
        iframe.remove();
        resolve(false);
      }, 5000); // 5s timeout per server

      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;top:-9999px';
      iframe.src = url;

      iframe.onload = () => {
        clearTimeout(timeout);
        iframe.remove();
        resolve(true);
      };

      iframe.onerror = () => {
        clearTimeout(timeout);
        iframe.remove();
        resolve(false);
      };

      document.body.appendChild(iframe);
    });
  }

  /**
   * Find the best working server for a movie/show.
   * Tests servers in parallel, returns first working URL.
   */
  async function findBestServer(item, season = 1, episode = 1) {
    const cacheKey = `${item.type}_${item.id}_${season}_${episode}`;

    // Return cached result if still valid
    if (cache[cacheKey]) {
      const cached = cache[cacheKey];
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        console.log(`✅ Using cached server: ${cached.name} for "${item.title}"`);
        return cached.url;
      }
    }

    const servers = item.type === 'series' ? TV_SERVERS : MOVIE_SERVERS;

    console.log(`🔍 Testing ${servers.length} servers for "${item.title}"...`);

    // Test all servers in parallel with Promise.race-style logic
    return new Promise(async (resolve) => {
      let resolved = false;
      let checked  = 0;

      const tryServer = async (server) => {
        const url = item.type === 'series'
          ? server.url(item.id, season, episode)
          : server.url(item.id);

        const ok = await pingServer(url);
        checked++;

        if (ok && !resolved) {
          resolved = true;
          console.log(`✅ Server found: ${server.name} (${server.quality})`);
          // Cache result
          cache[cacheKey] = { url, name: server.name, quality: server.quality, timestamp: Date.now() };
          localStorage.setItem('cs_server_cache', JSON.stringify(cache));
          resolve(url);
        }

        // All checked, none worked
        if (checked === servers.length && !resolved) {
          console.warn('⚠️ No servers responded, using first server as fallback');
          const fallback = item.type === 'series'
            ? servers[0].url(item.id, season, episode)
            : servers[0].url(item.id);
          resolve(fallback);
        }
      };

      // Fire all checks simultaneously
      servers.forEach(server => tryServer(server));
    });
  }

  /**
   * Pre-check all servers globally (called on page load).
   * Stores which servers are currently alive.
   */
  const aliveServers = { movie: [], tv: [] };

  async function preCheckServers() {
    console.log('🌐 Pre-checking server availability...');

    // Test with a known movie ID (Inception = 27205)
    const testId = 27205;

    const movieChecks = MOVIE_SERVERS.map(async (server) => {
      const url = server.url(testId);
      const ok  = await pingServer(url);
      if (ok) aliveServers.movie.push(server);
      return { server, ok };
    });

    const tvChecks = TV_SERVERS.map(async (server) => {
      const url = server.url(1396, 1, 1); // Breaking Bad S1E1
      const ok  = await pingServer(url);
      if (ok) aliveServers.tv.push(server);
      return { server, ok };
    });

    await Promise.all([...movieChecks, ...tvChecks]);

    console.log(`✅ Live movie servers: ${aliveServers.movie.map(s=>s.name).join(', ') || 'none'}`);
    console.log(`✅ Live TV servers:    ${aliveServers.tv.map(s=>s.name).join(', ') || 'none'}`);

    // Store for quick access
    localStorage.setItem('cs_alive_movie', JSON.stringify(aliveServers.movie.map(s=>s.name)));
    localStorage.setItem('cs_alive_tv',    JSON.stringify(aliveServers.tv.map(s=>s.name)));
  }

  /**
   * Get best URL from pre-checked alive servers (fast, no re-testing).
   */
  function getFromAlive(item, season = 1, episode = 1) {
    const alive   = item.type === 'series' ? aliveServers.tv : aliveServers.movie;
    const servers = item.type === 'series' ? TV_SERVERS      : MOVIE_SERVERS;

    if (alive.length === 0) {
      // No pre-check done yet, fall back to first server
      const s = servers[0];
      return item.type === 'series' ? s.url(item.id, season, episode) : s.url(item.id);
    }

    // Pick first alive server
    const best = alive[0];
    const srv  = servers.find(s => s.name === best.name) || servers[0];
    return item.type === 'series' ? srv.url(item.id, season, episode) : srv.url(item.id);
  }

  /**
   * Get a "next" working server (for retry button).
   */
  function getNextServer(item, currentUrl, season = 1, episode = 1) {
    const servers = item.type === 'series' ? TV_SERVERS : MOVIE_SERVERS;
    const urls    = servers.map(s =>
      item.type === 'series' ? s.url(item.id, season, episode) : s.url(item.id)
    );
    const idx     = urls.indexOf(currentUrl);
    const nextIdx = (idx + 1) % urls.length;
    return { url: urls[nextIdx], name: servers[nextIdx].name };
  }

  return {
    findBestServer,
    preCheckServers,
    getFromAlive,
    getNextServer,
    MOVIE_SERVERS,
    TV_SERVERS,
    aliveServers,
  };

})();
