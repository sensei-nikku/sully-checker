# Geometry 1 — Trigonometry Tools

Interactive answer checkers and a triangle-labeler tool for the Geometry 1 trig unit (adult credit-recovery, Chromebook-based). Static site — no build step, no dependencies beyond Google Fonts. Hosted on GitHub Pages.

## Structure

```
index.html                     Hub / launcher (CARDS array → cards)
assets/styles.css              Shared design tokens + components (one source of truth)
js/checker-core.js             Checker engine — state, step scaffolding, redirect-to-teacher, djb2, tolerance
js/triangle-labeler.js         Orientation + 7-box labeler module (reads page-supplied configs)
tools/triangle-labeler.html    Standalone labeler drill (label-only, varied orientations)
checkers/hudson.html           Miracle on the Hudson project checker
checkers/hudson-pretest.html   Trigonometry pre-test (readiness check)
```

Each checker page is thin: it defines its own data inline, then loads the two shared scripts and calls `initChecker()`. All styling and logic live in the shared files, so a fix to the engine or the look propagates everywhere at once.

## How a checker page is wired

Load order matters — data first, then the shared scripts, then the init call:

```html
<link rel="stylesheet" href="../assets/styles.css">
...
<script> /* page data: QS, NODES, STAGES, LABQ, LAB_CORRECT_SLOT */ </script>
<script src="../js/checker-core.js"></script>
<script src="../js/triangle-labeler.js"></script>
<script>initChecker();</script>
```

### Question data (`QS`)

An array of question objects. A trig question looks like this:

```js
{id:'p1', stage:0, num:'Q1', type:'trig',
 unitType:'feet',          // 'length' (feet/miles dropdown) | 'feet' | 'degrees'
 prompt:'...', context:'...', sketch:'...',
 expected:{x:'opp', angle:[57,59], hyp:[[13.7,14.3]], adj:null, opp:null, ratios:['sin']}}
```

`x` is the unknown (`opp` | `adj` | `hyp` | `angle`). Side ranges are arrays of `[lo,hi]`; `angle` is a single `[lo,hi]`. The engine computes the answer from the chosen ratio and the entered values, then checks the student's number within ±2% (with a wider "check your rounding" band before it redirects to the teacher). Hints are on-demand and two-staged: while the triangle is being made there is a process hint (find the right angle, place θ by elevation vs. depression) that does not reveal this problem’s specific sides; after the triangle is labeled, the `sketch` hint helps with the equation setup — which value is the unknown, unit conversions.

Other question types are `select` (multiple-choice reasoning, answers djb2-hashed in source) and `clearance` (the Hudson Q8 flight-clearance check). See `hudson.html` for working examples of both.

### Nav (`NODES`, `STAGES`)

`STAGES` is `[{t:'Title', d:'subtitle'}]` and groups the questions under headers. `NODES` drives the Hudson flight-path bar; set `NODES=[]` and omit the `.fp` element to hide it entirely, as the pre-test does. The header progress dots render for any question count on their own.

### Triangle labeler (`LABQ`, `LAB_CORRECT_SLOT`)

One entry per question that uses the labeler, keyed by question id:

```js
LABQ = { p1:{R:[255,175], LOW:[70,175], HIGH:[255,60], type:'elev', ratio:'sin'} }
LAB_CORRECT_SLOT = { p1:1 }   // which of the 4 orientation cells (0–3) is the correct one
```

- `R` / `LOW` / `HIGH` are the right-angle, base, and elevated vertices in a 340×250 viewBox. `LOW` must sit at a bottom corner with a horizontal leg running to `R` (that leg is the ground).
- `type:'elev'` → θ is correct **inside, at the base**. `type:'depr'` → θ is correct **outside, off the horizontal at the top** (the depression-angle position). Sides are always graded relative to the base angle.
- The two relevant sides are derived from `ratio`: sin → opposite + hypotenuse, cos → adjacent + hypotenuse, tan → opposite + adjacent. The third side is the distractor — it gets no drop slot, and the badger fires if a student tries to place it.
- Two invariants the geometry must satisfy when you add a triangle: the angle at `R` is exactly 90°, and the seven box centers clear roughly 50px of separation so nothing overlaps. Check both (a quick 90° calculation and a pairwise-distance pass) before committing a new config — getting `LOW`/`HIGH` backwards or a non-right `R` is the easy mistake.

## Adding things

New checker: copy `checkers/hudson-pretest.html`, swap the data block (`QS`, `STAGES`, `LABQ`, `LAB_CORRECT_SLOT`), keep the script links and `initChecker()`, then add a card to `index.html`. New hub card: add an entry to the `CARDS` array in `index.html` — `{tag, title, desc, href, status}`, where `status:'soon'` greys the card and disables its link until you flip it to `'live'`.

## Constraints

Built for Chromebooks. The drag interaction uses pointer events with `touch-action:none`, which works on touchscreens (native HTML5 drag does not). There is no localStorage — all state is in JavaScript and resets on refresh, by design. No accounts, no installs; the only external dependency is the Google Fonts link.

## Local preview

Because the files are split across folders, opening a single `.html` directly won't resolve the `../assets` and `../js` links — serve the folder instead. From the repo root: `python3 -m http.server`, then open `http://localhost:8000`. Or just push to GitHub Pages.
