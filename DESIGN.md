# Aura Coach — Clay

## Overview

Clay is the design system of Aura Coach AI, a Flutter app for learning English (UI in English and Vietnamese). It reads as soft, hand-moulded clay: pastel accent fills on a warm cream canvas, cards cut out by a hard-edged offset shadow rather than a diffuse glow, dark ink on every accent, and controls that physically press DOWN when tapped.

Five ideas outsiders get wrong:
- **Accents are theme-invariant; only chrome flips.** Teal, purple, gold and coral never change between light and dark. Canvas, surface, border, text and shadow do.
- **Depth is edge + offset, never diffusion.** The signature drop is offset (3,3) with blur 0. A sunken surface casts nothing at all.
- **Interaction is a press-down, not a glow.** Scale to 0.97, shadow shrinks 3px → 1px, haptic fires on tap-down. No ripple, no highlight.
- **Typography is a drift absorber.** The base roles follow the Clay mockups; the ~13 roles added after them each absorbed a measured `.copyWith` cluster. The scale was never designed top-down.
- **Selected = coloured and pressed-in, not lit-up.** A selected chip keeps its classic accent fill and takes the pressed "clay" drop; the earlier "selected sinks into a tray" pattern is retired (founder call 2026-08-24).

Three orthogonal theming axes: Brightness (light/dark), Skin (classic / intaglio / pebble — what a widget is MADE of), Topic (shape / school / space — WHERE we are). The default skin is intaglio. Classic is a bit-faithful snapshot of pre-skin production and is deliberately exempt from the contrast contract.

Tokens: AppColors, ClayPalette (chrome per brightness), ClaySkinSurfaces (material grammar per skin), ClayTopicScape (ground), AppTypography, AppShadows, AppSpacing, AppRadius, AppBorders, AppAnimations. Widgets read `context.clay` and `context.surfaces`; they never branch on the skin or topic enum — a null token means "take the flat classic path".

## Colors

