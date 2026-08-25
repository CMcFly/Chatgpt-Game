(() => {
  'use strict';

  const ONBOARDING_KEY = 'emberwild-hearthcross-onboarding-v1';
  const SAVE_KEY = 'emberwild-save-v2';
  const PROFILE_KEY = 'emberwild-profile-v1';
  const TILE = 32;
  const HEARTH = { tx: 34, ty: 140 };
  const RHEA = { x: HEARTH.tx + 1.2, y: HEARTH.ty + 5.3 };
  const HEARTH_HOUSE = { x: HEARTH.tx - 3.5, y: HEARTH.ty - 5 };
  const COPPER_ANVIL = { x: HEARTH.tx + 3.5, y: HEARTH.ty - 5 };
  const layer = document.getElementById('system-menu-layer');
  const hud = document.getElementById('hud');
  const quest = document.getElementById('quest');
  const overlay = document.getElementById('overlay');

  const classes = {
    vanguard: { name:'Vanguard', icon:'🛡️', base:{hp:135,mp:45}, skill:'shield_bash', copy:'Hold the line. Durable frontline fighter with natural DEF growth.' },
    arcanist: { name:'Arcanist', icon:'🔮', base:{hp:92,mp:110}, skill:'ember_bolt', copy:'Shape Emberwild through raw magic. Natural MAG growth each level.' },
    shade: { name:'Shade', icon:'🗡️', base:{hp:105,mp:65}, skill:'quickcut', copy:'Move first and punish openings. Natural SPD growth each level.' },
  };

  let onboarding = readJson(ONBOARDING_KEY);
  if (!onboarding || onboarding.stage === 'complete') return;

  const playerName = String(readJson(PROFILE_KEY)?.name || onboarding.playerName || 'Wanderer');
  let gameReady = false;
  let originalCartography = null;
  let applyingHud = false;
  let applyingQuest = false;
  let pollTimer = null;

  ensureBootstrapSave();
  installStyles();
  installInputGuard();
  waitForGame();

  function readJson(key) {
    try { return JSON.parse(localStorage.getItem(key) || 'null'); }
    catch { return null; }
  }

  function writeOnboarding(patch = {}) {
    onboarding = { ...(onboarding || {}), ...patch, updatedAt: Date.now() };
    localStorage.setItem(ONBOARDING_KEY, JSON.stringify(onboarding));
  }

  function ensureBootstrapSave() {
    if (localStorage.getItem(SAVE_KEY)) return;
    const player = {
      x:(HEARTH.tx+.5)*TILE,
      y:(HEARTH.ty+4.5)*TILE,
      radius:10,
      speed:175,
      classId:'vanguard',
      level:1,
      xp:0,
      xpNext:100,
      gold:18,
      hp:135,
      mp:45,
      potions:3,
      inventory:[],
      materials:{},
      equipment:{weapon:null,head:null,body:null,feet:null,charm:null},
      unlockedClasses:['vanguard'],
      learnedSkills:['shield_bash'],
      statPoints:0,
      freeStats:{hp:0,mp:0,atk:0,def:0,mag:0,spd:0},
      quest:{id:'green_problem',name:'Green Problem',kills:0,target:3,complete:false,claimed:false},
      discoveries:{hearthcross:true},
      evade:false,
      name:playerName,
      story:{unbound:true,hearthcrossStage:0,debtActive:true},
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify({ mapVersion:2, player, enemies:[] }));
  }

  function installStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .hearth-intro-copy{color:#bdc9c1;font-size:13px;line-height:1.72}.hearth-intro-copy p{margin:0 0 12px}.hearth-intro-debt{margin:16px 0;padding:12px 14px;border-left:3px solid #caa95f;background:rgba(126,95,36,.1);color:#c7b98e}.hearth-path-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:18px 0}.hearth-path{padding:16px 12px;border:1px solid #354a3e;background:#07110c;text-align:left}.hearth-path:hover{border-color:#d1bd6c;background:#11190f}.hearth-path-icon{font-size:30px}.hearth-path h3{margin:8px 0 6px;color:#e6d681}.hearth-path p{margin:0;color:#91a39a;font-size:10px;line-height:1.5}@media(max-width:700px){.hearth-path-grid{grid-template-columns:1fr}}`;
    document.head.appendChild(style);
  }

  function waitForGame() {
    const ready = () => {
      if (!window.EmberRuntimeState?.cartography) return false;
      gameReady = true;
      wrapCartography();
      installObservers();
      renderHud();
      renderTracker();
      if (onboarding.stage === 'wake') showWake();
      pollTimer = setInterval(poll, 250);
      return true;
    };
    if (ready()) return;
    const timer = setInterval(() => { if (ready()) clearInterval(timer); }, 40);
  }

  function wrapCartography() {
    if (originalCartography) return;
    originalCartography = window.EmberRuntimeState.cartography;
    window.EmberRuntimeState.cartography = () => {
      const live = originalCartography();
      if (onboarding.stage === 'complete') return live;
      return { kind:'hearthcross', player:live?.player || null, stage:onboarding.stage };
    };
  }

  function installObservers() {
    new MutationObserver(() => {
      if (!applyingHud && onboarding.stage !== 'complete') renderHud();
    }).observe(hud, { childList:true, subtree:true, characterData:true });
    new MutationObserver(() => {
      if (!applyingQuest && onboarding.stage !== 'complete') renderTracker();
    }).observe(quest, { childList:true, subtree:true, characterData:true });
    new MutationObserver(maskBattleUi).observe(overlay, { childList:true, subtree:true });
  }

  function renderHud() {
    if (!gameReady || onboarding.stage === 'complete') return;
    const save = readJson(SAVE_KEY)?.player;
    const hp = save?.hp ?? 135;
    applyingHud = true;
    const wanted = `<div class="hud-chip">PATH<br><strong>Unbound</strong></div><div class="hud-chip">HP<br><strong>${Math.max(0,Math.round(hp))}/135</strong></div><div class="hud-chip">Tonics<br><strong>${save?.potions ?? 3}</strong></div><div class="hud-chip">Debt<br><strong>Active</strong></div>`;
    if (hud.innerHTML !== wanted) hud.innerHTML = wanted;
    applyingHud = false;
  }

  function renderTracker() {
    if (!gameReady || onboarding.stage === 'complete') return;
    const q = currentObjective();
    applyingQuest = true;
    const wanted = `<div class="quest-title">${q.title}</div><div class="quest-text">${q.text}</div><div class="quest-progress">${q.progress}</div>`;
    if (quest.innerHTML !== wanted) quest.innerHTML = wanted;
    applyingQuest = false;
  }

  function currentObjective() {
    const liveQuest = getLive()?.quest || readJson(SAVE_KEY)?.player?.quest;
    const kills = liveQuest?.kills || 0;
    switch (onboarding.stage) {
      case 'wake': return {title:'Hearthcross',text:'You survived the Hollowpath. Barely.',progress:'Open your eyes'};
      case 'rhea': return {title:'A Very Expensive Rescue',text:'Someone dragged you out of the forest.',progress:'Talk to Rhea'};
      case 'inspect_shelter': return {title:'What Still Works',text:'Rhea wants to know what the outpost can actually support.',progress:'Inspect Hearth House'};
      case 'inspect_forge': return {title:'What Still Works',text:'The shelter is usable. The forge is another question.',progress:'Inspect the Copper Anvil'};
      case 'rhea_job': return {title:'First Payment',text:'Rhea has enough information to put you to work.',progress:'Return to Rhea'};
      case 'first_payment': return {title:'First Payment',text:'Thin the Mosslings east of Hearthcross so the outpost can safely recover supplies.',progress:`${Math.min(3,kills)}/3 Mosslings defeated`};
      case 'payment_return': return {title:'First Payment',text:'The immediate threat is cleared.',progress:'Return to Rhea'};
      case 'path_select': return {title:'System Stabilization',text:'Your System is responding to the local anchor.',progress:'Choose your first Path'};
      default: return {title:'Hearthcross',text:'A frontier foothold that has seen much better days.',progress:'Stay alive'};
    }
  }

  function getLive() {
    try { return originalCartography ? originalCartography() : window.EmberRuntimeState?.cartography?.(); }
    catch { return null; }
  }

  function playerPosition() { return getLive()?.player || null; }
  function near(point, radius=2.7) { const p=playerPosition(); return !!p && Math.hypot(p.x-point.x,p.y-point.y)<=radius; }

  function installInputGuard() {
    window.addEventListener('keydown', event => {
      if (onboarding.stage === 'complete' || event.repeat) return;
      const key = event.key.toLowerCase();
      if (key === 'c') {
        event.preventDefault();
        event.stopImmediatePropagation();
        window.EmberSystemUI?.notify?.('SYSTEM: Character Path data remains restricted while you are Unbound.');
        return;
      }
      if (key !== 'e') return;
      event.preventDefault();
      event.stopImmediatePropagation();
      handleInteract();
    }, true);
  }

  function handleInteract() {
    if (!gameReady || window.EmberSystemUI?.isPaused?.()) return;
    if (onboarding.stage === 'rhea' && near(RHEA)) return talkRheaFirst();
    if (onboarding.stage === 'inspect_shelter' && near(HEARTH_HOUSE,3.2)) return inspectShelter();
    if (onboarding.stage === 'inspect_forge' && near(COPPER_ANVIL,3.2)) return inspectForge();
    if (onboarding.stage === 'rhea_job' && near(RHEA)) return assignFirstPayment();
    if (onboarding.stage === 'payment_return' && near(RHEA)) return completeFirstPayment();
    window.EmberSystemUI?.notify?.('Nothing here is part of your current System objective.');
  }

  function showPanel(kicker, title, body, button='Continue', onContinue) {
    window.EmberSystemUI?.openPause?.();
    if (!layer) return;
    layer.innerHTML = `<div class="system-menu-shell" style="width:min(680px,calc(100vw - 30px))"><div class="system-menu-kicker">${kicker}</div><h2 class="system-menu-title">${title}</h2><div class="hearth-intro-copy">${body}</div><div class="system-menu-actions" style="margin-top:18px"><button class="primary" data-hearth-continue><span>${button}</span></button></div></div>`;
    layer.querySelector('[data-hearth-continue]').onclick = () => { closePanel(); onContinue?.(); };
  }

  function closePanel() {
    window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',code:'Escape',bubbles:true}));
  }

  function showWake() {
    showPanel('LATER // SAFE LOCATION DETECTED','You wake beneath a patched roof.',`<p>Smoke stings your eyes. Your ribs hurt. Someone has wrapped your side in old cloth and left a cup of water close enough to reach.</p><div class="prologue-system"><strong>LOCATION REGISTERED: HEARTHCROSS</strong><br>Host condition: STABLE<br>Path status: <strong>UNBOUND</strong><br>Unknown intervention detected during signal loss.</div>`, 'Get Up', () => {
      writeOnboarding({stage:'rhea'});
      renderTracker();
      window.EmberSystemUI?.notify?.('Someone is waiting just outside the shelter.');
    });
  }

  function talkRheaFirst() {
    showPanel('RHEA','About Damn Time',`<p>“There you are. I was starting to think I wasted the bandages.”</p><p>Rhea looks you over with the expression of someone inspecting damaged cargo.</p><p>“I found you half-eaten on the Hollowpath. Dragged you back here, burned two tonics keeping you alive, fed you, and used supplies I do not have enough of.”</p><div class="hearth-intro-debt"><strong>DEBT REGISTERED</strong><br>Rhea considers your rescue expenses very much your problem.</div><p>“Before you start asking where you are or how to leave, help me figure out what still works around here. Then we can discuss what you owe.”</p>`, 'Fine. What do you need?', () => {
      writeOnboarding({stage:'inspect_shelter'});
      renderTracker();
    });
  }

  function inspectShelter() {
    showPanel('SYSTEM INSPECTION','Hearth House',`<p>The building is standing mostly because the forest has not decided otherwise yet. The roof has been patched repeatedly. Half the bunks are unusable. The hearth still draws smoke.</p><div class="prologue-system">Shelter function: <strong>LIMITED</strong><br>Recovery capacity: LOW<br>Repair potential: ACCEPTABLE</div>`, 'Record Condition', () => {
      writeOnboarding({stage:'inspect_forge',shelterInspected:true});
      renderTracker();
    });
  }

  function inspectForge() {
    showPanel('SYSTEM INSPECTION','Copper Anvil',`<p>The forge is cold. The anvil survived. Several tool racks did not. There is enough here to repair equipment eventually, but not enough material or labor to run it properly.</p><div class="prologue-system">Crafting site detected.<br>Current function: <strong>DEGRADED</strong><br>Required inputs: tools · fuel · ore · operator</div>`, 'Record Condition', () => {
      writeOnboarding({stage:'rhea_job',forgeInspected:true});
      renderTracker();
      window.EmberSystemUI?.notify?.('Return to Rhea with the System assessment.');
    });
  }

  function assignFirstPayment() {
    showPanel('RHEA // LEDGER','Your First Payment',`<p>Rhea listens to your assessment, then gives a humorless little nod.</p><p>“Good. Shelter can hold. Forge can be salvaged. Which means the next problem is the Mosslings chewing through anything we leave outside.”</p><p>She points east, toward the trail.</p><p>“Clear three. The old Trail Guild ledger still works well enough to record kills. Do that and I will count it against what you owe.”</p><div class="hearth-intro-debt"><strong>FIRST PAYMENT</strong><br>Defeat 3 Mosslings east of Hearthcross.</div>`, 'Start Working', () => {
      writeOnboarding({stage:'first_payment'});
      renderTracker();
      window.EmberSystemUI?.notify?.('SYSTEM: Combat functions remain available despite Unbound Path status.');
    });
  }

  function completeFirstPayment() {
    showPanel('RHEA // HEARTHCROSS','Not Completely Useless',`<p>Rhea glances toward the quieter eastern trail.</p><p>“Three already? Huh.”</p><p>She scratches a line into an old ledger and looks back at you.</p><p>“That buys you a little breathing room. More importantly, whatever strange thing follows you around has been flickering like a bad lantern since you arrived.”</p><div class="prologue-system"><strong>LOCAL SYSTEM ANCHOR SYNCHRONIZED</strong><br>Settlement contribution: RECORDED<br>Debt contract: ACTIVE<br><br><strong>PATH SELECTION AVAILABLE.</strong></div>`, 'Open Path Selection', () => {
      writeOnboarding({stage:'path_select',hearthcrossStage:1});
      renderTracker();
      showPathSelection();
    });
  }

  function showPathSelection() {
    window.EmberSystemUI?.openPause?.();
    layer.innerHTML = `<div class="system-menu-shell" style="width:min(850px,calc(100vw - 30px))"><div class="system-menu-kicker">SYSTEM // PATH SELECTION</div><h2 class="system-menu-title">Choose Your First Path</h2><p class="system-menu-subtitle">Your first stable Path determines natural stat growth. Other Paths can be unlocked later.</p><div class="hearth-path-grid">${Object.entries(classes).map(([id,c])=>`<button class="hearth-path" data-path="${id}"><div class="hearth-path-icon">${c.icon}</div><h3>${c.name}</h3><p>${c.copy}</p></button>`).join('')}</div></div>`;
    layer.querySelectorAll('[data-path]').forEach(btn => btn.onclick = () => choosePath(btn.dataset.path));
  }

  function choosePath(classId) {
    const c = classes[classId];
    const save = readJson(SAVE_KEY);
    if (!save?.player || !c) return;
    save.player.classId = classId;
    save.player.unlockedClasses = [classId];
    save.player.learnedSkills = [c.skill];
    save.player.hp = c.base.hp;
    save.player.mp = c.base.mp;
    save.player.story = { ...(save.player.story || {}), unbound:false, hearthcrossStage:1, debtActive:true };
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    const now = Date.now();
    writeOnboarding({stage:'complete',completedAt:now,chosenPath:classId,autoLaunchUntil:now+15000,hearthcrossStage:1});
    clearInterval(pollTimer);
    location.reload();
  }

  function maskBattleUi() {
    if (onboarding.stage === 'complete') return;
    const fighter = overlay.querySelector('.fighter');
    if (fighter) {
      const portrait = fighter.querySelector('.pixel-portrait');
      const label = fighter.querySelector('b');
      if (portrait && portrait.textContent !== '🧍') portrait.textContent = '🧍';
      if (label && !/^Unbound/.test(label.textContent)) label.textContent = 'Unbound · Lv 1';
      const skills = overlay.querySelector('[data-action="skills"]');
      if (skills) { skills.disabled = true; skills.title = 'Path skills are unavailable while Unbound.'; }
    }
  }

  function poll() {
    if (!gameReady || onboarding.stage === 'complete') return;
    renderHud();
    renderTracker();
    maskBattleUi();
    if (onboarding.stage === 'first_payment') {
      const q = getLive()?.quest || readJson(SAVE_KEY)?.player?.quest;
      if ((q?.kills || 0) >= 3 || q?.complete) {
        writeOnboarding({stage:'payment_return'});
        renderTracker();
        window.EmberSystemUI?.notify?.('FIRST PAYMENT COMPLETE: Return to Rhea.');
      }
    }
  }
})();
