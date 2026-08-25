# Emberwild — Aethric-inspired RPG Prototype

A small original browser RPG prototype inspired by the **design pillars** of Hero of Aethric / classic grind-heavy turn-based MMORPGs: freely explorable overworld, visible encounters, turn-based combat, loot-driven builds, class switching with retained skills, and a home-town progression hub.

This is **not** a clone and does not use Hero of Aethric names, art, maps, code, or other proprietary assets.

## Play

No build step is required.

1. Download or clone the repo.
2. Open `index.html` in a modern browser.
3. Choose a starting path and play.

## Controls

- `WASD` / arrow keys — move
- `E` — interact
- `I` — inventory / equipment
- `C` — character sheet
- `Esc` — close non-combat windows

## Current prototype loop

- Explore a 74×50 tile handcrafted/procedural hybrid region.
- Start as Vanguard, Arcanist, or Shade.
- Walk into visible enemies to begin turn-based combat.
- Earn XP and gold; enemies can drop quality-tiered gear.
- Equip loot across weapon/head/body/feet/charm slots.
- Learn class skills at levels 1/3/6.
- Unlock/switch starter paths at the Waystone; learned skills remain available.
- Use Hearthcross as a home hub: healer, smith, class Waystone, Trail Guild.
- Complete an introductory kill quest.
- Push east into progressively stronger enemies and an elite Briar Troll.
- Saves automatically to browser localStorage.

## Why browser first?

This repo is an experiment in gameplay design and iteration speed. Keeping v0 dependency-free makes it trivial to test the core loop before deciding whether a larger version belongs in Godot, another engine, or the browser.

## Next logical systems

- Larger multi-region world with gates and biomes
- More class tiers and specialization choices
- Deterministic monster loot tables
- Gear upgrades, sockets, crafting, dismantling
- Dungeons with multiple floors / horde encounters
- Followers / summons
- Town construction and upgrade economy
- Boss/raid encounters
- Quest chains, codex, achievements
- Mobile touch controls
- Backend persistence / accounts / parties if multiplayer becomes a goal
