(() => {
  'use strict';

  const SAVE_KEY='emberwild-save-v2';
  const OLD_SAVE_KEY='emberwild-save-v1';
  const PROLOGUE_KEY='emberwild-prologue-v1';
  const ONBOARDING_KEY='emberwild-hearthcross-onboarding-v1';
  const PROFILE_KEY='emberwild-profile-v1';
  const SESSION_SKIP='emberwild-skip-prologue-once';

  const overlay=document.getElementById('overlay');
  const canvas=document.getElementById('game');
  const ctx=canvas.getContext('2d');
  const hud=document.getElementById('hud');
  const quest=document.getElementById('quest');

  installStyles();
  drawMenuBackdrop();

  const save=readSave();
  const prologueData=readJson(PROLOGUE_KEY);
  const onboarding=readJson(ONBOARDING_KEY);
  const prologueDone=!!prologueData;
  const onboardingPending=!!onboarding&&onboarding.stage!=='complete';
  const justFinishedPrologue=prologueDone&&!save&&onboardingPending&&(Date.now()-Number(prologueData.completedAt||0)<30000);
  const justFinishedOnboarding=onboarding?.stage==='complete'&&Date.now()<Number(onboarding.autoLaunchUntil||0);

  if(justFinishedPrologue||onboardingPending||justFinishedOnboarding){launchMainGame();return;}
  showMainMenu();

  function installStyles(){const style=document.createElement('style');style.textContent=`
    .ember-menu{position:fixed;inset:0;z-index:100;display:grid;place-items:center;padding:24px;background:radial-gradient(circle at 50% 34%,rgba(34,70,47,.48),rgba(3,7,5,.94) 58%,#020403 100%);backdrop-filter:blur(3px)}
    .ember-menu-shell{width:min(620px,calc(100vw - 30px));padding:34px 34px 28px;border:1px solid #536b5c;border-radius:14px;background:linear-gradient(180deg,rgba(9,17,15,.97),rgba(5,10,8,.98));box-shadow:0 35px 120px #000c;text-align:center}
    .ember-menu-logo{margin:0;font-size:clamp(46px,9vw,82px);line-height:.9;letter-spacing:.08em;color:#eadc91;text-shadow:0 4px 24px #000}.ember-menu-tag{margin:12px 0 28px;color:#91a499;font-size:11px;letter-spacing:.22em;text-transform:uppercase}.ember-menu-actions{display:grid;gap:10px;width:min(390px,100%);margin:0 auto}.ember-menu-actions button{min-height:52px;font-size:14px}.ember-menu-save{margin:20px auto 0;padding:12px 14px;width:min(390px,100%);border:1px solid #273830;border-radius:8px;background:#0b1511;color:#96a69d;text-align:left;font-size:11px;line-height:1.55}.ember-menu-save strong{color:#ded19a}.ember-menu-foot{margin-top:22px;color:#5f7468;font-size:10px;letter-spacing:.08em}.ember-name-form{text-align:left;margin-top:22px}.ember-name-form label{display:block;margin-bottom:7px;color:#c9d2cc;font-size:12px;font-weight:700}.ember-name-form input{box-sizing:border-box;width:100%;padding:13px 14px;border:1px solid #496052;border-radius:7px;background:#07100c;color:#eef2ef;font:600 17px ui-monospace,SFMono-Regular,Menlo,monospace;outline:none}.ember-name-form input:focus{border-color:#d2bf70;box-shadow:0 0 0 2px #d2bf7022}.ember-name-help{margin:8px 0 0;color:#75877e;font-size:10px;line-height:1.45}.ember-menu-error{min-height:18px;margin:8px 0;color:#dc8877;font-size:11px}.ember-menu-note{margin:16px 0;padding:12px;border-left:3px solid #bda55b;background:#101914;color:#9fad9f;font-size:11px;line-height:1.55;text-align:left}`;document.head.appendChild(style);}

  function drawMenuBackdrop(){ctx.fillStyle='#07100b';ctx.fillRect(0,0,canvas.width,canvas.height);const gradient=ctx.createRadialGradient(canvas.width*.5,canvas.height*.42,20,canvas.width*.5,canvas.height*.42,520);gradient.addColorStop(0,'#35583d');gradient.addColorStop(.48,'#182f22');gradient.addColorStop(1,'#06100a');ctx.fillStyle=gradient;ctx.fillRect(0,0,canvas.width,canvas.height);for(let i=0;i<80;i++){const x=(i*137)%canvas.width,y=180+((i*83)%470),h=45+((i*31)%85);ctx.fillStyle=i%3?'#102a1a':'#173522';ctx.fillRect(x-3,y-h*.35,6,h*.45);ctx.beginPath();ctx.arc(x,y-h*.45,18+(i%5)*4,0,Math.PI*2);ctx.fill();}}
  function readJson(key){try{return JSON.parse(localStorage.getItem(key)||'null');}catch{return null;}}
  function readSave(){return readJson(SAVE_KEY)||readJson(OLD_SAVE_KEY);}
  function readProfile(){return readJson(PROFILE_KEY)||null;}
  function cleanName(value){return String(value||'').replace(/\s+/g,' ').trim().slice(0,24);}

  function showMainMenu(){const currentSave=readSave(),profile=readProfile(),player=currentSave?.player||null,currentOnboarding=readJson(ONBOARDING_KEY),displayName=cleanName(profile?.name||player?.name||'Unnamed Wanderer'),hasContinue=!!(currentSave||localStorage.getItem(PROLOGUE_KEY)),level=player?.level?`Lv ${player.level}`:'Prologue complete',path=currentOnboarding&&currentOnboarding.stage!=='complete'?'Unbound':player?.classId?formatPath(player.classId):'Unbound',status=currentOnboarding&&currentOnboarding.stage!=='complete'?'Hearthcross onboarding in progress':currentSave?'Local autosave detected':'Ready to enter Hearthcross';overlay.className='ember-menu';overlay.innerHTML=`<div class="ember-menu-shell"><div class="ember-menu-tag">A SECOND LIFE BEGINS</div><h1 class="ember-menu-logo">EMBERWILD</h1><div class="ember-menu-tag">Browser RPG Prototype</div><div class="ember-menu-actions"><button class="primary" data-new>New Game</button><button data-continue ${hasContinue?'':'disabled'}>Continue</button></div>${hasContinue?`<div class="ember-menu-save"><strong>${escapeHtml(displayName)}</strong><br>${escapeHtml(path)} · ${escapeHtml(level)}<br><span>${escapeHtml(status)}</span></div>`:''}<div class="ember-menu-foot">FEATURE BUILD · STARTER REGION</div></div>`;overlay.querySelector('[data-new]').onclick=showNewGameSetup;const continueBtn=overlay.querySelector('[data-continue]');if(hasContinue)continueBtn.onclick=launchMainGame;}

  function showNewGameSetup(){const existing=!!readSave()||!!localStorage.getItem(PROLOGUE_KEY),priorName=cleanName(readProfile()?.name||'');overlay.className='ember-menu';overlay.innerHTML=`<div class="ember-menu-shell"><div class="ember-menu-tag">NEW JOURNEY</div><h1 class="ember-menu-logo" style="font-size:48px">WHO ARE YOU?</h1><div class="ember-name-form"><label for="ember-player-name">Player name</label><input id="ember-player-name" maxlength="24" autocomplete="off" spellcheck="false" value="${escapeHtml(priorName)}" placeholder="Enter a name" /><div class="ember-name-help">This becomes your character identity. Appearance data is already reserved for the sprite pipeline.</div><div class="ember-menu-error" id="ember-name-error"></div></div>${existing?'<div class="ember-menu-note">Starting a new game will replace the current local prototype save.</div>':''}<div class="ember-menu-actions" style="margin-top:18px"><button class="primary" data-begin>Begin</button><button data-back>Back</button></div></div>`;const input=overlay.querySelector('#ember-player-name');const begin=()=>{const name=cleanName(input.value),error=overlay.querySelector('#ember-name-error');if(name.length<2){error.textContent='Use at least 2 characters.';input.focus();return;}if(existing&&!confirm(`Start a new game as ${name}? Your current local save will be replaced.`))return;localStorage.removeItem(SAVE_KEY);localStorage.removeItem(OLD_SAVE_KEY);localStorage.removeItem(PROLOGUE_KEY);localStorage.removeItem(ONBOARDING_KEY);sessionStorage.removeItem(SESSION_SKIP);localStorage.setItem(PROFILE_KEY,JSON.stringify({version:1,name,appearance:{preset:'wanderer'},createdAt:Date.now(),updatedAt:Date.now()}));launchPrologue();};overlay.querySelector('[data-begin]').onclick=begin;overlay.querySelector('[data-back]').onclick=showMainMenu;input.addEventListener('keydown',event=>{if(event.key==='Enter')begin();});requestAnimationFrame(()=>input.focus());}

  function launchPrologue(){clearMenu();loadScript('src/prologue.js',()=>loadScript('src/identity-bridge.js'));}
  function launchMainGame(){if(!readProfile()){const legacyName=cleanName(readSave()?.player?.name||'Wanderer');localStorage.setItem(PROFILE_KEY,JSON.stringify({version:1,name:legacyName,appearance:{preset:'wanderer'},createdAt:Date.now(),updatedAt:Date.now(),legacy:true}));}sessionStorage.setItem(SESSION_SKIP,'1');clearMenu();loadScript('src/hearthcross-intro.js',()=>loadScript('src/game-v2.js',()=>{loadScript('src/debt-bridge.js');loadScript('src/identity-bridge.js');}));}
  function clearMenu(){overlay.className='overlay hidden';overlay.innerHTML='';hud.innerHTML='';quest.innerHTML='';}
  function loadScript(src,onload){const script=document.createElement('script');script.src=src;if(onload)script.onload=onload;document.body.appendChild(script);}
  function formatPath(id){return String(id||'').replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());}
  function escapeHtml(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
})();
