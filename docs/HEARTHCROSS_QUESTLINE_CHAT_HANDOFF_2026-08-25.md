# Emberwild — Hearthcross / Questline Chat Handoff

> This document preserves the design discussion beginning with the point where the wooden-spear/crafting idea was raised and carries the resulting decisions forward so another coding agent can continue with the same context.

---

## Starting user message

> not everything has to be in the opening sequence. maybe crafting or something so they player can get a wooden spear or somethin so we arent just givin them a knife. go ahead and look at the entire questline thats already in game so we can see what really needs to change. could prolly be one of our researches tbh

---

## Existing questline audit that followed

The current implementation on `feature/starter-region` was reviewed, especially `src/prologue.js`, `src/game-v2.js`, and `docs/EMBERWILD_GAME_OVERVIEW.md`.

### Current Hollowpath flow

The prototype currently does roughly:

- wake up
- inspect disturbed ground
- find abandoned satchel
- receive **Crude Trail Knife + Field Tonic**
- open inventory and equip knife
- inspect trail marker
- explore
- optionally gather Silverleaf
- inspect mauled stag
- inspect claw marks
- fight Mossling
- fight Mossling pair
- search wrecked camp
- learn about Hearthcross
- predator foreshadowing
- Veilfang chase
- forced Veilfang fight/loss
- Rhea rescue

Important issue identified: the knife is simply handed to the player, and Silverleaf is effectively converted directly into a tonic. This misses a clean early opportunity to introduce simple crafting.

### Current first Hearthcross flow

After Veilfang:

- wake beneath patched roof
- talk to Rhea
- inspect destroyed bridge
- return to Rhea
- gather 4 lumber
- recover tool crate
- kill 2 Mosslings
- return to Rhea
- Hearthcross becomes Stage 1
- Path selection unlocks

Rhea's existing explanation already points toward the right premise: Hearthcross needs shelter, tools, and safety before anything larger can happen.

### Major disconnect found

After this small prologue repair, the larger Mossroad Vale game currently spawns Hearthcross with several already-completed functional structures:

- Hearth House
- Copper Anvil
- Path Trainer
- Trail Guild
- Waystone

The follow-up questline then moves quickly into:

- Green Problem — kill Mosslings
- Roadside Check-In — visit Wayfarer Camp / Scout Mara
- Old Stones — discover Old Mossroad Ruins
- Into Mossroad Vale — free roam / dungeon target

This creates a design break between the intended settlement-restoration fantasy and the actual prototype state.

### Existing design document already supports the stronger direction

The game overview already defines the broad early arc as:

**Survive → learn → reach Hearthcross → help rebuild it → grow stronger → repair the route out → enter the wider world.**

It also explicitly frames Hearthcross as damaged, undermanned, under-supplied, partially abandoned, and capable of visible restoration.

The bridge is already supposed to be a major starter-region progression goal rather than a tiny tutorial objective.

---

## Core design conclusion from the audit

Do **not** make Hollowpath teach everything.

### Hollowpath should teach survival/mechanical literacy

Possible basics:

- movement
- interaction
- System scanning
- inventory
- gathering one/two resources
- simple primitive crafting
- equipping gear
- basic combat
- healing
- exploration
- creature dispositions
- recognizing and fleeing impossible threats

### Hearthcross should teach systemic literacy

It should deepen and connect:

- gathering
- fishing
- logging
- mining
- crafting
- food
- tools
- resource processing
- combat/security
- NPC recruitment
- settlement growth
- economic/services unlocks

Core distinction:

**Hollowpath teaches mechanics. Hearthcross teaches systems.**

---

## Wooden spear / early crafting decision

Instead of:

> Find satchel → receive complete knife.

Preferred concept:

1. Search abandoned satchel/camp.
2. Recover scraps, cordage, and a damaged knife/cutting tool.
3. Gather a sturdy branch.
4. System unlocks primitive recipe.
5. Craft a **Crude Wooden Spear**.

The knife/blade can remain as a tool or crafting component rather than a ready-made starter weapon.

