---
name: Architectural Minimalist
colors:
  background: '#fbfbfb'
  on-background: '#000000'
  muted: '#71717a'
  outline: '#000000'
  outline-variant: '#d4d4d8'
  inverse-surface: '#18181b'
  inverse-on-surface: '#fafafa'
typography:
  display:
    fontFamily: Inter
    fontSize: 160px
    fontWeight: '800'
    lineHeight: 95%
    letterSpacing: -0.05em
    textTransform: uppercase
  heading:
    fontFamily: Inter
    fontSize: 56px
    fontWeight: '700'
    lineHeight: 100%
    letterSpacing: -0.03em
    textTransform: uppercase
  body:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 180%
    letterSpacing: '0'
  label:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 100%
    letterSpacing: 0.1em
    textTransform: uppercase
spacing:
  margin-page: 4rem
  stack-xl: 8rem
  stack-lg: 4rem
  stack-sm: 1rem
---

## Style

Brutalist minimalism. The title dominates — nothing competes with it. Structure comes from typographic scale and 1px rules alone. No decoration.

## Colors

Off-white canvas (`#fbfbfb`), black for all content, zinc (`#71717a`) only for secondary metadata. No accent color.

## Typography

Extreme scale contrast is the design. `display` at 160px fills the viewport — it is a landscape, not a label. `label` at 11px with wide tracking acts as a field marker. Body sits quietly between. All headings uppercase.

## Layout

Sections divided by 1px horizontal rules. Data in two-column alignment, no borders. Lists prefixed with ↗. Footer uses a large low-opacity watermark ID (`AB_01`) in zinc, then minimal legal text below.

## Rules

- Flat. No shadows, gradients, or rounded corners.
- Images are gallery pieces: no card chrome, 1px border only when background bleeds into page.
- Buttons invert black/white on interaction. No color transitions.
- Navigation is text-only, `label` style, flush left.
