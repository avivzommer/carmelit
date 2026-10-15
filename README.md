# Haifa Underground

The current station game starts at `index.html`. `level5.html` redirects here for existing bookmarks.

Run locally: `python3 -m http.server 8766 --bind 127.0.0.1 --directory visual-study` from the parent directory, then open http://127.0.0.1:8766/.

The runtime uses local Three.js modules in `vendor/`. All remaining game modules are dependencies of the current level. No network libraries or build step are required.

Validate gameplay: `node --test visual-study/mechanic*.test.mjs` from the parent directory.

## Mobile prototype

`mobile-prototype.html` keeps a close camera with tap-to-walk exploration. Floor and stair taps stop at the chosen point and can redirect an ongoing walk. Boarding does not require or trigger a repair; power is still required to move a cart. Tap the three blue cabinets to repair them, turn the upper-left platform handwheel to call the second cart, then tap an open doorway to board and swipe up/down inside a cart or use its cabin arrow controls. The middle service stairs sit at the outer platform edges, clear of the trains. Gameplay actions stay on the world objects. Short, optional guidance highlights the first repair, open door, and uphill swipe, then teaches the wheel only when the mechanic approaches it. Tips toggles these lessons without adding later puzzle solutions. Guidance ends after the first uphill ride and returns only when approaching the handwheel, then ends once the called cart arrives. Guidance observes progress without changing routes, locks, or input targets. Wheel travel reverses the two carts and settles at a platform stop when released. The original level is unchanged.

Validate the mobile machinery and walking clearance with `node --test visual-study/mobile-machinery.test.mjs visual-study/mobile-tutorial.test.mjs` from the parent directory.

## Hosting

Netlify builds the unchanged static game with `node build.mjs` and publishes `dist/`. The build copies runtime files only. Tests and local development files are excluded.
