# Saiyuen Alpha UX Audit

## Goal

This document turns the current UX review into a practical deliverable for product, design, and implementation planning.

The app already has a strong concept:

- live camera background
- interactive 3D bridge model
- AI guide chat
- AI bridge design exploration

The main UX opportunity is not adding more capability. It is making the existing capability easier to understand, trust, and use, especially on mobile.

## Executive Summary

The product feels visually compelling but interaction-heavy. Users are expected to infer the app's main actions from floating controls, transient hints, and panel behavior. That creates friction in the first 30 seconds, which is the most important moment for this experience.

The most important improvements are:

1. clarify the first-time user journey
2. simplify the mobile panel system
3. improve trust with better error and permission states
4. fix localization and content quality issues
5. make the designer flow more decision-oriented

## Priority Backlog

### P0: First-Time Flow And Discoverability

**Problem**

The app opens directly into the camera + 3D scene with three separate floating entry points. The only onboarding is a temporary hint that disappears quickly.

**Why it matters**

New users may not understand:

- what the main thing to do is
- whether this is an AR viewer, a museum guide, or a design tool
- that the bridge parts are tappable
- why there are three floating actions

**Current code references**

- [src/Model.jsx](/Users/cardb/Documents/iokan/drills/chim-test-improvements/saiyuen-alpha-improvements/src/Model.jsx#L163)
- [src/Model.jsx](/Users/cardb/Documents/iokan/drills/chim-test-improvements/saiyuen-alpha-improvements/src/Model.jsx#L202)
- [src/components/AgentChat.jsx](/Users/cardb/Documents/iokan/drills/chim-test-improvements/saiyuen-alpha-improvements/src/components/AgentChat.jsx#L213)

**Recommendation**

Replace the transient hint with a persistent first-run launcher or intro card:

- Explore the bridge
- Ask the guide
- Imagine a redesign

This can dismiss after first use and remain accessible from an info/help affordance.

**Implementation direction**

- Add a first-run boolean in store or local storage
- Show a lightweight onboarding sheet over the scene
- Keep one sentence per mode with a single CTA each
- Include a clear hint that bridge parts are tappable

**Success metric**

- more users triggering chat, info, or designer within the first session
- fewer “dead start” sessions with no interaction

### P0: Mobile Panel Consolidation

**Problem**

The info panel, guide panel, and designer panel are separate bottom-sheet style surfaces. On mobile they compete for the same space and move the FABs around.

**Why it matters**

This creates a feeling of state juggling instead of exploration. Users have to understand panel logic before they can focus on content.

**Current code references**

- [src/Model.jsx](/Users/cardb/Documents/iokan/drills/chim-test-improvements/saiyuen-alpha-improvements/src/Model.jsx#L280)
- [src/components/AgentChat.jsx](/Users/cardb/Documents/iokan/drills/chim-test-improvements/saiyuen-alpha-improvements/src/components/AgentChat.jsx#L244)
- [src/components/BridgeDesignerPanel.jsx](/Users/cardb/Documents/iokan/drills/chim-test-improvements/saiyuen-alpha-improvements/src/components/BridgeDesignerPanel.jsx#L323)

**Recommendation**

Unify these into one mobile bottom sheet with internal tabs or segmented navigation:

- Info
- Guide
- Design

On desktop, separate floating panels can remain if desired.

**Implementation direction**

- Introduce a single `activePanel` state on mobile instead of 3 booleans
- Move shared shell styling into one panel container
- Keep panel switching inside that shell
- Preserve cross-tool context when switching tabs

**Success metric**

- fewer panel-open/close actions per task
- better completion of multi-step flows like “ask guide, then design”

### P0: Trust Through Better Error States

**Problem**

Several failure modes are either silent or misleading:

- camera permission failure falls through quietly
- clipboard share shows success even when copy fails
- designer generation failures stop without user-facing recovery
- AR capture can fail without explanation

**Why it matters**

This is a camera-and-AI product. Users need confidence that the system is working as intended.

**Current code references**

- [src/Model.jsx](/Users/cardb/Documents/iokan/drills/chim-test-improvements/saiyuen-alpha-improvements/src/Model.jsx#L106)
- [src/Model.jsx](/Users/cardb/Documents/iokan/drills/chim-test-improvements/saiyuen-alpha-improvements/src/Model.jsx#L129)
- [src/components/BridgeDesignerPanel.jsx](/Users/cardb/Documents/iokan/drills/chim-test-improvements/saiyuen-alpha-improvements/src/components/BridgeDesignerPanel.jsx#L214)
- [src/components/BridgeDesignerPanel.jsx](/Users/cardb/Documents/iokan/drills/chim-test-improvements/saiyuen-alpha-improvements/src/components/BridgeDesignerPanel.jsx#L221)

**Recommendation**

Add explicit, user-readable states for:

- camera unavailable
- API unavailable
- generation failed
- screenshot/capture unavailable
- share failed

Each state should include a clear next action.

**Implementation direction**

- standardize error toasts/snackbars
- differentiate success and failure copy
- add retry CTAs for generation and chat
- show fallback messaging when the camera is unavailable

**Success metric**

- fewer ambiguous failure moments
- higher recovery from failed actions

### P0: Localization And Content Quality Fixes

**Problem**

The UI currently shows mojibake and inconsistent language handling in multiple places.

**Why it matters**

Broken text immediately lowers perceived product quality and trust.

**Current code references**

- [src/Model.jsx](/Users/cardb/Documents/iokan/drills/chim-test-improvements/saiyuen-alpha-improvements/src/Model.jsx#L181)
- [src/Model.jsx](/Users/cardb/Documents/iokan/drills/chim-test-improvements/saiyuen-alpha-improvements/src/Model.jsx#L189)
- [src/components/AgentChat.jsx](/Users/cardb/Documents/iokan/drills/chim-test-improvements/saiyuen-alpha-improvements/src/components/AgentChat.jsx#L320)
- [src/components/BridgeDesignerPanel.jsx](/Users/cardb/Documents/iokan/drills/chim-test-improvements/saiyuen-alpha-improvements/src/components/BridgeDesignerPanel.jsx#L357)

**Recommendation**

Treat localization as a product-quality fix, not a cosmetic cleanup.

**Implementation direction**

- move all user-facing strings into a translation map
- store English and Traditional Chinese content in UTF-8 cleanly
- avoid mixing translated and untranslated labels in the same view
- review all chips, hints, and status messages for tone consistency

**Success metric**

- no visible encoding issues
- full language consistency per selected locale

## P1 Improvements

### P1: Improve Information Architecture

**Problem**

Some labels are technically accurate but not user-friendly, especially in the info carousel and model controls.

**Examples**

- `visualization01`
- `visualization02`
- `instructions`
- `Base`
- `Structure`

**Current code references**

- [src/Model.jsx](/Users/cardb/Documents/iokan/drills/chim-test-improvements/saiyuen-alpha-improvements/src/Model.jsx#L57)
- [src/Model.jsx](/Users/cardb/Documents/iokan/drills/chim-test-improvements/saiyuen-alpha-improvements/src/Model.jsx#L357)

**Recommendation**

Rename around user understanding:

- Front render
- Alternate render
- How to explore
- Foundation arch
- Deck and railings

**Implementation direction**

- update display labels only first
- follow with content rewrite if needed

### P1: Make 3D Interaction More Self-Teaching

**Problem**

The scene is tappable, but the tappable affordance is weak and limited to two broad model groups.

**Current code references**

- [src/Scene.jsx](/Users/cardb/Documents/iokan/drills/chim-test-improvements/saiyuen-alpha-improvements/src/Scene.jsx#L172)
- [src/components/AgentChat.jsx](/Users/cardb/Documents/iokan/drills/chim-test-improvements/saiyuen-alpha-improvements/src/components/AgentChat.jsx#L113)

**Recommendation**

Add progressive interaction cues:

- subtle hotspot pulse on first visit
- temporary labels like “Tap foundation” and “Tap upper deck”
- guided first interaction that highlights a part before asking the user to tap it

**Implementation direction**

- start with lightweight UI overlays before attempting finer-grained mesh segmentation
- keep the current two-part model interaction if deeper model metadata is unavailable

### P1: Make The Designer More Decision-Oriented

**Problem**

The design flow is good for browsing but weak for decision-making after generation.

**Current code references**

- [src/components/BridgeDesignerPanel.jsx](/Users/cardb/Documents/iokan/drills/chim-test-improvements/saiyuen-alpha-improvements/src/components/BridgeDesignerPanel.jsx#L467)
- [src/components/BridgeDesignerPanel.jsx](/Users/cardb/Documents/iokan/drills/chim-test-improvements/saiyuen-alpha-improvements/src/components/BridgeDesignerPanel.jsx#L546)
- [src/components/BridgeDesignerPanel.jsx](/Users/cardb/Documents/iokan/drills/chim-test-improvements/saiyuen-alpha-improvements/src/components/BridgeDesignerPanel.jsx#L592)

**Recommendation**

After generation, offer clearer next steps:

- Compare
- Apply overlay
- Save snapshot
- Explain this design
- Regenerate similar

**Implementation direction**

- add a small action row to selected cards
- show a one-line summary of selected design style + lighting
- consider favorite/pin behavior for history

## P2 Improvements

### P2: Better Empty States And Contextual Guidance

The chat empty state is useful, but the overall system could do more contextual guidance:

- if camera is off, suggest using info mode
- if a part is tapped, suggest one follow-up question
- if a design is selected, suggest “Ask why this design fits the landscape”

### P2: Accessibility Hardening

The app relies heavily on icon-only controls, opacity, and floating overlays. It would benefit from:

- stronger visible labels for icon-only actions
- keyboard and screen-reader review
- contrast review for low-opacity text
- larger mobile targets for slider and icon controls

## Suggested Delivery Sequence

### Phase 1: Stabilize Perception

- fix localization and encoding issues
- fix misleading success/error states
- improve labels and copy

### Phase 2: Simplify Core Flow

- create first-run onboarding launcher
- consolidate mobile panels
- improve tappable-part discoverability

### Phase 3: Deepen Value

- improve designer comparison workflow
- add richer contextual prompts and cross-mode handoffs

## Recommended Next Sprint

If this were the next implementation sprint, I would choose these 5 items:

1. fix all broken localized strings and centralize UI copy
2. replace silent failures with explicit success/error states
3. add a first-run onboarding card with three primary paths
4. simplify mobile panel state into one active mobile sheet
5. rename unclear labels in the info and model controls

## Notes For Product Review

This project does not appear to have a capability problem. It has a packaging problem.

The 3D exploration, AI guide, and design generator already form a compelling experience. The next UX gains will come from making the experience feel more legible, more stable, and more trustworthy at first contact.
