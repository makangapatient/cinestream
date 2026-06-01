// =====================================================
// CineStream — Live Movie Data from TMDB API
// =====================================================

const API_KEY = 'c3253a09433a2690c968a64a5788c6d4';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL  = 'https://image.tmdb.org/t/p/w500';
const BACK_URL = 'https://image.tmdb.org/t/p/w1280';

let MOVIES      = [];
let SERIES      = [];
let ALL_CONTENT = [];
let HERO_ITEMS  = [];

// ---- Genre ID to name ----
function getGenreName(id) {
  const genres = {
    28:'action', 12:'action', 16:'animation', 35:'comedy',
    80:'crime', 99:'documentary', 18:'drama', 10751:'comedy',
    14:'sci-fi', 36:'drama', 27:'horror', 10402:'drama',
    9648:'thriller', 10749:'romance', 878:'sci-fi',
    10770:'drama', 53:'thriller', 10752:'action', 37:'action'
  };
  return genres[id] || 'drama';
}

// ---- Fetch movies year by year (1970 to now) ----
async function fetchAllMovies() {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let y = 1970; y <= currentYear; y++) years.push(y);

  const allMovies = [];

  for (let i = 0; i < years.length; i++) {
    const year = years[i];
    const pct  = Math.round(((i + 1) / years.length) * 100);

    // Update loading bar
    const bar = document.getElementById('loadBar');
    const msg = document.getElementById('loadMsg');
    if (bar) bar.style.width = pct + '%';
    if (msg) msg.textContent = `Loading ${year} movies... ${pct}%`;

    try {
      const res  = await fetch(
        `${BASE_URL}/discover/movie` +
        `?api_key=${API_KEY}` +
        `&primary_release_year=${year}` +
        `&sort_by=popularity.desc` +
        `&vote_count.gte=50` +
        `&page=1`
      );
      const data = await res.json();

      if (data.results) {
        data.results.forEach(m => {
          if (!m.poster_path || !m.id) return;
          allMovies.push({
            id:       m.id,
            title:    m.title || 'Unknown Title',
            year:     m.release_date ? new Date(m.release_date).getFullYear() : year,
            rating:   Math.round((m.vote_average || 0) * 10) / 10,
            duration: '—',
            genre:    getGenreName(m.genre_ids ? m.genre_ids[0] : 18),
            type:     'movie',
            desc:     m.overview || 'No description available.',
            poster:   IMG_URL + m.poster_path,
            backdrop: m.backdrop_path ? BACK_URL + m.backdrop_path : IMG_URL + m.poster_path,
            tags:     m.popularity > 100 ? ['HD', 'Trending'] : ['HD'],
          });
        });
      }
    } catch (e) {
      console.warn(`[CineStream] Failed to fetch year ${year}:`, e.message);
    }

    // Small delay to respect API rate limits
    await new Promise(r => setTimeout(r, 250));
  }

  // Hide loader
  const loader = document.getElementById('loader');
  if (loader) loader.style.display = 'none';

  return allMovies;
}

// ---- Fetch popular TV series ----
async function fetchSeries() {
  const allSeries = [];

  try {
    // Fetch 3 pages of popular series
    for (let page = 1; page <= 3; page++) {
      const res  = await fetch(
        `${BASE_URL}/tv/popular` +
        `?api_key=${API_KEY}` +
        `&page=${page}`
      );
      const data = await res.json();

      if (data.results) {
        data.results.forEach(s => {
          if (!s.poster_path || !s.id) return;
          allSeries.push({
            id:       s.id,
            title:    s.name || 'Unknown Title',
            year:     s.first_air_date ? new Date(s.first_air_date).getFullYear() : 2020,
            rating:   Math.round((s.vote_average || 0) * 10) / 10,
            duration: '—',
            genre:    getGenreName(s.genre_ids ? s.genre_ids[0] : 18),
            type:     'series',
            desc:     s.overview || 'No description available.',
            poster:   IMG_URL + s.poster_path,
            backdrop: s.backdrop_path ? BACK_URL + s.backdrop_path : IMG_URL + s.poster_path,
            tags:     ['HD', 'Series'],
            seasons:  s.number_of_seasons || 1,
          });
        });
      }
    }
  } catch (e) {
    console.warn('[CineStream] Failed to fetch series:', e.message);
  }

  return allSeries;
}

// ---- Boot: load everything ----
async function initData() {
  console.log('[CineStream] Loading data...');

  try {
    // Load movies and series in parallel
    const [movies, series] = await Promise.all([
      fetchAllMovies(),
      fetchSeries(),
    ]);

    MOVIES      = movies;
    SERIES      = series;
    ALL_CONTENT = [...movies, ...series];
    HERO_ITEMS  = movies
      .filter(m => m.tags.includes('Trending'))
      .slice(0, 5);

    console.log(`[CineStream] Phase 1: ${movies.length} movies, ${series.length} series`);
    console.log(`[CineStream] Phase 2: ${ALL_CONTENT.length} movies total`);

    // Tell main.js data is ready
    document.dispatchEvent(new Event('dataReady'));

  } catch (e) {
    console.error('[CineStream] Failed to load data:', e);
    // Dispatch anyway so UI doesn't stay blank
    document.dispatchEvent(new Event('dataReady'));
  }
}

initData();
