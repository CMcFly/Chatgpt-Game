(() => {
  'use strict';

  const PROFILE_KEY = 'emberwild-profile-v1';
  const hud = document.getElementById('hud');
  if (!hud) return;

  let profile = null;
  try { profile = JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null'); }
  catch { profile = null; }

  const name = String(profile?.name || 'Wanderer').trim() || 'Wanderer';

  function renderIdentity() {
    if (!hud || hud.querySelector('[data-player-identity]')) return;
    const chip = document.createElement('div');
    chip.className = 'hud-chip';
    chip.dataset.playerIdentity = '1';
    const label = document.createElement('span');
    label.textContent = 'PLAYER';
    const strong = document.createElement('strong');
    strong.textContent = name;
    chip.append(label, document.createElement('br'), strong);
    hud.prepend(chip);
  }

  const observer = new MutationObserver(() => renderIdentity());
  observer.observe(hud, { childList: true, subtree: false });
  renderIdentity();
})();
