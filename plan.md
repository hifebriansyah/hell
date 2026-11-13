# Jahannam: Interactive 7-Layer Afterlife Diorama

## 1. Core Concept

An endless, tactile 2.5D illustrated toybox and cultural simulator exploring **Jahannam** (the Islamic concept of the hereafter's realms of punishment) across its **7 classical gates/layers**.

Built in the spirit of [Sago Mini World](https://sagomini.com/world/) for interaction and *Dumb Ways to Die* for dark-comedy slapstick, there are **no mini-games, no timers, no quotas, and no fail states**. Instead of disconnected arcade tasks, the entire experience is **one continuous vertical cross-section dollhouse** that you scroll smoothly up and down—dragging cute allegorical critters between floors, poking interactive props, and bending physics live.

To keep the experience respectful, approachable, and free of graphic gore, **no human models, prophets, or angels are depicted**. Incoming souls are represented by stylized non-human animal/monster stand-ins reacting with Saturday-morning cartoon slapstick.

---

## 2. Visual & Technical Pivot (Why Not 3D Primitives)

> **Rebuild Directive:** Replace the earlier Three.js primitive-3D prototype (`three`) with a **pure 2D/2.5D vector storybook engine** powered by **PixiJS v8 + `matter-js`**.

- **Engine:** `PixiJS` (WebGL HiDPI rendering, layered parallax backgrounds, additive ember/lantern glow, and heat-haze/frost filters) paired 1:1 in pixel coordinates with `matter-js` physics.
- **Art Method — Articulated SVG Vector Rigs:**
  - Every character and hero prop is authored as **clean, lineless flat-vector SVG paths** (smooth cubic Bézier curves, contrasting color blocks, **zero black outlines**), rasterized at HiDPI (2×–3×) or drawn via vector graphics so edges stay razor-sharp on Retina displays.
  - **Never stack raw geometric circles/cones like snowmen.** Each critter has separate articulated parts: body, belly patch, expressive eyes (pupil tracking, blinking, dizzy spirals, sour squint, deadpan half-lids, `X_X` KO eyes), flapping ears/wings, springy tail, hat anchor, and cartoon wear/damage overlays (soot smudge, X-shaped band-aids, cartoon head bumps, translucent ice cube, pancake squash, hairless/plucked peeled state, tiny shackle rattle).
- **High-Key Atmospheric Storybook Palette:**
  - Avoid muddy dark-purple-on-dark-purple scenes and grey toon shadows. Use warm twilight plum, burnt apricot, coral-ember, mint-frost, soft gold, and deep indigo accents with **clear foreground-to-background contrast** so bright pastel characters pop cleanly off each layer's backdrop.
- **Close-Up Toybox Framing:**
  - Show **~1 to 1.5 layers on screen at once** so critters fill **~16–22% of viewport height**—big, chunky, and immediately tactile right in front of the user.
- **Minimal UI Chrome & Zero In-World Text Boxes:**
  - **90%+ pure interactive canvas.** No floating `tap` text boxes, no top inspector banners, no bottom hint strips, and no auto-opening drawers.
  - Only keep: a slim **Vertical Gate Elevator** rail on one edge (Gates 1–7 quick-jump), a small **Critter Tray** pill to drop/swap critters, and discreet corner icon buttons (`Tinker`, `Plaque`, `Discoveries`, `Mute`) that stay closed until tapped.
- **"Poke-Anything" Environment Juice:**
  - Background lanterns, smoke puffs, coins, Zaqqum branches, icicles, and ember stones all react with subtle wiggle, particles, and **Web Audio API** sound effects when tapped.

---

## 3. Character Roster (Allegorical Mischief Critters)

*(Note: **Pip the Mini Devil** is removed—a Western horned pitchfork imp does not fit an Islamic Jahannam simulator. Users interact directly with their cursor/hand like Sago Mini, with an optional small **Noor Lantern** icon for cultural notes.)*

Every critter shares five universal physics traits (**Mass**, **Wind Drag**, **Bounciness**, **Thermal Sensitivity**, **Grip**) so every critter behaves uniquely on every floor:

| Critter | Petty Mischief | Visual & Slapstick Personality | Universal Trait Profile |
| --- | --- | --- | --- |
| **Boba the Cat** | Snack Hoarding | Plump pastel-lavender cat who curls up to nap mid-floor and pops cartoon soot-puffs when warmed. | Medium mass, low ice grip, sleepy inertia. |
| **Mochi the Duckling** | Queue Cutting | Butter-yellow duckling with a feather tuft who flaps wildly and sheds feathers in gusts and slams. | Light mass, high buoyancy/flutter, fast spin in wind. |
| **Pebble the Capybara** | Unbothered Stubbornness | Chunky caramel-brown capybara with half-lidded eyes who stays completely deadpan inside ice cubes, under crushers, or mid-fall. | Heavy mass, low wind drag, slow thermal change. |
| **Gloop the Jelly-Pup** | Sticky Mischief | Mint-green slime-pup who squashes into pancakes and stretches like rubber across ice pillars and freefall pits. | Medium-light mass, extreme bounciness/elasticity. |
| **Toto the Bat** | Midnight Gossip | Periwinkle fruit bat with oversized floppy ears who tumbles comically in breezes and panics upside-down in Gate 7. | Featherweight mass, extreme wind drag. |

---

## 4. World Structure: The 7 Descending Layers

Each gate flows seamlessly into the next vertically. Dragging a critter near the top or bottom viewport edge carries them smoothly between floors, or tap the **Gate Elevator** rail to glide straight to any layer.

### Gate 1 — *Jahannam* (The Boiling Cauldron)
- **Tradition:** The uppermost gate (associated in classical *tafsir* with sinful believers who are eventually purified and released, paired with boiling *Hamim* imagery).
- **Interactive Toy (Single Focus — Cauldron):**
  - **Giant Bubbling Cauldron:** Toss or dunk critters into a massive simmering stewpot over glowing logs—they bob around turning bright lobster-pink with ear-steam whistles!
  - **Wooden Stirring Spoon & Lid Slam:** Swirl critters around in a dizzying soup vortex with the giant ladle, or **slam the heavy lid shut** so the pot shakes, rattles with building steam, and *POPS!* every critter sky-high like champagne corks (with a floor trapdoor lever to dump them down to Gate 2).

### Gate 2 — *Laza* (Peel & Pluck)
- **Tradition:** *"Laza"* (*Qur'an* 70:15–18)—a blazing, leaping flame that *calls/pulls back* those who turn away to flee (`tad'ū man adbara wa tawallā`) and *strips/peels* the outer layer (`nazzā'atan lish-shawā`).
- **Interactive Toy (Single Focus — Peel & Pluck):**
  - **Magnetic Flame-Pit & Cartoon Coat-Peeling (Zero Gore):** Critters try to sprint away and get pulled straight back by the glowing flame. Use your Hand, BBQ Tongs, or the heat-gust to **peel or pop off** each critter's outer coat like a banana peel or sheep shearing—blushing hairless **Boba** (`>///<`), 1-feather plucked rubber-duck **Mochi**, polka-dot boxer-shorts **Pebble** (`-_-`), gummy-core **Gloop**, and bald dandelion-puff **Toto**—before their coats *poof!* back on.

### Gate 3 — *Al-Hutamah* (The Crusher)
- **Tradition:** *"The Crusher"* (*Qur'an* 104:4–9), enclosing vaulted fire that crushes and shatters.
- **Interactive Toy (Single Focus — Crusher):**
  - **Hydraulic Vaulted Crusher & Accordion Walls:** Pull the chunky stomp-lever (or drag the heavy press head directly) to slam an ornate terracotta-and-gold press onto critters—squashing them cartoon paper-flat like pancakes until they hit a paper-rug KO and *pop!* back round, plus springy side walls that accordion-squish them on impact.

### Gate 4 — *Sa'ir* (Force-Feed Burning *Zaqqum*)
- **Tradition:** *"Blazing Fire"* (*Qur'an* 4:10, 67:5–11), paired with the bitter thorny **Zaqqum** tree (*Qur'an* 37:62–66).
- **Interactive Toy (Single Focus — Force Eating):**
  - **Force-Feed Burning *Zaqqum* Fruit:** Shake branches or pluck sizzling, flaming spiky fruits off the *Zaqqum* tree with your Hand or BBQ Tongs and **shove them into resisting critters' clamped-shut mouths**—triggering bright spicy-red faces, rocket flame-breath, frantic hopping, and fiery burp-KO pops (while Pebble swallows them deadpan `-_-` with a polite smoke burp).

### Gate 5 — *Saqar* (Drag Face-First Into Fire)
- **Tradition:** *"Scorching Heat"* (*Qur'an* 74:26–30, *"leaves nothing and spares nothing"*) paired with *Qur'an* 54:48 (*"dragged into the Fire on their faces: 'Taste the touch of Saqar!'"*), overseen by nineteen guardians (*Zabaniyah*).
- **Interactive Toy (Single Focus — Drag Face to Fire):**
  - **Face-First Scorch Conveyor & Winch Crank:** A slanted glowing ember conveyor belt (with a crankable speed/reverse lever) that **drags critters belly-down, face-first** toward a roaring *Saqar* fire-grate—Boba claws skid marks into the belt (`>o<`), Gloop smears a stretchy slime trail, Mochi back-paddles wildly, and Pebble slides face-first deadpan (`-_-`) straight into the flames beneath 19 quiet glowing overhead guardian lanterns.

### Gate 6 — *Al-Jahim / Zamharir* (Freeze Torture)
- **Tradition:** Intense heat contrasted in Islamic tradition with biting **Zamharir** extreme cold (*Qur'an* 76:13; classical hadith descriptions of Hell's freezing breath).
- **Interactive Toy (Single Focus — Freeze Torture):**
  - **Ice-Pillar Tongue Trap, Ice-Cube Mallet & Icicles:** Drag critters near the frosted glacial pillar to stick their pink tongue solid and stretch them backward like rubber with the Tongs; freeze them solid inside chunky **ice cubes** and whack them with a **giant wooden mallet** to shatter into shards (leaving them shivering with blue cheeks and runny beak/nose icicles); or tap ceiling icicles and snowballs onto them.

### Gate 7 — *Al-Hawiyah* (Endless Meteor Freefall)
- **Tradition:** *"The Bottomless Abyss"* (*Qur'an* 101:8–11), the deepest pit (*al-dark al-asfal*, *Qur'an* 4:145).
- **Interactive Toy (Single Focus — Endless Freefall & Burn Like a Meteor):**
  - **Terminal-Velocity Meteor Chute:** Critters plummet endlessly down a fast-scrolling bottomless chasm—picking up speed until **atmospheric friction ignites them into blazing cartoon shooting-star meteors** with glowing flame aura and comet trails! Clip on heavy *aghlal* iron weights (or flip the **Gravity Boost** lever) to make them fall faster and burn brighter, bounce them off side rock ledges, or let them hit a blazing meteor-pop KO and regenerate mid-fall forever.

---

## 5. Interactive Controls & Systems

- **Tone & Core Loop (Adult Dark-Comedy Slapstick):** Adorable, wide-eyed *Sago Mini* / *Dumb Ways to Die* critters contrasted against chaotic cartoon underworld torment—zero blood or gore, pure *Looney Tunes* / *Interactive Buddy* slapstick. When a critter drops in, flash a brief tongue-in-cheek arrival one-liner (e.g., *"Hoarded every midnight snack"*, *"Refused to move off the couch"*).
- **Hand & BBQ Tongs Modes + Spawn Chaos:** Grab, dangle, slingshot, and slam critters with the **Hand**, or pinch/poke them into hazards with the **BBQ Tongs**. Spawn up to all 5 critters at once for chaotic pileups.
- **4-Stage Torture, Wound, Cartoon KO & Regeneration Loop (Never-Ending):** Echoing the classical motif of continuous renewal (*Qur'an* 4:56), critters visibly wear down and bounce back endlessly:
  1. **Fresh (`100%`):** Bright, bouncy, blinking normally.
  2. **Cartoon Wounded (`30–60%`):** Accumulates slapstick wear-and-tear—crooked **X-shaped band-aids**, cartoon head bumps, missing feathers/fur tufts, dizzy wobbles, and soot/frost marks (never gruesome blood).
  3. **Cartoon KO / "Died" (`0%`):** Triggers a hilarious *Dumb Ways to Die*-style cartoon demise matched to the floor—turning into a blinking ash-pile, shattering out of an ice block, flattening like a paper rug with a tiny cartoon ghost-puff floating up (`X_X`), or popping in a cloud of feathers.
  4. **Instant Regeneration (~1.5s):** A warm ember *WHOOSH!* snaps the critter right back together brand-new (screaming *"Not again!"*—while Pebble regenerates straight back into `-_-`) so the torment never ends.
- **Stackable Status Combos:** Charred soot, peeled coats, ice-cube encasing, sour/spicy *Zaqqum* fire-breath, pancake-squash, and shackles stack into absurd combos across floors.
- **Unified Drag, Fling & Trapdoor Carry:** Pull any floor's **trapdoor lever** to drop critters into the gate below, hold near the top/bottom edge to carry them across floors, or tap the slim right-side **1–7 Gate Rail**.
- **Collapsible Tinker Sliders Drawer:** Live physics controls that affect the active view:
  - **Heat / Flame Intensity**
  - **Zamharir Frost Intensity**
  - **Wind Gust Strength**
  - **Gravity Scale** (Normal → Floaty Zero-G)
- **Discovery Unlocks & "Ways They Popped" Log:** Track unique cartoon KOs per gate (*Boiled Cork-Pop in Gate 1*, *Peeled & Roasted in Gate 2*, *Pancaked Flat in Gate 3*, *Zaqqum Fireball Pop in Gate 4*, *Conveyor Scorched in Gate 5*, *Mallet-Shattered Ice Cube in Gate 6*, *Blazing Meteor Pop in Gate 7*) to unlock silly hats.
- **Non-Blocking Cultural Plaque Drawer:** Neutral, cited *Qur'an*, *Hadith*, and classical *tafsir* context for whichever layer is currently centered on screen—only opens when tapped.

---

## 6. Design Guardrails

- **Zero Graphic Gore:** Purely cartoon slapstick (soot puffs, ice cubes, sour faces, pancake squashes)—never blood, realistic pain, or distressing imagery.
- **Cultural Sensitivity:**
  - No depictions of God, prophets, or angels (the 19 guardians in *Saqar* are represented abstractly as 19 ornamental lanterns).
  - Non-human allegorical critters only, paired with respectful, cited explanatory notes distinguishing direct Qur'anic/Hadith text from classical *tafsir* commentary.

---

## 7. Phased Rebuild Roadmap

- **Phase 1 — Core 2.5D Engine & First 3 Gates (Gates 1–3):**
  - Replace Three.js setup with `PixiJS` v8 + `matter-js` + Vite/TypeScript.
  - Build the articulated SVG character rig system (5 critters + blinking/expressions + squash-stretch + soot/ice overlays), Web Audio SFX, vertical parallax camera, Gate Elevator rail, and minimal HUD.
  - Implement **Gate 1 (Jahannam — Cauldron)**, **Gate 2 (Laza — Peel & Pluck)**, and **Gate 3 (Al-Hutamah — Crusher)**.
- **Phase 2 — Deep Layers (Gates 4–7) & Cross-Layer Carry:**
  - Implement **Gate 4 (Sa'ir — Force-Feed Zaqqum)**, **Gate 5 (Saqar — Face-First Drag)**, **Gate 6 (Al-Jahim / Zamharir — Freeze Torture)**, and **Gate 7 (Al-Hawiyah — Endless Meteor Freefall)**.
  - Add smooth drag-to-carry across layer boundaries and per-layer ambient soundscapes.
- **Phase 3 — Shaders, Discoveries & Cultural Polish:**
  - Add PixiJS heat-haze distortion, frost sparkle, and lantern glow filters, discovery hat unlocks, and the complete per-layer cited **Cultural Plaque** drawer.
