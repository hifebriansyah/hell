# Jahannam Diorama

A tactile 2.5D cartoon cross-section of the seven gates of Jahannam, built from [plan.md](plan.md).

It is one tall dollhouse that you scroll through: the Rim (arrivals) on top, then Gates 1–7 stacked below. You drag five critters around, poke the props, and bend the physics. There are no timers, scores or fail states. Critters wear down, pop in a cartoon KO, and regrow about 1.5 seconds later, forever. There is no gore. The tone is adult and deadpan, Dumb-Ways-to-Die style slapstick.

Built with **Vite + TypeScript + PixiJS 8 + matter-js**. All art is flat vector (Pixi `Graphics` Bézier shapes, no outlines, no image files) and all sound is procedural Web Audio.

## Run it

```bash
npm install          # if your global npm points at a private registry, the project .npmrc points it back to npmjs.org
npm run dev          # http://localhost:5190
npm run build        # dist/ with relative paths (works in any folder)
npm run build:local  # dist/ for http://localhost/for-fun/hell/ (served by .htaccess)
```

`npm run build:local` has to be re-run after code changes before they show up on the Apache URL.

Deep links: `#rim`, `#gate-1` … `#gate-7`.

## Controls

| Input | Does |
| --- | --- |
| Drag a critter | Dangle and fling |
| Tap a critter | Boop (on Gate 2: pluck the coat off) |
| Double-tap a critter | Cycle through unlocked hats |
| Drag empty space, mouse wheel / trackpad | Scroll the dollhouse freely; when you stop, it settles on the nearest gate (or the next one if you went a fifth of a screen toward it) |
| Hold a dragged critter near the top or bottom edge | Carry it to another floor |
| Right rail (`⌂`, 1–7) or keys `0`–`7`, `↑`/`↓` | Jump to a floor |
| Critter tray (left edge) | Drop a critter in (it arrives on the floor you are looking at), tap again to send it home |
| `A` | Everyone at once · `L` slam the Gate 1 lid · `Esc` close panels |
| Corner buttons | Tinker sliders, Plaque (cited sources for the floor on screen), Discoveries + Eternity ledger, Mute |

Every gate (1–6) has a **lever and trapdoor** that drops critters into the gate below. The trapdoors zigzag left and right.

## What's in each floor

| Floor | Toy | Pops / discoveries |
| --- | --- | --- |
| **The Rim** | Twilight arrivals ledge with a mouth that drops straight into Gate 1's pot. Lanterns, coin pile, smoke vent (blasts critters up), ember stones (warm + soot), clouds | Full House, Rim Splat |
| **1 · Jahannam** | Cutaway cauldron. Buoyant soup that turns critters lobster-pink with ear-steam whistles. Ladle whirlpool (drag or tap) → dizzy spirals. Slam the lid → rattling pressure → champagne-cork pop (sometimes up through the mouth into the Rim). Frost slider freezes the soup | Boiled Cork-Pop, Champagne Lid-Pop, Soup Spin Cycle |
| **2 · Laza** | A leaping flame in a pit. Critters keep running away and a flame tendril yanks them back. Touching it peels their coat (or roasts them if already peeled). Bellows heat-gust, or tap a critter to pluck its coat. Peeled looks: hairless mortified Boba `>///<`, rubber-duck Mochi with one feather, polka-dot boxers Pebble `-_-`, gummy-core Gloop, bald dandelion-puff Toto | Peeled & Roasted (ash pile with blinking eyes), Polka-Dot Reveal, Clothing Optional |
| **3 · al-Hutamah** | Ornate terracotta-and-gold press. Hit the stomp button, tap or drag the head down. Critters become physically flat paper rugs, then pop back round. Springy accordion side walls. A "days without a pancake" board | Pancaked Flat, Short Stack |
| **4 · al-Sa'ir** | Thorny Zaqqum tree with burning spiky fruit. Shake the trunk or pluck. Critters turn away and clamp their mouths when you bring fruit close, so you have to shove it in. Then: red face, flame breath, frantic hopping, fireball pop. Pebble just eats it and says *pardon.* "Today's special" menu | Zaqqum Fireball Pop, Polite Smoke Burp |
| **5 · Saqar** | Slanted ember conveyor dragging critters belly-down, face-first into a fire grate. Boba leaves claw skid marks, Gloop a slime trail, Mochi back-paddles. Crank cycles ▶ ▶▶ ▶▶▶ ◀ ■. Scorched critters go back to the top of the belt. 19 lanterns overhead, "NOW SERVING ∞" ticket machine | Conveyor Scorched, Wrong Way Round |
| **6 · al-Jahim / Zamharir** | Frozen pillar: tongues stick to it and stretch like rubber until they snap. A breath vent freezes critters into ice cubes. A giant mallet on a rope shatters them out, leaving them shivering with blue cheeks and a runny-nose icicle. Tap icicles to drop them. −∞° thermometer | Mallet-Shattered Ice Cube, Triple-Dog Dare |
| **7 · al-Hawiyah** | Bottomless pit. Critters fall forever in slow motion so you can watch: smoulder → glow → blazing meteor → burn up, then regrow mid-fall. The **Abyss fall speed** slider (Tinker) goes from slow-mo to plummet. Draggy Toto floats, weighted Pebble sinks fastest. Drag iron weights (aghlal) from the rack onto them, flip the gravity-boost lever, bounce them off ledges. Depth odometer that never stops | Blazing Meteor Pop, Lead Balloon |

