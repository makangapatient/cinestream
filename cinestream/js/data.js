// CineStream — data.js
const API_KEY  = 'c3253a09433a2690c968a64a5788c6d4'; // ← your key stays
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL  = 'https://image.tmdb.org/t/p/w500';
const BACK_URL = 'https://image.tmdb.org/t/p/w1280';

let MOVIES      = [];
let SERIES      = [];
let ALL_CONTENT = [];
let HERO_ITEMS  = [];

// Flag so main.js can check if data loaded before it ran
window.__dataReady = false;

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
    id:         m.id,
    title:      m.title || m.original_title || 'Unknown',
    year:       m.release_date ? parseInt(m.release_date) : 0,
    rating:     Math.round((m.vote_average || 0) * 10) / 10,
    duration:   '—',
    genre:      getGenreName(m.genre_ids?.[0]),
    type:       'movie',
    desc:       m.overview || '',
    poster:     m.poster_path   ? IMG_URL  + m.poster_path   : '',
    backdrop:   m.backdrop_path ? BACK_URL + m.backdrop_path : '',
    tags:       m.popularity > 100 ? ['HD','Trending'] : ['HD'],
    popularity: m.popularity || 0,
  };
}

function mapSeries(s) {
  return {
    id:         s.id,
    title:      s.name || s.original_name || 'Unknown',
    year:       s.first_air_date ? parseInt(s.first_air_date) : 0,
    rating:     Math.round((s.vote_average || 0) * 10) / 10,
    duration:   '—',
    genre:      getGenreName(s.genre_ids?.[0]),
    type:       'series',
    desc:       s.overview || '',
    poster:     s.poster_path   ? IMG_URL  + s.poster_path   : '',
    backdrop:   s.backdrop_path ? BACK_URL + s.backdrop_path : '',
    tags:       ['HD','Series'],
    seasons:    s.number_of_seasons || 1,
    popularity: s.popularity || 0,
  };
}

async function tmdbFetch(url) {
  try {
    const r = await fetch(url);
    if (!r.ok) {
      console.error('TMDB error:', r.status, url);
      return { results: [] };
    }
    return await r.json();
  } catch(e) {
    console.error('TMDB fetch failed:', e.message, url);
    return { results: [] };
  }
}

async function initData() {
  console.log('⏳ CineStream: Loading data...');

  try {
    // Fetch all at once
    const [pop, nowPlay, topRated, trending, tvPop] = await Promise.all([
      tmdbFetch(`${BASE_URL}/movie/popular?api_key=${API_KEY}&language=en-US&page=1`),
      tmdbFetch(`${BASE_URL}/movie/now_playing?api_key=${API_KEY}&language=en-US&page=1`),
      tmdbFetch(`${BASE_URL}/movie/top_rated?api_key=${API_KEY}&language=en-US&page=1`),
      tmdbFetch(`${BASE_URL}/trending/movie/week?api_key=${API_KEY}&language=en-US`),
      tmdbFetch(`${BASE_URL}/tv/popular?api_key=${API_KEY}&language=en-US&page=1`),
    ]);

    console.log('TMDB responses:', {
      popular:    pop.results?.length,
      nowPlaying: nowPlay.results?.length,
      topRated:   topRated.results?.length,
      trending:   trending.results?.length,
      tv:         tvPop.results?.length,
    });

    // Deduplicate movies
    const seen = new Set();
    const raw  = [
      ...(trending.results  || []),
      ...(pop.results       || []),
      ...(nowPlay.results   || []),
      ...(topRated.results  || []),
    ];

    MOVIES = raw
      .filter(m => {
        if (!m.poster_path || seen.has(m.id)) return false;
        seen.add(m.id);
        return true;
      })
      .map(mapMovie);

    // Series
    SERIES = (tvPop.results || [])
      .filter(s => s.poster_path)
      .map(mapSeries);

    // Hero = top 5 trending movies
    HERO_ITEMS = MOVIES
      .filter(m => m.backdrop)
      .slice(0, 5);

    // Mark trending
    const trendIds = new Set((trending.results || []).map(m => m.id));
    MOVIES.forEach(m => {
      if (trendIds.has(m.id) && !m.tags.includes('Trending')) {
        m.tags.push('Trending');
      }
    });

    ALL_CONTENT = [...MOVIES, ...SERIES];

    console.log(`✅ Loaded: ${MOVIES.length} movies | ${SERIES.length} series | ${HERO_ITEMS.length} hero items`);

  } catch(e) {
    console.error('❌ initData failed:', e);
  }

  // Always fire dataReady — even if something failed
  window.__dataReady = true;
  document.dispatchEvent(new CustomEvent('dataReady', {
    detail: { movies: MOVIES.length, series: SERIES.length }
  }));
}

// Start immediately
initData();