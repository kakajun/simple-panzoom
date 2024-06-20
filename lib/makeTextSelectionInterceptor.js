/**
 * Disallows selecting text.
 */

export default function makeTextSelectionInterceptor(useFake) {
  if (useFake) {
    return {
      capture: noop,
      release: noop
    }
  }

  let dragObject
  let prevSelectStart
  let prevDragStart
  let wasCaptured = false

  return {
    capture: capture,
    release: release
  }

  function capture(domObject) {
    wasCaptured = true
    prevSelectStart = window.document.onselectstart
    prevDragStart = window.document.ondragstart

    window.document.onselectstart = disabled

    dragObject = domObject
    dragObject.ondragstart = disabled
  }

  function release() {
    if (!wasCaptured) return

    wasCaptured = false
    window.document.onselectstart = prevSelectStart
    if (dragObject) dragObject.ondragstart = prevDragStart
  }
}

function disabled(e) {
  e.stopPropagation()
  return false
}

function noop() {}
