(() => {
  'use strict';

  const PROFILE_KEY = 'emberwild-profile-v1';
  const SAVE_KEY = 'emberwild-save-v2';
  const hud = document.getElementById('hud');
  if (!hud) return;

  let profile = null;
  try { profile = JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null'); }
  catch { profile = null; }

  const name = String(profile?.name || 'Wanderer').trim() || 'Wanderer';

  function withIdentity(raw) {
    try {
      const data = JSON.parse(raw);
      if (data?.player) data.player.name = name;
      return JSON.stringify(data);
    } catch {
      return raw;
    }
  }

  // Keep the chosen profile name inside the actual game save as well as the
  // lightweight profile record. This also makes future save slots / character
  // customization much easier to add without changing the identity model.
  const nativeSetItem = localStorage.setItem.bind(localStorage);
  localStorage.setItem = (key, value) => {
    nativeSetItem(key, key === SAVE_KEY ? withIdentity(value) : value);
  };

  const existingSave = localStorage.getItem(SAVE_KEY);
  if (existingSave) nativeSetItem(SAVE_KEY, withIdentity(existingSave));

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
