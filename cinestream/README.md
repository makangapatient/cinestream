# 🎬 CineStream — Movie Streaming Website

A fully featured, production-ready movie streaming website inspired by Goojara. Dark cinematic design with full browsing, search, filtering, and player functionality.

## 📁 File Structure

```
cinestream/
├── index.html          ← Homepage with hero slider + sections
├── movies.html         ← Browse all movies with filters
├── series.html         ← Browse TV series with filters
├── top250.html         ← Top 250 rated movies & shows
├── css/
│   └── styles.css      ← All styles (dark cinematic theme)
├── js/
│   ├── data.js         ← Movie & TV show database
│   └── main.js         ← All JavaScript functionality
└── README.md
```

## 🚀 How to Run

**Option 1 — Just open in browser:**
Double-click `index.html` — no server needed.

**Option 2 — Local server (recommended):**
```bash
# Using Python
python -m http.server 8000
# Then open: http://localhost:8000

# Using Node.js
npx serve .
# Then open: http://localhost:3000
```

## ✨ Features

- 🎬 Hero slider with auto-rotating featured movies
- 🔍 Real-time search with dropdown results
- 🏷️ Genre filtering (Action, Comedy, Drama, Horror, Sci-Fi...)
- 📊 Sort by rating, year, title
- 🎭 Movie detail modal with cast, overview, related films
- ▶️ Video player with multiple server support
- 📺 Separate TV series section with season info
- ⭐ Top 250 ranked list
- 💾 Watchlist (saved to localStorage)
- 📱 Fully responsive (mobile, tablet, desktop)
- ⌨️ Keyboard shortcuts (Esc to close, / to search)
- 🔔 Toast notifications

## 🔌 Connecting a Video Source

Edit `js/main.js` → find the `openPlayer()` function → set `embedUrl`:

```javascript
// Examples of free embed APIs:
const embedUrl = `https://vidsrc.to/embed/movie/${imdbId}`;
const embedUrl = `https://www.2embed.cc/embed/${imdbId}`;
const embedUrl = `https://multiembed.mov/?video_id=${imdbId}&tmdb=1`;

// For TV Series:
const embedUrl = `https://vidsrc.to/embed/tv/${imdbId}/${season}/${episode}`;
```

## ➕ Adding More Movies

Edit `js/data.js` and add entries to the `MOVIES` or `SERIES` array:

```javascript
{
  id: 100,                    // Unique number
  title: "Movie Title",
  year: 2024,
  rating: 8.5,
  duration: "2h 10m",
  genre: "action",            // action|comedy|drama|horror|sci-fi|thriller|romance|animation|crime
  type: "movie",              // movie | series
  desc: "Movie description",
  poster: "https://image.tmdb.org/t/p/w500/POSTER_PATH.jpg",
  backdrop: "https://image.tmdb.org/t/p/w1280/BACKDROP_PATH.jpg",
  director: "Director Name",
  cast: "Actor 1, Actor 2, Actor 3",
  tags: ["HD", "Trending", "New"]   // Optional
}
```

### Getting TMDB Images:
1. Go to https://www.themoviedb.org
2. Search for a movie
3. Right-click the poster → Copy image URL
4. Replace the path in the URL above

## 🎨 Customization

### Change site name:
Find `CineStream` in all HTML files and replace with your brand name.

### Change colors:
Edit `css/styles.css` → `:root` variables:
```css
--primary: #e50914;    /* Red accent (Netflix-style) */
--gold:    #f5c518;    /* IMDb gold for ratings */
--accent:  #00d4ff;    /* Cyan for HD badges */
--bg:      #0a0a0f;    /* Main dark background */
```

### Change logo:
Replace the `▶` icon and `CINESTREAM` text in each HTML file's `<nav>`.

## 🌐 Deployment

**Netlify (free, recommended):**
1. Go to netlify.com → New site from GitHub
2. Drag and drop the `cinestream` folder
3. Done! Live in 30 seconds.

**GitHub Pages:**
1. Push files to a GitHub repo
2. Settings → Pages → Deploy from main branch

**Vercel:**
```bash
npm i -g vercel
vercel
```

## 📡 TMDB API Integration (Advanced)

To load real movie data dynamically:
1. Get free API key at https://www.themoviedb.org/settings/api
2. Replace the static `data.js` with API calls:
```javascript
const res = await fetch(`https://api.themoviedb.org/3/movie/popular?api_key=YOUR_KEY`);
const data = await res.json();
```

## ⚠️ Legal Notice

This template is for educational/personal use. Ensure you have proper rights to stream any content. Use with legally licensed streaming APIs only.
