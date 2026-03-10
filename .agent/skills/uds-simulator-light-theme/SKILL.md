---
name: UDS Simulator Light Theme Recreation
description: Comprehensive guide and technical spec for recreating the UDS Simulator's "Professional Light" theme (WCAG AAA compliant).
---

# UDS Simulator Light Theme System

This skill provides the exact design tokens, CSS implementations, and structural guidelines to recreate the **UDS Protocol Simulator's** signature Light Theme. This design prioritizes technical clarity, automotive aesthetic, and **WCAG 2.1 Level AAA** accessibility (7:1+ contrast ratio).

## 1. Color Palette

### Core Backgrounds
- **Primary Page Background**: `#F0F4F8` (Soft Blue-Gray)
- **Secondary Gradient**: `#E3EDF7`
- **Tertiary Gradient**: `#D6E4F0`
- **Surface (Cards/Panels)**: `#FFFFFF` (Pure White)
- **Muted Surfaces**: `#F7FAFB`

### Typography (Simulator Navy)
- **Primary Text (Headers/Emphasis)**: `#1A334D` (High contrast navy)
- **Secondary Text (Body/Descriptions)**: `#475569` (Slate-600)
- **Tertiary Text (Help/Meta)**: `#64748B`
- **Action/Accent Blue**: `#1E40AF` (Simulator Blue)

### Borders & Dividers
- **Standard Border**: `#D0D7DE` (Crisp gray-blue)
- **Subtle Border**: `#E3EDF7`

---

## 2. Global CSS Implementation

To recreate the environment background and grid:

```css
body {
    background-color: #F0F4F8;
    background-image:
        /* Technical Grid Lines */
        linear-gradient(rgba(26, 51, 77, 0.05) 1px, transparent 1px),
        linear-gradient(90deg, rgba(26, 51, 77, 0.05) 1px, transparent 1px),
        /* Depth Gradient */
        linear-gradient(135deg, #F0F4F8 0%, #E3EDF7 50%, #D6E4F0 100%);
    background-size: 32px 32px, 32px 32px, 100% 100%;
    background-attachment: fixed;
    color: #1A334D;
    font-family: 'Inter', system-ui, sans-serif;
}
```

---

## 3. Component Specifications

### A. The "Premium White Card"
Used for Requests, Responses, and Session details.

- **Background**: `#FFFFFF`
- **Border**: `2px solid #D0D7DE`
- **Corner Radius**: `16px` (rounded-2xl)
- **Shadow**: `0 4px 6px -1px rgb(0 0 0 / 0.1)`

### B. Professional Data Tables
Matches the ISO-style formatting from the Simulator's documentation.

- **Header Background**: `#1F3A47` (Dark Petrol Navy)
- **Header Text**: `#FFFFFF` (White), Bold, Tracking `0.2em`
- **Row Background**: `#F0F0F0` (Light technical gray)
- **Row Hover**: `#E8E8E8`
- **Cell Divider**: `1px solid #D0D7DE`
- **Hex Values**: Text Color `#0E7490` (Deep Cyan), Font Mono, Bold.

### C. Sidebar & Navigation
- **Active Link**: `#1E40AF` (Blue-800) + Bold weight.
- **Inactive Link**: `#1A334D` (Navy).
- **Background**: `#FFFFFF` with a right border of `#D0D7DE`.

---

## 4. Accessibility Checkpoints (AAA)

1. **Text Contrast**: Ensure all Navy text (`#1A334D`) is on White or Light-Gray backgrounds. Ratio is ~12:1.
2. **Focus Indicators**: Always use `outline: 3px solid #1E40AF` with an offset of `2px` for keyboard navigation.
3. **Interactive States**: Hover states should deepen the color (e.g., transition from text-navy to blue-700) and never decrease contrast.

## 5. Usage in Documentation
When creating documentation pages, always wrap the main content in a `DocContainer` that utilizes the **Pure White** card logic to ensure the technical data "pops" against the blueprint grid background.
