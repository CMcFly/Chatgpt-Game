(() => {
  'use strict';

  const manifest = {
    'player.wanderer': { src: null, expected: 'assets/characters/player/wanderer.png', frameW: 32, frameH: 48 },
    'npc.rhea': { src: null, expected: 'assets/characters/npcs/rhea.png', frameW: 32, frameH: 48 },
    'npc.mara': { src: null, expected: 'assets/characters/npcs/mara.png', frameW: 32, frameH: 48 },
    'mob.mossling': { src: null, expected: 'assets/mobs/mossling.png', frameW: 32, frameH: 32 },
    'mob.forest_stag': { src: null, expected: 'assets/mobs/forest-stag.png', frameW: 48, frameH: 40 },
    'mob.ash_rat': { src: null, expected: 'assets/mobs/ash-rat.png', frameW: 32, frameH: 32 },
    'mob.thornling': { src: null, expected: 'assets/mobs/thornling.png', frameW: 32, frameH: 40 },
    'mob.dusk_wisp': { src: null, expected: 'assets/mobs/dusk-wisp.png', frameW: 32, frameH: 40 },
    'mob.stoneback': { src: null, expected: 'assets/mobs/stoneback.png', frameW: 48, frameH: 40 },
    'mob.briar_troll': { src: null, expected: 'assets/mobs/briar-troll.png', frameW: 64, frameH: 64 },
    'mob.ruin_sentinel': { src: null, expected: 'assets/mobs/ruin-sentinel.png', frameW: 48, frameH: 56 },
    'mob.veilfang': { src: null, expected: 'assets/mobs/veilfang.png', frameW: 64, frameH: 56 },
    'building.hearth_house': { src: null, expected: 'assets/buildings/hearth-house.png' },
    'building.copper_anvil': { src: null, expected: 'assets/buildings/copper-anvil.png' },
    'building.trail_guild': { src: null, expected: 'assets/buildings/trail-guild.png' },
    'building.path_trainer': { src: null, expected: 'assets/buildings/path-trainer.png' },
    'building.waystone': { src: null, expected: 'assets/buildings/waystone.png' },
    'prop.tree.pine': { src: null, expected: 'assets/props/trees/pine.png', frameW: 48, frameH: 64 },
    'prop.satchel': { src: null, expected: 'assets/props/satchel.png', frameW: 24, frameH: 20 },
    'prop.sign': { src: null, expected: 'assets/props/trail-sign.png', frameW: 32, frameH: 40 },
  };

  const images = new Map();

  function register(key, definition = {}) {
    manifest[key] = { ...(manifest[key] || {}), ...definition };
    images.delete(key);
    return manifest[key];
  }

  function definition(key) { return manifest[key] || null; }

  function ensure(key) {
    const def = definition(key);
    if (!def?.src) return null;
    if (images.has(key)) return images.get(key);

    const record = { image: new Image(), state: 'loading' };
    record.image.onload = () => record.state = 'ready';
    record.image.onerror = () => record.state = 'missing';
    record.image.src = def.src;
    images.set(key, record);
    return record;
  }

  function ready(key) { return ensure(key)?.state === 'ready'; }

  function draw(ctx, key, options = {}) {
    const def = definition(key);
    const record = ensure(key);
    if (!def || record?.state !== 'ready') return false;

    const img = record.image;
    const frameW = options.frameW || def.frameW || img.naturalWidth;
    const frameH = options.frameH || def.frameH || img.naturalHeight;
    const frame = Math.max(0, options.frame || 0);
    const row = Math.max(0, options.row || 0);
    const sx = options.sx ?? frame * frameW;
    const sy = options.sy ?? row * frameH;
    const sw = options.sw || frameW;
    const sh = options.sh || frameH;
    const w = options.w || sw;
    const h = options.h || sh;
    const x = (options.x || 0) - (options.anchorX ?? .5) * w;
    const y = (options.y || 0) - (options.anchorY ?? 1) * h;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (options.alpha != null) ctx.globalAlpha *= options.alpha;
    if (options.flipX) {
      ctx.translate(x + w, y);
      ctx.scale(-1, 1);
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
    } else {
      ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
    }
    ctx.restore();
    return true;
  }

  function expectedPath(key) { return definition(key)?.expected || definition(key)?.src || null; }

  window.EmberAssets = { manifest, register, definition, expectedPath, ready, draw };
})();
