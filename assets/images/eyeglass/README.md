# Eyeglass product photos go here

This folder is wired into the live site already (see `/assets/data/eyeglasses.json`
and `/eyeglasses.html`). It's currently empty because no real frame photography
exists yet — nothing was faked to fill the gap.

## What to add, per frame

5 photos per frame, consistent lighting/background across all of them:

1. **Front** — straight-on, both lenses fully visible
2. **Left 3/4** — turned ~45° to camera-left
3. **Right 3/4** — turned ~45° to camera-right
4. **Left side** — full profile, camera-left
5. **Right side** — full profile, camera-right

## File naming

```
eyeglass-<gender>-<number>-front.webp
eyeglass-<gender>-<number>-left.webp
eyeglass-<gender>-<number>-right.webp
eyeglass-<gender>-<number>-side-left.webp
eyeglass-<gender>-<number>-side-right.webp
```

`<gender>` is `men`, `women`, `kids`, or `unisex`. `<number>` is a 2-digit
zero-padded sequence per gender (`01`, `02`, ...).

Example for the first men's frame:

```
eyeglass-men-01-front.webp
eyeglass-men-01-left.webp
eyeglass-men-01-right.webp
eyeglass-men-01-side-left.webp
eyeglass-men-01-side-right.webp
```

## Format

- **WebP**, sRGB, square-ish crop around the frame (roughly 1:1 to 4:5).
- Reasonably lit, plain/neutral background so the frame reads clearly as a
  product photo, not a lifestyle shot.
- Around 1000–1600px on the long edge is plenty — the site serves these at
  card and viewer sizes, not full-bleed.

## Optional: transparent AR overlay

If you also want the *real* frame to appear in the Try-On camera experience
(instead of the current placeholder stylized shape), each frame additionally
needs ONE transparent-background cutout of the front view:

```
eyeglass-men-01-overlay.png
```

This is a *different* image from `-front.webp` — the front photo can keep a
background for the product gallery, but the AR overlay must be a clean
transparent PNG of just the frame (no face, no background) so it can be
composited live onto the camera feed.

## Registering a new frame

After adding the 5 (or 6, with overlay) images, add one entry to
`/assets/data/eyeglasses.json` following the schema described in
`/assets/data/PRODUCT_SCHEMA.md`. Nothing else needs to change — the page,
filters, 5-angle viewer, and Try-On engine are all data-driven.
