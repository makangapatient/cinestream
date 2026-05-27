// CineStream — Live Movie & TV Data from TMDB API
const API_KEY  = 'c3253a09433a2690c968a64a5788c6d4';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL  = 'https://image.tmdb.org/t/p/w500';
const BACK_URL = 'https://image.tmdb.org/t/p/w1280';

// Make key available globally for live search + movie page
window.TMDB_KEY = API_KEY;

let MOVIES      = [];
let SERIES      = [];
let ALL_CONTENT = [];
let HERO_ITEMS  = [];

/* ── Genre map ─────────────────────────────────────────── */
function getGenreName(id) {
  const g = {
    28:'action',12:'action',16:'animation',35:'comedy',80:'crime',
    99:'documentary',18:'drama',10751:'comedy',14:'sci-fi',36:'drama',
    27:'horror',10402:'drama',9648:'thriller',10749:'romance',878:'sci-fi',
    10770:'drama',53:'thriller',10752:'action',37:'action',10759:'action',
    10762:'animation',10763:'drama',10764:'reality',10765:'sci-fi',
    10766:'drama',10767:'talk',10768:'documentary',10769:'comedy'
  };
  return g[id] || 'drama';
}

function mapMovie(m) {
  if (!m.poster_path) return null;
  return {
    id:       m.id,
    title:    m.title,
    year:     m.release_date ? new Date(m.release_date).getFullYear() : new Date().getFullYear(),
    rating:   Math.round((m.vote_average || 0) * 10) / 10,
    duration: '—',
    genre:    getGenreName(m.genre_ids?.[0]),
    type:     'movie',
    desc:     m.overview || '',
    poster:   IMG_URL  + m.poster_path,
    backdrop: m.backdrop_path ? BACK_URL + m.backdrop_path : IMG_URL + m.poster_path,
    tags:     m.popularity > 200 ? ['HD','Trending','New'] : m.popularity > 80 ? ['HD','New'] : ['HD'],
  };
}

function mapSeries(s) {
  if (!s.poster_path) return null;
  return {
    id:       s.id,
    title:    s.name,
    year:     s.first_air_date ? new Date(s.first_air_date).getFullYear() : new Date().getFullYear(),
    rating:   Math.round((s.vote_average || 0) * 10) / 10,
    duration: '—',
    genre:    getGenreName(s.genre_ids?.[0]),
    type:     'series',
    desc:     s.overview || '',
    poster:   IMG_URL  + s.poster_path,
    backdrop: s.backdrop_path ? BACK_URL + s.backdrop_path : IMG_URL + s.poster_path,
    tags:     s.popularity > 200 ? ['HD','Series','Trending'] : ['HD','Series'],
    seasons:  s.number_of_seasons || 1,
  };
}

/* ── 1. Latest / now playing / upcoming ────────────────── */
async function fetchLatest() {
  const seen     = new Set();
  const results  = [];
  const endpoints = [
    `${BASE_URL}/movie/now_playing?api_key=${API_KEY}&page=1`,
    `${BASE_URL}/movie/now_playing?api_key=${API_KEY}&page=2`,
    `${BASE_URL}/movie/now_playing?api_key=${API_KEY}&page=3`,
    `${BASE_URL}/movie/upcoming?api_key=${API_KEY}&page=1`,
    `${BASE_URL}/movie/upcoming?api_key=${API_KEY}&page=2`,
    `${BASE_URL}/discover/movie?api_key=${API_KEY}&primary_release_year=2026&sort_by=popularity.desc&vote_count.gte=0&page=1`,
    `${BASE_URL}/discover/movie?api_key=${API_KEY}&primary_release_year=2026&sort_by=popularity.desc&vote_count.gte=0&page=2`,
    `${BASE_URL}/discover/movie?api_key=${API_KEY}&primary_release_year=2026&sort_by=popularity.desc&vote_count.gte=0&page=3`,
    `${BASE_URL}/discover/movie?api_key=${API_KEY}&primary_release_year=2026&sort_by=popularity.desc&vote_count.gte=0&page=4`,
    `${BASE_URL}/discover/movie?api_key=${API_KEY}&primary_release_year=2026&sort_by=popularity.desc&vote_count.gte=0&page=5`,
    `${BASE_URL}/discover/movie?api_key=${API_KEY}&primary_release_year=2026&sort_by=release_date.desc&vote_count.gte=0&page=1`,
    `${BASE_URL}/discover/movie?api_key=${API_KEY}&primary_release_year=2026&sort_by=release_date.desc&vote_count.gte=0&page=2`,
    `${BASE_URL}/discover/movie?api_key=${API_KEY}&primary_release_year=2026&sort_by=vote_average.desc&vote_count.gte=1&page=1`,
    `${BASE_URL}/discover/movie?api_key=${API_KEY}&primary_release_year=2025&sort_by=popularity.desc&page=1`,
    `${BASE_URL}/discover/movie?api_key=${API_KEY}&primary_release_year=2025&sort_by=popularity.desc&page=2`,
    `${BASE_URL}/discover/movie?api_key=${API_KEY}&primary_release_year=2025&sort_by=popularity.desc&page=3`,
  ];
  for (const url of endpoints) {
    try {
      const res  = await fetch(url);
      const data = await res.json();
      if (!data.results) continue;
      for (const m of data.results) {
        if (seen.has(m.id)) continue;
        seen.add(m.id);
        const item = mapMovie(m);
        if (item) results.push(item);
      }
    } catch(e) { console.warn('fetchLatest failed:', url); }
  }
  return results;
}