Silverleaf can similarly support an optional basic healing recipe rather than magically becoming a finished tonic.

Example:

**Silverleaf + cloth/basic component → Field Poultice**

This establishes:

**Find resource → understand resource → craft useful item.**

---

## Hearthcross premise clarified in conversation

The reason the bridge cannot simply be repaired is not that the villagers lack the knowledge.

Hearthcross is broken down and people are starving.

When the player arrives, the settlement should ideally have only **one truly usable structure**, with the rest represented by ruins, damaged foundations, empty work areas, and broken infrastructure.

The player helps rebuild the village so that the village eventually becomes capable of rebuilding the bridge.

The bridge is therefore the consequence of restoring the settlement's:

- food supply
- labor force
- tools
- timber production
- mining output
- forge capability
- roads
- security
- specialists
- spare resources

The bridge is a luxury infrastructure project for a village currently trying to survive.

---

## User clarification about tutorial depth

The opening sequence is not supposed to teach every system fully.

The player may learn some basics during Hollowpath, while Hearthcross goes more in depth.

This led to the working model:

**Opening sequence = first exposure/basic survival**

**Hearthcross = deeper system application and interconnection**

---

## User's broader long-term goal

The Hearthcross restoration arc should also act as setup for later game systems such as:

- player housing
- property upgrades
- workshops
- production buildings
- possibly player-built settlements or towns

Hearthcross becomes the player's first controlled lesson in changing a settlement through resources, construction, specialists, and persistent world-state changes.

The long-term conceptual progression is:

1. help repair someone else's settlement
2. later build/upgrade your own home
3. later expand into workshops/storage/production
4. potentially later participate in player-founded or player-built towns

Core principle:

> Progress is not only something that happens to your character. Progress happens to the world around you.

---

## Research direction agreed upon

The discussion then shifted into a formal research pass on effective questlines/onboarding for this genre.

Important references identified:

### Dragon Quest Builders / Builders 2
Most relevant settlement-restoration reference.

Useful ideas:
- devastated settlements becoming healthy
- gathering/building tied to community needs
- visible town progression
- NPCs gaining capability
- NPCs helping with large construction projects
- exploration feeding restoration
- specialists / residents changing settlement capability

### Palia
Useful recent onboarding reference.

Useful ideas:
- life skills connected rather than isolated
- housing/building introduced early enough to establish the fantasy
- skill mentors/tools introduced contextually
- developers revised early-game guidance while trying to preserve exploration freedom

### Guild Wars 2
Useful for local objectives with multiple valid contributions.

Important Emberwild application:

Instead of always saying:
> Catch 5 fish.

A later restoration need could say:

**Food Supply: 36 / 100**

and allow fish, meat, edible plants, mushrooms, cooked meals, etc. to contribute.

The first fishing interaction can still be guided so the player learns the mechanic.

### RuneScape
Useful for long-term noncombat progression, broad skill value, quest-driven system/lore introduction, and housing/building progression.

### Hero of Aethric
Useful for visual/world inspiration, map guidance, class/loot/open-world structure. It should be treated as design inspiration, not a clone target.

---

## Research conclusions

### 1. Teach systems when they become useful
Do not front-load the whole game.

### 2. Teach through actual needs
Every Hearthcross tutorial should answer:

**Why does the settlement need this?**

### 3. Visible change is a primary reward
Quest completion should produce visible world changes, not only XP and gold.

Examples:
- shelves fill
- NPCs recover
- scaffolding appears
- forge lights
- palisade repairs
- guards appear
- paths clear
- population rises

### 4. NPC contribution should increase
The player does more manual work while Hearthcross is helpless. As it recovers, NPCs process resources, construct buildings, produce common supplies, and ultimately perform much of the bridge construction.

### 5. Systems should interlock
Do not isolate fishing, logging, mining, and crafting into unrelated tutorial chores.

Example:

**Repair Workshop** may require timber + stone + crafted bindings.

### 6. Guidance should loosen over time
Desired progression:

- Hollowpath: explicit instruction
- early Hearthcross: guided problems
- mid Hearthcross: multiple active restoration choices
- late Hearthcross: destination/problem-based quests
- Mossroad Vale: genuine exploration

