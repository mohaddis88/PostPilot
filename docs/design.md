# design.md — PostPilot (Task 1)

Internal company tool. Calm, professional, easy on the eye. Neutral base, one accent that changes with the active publishing profile.

## 1. Principles
- Neutral base (white / silver / gray / black). Accent is used sparingly: cards, buttons, glow, some titles.
- Token-driven: no hardcoded hex, px or font values in components.
- The active profile is always visible (top bar switcher) and changes the accent everywhere.
- Accessible by default: visible focus, AA contrast for text, reduced-motion respected.
- Consistency over novelty. Follow Nielsen heuristics (status visibility, error recovery, confirmation for high-impact actions).

## 2. Color tokens

### Neutrals
| Token | Light | Dark |
|---|---|---|
| `--bg` | `#FFFFFF` | `#0B0C0E` |
| `--surface` | `#F4F5F7` | `#15171A` |
| `--border` | `#D9DCE1` | `#2A2D33` |
| `--text` | `#0A0A0A` | `#F5F6F7` |
| `--text-muted` | `#6B7280` | `#9AA0A9` |

### Profile accents (set via `data-profile` on `<html>`)
| Token | Company (Ontilus) | Model (Aria Tan) |
|---|---|---|
| `--accent` (fills, glow, hover) | `#7CC4F5` | `#D4B5A0` |
| `--accent-text` light mode (titles, links) | `#1F78B4` | `#8F624A` |
| `--accent-text` dark mode | `#8FD0FA` | `#E0C4B0` |

Contrast note: `--accent` is too pale for body text on white. Use `--accent-text` for any text. Never use `--accent` for text under 24px.

### Platform markers (small chips, chart series, calendar dots only)
LinkedIn `#0A66C2`, Facebook `#1877F2`, Instagram `#E1306C`, TikTok `#FE2C55`.

### Semantic (status only, never for decoration)
| Meaning | Token | Value |
|---|---|---|
| Success | `--ok` | `#2E9E6B` |
| Warning / pending | `--warn` | `#D99A1E` |
| Error / destructive | `--danger` | `#D64545` |
| Info (draft badge) | `--info` | `#3B82F6` |

## 3. Theme wiring
```css
:root { --bg:#FFFFFF; --surface:#F4F5F7; --border:#D9DCE1; --text:#0A0A0A; --text-muted:#6B7280; }
:root[data-theme="dark"] { --bg:#0B0C0E; --surface:#15171A; --border:#2A2D33; --text:#F5F6F7; --text-muted:#9AA0A9; }

:root[data-profile="company"] { --accent:#7CC4F5; --accent-text:#1F78B4; }
:root[data-profile="model"]   { --accent:#D4B5A0; --accent-text:#8F624A; }
:root[data-theme="dark"][data-profile="company"] { --accent-text:#8FD0FA; }
:root[data-theme="dark"][data-profile="model"]   { --accent-text:#E0C4B0; }
```
Profile mapping: `company` = Ontilus, `model` = Aria Tan (DB slugs `ontilus`, `aria_tan`). Accent transitions over 300ms.

## 4. Typography
Font: **Plus Jakarta Sans**, fallback `system-ui, Arial, sans-serif`. Weights 400 / 600 / 700 / 800.

| Token | Size | Use |
|---|---|---|
| `text-xs` | 12px | captions, metadata |
| `text-sm` | 14px | labels, table text |
| `text-base` | 16px | body |
| `text-lg` | 20px | card titles (may use `--accent-text`) |
| `text-xl` | 28px | page titles (may use `--accent-text`) |
| `text-2xl` | 40px | login / empty-state hero only |

Sentence case. No ALL CAPS body text.

## 5. Spacing, shape, elevation
- Spacing base 4px: `4, 8, 12, 16, 24, 32, 48, 64`.
- Radius: cards `20px`, inputs `12px`, buttons and pills `999px`. Do not mix other values.
- Shadow: `0 12px 45px rgba(0,0,0,0.12)` (light), `0 12px 45px rgba(0,0,0,0.5)` (dark).

