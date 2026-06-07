// CineStream — data.js
// IMPORTANT: Replace with your real TMDB API key
window.CS_API_KEY = 'c3253a09433a2690c968a64a5788c6d4';
window.CS_BASE_URL = 'https://api.themoviedb.org/3';
window.CS_IMG_URL = 'https://image.tmdb.org/t/p/w500';
window.CS_BACK_URL = 'https://image.tmdb.org/t/p/w1280';

// Expose as globals for legacy code
const API_KEY = window.CS_API_KEY;
const BASE_URL = window.CS_BASE_URL;
const IMG_URL = window.CS_IMG_URL;
const BACK_URL = window.CS_BACK_URL;

let MOVIES = [];
let SERIES = [];
let ALL_CONTENT = [];
let HERO_ITEMS = [];

window.__dataReady = false;

const GENRE_MAP = {
  28: 'action', 12: 'action', 16: 'animation', 35: 'comedy', 80: 'crime',
  99: 'documentary', 18: 'drama', 10751: 'comedy', 14: 'sci-fi', 36: 'drama',
  27: 'horror', 10402: 'drama', 9648: 'thriller', 10749: 'romance', 878: 'sci-fi',
  10770: 'drama', 53: 'thriller', 10752: 'action', 37: 'action'
};

function getGenreName(id) {
  return GENRE_MAP[id] || 'drama';
}

function mapMovie(m) {
  return {
    id: m.id,
    title: m.title || m.original_title || 'Unknown',
    year: m.release_date ? parseInt(m.release_date) : 0,
    rating: Math.round((m.vote_average || 0) * 10) / 10,
    duration: '—',
    genre: getGenreName(m.genre_ids?.[0]),
    type: 'movie',
    desc: m.overview || '',
    poster: m.poster_path ? IMG_URL + m.poster_path : '',
    backdrop: m.backdrop_path ? BACK_URL + m.backdrop_path : '',
    tags: m.popularity > 100 ? ['HD', 'Trending'] : ['HD'],
    popularity: m.popularity || 0,
  };
}

function mapSeries(s) {
  return {
    id: s.id,
    title: s.name || s.original_name || 'Unknown',
    year: s.first_air_date ? parseInt(s.first_air_date) : 0,
    rating: Math.round((s.vote_average || 0) * 10) / 10,
    duration: '—',
    genre: getGenreName(s.genre_ids?.[0]),
    type: 'series',
    desc: s.overview || '',
    poster: s.poster_path ? IMG_URL + s.poster_path : '',
    backdrop: s.backdrop_path ? BACK_URL + s.backdrop_path : '',
    tags: ['HD', 'Series'],
    seasons: s.number_of_seasons || 1,
    popularity: s.popularity || 0,
  };
}

async function tmdbFetch(url) {
  try {
    const r = await fetch(url);
    if (!r.ok) { console.error('TMDB error:', r.status); return { results: [] }; }
    return await r.json();
  } catch (e) {
    console.error('Fetch failed:', e.message);
    return { results: [] };
  }
}

async function initData() {
  console.log('⏳ Loading CineStream data...');
  try {
    const [pop, nowPlay, topRated, trending, tvPop] = await Promise.all([
      tmdbFetch(`${BASE_URL}/movie/popular?api_key=${API_KEY}&language=en-US&page=1`),
      tmdbFetch(`${BASE_URL}/movie/now_playing?api_key=${API_KEY}&language=en-US&page=1`),
      tmdbFetch(`${BASE_URL}/movie/top_rated?api_key=${API_KEY}&language=en-US&page=1`),
      tmdbFetch(`${BASE_URL}/trending/movie/week?api_key=${API_KEY}&language=en-US`),
      tmdbFetch(`${BASE_URL}/tv/popular?api_key=${API_KEY}&language=en-US&page=1`),
    ]);

    const seen = new Set();
    const raw = [
      ...(trending.results || []),
      ...(pop.results || []),
      ...(nowPlay.results || []),
      ...(topRated.results || []),
    ];

    MOVIES = raw
      .filter(m => { if (!m.poster_path || seen.has(m.id)) return false; seen.add(m.id); return true; })
      .map(mapMovie);

    SERIES = (tvPop.results || []).filter(s => s.poster_path).map(mapSeries);

    HERO_ITEMS = MOVIES.filter(m => m.backdrop).slice(0, 5);

    const trendIds = new Set((trending.results || []).map(m => m.id));
    MOVIES.forEach(m => { if (trendIds.has(m.id)) m.tags = ['HD', 'Trending']; });

    ALL_CONTENT = [...MOVIES, ...SERIES];
    console.log(`✅ Loaded: ${MOVIES.length} movies | ${SERIES.length} series`);
  } catch (e) {
    console.error('initData failed:', e);
  }

  window.__dataReady = true;
  document.dispatchEvent(new CustomEvent('dataReady', {
    detail: { movies: MOVIES.length, series: SERIES.length }
  }));
}

initData();
