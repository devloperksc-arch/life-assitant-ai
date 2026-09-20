---
name: Neural Workspace
colors:
  surface: '#111319'
  surface-dim: '#111319'
  surface-bright: '#373940'
  surface-container-lowest: '#0c0e14'
  surface-container-low: '#191b22'
  surface-container: '#1d1f26'
  surface-container-high: '#282a31'
  surface-container-highest: '#33343c'
  on-surface: '#e2e2eb'
  on-surface-variant: '#bbc9cf'
  inverse-surface: '#e2e2eb'
  inverse-on-surface: '#2e3037'
  outline: '#859398'
  outline-variant: '#3c494e'
  surface-tint: '#3cd7ff'
  primary: '#a8e8ff'
  on-primary: '#003642'
  primary-container: '#00d4ff'
  on-primary-container: '#00586b'
  inverse-primary: '#00677e'
  secondary: '#d0bcff'
  on-secondary: '#3c0091'
  secondary-container: '#571bc1'
  on-secondary-container: '#c4abff'
  tertiary: '#6af7ba'
  on-tertiary: '#003824'
  tertiary-container: '#49da9f'
  on-tertiary-container: '#005c3e'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#b4ebff'
  primary-fixed-dim: '#3cd7ff'
  on-primary-fixed: '#001f27'
  on-primary-fixed-variant: '#004e5f'
  secondary-fixed: '#e9ddff'
  secondary-fixed-dim: '#d0bcff'
  on-secondary-fixed: '#23005c'
  on-secondary-fixed-variant: '#5516be'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#111319'
  on-background: '#e2e2eb'
  surface-variant: '#33343c'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: '600'
    lineHeight: 48px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '600'
    lineHeight: 38px
    letterSpacing: -0.015em
  headline-lg:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '500'
    lineHeight: 36px
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '500'
    lineHeight: 30px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 28px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
    letterSpacing: 0em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-lg:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0.02em
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.04em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '400'
    lineHeight: 14px
    letterSpacing: 0.06em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 0.75rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style
The design system embodies a hyper-minimalist, neural intelligence workspace engineered for deep focus, algorithmic curation, and high-density cognitive tasks. Designed for technical founders, machine learning researchers, and software engineers, it channels quiet authority and optical precision. 

The aesthetic is a fusion of modern technical minimalism and atmospheric glassmorphism. It rejects visual clutter, garish drop shadows, and ornamental chrome. Instead, the interface relies on vast negative space, pure obsidian depth, razor-sharp monospaced telemetry, and subtle luminous accents that indicate state transitions without breaking cognitive immersion.

## Colors
The palette is rooted in an unyielding void—an obsidian black `#080a10` canvas paired with structural translucent slate glass surfaces `#0f1322`. The hierarchy of light ensures visual priority:

- **Primary (`#00d4ff` - Luminous Cyan):** Used strictly for active execution states, primary actions, input focus indicators, and focal neural nodes.
- **Secondary (`#8b5cf6` - Soft Violet):** Dedicated to neural network pathways, contextual metadata, multi-model switches, and supplementary structural graphs.
- **Tertiary (`#10b981` - Crisp Emerald):** Denotes healthy cluster runtimes, successful model inference, telemetry accuracy, and safe operations.
- **Warning / Alert (`#f59e0b` - Calm Amber):** Reserved for system latency, threshold limits, token exhaustion warnings, and non-blocking degradation.
- **Neutral Core (`#080a10` & `#0f1322`):** Defines foundation layers, canvas depth, and frosted surfaces. Borders rely on an invariant `rgba(255, 255, 255, 0.06)` outline, preventing harsh contrast while sustaining edge definition.

## Typography
Typography is split purposefully between structural communication (`Inter`) and telemetry/code interaction (`JetBrains Mono`). 

- **Inter** provides neutral, crisp, high-legibility typographic scale across variable interface scales. Headline levels apply negative letter-spacing to reinforce architectural density, while body copy preserves balanced line-heights to support uninterrupted scanning.
- **JetBrains Mono** handles all quantitative data, model token counters, parameters, runtime indicators, and command prompts. It is formatted with expanded letter-spacing (`0.02em` to `0.06em`) to maintain legibility in low-contrast telemetry labels.

## Layout & Spacing
The layout adheres to a flexible asymmetrical 12-column grid anchored by a single unified, persistent sidebar (260px wide on desktop; collapsible to a 64px icon rail). There are no secondary horizontal topbars or stacked navigation tiers; breadcrumbs and global actions live directly within the canvas workspace header.

