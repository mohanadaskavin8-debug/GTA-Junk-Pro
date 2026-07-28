---
name: Frontend gotchas
description: App-specific frontend pitfalls (react-day-picker v9 styling, wouter absolute URLs)
---

# Frontend gotchas

## react-day-picker v9 silently ignores v8 classNames keys
The web app has react-day-picker v9, but shadcn's older calendar snippet (and most online examples) use v8 keys (`day_selected`, `nav_button`, `caption`, `head_row`…). v9 renamed them (`selected`, `today`, `disabled`, `outside`, `day_button`, `button_previous`, `month_caption`, `weekdays`…), so v8 keys no-op with no warning.
**Why:** cost a user-visible regression — a calendar restyle "did nothing" until the base component was rewritten for v9.
**How to apply:** style only via v9 keys in `components/ui/calendar.tsx`. Modifier classes land on the `td`, so target the inner button with `[&>button]:` utilities. Verify styling changes visually (screenshot/tester), not just by code reading.

## wouter Link 404s on absolute URLs
`<Link href="https://…">` pushes the full string into history; no route matches, so the app's 404 page renders. The API intentionally returns absolute URLs (they're reused in emails).
**Why:** broke the booking success page's Reschedule/Cancel buttons.
**How to apply:** before passing an API-built URL to a wouter Link, strip the origin (`new URL(u).pathname + u.search`); keep the absolute form for emails only.

## Marquee/auto-scroll sections (a11y — architect-flagged)
Any infinite marquee must: (1) mark the duplicated clone track `aria-hidden` so screen readers hear one set; (2) render a static wrapped grid when `useReducedMotion()` is true — `animation: none` alone leaves overflow-hidden content unreachable; (3) for seamless `translateX(-50%)` loops put `gap` + trailing `pr` inside each half-group, no gap on the parent track.
