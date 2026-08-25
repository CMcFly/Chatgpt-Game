(() => {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const hud = document.getElementById('hud');
  const questEl = document.getElementById('quest');
  const overlay = document.getElementById('overlay');
  const toastEl = document.getElementById('toast');
  const interactionEl = document.getElementById('interaction');

  const TILE = 32;
  const WORLD_W = 74;
  const WORLD_H = 50;
  const SAVE_KEY = 'emberwild-save-v1';

  const COLORS = {
    grass: '#3e6d45',
    grass2: '#365f3c',
    forest: '#264a30',
    water: '#244b68',
    sand: '#9a8558',
    road: '#766b53',
    mountain: '#5b5f5e',
    town: '#92785a',
    dark: '#0b100d',
  };

  const CLASSES = {
    vanguard: {
      name: 'Vanguard', icon: '🛡️', desc: 'Durable frontline fighter. High health, armor and reliable physical skills.',
      base: { hp: 135, mp: 45, atk: 15, def: 13, mag: 5, spd: 8 },
      skills: [
        { id: 'shield_bash', name: 'Shield Bash', level: 1, mp: 6, power: 1.25, type: 'physical', stun: .25, text: 'Heavy strike with a chance to stun.' },
        { id: 'second_wind', name: 'Second Wind', level: 3, mp: 10, heal: .35, text: 'Recover 35% of max HP.' },
        { id: 'sundering', name: 'Sundering Blow', level: 6, mp: 14, power: 1.8, type: 'physical', text: 'Crushing attack that ignores part of defense.' },
      ]
    },
    arcanist: {
      name: 'Arcanist', icon: '🔮', desc: 'Elemental caster. Lower defenses, large mana pool and strong burst damage.',
      base: { hp: 92, mp: 110, atk: 7, def: 7, mag: 17, spd: 9 },
      skills: [
        { id: 'ember_bolt', name: 'Ember Bolt', level: 1, mp: 7, power: 1.35, type: 'magic', text: 'Focused magical flame.' },
        { id: 'mend', name: 'Mend', level: 3, mp: 12, heal: .28, text: 'Restore 28% of max HP.' },
        { id: 'storm_lance', name: 'Storm Lance', level: 6, mp: 18, power: 2.0, type: 'magic', text: 'A violent lance of storm energy.' },
      ]
    },
    shade: {
      name: 'Shade', icon: '🗡️', desc: 'Fast opportunist. Crit-heavy attacks, evasive stats, and efficient finishing skills.',
      base: { hp: 105, mp: 65, atk: 14, def: 8, mag: 7, spd: 16 },
      skills: [
        { id: 'quickcut', name: 'Quickcut', level: 1, mp: 5, power: 1.15, type: 'physical', crit: .25, text: 'Fast strike with increased crit chance.' },
        { id: 'smoke_step', name: 'Smoke Step', level: 3, mp: 10, buff: 'evade', text: 'Gain a strong chance to evade the next attack.' },
        { id: 'execution', name: 'Execution', level: 6, mp: 15, power: 1.55, type: 'physical', execute: true, text: 'Deals much more damage to wounded enemies.' },
      ]
    }
  };

  const ENEMY_TYPES = {
    mossling: { name: 'Mossling', icon: '🟢', minLevel: 1, hp: 42, atk: 8, def: 3, xp: 22, gold: [4, 9], color: '#72b66e' },
    ash_rat: { name: 'Ash Rat', icon: '🐀', minLevel: 2, hp: 54, atk: 10, def: 4, xp: 30, gold: [6, 12], color: '#9d8170' },
    thornling: { name: 'Thornling', icon: '🌿', minLevel: 3, hp: 70, atk: 12, def: 6, xp: 42, gold: [8, 15], color: '#538f51' },
    dusk_wisp: { name: 'Dusk Wisp', icon: '🟣', minLevel: 4, hp: 64, atk: 14, def: 5, xp: 50, gold: [10, 18], color: '#9d72c8', magic: true },
    stoneback: { name: 'Stoneback', icon: '🪨', minLevel: 5, hp: 105, atk: 15, def: 10, xp: 68, gold: [14, 22], color: '#7e8580' },
    briar_troll: { name: 'Briar Troll', icon: '👹', minLevel: 7, hp: 190, atk: 21, def: 12, xp: 150, gold: [30, 50], color: '#74543f', boss: true },
  };

  const RARITIES = [
    { name: 'Common', key: 'common', weight: 58, mult: 1.0 },
    { name: 'Fine', key: 'fine', weight: 24, mult: 1.16 },
    { name: 'Rare', key: 'rare', weight: 11, mult: 1.34 },
    { name: 'Epic', key: 'epic', weight: 5, mult: 1.58 },
    { name: 'Legendary', key: 'legendary', weight: 2, mult: 1.9 },
  ];

  const ITEM_BASES = [
    { slot: 'weapon', names: ['Ironblade', 'Ashwood Staff', 'Hunting Knife'], stats: ['atk', 'mag'] },
    { slot: 'head', names: ['Trail Hood', 'Iron Cap', 'Rune Circlet'], stats: ['def', 'mag'] },
    { slot: 'body', names: ['Warden Mail', 'Traveler Coat', 'Mystic Wrap'], stats: ['def', 'hp'] },
    { slot: 'feet', names: ['Path Boots', 'Greaves', 'Softstep Shoes'], stats: ['def', 'spd'] },
    { slot: 'charm', names: ['Amber Charm', 'Moon Token', 'Old Coin'], stats: ['hp', 'mp', 'atk', 'mag'] },
  ];

  const state = {
    mode: 'world',
    started: false,
    paused: false,
    keys: new Set(),
    world: [],
    player: null,
    enemies: [],
    buildings: [],
    npcs: [],
    battle: null,
    camera: { x: 0, y: 0 },
    time: 0,
    lastSave: 0,
  };

  function makePlayer(classId) {
    const c = CLASSES[classId];
    return {
      x: 12.5 * TILE, y: 25.5 * TILE, radius: 10, speed: 175,
      classId, level: 1, xp: 0, xpNext: 80, gold: 18,
      hp: c.base.hp, mp: c.base.mp,
      potions: 3,
      inventory: [],
      equipment: { weapon: null, head: null, body: null, feet: null, charm: null },
      unlockedClasses: [classId],
      learnedSkills: [c.skills[0].id],
      quest: { id: 'green_problem', kills: 0, target: 3, complete: false, claimed: false },
      evade: false,
    };
  }

  function buildWorld() {
    const map = [];
    for (let y = 0; y < WORLD_H; y++) {
      const row = [];
      for (let x = 0; x < WORLD_W; x++) {
        let tile = 'grass';
        const edge = Math.min(x, y, WORLD_W - 1 - x, WORLD_H - 1 - y);
        const n = pseudoNoise(x, y);
        if (edge < 2 || (x > 48 && y < 15 && n > .42)) tile = 'water';
        else if (x > 54 && y > 27) tile = n > .05 ? 'mountain' : 'grass';
        else if ((x > 32 && x < 49 && y > 7 && y < 28) || (x < 22 && y < 17)) tile = n > -.18 ? 'forest' : 'grass';
        else if (x > 46 && y > 16 && y < 27) tile = 'sand';
        row.push(tile);
      }
      map.push(row);
    }

    for (let x = 6; x < 59; x++) map[25][x] = 'road';
    for (let y = 19; y < 33; y++) map[y][12] = 'road';
    for (let x = 8; x < 17; x++) for (let y = 21; y < 30; y++) map[y][x] = 'town';

    state.world = map;
    state.buildings = [
      { id: 'hearth', name: 'Hearth House', x: 10*TILE, y: 22*TILE, w: 2*TILE, h: 2*TILE, type: 'healer', color: '#7b493d' },
      { id: 'forge', name: 'Copper Anvil', x: 13*TILE, y: 22*TILE, w: 2*TILE, h: 2*TILE, type: 'smith', color: '#575f66' },
      { id: 'waystone', name: 'Waystone', x: 10.5*TILE, y: 27*TILE, w: TILE, h: TILE, type: 'class', color: '#6f5f95' },
      { id: 'guild', name: 'Trail Guild', x: 14*TILE, y: 27*TILE, w: 2*TILE, h: 2*TILE, type: 'guild', color: '#715a34' },
    ];
    state.npcs = [
      { id: 'rhea', name: 'Rhea', x: 13.2*TILE, y: 26.2*TILE, color: '#e4b76c', text: 'The eastern road gets mean fast. Keep your gear current.' },
    ];
  }

  function pseudoNoise(x, y) {
    return Math.sin(x * .71 + Math.cos(y * .37) * 2.1) * .42 + Math.cos(y * .83 + x * .11) * .31;
  }

  function tileAtPixel(px, py) {
    const x = Math.floor(px / TILE), y = Math.floor(py / TILE);
    if (x < 0 || y < 0 || x >= WORLD_W || y >= WORLD_H) return 'water';
    return state.world[y][x];
  }

  function isWalkable(px, py) {
    const t = tileAtPixel(px, py);
    if (t === 'water' || t === 'mountain') return false;
    for (const b of state.buildings) {
      if (px > b.x - 4 && px < b.x + b.w + 4 && py > b.y - 4 && py < b.y + b.h + 4) return false;
    }
    return true;
  }

  function spawnEnemies() {
    const spawnList = [
      ['mossling', 22, 25], ['mossling', 26, 24], ['mossling', 28, 27],
      ['ash_rat', 34, 20], ['ash_rat', 38, 27],
      ['thornling', 39, 13], ['thornling', 44, 19],
      ['dusk_wisp', 49, 24], ['dusk_wisp', 51, 19],
      ['stoneback', 58, 31], ['stoneback', 61, 36],
      ['briar_troll', 66, 38],
    ];
    state.enemies = spawnList.map(([type, tx, ty], i) => createEnemy(type, tx*TILE + TILE/2, ty*TILE + TILE/2, i));
  }

  function createEnemy(type, x, y, id) {
    const base = ENEMY_TYPES[type];
    const level = base.minLevel + (base.boss ? 1 : Math.floor(Math.random()*2));
    const scale = 1 + (level - 1) * .12;
    return {
      id, type, x, y, homeX: x, homeY: y, radius: base.boss ? 17 : 12,
      level, alive: true, respawn: 0, angle: Math.random() * Math.PI * 2,
      hpMax: Math.round(base.hp * scale), hp: Math.round(base.hp * scale),
      atk: Math.round(base.atk * scale), def: Math.round(base.def * scale),
    };
  }

  function getStats() {
    const p = state.player;
    const c = CLASSES[p.classId];
    const levelBonus = p.level - 1;
    const s = {
      hp: c.base.hp + levelBonus * 10,
      mp: c.base.mp + levelBonus * 6,
      atk: c.base.atk + levelBonus * 2,
      def: c.base.def + Math.floor(levelBonus * 1.5),
      mag: c.base.mag + levelBonus * 2,
      spd: c.base.spd + levelBonus,
    };
    Object.values(p.equipment).filter(Boolean).forEach(item => {
      Object.entries(item.bonus).forEach(([k, v]) => s[k] = (s[k] || 0) + v);
    });
    return s;
  }

  function ensureVitals() {
    const s = getStats();
    state.player.hp = Math.min(state.player.hp, s.hp);
    state.player.mp = Math.min(state.player.mp, s.mp);
  }

  function weightedRarity() {
    let roll = Math.random() * RARITIES.reduce((a, r) => a + r.weight, 0);
    for (const r of RARITIES) {
      roll -= r.weight;
      if (roll <= 0) return r;
    }
    return RARITIES[0];
  }

  function generateItem(level) {
    const base = ITEM_BASES[Math.floor(Math.random()*ITEM_BASES.length)];
    const rarity = weightedRarity();
    const name = base.names[Math.floor(Math.random()*base.names.length)];
    const bonus = {};
    const power = Math.max(1, Math.round((2 + level * 1.4) * rarity.mult));
    const first = base.stats[Math.floor(Math.random()*base.stats.length)];
    bonus[first] = power;
    if (rarity.mult >= 1.3) {
      const second = base.stats[Math.floor(Math.random()*base.stats.length)];
      bonus[second] = (bonus[second] || 0) + Math.max(1, Math.round(power * .55));
    }
    return { id: `${Date.now()}-${Math.random()}`, name, slot: base.slot, rarity: rarity.key, rarityName: rarity.name, bonus, level };
  }

  function startGame(classId) {
    buildWorld();
    state.player = makePlayer(classId);
    spawnEnemies();
    state.started = true;
    closeOverlay();
    toast(`You are a ${CLASSES[classId].name}. The east road is open.`);
    updateUI();
  }

  function showClassChoice() {
    state.paused = true;
    overlay.classList.remove('hidden');
    overlay.innerHTML = `
      <div class="modal">
        <h2>Choose your first path</h2>
        <p class="subtitle">Classes can eventually be changed at the Waystone. Skills you learn remain known.</p>
        <div class="class-grid">
          ${Object.entries(CLASSES).map(([id,c]) => `
            <div class="card">
              <div class="pixel-portrait">${c.icon}</div>
              <h3>${c.name}</h3>
              <p>${c.desc}</p>
              <button class="primary" data-class="${id}">Begin as ${c.name}</button>
            </div>`).join('')}
        </div>
      </div>`;
    overlay.querySelectorAll('[data-class]').forEach(btn => btn.addEventListener('click', () => startGame(btn.dataset.class)));
  }

  function closeOverlay() {
    overlay.classList.add('hidden');
    overlay.innerHTML = '';
    state.paused = false;
  }

  function update(dt) {
    if (!state.started || state.paused || state.mode !== 'world') return;
    state.time += dt;
    const p = state.player;
    let dx = 0, dy = 0;
    if (state.keys.has('w') || state.keys.has('arrowup')) dy -= 1;
    if (state.keys.has('s') || state.keys.has('arrowdown')) dy += 1;
    if (state.keys.has('a') || state.keys.has('arrowleft')) dx -= 1;
    if (state.keys.has('d') || state.keys.has('arrowright')) dx += 1;
    if (dx || dy) {
      const len = Math.hypot(dx, dy); dx /= len; dy /= len;
      const terrain = tileAtPixel(p.x, p.y);
      const terrainMod = terrain === 'forest' ? .78 : terrain === 'sand' ? .88 : 1;
      const step = p.speed * terrainMod * dt;
      const nx = p.x + dx * step, ny = p.y + dy * step;
      if (isWalkable(nx, p.y)) p.x = nx;
      if (isWalkable(p.x, ny)) p.y = ny;
    }

    for (const e of state.enemies) {
      if (!e.alive) {
        e.respawn -= dt;
        if (e.respawn <= 0) { e.alive = true; e.hp = e.hpMax; e.x = e.homeX; e.y = e.homeY; }
        continue;
      }
      e.angle += (Math.random() - .5) * dt * 1.3;
      const distHome = Math.hypot(e.x-e.homeX, e.y-e.homeY);
      if (distHome > 55) e.angle = Math.atan2(e.homeY-e.y, e.homeX-e.x);
      const speed = e.type === 'briar_troll' ? 8 : 12;
      const nx = e.x + Math.cos(e.angle)*speed*dt, ny = e.y + Math.sin(e.angle)*speed*dt;
      if (isWalkable(nx, ny)) { e.x = nx; e.y = ny; }
      if (Math.hypot(p.x-e.x, p.y-e.y) < p.radius + e.radius + 3) startBattle(e);
    }

    state.camera.x += ((p.x - canvas.width/2) - state.camera.x) * Math.min(1, dt*8);
    state.camera.y += ((p.y - canvas.height/2) - state.camera.y) * Math.min(1, dt*8);
    state.camera.x = Math.max(0, Math.min(WORLD_W*TILE-canvas.width, state.camera.x));
    state.camera.y = Math.max(0, Math.min(WORLD_H*TILE-canvas.height, state.camera.y));

    const near = getNearbyInteractable();
    if (near) {
      interactionEl.textContent = `E — ${near.name}`;
      interactionEl.classList.remove('hidden');
    } else interactionEl.classList.add('hidden');

    if (performance.now() - state.lastSave > 5000) saveGame();
  }

  function getNearbyInteractable() {
    if (!state.player) return null;
    const p = state.player;
    let best = null, bestD = 64;
    for (const b of state.buildings) {
      const cx = b.x+b.w/2, cy = b.y+b.h/2;
      const d = Math.hypot(p.x-cx,p.y-cy);
      if (d < bestD) { best = b; bestD = d; }
    }
    for (const n of state.npcs) {
      const d = Math.hypot(p.x-n.x,p.y-n.y);
      if (d < bestD) { best = n; bestD = d; }
    }
    return best;
  }

  function interact() {
    if (!state.started || state.paused || state.mode !== 'world') return;
    const target = getNearbyInteractable();
    if (!target) return;
    if (target.type === 'healer') healAtTown();
    else if (target.type === 'smith') openShop();
    else if (target.type === 'class') openClassStone();
    else if (target.type === 'guild') openGuild();
    else if (target.text) toast(`${target.name}: “${target.text}”`, 3200);
  }

  function healAtTown() {
    const s = getStats();
    state.player.hp = s.hp; state.player.mp = s.mp;
    toast('Rested at Hearth House. HP and MP restored.');
    updateUI(); saveGame();
  }

  function openShop() {
    state.paused = true;
    const stock = [generateItem(Math.max(1,state.player.level)), generateItem(Math.max(1,state.player.level)), generateItem(Math.max(1,state.player.level+1))];
    overlay.classList.remove('hidden');
    overlay.innerHTML = `<div class="modal"><h2>Copper Anvil</h2><p class="subtitle">Field gear, reforged from whatever the caravans drag in. Gold: <b>${state.player.gold}</b></p><div class="item-grid">${stock.map((i,n)=>itemCard(i, 22+i.level*7, `data-buy="${n}"`)).join('')}</div><div class="btn-row"><button data-close>Leave</button></div></div>`;
    overlay.querySelector('[data-close]').addEventListener('click', closeOverlay);
    overlay.querySelectorAll('[data-buy]').forEach(btn => btn.addEventListener('click', () => {
      const item = stock[Number(btn.dataset.buy)], cost = 22 + item.level*7;
      if (state.player.gold < cost) return toast('Not enough gold.');
      state.player.gold -= cost; state.player.inventory.push(item); updateUI(); saveGame(); toast(`Bought ${item.rarityName} ${item.name}.`); closeOverlay(); openShop();
    }));
  }

  function openGuild() {
    const q = state.player.quest;
    if (q.complete && !q.claimed) {
      q.claimed = true; state.player.gold += 45; gainXp(70); state.player.potions += 2;
      toast('Trail Guild reward: 45 gold, 70 XP, 2 potions.'); saveGame(); updateUI(); return;
    }
    toast(q.claimed ? 'Guildmaster: “Push east. The old stone road leads to harder country.”' : 'Guildmaster: “Clear three Mosslings near the road and come back.”', 3000);
  }

  function openClassStone() {
    state.paused = true;
    overlay.classList.remove('hidden');
    const p = state.player;
    overlay.innerHTML = `<div class="modal"><h2>The Waystone</h2><p class="subtitle">Changing paths changes your base stats. Skills already learned remain available. New paths unlock for 60 gold after level 3.</p><div class="class-grid">${Object.entries(CLASSES).map(([id,c]) => {
      const unlocked = p.unlockedClasses.includes(id);
      const canBuy = p.level >= 3 && p.gold >= 60;
      return `<div class="card ${p.classId===id?'selected':''}"><div class="pixel-portrait">${c.icon}</div><h3>${c.name}</h3><p>${c.desc}</p><button data-path="${id}" ${(!unlocked && !canBuy)?'disabled':''}>${p.classId===id?'Current Path':unlocked?'Switch Path':'Unlock — 60g'}</button></div>`;
    }).join('')}</div><div class="btn-row"><button data-close>Leave</button></div></div>`;
    overlay.querySelector('[data-close]').addEventListener('click', closeOverlay);
    overlay.querySelectorAll('[data-path]').forEach(btn => btn.addEventListener('click', () => {
      const id = btn.dataset.path;
      if (p.classId === id) return;
      if (!p.unlockedClasses.includes(id)) { p.gold -= 60; p.unlockedClasses.push(id); }
      p.classId = id; learnLevelSkills(); const s = getStats(); p.hp = s.hp; p.mp = s.mp; updateUI(); saveGame(); closeOverlay(); toast(`Path changed: ${CLASSES[id].name}.`);
    }));
  }

  function learnLevelSkills() {
    const p = state.player;
    for (const skill of CLASSES[p.classId].skills) {
      if (p.level >= skill.level && !p.learnedSkills.includes(skill.id)) {
        p.learnedSkills.push(skill.id); toast(`Learned skill: ${skill.name}`);
      }
    }
  }

  function allSkills() {
    const out = [];
    for (const c of Object.values(CLASSES)) for (const s of c.skills) if (state.player.learnedSkills.includes(s.id)) out.push(s);
    return out;
  }

  function startBattle(enemy) {
    if (state.mode !== 'world' || state.paused) return;
    state.mode = 'battle'; state.paused = true;
    state.battle = { enemy, enemyHp: enemy.hpMax, log: [`A ${ENEMY_TYPES[enemy.type].name} blocks your path.`], enemyStunned: false };
    renderBattle();
  }

  function renderBattle() {
    const p = state.player, b = state.battle, e = b.enemy, eb = ENEMY_TYPES[e.type], s = getStats();
    overlay.classList.remove('hidden');
    overlay.innerHTML = `<div class="modal"><h2>Battle — ${eb.name}</h2><p class="subtitle">Level ${e.level}${eb.boss?' · ELITE':''}</p><div class="battle-grid"><div class="fighter"><div class="pixel-portrait">${CLASSES[p.classId].icon}</div><b>${CLASSES[p.classId].name} · Lv ${p.level}</b>${bar('HP',p.hp,s.hp,'')}${bar('MP',p.mp,s.mp,'mana')}</div><div class="fighter"><div class="pixel-portrait">${eb.icon}</div><b>${eb.name} · Lv ${e.level}</b>${bar('HP',b.enemyHp,e.hpMax,'')}</div></div><div class="battle-log">${b.log.slice(-8).map(x=>`<div>› ${x}</div>`).join('')}</div><div class="btn-row"><button data-action="attack">Attack</button><button data-action="skills">Skills</button><button data-action="potion" ${p.potions<=0?'disabled':''}>Potion (${p.potions})</button><button data-action="flee" class="danger">Flee</button></div></div>`;
    overlay.querySelector('[data-action="attack"]').addEventListener('click', () => playerAttack());
    overlay.querySelector('[data-action="skills"]').addEventListener('click', () => renderSkills());
    overlay.querySelector('[data-action="potion"]').addEventListener('click', () => usePotionBattle());
    overlay.querySelector('[data-action="flee"]').addEventListener('click', fleeBattle);
  }

  function bar(label, current, max, cls) {
    const pct = Math.max(0, Math.min(100, current/max*100));
    return `<div class="small">${label} ${Math.max(0,Math.round(current))}/${Math.round(max)}</div><div class="bar ${cls}"><i style="width:${pct}%"></i></div>`;
  }

  function playerAttack(skill = null) {
    const p = state.player, s = getStats(), b = state.battle, e = b.enemy;
    let damage;
    if (!skill) {
      const crit = Math.random() < .08 + s.spd*.002;
      damage = Math.max(1, Math.round((s.atk*1.45 - e.def*.72) * (.9+Math.random()*.2) * (crit?1.6:1)));
      b.log.push(`${crit?'Critical! ':''}You strike for ${damage}.`);
    } else {
      if (p.mp < skill.mp) { b.log.push('Not enough MP.'); renderBattle(); return; }
      p.mp -= skill.mp;
      if (skill.heal) { const amount = Math.round(s.hp*skill.heal); p.hp = Math.min(s.hp,p.hp+amount); b.log.push(`${skill.name} restores ${amount} HP.`); enemyTurn(); return; }
      if (skill.buff === 'evade') { p.evade = true; b.log.push('You vanish into a veil of smoke.'); enemyTurn(); return; }
      const stat = skill.type === 'magic' ? s.mag : s.atk;
      const defense = skill.type === 'magic' ? e.def*.45 : e.def*.65;
      let power = skill.power;
      if (skill.execute && b.enemyHp/e.hpMax < .4) power *= 1.65;
      const crit = Math.random() < (.08 + (skill.crit||0));
      damage = Math.max(1, Math.round((stat*1.55*power-defense)*(.92+Math.random()*.18)*(crit?1.6:1)));
      b.log.push(`${skill.name}${crit?' critically':''} hits for ${damage}.`);
      if (skill.stun && Math.random() < skill.stun) { b.enemyStunned = true; b.log.push(`${ENEMY_TYPES[e.type].name} is stunned.`); }
    }
    b.enemyHp -= damage;
    if (b.enemyHp <= 0) return winBattle();
    enemyTurn();
  }

  function renderSkills() {
    const skills = allSkills();
    const p = state.player;
    overlay.innerHTML = `<div class="modal narrow"><h2>Known Skills</h2><p class="subtitle">Skills learned from previous paths stay known.</p><div class="skill-grid">${skills.map((s,i)=>`<div class="card"><h3>${s.name}</h3><p>${s.text}</p><div class="small">MP ${s.mp}</div><button data-skill="${i}" ${p.mp<s.mp?'disabled':''}>Use</button></div>`).join('')}</div><div class="btn-row"><button data-back>Back</button></div></div>`;
    overlay.querySelector('[data-back]').addEventListener('click', renderBattle);
    overlay.querySelectorAll('[data-skill]').forEach(btn => btn.addEventListener('click', () => playerAttack(skills[Number(btn.dataset.skill)])));
  }

  function enemyTurn() {
    const p = state.player, s = getStats(), b = state.battle, e = b.enemy, eb = ENEMY_TYPES[e.type];
    if (b.enemyStunned) { b.enemyStunned = false; b.log.push(`${eb.name} loses its turn.`); renderBattle(); return; }
    if (p.evade && Math.random() < .7) { p.evade = false; b.log.push(`You evade ${eb.name}'s attack.`); renderBattle(); return; }
    p.evade = false;
    const defense = eb.magic ? s.def*.45 : s.def;
    const damage = Math.max(1, Math.round((e.atk*1.5 - defense*.62) * (.88+Math.random()*.24)));
    p.hp -= damage; b.log.push(`${eb.name} hits you for ${damage}.`);
    if (p.hp <= 0) loseBattle(); else renderBattle();
  }

  function usePotionBattle() {
    const p = state.player, s = getStats();
    if (p.potions <= 0) return;
    p.potions--; const heal = Math.round(s.hp*.45); p.hp = Math.min(s.hp,p.hp+heal); state.battle.log.push(`You drink a tonic and recover ${heal} HP.`); enemyTurn();
  }

  function winBattle() {
    const p = state.player, e = state.battle.enemy, eb = ENEMY_TYPES[e.type];
    e.alive = false; e.respawn = eb.boss ? 45 : 18;
    const gold = randInt(eb.gold[0],eb.gold[1]) + e.level*2;
    p.gold += gold;
    const xp = Math.round(eb.xp*(1+(e.level-eb.minLevel)*.12));
    let loot = null;
    if (Math.random() < (eb.boss?.95:.44)) { loot = generateItem(e.level); p.inventory.push(loot); }
    if (e.type === 'mossling' && !p.quest.claimed) { p.quest.kills = Math.min(p.quest.target,p.quest.kills+1); p.quest.complete = p.quest.kills >= p.quest.target; }
    gainXp(xp);
    state.mode = 'world'; state.battle = null; closeOverlay();
    toast(`Victory: +${xp} XP, +${gold}g${loot?` · ${loot.rarityName} ${loot.name}`:''}`, 3300);
    updateUI(); saveGame();
  }

  function loseBattle() {
    const p = state.player, s = getStats();
    p.gold = Math.max(0, p.gold - Math.ceil(p.gold*.08));
    p.x = 12.5*TILE; p.y = 25.5*TILE; p.hp = s.hp; p.mp = s.mp;
    state.mode='world'; state.battle=null; closeOverlay(); toast('You wake in Hearthcross. Some gold was lost.', 3000); updateUI(); saveGame();
  }

  function fleeBattle() {
    if (Math.random() < .72) { state.mode='world'; state.battle=null; closeOverlay(); toast('You escaped.'); }
    else { state.battle.log.push('Could not escape!'); enemyTurn(); }
  }

  function gainXp(amount) {
    const p = state.player; p.xp += amount;
    while (p.xp >= p.xpNext) {
      p.xp -= p.xpNext; p.level++; p.xpNext = Math.round(p.xpNext*1.34 + 18);
      learnLevelSkills(); const s = getStats(); p.hp = s.hp; p.mp = s.mp; toast(`Level ${p.level}! Your strength grows.`);
    }
  }

  function openInventory() {
    if (!state.started || state.mode !== 'world') return;
    state.paused = true;
    const p = state.player;
    overlay.classList.remove('hidden');
    const equipped = Object.entries(p.equipment).map(([slot,item]) => `<div class="stat-line"><span>${slot}</span><b>${item ? `${item.rarityName} ${item.name}` : '—'}</b></div>`).join('');
    overlay.innerHTML = `<div class="modal"><h2>Pack & Equipment</h2><p class="subtitle">Click an item to equip it. Equipment is where most of your power comes from.</p><div class="two-col"><div class="card"><h3>Equipped</h3>${equipped}<div class="btn-row"><button data-close>Close</button></div></div><div><div class="item-grid">${p.inventory.length ? p.inventory.map((i,n)=>itemCard(i,null,`data-equip="${n}"`)).join('') : '<div class="card"><p>Your pack is empty.</p></div>'}</div></div></div></div>`;
    overlay.querySelector('[data-close]').addEventListener('click', closeOverlay);
    overlay.querySelectorAll('[data-equip]').forEach(btn => btn.addEventListener('click', () => {
      const item = p.inventory[Number(btn.dataset.equip)]; const old = p.equipment[item.slot]; p.equipment[item.slot]=item; p.inventory.splice(Number(btn.dataset.equip),1); if(old) p.inventory.push(old); ensureVitals(); saveGame(); updateUI(); closeOverlay(); openInventory();
    }));
  }

  function itemCard(item, cost, attr='') {
    const stats = Object.entries(item.bonus).map(([k,v])=>`+${v} ${k.toUpperCase()}`).join(' · ');
    return `<div class="card item-card"><div class="rarity r-${item.rarity}">${item.rarityName}</div><h3>${item.name}</h3><p>${item.slot.toUpperCase()} · Lv ${item.level}<br>${stats}</p>${cost!==null?`<button ${attr}>Buy — ${cost}g</button>`:`<button ${attr}>Equip</button>`}</div>`;
  }

  function openCharacter() {
    if (!state.started || state.mode !== 'world') return;
    state.paused = true;
    const p=state.player,s=getStats(), c=CLASSES[p.classId];
    overlay.classList.remove('hidden');
    overlay.innerHTML = `<div class="modal narrow"><h2>${c.icon} ${c.name} · Level ${p.level}</h2><p class="subtitle">XP ${p.xp}/${p.xpNext} · ${p.gold} gold · ${p.potions} tonics</p>${Object.entries(s).map(([k,v])=>`<div class="stat-line"><span>${k.toUpperCase()}</span><b>${v}</b></div>`).join('')}<h3>Known Skills</h3>${allSkills().map(s=>`<div class="stat-line"><span>${s.name}</span><b>MP ${s.mp}</b></div>`).join('')}<div class="btn-row"><button data-close>Close</button><button class="danger" data-reset>Reset Save</button></div></div>`;
    overlay.querySelector('[data-close]').addEventListener('click', closeOverlay);
    overlay.querySelector('[data-reset]').addEventListener('click', () => { if(confirm('Delete local Emberwild save?')) { localStorage.removeItem(SAVE_KEY); location.reload(); } });
  }

  function updateUI() {
    if (!state.player) return;
    const p=state.player,s=getStats();
    hud.innerHTML = `<div class="hud-chip">${CLASSES[p.classId].name}<br><strong>Lv ${p.level}</strong></div><div class="hud-chip">HP<br><strong>${Math.max(0,Math.round(p.hp))}/${s.hp}</strong></div><div class="hud-chip">MP<br><strong>${Math.round(p.mp)}/${s.mp}</strong></div><div class="hud-chip">Gold<br><strong>${p.gold}</strong></div>`;
    const q=p.quest;
    questEl.innerHTML = `<div class="quest-title">${q.claimed?'✓ ':''}Green Problem</div><div class="quest-text">${q.claimed?'The Trail Guild is satisfied. Head east and find stronger prey.':'The Trail Guild wants the Mosslings near Hearthcross thinned out.'}</div><div class="quest-progress">${q.claimed?'Complete':q.complete?'Return to the Trail Guild':`${q.kills}/${q.target} Mosslings defeated`}</div>`;
  }

  function draw() {
    ctx.fillStyle = '#080c09'; ctx.fillRect(0,0,canvas.width,canvas.height);
    if (!state.started) return;
    const cam=state.camera;
    const x0=Math.floor(cam.x/TILE),y0=Math.floor(cam.y/TILE),x1=Math.min(WORLD_W,x0+Math.ceil(canvas.width/TILE)+2),y1=Math.min(WORLD_H,y0+Math.ceil(canvas.height/TILE)+2);
    for(let y=Math.max(0,y0);y<y1;y++) for(let x=Math.max(0,x0);x<x1;x++) drawTile(x,y,state.world[y][x],cam);
    for(const b of state.buildings) drawBuilding(b,cam);
    for(const n of state.npcs) drawNpc(n,cam);
    for(const e of state.enemies) if(e.alive) drawEnemy(e,cam);
    drawPlayer(cam);
    drawMinimap();
  }

  function drawTile(x,y,t,cam){
    const sx=x*TILE-cam.x,sy=y*TILE-cam.y;
    ctx.fillStyle=COLORS[t]||COLORS.grass;ctx.fillRect(Math.floor(sx),Math.floor(sy),TILE+1,TILE+1);
    const h=(x*31+y*17)%7;
    if(t==='grass'||t==='forest'){ctx.fillStyle=t==='forest'?'#315b38':'#4d7c52'; if(h<4)ctx.fillRect(sx+5+h*3,sy+8+(h%2)*8,3,5);}
    if(t==='water'){ctx.fillStyle='#34617e'; if(h<5)ctx.fillRect(sx+4,sy+8+h*3,14,2);}
    if(t==='road'){ctx.fillStyle='#8b7e61';ctx.fillRect(sx,sy+13,TILE,5);}
    if(t==='town'){ctx.fillStyle='#a28a66'; if(h<3)ctx.fillRect(sx+4+h*8,sy+5,4,4);}
    if(t==='mountain'){ctx.fillStyle='#717776';ctx.beginPath();ctx.moveTo(sx+4,sy+28);ctx.lineTo(sx+16,sy+5);ctx.lineTo(sx+29,sy+28);ctx.fill();}
  }

  function drawBuilding(b,cam){const x=b.x-cam.x,y=b.y-cam.y;ctx.fillStyle='#2b241d';ctx.fillRect(x-3,y-3,b.w+6,b.h+6);ctx.fillStyle=b.color;ctx.fillRect(x,y,b.w,b.h);ctx.fillStyle='#d7c6a0';ctx.fillRect(x+b.w*.38,y+b.h*.62,b.w*.24,b.h*.38);ctx.fillStyle='#171a17';ctx.font='10px monospace';ctx.fillText(b.name,x,y-6);}
  function drawNpc(n,cam){const x=n.x-cam.x,y=n.y-cam.y;ctx.fillStyle=n.color;ctx.fillRect(x-7,y-9,14,18);ctx.fillStyle='#171a17';ctx.fillRect(x-4,y-14,8,7);}
  function drawEnemy(e,cam){const x=e.x-cam.x,y=e.y-cam.y,base=ENEMY_TYPES[e.type];ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.fillStyle='#0007';ctx.beginPath();ctx.ellipse(0,10,e.radius,5,0,0,Math.PI*2);ctx.fill();ctx.fillStyle=base.color;ctx.fillRect(-e.radius,-e.radius,e.radius*2,e.radius*2);ctx.fillStyle='#f0ead8';ctx.fillRect(-5,-4,3,3);ctx.fillRect(3,-4,3,3);if(base.boss){ctx.strokeStyle='#d6b45b';ctx.lineWidth=2;ctx.strokeRect(-e.radius-3,-e.radius-3,e.radius*2+6,e.radius*2+6);}ctx.restore();}
  function drawPlayer(cam){const p=state.player,x=p.x-cam.x,y=p.y-cam.y;ctx.fillStyle='#0008';ctx.beginPath();ctx.ellipse(x,y+9,10,4,0,0,Math.PI*2);ctx.fill();ctx.fillStyle=p.classId==='vanguard'?'#aeb9bf':p.classId==='arcanist'?'#9879bc':'#b48462';ctx.fillRect(Math.round(x-8),Math.round(y-10),16,20);ctx.fillStyle='#e7d8bc';ctx.fillRect(Math.round(x-5),Math.round(y-17),10,9);ctx.strokeStyle='#f3c969';ctx.strokeRect(Math.round(x-9),Math.round(y-18),18,30);}
  function drawMinimap(){const w=148,h=100,x=canvas.width-w-10,y=10;ctx.globalAlpha=.9;ctx.fillStyle='#07100b';ctx.fillRect(x,y,w,h);ctx.strokeStyle='#69806e';ctx.strokeRect(x,y,w,h);const sx=w/(WORLD_W*TILE),sy=h/(WORLD_H*TILE);ctx.fillStyle='#d9be65';ctx.fillRect(x+state.player.x*sx-2,y+state.player.y*sy-2,4,4);ctx.fillStyle='#cf765f';for(const e of state.enemies)if(e.alive&&ENEMY_TYPES[e.type].boss)ctx.fillRect(x+e.x*sx-2,y+e.y*sy-2,4,4);ctx.globalAlpha=1;}

  function toast(msg, ms=2200){toastEl.textContent=msg;toastEl.classList.remove('hidden');clearTimeout(toastEl._timer);toastEl._timer=setTimeout(()=>toastEl.classList.add('hidden'),ms);}
  function randInt(a,b){return Math.floor(a+Math.random()*(b-a+1));}

  function saveGame(){
    if(!state.player)return;
    const p=state.player;
    const data={player:{...p}, enemies:state.enemies.map(e=>({id:e.id,alive:e.alive,respawn:e.respawn}))};
    localStorage.setItem(SAVE_KEY,JSON.stringify(data));state.lastSave=performance.now();
  }

  function loadGame(){
    try{
      const raw=localStorage.getItem(SAVE_KEY);if(!raw)return false;
      const data=JSON.parse(raw);buildWorld();state.player=data.player;spawnEnemies();
      for(const saved of data.enemies||[]){const e=state.enemies.find(x=>x.id===saved.id);if(e){e.alive=saved.alive;e.respawn=saved.respawn||0;}}
      state.started=true;ensureVitals();updateUI();return true;
    }catch(err){console.warn('Save load failed',err);return false;}
  }

  window.addEventListener('keydown',e=>{
    const k=e.key.toLowerCase();
    if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(k)){state.keys.add(k);e.preventDefault();}
    if(e.repeat)return;
    if(k==='e')interact();
    if(k==='i')openInventory();
    if(k==='c')openCharacter();
    if(k==='escape'&&!overlay.classList.contains('hidden')&&state.mode==='world')closeOverlay();
  });
  window.addEventListener('keyup',e=>state.keys.delete(e.key.toLowerCase()));
  window.addEventListener('beforeunload',saveGame);

  let last=performance.now();
  function loop(now){const dt=Math.min(.05,(now-last)/1000);last=now;update(dt);draw();requestAnimationFrame(loop);}

  buildWorld();
  if(loadGame()){toast('Save loaded. Welcome back to Emberwild.');}
  else showClassChoice();
  requestAnimationFrame(loop);
})();
