(() => {
  'use strict';

  const overlay = document.getElementById('overlay');
  const quest = document.getElementById('quest');
  const toast = document.getElementById('toast');
  const dock = document.getElementById('system-dock');
  const layer = document.getElementById('system-menu-layer');
  const notifications = document.getElementById('system-notifications');

  const nativeRAF = window.requestAnimationFrame.bind(window);
  let rafFrozen = false;
  let syntheticKey = false;
  let lastNotice = { text: '', at: 0 };

  window.requestAnimationFrame = callback => nativeRAF(timestamp => {
    if (rafFrozen) {
      window.requestAnimationFrame(callback);
      return;
    }
    callback(timestamp);
  });

  function isOwnMenuOpen() {
    return !layer.classList.contains('hidden');
  }

  function isWorldOverlayOpen() {
    return !overlay.classList.contains('hidden') && !overlay.classList.contains('ember-menu');
  }

  function syncShellState() {
    const inMainMenu = overlay.classList.contains('ember-menu');
    document.body.classList.toggle('system-game-active', !inMainMenu);
    document.body.classList.toggle('system-world-modal', isWorldOverlayOpen() || isOwnMenuOpen());
  }

  function sendKey(key) {
    syntheticKey = true;
    window.dispatchEvent(new KeyboardEvent('keydown', { key, code: `Key${key.toUpperCase()}`, bubbles: true }));
    syntheticKey = false;
  }

  function openPauseMenu() {
    if (isWorldOverlayOpen()) return;
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
        <button class="danger" data-system-main-menu><span>Return to Main Menu</span><span class="system-menu-key">LOCAL SAVE</span></button>
      </div>
    `);

    layer.querySelector('[data-system-resume]').onclick = closeLayer;
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

  function showLayer(content) {
    rafFrozen = true;
    layer.innerHTML = `<div class="system-menu-shell">${content}</div>`;
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

  function openMap() {
    const save = readSave();
    const discoveries = save?.player?.discoveries || {};
    const tracked = quest.textContent || '';
    const inHearthcross = /Hearthcross|First Payment|No Way Out/i.test(tracked);
    const known = [];

    if (!save) {
      known.push(['Hollowpath', inHearthcross ? 'Origin · unmapped' : 'Current · unmapped']);
      if (inHearthcross) known.push(['Hearthcross', 'Safe location · registered']);
    } else {
      known.push(['Hearthcross', 'Registered']);
      known.push(['Mossroad Vale', 'Regional map active']);
      const labels = {
        camp: 'Wayfarer Camp',
        old_ruins: 'Old Mossroad Ruins',
        quarry: 'Ironroot Quarry',
        glasswater: 'Glasswater Pool',
        briar: 'Briar Grove',
        barrowroot: 'Barrowroot Ruins'
      };
      Object.entries(discoveries).forEach(([key, value]) => {
        if (value && labels[key] && !known.some(([name]) => name === labels[key])) known.push([labels[key], 'Discovered']);
      });
    }

    showLayer(`
      <div class="system-menu-kicker">SYSTEM // CARTOGRAPHY</div>
      <h2 class="system-menu-title">Known Locations</h2>
      <p class="system-menu-subtitle">The System records places you have reached. Full regional rendering will expand as cartography develops.</p>
      <div class="system-menu-content system-map-list">
        ${known.map(([name, status]) => `<div class="system-map-entry"><b>${escapeHtml(name)}</b><span>${escapeHtml(status)}</span></div>`).join('')}
      </div>
      <div class="system-menu-actions" style="margin-top:12px"><button data-system-back><span>Return</span><span class="system-menu-key">ESC</span></button></div>
    `);
    layer.querySelector('[data-system-back]').onclick = closeLayer;
  }

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
    setTimeout(() => {
      el.classList.add('system-notice-out');
      setTimeout(() => el.remove(), 300);
    }, 4200);
  }

  function mirrorToast() {
    if (toast.classList.contains('hidden')) return;
    pushNotice(toast.textContent);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
  }

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

    if (isOwnMenuOpen()) {
      if (key === 'escape') closeLayer();
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }

    if (key === 'escape') {
      if (isWorldOverlayOpen()) {
        const close = overlay.querySelector('[data-close]');
        if (close) {
          event.preventDefault();
          event.stopImmediatePropagation();
          close.click();
        }
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      openPauseMenu();
      return;
    }

    if (key === 'j' && !isWorldOverlayOpen()) {
      event.preventDefault();
      event.stopImmediatePropagation();
      openJournal();
      return;
    }
    if (key === 'm' && !isWorldOverlayOpen()) {
      event.preventDefault();
      event.stopImmediatePropagation();
      openMap();
    }
  }, true);

  new MutationObserver(() => {
    syncShellState();
  }).observe(overlay, { attributes: true, childList: true, subtree: false });

  new MutationObserver(mirrorToast).observe(toast, { attributes: true, childList: true, characterData: true, subtree: true });

  syncShellState();
  mirrorToast();

  window.EmberSystemUI = {
    notify: pushNotice,
    openPause: openPauseMenu,
    openJournal,
    openMap,
    isPaused: () => rafFrozen
  };
})();