**Principle.** Accent hexes never move with brightness. Dark mode stays in the warm purple-blue family: the dark surface IS the light text colour (#2D3047) and the dark text IS the light canvas (#FFF8F0).

**Light chrome**
- background `#FFF8F0` cream — the canvas. Frozen: store screenshots, splash colour sets and painter cutouts depend on it, and shifting it cannot buy separation (surface↔canvas would rise from 1.03:1 only to 1.08:1).
- surface `#FEFCF9` — card fill. Only 1.029:1 from the canvas, so cards are defined by border + shadow, not colour.
- surfaceAlt `#F5EDE3` beige — inset panels, well fill, disabled fill.
- border `#E8DFD3` — DECORATIVE only (1.29:1 on surface). Control outlines use borderControl.
- text `#2D3047` — 12.27:1 on canvas, min 8.50:1 on any band stop.
- textMuted `#6B6D7B` on classic (4.42:1 on surfaceAlt, a known miss) → `#575964` on intaglio/pebble (min 4.58:1 on all 11 light stops).
- textFaint `#9B9DAB` — 2.32–2.63:1 on light grounds. Disabled controls only, never live copy.
- shadow `#D4C9BB`; shadowBold `#2D3047`.

**Dark chrome**
- background `#1A1C2E`, surface `#2D3047`, surfaceAlt `#3A3D55`, border `#4A4D62`.
- text `#FFF8F0` (min 9.22:1), textMuted `#B8B6CC` (min 4.90:1, needed no fix), textFaint `#82849A` (3.52:1 / 2.89:1 — same disabled-only role).
- shadow 45% black `0x73000000`, shadowBold 80% black `0xCC000000` — translucent so the hard offset stays visible on a dark surface.
- warmDark equals the dark surface, so any painter baking `#2D3047` ink renders 1.00:1 in dark mode.

**Accents — four addresses, each owns a mode**
- teal `#7ECEC5` / tealDeep `#5FB5AB` — Scenario; brand primary; default button, nav and selection colour.
- purple `#A78BCA` / purpleDeep `#8A6FB0` — Story; tier Pro.
- gold `#E8C77B` / goldDeep `#D4AF5F` / goldDark `#9A7B3D` — Grammar and Tone; tier Premium. goldDark is a TEXT colour (2.44:1 as ink on gold), never a fill.
- coral `#E8927C` — Vocab Hub. No deep step exists.
- Semantic: success `#7BC6A0` (same hex as neutralTone by contract), warning = gold, error `#D98A8A` (= casualTone), formalTone `#6366F1` (tag tint / label / bar only). There is no `info` token.
- Tier: pro = purpleDeep, premium = goldDeep; soft companions purple / gold with caller alpha.

**Ink on accent**
- Band skins (intaglio, pebble): `#1E202F` in both brightnesses — 5.52–9.89:1 on every permitted flat fill (test-locked). The TINTED bottom stop is not locked and drops under the shipped 25% / 35% dark overlays to 3.30 (intaglio dark, purple) and 2.64 (pebble dark, purple) — keep label text on the flat mid band. The ink sits 1.25:1 from warmDark, so the change is invisible on chrome yet lifts purple from 4.42 to 5.52.
- Classic: warmDark `#2D3047` — gold 7.93, teal 7.09, success 6.42, coral 5.44, purple 4.42 (locked debt).
- `AppColors.onAccent` (#FFFFFF) is still documented as the sanctioned alias for text on accents, but it measures as a failure. White on the pastels: gold 1.63, teal 1.82, success 2.01, coral 2.38, purple 2.92 — all fail. Use `surfaces.inkOn(fill)` or `accentInkOr(AppColors.warmDark)`.
- Banned as text fills under band ink `#1E202F`: purpleDeep 3.82, formalTone 3.61, goldDark 4.05 — all under 4.5. `bandFill()` maps purpleDeep → purple on band skins; classic keeps white on purpleDeep (4.22 beats warmDark's 3.06).

**Mode washes (canvas per accent, band skins only)**
- intaglio light: Scenario `#E8F0E8`, Story `#EFE4E9`, Grammar `#FBEFDB`, Vocab `#FBE6DB` — 18% accent over cream; text 10.4–11.4:1, muted ≥ 5.0:1.
- intaglio dark: `#30434F` / `#393450` / `#47423F` / `#47363F` — 22% over #1A1C2E.
- pebble light: `#D9E1D5` / `#E0D5D6` / `#ECE0C7` / `#ECD6C7`. Classic: every wash equals the plain background.
- Muted text on a wash has little headroom (a source comment records 4.58:1 on pebble); recomputed against the shipped pebble washes, textMuted lands at 4.55 (Scenario), 4.66 (Grammar), 4.25 (Story) and 4.35 (Vocab) — two are under AA, and the motif test runs on a stand-in canvas that cannot catch it. Nothing may darken beneath muted text on a wash.

**Band stops, intaglio (top / mid / bottom)**
- light raised `#FFFFFF` / `#FEFCF9` / `#E8E4DF`; well `#E0D7CC` / `#F5EDE3` / `#FDFBF8`; tray `#DAD0C5` / `#EBE2D7` / `#F9F6F3`.
- dark raised `#404358` / `#2D3047` / `#202232`; well `#181926` / `#25273A` / `#393A4C`; tray `#13141E` / `#202333` / `#323543`.
- Raised is lit from above; well and tray invert. These are the values `flutter test` printed, not hand-computed.

**Control outline (borderControl, ≥ 3.0:1 vs every stop)** intaglio `#807362` light (worst 3.04:1) / `#8D909F` dark (worst 3.06:1); pebble `#807362` / `#948C7E`; classic keeps the decorative hex and fails.

**Pebble chrome** light bg `#EDE5D8`, surface `#FAF7F0`, surfaceAlt `#F0EADD`, border `#F3EEE5` (tone-on-tone, "no borders"), text `#454A40`, textMuted `#5F6457`; dark bg `#221F1A`, surface `#2E2A24`, text `#F2EDE3`, textMuted `#C0BAAE`. Pebble separates surface from canvas by colour at 1.17:1.

## Typography

**Families — never vary by skin.**
- Display and titles: Fredoka for English; Baloo 2 when the app locale is Vietnamese (Fredoka has no Vietnamese glyphs). Flag set once per build from the resolved locale.
- Labels, buttons, chips, badges: Nunito (covers Vietnamese, never switched).
- Body, captions, prompts: Inter.
- Fetched at runtime via google_fonts; no font files are bundled.

**Colour.** No role carries a colour. Text inherits palette.text from the theme; muted text is set at the call site with `context.clay.textMuted`. Light maps labelMedium/labelSmall to textMuted while dark maps every slot to text — a preserved production asymmetry.

**Roles (px / weight / line-height)** — 43 total; the load-bearing ones:
- Title font: displayLg 32/800/1.2 · displayMd 28/700/1.2 · h1 24/700/1.3 · h2 20/700/1.3 · h3 18/700/1.4 · title 20/700/1.3 (app bar, dialog) · titleSm 17/700/1.3 (dense rows) · titleXs 16/700/1.3 (card titles) · sheetTitle 20/700/1.3 (kept separate so sheets can retune) · sectionTitle 15/700/1.4 · sectionTitleLight 15/500 · statNumber 26/800/1.0 ls −0.5 · input 18/500/1.3 · chatBarText 15/500/1.3 · logo 28/700 ls 2.
- Inter: bodyLg 18/400/1.5 · bodyMd 16/400/1.5 · bodyMdMedium 16/600 · bodySm 14/400/1.5 ls 0.2 · bodySmCompact 13 · bodyEmphasis 14/700 · bodyEmphasisItalic 14/500 italic (the only italic — quotations) · bodyXs 12/400/1.45 · sentence 22/800/1.12 · sentenceVi 22/800/1.4 — taller because stacked Vietnamese diacritics (ộ ầ ữ) clip at 1.12.
- Nunito: labelLg 16/700/1.4 · labelMd 13/700/1.4 · labelMdMedium 13/600 · labelMdBold 14/800 ls 0.5 · labelSm 12/600/1.4 · button 15/700/1.2 · buttonSm 14/700/1.2 · cardBody 13/700/1.5 · pillBadge 10/800 ls 0.8 · micro 9/700 ls 0.3 · microHeavy 9/800 ls 0.5.
- The 11px ladder — hierarchy by WEIGHT at a fixed size (Inter): caption 400 · captionMedium 600 · captionBold 700 carry ls 0.3; captionEmphasis 500 carries none; sentenceLabel 700 ls 0.8 · sentenceLabelHeavy 800 ls 1.0 (Nunito uppercase eyebrows). captionSm is 10/400.

**Why 43 roles.** Every role added after the base set absorbs a `.copyWith(fontSize|fontWeight)` cluster flagged by the 2026-06 drift audit (captionBold alone absorbed ~67 sites per its dartdoc; bodySmCompact 20+). Result today: 903 AppTypography references; 67 sites still override `fontSize` and 143 override `fontWeight` inside a role's multi-line `copyWith`, so the drift audit is not closed — the Don't at the bottom is a rule, not a measured state. Compressing to a 6-step scale is refused — that pressure is what produced the drift.

**Scale.** No named size scale; the measured set is 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 20, 22, 24, 26, 28, 32 px. Odd sizes: 17 (titleSm) and 26 (statNumber) exist because a real `.copyWith` cluster needed them; 22 (sentence) is a hero mockup size. System text scale is clamped to 0.85–1.6 (captions never fall below 9pt; 44dp buttons survive 1.6).

## Elevation

**Two axes, not a ladder.** Interactive controls cast a diagonal, blur-0 drop; floating surfaces cast a vertical, blurred one. Selecting a card swaps it from the floating axis to the interactive axis (card → clay drop): it presses in, it does not glow.

Light, classic and intaglio:
- control — buttons, selected cards: `#D4C9BB` offset (3,3) blur 0 → pressed offset (1,1).
- controlBold — primary / accent CTA: `#2D3047` offset (3,3) blur 0 → pressed (1,1).
- controlBoldCompact — chips, badges: `#2D3047` offset (2,2) blur 0.
- card — resting canvas card, chat bubble: `#142D3047` offset (0,3) blur 10 (raised from 4% to 8% in 2026-06 so bubbles read as cards).
- soft — sheets, toasts: `#0F2D3047` offset (0,4) blur 12.
- lifted — `#1A2D3047` (0,6) blur 20 stacked on the control drop.
- colored — accent CTA glow: accent at alpha 0.4 on controlBold geometry (accents are theme-invariant, so the colour is not theme-resolved).

Dark: control `0x73000000`, controlBold `0xCC000000`, identical offsets.

Pebble replaces every drop with a soft warm one (shade `#60503E`): control `0x4560503E` (0,5) blur 10 → pressed (0,2) blur 5; controlBold `0x5C60503E` (0,7) blur 14; card (0,4) blur 10; soft (0,10) blur 20. A test asserts pebble's soft and lifted drops are blurred; its control drops are blurred in code but not guarded.

**Press depth** is 3px → 1px on both axes in classic/intaglio — declared by literal pairs, not locked by a test.

**Sunken surfaces cast nothing.** Wells (inputs, tracks, empty cells) and trays (tab rails) show inverted bands and no drop — the absence of a drop IS the sunken signal.

**Bands.** 4-stop vertical gradients whose lit/shaded bands occupy only the outer 13% (stops 0 / 0.13 / 0.87 / 1.0) so text sits on the flat mid colour; pebble widens to 18% because bands stand in for inset shadows Flutter cannot draw. Accent-fill overlays: intaglio light 30% white / `0x1F2D3047`; pebble light 55% white / `0x3860503E`; classic transparent. Every gradient stop is opaque.

**Material elevation is 0** on app bar, buttons, cards and the nav bar; depth comes only from BoxShadow tokens. The two exceptions are popup menus at elevation 8.

**Edges (AppBorders)** sub 0.5 · hairline 1.0 · thin 1.2 · card 1.5 · thick 2.0 · accentBar 3.0. Bare numeric widths are forbidden by test (one 4px medallion ring is allow-listed); every left rail reads accentBar. ClayCard, ClayButton and ClayTextInput shells draw at thick 2.0; plain content cards and banners at card 1.5.

## Components

All shared widgets gate on tokens: `surfaces.raised == null ? clay.surface : null` — null means the flat classic path.

**ClayPressable** — the single press primitive (124 sites). Tap-down: scale to 0.97 (pebble 0.96) over 80ms easeOut with a light haptic in the same frame. Release: spring mass 1 / stiffness 400 / damping 15. Reduce-motion snaps to 1.0. It is a bare GestureDetector — no ripple, no keyboard focus.

**ClayButton** — variants primary (teal), secondary (surface), danger (error), ghost, pill, accentPurple / accentCoral / accentGold. No size axis; pill only changes padding.
- Padding 20×14 (pill 24×10); radius skin radiusLg (20; pebble 28) or full; min height 44; outline 2.0 in `inkBorderOr(clay.text)`, transparent on pebble with width preserved.
- Fill: band skins `tinted(accent)`, secondary `raised`; classic flat.
- Ink: `accentInkOr(warmDark)` on accents; clay.text secondary; textMuted ghost; textFaint disabled.
- Shadow: clayBold → clayBoldPressed on accents, clay → clayPressed on secondary and danger; none for ghost/disabled.
- Loading: 20px spinner stroke 2.5 in the ink colour; the label stays laid out at opacity 0 so width never jumps. Disabled: surfaceAlt fill, opacity 0.5. Label `button` 15/700; icon gap 10.

**ClayCard** — raised gradient or surface; radius radiusLg; border 2.0 in clay.border, teal when selected; shadow card → clay when selected; padding 16; 150ms animation.

**ClayTextInput** — self-drawn shell. Band skins: well gradient, borderControl outline, NO shadow. Classic: surfaceAlt fill, clay.border, clay drop. Radius fixed 20 in every skin; padding 16×14; focus border = `focusRing(accent)` = accent blended with 45% ink (≥ 3.0:1 vs the well) over 120ms; cursor accent 2px; text `input` 18/500; prefix icon 22 in textMuted. No error or disabled visual state exists.

**TopicChip** — pill, padding 16×10, border 2.0; default tint alpha 0.10 with clay.border; selected 0.25 with clay.text border and clayBold drop; loading 0.22 with spinner; disabled opacity 0.55. Selected keeps the topic's own colour via `banded(alphaBlend(tint, surface))`. Label labelMd in clay.text (documented ≥ 7.68:1) — never ink-on-accent.

**ClayBadge** — informational pill 12×4, radius full, accent at alpha 0.10 (outline 0.30 at 1.5px), labelSm. Flat in every skin: informational chips, badges, icon discs and inset panels stay flat; only canvas cards and interactive controls become clay.

**ClayBottomSheet** — clay shell: top radius 28, border 2.0, card shadow, 40×4 handle, max height 0.92 of screen. **showClayDialog** is a transition only (fade + scale 0.92→1.0, 300ms, barrier black54); there is no clay dialog recipe.

**ClaySnackBar** — root-overlay toast, one active at a time, 4s; info teal / success `#7BC6A0` / error `#D98A8A`; inset 12, radius 12, accent border 1.5, 200ms rise of 12px.

**ClayBackButton** — 48 target; classic icon only; band skins add a 36px banded disc; always `Navigator.maybePop` (iOS has no edge-swipe on custom transitions).

**Others** — SelectionCheckCircle (44 hit / 24 visible, teal fill when selected); ProgressDots (24×8 active, 8×8 idle); SwipeDots (20 / 8 / 3); EmptyStateView / ErrorStateView (64px tile at accent 0.16, glyph 32; error uses coral); AppLoadingIndicator (teal, stroke 2.4); ThinkingIndicator (padding 14×10, radius 20, 14px spinner, accent tints only the spinner); ListenButton (accent 0.14 → 0.22 pressed, playing tealDeep); ErrorBanner (error 0.10 fill, radius 12); StaggeredEntrance, MessageEntrance, CelebrationOverlay.

**Adoption (measured, 2026-09).** ClayButton 61 sites vs ClayPressable 124 (110 in features) — most CTAs are bespoke presses; ClayCard 29 sites vs ≈250 hand-rolled `surfaces.raised` gates in features; ClayTextInput 9 vs 11 raw TextFields; showClaySnackBar 91 vs 0 raw; ClayBackButton 22 vs 0 raw; 33 Material *Button sites remain (21 TextButton incl. 2 `.icon`, 10 IconButton, 1 FilledButton, 1 OutlinedButton.icon). No toggle, checkbox, radio, slider, tabs, avatar, list tile or tooltip component exists.

## Spacing

2px base unit; every even step 2→48 is named; half-steps (trailing `d`) are a tuning knob, not baseline.
- xxs 2 · xs 4 · xsd 6 · sm 8 · smd 10 · md 12 · mdd 14 · lg 16 · lgg 18 · xl 20 · xxl 24 · xxxl 28 · huge 32 · massive 40 · giant 48
- Semantic aliases: gutter 16 · cardPadding 16 · cardPaddingCompact 12 · cardPaddingHero 24 · sectionGap 24 · sectionGapTight 16 · sectionTitleGap 8. Two-thirds of the 2026-05 audit inconsistencies traced to their absence.
- Rhythm: 80% of placements should land on xs / sm / md / lg / xl / xxl; reach for a half-step only when the even neighbour looks wrong at that size.
- Component paddings: button 20×14, card 16, chip 16×10, input 16×14, toast 12×10. ClayBottomSheet applies no content padding of its own.

## Border Radius

Rung names mirror AppSpacing so "the radius that matches the padding" needs no lookup — but the values differ on purpose: cardPadding 16 pairs with radius lg 20 for a 16/20 padding-to-radius ratio. AppRadius.lg ≠ AppSpacing.lg is intentional, not drift.
- xxs 2 · xs 4 · xsd 6 · sm 8 · smd 10 · md 12 · mdd 14 · lgs 16 · lg 20 · xl 28 · full 999
- Roles: lg 20 = cards, buttons, dialogs, inputs; xl 28 = hero cards and bottom-sheet tops; md 12 = popup menus, toasts, icon tiles; full = pills, chips, sheet handles.
- Skins own the two large rungs: classic/intaglio radiusLg 20 / radiusMd 12; pebble 28 / 20 (chubbier Lumi floor). ClayTextInput stays at 20 in every skin.
- Rule, unenforced: interactive surfaces use ≥ mdd 14.

## Do's and Don'ts

**Ink and colour**
- DO use dark ink on every accent: `surfaces.inkOn(fill)` with `surfaces.tinted(surfaces.bandFill(fill))`, or `accentInkOr(AppColors.warmDark)` on a known light fill — 5.52–9.89:1.
- DON'T put white on an accent. `AppColors.onAccent` / `Colors.white` measure 1.63:1 (gold) to 2.92:1 (purple); 88 of 103 sites failed before the 2026-09 sweep.
- DON'T pass a theme-flipping fallback (clay.text) as accent ink — classic dark drew cream on pastel at ≈1.8:1. The fallback must be a constant.
- DON'T write `onAccent.withValues(alpha:)`. On band skins that is a DARK veil; it dropped the story hero card to 3.55–3.95:1. Translucent white veils use `AppColors.white.withValues`.
- DON'T put text on purpleDeep, formalTone or goldDark, and DON'T "complete" the accent map by adding purpleDeep — the test asserting its failure is deliberate. Request story gradients with `aaSafe: true`.
- DON'T use textFaint / `#9B9DAB` as a colour for live text (2.32–2.63:1); it is disabled-only. DON'T invent a darker faint — per the spec's arithmetic an AA-solved faint lands 1.002:1 from muted, indistinguishable. Express a third hierarchy step by size and weight in textMuted.
- DON'T set raw accent as body text (min 1.27:1 on light grounds).
- DO measure loading fills in the state they are shown: accent@α over constant cream keeps accent ink (α ≥ 0.6 → ≥ 4.5:1); over a theme surface use theme ink at ≥ 3.0:1.

**Depth and shape**
- DO cast a sharp blur-0 offset drop on controls; DO cast nothing on wells and trays.
- DON'T add blur to a control drop in classic/intaglio. DON'T put any BoxShadow on an ornament — blur darkens the ground under text that has 0.08 headroom.
- DON'T make an ornament darker than its canvas (a source comment records −1.3 contrast and 6 of 8 combos under AA; the lighter-than-canvas rule itself is test-locked).
- DON'T use Material elevation, InkWell ripples or hover glows. Interaction is scale-down + shadow-swap + haptic.
- DON'T leave a gradient stop translucent: blend the tint opaque first (`Color.alphaBlend(tint, clay.surface)`), then `banded()`.
- DO keep selected chips in their classic accent colour with banded/tinted layered on; DON'T sink them into a tray.
- DO keep informational chips, badges, icon discs and inset surfaceAlt panels flat.

**Code**
- DON'T branch on `ClaySkin` or `ClayTopic` in a widget. Gate on tokens: `token == null → legacy path`.
- DON'T hardcode a border width; read AppBorders.
- DON'T "fix" a classic hex — classic is bit-faithful, and its three locked debts (purple 4.42:1, story gradient 1.63:1, purpleDeep CTA 4.22:1) are founder decisions. If one is cleared, update the pinned number and the dartdoc.
- DON'T `copyWith(fontSize | fontWeight)` on a role; pick or add a role.
- DO wrap ornaments in IgnorePointer + ExcludeSemantics.

## Theming Axes (Brightness · Skin · Topic)

Three questions, three orthogonal axes, three ThemeExtensions on every ThemeData:
- **Brightness** — how bright is the room. ClayPalette flips chrome; accents stay.
- **Skin** — what a widget is MADE of: bands, drops, radii, press depth, on-accent ink. ClaySkinSurfaces. Persisted as `aura.set.claySkin`; picker in Settings › App › Skin.
- **Topic** — WHERE we are: ground, ornament vocabulary, later icons. ClayTopicScape. Persisted as `aura.set.clayTopic`; three topics are offered (shape, school, space); unknown values clamp to shape.

Any skin can sit in any topic (pebble-in-space is valid): a topic never touches widget grammar, a skin never touches the ground.

**Skins**
- classic — flat fills (raised/well/tray null), white on-accent ink, decorative border everywhere, no washes, sharp drops, motifLevel 0. Pinned by 18 literal hex tests. Exempt from AA.
- intaglio (default) — the 70/30 Clay×Lumi hybrid (spec count 135 Clay / 46 Lumi / 11 WCAG slots): canvas unchanged, band gradients, ink `#1E202F`, borderControl at ≥ 3.0:1, sharp drops kept, motifLevel 1.
- pebble — the 30/70 inverse: warm deep canvas separating by colour (1.17:1), blurred warm drops, radii 28/20, press 0.96, borders erased with width preserved, bands 18%, motifLevel 2.

**Skin API a widget may use** raised / well / tray · tinted(accent) · banded(fill, darkScale) · inkOn / bandFill / accentInkOr · inkBorderOr · focusRing · borderControl · radiusLg / radiusMd · pressScale · motifLevel · washFor(accent). Recipes: card-on-canvas → raised; accent control → tinted; arbitrary fill (tint card, white pill, notification row) → banded.

Skin and topic transitions snap the whole object at t = 0.5 rather than lerp per field: a half-lerped null gradient flipped every `== null` gate and rendered cards see-through for one frame.

**Topics**
- shape — today's app; every ground field null, bit-identical to no-topic.
- school — paper world in light mode: page `#F2F6FC`, surface `#FFFFFF`, ink `#23293A`, inkMuted `#4F5769` (6.7:1). In dark mode it is the same room with the lights down — `schoolDark` runs at `Brightness.dark` on `#1B1F2A → #222735 → #2A3040` with ink `#EDF1F8`. Stationery ornaments; accentMix 0.18. Only Space forces one brightness in both modes.
- space — indigo sky in BOTH brightnesses (theme forced dark): ground `#141C44 → #212857 → #2A2660`, chrome bg `#1E2454`, surface `#232A58`, border `#3A4180`, ink `#EEF2FF`, muted `#C3CBEC`, faint `#A6ADD6`; after-midnight variant `#0A0F2A → #141A45 → #241F5C`; celestial ornaments; accentMix 0.16 in light, 0.14 in dark. The horizon moved from `#3B3585` to `#2A2660` because its luminance (.088) sat under the ornament ceiling (.095) and flattened every ornament.
- The mode accent is blended into the horizon stop only (0 at the sky top); chat grounds use half the mix.

A topic with a ground recolours the WHOLE app: the palette comes from `scape.paletteFrom(skin palette)` and the skin's surfaces are `rebasedOn(topic surface)` — band gradients bake hue as well as geometry, so handing them over verbatim paints warm-brown cards on an indigo sky. Region-scoped theming was tried and removed. Geometry stays the skin's; colour becomes the topic's (test-locked).

## Motion

**Durations (ms)** fast 150 (state swaps) · medium 200 (chips, check circles) · normal 300 (page transitions, message entrance) · press 80 · inputFocus 120 (faster than fast on purpose) · debounce 600 (also the StaggeredEntrance default) · stagger 800 (auth/onboarding) · score 900 (score sweep + count-up) · celebration 2000 · iconLoop 2400 (idle icon life) · float 2800 (mode-card icon drift 0 → −6px). Orphans with zero consumers: slow 500 (a Future.delayed only), typingWave 1200, pulse 2200, springGentle.

**Curves.** One house curve, easeClay = Curves.easeInOut. Press-in and StaggeredEntrance use easeOut; MessageEntrance uses easeClay. `elasticOut` appears at exactly two reward moments (score circle scale 0.6→1.0 over the first 50%; mind-map node pop capped at 1.08×) — an observed convention, not a declared rule. easeOutBack and bounceOut are absent.

**Spring.** springTap mass 1 / stiffness 400 / damping 15 (ζ ≈ 0.375 derived; documented as ~28% overshoot) — the only spring in the app, on press release. The spec rejected Lumi's 56% overshoot as too bouncy for a study app used in long sessions.

**Page transitions.** fadeTransitionPage for `go()` replacements (4 routes); slideFadeTransitionPage for `push()` (32 routes): fade + slide from 6% of height, 300ms easeClay.

**Entrances.** StaggeredEntrance: child i starts at i × 0.12 (clamped ≤ 0.7), window 0.4, 16px rise. MessageEntrance: 20px rise, 300ms. CelebrationOverlay: 40 confetti particles in the four accents, 4–10px, alpha 0.8, fading over the last 30% of 2000ms; no tiers — all three call sites use defaults.

**Reduce motion** (`MediaQuery.disableAnimations`): page transitions return the bare child; StaggeredEntrance becomes a Column; confetti is removed; icons hold frame 0; press skips the scale and snaps (haptic still fires); Lottie stops and the orb video never initialises. No test covers any motion token.

## Ornament & Icons

**Motifs.** Every mode canvas and hub wears a distinct SHAPE signature, not just a hue: conversation (Scenario, teal — speech bubbles), narrative (Story, purple — layered hills + moon), structure (Grammar, gold — rails tilted −0.28 rad so they never read as a table), resonance (Tone, Insights, Aura chat — gold rings), collection (Vocab, coral — pebble cluster). One renderer draws them all; hubs run at 0.55 alpha. Topic picks the vocabulary (organic / stationery / celestial); mode picks the arrangement.

**Density** = the skin's motifLevel (classic 0 draws nothing, intaglio 1, pebble 2), floored to 1 by a dark-ground topic or a caller's minLevel — classic cannot strip the stars from Space.

**Hard rules, test-locked.** Ornament fills are LIGHTER than the canvas; they cast no drop shadow; intaglio ornaments are engraved (band + 1.0px hairline), pebble ones are raised bands without outline; every ornament tone keeps textMuted ≥ 4.5:1 on the test's stand-in canvas; ornaments keep only half the skin's dark band stop (a source comment records that full strength took pebble textMuted from 4.58:1 to 4.15:1); chat ornaments are under half the size of canvas ones; all sit under IgnorePointer + ExcludeSemantics; school desk objects stay below y = 60. On a dark ground the ornament luminance ceiling is `(L(inkMuted) + 0.05) / 4.5 − 0.05`, derived from the MUTED ink that actually runs over ornaments. The space starfield is a fixed 14-entry table so stars never re-shuffle between frames.

**Icons — two systems plus images.**
- Brand glyphs: 99 CustomPainter ids in a string-keyed registry (12 families: action, nav, mode, learning, status, profile, topic, dailyTime, tone, feature, tier, generation) drawn through `AppIcon` (157 sites; default 20px; animated by default with a 2400ms idle micro-motion — ±0.04 rad tilt, 1.5% breathe; opt out on dense lists). Strokes are fractions of the edge (modal s×0.055), round caps. Naming: bare camelCase core ids, then `feat_*`, `topic_*`, `tone_*`, `time_*`, `generation_*`, `tier*`. Only 42 ids have constants.
- Utility chrome still uses Material Icons: ≈185 `Icons.*` sites, ≈160 of them `*_rounded`.
- Nav bar: five icon-only tabs in ONE row, 60px + 2px top border; side glyphs are 40px Cloudinary webp images, the centre orb a 52px PNG mascot (press 0.9, inactive opacity 0.55), in-line and never floating. Unread badge: coral pill ≥ 16×16 with a surface-colour ring.
- Tier glyphs (outlined star / filled star / crown) are monochrome and static; tier colour comes from TierAccent, never baked.

## Accessibility Contract

**Ruler.** Every lock computes WCAG 2.x contrast from `Color.computeLuminance`: (Lmax + 0.05) / (Lmin + 0.05). Thresholds: text 4.5:1 (14px w800 button labels are NOT large text); UI boundaries and focus 3.0:1. All theme tests gate CI. No golden tests; no `meetsGuideline`.

**Locked for intaglio and pebble, both brightnesses**
- onAccent ≥ 4.5:1 on teal, gold, coral, purple, success, error; purpleDeep asserted to FAIL so nobody "completes" the map.
- `inkOn(fill)` pinned to `#1E202F` and ≥ 4.5:1 on `bandFill(fill)` for 9 fills; never worse than the previous ink on any fill (tolerance 0.005).
- textMuted ≥ 4.5:1 on background, surface, surfaceAlt (classic exempt).
- focusRing ≥ 3.0:1 vs the well mid-stop for teal, purple, gold, coral.
- Space topic: ink and inkMuted ≥ 4.5:1, inkFaint ≥ 3.0:1 on every ground stop; four accents ≥ 4.5:1 on the space surface; horizon > 0.025 below the ornament ceiling.
- Motifs: lighter than canvas, no shadow, textMuted ≥ 4.5:1 on every tone.
- Source guards: `surfaces.onAccent` outside core/theme only in two allow-listed story files; `onAccent.withValues(` forbidden; bare border widths forbidden.
- Band grammar: raised top brighter than bottom; well and tray inverted.
- Classic fidelity: 18 palette hexes, null gradients, white ink, (3,3) drop.

**Classic debts pinned so they can neither rot nor be silently patched** — warmDark on purple 4.42:1 (±0.01); white on story gradients worst 1.63:1 (±0.02); white on purpleDeep CTAs 4.22:1. Founder decides.

**Measured absences**
- No keyboard focus ring on any pressable (0 focus vs 124 pressable sites); the spec's two-tone ring (`#14162A` 3px / `#FFFDF7` 2px, self-contrast 17.53:1) is unimplemented.
- Min tap target 44 is sized explicitly at only a handful of shared-widget sites; there is no touch-target token.
- textFaint is unguarded and still used at ~65 live sites at 2.32–2.63:1; the textDisabled rename has not landed.
- `AppColors.onAccent` (#FFFFFF) survives at 43 painter sites (40 as glyph veils) outside the guard regex.
- The accent-as-text tint ramp (154/154 solved pairs per the spec's own arithmetic) is unimplemented; the pattern fails at 1.27–3.49:1 wherever used.
- borderControl is consumed at 3 sites; ~30–40 of 180 `clay.border` sites are real controls still on the 1.29:1 decorative hex.
- The streak heatmap uses teal at alpha 0.35 / 0.6 / 0.8, unmeasured; the spec's SC 1.4.11 ramp `#39978D → #2E7971 → #245E58 → #1A443F` is not in code.
- Painters baking warmDark render 1.00:1 on the dark surface; no guard.
- Classic fails AA broadly (textMuted 4.42, border 1.25, white on accents 1.63–2.92) — a fidelity snapshot, not a target.
