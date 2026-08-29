# Product data schema — eyeglasses.json / sunglasses.json

Both `/assets/data/eyeglasses.json` and `/assets/data/sunglasses.json` are a
flat JSON array of product objects, loaded by `/assets/js/catalog.js`. The
page (grid, filters, 5-angle viewer, Try-On) is entirely data-driven — adding
a well-formed entry here is the only step needed to publish a new frame.

Both files currently contain `[]` (empty). Nothing is faked to fill the gap;
the page shows an honest "new arrivals coming soon" state until real entries
are added. See `sample-product.json` in this folder for one fully-filled,
copy-pasteable example (that file is never loaded by the site — it's
reference documentation only).

## Fields

```jsonc
{
  // Unique, stable, URL-safe id. Never reuse or renumber once published —
  // it may be shared/bookmarked via the product detail deep link.
  "id": "eyeglass-men-01",

  // Real product name as the shop actually refers to it. No superlatives.
  "name": "Classic Rectangle Frame",

  // One of: "men" | "women" | "kids" | "unisex"
  "category": "men",

  // Frame shape — used for the shape filter row. Keep it one of the
  // recognized values below so filtering stays consistent:
  // rectangle | round | square | aviator | cat-eye | wayfarer |
  // rimless | half-rim | full-rim
  "shape": "rectangle",

  // Optional. Only include a value you can actually stand behind —
  // omit the whole "price" field if it's not settled/verified. The UI
  // hides the price row entirely when this is absent; it never shows
  // a placeholder or invented number.
  "price": 1499,

  // The 5 real product photos (see README.md in the asset folder for the
  // photography spec). Paths are relative to site root.
  "images": {
    "front":     "/assets/images/eyeglass-20/eyeglass-men-01-front.webp",
    "left":      "/assets/images/eyeglass-20/eyeglass-men-01-left.webp",
    "right":     "/assets/images/eyeglass-20/eyeglass-men-01-right.webp",
    "leftSide":  "/assets/images/eyeglass-20/eyeglass-men-01-side-left.webp",
    "rightSide": "/assets/images/eyeglass-20/eyeglass-men-01-side-right.webp"
  },

  // Alt text per angle — specific, not keyword-stuffed. Used verbatim as
  // the <img alt="..."> for that angle.
  "altText": "Men's rectangle eyeglass frame at Shree Hari Chasma Ghar, New Ranip",

  // Try-On calibration. Optional block — if omitted, Try-On falls back to
  // the generic shape-matched placeholder overlay for this product's
  // "shape" value, clearly labeled as a preview shape (not a photo of the
  // real product) until a real overlay is supplied.
  "tryOn": {
    // Transparent-background cutout of the front view. Omit this field
    // entirely until a real overlay exists — do not point it at the
    // regular product photo (that has a background and will look wrong
    // composited over a live camera feed).
    "overlay": "/assets/images/eyeglass-20/eyeglass-men-01-overlay.png",

    // Frame width as a multiple of the wearer's measured eye-to-eye
    // distance. ~1.9-2.1 suits most full-rim frames; oversized frames
    // may need ~2.2-2.4. Tune with ?tryonDebug=true on this page.
    "widthRatio": 2.0,

    // Vertical nudge as a fraction of frame height. Positive = down,
    // negative = up. Start at 0 and adjust in the calibration tool.
    "verticalOffset": 0,

    // Horizontal nudge (nose-bridge alignment) as a fraction of eye
    // distance. Usually 0; only needed for asymmetric frame art.
    "noseOffset": 0,

    // Multiplier applied to the camera-computed head-tilt rotation.
    // 1 = follow head tilt exactly. Rarely needs changing.
    "rotationMultiplier": 1
  }
}
```

## Calibrating a real frame's Try-On fit

1. Publish the product entry with an `overlay` image set.
2. Open the page with `?tryonDebug=true` appended to the URL
   (e.g. `/eyeglasses.html?tryonDebug=true`) — this reveals on-screen
   Scale / X offset / Y offset / Rotation sliders and the live face-landmark
   dots, hidden from normal customers.
3. Open Try-On on that product, adjust the sliders until the overlay sits
   correctly on your own face, then read the resulting `widthRatio` /
   `verticalOffset` / `noseOffset` / `rotationMultiplier` values shown in the
   debug panel and copy them into that product's `tryOn` block in the JSON
   file.
