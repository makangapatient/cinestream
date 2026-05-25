// CineStream — Movie & TV Data
// Replace poster URLs with real TMDB image URLs in production
// Format: https://image.tmdb.org/t/p/w500{poster_path}

// Make API key available globally for search
window.TMDB_KEY = API_KEY;

 // CineStream — Live Movie Data from TMDB API
 // CineStream — Live Movie Data from TMDB API
const API_KEY = 'c3253a09433a2690c968a64a5788c6d4';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL  = 'https://image.tmdb.org/t/p/w500';
const BACK_URL = 'https://image.tmdb.org/t/p/w1280';

let MOVIES = [];
let SERIES = [];
let ALL_CONTENT = [];
let HERO_ITEMS = [];

// Fetch newest releases separately
async function fetchLatestMovies() {
  const latestMovies = [];
  const endpoints = [
    `${BASE_URL}/movie/now_playing?api_key=${API_KEY}&page=1`,
    `${BASE_URL}/movie/now_playing?api_key=${API_KEY}&page=2`,
    `${BASE_URL}/movie/upcoming?api_key=${API_KEY}&page=1`,
    `${BASE_URL}/movie/upcoming?api_key=${API_KEY}&page=2`,
    // Search specifically for 2026 movies
    `${BASE_URL}/discover/movie?api_key=${API_KEY}&primary_release_year=2026&sort_by=popularity.desc&page=1`,
    `${BASE_URL}/discover/movie?api_key=${API_KEY}&primary_release_year=2026&sort_by=release_date.desc&page=1`,
  ];

  for (const url of endpoints) {
    try {
      const res  = await fetch(url);
      const data = await res.json();
      data.results.forEach(m => {
        if (!m.poster_path) return;
        latestMovies.push({
          id:       m.id,
          title:    m.title,
          year:     m.release_date ? new Date(m.release_date).getFullYear() : 2026,
          rating:   Math.round(m.vote_average * 10) / 10,
          duration: '—',
          genre:    getGenreName(m.genre_ids[0]),
          type:     'movie',
          desc:     m.overview,
          poster:   IMG_URL + m.poster_path,
          backdrop: m.backdrop_path ? BACK_URL + m.backdrop_path : IMG_URL + m.poster_path,
          tags:     ['HD', 'New', 'Trending'],
        });
      });
    } catch(e) {
      console.warn('Latest fetch failed:', url);
    }
  }
  return latestMovies;
}

// Fetch movies year by year (1970 to now)
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
      const res = await fetch(
        `${BASE_URL}/discover/movie?api_key=${API_KEY}` +
        `&primary_release_year=${year}` +
        `&sort_by=popularity.desc` +
        `&vote_count.gte=5` +
        `&page=1`
      );
      const data = await res.json();

      data.results.forEach(m => {
        if (!m.poster_path) return;
        allMovies.push({
          id:       m.id,
          title:    m.title,
          year:     new Date(m.release_date).getFullYear(),
          rating:   Math.round(m.vote_average * 10) / 10,
          duration: '—',
          genre:    getGenreName(m.genre_ids[0]),
          type:     'movie',
          desc:     m.overview,
          poster:   IMG_URL + m.poster_path,
          backdrop: m.backdrop_path ? BACK_URL + m.backdrop_path : IMG_URL + m.poster_path,
          tags:     m.popularity > 100 ? ['HD','Trending'] : ['HD'],
        });
      });

    } catch(e) {
      console.warn('Failed year:', year, e);
    }

    // Small delay to respect API rate limits
    await new Promise(r => setTimeout(r, 250));
  }

  // Hide loader when done
  const loader = document.getElementById('loader');
  if (loader) loader.style.display = 'none';

  return allMovies;
}

// Fetch popular TV series
async function fetchSeries() {
  const res = await fetch(
    `${BASE_URL}/tv/popular?api_key=${API_KEY}&page=1`
  );
  const data = await res.json();
  return data.results
    .filter(s => s.poster_path)
    .map(s => ({
      id:       s.id,
      title:    s.name,
      year:     new Date(s.first_air_date).getFullYear(),
      rating:   Math.round(s.vote_average * 10) / 10,
      duration: '—',
      genre:    getGenreName(s.genre_ids[0]),
      type:     'series',
      desc:     s.overview,
      poster:   IMG_URL + s.poster_path,
      backdrop: s.backdrop_path ? BACK_URL + s.backdrop_path : IMG_URL + s.poster_path,
      tags:     ['HD','Series'],
      seasons:  s.number_of_seasons || 1,
    }));
}

// TMDB genre ID → name
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

// Boot — load everything
async function initData() {
  console.log('Loading movies from TMDB...');

  try {
    // Load latest movies FIRST so they appear immediately
    const latest = await fetchLatestMovies();
    console.log(`✅ Latest movies loaded: ${latest.length}`);

    // Start showing content right away
    MOVIES      = latest;
    ALL_CONTENT = [...latest];
    HERO_ITEMS  = latest.filter(m => m.tags.includes('Trending')).slice(0, 5);
    document.dispatchEvent(new Event('dataReady'));

    // Then load full historical data in background
    const [allMovies, series] = await Promise.all([
      fetchAllMovies(),
      fetchSeries()
    ]);

    // Merge — avoid duplicates by ID
    const existingIds = new Set(latest.map(m => m.id));
    const historical  = allMovies.filter(m => !existingIds.has(m.id));

    MOVIES      = [...latest, ...historical];
    SERIES      = series;
    ALL_CONTENT = [...MOVIES, ...series];
    HERO_ITEMS  = latest.filter(m => m.tags.includes('Trending')).slice(0, 5);

    console.log(`✅ Total loaded: ${MOVIES.length} movies, ${series.length} series`);

    // Refresh the UI with full data
    document.dispatchEvent(new Event('dataReady'));

    // Hide loader
    const loader = document.getElementById('loader');
    if (loader) loader.style.display = 'none';

  } catch(e) {
    console.error('Failed to load data:', e);
  }
}

initData();