/* ── 2. Year-by-year historical movies ─────────────────── */
async function fetchHistorical() {
  const seen   = new Set();
  const all    = [];
  const curY   = new Date().getFullYear();
  const years  = [];
  for (let y = 1970; y <= curY; y++) years.push(y);

  for (let i = 0; i < years.length; i++) {
    const y   = years[i];
    const pct = Math.round(((i + 1) / years.length) * 100);

    const bar = document.getElementById('loadBar');
    const msg = document.getElementById('loadMsg');
    if (bar) bar.style.width = pct + '%';
    if (msg) msg.textContent = `Loading ${y} movies... ${pct}%`;

    try {
      const res  = await fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&primary_release_year=${y}&sort_by=popularity.desc&vote_count.gte=5&page=1`);
      const data = await res.json();
      if (data.results) {
        for (const m of data.results) {
          if (seen.has(m.id)) continue;
          seen.add(m.id);
          const item = mapMovie(m);
          if (item) all.push(item);
        }
      }
    } catch(e) {}

    await new Promise(r => setTimeout(r, 200));
  }
  return all;
}

/* ── 3. TV Series — multiple pages ─────────────────────── */
async function fetchSeries() {
  const seen    = new Set();
  const results = [];
  const endpoints = [
    `${BASE_URL}/tv/popular?api_key=${API_KEY}&page=1`,
    `${BASE_URL}/tv/popular?api_key=${API_KEY}&page=2`,
    `${BASE_URL}/tv/popular?api_key=${API_KEY}&page=3`,
    `${BASE_URL}/tv/popular?api_key=${API_KEY}&page=4`,
    `${BASE_URL}/tv/popular?api_key=${API_KEY}&page=5`,
    `${BASE_URL}/tv/top_rated?api_key=${API_KEY}&page=1`,
    `${BASE_URL}/tv/top_rated?api_key=${API_KEY}&page=2`,
    `${BASE_URL}/tv/on_the_air?api_key=${API_KEY}&page=1`,
    `${BASE_URL}/tv/on_the_air?api_key=${API_KEY}&page=2`,
    `${BASE_URL}/tv/airing_today?api_key=${API_KEY}&page=1`,
    `${BASE_URL}/discover/tv?api_key=${API_KEY}&sort_by=popularity.desc&first_air_date_year=2026&page=1`,
    `${BASE_URL}/discover/tv?api_key=${API_KEY}&sort_by=popularity.desc&first_air_date_year=2025&page=1`,
    `${BASE_URL}/discover/tv?api_key=${API_KEY}&sort_by=popularity.desc&first_air_date_year=2025&page=2`,
    `${BASE_URL}/discover/tv?api_key=${API_KEY}&sort_by=popularity.desc&first_air_date_year=2024&page=1`,
    `${BASE_URL}/discover/tv?api_key=${API_KEY}&sort_by=popularity.desc&first_air_date_year=2023&page=1`,
  ];
  for (const url of endpoints) {
    try {
      const res  = await fetch(url);
      const data = await res.json();
      if (!data.results) continue;
      for (const s of data.results) {
        if (seen.has(s.id)) continue;
        seen.add(s.id);
        const item = mapSeries(s);
        if (item) results.push(item);
      }
    } catch(e) { console.warn('fetchSeries failed:', url); }
  }
  return results;
}

/* ── Boot ───────────────────────────────────────────────── */
async function initData() {
  console.log('[CineStream] Loading data...');

  try {
    // Phase 1: load latest + series fast
    const [latest, series] = await Promise.all([fetchLatest(), fetchSeries()]);

    MOVIES      = latest;
    SERIES      = series;
    ALL_CONTENT = [...latest, ...series];
    HERO_ITEMS  = latest.filter(m => m.tags.includes('Trending')).slice(0, 5);

    console.log(`[CineStream] Phase 1: ${latest.length} movies, ${series.length} series`);
    document.dispatchEvent(new Event('dataReady'));

    // Phase 2: load historical movies in background
    const historical = await fetchHistorical();

    // Merge without duplicates
    const existingIds = new Set(ALL_CONTENT.map(m => m.id));
    const newMovies   = historical.filter(m => !existingIds.has(m.id));

    MOVIES      = [...latest, ...newMovies];
    ALL_CONTENT = [...MOVIES, ...SERIES];

    console.log(`[CineStream] Phase 2: ${MOVIES.length} movies total`);
    document.dispatchEvent(new Event('dataReady'));

    // Hide loader
    const loader = document.getElementById('loader');
    if (loader) loader.style.display = 'none';

  } catch(e) {
    console.error('[CineStream] Init failed:', e);
    const loader = document.getElementById('loader');
    if (loader) loader.style.display = 'none';
  }
}

initData();