### Responsive Behaviors
- **Desktop (>= 1280px):** 12 columns, 24px gutters, 32px workspace margins. The primary sidebar remains static.
- **Tablet (768px - 1279px):** 8 columns, 16px gutters, 24px workspace margins. The sidebar collapses into an icon rail with flyout panels.
- **Mobile (< 768px):** 4 columns, 12px gutters, 16px workspace margins. The sidebar tucks off-canvas into a full-height slide-out sheet. Multi-column metric cards stack into single-column vertical flows.

## Elevation & Depth
Depth is produced via subtle translucent tiering and microscopic hairline borders rather than heavy drop shadows:

1. **Canvas Level (Ground):** Pure `#080a10`. Zero elevation.
2. **Panels & Rail Surfaces:** Translucent slate `#0f1322` at 85% opacity with an active `backdrop-filter: blur(16px)`. Framed strictly with a 1px uniform border of `rgba(255, 255, 255, 0.06)`.
3. **Floating Overlays & Menus:** Slate `#13182b` at 95% opacity with a soft luminous shadow: `0 12px 32px -8px rgba(0, 0, 0, 0.7)`.
4. **Active Glows:** Interactive and focused states introduce a restrained ambient radiance: `box-shadow: 0 0 16px -2px rgba(0, 212, 255, 0.15)`. Diffuse luminescence highlights data without generating ocular fatigue.

## Shapes
Geometry is precise and utilitarian. The design system uses roundedness level `1` (soft, restrained corners). Base interactive elements (buttons, inputs, status badges) carry a `0.25rem` (4px) border radius. Larger structural containers and modal panes employ `rounded-lg` (`0.5rem` / 8px), and primary application viewports feature `rounded-xl` (`0.75rem` / 12px). Pill radii are strictly prohibited except for micro status-dot indicators.

## Components

### Buttons
- **Primary:** Solid `#00d4ff` background, `#080a10` text, `JetBrains Mono` medium typography, `0.25rem` radius. Subtle ambient cyan glow on hover (`0 0 12px rgba(0, 212, 255, 0.25)`).
- **Secondary:** Frosted `#0f1322` fill, 1px `rgba(255, 255, 255, 0.06)` border, `#ffffff` text. Hover shifts background to `rgba(255, 255, 255, 0.04)` and border to `rgba(255, 255, 255, 0.12)`.
- **Ghost / Minimal:** Transparent background, muted text `#94a3b8`. Hover transitions text to `#00d4ff` with zero layout displacement.

### Input Fields & Search Bars
- Background: `rgba(15, 19, 34, 0.6)` with a 1px `rgba(255, 255, 255, 0.06)` boundary.
- Typography: `Inter` for typed text; placeholder text in muted slate (`#475569`).
- Focus state: Border transitions to `#00d4ff` accompanied by a localized `box-shadow: 0 0 0 1px #00d4ff, 0 0 12px rgba(0, 212, 255, 0.15)`.

### Cards & Data Containers
- Grounded on frosted `#0f1322` surfaces with `0.5rem` (`rounded-lg`) corner radii and a 1px border (`rgba(255, 255, 255, 0.06)`).
- Padding: Internal layout spacing governed by `space-lg` (24px) for dashboard modules and `space-md` (16px) for compact telemetry feeds.

### Sidebar Navigation
- Single monolithic structural container anchored to the viewport left.
- Contains workspace switchers, hierarchical node trees, model parameters, and runtime indicators.
- Item state: Inactive items render `#64748b` text; active item is marked with a 2px left border accent in `#00d4ff`, a subtle `#00d4ff10` surface wash, and crisp `#ffffff` text.

### Badges, Tags & Chips
- Compact dimensions using `label-sm` or `label-md` (`JetBrains Mono`).
- Visual style: Monochromatic translucent tint (`rgba(255, 255, 255, 0.03)`) with a 1px border colored according to state (e.g., `#10b98126` for operational, `#f59e0b26` for throttled). Includes a static 4px luminous status dot.

### Checkboxes & Radios
- Size: 14px x 14px boxes with a 2px radius.
- Inactive: Background transparent with a 1px `rgba(255, 255, 255, 0.15)` border.
- Selected: Background `#00d4ff`, border `#00d4ff`, containing an obsidian checkmark (`#080a10`).