---
name: Accessibility (WCAG AAA) Audit
description: Instructions for ensuring and verifying WCAG 2.1 AAA compliance in the UI.
---

# Accessibility Audit Skill

The UDS Simulator targets **WCAG 2.1 AAA** compliance. This strictly limits color choices and requires robust keyboard navigation.

## Critical Checkpoints

### 1. Contrast Ratios (AAA)
- **Normal Text**: 7:1 minimum contrast against background.
- **Large Text (18pt+ or 14pt bold)**: 4.5:1 minimum.
- **UI Components (Borders, Icons)**: 3:1 minimum.

**Tools**: Use `test:theme:diff` to verify high contrast mode rendering.

### 2. High Contrast Mode
The application supports a dedicated High Contrast Mode.
- **No Transparencies**: Disable glassmorphism (`backdrop-blur`).
- **Thick Borders**: Ensure borders are at least 2px wide.
- **Solid Backgrounds**: Use pure blacks/whites/neons, no subtle gradients for essential states.

### 3. Keyboard Navigation
- **Focus Indicators**: MUST be visible (2px+ solid ring) with high contrast.
- **Tab Order**: Logical flow (Left -> Right, Top -> Bottom).
- **Shortcuts**: Ensure `Esc` closes modals, `Ctrl+K` opens search.

### 4. Screen Readers (ARIA)
- **Interactive Elements**: Buttons must have `aria-label` or visible text.
- **Status Updates**: Use `aria-live="polite"` for toast notifications and log updates.
- **State**: Toggle buttons must use `aria-pressed` or `aria-expanded`.

## Verification Workflow

1.  **Automated Scan**: Run `npm run test:theme` to check for basic violations.
2.  **Manual Keyboard Walkthrough**:
    -   Disconnect mouse.
    -   Tab through EVERY interactive element.
    -   Verify focus visibility.
    -   Activate all controls with `Enter`/`Space`.
3.  **High Contrast Toggle**:
    -   Switch to High Contrast Mode.
    -   Verify all text is legible (7:1+).
    -   Ensure no essential information is lost (like color-coded status requiring text fallback).

## Code Patterns

### Accessible Button
```tsx
<button
  className="focus:ring-4 focus:ring-accent-cyan focus:outline-none ..."
  aria-label="Start Diagnostic Session"
  aria-pressed={isActive}
  onClick={handleClick}
>
  <Icon className="..." aria-hidden="true" />
  <span className="sr-only">Start Session</span> {/* If icon-only */}
</button>
```