## 6. Glass card
```css
.glass {
  background: rgba(255,255,255,0.60);
  backdrop-filter: blur(16px) saturate(120%);
  border: 1px solid color-mix(in srgb, var(--accent) 35%, var(--border));
  border-radius: 20px;
  box-shadow: var(--shadow);
}
:root[data-theme="dark"] .glass { background: rgba(255,255,255,0.05); }
```
Fallback when `backdrop-filter` is unsupported: solid `--surface`. Text on glass must still meet 4.5:1.

## 7. Cursor glow
- One fixed, full-viewport layer behind content (`pointer-events: none`, `z-index: 0`).
- Radial gradient ~500px, `--accent` at ~15% opacity to transparent.
- Follows the cursor with easing (lerp ~0.12). Updates via `requestAnimationFrame`, sets CSS vars `--mx` / `--my`.
- Disabled under `prefers-reduced-motion: reduce` and on touch devices (static glow at top instead).
- Colour switches with profile automatically because it reads `--accent`.

## 8. Buttons
| Variant | Style |
|---|---|
| Primary | `--accent` fill, `--text`-on-accent (check 4.5:1), pill |
| Secondary | transparent, 1px `--border`, hover fills `--surface` |
| Destructive | `--danger` outline; fill only inside confirm modal |

Hover: lift 1–2px, accent glow (`0 0 24px` at ~35% accent), 200ms ease. Focus-visible: 2px ring in `--accent-text` with 2px offset (3:1 minimum). Disabled: 45% opacity, `not-allowed`, no hover effect. Loading: spinner replaces label, width unchanged. Primary actions sit top-right and bottom-right of views.

## 9. Layout
- Top bar: menu button, company logo + "PostPilot", **profile switcher (Company | Model)** as a fixed-size segmented pill (no width, weight or position change on switch), theme toggle, user menu. Labels stay generic because more models will be added.
- Left nav: 64px icon rail by default; the menu button opens the full 240px nav as an overlay (no content shift). Items: Dashboard, Create, Drafts, Schedule, Status log, Accounts, Statistics, Insights, Clawed, System status. Badges: red = failed count, blue (`--info: #3B82F6`) = draft count, per profile.
- Fixed viewport app: side nav never moves, only the content area scrolls (`scrollbar-gutter: stable`). Content max width 1280px. Mobile: nav collapses to a drawer.
- Dashboard opens with one profile card: image, name, one-line description.
- Overlays (menus, popovers, tooltips, modals) are opaque `--surface`, never glass.
- Scrollbars are thin, transparent track, thumb from `--text` at ~22%, accent on hover.
- Density: no intro text, max 5 list items with "View all", explanations in tooltips.
- Switching profile re-themes instantly and reloads data scoped to that profile. Never show mixed-profile data.

## 10. Status pills
Draft (gray), Scheduled (accent), Publishing (accent, animated), Published (ok), Failed (danger), Unknown / needs reconciliation (warn with icon), Reauth required (danger). Always icon + text, never color alone.

## 11. Component state checklist
Every component defines: default, hover, focus-visible, active, disabled, loading, error, empty.

## 12. Do / Don't
**Do:** use tokens by name; keep accent to cards, buttons, glow, some titles; test both themes and both profiles (4 combinations).
**Don't:** introduce colors outside this file; use accent as body text; use aggressive shake or flashing on errors; nest interactive elements; rely on color alone for status.

## 13. QA checklist
- [ ] 4 combinations checked (light/dark x company/model)
- [ ] No hardcoded colors, radii or spacing
- [ ] Keyboard-only walkthrough works
- [ ] Contrast AA for all text
- [ ] Reduced motion disables glow tracking and hover lift
- [ ] 375px and 1440px widths, no horizontal overflow
