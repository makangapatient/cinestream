// =====================================================
// CineStream — Live Movie Data from TMDB API
// =====================================================

const API_KEY  = 'c3253a09433a2690c968a64a5788c6d4';
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
  const BATCH_SIZE = 5;

  for (let i = 0; i < years.length; i += BATCH_SIZE) {
    const batch = years.slice(i, i + BATCH_SIZE);
    const pct   = Math.round(((i + BATCH_SIZE) / years.length) * 100);

    const bar = document.getElementById('loadBar');
    const msg = document.getElementById('loadMsg');
    if (bar) bar.style.width = Math.min(pct, 100) + '%';
    if (msg) msg.textContent = `Loading ${batch[0]}–${batch[batch.length-1]}... ${Math.min(pct,100)}%`;

    // Fetch pages 1, 2 and 3 for each year
    const fetchPromises = [];
    batch.forEach(year => {
      // Recent years (last 2) — low vote threshold, 3 pages
      // Older years — higher threshold, 1 page
      const isRecent       = year >= currentYear - 1;
      const pages          = isRecent ? [1, 2, 3] : [1];
      const minVotes       = isRecent ? 5 : 80;

      pages.forEach(page => {
        fetchPromises.push(
          fetch(
            `${BASE_URL}/discover/movie?api_key=${API_KEY}` +
            `&primary_release_year=${year}` +
            `&sort_by=popularity.desc` +
            `&vote_count.gte=${minVotes}` +
            `&page=${page}`
          ).then(r => r.json()).catch(() => ({ results: [] }))
        );
      });
    });

    const results = await Promise.allSettled(fetchPromises);

    results.forEach(result => {
      if (result.status === 'fulfilled' && result.value.results) {
        result.value.results.forEach(m => {
          if (!m.poster_path) return;
          // Avoid duplicates
          if (allMovies.find(x => x.id === m.id)) return;

          allMovies.push({
            id:       m.id,
            title:    m.title,
            year:     m.release_date
                        ? new Date(m.release_date).getFullYear()
                        : currentYear,
            rating:   Math.round(m.vote_average * 10) / 10,
            duration: '—',
            genre:    getGenreName(m.genre_ids[0]),
            type:     'movie',
            desc:     m.overview,
            poster:   IMG_URL + m.poster_path,
            backdrop: m.backdrop_path
                        ? BACK_URL + m.backdrop_path
                        : IMG_URL + m.poster_path,
            tags:     m.popularity > 50 ? ['HD','Trending'] : ['HD'],
          });
        });
      }
    });

    await new Promise(r => setTimeout(r, 300));
  }

  const loader = document.getElementById('loader');
  if (loader) loader.style.display = 'none';

  return allMovies;
}

// Search TMDB directly by title
async function searchTMDB(query) {
  try {
    const res = await fetch(
      `${BASE_URL}/search/movie?api_key=${API_KEY}` +
      `&query=${encodeURIComponent(query)}` +
      `&page=1`
    );
    const data = await res.json();
    return data.results
      .filter(m => m.poster_path)
      .map(m => ({
        id:       m.id,
        title:    m.title,
        year:     m.release_date
                    ? new Date(m.release_date).getFullYear()
                    : '—',
        rating:   Math.round(m.vote_average * 10) / 10,
        duration: '—',
        genre:    getGenreName(m.genre_ids[0]),
        type:     'movie',
        desc:     m.overview,
        poster:   IMG_URL + m.poster_path,
        backdrop: m.backdrop_path
                    ? BACK_URL + m.backdrop_path
                    : IMG_URL + m.poster_path,
        tags:     ['HD'],
      }));
  } catch(e) {
    return [];
  }
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
  console.log('Loading movies from TMDB...');

  try {
    // Load series fast first
    const series = await fetchSeries();
    SERIES = series;

    // Start loading movies
    const movies = await fetchAllMovies();

    MOVIES      = movies;
    ALL_CONTENT = [...movies, ...series];
    HERO_ITEMS  = movies
      .filter(m => m.tags.includes('Trending'))
      .slice(0, 5);

    console.log(`✅ Loaded: ${movies.length} movies, ${series.length} series`);
    document.dispatchEvent(new Event('dataReady'));

  } catch(e) {
    console.error('Failed to load data:', e);
    // Hide loader even on error
    const loader = document.getElementById('loader');
    if (loader) loader.style.display = 'none';
  }
}

initData();
