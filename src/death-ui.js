(() => {
  'use strict';

  const toast = document.getElementById('toast');
  const layer = document.getElementById('system-menu-layer');
  let deathActive = false;

  function showDeathScreen() {
    if (deathActive || !layer) return;
    deathActive = true;

    window.EmberSystemUI?.openPause?.();

    layer.innerHTML = `
      <div class="system-menu-shell" style="width:min(520px,calc(100vw - 30px));text-align:center">
        <div class="system-menu-kicker" style="color:#c97b70">SYSTEM // DEATH</div>
        <h2 class="system-menu-title" style="margin-top:12px;color:#e58a7d;font-size:40px">YOU DIED</h2>
        <p class="system-menu-subtitle" style="max-width:390px;margin:10px auto 22px;line-height:1.7">
          Your body failed. Hearthcross is registered as your current return point.
          A portion of your carried gold was lost.
        </p>
        <div class="system-menu-actions">
          <button class="primary" data-respawn style="justify-content:center;text-align:center">
            <span>Respawn at Hearthcross</span>
          </button>
        </div>
      </div>`;
    layer.classList.remove('hidden');
    layer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('system-world-modal');

    layer.querySelector('[data-respawn]')?.addEventListener('click', () => {
      deathActive = false;
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
      window.EmberSystemUI?.notify?.('Respawned at Hearthcross.');
    }, { once: true });
  }

  function inspectToast() {
    const text = String(toast?.textContent || '').trim();
    if (/^You wake in Hearthcross\. Some gold was lost\.$/i.test(text)) showDeathScreen();
  }

  // Register before System UI so a death screen cannot be dismissed with Escape.
  window.addEventListener('keydown', event => {
    if (!deathActive) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);

  if (toast) {
    new MutationObserver(inspectToast).observe(toast, {
      attributes: true,
      childList: true,
      characterData: true,
      subtree: true,
    });
  }
})();
