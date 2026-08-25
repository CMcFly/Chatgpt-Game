(() => {
  'use strict';

  const PROLOGUE_KEY = 'emberwild-prologue-v1';
  const SESSION_SKIP = 'emberwild-skip-prologue-once';
  const SAVE_KEY = 'emberwild-save-v2';
  const OLD_SAVE_KEY = 'emberwild-save-v1';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const hud = document.getElementById('hud');
  const questEl = document.getElementById('quest');
  const overlay = document.getElementById('overlay');
  const toastEl = document.getElementById('toast');
  const interactionEl = document.getElementById('interaction');

  const TILE = 32;
  const MAP_W = 40;
  const MAP_H = 24;
  const keys = new Set();

  const state = {
    stage: 'intro',
    paused: true,
    player: { x: 5.5 * TILE, y: 16.5 * TILE, hp: 48, hpMax: 48, potions: 0, speed: 165 },
    startX: 5.5 * TILE,
    startY: 16.5 * TILE,
    camera: { x: 0, y: 0 },
    satchel: { x: 10.5 * TILE, y: 15.5 * TILE, taken: false },
    mossling: { x: 17.5 * TILE, y: 15.5 * TILE, alive: true, hp: 28, hpMax: 28 },
    horror: { x: 33.5 * TILE, y: 14.5 * TILE, alive: true, hp: 240, hpMax: 240 },
    battle: null,
    moved: 0,
    walk: 0,
    lastMove: { dx: 1, dy: 0 },
    last: performance.now(),
  };

  installStyles();
  boot();

  function installStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .prologue-card{max-width:760px}.prologue-system{border:1px solid #59745f;background:#09120d;padding:14px 16px;margin:14px 0;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:#b9d9bd;box-shadow:inset 0 0 24px #0006}.prologue-system strong{color:#e9da8d}.prologue-slide{min-height:230px;display:flex;flex-direction:column;justify-content:center}.prologue-slide h2{font-size:30px;margin:0 0 14px}.prologue-slide p{font-size:15px;line-height:1.75;color:#bdc8c0}.prologue-kicker{font-size:11px;letter-spacing:.2em;color:#8fa798;text-transform:uppercase;margin-bottom:10px}.prologue-warning{color:#e3a67e!important}.prologue-debt{border-left:3px solid #c79d54;padding-left:14px}.prologue-choice{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:18px}.prologue-choice button{min-height:48px}.prologue-fade{position:absolute;inset:0;background:#020302;display:grid;place-items:center;color:#d9e2dc;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.16em;z-index:10}.prologue-fade strong{font-size:22px}.prologue-hint{color:#e1d38a}.prologue-battle-note{margin-top:10px;color:#92a398;font-size:11px}.prologue-objective{font-size:12px;line-height:1.55}.prologue-objective b{color:#e4d384}`;
    document.head.appendChild(style);
  }

  function boot() {
    const hasSave = !!(localStorage.getItem(SAVE_KEY) || localStorage.getItem(OLD_SAVE_KEY));
    if (hasSave) return showExistingSaveChoice();
    showIntro(0);
    requestAnimationFrame(loop);
  }

  function showExistingSaveChoice() {
    overlay.classList.remove('hidden');
    overlay.innerHTML = `<div class="modal prologue-card"><div class="prologue-kicker">NEW OPENING BUILD</div><h2>Hollowpath Prologue</h2><p class="subtitle">This build adds the new isekai opening, tutorial zone, scripted defeat, rescue, and Hearthcross debt setup.</p><div class="card"><p>Starting the prologue creates a fresh prototype run so the opening flows correctly into Hearthcross.</p></div><div class="prologue-choice"><button class="primary" data-new>Start New Prologue<br><span class="small">Resets current prototype save</span></button><button data-old>Continue Existing Save<br><span class="small">Skip prologue this session</span></button></div></div>`;
    overlay.querySelector('[data-new]').onclick = () => {
      localStorage.removeItem(SAVE_KEY);
      localStorage.removeItem(OLD_SAVE_KEY);
      showIntro(0);
      requestAnimationFrame(loop);
    };
    overlay.querySelector('[data-old]').onclick = () => {
      sessionStorage.setItem(SESSION_SKIP, '1');
      location.reload();
    };
  }

  const introSlides = [
    {
      kicker: 'SOMEWHERE ELSE',
      title: 'You remember another world.',
      body: 'Streetlights. A screen in your hand. A life that made sense right up until the instant it didn’t. Then came impact—white noise—nothing.'
    },
    {
      kicker: 'NO SIGNAL',
      title: 'Something finds you in the dark.',
      body: `<div class="prologue-system"><strong>SYSTEM INITIALIZATION</strong><br>Host consciousness: detected<br>World designation: UNKNOWN<br>Compatibility: acceptable<br><br><strong>Recommendation: survive.</strong></div>`
    },
    {
      kicker: 'EMBERWILD',
      title: 'You wake beneath unfamiliar trees.',
      body: 'No road signs. No phone signal. No idea how you got here. A translucent prompt hangs at the edge of your vision like it has always belonged there.'
    },
    {
      kicker: 'SYSTEM NOTICE',
      title: 'Basic motor control confirmed.',
      body: `<div class="prologue-system">Movement interface available.<br><strong>WASD / Arrow Keys</strong> — Move<br><strong>E</strong> — Interact<br><br>Local path designation: <strong>HOLLOWPATH — UNMAPPED</strong></div>`
    }
  ];

  function showIntro(index) {
    state.paused = true;
    state.stage = 'intro';
    const slide = introSlides[index];
    overlay.classList.remove('hidden');
    overlay.innerHTML = `<div class="modal prologue-card prologue-slide"><div class="prologue-kicker">${slide.kicker}</div><h2>${slide.title}</h2><div>${slide.body}</div><div class="btn-row"><button class="primary" data-next>${index === introSlides.length - 1 ? 'Wake Up' : 'Continue'}</button></div></div>`;
    overlay.querySelector('[data-next]').onclick = () => {
      if (index < introSlides.length - 1) showIntro(index + 1);
      else beginTutorial();
    };
  }

  function beginTutorial() {
    overlay.classList.add('hidden');
    overlay.innerHTML = '';
    state.stage = 'move';
    state.paused = false;
    toast('SYSTEM: Move along the trail.');
    updateUI();
  }

  function updateUI() {
    hud.innerHTML = `<div class="hud-chip">UNBOUND<br><strong>Lv ?</strong></div><div class="hud-chip">HP<br><strong>${Math.max(0, Math.round(state.player.hp))}/${state.player.hpMax}</strong></div><div class="hud-chip">Status<br><strong>${state.stage === 'defeat' ? 'CRITICAL' : 'UNKNOWN'}</strong></div>`;
    let title = 'Wake Up', text = 'Figure out where you are.', progress = 'Move with WASD / Arrow Keys';
    if (state.stage === 'satchel') { title = 'First Steps'; text = 'The System highlighted something beside the trail.'; progress = 'Press E near the abandoned satchel'; }
    if (state.stage === 'mossling') { title = 'Hostile Contact'; text = 'A small creature blocks the trail. Walk into it to engage.'; progress = 'Defeat the Stray Mossling'; }
    if (state.stage === 'disturbance') { title = 'Unidentified Disturbance'; text = 'The System detected a violent mana spike farther down the Hollowpath.'; progress = 'Follow the trail east'; }
    if (state.stage === 'defeat') { title = 'Threat Assessment'; text = 'The System made a mistake.'; progress = 'SURVIVE'; }
    questEl.innerHTML = `<div class="quest-title">${title}</div><div class="quest-text prologue-objective">${text}</div><div class="quest-progress">${progress}</div>`;
  }

  function update(dt) {
    if (state.paused || state.stage === 'intro' || state.stage === 'rescue') return;
    let dx = 0, dy = 0;
    if (keys.has('w') || keys.has('arrowup')) dy--;
    if (keys.has('s') || keys.has('arrowdown')) dy++;
    if (keys.has('a') || keys.has('arrowleft')) dx--;
    if (keys.has('d') || keys.has('arrowright')) dx++;
    if (dx || dy) {
      const len = Math.hypot(dx, dy); dx /= len; dy /= len;
      state.lastMove = { dx, dy };
      state.walk += dt * 9;
      const oldX = state.player.x, oldY = state.player.y;
      const nx = state.player.x + dx * state.player.speed * dt;
      const ny = state.player.y + dy * state.player.speed * dt;
      if (walkable(nx, state.player.y)) state.player.x = nx;
      if (walkable(state.player.x, ny)) state.player.y = ny;
      state.moved += Math.hypot(state.player.x - oldX, state.player.y - oldY);
    }

    if (state.stage === 'move' && state.moved > TILE * 2.2) {
      state.stage = 'satchel';
      toast('SYSTEM: Interaction target detected.');
      updateUI();
    }

    const satchelDist = Math.hypot(state.player.x - state.satchel.x, state.player.y - state.satchel.y);
    if (state.stage === 'satchel' && satchelDist < 66) {
      interactionEl.textContent = 'E — Search abandoned satchel';
      interactionEl.classList.remove('hidden');
    } else if (!state.battle) interactionEl.classList.add('hidden');

    if (state.stage === 'mossling' && state.mossling.alive && Math.hypot(state.player.x - state.mossling.x, state.player.y - state.mossling.y) < 25) startBattle('mossling');
    if (state.stage === 'disturbance' && state.horror.alive && Math.hypot(state.player.x - state.horror.x, state.player.y - state.horror.y) < 30) startBattle('horror');

    state.camera.x += ((state.player.x - canvas.width / 2) - state.camera.x) * Math.min(1, dt * 8);
    state.camera.y += ((state.player.y - canvas.height / 2) - state.camera.y) * Math.min(1, dt * 8);
    state.camera.x = Math.max(0, Math.min(MAP_W * TILE - canvas.width, state.camera.x));
    state.camera.y = Math.max(0, Math.min(MAP_H * TILE - canvas.height, state.camera.y));
  }

  function walkable(px, py) {
    const tx = px / TILE, ty = py / TILE;
    if (tx < 1 || tx > MAP_W - 2 || ty < 5 || ty > 20) return false;
    const trail = trailY(tx);
    return Math.abs(ty - trail) < 4.4;
  }

  function trailY(tx) { return 15 + Math.sin(tx * .24) * 1.4 + Math.sin(tx * .08) * .7; }

  function interact() {
    if (state.paused || state.battle) return;
    if (state.stage === 'satchel' && Math.hypot(state.player.x - state.satchel.x, state.player.y - state.satchel.y) < 66) {
      state.satchel.taken = true;
      state.player.potions = 1;
      state.stage = 'mossling';
      interactionEl.classList.add('hidden');
      toast('Found: Field Tonic. SYSTEM: Contact ahead. Walk into a creature to engage.');
      updateUI();
    }
  }

  function startBattle(kind) {
    state.paused = true;
    state.battle = kind === 'mossling'
      ? { kind, name: 'Stray Mossling', hp: state.mossling.hp, hpMax: state.mossling.hpMax, turn: 0, log: ['The creature shudders and blocks the trail.'] }
      : { kind, name: 'Veilfang', hp: state.horror.hp, hpMax: state.horror.hpMax, turn: 0, log: ['The System marker turns red.', 'Something enormous steps out of the trees.'] };
    if (kind === 'horror') state.stage = 'defeat';
    updateUI();
    renderBattle();
  }

  function renderBattle() {
    const b = state.battle;
    overlay.classList.remove('hidden');
    const forced = b.kind === 'horror';
    overlay.innerHTML = `<div class="modal"><h2>Battle — ${b.name}</h2><p class="subtitle">${forced ? 'LEVEL: ??? · THREAT: UNRESOLVED' : 'Tutorial encounter · Neutral creature'}</p><div class="battle-grid"><div class="fighter"><div class="pixel-portrait">🧍</div><b>Unbound</b>${bar('HP', state.player.hp, state.player.hpMax)}</div><div class="fighter"><div class="pixel-portrait">${forced ? '🐺' : '🟢'}</div><b>${b.name}</b>${bar('HP', b.hp, b.hpMax)}</div></div><div class="battle-log">${b.log.slice(-8).map(x => `<div>› ${x}</div>`).join('')}</div>${forced ? '<div class="prologue-battle-note">SYSTEM WARNING: Threat data is unstable.</div>' : ''}<div class="btn-row"><button data-attack>Attack</button><button data-potion ${state.player.potions <= 0 ? 'disabled' : ''}>Potion (${state.player.potions})</button><button data-flee class="danger">Flee</button></div></div>`;
    overlay.querySelector('[data-attack]').onclick = playerAttack;
    overlay.querySelector('[data-potion]').onclick = usePotion;
    overlay.querySelector('[data-flee]').onclick = flee;
  }

  function bar(label, current, max) {
    const pct = Math.max(0, Math.min(100, current / max * 100));
    return `<div class="small">${label} ${Math.max(0, Math.round(current))}/${max}</div><div class="bar"><i style="width:${pct}%"></i></div>`;
  }

  function playerAttack() {
    const b = state.battle;
    if (b.kind === 'horror') {
      const damage = 1 + Math.floor(Math.random() * 3);
      b.hp -= damage;
      b.log.push(`You strike for ${damage}. It barely notices.`);
      return enemyTurn();
    }
    const damage = 9 + Math.floor(Math.random() * 5);
    b.hp -= damage;
    b.log.push(`You strike for ${damage}.`);
    if (b.hp <= 0) return winTutorialBattle();
    enemyTurn();
  }

  function usePotion() {
    if (state.player.potions <= 0) return;
    state.player.potions--;
    const heal = 22;
    state.player.hp = Math.min(state.player.hpMax, state.player.hp + heal);
    state.battle.log.push(`You drink the tonic and recover ${heal} HP.`);
    enemyTurn();
  }

  function flee() {
    const b = state.battle;
    if (b.kind === 'horror') {
      b.log.push('You turn to run. The Veilfang is already behind you.');
      return enemyTurn(true);
    }
    b.log.push('SYSTEM: Retreat available, but the tutorial requires a successful engagement.');
    renderBattle();
  }

  function enemyTurn(fleeAttempt = false) {
    const b = state.battle;
    b.turn++;
    if (b.kind === 'horror') {
      if (b.turn === 1) b.log.push('SYSTEM: Threat assessment recalculating...');
      if (b.turn === 2) b.log.push('SYSTEM WARNING: Survival probability below acceptable threshold.');
      if (b.turn >= 3 || fleeAttempt && b.turn >= 2) {
        state.player.hp = 0;
        b.log.push('The Veilfang moves faster than your vision can follow.');
        renderBattle();
        setTimeout(forcedDefeat, 700);
        return;
      }
      const damage = 15 + Math.floor(Math.random() * 5);
      state.player.hp = Math.max(1, state.player.hp - damage);
      b.log.push(`Veilfang tears through your guard for ${damage}.`);
      renderBattle();
      return;
    }
    const damage = 4 + Math.floor(Math.random() * 3);
    state.player.hp -= damage;
    b.log.push(`Stray Mossling hits you for ${damage}.`);
    if (state.player.hp <= 0) {
      state.player.hp = 12;
      b.log.push('SYSTEM SAFEGUARD: Vital failure prevented during calibration.');
    }
    renderBattle();
  }

  function winTutorialBattle() {
    state.mossling.alive = false;
    state.battle = null;
    state.paused = false;
    overlay.classList.add('hidden');
    overlay.innerHTML = '';
    state.stage = 'disturbance';
    toast('SYSTEM: Combat calibration complete. New anomaly detected farther east.');
    updateUI();
  }

  function forcedDefeat() {
    if (!state.battle || state.battle.kind !== 'horror') return;
    state.battle = null;
    overlay.innerHTML = `<div class="prologue-fade"><div><strong>CONSCIOUSNESS LOST</strong><br><br><span>Signal interrupted.</span></div></div>`;
    setTimeout(() => showRescue(0), 1100);
  }

  const rescueSlides = [
    {
      kicker: 'LATER',
      title: 'You wake beneath a patched roof.',
      body: 'Smoke stings your eyes. Your ribs hurt. Someone has wrapped half your body in bandages that look older than you feel.'
    },
    {
      kicker: 'HEARTHCROSS',
      title: '“About damn time.”',
      body: '<p class="prologue-debt"><b>Rhea:</b> “Name’s Rhea. This wreck outside is Hearthcross—or it was, before the kingdom forgot it existed. I found you bleeding out near the Hollowpath.”</p>'
    },
    {
      kicker: 'OUTSTANDING BALANCE',
      title: 'Apparently, dying is expensive.',
      body: '<p class="prologue-debt"><b>Rhea:</b> “Two tonics. Clean bandages. Food. And I dragged your dead-weight ass through three miles of forest. You owe me.”</p><div class="prologue-system">Debt status: <strong>ACTIVE</strong><br>Creditor recognized: RHEA<br>Repayment terms: <strong>UNRESOLVED</strong></div>'
    },
    {
      kicker: 'FIRST PAYMENT',
      title: 'Rhea has work for you.',
      body: '<p class="prologue-debt"><b>Rhea:</b> “Until we’re square, you work. Start with the Mosslings nesting east of the outpost. The old Trail Guild ledger still works well enough to keep score.”</p><p>Beyond her shoulder you can see Hearthcross: one stubborn foothold in a forest that clearly wants it gone.</p>'
    },
    {
      kicker: 'SYSTEM UPDATE',
      title: 'Your second life begins here.',
      body: '<div class="prologue-system">Safe location registered: <strong>HEARTHCROSS</strong><br>Regional designation: MOSSROAD VALE<br>Debt contract detected.<br><br><strong>Path selection unlocked.</strong></div><p>The Hollowpath is gone from your map. Whatever nearly killed you is still out there.</p>'
    }
  ];

  function showRescue(index) {
    state.stage = 'rescue';
    state.paused = true;
    const slide = rescueSlides[index];
    overlay.classList.remove('hidden');
    overlay.innerHTML = `<div class="modal prologue-card prologue-slide"><div class="prologue-kicker">${slide.kicker}</div><h2>${slide.title}</h2><div>${slide.body}</div><div class="btn-row"><button class="primary" data-next>${index === rescueSlides.length - 1 ? 'Choose Your Path' : 'Continue'}</button></div></div>`;
    overlay.querySelector('[data-next]').onclick = () => {
      if (index < rescueSlides.length - 1) showRescue(index + 1);
      else finishPrologue();
    };
  }

  function finishPrologue() {
    localStorage.setItem(PROLOGUE_KEY, JSON.stringify({ completed: true, completedAt: Date.now(), rescuer: 'Rhea', origin: 'Hollowpath' }));
    location.reload();
  }

  function toast(msg, ms = 2600) {
    toastEl.textContent = msg;
    toastEl.classList.remove('hidden');
    clearTimeout(toastEl._timer);
    toastEl._timer = setTimeout(() => toastEl.classList.add('hidden'), ms);
  }

  function draw() {
    ctx.fillStyle = '#08100b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const cam = state.camera;
    for (let ty = 0; ty < MAP_H; ty++) {
      for (let tx = 0; tx < MAP_W; tx++) {
        const sx = tx * TILE - cam.x, sy = ty * TILE - cam.y;
        const path = Math.abs((ty + .5) - trailY(tx + .5)) < 2.2;
        ctx.fillStyle = path ? '#675f4a' : '#1e3b29';
        ctx.fillRect(sx, sy, TILE + 1, TILE + 1);
        if (path) {
          ctx.fillStyle = '#80745a';
          if ((tx + ty) % 3 === 0) ctx.fillRect(sx + 3, sy + 13, 18, 4);
        } else if (((tx * 17 + ty * 31) % 7) < 3) drawTree(sx + 16, sy + 21, tx + ty);
      }
    }

    if (!state.satchel.taken) {
      const x = state.satchel.x - cam.x, y = state.satchel.y - cam.y;
      ctx.fillStyle = '#7c5d3d'; ctx.fillRect(x - 9, y - 6, 18, 12); ctx.fillStyle = '#d4c37c'; ctx.fillRect(x - 2, y - 7, 4, 4);
    }
    if (state.mossling.alive) drawCreature(state.mossling, '#6faf68', false);
    if (state.horror.alive) drawCreature(state.horror, '#3a2d37', true);
    drawPlayer();
    drawObjectiveMarker();
  }

  function drawTree(x, y, seed) {
    ctx.fillStyle = '#3d2d20'; ctx.fillRect(x - 3, y - 12, 6, 18);
    ctx.fillStyle = seed % 2 ? '#244e32' : '#2b5737';
    ctx.beginPath(); ctx.arc(x, y - 20, 12, 0, Math.PI * 2); ctx.arc(x - 8, y - 14, 9, 0, Math.PI * 2); ctx.arc(x + 8, y - 14, 9, 0, Math.PI * 2); ctx.fill();
  }

  function drawCreature(e, color, horror) {
    const x = e.x - state.camera.x, y = e.y - state.camera.y;
    ctx.fillStyle = '#0008'; ctx.beginPath(); ctx.ellipse(x, y + 10, horror ? 18 : 12, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = color;
    if (horror) {
      ctx.beginPath(); ctx.moveTo(x - 17, y + 9); ctx.lineTo(x - 12, y - 18); ctx.lineTo(x - 4, y - 10); ctx.lineTo(x + 6, y - 22); ctx.lineTo(x + 18, y + 8); ctx.fill();
      ctx.fillStyle = '#dd786f'; ctx.fillRect(x - 8, y - 8, 4, 3); ctx.fillRect(x + 5, y - 8, 4, 3);
    } else {
      ctx.fillRect(x - 11, y - 11, 22, 22); ctx.fillStyle = '#e7ead8'; ctx.fillRect(x - 5, y - 4, 3, 3); ctx.fillRect(x + 3, y - 4, 3, 3);
    }
  }

  function drawPlayer() {
    const x = state.player.x - state.camera.x, y = state.player.y - state.camera.y;
    const bob = Math.sin(state.walk) * 1.2, stride = Math.sin(state.walk) * 3;
    ctx.fillStyle = '#0008'; ctx.beginPath(); ctx.ellipse(x, y + 9, 11, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.translate(Math.round(x), Math.round(y + bob));
    ctx.fillStyle = '#25211d'; ctx.fillRect(-7, -3 + stride, 5, 10); ctx.fillRect(2, -3 - stride, 5, 10);
    ctx.fillStyle = '#444746'; ctx.fillRect(-8, -18, 16, 17);
    ctx.fillStyle = '#56724f'; ctx.fillRect(-9, -17, 18, 4);
    ctx.fillStyle = '#b98765'; ctx.fillRect(-5, -27, 10, 9);
    ctx.fillStyle = '#2b211d'; ctx.fillRect(-6, -29, 12, 5);
    ctx.restore();
  }

  function drawObjectiveMarker() {
    let target = null;
    if (state.stage === 'satchel') target = state.satchel;
    if (state.stage === 'mossling') target = state.mossling;
    if (state.stage === 'disturbance') target = state.horror;
    if (!target) return;
    const x = target.x - state.camera.x, y = target.y - state.camera.y - 30 + Math.sin(performance.now() / 220) * 3;
    ctx.fillStyle = '#e7d56e'; ctx.beginPath(); ctx.moveTo(x, y + 9); ctx.lineTo(x - 7, y); ctx.lineTo(x + 7, y); ctx.fill();
  }

  function loop(now) {
    const dt = Math.min(.05, (now - state.last) / 1000);
    state.last = now;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  window.addEventListener('keydown', event => {
    const key = event.key.toLowerCase();
    if (['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(key)) {
      keys.add(key); event.preventDefault();
    }
    if (!event.repeat && key === 'e') interact();
  });
  window.addEventListener('keyup', event => keys.delete(event.key.toLowerCase()));
})();