The game should gradually stop saying:

> Do this.

and start saying:

> Here's the problem.

### 7. Bridge is the starter-region final exam
It should combine previously learned systems instead of introducing a new arbitrary grind.

### 8. Hearthcross needs human stories
The village cannot only be a progress bar. Characters should make food, medicine, tools, and safety emotionally meaningful.

---

## Proposed restoration chapters

### Chapter 1 — Keep Them Alive
Food, medicine, emergency shelter.

### Chapter 2 — Tools to Rebuild
Logging, mining, salvage, workshop, tools, processing.

### Chapter 3 — Make Hearthcross Safe
Mosslings/threats, perimeter, roads, defenses, patrols.

### Chapter 4 — Bring People Back
Wayfarer Camp, exploration, specialist recruitment, services.

### Chapter 5 — Regional Recovery
Old Mossroad Ruins, Ironroot Quarry, Glasswater Pool, Briar Grove, Barrowroot Ruins become relevant to settlement recovery instead of being disconnected landmarks.

### Capstone — Mossroad Bridge
Hearthcross is finally healthy enough to build outward.

---

## Quest-map direction produced

A full quest map was then drafted, covering:

- Second Life
- What Was Left Behind
- Make Do
- optional Silverleaf
- First Blood
- Something Hunts Here
- Smoke Through the Trees
- RUN / Veilfang
- Debt
- A Village in Name Only
- Tonight's Meal
- What Medicine Remains
- One More Night
- Four Good Timbers
- The Lost Tools
- Stone Doesn't Grow on Trees
- A Place to Work
- A Path Takes Shape
- Green Problem
- The East Path
- Keep Watch
- Too Few Hands
- Roadside Check-In
- specialist recruitment branches
- Fire Again
- Old Stones
- The Quarry Road
- Glasswater / Briar Grove regional content
- Below the Barrowroot
- Paid in Full
- We Can Build It
- Foundation
- Across the Gap
- The Last Piece
- The Road Opens

See:

- `docs/HEARTHCROSS_RESTORATION_PLAN_2026-08-25.md`
- `docs/EARLY_GAME_QUESTLINE_RESEARCH_2026-08-25.md`
- `docs/EARLY_GAME_QUEST_MAP_2026-08-25.md`

---

## Important technical implications for the current prototype

The current code effectively uses a linear quest/state progression and then spawns a mostly finished Hearthcross.

The intended rewrite will likely need:

### Settlement state
Persist:
- stage
- metrics
- structures
- specialists
- resource thresholds

### Building states
Each major building should support:
- ruined
- under construction
- functional
- upgraded

### Town contribution
Support both:
- exact required items
- flexible category contributions such as Food Supply

### NPC recruitment
Track:
- discovered
- recruited
- arrived
- service unlocked

### Quest graph
Support:
- branching
- concurrent quests
- optional objectives
- prerequisite groups

This should replace the assumption that the entire early game can be represented by a single active quest ID.

### World persistence
Persist:
- repaired routes
- unique threat outcomes
- settlement construction states
- unlocked resource locations
- environmental changes

This aligns directly with the map-persistence work already underway.

---

## Anti-fatigue rules agreed upon

- no chains of nearly identical gather quests
- no 10 → 20 → 30 item-count escalation
- gathered resources should create visible consequences
- introduce one major unfamiliar system at a time
- give players freedom before they feel trapped
- do not require mastery of every profession for main progression
- allow optional discoveries early
- count previously collected resources where reasonable
- avoid artificial main-story construction timers
- let NPCs increasingly handle repetitive labor
- break mechanical chains with character/exploration quests
- bridge repair should feel earned, not grindy

---

## Final user realization before this handoff request

> i feel like an idiot lol. i was suppose to be havin the conversation in open code and not here and i didnt realize

The response noted that the work was not wasted because it had already been turned into structured design material that could be handed to OpenCode.

This handoff exists specifically so OpenCode or another coding agent can continue from the same decisions without reconstructing the conversation.
