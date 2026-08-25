(() => {
  'use strict';

  const overlay = document.getElementById('overlay');
  const quest = document.getElementById('quest');
  const toast = document.getElementById('toast');
  const dock = document.getElementById('system-dock');
  const layer = document.getElementById('system-menu-layer');
  const notifications = document.getElementById('system-notifications');
  const stage = document.querySelector('.system-canvas-wrap');

  const DEV_KEY = 'emberwild-dev-mode';
  const LAYOUT_KEY = 'emberwild-ui-layout-v1';
  const nativeRAF = window.requestAnimationFrame.bind(window);
  let rafFrozen = false;
  let syntheticKey = false;
  let editorActive = false;
  let lastNotice = { text: '', at: 0 };
  let editorToolbar = null;
  let minimapProxy = null;

  const pieces = {
    status: { el: document.querySelector('.system-top-left'), label: 'Status' },
    tracker: { el: quest, label: 'Journal Tracker' },
    notifications: { el: notifications, label: 'Notifications' },
    interaction: { el: document.getElementById('interaction'), label: 'Interaction' },
    dock: { el: dock, label: 'Menu Dock' },
  };

  window.requestAnimationFrame = callback => nativeRAF(timestamp => {
    if (rafFrozen) {
      window.requestAnimationFrame(callback);
      return;
    }
    callback(timestamp);
  });

  function readJson(key, fallback = null) {
    try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; }
    catch { return fallback; }
  }

  function devModeEnabled() { return localStorage.getItem(DEV_KEY) === '1'; }

  function isOwnMenuOpen() { return !layer.classList.contains('hidden'); }
  function isWorldOverlayOpen() { return !overlay.classList.contains('hidden') && !overlay.classList.contains('ember-menu'); }

  function syncShellState() {
    const inMainMenu = overlay.classList.contains('ember-menu');
    document.body.classList.toggle('system-game-active', !inMainMenu);
    document.body.classList.toggle('system-world-modal', isWorldOverlayOpen() || isOwnMenuOpen());
    document.body.classList.toggle('system-dev-enabled', devModeEnabled());
  }

  function sendKey(key) {
    syntheticKey = true;
    window.dispatchEvent(new KeyboardEvent('keydown', { key, code: `Key${key.toUpperCase()}`, bubbles: true }));
    syntheticKey = false;
  }

  function showLayer(content, extraClass = '') {
    rafFrozen = true;
    layer.innerHTML = `<div class="system-menu-shell ${extraClass}">${content}</div>`;
    layer.classList.remove('hidden');
    layer.setAttribute('aria-hidden', 'false');
    syncShellState();
  }

  function closeLayer() {
    layer.classList.add('hidden');
    layer.setAttribute('aria-hidden', 'true');
    layer.innerHTML = '';
    rafFrozen = false;
    syncShellState();
  }

  function openPauseMenu() {
    if (isWorldOverlayOpen() || editorActive) return;
    showLayer(`
      <div class="system-menu-kicker">SYSTEM // LOCAL INTERFACE</div>
      <h2 class="system-menu-title">EMBERWILD</h2>
      <p class="system-menu-subtitle">Simulation suspended. Select a System function or return to the world.</p>
      <div class="system-menu-actions">
        <button data-system-resume><span>Resume</span><span class="system-menu-key">ESC</span></button>
        <button data-system-open="inventory"><span>Inventory</span><span class="system-menu-key">I</span></button>
        <button data-system-open="character"><span>Character</span><span class="system-menu-key">C</span></button>
        <button data-system-open="journal"><span>System Journal</span><span class="system-menu-key">J</span></button>
        <button data-system-open="map"><span>Map</span><span class="system-menu-key">M</span></button>
        <button data-system-settings><span>Settings</span><span class="system-menu-key">⚙</span></button>
        <button class="danger" data-system-main-menu><span>Return to Main Menu</span><span class="system-menu-key">LOCAL SAVE</span></button>
      </div>
    `);

    layer.querySelector('[data-system-resume]').onclick = closeLayer;
    layer.querySelector('[data-system-settings]').onclick = openSettings;
    layer.querySelector('[data-system-main-menu]').onclick = () => {
      if (confirm('Return to the Emberwild main menu? Current prototype progress uses local autosave where available.')) location.reload();
    };
    layer.querySelectorAll('[data-system-open]').forEach(button => {
      button.onclick = () => {
        const action = button.dataset.systemOpen;
        if (action === 'journal') return openJournal();
        if (action === 'map') return openMap();
        closeLayer();
        requestGameMenu(action);
      };
    });
  }

  function openSettings() {
    const enabled = devModeEnabled();
    showLayer(`
      <div class="system-menu-kicker">SYSTEM // SETTINGS</div>
      <h2 class="system-menu-title">Interface Settings</h2>
      <p class="system-menu-subtitle">Local display and developer controls. These settings stay on this browser.</p>
      <div class="system-settings-list">
        <label class="system-setting-row">
          <span><b>Developer Mode</b><small>Unlock HUD layout editing tools for playtesting.</small></span>
          <input type="checkbox" data-dev-toggle ${enabled ? 'checked' : ''}>
        </label>
      </div>
      <div class="system-menu-actions system-settings-actions">
        <button data-edit-layout ${enabled ? '' : 'disabled'}><span>Edit HUD Layout</span><span class="system-menu-key">DRAG + DROP</span></button>
        <button data-reset-layout><span>Reset HUD Layout</span><span class="system-menu-key">DEFAULT</span></button>
        <button data-system-back><span>Back</span><span class="system-menu-key">ESC</span></button>
      </div>
    `);

    const toggle = layer.querySelector('[data-dev-toggle]');
    toggle.onchange = () => {
      localStorage.setItem(DEV_KEY, toggle.checked ? '1' : '0');
      syncShellState();
      openSettings();
    };
    layer.querySelector('[data-edit-layout]').onclick = () => {
      if (!devModeEnabled()) return;
      closeLayer();
      startLayoutEditor();
    };
    layer.querySelector('[data-reset-layout]').onclick = () => {
      resetLayout();
      pushNotice('HUD layout reset to defaults.');
      openSettings();
    };
    layer.querySelector('[data-system-back]').onclick = openPauseMenu;
  }

  function openJournal() {
    const journalHtml = quest.innerHTML.trim() || '<div class="system-unbound-card">No active System Journal entry is currently tracked.</div>';
    showLayer(`
      <div class="system-menu-kicker">SYSTEM // JOURNAL</div>
      <h2 class="system-menu-title">Tracked Entry</h2>
      <p class="system-menu-subtitle">Current objective synchronized from the System Journal.</p>
      <div class="system-menu-content">${journalHtml}</div>
      <div class="system-menu-actions" style="margin-top:12px"><button data-system-back><span>Return</span><span class="system-menu-key">ESC</span></button></div>
    `);
    layer.querySelector('[data-system-back]').onclick = closeLayer;
  }

  function readSave() {
    for (const key of ['emberwild-save-v2', 'emberwild-save-v1']) {
      try {
        const value = JSON.parse(localStorage.getItem(key) || 'null');
        if (value) return value;
      } catch {}
    }
    return null;
  }

  function getRuntimeCartography() {
    try {
      const live = window.EmberRuntimeState?.cartography?.();
      if (live) return live;
    } catch {}

    const save = readSave();
    if (save?.player) {
      return {
        kind: 'main',
        player: { x: (save.player.x || 0) / 32, y: (save.player.y || 0) / 32 },
        discoveries: save.player.discoveries || {},
        quest: save.player.quest || null,
      };
    }

    const tracked = quest.textContent || '';
    return /Hearthcross|First Payment|No Way Out/i.test(tracked)
      ? { kind: 'hearthcross', player: null, stage: 'unknown' }
      : { kind: 'hollowpath', player: null, stage: 'unknown' };
  }

  function openMap() {
    const data = getRuntimeCartography();
    const title = data.kind === 'dungeon' ? 'Barrowroot Ruins' : data.kind === 'hollowpath' ? 'Hollowpath' : data.kind === 'hearthcross' ? 'Hearthcross' : 'Mossroad Vale';
    showLayer(`
      <div class="system-menu-kicker">SYSTEM // CARTOGRAPHY</div>
      <div class="system-map-heading"><div><h2 class="system-menu-title">${escapeHtml(title)}</h2><p class="system-menu-subtitle">Live System map. Terrain, registered landmarks, current position, and tracked objective are rendered below.</p></div><div class="system-map-legend"><span><i class="player"></i>You</span><span><i class="poi"></i>Known</span><span><i class="target"></i>Objective</span></div></div>
      <div class="system-map-frame"><canvas id="system-world-map" width="900" height="560" aria-label="Emberwild map"></canvas></div>
      <div id="system-map-caption" class="system-map-caption"></div>
      <div class="system-menu-actions" style="margin-top:12px"><button data-system-back><span>Return</span><span class="system-menu-key">ESC</span></button></div>
    `, 'system-map-shell');
    drawMap(layer.querySelector('#system-world-map'), data);
    layer.querySelector('[data-system-back]').onclick = closeLayer;
  }

  function drawMap(canvas, data) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#06100b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (data.kind === 'hollowpath') drawHollowMap(ctx, canvas, data);
    else if (data.kind === 'hearthcross') drawHearthMap(ctx, canvas, data);
    else if (data.kind === 'dungeon') drawDungeonMap(ctx, canvas, data);
    else drawValeMap(ctx, canvas, data);
  }

  function fitRect(canvas, worldW, worldH, pad = 28) {
    const scale = Math.min((canvas.width - pad * 2) / worldW, (canvas.height - pad * 2) / worldH);
    const w = worldW * scale, h = worldH * scale;
    return { x: (canvas.width - w) / 2, y: (canvas.height - h) / 2, w, h, scale };
  }

  function drawHollowMap(ctx, canvas, data) {
    const worldW = 80, worldH = 44, r = fitRect(canvas, worldW, worldH, 34);
    ctx.fillStyle = '#152d20';
    ctx.fillRect(r.x, r.y, r.w, r.h);

    const paths = data.paths || [
      [[6,30],[14,28],[22,29],[30,25],[38,24],[46,20],[55,21],[64,16],[74,13]],
      [[22,29],[22,20],[30,16],[38,24]],
      [[30,25],[35,34],[45,32],[46,20]],
      [[55,21],[60,29],[67,28],[64,16]],
    ];
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#657054';
    ctx.lineWidth = Math.max(8, r.scale * 5.2);
    paths.forEach(path => {
      ctx.beginPath();
      path.forEach(([x,y], i) => i ? ctx.lineTo(r.x + x*r.scale, r.y + y*r.scale) : ctx.moveTo(r.x + x*r.scale, r.y + y*r.scale));
      ctx.stroke();
    });
    ctx.strokeStyle = '#899071';
    ctx.lineWidth = Math.max(2, r.scale * 1.15);
    paths.forEach(path => {
      ctx.beginPath();
      path.forEach(([x,y], i) => i ? ctx.lineTo(r.x + x*r.scale, r.y + y*r.scale) : ctx.moveTo(r.x + x*r.scale, r.y + y*r.scale));
      ctx.stroke();
    });

    const landmarks = [
      { name:'Wake Site', x:6.2, y:30.2 },
      { name:'Wrecked Camp', x:54.5, y:20.4 },
      { name:'Smoke / East Trail', x:74, y:13 },
    ];
    landmarks.forEach(p => drawPoi(ctx, r, p, '#d5be68'));
    if (data.player) drawPlayerMarker(ctx, r, data.player);
    drawMapBorder(ctx, r, 'HOLLOWPATH // UNMAPPED');
    setMapCaption('Hollowpath is a private opening route. The System is recording its trail network even though the location is not registered on the regional map.');
  }

  function drawHearthMap(ctx, canvas, data) {
    const worldW = 48, worldH = 34, r = fitRect(canvas, worldW, worldH, 34);
    ctx.fillStyle = '#355f3d';
    ctx.fillRect(r.x, r.y, r.w, r.h);
    const riverX = 35;
    ctx.fillStyle = '#285b73';
    ctx.fillRect(r.x + riverX*r.scale, r.y, (worldW-riverX)*r.scale, r.h);
    ctx.fillStyle = '#6b5234';
    ctx.fillRect(r.x + 31*r.scale, r.y + 16.4*r.scale, 4*r.scale, 1.2*r.scale);
    ctx.fillStyle = '#171816';
    ctx.fillRect(r.x + 34.2*r.scale, r.y + 16.2*r.scale, .8*r.scale, 1.6*r.scale);

    const sites = [
      {name:'Patched Shelter',x:15,y:17},
      {name:'Rhea',x:20,y:19},
      {name:'Ruined Structure',x:24,y:15},
      {name:'Destroyed Bridge',x:34.2,y:17,target:true},
    ];
    sites.forEach(p => drawPoi(ctx, r, p, p.target ? '#e08a73' : '#d5be68'));
    if (data.player) drawPlayerMarker(ctx, r, data.player);
    drawMapBorder(ctx, r, 'HEARTHCROSS // FRONTIER OUTPOST');
    setMapCaption('The Mossroad bridge is destroyed. Hearthcross is currently cut off from the wider region.');
  }

  function drawDungeonMap(ctx, canvas, data) {
    const worldW = 42, worldH = 28, r = fitRect(canvas, worldW, worldH, 36);
    ctx.fillStyle = '#121713';
    ctx.fillRect(r.x, r.y, r.w, r.h);
    const open = (x,y) => (x>=2&&x<=14&&y>=8&&y<=20)||(x>=14&&x<=22&&y>=12&&y<=15)||(x>=22&&x<=31&&y>=5&&y<=21)||(x>=31&&x<=36&&y>=12&&y<=15)||(x>=36&&x<=40&&y>=9&&y<=18);
    const cell = Math.max(2, r.scale);
    for (let y=0;y<worldH;y++) for (let x=0;x<worldW;x++) if (open(x,y)) {
      ctx.fillStyle = (x+y)%2 ? '#4b514a' : '#414740';
      ctx.fillRect(r.x+x*r.scale, r.y+y*r.scale, cell+1, cell+1);
    }
    drawPoi(ctx, r, {name:'Entrance',x:3,y:14}, '#d5be68');
    drawPoi(ctx, r, {name:'Reliquary',x:38,y:13}, '#9ec3a4');
    if (data.player) drawPlayerMarker(ctx, r, data.player);
    drawMapBorder(ctx, r, 'BARROWROOT RUINS // INSTANCE');
    setMapCaption('Dungeon cartography records explored structure geometry separately from the Mossroad Vale regional map.');
  }

  function buildValeTerrain() {
    const W=420,H=280;
    const map = Array.from({length:H},()=>Array(W).fill('forest'));
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){
      const edge=Math.min(x,y,W-1-x,H-1-y),n=hash2(x,y,2);
      map[y][x]=edge<3?'deep_forest':n<.22?'deep_forest':n<.52?'forest':'grass2';
    }
    const circle=(cx,cy,r,t)=>{for(let y=Math.max(0,cy-r);y<=Math.min(H-1,cy+r);y++)for(let x=Math.max(0,cx-r);x<=Math.min(W-1,cx+r);x++)if(Math.hypot(x-cx,y-cy)<=r)map[y][x]=t;};
    const road=(x0,y0,x1,y1,half=1)=>{const steps=Math.max(Math.abs(x1-x0),Math.abs(y1-y0));for(let i=0;i<=steps;i++){const q=steps?i/steps:0,x=Math.round(x0+(x1-x0)*q),y=Math.round(y0+(y1-y0)*q);for(let oy=-half;oy<=half;oy++)for(let ox=-half;ox<=half;ox++)if(x+ox>=0&&y+oy>=0&&x+ox<W&&y+oy<H)map[y+oy][x+ox]='road';}};
    circle(34,140,18,'grass');circle(34,140,10,'town');road(26,140,315,136,2);road(34,140,90,88,1);road(90,88,160,66,1);road(160,66,236,102,1);road(180,137,248,188,1);road(248,188,323,204,1);circle(92,88,9,'grass');circle(92,88,4,'town');circle(162,66,12,'grass2');circle(162,66,6,'ruins');circle(250,190,15,'rock');circle(250,190,7,'grass2');circle(232,104,16,'grass');circle(232,104,11,'shallow');circle(232,104,7,'water');circle(326,205,15,'grass2');
    return map;
  }

  let cachedVale = null;
  function drawValeMap(ctx, canvas, data) {
    const W=420,H=280,r=fitRect(canvas,W,H,28), map=data.world || cachedVale || (cachedVale=buildValeTerrain());
    const colors={grass:'#416b43',grass2:'#365d3b',forest:'#24442e',deep_forest:'#182f22',water:'#27556e',shallow:'#4b7e83',road:'#8a7959',rock:'#606662',town:'#978753',ruins:'#656b62'};
    const sample=2;
    for(let y=0;y<H;y+=sample)for(let x=0;x<W;x+=sample){ctx.fillStyle=colors[map[y]?.[x]]||'#24442e';ctx.fillRect(r.x+x*r.scale,r.y+y*r.scale,Math.ceil(sample*r.scale)+1,Math.ceil(sample*r.scale)+1);}

    const discoveries=data.discoveries||{};
    const pois=data.pois||[
      {id:'hearthcross',name:'Hearthcross',tx:34,ty:140,type:'town'},
      {id:'camp',name:'Wayfarer Camp',tx:92,ty:88,type:'camp'},
      {id:'ruins',name:'Old Mossroad Ruins',tx:162,ty:66,type:'ruins'},
      {id:'quarry',name:'Ironroot Quarry',tx:250,ty:190,type:'quarry'},
      {id:'pool',name:'Glasswater Pool',tx:232,ty:104,type:'fishing'},
      {id:'troll_grove',name:'Briar Grove',tx:326,ty:205,type:'boss'},
    ];
    pois.forEach(p => {
      const known = p.id==='hearthcross' || discoveries[p.id] || discoveries[p.id==='ruins'?'old_ruins':p.id];
      if (known) drawPoi(ctx,r,{name:p.name,x:p.tx,y:p.ty},p.type==='boss'?'#dd8b73':'#d8c46f');
      else drawUnknownPoi(ctx,r,p.tx,p.ty);
    });
    if(data.questTarget) drawTargetMarker(ctx,r,{x:data.questTarget.tx,y:data.questTarget.ty});
    if(data.player) drawPlayerMarker(ctx,r,data.player);
    drawMapBorder(ctx,r,'MOSSROAD VALE // REGIONAL MAP');
    setMapCaption('Terrain is available immediately; named markers become registered as you discover them. Unknown landmark signatures are shown without labels.');
  }

  function drawMapBorder(ctx,r,label){
    ctx.strokeStyle='rgba(190,213,196,.55)';ctx.lineWidth=2;ctx.strokeRect(r.x-.5,r.y-.5,r.w+1,r.h+1);
    ctx.fillStyle='rgba(3,9,6,.82)';ctx.fillRect(r.x,r.y,Math.min(290,r.w),24);
    ctx.fillStyle='#bac8bf';ctx.font='11px ui-monospace, monospace';ctx.fillText(label,r.x+8,r.y+16);
  }
  function drawPoi(ctx,r,p,color){
    const x=r.x+p.x*r.scale,y=r.y+p.y*r.scale;
    ctx.fillStyle='#08100b';ctx.beginPath();ctx.arc(x,y,6,0,Math.PI*2);ctx.fill();ctx.strokeStyle=color;ctx.lineWidth=2;ctx.stroke();
    ctx.font='10px ui-monospace, monospace';const tw=ctx.measureText(p.name).width;ctx.fillStyle='rgba(4,10,7,.86)';ctx.fillRect(x+8,y-8,tw+8,15);ctx.fillStyle=color;ctx.fillText(p.name,x+12,y+3);
  }
  function drawUnknownPoi(ctx,r,x0,y0){const x=r.x+x0*r.scale,y=r.y+y0*r.scale;ctx.strokeStyle='rgba(159,184,166,.38)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(x,y,4,0,Math.PI*2);ctx.stroke();}
  function drawPlayerMarker(ctx,r,p){const x=r.x+p.x*r.scale,y=r.y+p.y*r.scale;ctx.fillStyle='#fff0a0';ctx.beginPath();ctx.moveTo(x,y-8);ctx.lineTo(x-6,y+6);ctx.lineTo(x,y+3);ctx.lineTo(x+6,y+6);ctx.closePath();ctx.fill();ctx.strokeStyle='#17150a';ctx.stroke();}
  function drawTargetMarker(ctx,r,p){const x=r.x+p.x*r.scale,y=r.y+p.y*r.scale;ctx.strokeStyle='#f0df6d';ctx.lineWidth=2;ctx.strokeRect(x-7,y-7,14,14);ctx.beginPath();ctx.arc(x,y,10,0,Math.PI*2);ctx.stroke();}
  function setMapCaption(text){const el=layer.querySelector('#system-map-caption');if(el)el.textContent=text;}
  function hash2(x,y,s=0){let n=Math.imul((x+s*13)|0,374761393)^Math.imul((y-s*17)|0,668265263);n=Math.imul(n^(n>>>13),1274126177);return((n^(n>>>16))>>>0)/4294967295;}

  function requestGameMenu(action) {
    if (isWorldOverlayOpen()) return;
    const before = overlay.innerHTML;
    sendKey(action === 'inventory' ? 'i' : 'c');
    setTimeout(() => {
      if (!overlay.classList.contains('hidden') || overlay.innerHTML !== before) return;
      if (action === 'character') {
        showLayer(`
          <div class="system-menu-kicker">SYSTEM // CHARACTER</div>
          <h2 class="system-menu-title">UNBOUND</h2>
          <p class="system-menu-subtitle">Character functions are not fully available in the current sequence.</p>
          <div class="system-unbound-card">Your identity is registered, but Path and full stat synchronization remain restricted until the System stabilizes.</div>
          <div class="system-menu-actions" style="margin-top:12px"><button data-system-back><span>Return</span><span class="system-menu-key">ESC</span></button></div>
        `);
      } else {
        showLayer(`
          <div class="system-menu-kicker">SYSTEM // INVENTORY</div>
          <h2 class="system-menu-title">Interface Restricted</h2>
          <p class="system-menu-subtitle">The current story sequence is not exposing a full inventory view yet.</p>
          <div class="system-unbound-card">Items and gathered materials are still tracked by the current sequence. Full inventory access resumes when its gameplay interface is available.</div>
          <div class="system-menu-actions" style="margin-top:12px"><button data-system-back><span>Return</span><span class="system-menu-key">ESC</span></button></div>
        `);
      }
      layer.querySelector('[data-system-back]').onclick = closeLayer;
    }, 0);
  }

  function pushNotice(text) {
    text = String(text || '').trim();
    if (!text) return;
    const now = Date.now();
    if (lastNotice.text === text && now - lastNotice.at < 800) return;
    lastNotice = { text, at: now };
    const el = document.createElement('div');
    el.className = `system-notice${/warning|critical|run\b|threat|failed/i.test(text) ? ' system-danger' : ''}`;
    el.textContent = text;
    notifications.appendChild(el);
    while (notifications.children.length > 4) notifications.firstElementChild?.remove();
    setTimeout(() => { el.classList.add('system-notice-out'); setTimeout(() => el.remove(), 300); }, 4200);
  }

  function mirrorToast() {
    if (toast.classList.contains('hidden')) return;
    pushNotice(toast.textContent);
  }

  function escapeHtml(value) { return String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char])); }

  function applyLayout() {
    const layout = readJson(LAYOUT_KEY, {}) || {};
    Object.entries(pieces).forEach(([key, piece]) => {
      const el = piece.el, pos = layout[key];
      if (!el) return;
      el.removeAttribute('style');
      if (!pos) return;
      el.style.left = `${pos.x * 100}%`;
      el.style.top = `${pos.y * 100}%`;
      el.style.right = 'auto';
      el.style.bottom = 'auto';
      el.style.transform = 'none';
    });
  }

  function resetLayout() {
    localStorage.removeItem(LAYOUT_KEY);
    Object.values(pieces).forEach(piece => piece.el?.removeAttribute('style'));
  }

  function savePiecePosition(key, el) {
    if (!stage || !el) return;
    const sr = stage.getBoundingClientRect(), er = el.getBoundingClientRect();
    const layout = readJson(LAYOUT_KEY, {}) || {};
    layout[key] = {
      x: Math.max(0, Math.min(1 - er.width / sr.width, (er.left - sr.left) / sr.width)),
      y: Math.max(0, Math.min(1 - er.height / sr.height, (er.top - sr.top) / sr.height)),
    };
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
  }

  function makeDraggable(key, el) {
    if (!el) return () => {};
    el.dataset.editorLabel = pieces[key]?.label || key;
    const down = event => {
      if (!editorActive || event.button !== 0) return;
      event.preventDefault();
      const sr=stage.getBoundingClientRect(), er=el.getBoundingClientRect();
      const dx=event.clientX-er.left, dy=event.clientY-er.top;
      const move = e => {
        const maxX=sr.width-er.width,maxY=sr.height-er.height;
        const left=Math.max(0,Math.min(maxX,e.clientX-sr.left-dx));
        const top=Math.max(0,Math.min(maxY,e.clientY-sr.top-dy));
        el.style.left=`${left}px`;el.style.top=`${top}px`;el.style.right='auto';el.style.bottom='auto';el.style.transform='none';
      };
      const up = () => { window.removeEventListener('pointermove',move,true);window.removeEventListener('pointerup',up,true);savePiecePosition(key,el); };
      window.addEventListener('pointermove',move,true);window.addEventListener('pointerup',up,true);
    };
    el.addEventListener('pointerdown', down, true);
    return () => el.removeEventListener('pointerdown', down, true);
  }

  let editorCleanup = [];
  function startLayoutEditor() {
    if (!devModeEnabled() || editorActive || !stage) return;
    editorActive = true;
    rafFrozen = true;
    document.body.classList.add('system-ui-editing');
    applyLayout();
    editorCleanup = Object.entries(pieces).map(([key,piece])=>makeDraggable(key,piece.el));
    createMinimapProxy();
    editorToolbar = document.createElement('div');
    editorToolbar.className = 'system-editor-toolbar';
    editorToolbar.innerHTML = `<b>DEV // HUD EDITOR</b><span>Drag highlighted UI pieces. Minimap position is editable too.</span><button data-editor-reset>Reset</button><button class="primary" data-editor-done>Save & Exit</button>`;
    document.body.appendChild(editorToolbar);
    editorToolbar.querySelector('[data-editor-reset]').onclick = () => { resetLayout(); applyLayout(); positionMinimapProxy(); };
    editorToolbar.querySelector('[data-editor-done]').onclick = stopLayoutEditor;
  }

  function stopLayoutEditor() {
    if (!editorActive) return;
    editorActive = false;
    rafFrozen = false;
    document.body.classList.remove('system-ui-editing');
    editorCleanup.forEach(fn=>fn());editorCleanup=[];
    editorToolbar?.remove();editorToolbar=null;
    minimapProxy?.remove();minimapProxy=null;
    syncShellState();
    pushNotice('Developer HUD layout saved.');
  }

  function getMinimapLayout() {
    const layout=readJson(LAYOUT_KEY,{})||{};
    return layout.minimap || { x: (960-176-10)/960, y: 10/640, w:176/960, h:118/640 };
  }

  function getMinimapRect(canvas) {
    const p=getMinimapLayout();
    return { x:p.x*canvas.width, y:p.y*canvas.height, w:p.w*canvas.width, h:p.h*canvas.height };
  }

  function createMinimapProxy() {
    if (!stage) return;
    minimapProxy=document.createElement('div');minimapProxy.className='system-minimap-proxy';minimapProxy.dataset.editorLabel='Minimap';stage.appendChild(minimapProxy);positionMinimapProxy();
    const down=event=>{
      if(event.button!==0)return;event.preventDefault();const sr=stage.getBoundingClientRect(),er=minimapProxy.getBoundingClientRect(),dx=event.clientX-er.left,dy=event.clientY-er.top;
      const move=e=>{const maxX=sr.width-er.width,maxY=sr.height-er.height,left=Math.max(0,Math.min(maxX,e.clientX-sr.left-dx)),top=Math.max(0,Math.min(maxY,e.clientY-sr.top-dy));minimapProxy.style.left=`${left}px`;minimapProxy.style.top=`${top}px`;const layout=readJson(LAYOUT_KEY,{})||{};layout.minimap={x:left/sr.width,y:top/sr.height,w:er.width/sr.width,h:er.height/sr.height};localStorage.setItem(LAYOUT_KEY,JSON.stringify(layout));};
      const up=()=>{window.removeEventListener('pointermove',move,true);window.removeEventListener('pointerup',up,true);};window.addEventListener('pointermove',move,true);window.addEventListener('pointerup',up,true);
    };
    minimapProxy.addEventListener('pointerdown',down,true);
  }

  function positionMinimapProxy(){if(!minimapProxy||!stage)return;const p=getMinimapLayout(),sr=stage.getBoundingClientRect();minimapProxy.style.left=`${p.x*sr.width}px`;minimapProxy.style.top=`${p.y*sr.height}px`;minimapProxy.style.width=`${p.w*sr.width}px`;minimapProxy.style.height=`${p.h*sr.height}px`;}

  dock?.addEventListener('click', event => {
    const button = event.target.closest('[data-system-action]');
    if (!button) return;
    const action = button.dataset.systemAction;
    if (action === 'pause') return openPauseMenu();
    if (action === 'journal') return openJournal();
    if (action === 'map') return openMap();
    requestGameMenu(action);
  });

  window.addEventListener('keydown', event => {
    if (syntheticKey || event.repeat) return;
    const key = event.key.toLowerCase();

    if (editorActive) {
      if (key === 'escape') { event.preventDefault();event.stopImmediatePropagation();stopLayoutEditor(); }
      return;
    }

    if (isOwnMenuOpen()) {
      if (key === 'escape') closeLayer();
      event.preventDefault();event.stopImmediatePropagation();return;
    }

    if (key === 'escape') {
      if (isWorldOverlayOpen()) {
        const close = overlay.querySelector('[data-close]');
        if (close) { event.preventDefault();event.stopImmediatePropagation();close.click(); }
        return;
      }
      event.preventDefault();event.stopImmediatePropagation();openPauseMenu();return;
    }
    if (key === 'j' && !isWorldOverlayOpen()) { event.preventDefault();event.stopImmediatePropagation();openJournal();return; }
    if (key === 'm' && !isWorldOverlayOpen()) { event.preventDefault();event.stopImmediatePropagation();openMap(); }
  }, true);

  new MutationObserver(syncShellState).observe(overlay, { attributes: true, childList: true, subtree: false });
  new MutationObserver(mirrorToast).observe(toast, { attributes: true, childList: true, characterData: true, subtree: true });
  window.addEventListener('resize',()=>{applyLayout();positionMinimapProxy();});

  applyLayout();
  syncShellState();
  mirrorToast();

  window.EmberSystemUI = {
    notify: pushNotice,
    openPause: openPauseMenu,
    openJournal,
    openMap,
    openSettings,
    isPaused: () => rafFrozen,
    getMinimapRect,
    isEditing: () => editorActive,
  };
})();
