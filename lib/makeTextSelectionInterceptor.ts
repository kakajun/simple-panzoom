/**
 * Disallows selecting text.
 */

export default function makeTextSelectionInterceptor(useFake: any) {
  if (useFake) {
    return {
      capture: noop,
      release: noop
    }
  }

  let dragObject: { ondragstart: (e: any) => boolean }
  let prevSelectStart: ((this: GlobalEventHandlers, ev: Event) => any) | null
  let prevDragStart: ((this: GlobalEventHandlers, ev: DragEvent) => any) | null
  let wasCaptured = false

  return {
    capture: capture,
    release: release
  }

  function capture(domObject: any) {
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

function disabled(e: { stopPropagation: () => void }) {
  e.stopPropagation()
  return false
}

function noop() {}
