# VoltGhar UI rules

- Change only CSS, className and markup wrappers, index.html, and presentational components. Keep server/, tests/, package.json, routes, API calls, state logic, and props untouched. Use plain CSS with no Tailwind or new dependencies.
- Run `npm run build` and `npm test` after each phase and fix errors.
- Define these tokens on :root: --bg:#F4F3EF; --surface:#FBFAF6; --soft:#EBE9E2; --ink:#131311; --muted:#787875; --orange:#FF5A36; --lime:#D4FF52; --violet:#8E6CFF; --cobalt:#2456F0; --line:rgba(0,0,0,.06); --radius-card:22px; --radius-inner:12px; --radius-pill:999px; --gap:10px.
- Use neutral surfaces, at most two accents per section, and 1px var(--line) separators. Use whitespace and surface shade for hierarchy. Avoid gradients and shadows. Use ink text on lime and white text on orange, violet, cobalt, and ink.
- Use Inter 500/600/700 with heading tracking between -.02em and -.04em. Use JetBrains Mono 400/500 for uppercase micro-labels at 10–11px, .12em tracking, and var(--muted). Use Inter 600 at 44–56px for stat numbers with 12px captions.
- Use ink primary buttons, orange CTAs, and 1px rgba(0,0,0,.1) outlines for secondary buttons. Use 12px corners and 600 weight. Give inputs a surface background, matching outline border, 12px corners, and an offset 2px ink focus ring.
- Keep motion inside prefers-reduced-motion: no-preference. Lift interactive tiles 2px over 180ms ease-out and stagger 10px fade-up entrances by 40ms.
- Build mobile first with 2 bento columns on mobile and 4 on desktop, a 1200px maximum container, tap targets of at least 40px, AA contrast, and visible 2px ink focus rings.
- Keep reusable tiles, card sections, group heads, tags, meta chips, checkboxes, progress bars, avatar stacks, and agenda items in src/ui.css.
