// CineStream — main.js (clean build v3)
(function() {
  'use strict';

  const $ = id => document.getElementById(id);
  const $$ = sel => document.querySelectorAll(sel);

  function getKey()  { return window.CS_API_KEY  || ''; }
  function getBase() { return window.CS_BASE_URL || 'https://api.themoviedb.org/3'; }
  function getImg()  { return window.CS_IMG_URL  || 'https://image.tmdb.org/t/p/w500'; }
  function getBack() { return window.CS_BACK_URL || 'https://image.tmdb.org/t/p/w1280'; }

  /* ====================================================
     HERO SLIDER
  ==================================================== */
  let heroIdx = 0, heroTimer = null;

  function updateHero(idx) {
    if (!window.HERO_ITEMS || !HERO_ITEMS.length) return;
    const item = HERO_ITEMS[idx]; if (!item) return;
    const bg = $('heroBg');
    if (bg) bg.style.backgroundImage = `url('${item.backdrop || item.poster}')`;
    const set = (id, val) => { const e=$(id); if(e) e.textContent=val; };
    set('heroTitle',    item.title);
    set('heroDesc',     item.desc);
    set('heroRating',   '⭐ '+item.rating);
    set('heroYear',     item.year);
    set('heroDuration', item.duration||'—');
    set('heroGenre',    item.genre
      ? item.genre.charAt(0).toUpperCase()+item.genre.slice(1) : '');
    $$('.hero-dot').forEach((d,i)=>d.classList.toggle('active',i===idx));
    const wb=$('heroWatchBtn'); if(wb) wb.onclick=()=>openPlayer(item);
    const ib=$('heroInfoBtn');  if(ib) ib.onclick=()=>openModal(item);
  }

  function startHeroTimer() {
    clearInterval(heroTimer);
    heroTimer = setInterval(()=>{
      if(!HERO_ITEMS||!HERO_ITEMS.length) return;
      heroIdx = (heroIdx+1)%HERO_ITEMS.length;
      updateHero(heroIdx);
    }, 6000);
  }

  $$('.hero-dot').forEach(dot=>{
    dot.addEventListener('click',()=>{
      heroIdx=parseInt(dot.dataset.idx||0);
      updateHero(heroIdx); startHeroTimer();
    });
  });

  /* ====================================================
     NAVBAR
  ==================================================== */
  window.addEventListener('scroll',()=>{
    const n=$('navbar'); if(n) n.classList.toggle('scrolled',window.scrollY>60);
  },{passive:true});

  const menuBtn=$('menuBtn'), mobileMenu=$('mobileMenu');
  if (menuBtn&&mobileMenu) {
    menuBtn.addEventListener('click',()=>mobileMenu.classList.toggle('open'));
    document.addEventListener('click',e=>{
      if(!e.target.closest('#menuBtn')&&!e.target.closest('#mobileMenu'))
        mobileMenu.classList.remove('open');
    });
  }

  /* ====================================================
     CARD BUILDER
  ==================================================== */
  function buildCard(item) {
    const card = document.createElement('div');
    card.className = 'movie-card';
    const badge = item.tags?.includes('New')
      ?'NEW':item.tags?.includes('Trending')?'HOT':'HD';
    const bCls = item.tags?.includes('New')?'new-badge':'';
    card.innerHTML = `
      <img class="card-poster" src="${item.poster}" alt="${item.title}"
        loading="lazy" onerror="this.style.display='none'">
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
        <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
          <path d="M8 5v14l11-7z"/>
        </svg>
      </div>
      <div class="card-badge hd ${bCls}">${badge}</div>`;
    card.addEventListener('click',()=>openModal(item));
    return card;
  }
  window.buildCard = buildCard;

  /* ====================================================
     RENDER SECTIONS
  ==================================================== */
  function renderGrid(gridId, items, limit) {
    const grid=$(gridId); if(!grid) return;
    grid.innerHTML='';
    (limit?items.slice(0,limit):items).forEach(item=>grid.appendChild(buildCard(item)));
  }
  window.renderGrid = renderGrid;

  function renderAll() {
    if (!window.ALL_CONTENT||!ALL_CONTENT.length) return;
    const trending=ALL_CONTENT.filter(m=>m.tags?.includes('Trending')).slice(0,8);
    const latest=MOVIES.filter(m=>m.year>=2024).slice(0,10);
    const topRated=[...ALL_CONTENT].sort((a,b)=>b.rating-a.rating).slice(0,10);
    renderGrid('trendingGrid',trending.length?trending:MOVIES.slice(0,8),8);
    renderGrid('latestGrid',  latest.length?latest:MOVIES.slice(0,10),10);
    renderGrid('topRatedGrid',topRated,10);
    renderGrid('seriesGrid',  SERIES.slice(0,8),8);
  }

  /* ====================================================
     FILTER TABS + SUB-PANELS
  ==================================================== */
  function updateSectionTitle(t){
    const el=document.querySelector('#latestSection .section-title');
    if(el) el.textContent=t;
  }
  function scrollToLatest(){
    const el=$('latestSection');
    if(el) el.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function hideAllPanels(){
    ['panel-genre','panel-year','panel-az',
     'sub-genre','sub-year','sub-az'].forEach(id=>{
      const el=$(id); if(el) el.classList.remove('visible');
    });
  }

  function showPanel(id){
    const el=$(id); if(el) el.classList.add('visible');
  }

  // Bind filter tabs (works with both .ftab and .filter-tab classes)
  document.addEventListener('click', e => {
    const tab = e.target.closest('.ftab, .filter-tab');
    if (!tab || !tab.dataset.tab) return;

    // Deactivate all tabs
    $$('.ftab, .filter-tab').forEach(t=>t.classList.remove('active'));
    tab.classList.add('active');
    hideAllPanels();

    const name = tab.dataset.tab;

    if (name==='popular') {
      const sorted=[...ALL_CONTENT].sort((a,b)=>b.popularity-a.popularity);
      renderGrid('latestGrid',sorted,20);
      updateSectionTitle('🔥 Popular');
      scrollToLatest();
    }
    else if (name==='recent') {
      const sorted=[...ALL_CONTENT].sort((a,b)=>b.year-a.year);
      renderGrid('latestGrid',sorted,20);
      updateSectionTitle('🆕 Recent');
      scrollToLatest();
    }
    else if (name==='genre') {
      showPanel('panel-genre') || showPanel('sub-genre');
      const p=$('panel-genre')||$('sub-genre');
      if(p) p.classList.add('visible');
    }
    else if (name==='year') {
      const p=$('panel-year')||$('sub-year');
      if(p) p.classList.add('visible');
    }
    else if (name==='az') {
      const p=$('panel-az')||$('sub-az');
      if(p) p.classList.add('visible');
    }
  });

  // Genre buttons (delegated)
  document.addEventListener('click', e => {
    const btn = e.target.closest('.genre-btn[data-genre]');
    if (!btn) return;
    const panel = btn.closest('.sub-filter');
    if (panel) panel.querySelectorAll('.genre-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const g = btn.dataset.genre;
    const f = g==='all' ? ALL_CONTENT : ALL_CONTENT.filter(m=>m.genre===g);
    renderGrid('latestGrid',f,20);
    updateSectionTitle('🎬 '+(g==='all'?'All':g.charAt(0).toUpperCase()+g.slice(1)));
    scrollToLatest();
  });

  // A-Z buttons (delegated)
  document.addEventListener('click', e => {
    const btn = e.target.closest('.genre-btn[data-letter]');
    if (!btn) return;
    const panel = btn.closest('.sub-filter');
    if (panel) panel.querySelectorAll('.genre-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const l = btn.dataset.letter;
    const f = l==='all' ? ALL_CONTENT
      : l==='#' ? ALL_CONTENT.filter(m=>/^[0-9]/.test(m.title))
      : ALL_CONTENT.filter(m=>m.title?.toUpperCase().startsWith(l));
    renderGrid('latestGrid',f,20);
    updateSectionTitle(l==='all'?'🔤 All Titles':`🔤 Titles: "${l}"`);
    scrollToLatest();
  });

  /* ====================================================
     YEAR BUTTONS (built dynamically)
  ==================================================== */
  function buildYearButtons() {
    const panel = $('panel-year') || $('sub-year');
    if (!panel) return;

    const cur = new Date().getFullYear();
    let html = '<button class="sfbtn genre-btn active" data-year="all">All</button>';
    for (let y = cur+1; y >= 1970; y--)
      html += `<button class="sfbtn genre-btn" data-year="${y}">${y}</button>`;
    panel.innerHTML = html;

    // Year button click (delegated — will be caught by doc listener)
    panel.addEventListener('click', e => {
      const btn = e.target.closest('[data-year]');
      if (!btn) return;
      panel.querySelectorAll('[data-year]').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      const yr = btn.dataset.year;
      const f = yr==='all' ? ALL_CONTENT
        : ALL_CONTENT.filter(m=>String(m.year)===yr);
      renderGrid('latestGrid',f,20);
      updateSectionTitle('📅 '+(yr==='all'?'All Years':yr));
      scrollToLatest();
    });
  }

  /* ====================================================
     LIVE SEARCH
  ==================================================== */
  const searchInput=$('searchInput'), searchDropdown=$('searchDropdown');

  if (searchInput&&searchDropdown) {
    let searchTimer=null;

    async function doSearch(q) {
      const KEY=getKey(),BASE=getBase(),IMG=getImg(),BACK=getBack();
      if (!KEY) {
        searchDropdown.innerHTML='<div style="padding:14px;text-align:center;color:#7a7a90;font-size:13px">API key not set in data.js</div>';
        searchDropdown.classList.add('open'); return;
      }
      try {
        const [movRes,tvRes] = await Promise.all([
          fetch(`${BASE}/search/movie?api_key=${KEY}&query=${encodeURIComponent(q)}&page=1`)
            .then(r=>r.json()).catch(()=>({results:[]})),
          fetch(`${BASE}/search/tv?api_key=${KEY}&query=${encodeURIComponent(q)}&page=1`)
            .then(r=>r.json()).catch(()=>({results:[]})),
        ]);

        const movies=(movRes.results||[]).filter(m=>m.poster_path).slice(0,5).map(m=>({
          id:m.id,title:m.title,year:m.release_date?.slice(0,4)||'—',
          rating:Math.round((m.vote_average||0)*10)/10,type:'movie',
          genre:getGenreName(m.genre_ids?.[0]),desc:m.overview||'',
          poster:IMG+m.poster_path,
          backdrop:m.backdrop_path?BACK+m.backdrop_path:IMG+m.poster_path,
          tags:['HD'],duration:'—',popularity:m.popularity||0,
        }));
        const shows=(tvRes.results||[]).filter(s=>s.poster_path).slice(0,3).map(s=>({
          id:s.id,title:s.name,year:s.first_air_date?.slice(0,4)||'—',
          rating:Math.round((s.vote_average||0)*10)/10,type:'series',
          genre:getGenreName(s.genre_ids?.[0]),desc:s.overview||'',
          poster:IMG+s.poster_path,
          backdrop:s.backdrop_path?BACK+s.backdrop_path:IMG+s.poster_path,
          tags:['HD','Series'],duration:'—',popularity:s.popularity||0,
        }));

        const results=[...movies,...shows].slice(0,8);
        results.forEach(item=>{
          if(!ALL_CONTENT.find(x=>x.id===item.id&&x.type===item.type)){
            ALL_CONTENT.push(item);
            if(item.type==='movie') MOVIES.push(item); else SERIES.push(item);
          }
        });

        if (!results.length) {
          searchDropdown.innerHTML=`<div style="padding:14px;text-align:center;color:#7a7a90;font-size:13px">No results for "${q}"</div>`;
          searchDropdown.classList.add('open'); return;
        }

        searchDropdown.innerHTML=results.map(m=>`
          <div class="search-result-item" data-id="${m.id}" data-type="${m.type}">
            <img src="${m.poster}" alt="${m.title}" onerror="this.style.display='none'">
            <div class="search-result-info">
              <strong>${m.title}</strong>
              <span>⭐${m.rating} · ${m.year}
                <span style="color:${m.type==='series'?'#00d4ff':'#e50914'};font-size:10px;font-weight:700;margin-left:4px">
                  ${m.type==='series'?'📺 SERIES':'🎬 MOVIE'}
                </span>
              </span>
            </div>
          </div>`).join('');
        searchDropdown.classList.add('open');

        searchDropdown.querySelectorAll('.search-result-item').forEach(el=>{
          el.addEventListener('click',()=>{
            const item=ALL_CONTENT.find(m=>m.id===parseInt(el.dataset.id)&&m.type===el.dataset.type);
            if(item){openModal(item);searchDropdown.classList.remove('open');searchInput.value='';}
          });
        });
      } catch(e){console.error('Search error:',e);}
    }

    searchInput.addEventListener('input',()=>{
      clearTimeout(searchTimer);
      const q=searchInput.value.trim();
      if(q.length<2){searchDropdown.classList.remove('open');return;}
      searchTimer=setTimeout(()=>doSearch(q),400);
    });
    document.addEventListener('click',e=>{
      if(!e.target.closest('.search-wrap')) searchDropdown.classList.remove('open');
    });
    const sb=$('searchBtn');
    if(sb) sb.addEventListener('click',()=>{
      if(searchInput.value.trim().length>1) doSearch(searchInput.value.trim());
    });
    searchInput.addEventListener('keydown',e=>{
      if(e.key==='Enter'&&searchInput.value.trim().length>1)
        doSearch(searchInput.value.trim());
    });
  }

  /* ====================================================
     MODAL
  ==================================================== */
  function openModal(item) {
    const overlay=$('modalOverlay'); if(!overlay) return;
    const set=(id,val)=>{const e=$(id);if(e)e.textContent=val;};
    const setH=(id,val)=>{const e=$(id);if(e)e.innerHTML=val;};

    const bd=$('modalBackdrop');if(bd)bd.src=item.backdrop||item.poster||'';
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
      <div class="detail-row"><span class="detail-label">Genre</span>
        <span class="detail-val" style="text-transform:capitalize">${item.genre||'—'}</span></div>
      <div class="detail-row"><span class="detail-label">Year</span>
        <span class="detail-val">${item.year||'—'}</span></div>
      <div class="detail-row"><span class="detail-label">Rating</span>
        <span class="detail-val">⭐ ${item.rating}/10</span></div>
      <div class="detail-row"><span class="detail-label">Quality</span>
        <span class="detail-val" style="color:var(--accent)">Auto HD</span></div>
      <div class="detail-row"><span class="detail-label">Type</span>
        <span class="detail-val" style="text-transform:capitalize">${item.type}</span></div>`);

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
    const mwb=$('modalWatchBtn');
    if(mwb) mwb.onclick=()=>{closeModal();openPlayer(item);};
    overlay.classList.add('open');
    document.body.style.overflow='hidden';
  }

  function closeModal(){
    const o=$('modalOverlay');if(o)o.classList.remove('open');
    document.body.style.overflow='';
  }
  const mc=$('modalClose');if(mc)mc.addEventListener('click',closeModal);
  const mo=$('modalOverlay');
  if(mo)mo.addEventListener('click',e=>{if(e.target===mo)closeModal();});

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
    const c=$('wlCount');if(c)c.textContent=wl.length;
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
              <div style="cursor:pointer;border-radius:8px;overflow:hidden;position:relative"
                data-wlid="${m.id}" data-wltype="${m.type}">
                <img src="${m.poster}" style="width:100%;aspect-ratio:2/3;object-fit:cover;display:block;background:#1a1a24">
                <div style="position:absolute;bottom:0;left:0;right:0;padding:6px;
                  background:linear-gradient(transparent,rgba(0,0,0,.9));
                  font-size:11px;font-weight:600;color:#fff">${m.title}</div>
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
     TOAST
  ==================================================== */
  let toastTimer;
  function showToast(msg){
    const t=$('toast');if(!t)return;
    t.textContent=msg;t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer=setTimeout(()=>t.classList.remove('show'),3200);
  }

  /* ====================================================
     KEYBOARD
  ==================================================== */
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){closeModal();window.CSPlayer?.close();}
    if(e.key==='/'&&!e.target.matches('input,textarea'))
      {e.preventDefault();searchInput?.focus();}
  });

  /* ====================================================
     NAV DATA-PAGE LINKS
  ==================================================== */
  document.addEventListener('click',e=>{
    const link=e.target.closest('[data-page]');if(!link)return;
    e.preventDefault();
    const page=link.dataset.page;
    let items=ALL_CONTENT,title='🎬 All';
    if(page==='movies')  {items=MOVIES;title='🎬 Movies';}
    if(page==='series')  {items=SERIES;title='📺 TV Series';}
    if(page==='trending'){items=ALL_CONTENT.filter(m=>m.tags?.includes('Trending'));title='🔥 Trending';}
    if(page==='top250')  {items=[...ALL_CONTENT].sort((a,b)=>b.rating-a.rating);title='⭐ Top Rated';}
    renderGrid('latestGrid',items,24);
    updateSectionTitle(title);
    const ts=$('trendingSection');if(ts)ts.style.display='none';
    $$('.nav-link').forEach(l=>l.classList.remove('active'));
    link.classList.add('active');
    if(mobileMenu)mobileMenu.classList.remove('open');
    scrollToLatest();
  });

  /* ====================================================
     BOOT
  ==================================================== */
  function bootApp(){
    console.log('🚀 CineStream:',MOVIES.length,'movies |',SERIES.length,'series');
    buildYearButtons();
    renderAll();
    if(HERO_ITEMS&&HERO_ITEMS.length){updateHero(0);startHeroTimer();}
    updateWatchlistCount();
  }

  if(window.__dataReady) bootApp();
  else document.addEventListener('dataReady', bootApp);

})();
