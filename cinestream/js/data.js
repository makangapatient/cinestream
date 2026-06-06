// CineStream — data.js
// Set your TMDB API key here:
const API_KEY  = 'YOUR_TMDB_API_KEY_HERE';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL  = 'https://image.tmdb.org/t/p/w500';
const BACK_URL = 'https://image.tmdb.org/t/p/w1280';

// These get populated when data loads
let MOVIES      = [];
let SERIES      = [];
let ALL_CONTENT = [];
let HERO_ITEMS  = [];

const GENRE_MAP = {
  28:'action',12:'action',16:'animation',35:'comedy',80:'crime',
  99:'documentary',18:'drama',10751:'comedy',14:'sci-fi',36:'drama',
  27:'horror',10402:'drama',9648:'thriller',10749:'romance',878:'sci-fi',
  10770:'drama',53:'thriller',10752:'action',37:'action'
};

function getGenreName(id) {
  return GENRE_MAP[id] || 'drama';
}

function mapMovie(m) {
  return {
    id:       m.id,
    title:    m.title || m.original_title || 'Unknown',
    year:     m.release_date ? parseInt(m.release_date) : 0,
    rating:   Math.round((m.vote_average || 0) * 10) / 10,
    duration: '—',
    genre:    getGenreName(m.genre_ids?.[0]),
    type:     'movie',
    desc:     m.overview || '',
    poster:   m.poster_path   ? IMG_URL  + m.poster_path   : '',
    backdrop: m.backdrop_path ? BACK_URL + m.backdrop_path : (m.poster_path ? IMG_URL + m.poster_path : ''),
    tags:     m.popularity > 100 ? ['HD','Trending'] : ['HD'],
    popularity: m.popularity || 0,
  };
}

function mapSeries(s) {
  return {
    id:       s.id,
    title:    s.name || s.original_name || 'Unknown',
    year:     s.first_air_date ? parseInt(s.first_air_date) : 0,
    rating:   Math.round((s.vote_average || 0) * 10) / 10,
    duration: '—',
    genre:    getGenreName(s.genre_ids?.[0]),
    type:     'series',
    desc:     s.overview || '',
    poster:   s.poster_path   ? IMG_URL  + s.poster_path   : '',
    backdrop: s.backdrop_path ? BACK_URL + s.backdrop_path : (s.poster_path ? IMG_URL + s.poster_path : ''),
    tags:     ['HD','Series'],
    seasons:  s.number_of_seasons || 1,
    popularity: s.popularity || 0,
  };
}

async function tmdbFetch(url) {
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } catch(e) {
    console.warn('TMDB fetch failed:', url, e.message);
    return { results: [] };
  }
}

async function initData() {
  console.log('⏳ Loading CineStream data...');

  try {
    // Fetch popular movies + now playing + top rated in parallel
    const [pop, nowPlaying, topRated, popularSeries, trendingAll] = await Promise.all([
      tmdbFetch(`${BASE_URL}/movie/popular?api_key=${API_KEY}&language=en-US&page=1`),
      tmdbFetch(`${BASE_URL}/movie/now_playing?api_key=${API_KEY}&language=en-US&page=1`),
      tmdbFetch(`${BASE_URL}/movie/top_rated?api_key=${API_KEY}&language=en-US&page=1`),
      tmdbFetch(`${BASE_URL}/tv/popular?api_key=${API_KEY}&language=en-US&page=1`),
      tmdbFetch(`${BASE_URL}/trending/all/week?api_key=${API_KEY}&language=en-US`),
    ]);

    // Merge and deduplicate movies
    const rawMovies = [
      ...(pop.results        || []),
      ...(nowPlaying.results || []),
      ...(topRated.results   || []),
    ];
    const seen = new Set();
    MOVIES = rawMovies
      .filter(m => { if (!m.poster_path || seen.has(m.id)) return false; seen.add(m.id); return true; })
      .map(mapMovie);

    // Series
    SERIES = (popularSeries.results || [])
      .filter(s => s.poster_path)
      .map(mapSeries);

    // Trending (mix of movies + shows)
    const trendMovies = (trendingAll.results || [])
      .filter(t => t.media_type === 'movie' && t.poster_path)
      .map(mapMovie)
      .slice(0, 10);

    // Hero items = trending movies (most popular)
    HERO_ITEMS = trendMovies.length >= 5
      ? trendMovies.slice(0, 5)
      : MOVIES.slice(0, 5);

    // Mark trending
    trendMovies.forEach(t => {
      const m = MOVIES.find(x => x.id === t.id);
      if (m && !m.tags.includes('Trending')) m.tags.push('Trending');
      if (!m) { t.tags = ['HD','Trending']; MOVIES.unshift(t); }
    });

    ALL_CONTENT = [...MOVIES, ...SERIES];

    console.log(`✅ Loaded: ${MOVIES.length} movies, ${SERIES.length} series`);
    document.dispatchEvent(new Event('dataReady'));

  } catch(e) {
    console.error('❌ Failed to load data:', e);
    document.dispatchEvent(new Event('dataReady')); // dispatch anyway
  }
}

// Start loading immediately
initData();
