(() => {
  'use strict';

  const prologue = localStorage.getItem('emberwild-prologue-v1');
  if (!prologue) return;

  const questEl = document.getElementById('quest');
  if (!questEl) return;

  const journeyPanel = questEl.closest('.panel');
  if (!journeyPanel) return;

  const panel = document.createElement('section');
  panel.className = 'panel muted-panel';
  panel.id = 'story-ledger';
  journeyPanel.insertAdjacentElement('afterend', panel);

  const copy = {
    'Green Problem': {
      label: 'RHEA’S LEDGER',
      title: 'Debt: Active',
      body: 'Rhea saved your life and intends to collect. First payment: clear the Mosslings east of Hearthcross and let the old Trail Guild ledger record the work.'
    },
    'Roadside Check-In': {
      label: 'RHEA’S LEDGER',
      title: 'Debt: Still Active',
      body: 'Apparently rescue expenses accrue interest. Trail work around the outpost counts toward what you owe—and helps make Hearthcross useful again.'
    },
    'Old Stones': {
      label: 'HEARTHCROSS',
      title: 'A Foothold Worth Saving',
      body: 'Your debt is becoming tied to the outpost itself. Roads, ruins, resources, and people all matter if Hearthcross is going to survive.'
    },
    'Into Mossroad Vale': {
      label: 'HEARTHCROSS',
      title: 'The Ledger Remains Open',
      body: 'Rhea has stopped pretending coin alone will settle this. Rebuilding Hearthcross—and making the Vale safer—will become the real measure of repayment.'
    }
  };

  function render() {
    const title = questEl.querySelector('.quest-title')?.textContent?.trim() || '';
    const entry = copy[title] || copy['Into Mossroad Vale'];
    panel.innerHTML = `<div class="eyebrow">${entry.label}</div><h2>${entry.title}</h2><p>${entry.body}</p>`;
  }

  new MutationObserver(render).observe(questEl, { childList: true, subtree: true, characterData: true });
  render();
})();
