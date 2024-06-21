export function getOffsetXY(e: { clientX: number; clientY: number }, owner) {
  // I tried using e.offsetX, but that gives wrong results for svg, when user clicks on a path.
  const ownerRect = owner.getBoundingClientRect()
  const offsetX = e.clientX - ownerRect.left
  const offsetY = e.clientY - ownerRect.top

  return { x: offsetX, y: offsetY }
}

export function getPoint(transform) {
  return {
    x: transform.x,
    y: transform.y
  }
}
