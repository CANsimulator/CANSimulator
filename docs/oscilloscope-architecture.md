# Oscilloscope Architecture & Interactivity

The CAN-SCOPE physical layer oscilloscope uses a multi-panel canvas-based rendering system. Understanding the coordinate transformation logic is critical for implementing interactive features like draggable cursors, trigger levels, and vertical offsets.

## Coordinate Systems

1.  **Normalization Space (0.0 to 1.0)**:
    -   Used for horizontal (time) and vertical (voltage) positions that should remain consistent across zoom/pan operations.
    -   Cursors A and B are stored in normalized X positions.
    -   Sample positions in the waveform generator are relative to the capture window.

2.  **Plot Space (Pixels)**:
    -   The coordinate system within a specific panel (e.g., the Waveform panel).
    -   Starts at (0, 0) for the top-left of the plot area (excluding margins).
    -   Dimensions defined by `PLOT_W` and `PLOT_H_WAVE`.

3.  **Canvas Space (Pixels)**:
    -   The absolute coordinate system of the `<canvas>` element (900x540).
    -   Includes margins (`M.left`, `M.top`).

## Coordinate Transformations

Transformations are handled by `src/utils/scope-math.ts`.

### Horizontal (Time) Transforms

Mapping between normalized position $pos \in [0, 1]$ and plot-relative X:

$$x = (pos \times PLOT\_W - \frac{PLOT\_W}{2}) \times zoomX + \frac{PLOT\_W}{2} + panX$$

The reverse mapping (for hit testing and dragging):

$$pos = \frac{\frac{x - panX - \frac{PLOT\_W}{2}}{zoomX} + \frac{PLOT\_W}{2}}{PLOT\_W}$$

### Vertical (Voltage) Transforms

Handled via `vToPanel` and `yToV` in `VoltageScope.tsx`. These take into account the voltage range ($vMin$ to $vMax$) which depends on $V/div$ settings.

## Interaction Logic

### Draggable Cursors
Cursors are detected using a horizontal hit-test in `handlePointerDown`.
- **Grab Tolerance**: 12px.
- **Visual Feedback**: The mouse cursor changes to `ew-resize` when hovering near a cursor line.
- **Real-time Metrics**: $\Delta T$ and $\Delta V$ are computed based on the normalized positions and updated in the rendered frame.

### Trigger Level & Offsets
Drag logic for horizontal elements (Trigger, Vertical Offsets) uses similar mapping but focuses on the Y-axis. Transitions use `ns-resize` cursors.
