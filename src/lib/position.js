// Anchored-overlay geometry — pure maths, no DOM.
//
// src/main.js keeps the thin DOM wrapper (positionAnchored) that reads real
// rects and writes style; this function only decides WHERE a floating box
// should sit. Pure in/out means the flip + shift rules are unit-testable
// (tests/position.test.js) with plain rectangle objects.
//
// placement = "side-align":
//   side  ∈ top | bottom
//   align ∈ start | end | center
// FLIP  = if the chosen side overflows the viewport, use the other side.
// SHIFT = clamp horizontally so the box never runs off-screen.
export function computePosition({
  anchor,
  floating,
  viewport,
  placement = 'bottom-start',
  offset = 8,
  margin = 8,
}) {
  const [side, align = 'center'] = placement.split('-')
  const a = anchor
  const f = floating

  // --- vertical: requested side, then flip if it would overflow ---
  const roomBelow = viewport.height - a.bottom
  const roomAbove = a.top
  let top
  if (side === 'top') {
    top = a.top - f.height - offset
    if (top < margin && roomBelow >= roomAbove) top = a.bottom + offset
  } else {
    top = a.bottom + offset
    if (top + f.height > viewport.height - margin && roomAbove > roomBelow) {
      top = a.top - f.height - offset
    }
  }

  // --- horizontal: align, then shift to stay inside the viewport ---
  let left
  if (align === 'end') left = a.right - f.width
  else if (align === 'center') left = a.left + (a.width - f.width) / 2
  else left = a.left
  left = Math.max(margin, Math.min(left, viewport.width - f.width - margin))

  return { left, top }
}
