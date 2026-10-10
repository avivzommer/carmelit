# Haifa Underground

The current station game starts at `index.html`. `level5.html` redirects here for existing bookmarks.

Run locally: `python3 -m http.server 8766 --bind 127.0.0.1 --directory visual-study` from the parent directory, then open http://127.0.0.1:8766/.

The runtime uses local Three.js modules in `vendor/`. All remaining game modules are dependencies of the current level. No network libraries or build step are required.

Validate gameplay: `node --test visual-study/mechanic*.test.mjs` from the parent directory.

## Mobile prototype

`mobile-prototype.html` keeps a close camera with tap-to-walk exploration. Repair the three blue cabinets, turn platform handwheels to call the cable-linked carts, then board and use the cabin uphill/downhill controls. Wheel travel reverses the two carts and settles at a platform stop when released. The original level is unchanged.

Validate the mobile machinery and walking clearance with `node --test visual-study/mobile-machinery.test.mjs` from the parent directory.

## Hosting

Netlify builds the unchanged static game with `node build.mjs` and publishes `dist/`. The build copies runtime files only. Tests and local development files are excluded.