The whole roster has 20 discoveries and 11 unlockable hats. Statuses stack across floors: soot, peeled, flattened, frozen, shivering, spicy, meteor-hot and weighted.

## Differences from plan.md

**Interpretation**
- **"Hub" = the Rim + the shared shell.** The plan has no hub, so the top floor became an arrivals ledge, and "hub" covers the rail, tray, drawers, critter rigs and the KO/regen loop.
- **The world loops.** Gates 1–6 drop into the next gate through their trapdoors. Gate 7 has no floor and wraps into itself. Anything lost out of bounds falls back into the Rim's sky.

**Added (darker, adult deadpan, approved during the build)**
- A **KO stamp** on every pop (`BOILED · #12`, `PANCAKED · #3`, …) with an all-time count.
- The **Eternity ledger** in the Discoveries panel ("N pops so far. Nobody has learned anything.").
- Regrow lines get more resigned with each pop: *Not again!* turns into *I had plans.*, *I want a manager.* and *k.*
- Set dressing gags: a coat rack of spare coats (Gate 2), "days without a pancake" (Gate 3), "Today's special: Zaqqum ×3" (Gate 4), "NOW SERVING ∞" (Gate 5), −∞° (Gate 6), the depth odometer (Gate 7).
- Gate 1 frost freezes the soup solid. The Rim's mouth drops new arrivals straight into the pot.
- Gate 6's freeze comes from a **breath vent** (the plan didn't say how cubes form).
- Gate 7 has rock ledges, and critters can't rest on them.

**Simplified or changed**
- No BBQ Tongs tool: the tray has no tool switch, so dragging is always the dangly hand. Gate 2's tongs-pluck became a plain tap.
- Gate 2: peeling happens through the flame, the bellows gust and taps. A hand-shake gesture to peel was not built. Coats regrow after about 7 seconds.
- Gate 3: a big **stomp button** instead of a pull lever. You can also drag the press head itself.
- Gate 5: the crank is **tap-to-cycle** (5 settings), not a continuous wind-up.
- Gate 6: icicles drop, but there are no snowballs.
- Gate 7: the camera stays put. Speed comes from streaks rushing up the walls and from wrapping critters back to the top, not from a scrolling camera.
- **Tinker sliders:** heat drives Gates 1, 2, 4 and 5. Frost drives Gate 1's soup and Gate 6. Abyss fall speed drives Gate 7. Wind and gravity are global.
- Gate 7 is a slow-motion fall by default (the burn builds with time spent falling, not raw speed), so the meteor burn-up is watchable.

**Not done yet (Phase 3 of the plan)**
- PixiJS heat-haze and frost **filters**. Glows are additive sprites instead.
- Per-floor ambient **soundscapes**. Only Gate 1 has a simmer loop; everything else is per-event sound effects.
- On a portrait phone the whole room width stays visible, so critters are smaller than the plan's 16–22% of screen height.

**Plaques**
- Every floor's plaque tags each line as Qur'an, hadith, tafsir or note, and says which props are invented.
- Qur'an lines are **paraphrased**, not quoted translations. Hadith are cited by collection, not by number.
- The plaques also say where a link is commentary rather than scripture. Examples: the seven-layer ordering, "zamharir" as a punishment, Zaqqum placed in al-Sa'ir.
- No people, prophets or angels are drawn. Saqar's nineteen are lanterns.

## Code map

```
src/
  main.ts              app, camera, pointer grab/fling, spawn, physics loop, collision → floor hooks
  engine/game.ts       world layout (gateTop/gateFloor), shared state G, tinker defaults
  engine/audio.ts      procedural Web Audio sfx
  engine/fx.ts         pooled particles (steam, sparks, feathers, glints, …)
  engine/textures.ts   canvas-made gradients and particle shapes
  critters/defs.ts     the five critters and their shared traits
  critters/rig.ts      articulated vector rigs: eyes, lids, expressions, peeled layer, hats
  critters/critter.ts  physics body + statuses + KO/regen loop + stamp/ledger
  floors/floor.ts      Floor / GateFloor base, Trapdoor, dragBody, helpers
  floors/rim.ts, gate1.ts … gate7.ts
  data/plaques.ts      cited plaque text
  data/discoveries.ts  discoveries, hats, eternity ledger (localStorage)
  ui/hud.ts            rail, tray, drawers, discoveries panel, toasts
```

In dev, `window.__hell` exposes `{ G, app, cam, floors, spawn, goto, Matter }` for poking at the simulation.
