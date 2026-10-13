# App and landing-page motion audit

## Opportunities

| Location | Today (before changes) | Purpose | Frequency | Suggested motion |
| --- | --- | --- | --- | --- |
| `src/components/ui/form-alert.tsx` | Action feedback appears abruptly | Preventing a jarring change | Occasional | Opacity 0→1 and translateY(4px)→0, 180ms `cubic-bezier(0.23, 1, 0.32, 1)`; opacity only with reduced motion |
| `src/components/ui/disclosure.tsx` | Only the caret moves | State indication | Occasional | Native details-content opacity transition, 180ms same ease-out; no custom JS or delayed keyboard interaction; instant fallback in older browsers |
| `landing-page/index.html` hero | Hierarchy appears all at once | Delight | First visit | Heading, copy, preview: opacity + translateY(12px), 500ms same ease-out, delays 0/50/100ms; buttons always visible; reduced-motion 180ms fade only |
| `landing-page/index.html` marketing sections | Sections have no entrance | Preventing a jarring change | First visit | One-time intersection entrance, opacity + translateY(12px), 500ms same ease-out; no motion with reduced-motion, content visible without JS; do not animate individual preview data |

## Existing-motion findings

| Severity | Category | Location | Finding | Fix |
| --- | --- | --- | --- | --- |
| Medium | Accessibility | `landing-page/styles.css` `.button:hover` | Transform hover is not pointer-gated | Gate on hover:hover and pointer:fine |
| Medium | Purpose/frequency | `src/components/layout/bottom-nav.tsx` | Core navigation inherits physical press transforms | Keep navigation instant; retain static active/focus indicators |
| Low | Cohesion | Both stylesheets | Press easing differs between surfaces | Share named ease-out and 120ms press tokens in both independent stylesheets |
| Low | Performance | Both stylesheets | Press transitions animate painted shadows | Animate transform only; keep clay shadow changes instant |
| Low | Accessibility | Both stylesheets | Blanket reduced-motion rules erase feedback transitions | Remove movement and recurring loading animation; preserve short feedback fades |

## Rejected candidates

- Student, schedule, invoice list entrances: rejected by function and frequency; users need stable, immediately readable information.
- Route/content page transitions: rejected by frequency; daily navigation should never wait for motion.
- Animated billing amounts and preview data: rejected by function; moving readable financial data offers no benefit.
- Looping book illustration or bouncing success icons: rejected by purpose; constant decoration competes with the content.

## Verdict and implementation handoff

This interface needs little motion in the app and a slightly larger first-visit budget on the landing page. Action feedback is the highest-value addition. The audit and opportunity-finding stages are read-only; implementation is handed to the `animate` skill, using existing CSS and native browser APIs without adding dependencies or changing layout, typography, or colors.

## Feel-check

Check button press/release on mouse and touch; rapidly open/close disclosures; submit successful and failed actions; scroll the landing page down and back up (entrances must not replay). Enable reduced motion before loading and during an active reveal. Disable JS to confirm all landing content remains visible. Check current Chrome/Safari/Firefox: unsupported `::details-content` and `@starting-style` must degrade to instant native behavior. Visual timing requires a browser review; code checks alone cannot settle it.
