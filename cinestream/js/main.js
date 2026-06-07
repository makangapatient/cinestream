// CineStream — main.js (clean build)
(function() {
  'use strict';

  const $ = id => document.getElementById(id);
  const $$ = sel => document.querySelectorAll(sel);

  // Use globals set by data.js
  function getKey()  { return window.CS_API_KEY  || ''; }
  function getBase() { return window.CS_BASE_URL || 'https://api.themoviedb.org/3'; }
  function getImg()  { return window.CS_IMG_URL  || 'https://image.tmdb.org/t/p/w500'; }
  function getBack() { return window.CS_BACK_URL || 'https://image.tmdb.org/t/p/w1280'; }

  /* ====================================================
     HERO SLIDER
  ==================================================== */
  let heroIdx = 0, heroTimer = null;

  function updateHero(idx) {
    if (!HERO_ITEMS || !HERO_ITEMS.length) return;
    const item = HERO_ITEMS[idx];
    if (!item) return;
    const bg = $('heroBg');
    if (bg) bg.style.backgroundImage = `url('${item.backdrop || item.poster}')`;
    const set = (id, val) => { const e=$(id); if(e) e.textContent=val; };
    set('heroTitle',    item.title);
    set('heroDesc',     item.desc);
    set('heroRating',   '⭐ '+item.rating);
    set('heroYear',     item.year);
    set('heroDuration', item.duration||'—');
    set('heroGenre',    item.genre ? item.genre.charAt(0).toUpperCase()+item.genre.slice(1) : '');
    $$('.hero-dot').forEach((d,i) => d.classList.toggle('active', i===idx));
    const wb=$('heroWatchBtn'); if(wb) wb.onclick=()=>openPlayer(item);
    const ib=$('heroInfoBtn');  if(ib) ib.onclick=()=>openModal(item);
  }

  function startHeroTimer() {
    clearInterval(heroTimer);
    heroTimer = setInterval(() => {
      if (!HERO_ITEMS||!HERO_ITEMS.length) return;
      heroIdx = (heroIdx+1) % HERO_ITEMS.length;
      updateHero(heroIdx);
    }, 6000);
  }

  $$('.hero-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      heroIdx = parseInt(dot.dataset.idx||0);
      updateHero(heroIdx); startHeroTimer();
    });
  });

  /* ====================================================
     NAVBAR
  ==================================================== */
  window.addEventListener('scroll', () => {
    const n=$('navbar'); if(n) n.classList.toggle('scrolled', window.scrollY>60);
  }, {passive:true});

  const menuBtn=$('menuBtn'), mobileMenu=$('mobileMenu');
  if (menuBtn&&mobileMenu) {
    menuBtn.addEventListener('click', () => mobileMenu.classList.toggle('open'));
    document.addEventListener('click', e => {
      if (!e.target.closest('#menuBtn')&&!e.target.closest('#mobileMenu'))
        mobileMenu.classList.remove('open');
    });
  }

  /* ====================================================
     CARD BUILDER
  ==================================================== */
  function buildCard(item) {
    const card = document.createElement('div');
    card.className = 'movie-card';
    const isNew = item.tags?.includes('New');
    const isHot = item.tags?.includes('Trending');
    const badge = isNew ? 'NEW' : (isHot ? 'HOT' : 'HD');
    const bCls  = isNew ? 'new-badge' : '';
    card.innerHTML = `
      <img class="card-poster" src="${item.poster}" alt="${item.title}" loading="lazy"
           onerror="this.style.display='none'">
      <div class="card-overlay"></div>
      <div class="card-info">
        <div class="card-title">${item.title}</div>
        <div class="card-meta">
          <span class="card-rating">⭐ ${item.rating}</span>
          <span>${item.year||''}</span>
          ${item.type==='series'?'<span>📺</span>':''}
        </div>
      </div>
      <div class="card-play">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
      </div>
      <div class="card-badge hd ${bCls}">${badge}</div>`;
    card.addEventListener('click', () => openModal(item));
    return card;
  }
  window.buildCard = buildCard;

  /* ====================================================
     RENDER
  ==================================================== */
  function renderGrid(gridId, items, limit) {
    const grid=$(gridId); if(!grid) return;
    grid.innerHTML='';
    (limit ? items.slice(0,limit) : items).forEach(item => grid.appendChild(buildCard(item)));
  }
  window.renderGrid = renderGrid;

  function renderAll() {
    if (!ALL_CONTENT||!ALL_CONTENT.length) return;
    const trending = ALL_CONTENT.filter(m=>m.tags?.includes('Trending')).slice(0,8);
    const latest   = MOVIES.filter(m=>m.year>=2024).slice(0,10);
    const topRated = [...ALL_CONTENT].sort((a,b)=>b.rating-a.rating).slice(0,10);
    renderGrid('trendingGrid', trending.length ? trending : MOVIES.slice(0,8), 8);
    renderGrid('latestGrid',   latest.length   ? latest   : MOVIES.slice(0,10), 10);
    renderGrid('topRatedGrid', topRated, 10);
    renderGrid('seriesGrid',   SERIES.slice(0,8), 8);
  }

  /* ====================================================
     FILTER TABS (index page)
  ==================================================== */
  function updateSectionTitle(t) {
    const el=document.querySelector('#latestSection .section-title');
    if(el) el.textContent=t;
  }
  function scrollToLatest() {
    const el=$('latestSection'); if(el) el.scrollIntoView({behavior:'smooth',block:'start'});
  }

  $$('.filter-tab,.ftab').forEach(tab => {
    tab.addEventListener('click', () => {
      $$('.filter-tab,.ftab').forEach(t=>t.classList.remove('active'));
      tab.classList.add('active');
      $$('.sub-filter,.filter-panel').forEach(p=>p.classList.remove('visible'));
      const name=tab.dataset.tab;
      if (name==='popular') {
        renderGrid('latestGrid',[...ALL_CONTENT].sort((a,b)=>b.popularity-a.popularity),20);
        updateSectionTitle('🔥 Popular'); scrollToLatest();
      } else if (name==='recent') {
        renderGrid('latestGrid',[...ALL_CONTENT].sort((a,b)=>b.year-a.year),20);
        updateSectionTitle('🆕 Recent'); scrollToLatest();
      } else if (name==='genre') {
        const p=$('panel-genre')||$('sub-genre'); if(p) p.classList.add('visible');
      } else if (name==='year') {
        const p=$('panel-year')||$('sub-year'); if(p) p.classList.add('visible');
      } else if (name==='az') {
        const p=$('panel-az')||$('sub-az'); if(p) p.classList.add('visible');
      }
    });
  });

  $$('.genre-btn[data-genre]').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.genre-btn[data-genre]').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      const g=btn.dataset.genre;
      const f=g==='all'?ALL_CONTENT:ALL_CONTENT.filter(m=>m.genre===g);
      renderGrid('latestGrid',f,20);
      updateSectionTitle('🎬 '+(g==='all'?'All':g.charAt(0).toUpperCase()+g.slice(1)));
      scrollToLatest();
    });
  });

  $$('.genre-btn[data-letter]').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.genre-btn[data-letter]').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      const l=btn.dataset.letter;
      const f=l==='all'?ALL_CONTENT:ALL_CONTENT.filter(m=>m.title?.toUpperCase().startsWith(l));
      renderGrid('latestGrid',f,20);
      updateSectionTitle(l==='all'?'🔤 All':`🔤 "${l}"`);
      scrollToLatest();
    });
  });

  function buildYearButtons() {
    const panel=$('panel-year')||$('sub-year'); if(!panel) return;
    const cur=new Date().getFullYear();
    let html='<button class="genre-btn sfbtn active" data-year="all">All</button>';
    for(let y=cur+1;y>=1970;y--)
      html+=`<button class="genre-btn sfbtn" data-year="${y}">${y}</button>`;
    panel.innerHTML=html;
    panel.querySelectorAll('[data-year]').forEach(btn => {
      btn.addEventListener('click', () => {
        panel.querySelectorAll('[data-year]').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        const yr=btn.dataset.year;
        const f=yr==='all'?ALL_CONTENT:ALL_CONTENT.filter(m=>String(m.year)===yr);
        renderGrid('latestGrid',f,20);
        updateSectionTitle('📅 '+(yr==='all'?'All Years':yr));
        scrollToLatest();
      });
    });
  }

  /* ====================================================
     LIVE SEARCH — searches TMDB directly
  ==================================================== */
  const searchInput=$('searchInput'), searchDropdown=$('searchDropdown');

  if (searchInput&&searchDropdown) {
    let searchTimer=null;

    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimer);
      const q=searchInput.value.trim();
      if (q.length<2) { searchDropdown.classList.remove('open'); return; }
      searchTimer=setTimeout(() => doSearch(q), 400);
    });

    async function doSearch(q) {
      const KEY=getKey(), BASE=getBase(), IMG=getImg(), BACK=getBack();

      if (!KEY) {
        searchDropdown.innerHTML='<div style="padding:14px;text-align:center;color:#7a7a90;font-size:13px">API key not set</div>';
        searchDropdown.classList.add('open');
        return;
      }

      try {
        const [movRes,tvRes]=await Promise.all([
          fetch(`${BASE}/search/movie?api_key=${KEY}&query=${encodeURIComponent(q)}&page=1`)
            .then(r=>r.json()).catch(()=>({results:[]})),
          fetch(`${BASE}/search/tv?api_key=${KEY}&query=${encodeURIComponent(q)}&page=1`)
            .then(r=>r.json()).catch(()=>({results:[]})),
        ]);

        const movies=(movRes.results||[]).filter(m=>m.poster_path).slice(0,5).map(m=>({
          id:m.id, title:m.title,
          year:m.release_date?.slice(0,4)||'—',
          rating:Math.round((m.vote_average||0)*10)/10,
          type:'movie',
          genre:getGenreName(m.genre_ids?.[0]),
          desc:m.overview||'',
          poster:IMG+m.poster_path,
          backdrop:m.backdrop_path?BACK+m.backdrop_path:IMG+m.poster_path,
          tags:['HD'], duration:'—', popularity:m.popularity||0,
        }));

        const shows=(tvRes.results||[]).filter(s=>s.poster_path).slice(0,3).map(s=>({
          id:s.id, title:s.name,
          year:s.first_air_date?.slice(0,4)||'—',
          rating:Math.round((s.vote_average||0)*10)/10,
          type:'series',
          genre:getGenreName(s.genre_ids?.[0]),
          desc:s.overview||'',
          poster:IMG+s.poster_path,
          backdrop:s.backdrop_path?BACK+s.backdrop_path:IMG+s.poster_path,
          tags:['HD','Series'], duration:'—', popularity:s.popularity||0,
        }));

        const results=[...movies,...shows].slice(0,8);

        // Add to local cache so modal works
        results.forEach(item=>{
          if(!ALL_CONTENT.find(x=>x.id===item.id&&x.type===item.type)){
            ALL_CONTENT.push(item);
            if(item.type==='movie') MOVIES.push(item);
            else SERIES.push(item);
          }
        });

        if (!results.length) {
          searchDropdown.innerHTML='<div style="padding:14px;text-align:center;color:#7a7a90;font-size:13px">No results found for "'+q+'"</div>';
          searchDropdown.classList.add('open');
          return;
        }

        searchDropdown.innerHTML=results.map(m=>`
          <div class="search-result-item" data-id="${m.id}" data-type="${m.type}">
            <img src="${m.poster}" alt="${m.title}" onerror="this.style.display='none'">
            <div class="search-result-info">
              <strong>${m.title}</strong>
              <span>⭐${m.rating} · ${m.year} · ${m.genre}
                <span style="color:${m.type==='series'?'#00d4ff':'#e50914'};font-size:10px;font-weight:700;margin-left:4px">
                  ${m.type==='series'?'📺 SERIES':'🎬 MOVIE'}
                </span>
              </span>
            </div>
          </div>`).join('');
        searchDropdown.classList.add('open');

        searchDropdown.querySelectorAll('.search-result-item').forEach(el=>{
          el.addEventListener('click', ()=>{
            const item=ALL_CONTENT.find(m=>m.id===parseInt(el.dataset.id)&&m.type===el.dataset.type);
            if(item){openModal(item);searchDropdown.classList.remove('open');searchInput.value='';}
          });
        });

      } catch(e){console.error('Search error:',e);}
    }

    document.addEventListener('click', e=>{
      if(!e.target.closest('.search-wrap')) searchDropdown.classList.remove('open');
    });
    const sb=$('searchBtn');
    if(sb) sb.addEventListener('click',()=>{ if(searchInput.value.trim().length>1) doSearch(searchInput.value.trim()); });
    searchInput.addEventListener('keydown',e=>{
      if(e.key==='Enter'&&searchInput.value.trim().length>1) doSearch(searchInput.value.trim());
    });
  }

  /* ====================================================
     MODAL
  ==================================================== */
  function openModal(item) {
    const overlay=$('modalOverlay'); if(!overlay) return;
    const set=(id,val)=>{ const e=$(id); if(e) e.textContent=val; };
    const setH=(id,val)=>{ const e=$(id); if(e) e.innerHTML=val; };

    const bd=$('modalBackdrop'); if(bd) bd.src=item.backdrop||item.poster||'';
    set('modalTitle',item.title); set('modalDesc',item.desc||'');

    setH('modalBadges',`
      <span class="badge badge-hd">HD</span>
      <span class="badge badge-free">FREE</span>
      ${item.type==='series'?'<span class="badge" style="background:rgba(255,255,255,.15)">SERIES</span>':''}`);

    const wl=JSON.parse(localStorage.getItem('cs_watchlist')||'[]');
    const inWl=wl.includes(item.id);
    const wBtn=$('modalWatchlistBtn');
    if(wBtn){
      wBtn.textContent=inWl?'✓ In Watchlist':'+ Watchlist';
      wBtn.className='btn-watchlist'+(inWl?' added':'');
      wBtn.onclick=()=>toggleWatchlist(item.id,wBtn);
    }

    setH('modalMeta',`
      <span style="color:#f5c518;font-weight:600">⭐ ${item.rating}</span>
      <span>${item.year||'—'}</span>
      <span>${item.duration||'—'}</span>
      <span style="text-transform:capitalize">${item.genre||'—'}</span>
      ${item.seasons?`<span>${item.seasons} Season${item.seasons>1?'s':''}</span>`:''}`);

    setH('modalDetails',`
      <div class="detail-row"><span class="detail-label">Genre</span><span class="detail-val" style="text-transform:capitalize">${item.genre||'—'}</span></div>
      <div class="detail-row"><span class="detail-label">Year</span><span class="detail-val">${item.year||'—'}</span></div>
      <div class="detail-row"><span class="detail-label">Rating</span><span class="detail-val">⭐ ${item.rating}/10</span></div>
      <div class="detail-row"><span class="detail-label">Quality</span><span class="detail-val" style="color:var(--accent)">HD 1080p</span></div>
      <div class="detail-row"><span class="detail-label">Type</span><span class="detail-val" style="text-transform:capitalize">${item.type}</span></div>`);

    const related=ALL_CONTENT
      .filter(m=>m.genre===item.genre&&m.id!==item.id&&m.poster)
      .sort(()=>Math.random()-0.5).slice(0,4);

    const rg=$('relatedGrid');
    if(rg){
      rg.innerHTML=related.map(m=>`
        <div class="related-card" data-id="${m.id}" data-type="${m.type}">
          <img src="${m.poster}" alt="${m.title}" loading="lazy" onerror="this.style.opacity=0">
          <div class="related-card-title">${m.title}</div>
        </div>`).join('');
      rg.querySelectorAll('.related-card').forEach(el=>{
        el.addEventListener('click',()=>{
          const rel=ALL_CONTENT.find(m=>m.id===parseInt(el.dataset.id)&&m.type===el.dataset.type);
          if(rel) openModal(rel);
        });
      });
    }

    const mwb=$('modalWatchBtn'); if(mwb) mwb.onclick=()=>{closeModal();openPlayer(item);};
    const mtb=$('modalTrailerBtn'); if(mtb) mtb.onclick=()=>showToast('🎬 Trailer — coming soon');

    overlay.classList.add('open');
    document.body.style.overflow='hidden';
  }

  function closeModal(){
    const o=$('modalOverlay'); if(o) o.classList.remove('open');
    document.body.style.overflow='';
  }

  const mc=$('modalClose'); if(mc) mc.addEventListener('click',closeModal);
  const mo=$('modalOverlay');
  if(mo) mo.addEventListener('click',e=>{if(e.target===mo)closeModal();});

  /* ====================================================
     WATCHLIST
  ==================================================== */
  function toggleWatchlist(id,btn){
    const wl=JSON.parse(localStorage.getItem('cs_watchlist')||'[]');
    const idx=wl.indexOf(id);
    if(idx===-1){
      wl.push(id);
      if(btn){btn.textContent='✓ In Watchlist';btn.classList.add('added');}
      showToast('✅ Added to Watchlist');
    } else {
      wl.splice(idx,1);
      if(btn){btn.textContent='+ Watchlist';btn.classList.remove('added');}
      showToast('Removed from Watchlist');
    }
    localStorage.setItem('cs_watchlist',JSON.stringify(wl));
    updateWatchlistCount();
  }

  function updateWatchlistCount(){
    const wl=JSON.parse(localStorage.getItem('cs_watchlist')||'[]');
    const c=$('wlCount'); if(c) c.textContent=wl.length;
  }
  updateWatchlistCount();

  const navWl=$('navWatchlist');
  if(navWl){
    navWl.addEventListener('click',()=>{
      const wl=JSON.parse(localStorage.getItem('cs_watchlist')||'[]');
      const items=ALL_CONTENT.filter(m=>wl.includes(m.id));
      if(!items.length){showToast('Your watchlist is empty');return;}
      const div=document.createElement('div');
      div.id='wlOverlay';
      div.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:5000;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(6px)';
      div.innerHTML=`
        <div style="background:#16161f;border-radius:16px;max-width:700px;width:100%;max-height:80vh;overflow-y:auto;padding:24px;border:1px solid rgba(255,255,255,.08)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
            <h2 style="font-family:'Bebas Neue',sans-serif;font-size:24px;letter-spacing:1.5px;color:#fff">❤️ MY WATCHLIST</h2>
            <button onclick="document.getElementById('wlOverlay').remove()"
              style="width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.1);color:#fff;font-size:16px;border:none;cursor:pointer">✕</button>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:12px">
            ${items.map(m=>`
              <div style="cursor:pointer;border-radius:8px;overflow:hidden;position:relative" data-wlid="${m.id}" data-wltype="${m.type}">
                <img src="${m.poster}" style="width:100%;aspect-ratio:2/3;object-fit:cover;display:block;background:#1a1a24">
                <div style="position:absolute;bottom:0;left:0;right:0;padding:6px;background:linear-gradient(transparent,rgba(0,0,0,.9));font-size:11px;font-weight:600;color:#fff">${m.title}</div>
              </div>`).join('')}
          </div>
        </div>`;
      document.body.appendChild(div);
      div.querySelectorAll('[data-wlid]').forEach(el=>{
        el.addEventListener('click',()=>{
          const item=ALL_CONTENT.find(m=>m.id===parseInt(el.dataset.wlid)&&m.type===el.dataset.wltype);
          if(item){div.remove();openModal(item);}
        });
      });
      div.addEventListener('click',e=>{if(e.target===div)div.remove();});
    });
  }

  /* ====================================================
     PLAYER — Auto Server Detection
  ==================================================== */
  let currentItem=null, currentSeason=1, currentEpisode=1, currentUrl='', uiHideTimer=null;

  const SERVERS={
    movie:[
      {name:'vidsrc.me',  url:id=>`https://vidsrc.me/embed/movie?tmdb=${id}`},
      {name:'vidsrc.cc',  url:id=>`https://vidsrc.cc/v2/embed/movie/${id}`},
      {name:'autoembed',  url:id=>`https://player.autoembed.cc/embed/movie/${id}`},
      {name:'2embed',     url:id=>`https://www.2embed.cc/embed/${id}`},
      {name:'multiembed', url:id=>`https://multiembed.mov/?video_id=${id}&tmdb=1`},
      {name:'embed.su',   url:id=>`https://embed.su/embed/movie/${id}`},
      {name:'moviesapi',  url:id=>`https://moviesapi.club/movie/${id}`},
    ],
    series:[
      {name:'vidsrc.me',  url:(id,s,e)=>`https://vidsrc.me/embed/tv?tmdb=${id}&season=${s}&episode=${e}`},
      {name:'vidsrc.cc',  url:(id,s,e)=>`https://vidsrc.cc/v2/embed/tv/${id}/${s}/${e}`},
      {name:'autoembed',  url:(id,s,e)=>`https://player.autoembed.cc/embed/tv/${id}/${s}/${e}`},
      {name:'2embed',     url:(id,s,e)=>`https://www.2embed.cc/embedtv/${id}&s=${s}&e=${e}`},
      {name:'multiembed', url:(id,s,e)=>`https://multiembed.mov/?video_id=${id}&tmdb=1&s=${s}&e=${e}`},
      {name:'embed.su',   url:(id,s,e)=>`https://embed.su/embed/tv/${id}/${s}/${e}`},
    ],
  };

  function openPlayer(item,season,episode){
    currentItem=item; currentSeason=season||1; currentEpisode=episode||1;
    const pt=$('playerTitle'); if(pt) pt.textContent=item.title;
    const bc=$('breadcrumbHome');
    if(bc) bc.onclick=e=>{e.preventDefault();closePlayer();window.scrollTo({top:0,behavior:'smooth'});};
    const ov=$('playerOverlay');
    if(ov){ov.classList.add('open');document.body.style.overflow='hidden';}
    resetUiTimer();

    const screen=$('playerScreen'); if(!screen) return;

    // Check cache
    const cKey=`${item.type}_${item.id}_${currentSeason}_${currentEpisode}`;
    const cache=JSON.parse(localStorage.getItem('cs_server_cache')||'{}');
    if(cache[cKey]&&Date.now()-cache[cKey].timestamp<1000*60*60*6){
      loadServer(cache[cKey].url,cache[cKey].name); return;
    }

    // Show loading spinner
    screen.innerHTML=`
      <div style="text-align:center;color:#fff;padding:20px">
        <div style="width:52px;height:52px;border:3px solid rgba(255,255,255,.1);
          border-top-color:#e50914;border-radius:50%;
          animation:spin .8s linear infinite;margin:0 auto 20px"></div>
        <div style="font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:2px;margin-bottom:8px">${item.title}</div>
        <div id="serverStatus" style="font-size:13px;color:#7a7a90">Finding best server...</div>
      </div>`;

    const setStatus=msg=>{const el=$('serverStatus');if(el)el.textContent=msg;};
    const servers=SERVERS[item.type==='series'?'series':'movie'];
    let tried=0, loaded=false;

    function tryNext(){
      if(tried>=servers.length||loaded){
        if(!loaded){
          screen.innerHTML=`
            <div style="text-align:center;color:#fff;padding:20px">
              <div style="font-size:48px;margin-bottom:16px">😔</div>
              <div style="font-size:20px;margin-bottom:12px">No Working Server Found</div>
              <p style="color:#7a7a90;margin-bottom:20px">All servers unavailable. Try again later.</p>
              <button onclick="openPlayer(currentItem,currentSeason,currentEpisode)"
                style="padding:10px 24px;background:#e50914;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer">
                🔄 Retry
              </button>
            </div>`;
        }
        return;
      }

      const server=servers[tried];
      const url=item.type==='series'
        ?server.url(item.id,currentSeason,currentEpisode)
        :server.url(item.id);
      tried++;
      setStatus(`Testing ${server.name}... (${tried}/${servers.length})`);

      const tf=document.createElement('iframe');
      tf.style.cssText='position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;top:-9999px;left:-9999px';
      tf.src=url;
      const timer=setTimeout(()=>{tf.remove();tryNext();},5000);
      tf.onload=()=>{
        clearTimeout(timer); tf.remove();
        if(!loaded){
          loaded=true;
          cache[cKey]={url,name:server.name,timestamp:Date.now()};
          localStorage.setItem('cs_server_cache',JSON.stringify(cache));
          loadServer(url,server.name);
        }
      };
      tf.onerror=()=>{clearTimeout(timer);tf.remove();tryNext();};
      document.body.appendChild(tf);
    }
    tryNext();
  }

  function loadServer(url,name){
    currentUrl=url;
    const screen=$('playerScreen'); if(!screen) return;
    screen.innerHTML=`
      <iframe src="${url}"
        allowfullscreen
        allow="autoplay;fullscreen;picture-in-picture;encrypted-media"
        referrerpolicy="no-referrer"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation allow-pointer-lock"
        style="width:100%;height:100%;border:none">
      </iframe>`;
    const i=$('serverIndicator');  if(i){i.textContent=`▶ ${name}`;i.style.display='inline-flex';}
    const i2=$('serverIndicator2');if(i2) i2.textContent=`▶ ${name}`;
  }

  const playerRetry=$('playerRetry');
  if(playerRetry){
    playerRetry.addEventListener('click',()=>{
      if(!currentItem) return;
      const cache=JSON.parse(localStorage.getItem('cs_server_cache')||'{}');
      delete cache[`${currentItem.type}_${currentItem.id}_${currentSeason}_${currentEpisode}`];
      localStorage.setItem('cs_server_cache',JSON.stringify(cache));
      openPlayer(currentItem,currentSeason,currentEpisode);
      showToast('🔄 Trying next server...');
    });
  }

  function resetUiTimer(){
    const ov=$('playerOverlay'); if(!ov) return;
    ov.classList.remove('hide-ui');
    clearTimeout(uiHideTimer);
    uiHideTimer=setTimeout(()=>ov.classList.add('hide-ui'),4000);
  }

  function toggleFullscreen(){
    const el=$('playerOverlay'); if(!el) return;
    if(!document.fullscreenElement) el.requestFullscreen().catch(()=>showToast('Fullscreen not supported'));
    else document.exitFullscreen();
  }

  document.addEventListener('fullscreenchange',()=>{
    const btn=$('playerFullscreen');
    if(btn) btn.innerHTML=document.fullscreenElement?'⊠ Exit':'⛶ Fullscreen';
  });

  function closePlayer(){
    const ov=$('playerOverlay'),sc=$('playerScreen');
    if(ov) ov.classList.remove('open','hide-ui');
    if(sc) sc.innerHTML='';
    clearTimeout(uiHideTimer);
    if(document.fullscreenElement) document.exitFullscreen();
    document.body.style.overflow='';
    currentItem=null; currentUrl='';
  }

  const pc=$('playerClose'); if(pc) pc.addEventListener('click',closePlayer);
  const po=$('playerOverlay');
  if(po){
    po.addEventListener('click',e=>{if(e.target===po)closePlayer();});
    po.addEventListener('mousemove',resetUiTimer);
    po.addEventListener('touchstart',resetUiTimer,{passive:true});
  }
  const pf=$('playerFullscreen'); if(pf) pf.addEventListener('click',toggleFullscreen);
  const pp=$('playerPip'); if(pp) pp.onclick=()=>showToast('📺 Use browser PiP button');

  /* ====================================================
     TOAST
  ==================================================== */
  let toastTimer;
  function showToast(msg){
    const t=$('toast'); if(!t) return;
    t.textContent=msg; t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer=setTimeout(()=>t.classList.remove('show'),3200);
  }

  /* ====================================================
     KEYBOARD
  ==================================================== */
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){closeModal();closePlayer();}
    if(e.key==='f'&&po?.classList.contains('open')) toggleFullscreen();
    if(e.key==='/'&&!e.target.matches('input,textarea')){e.preventDefault();searchInput?.focus();}
  });

  /* ====================================================
     NAV DATA-PAGE LINKS
  ==================================================== */
  document.addEventListener('click',e=>{
    const link=e.target.closest('[data-page]'); if(!link) return;
    e.preventDefault();
    const page=link.dataset.page;
    let items=ALL_CONTENT, title='🎬 All';
    if(page==='movies')  {items=MOVIES;title='🎬 Movies';}
    if(page==='series')  {items=SERIES;title='📺 TV Series';}
    if(page==='trending'){items=ALL_CONTENT.filter(m=>m.tags?.includes('Trending'));title='🔥 Trending';}
    if(page==='top250')  {items=[...ALL_CONTENT].sort((a,b)=>b.rating-a.rating);title='⭐ Top Rated';}
    renderGrid('latestGrid',items,24);
    updateSectionTitle(title);
    const ts=$('trendingSection');if(ts&&page!=='all')ts.style.display='none';
    $$('.nav-link').forEach(l=>l.classList.remove('active'));
    link.classList.add('active');
    if(mobileMenu) mobileMenu.classList.remove('open');
    scrollToLatest();
  });

  /* ====================================================
     BOOT
  ==================================================== */
  function bootApp(){
    console.log('🚀 Boot:',MOVIES.length,'movies,',SERIES.length,'series,',HERO_ITEMS.length,'hero');
    buildYearButtons();
    renderAll();
    if(HERO_ITEMS&&HERO_ITEMS.length){updateHero(0);startHeroTimer();}
    updateWatchlistCount();
  }

  if(window.__dataReady) bootApp();
  else document.addEventListener('dataReady', bootApp);

})();
