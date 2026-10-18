# 0002: Two screen layouts, tested at three widths

**Status:** Decided, 2026-10-18. **Issues:** #31.

## Context

People use Newton on:

- phones everywhere (an iPhone 15 or similar, about 390px wide),
- small tablets on board, at the nav station or outside (9" screens, about 800px wide in portrait
  and 1280px in landscape),
- larger tablets (iPad Pro) or laptops on board,
- laptops and desktops with large monitors at home.

On board, tablets and phones are used with fingers, often with wet hands on a moving boat.

## Decision

Design two layouts:

| Layout | Width | Devices |
| --- | --- | --- |
| Phone | below 640px (Tailwind `sm`) | Phones |
| Wide | 640px and up | Tablets in portrait and landscape, laptops, desktops |

Rules for both:

- **Touch everywhere.** Anything tappable is at least 44px tall, and nothing depends on hover.
  The wide layout is also a tablet layout, not only a laptop one.
- **Content width is capped** (`max-w-5xl`, 1024px), so large monitors only add margins.
- **Test at three widths:** 390px (phone), 800px (portrait tablet) and 1280px (laptop), in
  light and dark mode, with no horizontal scroll.

## Alternative considered: a third, tablet layout

Rejected: a 9" tablet is close enough to both ends that it doesn't need its own design. In
portrait it fits the wide layout; in landscape it is laptop-sized. A third layout would mean a
third design to keep in step on every screen. The 800px test width catches what would break in
between.

Revisit if a screen used mostly on board (the on-water view in Phase 2) needs a different
arrangement on tablets than on laptops.

## Consequences

- Every PR that changes a screen is checked at the three test widths (in the `ship-change`
  checklist).
- Wide layouts must still work at 640–800px, not only on a laptop.
