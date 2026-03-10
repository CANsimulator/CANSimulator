---
name: Cyber UI Implementation
description: detailed guidelines for implementing the project's specific Cyber/Sci-Fi aesthetic using Tailwind and Framer Motion.
---

# Cyber UI Implementation Skill

The "Cyber" aesthetic is core to the project identity. It combines futuristic visuals with high usability.

## Design System Tokens

### Colors (Tailwind Config)
- **Primary**: `cyan-500` (Main actions, active states) -> Neon `#00f3ff`
- **Secondary**: `purple-600` (Extended sessions, deep logic) -> Neon `#bf00ff`
- **Error**: `pink-600` (Negative responses) -> Neon `#ff006e`
- **Success**: `emerald-400` (Positive responses) -> Neon `#00ff9f`
- **Warning**: `yellow-400` (Pending, attention) -> Neon `#ffea00`

### Visual Effects
1.  **Glassmorphism**:
    -   `bg-slate-900/80 backdrop-blur-md border border-slate-700/50`
    -   *DISABLE* in High Contrast Mode.
2.  **Neon Glow**:
    -   `shadow-[0_0_15px_rgba(0,243,255,0.3)]`
    -   Use sparingly to highlight active elements.
3.  **Scanlines/Grid**:
    -   Use `BackgroundEffect.tsx` for the global context. Do not reimplement manually.

## Motion Guidelines (Framer Motion)
Use `framer-motion` for all UI transitions.

### Standard Transitions
```tsx
const variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
};
```

### Packet Flow Animation
- Packets should travel linearly.
- Use `layoutId` for shared element transitions between lists.
- **Reduced Motion**: Verify `useReducedMotion()` hook is checked before playing complex animations.

## Component Checklist
1.  **Immersive**: Does it feel futuristic? (Fonts, borders, glows)
2.  **Responsive**: Works on Mobile? (Stack flex containers).
3.  **Interactive**: Hover states for EVERYTHING interactive.
    -   `hover:bg-slate-800`
    -   `active:scale-95`
4.  **Clean**: No cluttered borders. Use whitespace (padding) and subtle separation.

## Typography
- Use `font-mono` for all Hex data, ID codes, and timing metrics.
- Use `font-sans` (Inter) for labels and descriptions.
- Headlines should use gradients: `bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent`.

## Theme Implementation (Dark/Light)

### Core Strategy
The project uses Tailwind's `class` strategy for dark mode, managed by `ThemeContext`.

- **Dark Mode**: Default. `html` tag has `class="dark"` and `data-theme="dark"`.
- **Light Mode**: Optional. `html` tag removes `.dark` and sets `data-theme="light"`.
- **Persistence**: `localStorage` key `uds_theme`.

### Styling Rules
1.  **Default to Dark**: Write styles for dark mode as the base (e.g., `text-white bg-slate-900`).
2.  **Light Overrides**: Use `dark:` prefix for specific dark mode adjustments if base styles are light, OR typically in this project, **invert this thinking**:
    -   Base styles = Light mode (if following standard Tailwind), but effectively we often style for "Cyber" first.
    -   **Standard Pattern**: `bg-white dark:bg-slate-900 text-slate-900 dark:text-white`.
3.  **Colors**:
    -   Dark: `bg-slate-950` with Neon accents.
    -   Light: `bg-slate-50` with darker, high-contrast accents (e.g., `cyan-700` instead of `cyan-400`).

### Code Example
```tsx
// Component supporting both modes
<div className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
  <h1 className="text-slate-900 dark:text-white">Title</h1>
</div>
```
