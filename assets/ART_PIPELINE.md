# Emberwild Asset Pipeline

The renderer still has primitive fallbacks, so missing art never blocks playtesting. `src/assets.js` is the asset manifest/loader and is the single place where production files should be registered.

## Scale
- World tile: 32×32 px.
- Player/NPC starting target: 32×48 px or 48×48 px with transparent background.
- Small mobs: 32×32 to 48×48 px.
- Large mobs/bosses: 64×64 px or larger as needed.
- Buildings: multi-tile PNGs sized to their world footprint; transparent roof/overhang pixels are encouraged.
- Props/trees: anchor at the bottom center. Tree canopy should extend above the collision trunk so Y-depth sorting works naturally.

## Character sheet convention
Initial convention is four direction rows with three walk frames each:
1. Down
2. Left
3. Right
4. Up

Idle can use the middle frame of each row. This can expand later without changing gameplay code.

## Planned paths
- `assets/characters/player/wanderer.png`
- `assets/characters/npcs/rhea.png`
- `assets/characters/npcs/mara.png`
- `assets/mobs/mossling.png`
- `assets/mobs/forest-stag.png`
- `assets/mobs/veilfang.png`
- `assets/buildings/hearth-house.png`
- `assets/buildings/copper-anvil.png`
- `assets/buildings/trail-guild.png`
- `assets/buildings/path-trainer.png`
- `assets/buildings/waystone.png`
- `assets/props/trees/pine.png`

Additional mob paths are already reserved in `src/assets.js`.

## Rules
- PNG with alpha is the default production format.
- Pixel art should be authored at native resolution; do not rely on browser smoothing.
- Collision remains gameplay data, not opaque image pixels.
- Art can be replaced independently of code by updating the manifest `src` field.
- Do not remove primitive fallbacks until the corresponding asset family is stable.
