// CineStream — server-checker.js
// Lightweight background pre-checker — no UI impact
const ServerChecker = (function() {
  const MOVIE_SERVERS = [
    { name:'vidsrc.me',   url: id      => `https://vidsrc.me/embed/movie?tmdb=${id}` },
    { name:'vidsrc.cc',   url: id      => `https://vidsrc.cc/v2/embed/movie/${id}` },
    { name:'autoembed',   url: id      => `https://player.autoembed.cc/embed/movie/${id}` },
    { name:'2embed',      url: id      => `https://www.2embed.cc/embed/${id}` },
    { name:'multiembed',  url: id      => `https://multiembed.mov/?video_id=${id}&tmdb=1` },
    { name:'embed.su',    url: id      => `https://embed.su/embed/movie/${id}` },
    { name:'moviesapi',   url: id      => `https://moviesapi.club/movie/${id}` },
  ];

  const TV_SERVERS = [
    { name:'vidsrc.me',   url: (id,s,e) => `https://vidsrc.me/embed/tv?tmdb=${id}&season=${s}&episode=${e}` },
    { name:'vidsrc.cc',   url: (id,s,e) => `https://vidsrc.cc/v2/embed/tv/${id}/${s}/${e}` },
    { name:'autoembed',   url: (id,s,e) => `https://player.autoembed.cc/embed/tv/${id}/${s}/${e}` },
    { name:'2embed',      url: (id,s,e) => `https://www.2embed.cc/embedtv/${id}&s=${s}&e=${e}` },
    { name:'multiembed',  url: (id,s,e) => `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${s}&e=${e}` },
    { name:'embed.su',    url: (id,s,e) => `https://embed.su/embed/tv/${id}/${s}/${e}` },
  ];

  function getNextServer(item, currentUrl, season, episode) {
    const s = season  || 1;
    const e = episode || 1;
    const servers = item.type === 'series' ? TV_SERVERS : MOVIE_SERVERS;
    const urls    = servers.map(sv =>
      item.type === 'series' ? sv.url(item.id,s,e) : sv.url(item.id)
    );
    const idx  = urls.indexOf(currentUrl);
    const next = (idx + 1) % servers.length;
    return { url: urls[next], name: servers[next].name };
  }

  return { MOVIE_SERVERS, TV_SERVERS, getNextServer };
})();
