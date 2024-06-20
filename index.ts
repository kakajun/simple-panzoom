/**
 * Allows to drag and zoom svg elements
 */

import wheel from 'wheel'

import eventify from 'ngraph.events'
import kinetic from './lib/kinetic.js'
import createTextSelectionInterceptor from './lib/makeTextSelectionInterceptor.js'
const domTextSelectionInterceptor = createTextSelectionInterceptor()
const fakeTextSelectorInterceptor = createTextSelectionInterceptor(true)
import Transform from './lib/transform.js'
import makeSvgController, { isSVGElement } from './lib/makeSvgController.js'
import makeDomController, { isDomElement } from './lib/makeDomController.js'

const defaultZoomSpeed = 1
const clickEventTimeInMS = 200

/**
 * Creates a new instance of panzoom, so that an object can be panned and zoomed
 *
 * @param {DOMElement} domElement where panzoom should be attached.
 * @param {Object} options that configure behavior.
 */
export default function createPanZoom(domElement, options) {
  options = options || {}

  let panController = options.controller

  if (!panController) {
    if (isSVGElement(domElement)) {
      panController = makeSvgController(domElement, options)
    } else if (isDomElement(domElement)) {
      panController = makeDomController(domElement, options)
    }
  }

  if (!panController) {
    throw new Error('Cannot create panzoom for the current type of dom element')
  }
  const owner = panController.getOwner()
  // just to avoid GC pressure, every time we do intermediate transform
  // we return this object. For internal use only. Never give it back to the consumer of this library
  const storedCTMResult = { x: 0, y: 0 }

  let isDirty = false
  const transform = new Transform()

  if (panController.initTransform) {
    panController.initTransform(transform)
  }

  const filterKey =
    typeof options.filterKey === 'function' ? options.filterKey : noop

  const bounds = options.bounds
  let maxZoom =
    typeof options.maxZoom === 'number'
      ? options.maxZoom
      : Number.POSITIVE_INFINITY
  let minZoom = typeof options.minZoom === 'number' ? options.minZoom : 0

  const boundsPadding =
    typeof options.boundsPadding === 'number' ? options.boundsPadding : 0.05

  const beforeWheel = options.beforeWheel || noop
  const beforeMouseDown = options.beforeMouseDown || noop
  let speed =
    typeof options.zoomSpeed === 'number' ? options.zoomSpeed : defaultZoomSpeed
  let transformOrigin = parseTransformOrigin(options.transformOrigin)
  const textSelection = options.enableTextSelection
    ? fakeTextSelectorInterceptor
    : domTextSelectionInterceptor

  validateBounds(bounds)

  if (options.autocenter) {
    autocenter()
  }

  let frameAnimation
  let pendingClickEventTimeout = 0
  let lastMouseDownedEvent = null
  let lastMouseDownTime = new Date()

  // We only need to fire panstart when actual move happens
  let panstartFired = false

  // cache mouse coordinates here
  let mouseX
  let mouseY

  // Where the first click has happened, so that we can differentiate
  // between pan and click
  let clickX
  let clickY
  let smoothScroll
  if ('smoothScroll' in options && !options.smoothScroll) {
    // If user explicitly asked us not to use smooth scrolling, we obey
    smoothScroll = rigidScroll()
  } else {
    // otherwise we use forward smoothScroll settings to kinetic API
    // which makes scroll smoothing.
    smoothScroll = kinetic(getPoint, scroll, options.smoothScroll)
  }
  let zoomToAnimation

  let multiTouch
  listenForEvents()

  const api = {
    dispose: dispose,
    moveTo: moveTo,
    centerOn: centerOn,
    zoomTo: publicZoomTo,
    zoomAbs: zoomAbs,
    showRectangle: showRectangle,
    getTransform: getTransformModel,
    getMinZoom: getMinZoom,
    setMinZoom: setMinZoom,
    getMaxZoom: getMaxZoom,
    setMaxZoom: setMaxZoom,
    getTransformOrigin: getTransformOrigin,
    setTransformOrigin: setTransformOrigin,
    getZoomSpeed: getZoomSpeed,
    setZoomSpeed: setZoomSpeed
  }

  eventify(api)

  const initialX =
    typeof options.initialX === 'number' ? options.initialX : transform.x
  const initialY =
    typeof options.initialY === 'number' ? options.initialY : transform.y
  const initialZoom =
    typeof options.initialZoom === 'number'
      ? options.initialZoom
      : transform.scale

  if (
    initialX != transform.x ||
    initialY != transform.y ||
    initialZoom != transform.scale
  ) {
    zoomAbs(initialX, initialY, initialZoom)
  }

  return api

  function showRectangle(rect) {
    // TODO: this duplicates autocenter. I think autocenter should go.
    const clientRect = owner.getBoundingClientRect()
    const size = transformToScreen(clientRect.width, clientRect.height)

    const rectWidth = rect.right - rect.left
    const rectHeight = rect.bottom - rect.top
    if (!Number.isFinite(rectWidth) || !Number.isFinite(rectHeight)) {
      throw new Error('Invalid rectangle')
    }

    const dw = size.x / rectWidth
    const dh = size.y / rectHeight
    const scale = Math.min(dw, dh)
    transform.x = -(rect.left + rectWidth / 2) * scale + size.x / 2
    transform.y = -(rect.top + rectHeight / 2) * scale + size.y / 2
    transform.scale = scale
  }

  function transformToScreen(x, y) {
    if (panController.getScreenCTM) {
      const parentCTM = panController.getScreenCTM()
      const parentScaleX = parentCTM.a
      const parentScaleY = parentCTM.d
      const parentOffsetX = parentCTM.e
      const parentOffsetY = parentCTM.f
      storedCTMResult.x = x * parentScaleX - parentOffsetX
      storedCTMResult.y = y * parentScaleY - parentOffsetY
    } else {
      storedCTMResult.x = x
      storedCTMResult.y = y
    }

    return storedCTMResult
  }

  function autocenter() {
    let w // width of the parent
    let h // height of the parent
    let left = 0
    let top = 0
    const sceneBoundingBox = getBoundingBox()
    if (sceneBoundingBox) {
      // If we have bounding box - use it.
      left = sceneBoundingBox.left
      top = sceneBoundingBox.top
      w = sceneBoundingBox.right - sceneBoundingBox.left
      h = sceneBoundingBox.bottom - sceneBoundingBox.top
    } else {
      // otherwise just use whatever space we have
      const ownerRect = owner.getBoundingClientRect()
      w = ownerRect.width
      h = ownerRect.height
    }
    const bbox = panController.getBBox()
    if (bbox.width === 0 || bbox.height === 0) {
      // we probably do not have any elements in the SVG
      // just bail out;
      return
    }
    const dh = h / bbox.height
    const dw = w / bbox.width
    const scale = Math.min(dw, dh)
    transform.x = -(bbox.left + bbox.width / 2) * scale + w / 2 + left
    transform.y = -(bbox.top + bbox.height / 2) * scale + h / 2 + top
    transform.scale = scale
  }

  function getTransformModel() {
    // TODO: should this be read only?
    return transform
  }

  function getMinZoom() {
    return minZoom
  }

  function setMinZoom(newMinZoom) {
    minZoom = newMinZoom
  }

  function getMaxZoom() {
    return maxZoom
  }

  function setMaxZoom(newMaxZoom) {
    maxZoom = newMaxZoom
  }

  function getTransformOrigin() {
    return transformOrigin
  }

  function setTransformOrigin(newTransformOrigin) {
    transformOrigin = parseTransformOrigin(newTransformOrigin)
  }

  function getZoomSpeed() {
    return speed
  }

  function setZoomSpeed(newSpeed) {
    if (!Number.isFinite(newSpeed)) {
      throw new Error('Zoom speed should be a number')
    }
    speed = newSpeed
  }

  function getPoint() {
    return {
      x: transform.x,
      y: transform.y
    }
  }

  function moveTo(x, y) {
    transform.x = x
    transform.y = y

    keepTransformInsideBounds()

    triggerEvent('pan')
    makeDirty()
  }

  function keepTransformInsideBounds() {
    const boundingBox = getBoundingBox()
    if (!boundingBox) return

    let adjusted = false
    const clientRect = getClientRect()

    let diff = boundingBox.left - clientRect.right
    if (diff > 0) {
      transform.x += diff
      adjusted = true
    }
    // check the other side:
    diff = boundingBox.right - clientRect.left
    if (diff < 0) {
      transform.x += diff
      adjusted = true
    }

    // y axis:
    diff = boundingBox.top - clientRect.bottom
    if (diff > 0) {
      transform.y += diff
      adjusted = true
    }

    diff = boundingBox.bottom - clientRect.top
    if (diff < 0) {
      transform.y += diff
      adjusted = true
    }
    return adjusted
  }

  /**
   * Returns bounding box that should be used to restrict scene movement.
   */
  function getBoundingBox() {
    if (!bounds) return // client does not want to restrict movement

    if (typeof bounds === 'boolean') {
      // for boolean type we use parent container bounds
      const ownerRect = owner.getBoundingClientRect()
      const sceneWidth = ownerRect.width
      const sceneHeight = ownerRect.height

      return {
        left: sceneWidth * boundsPadding,
        top: sceneHeight * boundsPadding,
        right: sceneWidth * (1 - boundsPadding),
        bottom: sceneHeight * (1 - boundsPadding)
      }
    }

    return bounds
  }

  function getClientRect() {
    const bbox = panController.getBBox()
    const leftTop = client(bbox.left, bbox.top)

    return {
      left: leftTop.x,
      top: leftTop.y,
      right: bbox.width * transform.scale + leftTop.x,
      bottom: bbox.height * transform.scale + leftTop.y
    }
  }

  function client(x, y) {
    return {
      x: x * transform.scale + transform.x,
      y: y * transform.scale + transform.y
    }
  }

  function makeDirty() {
    isDirty = true
    frameAnimation = window.requestAnimationFrame(frame)
  }

  function zoomByRatio(clientX, clientY, ratio) {
    if (isNaN(clientX) || isNaN(clientY) || isNaN(ratio)) {
      throw new Error('zoom requires valid numbers')
    }

    const newScale = transform.scale * ratio

    if (newScale < minZoom) {
      if (transform.scale === minZoom) return

      ratio = minZoom / transform.scale
    }
    if (newScale > maxZoom) {
      if (transform.scale === maxZoom) return

      ratio = maxZoom / transform.scale
    }

    const size = transformToScreen(clientX, clientY)

    transform.x = size.x - ratio * (size.x - transform.x)
    transform.y = size.y - ratio * (size.y - transform.y)

    // TODO: https://github.com/anvaka/panzoom/issues/112
    if (bounds && boundsPadding === 1 && minZoom === 1) {
      transform.scale *= ratio
      keepTransformInsideBounds()
    } else {
      const transformAdjusted = keepTransformInsideBounds()
      if (!transformAdjusted) transform.scale *= ratio
    }

    triggerEvent('zoom')

    makeDirty()
  }

  function zoomAbs(clientX, clientY, zoomLevel) {
    const ratio = zoomLevel / transform.scale
    zoomByRatio(clientX, clientY, ratio)
  }

  function centerOn(ui) {
    const parent = ui.ownerSVGElement
    if (!parent)
      throw new Error('ui element is required to be within the scene')
  }

  function scroll(x, y) {
    cancelZoomAnimation()
    moveTo(x, y)
  }

  function dispose() {
    releaseEvents()
  }

  function listenForEvents() {
    owner.addEventListener('mousedown', onMouseDown, { passive: false })
    owner.addEventListener('keydown', onKeyDown, { passive: false })

    // Need to listen on the owner container, so that we are not limited
    // by the size of the scrollable domElement
    wheel.addWheelListener(owner, onMouseWheel, { passive: false })

    makeDirty()
  }

  function releaseEvents() {
    wheel.removeWheelListener(owner, onMouseWheel)
    owner.removeEventListener('mousedown', onMouseDown)
    owner.removeEventListener('keydown', onKeyDown)

    if (frameAnimation) {
      window.cancelAnimationFrame(frameAnimation)
      frameAnimation = 0
    }

    smoothScroll.cancel()

    releaseDocumentMouse()
    textSelection.release()

    triggerPanEnd()
  }

  function frame() {
    if (isDirty) applyTransform()
  }

  function applyTransform() {
    isDirty = false

    // TODO: Should I allow to cancel this?
    panController.applyTransform(transform)

    triggerEvent('transform')
    frameAnimation = 0
  }

  function onKeyDown(e) {
    let x = 0,
      y = 0,
      z = 0
    if (e.keyCode === 38) {
      y = 1 // up
    } else if (e.keyCode === 40) {
      y = -1 // down
    } else if (e.keyCode === 37) {
      x = 1 // left
    } else if (e.keyCode === 39) {
      x = -1 // right
    } else if (e.keyCode === 189 || e.keyCode === 109) {
      // DASH or SUBTRACT
      z = 1 // `-` -  zoom out
    } else if (e.keyCode === 187 || e.keyCode === 107) {
      // EQUAL SIGN or ADD
      z = -1 // `=` - zoom in (equal sign on US layout is under `+`)
    }

    if (filterKey(e, x, y, z)) {
      // They don't want us to handle the key: https://github.com/anvaka/panzoom/issues/45
      return
    }

    if (x || y) {
      e.preventDefault()
      e.stopPropagation()
    }

    if (z) {
      const scaleMultiplier = getScaleMultiplier(z * 100)
      const offset = transformOrigin ? getTransformOriginOffset() : midPoint()
      publicZoomTo(offset.x, offset.y, scaleMultiplier)
    }
  }

  function midPoint() {
    const ownerRect = owner.getBoundingClientRect()
    return {
      x: ownerRect.width / 2,
      y: ownerRect.height / 2
    }
  }

  function clearPendingClickEventTimeout() {
    if (pendingClickEventTimeout) {
      clearTimeout(pendingClickEventTimeout)
      pendingClickEventTimeout = 0
    }
  }

  function handlePotentialClickEvent() {
    // we could still be in the double tap mode, let's wait until double tap expires,
    // and then notify:
    if (!options.onClick) return
    clearPendingClickEventTimeout()
    const dx = mouseX - clickX
    const dy = mouseY - clickY
    const l = Math.sqrt(dx * dx + dy * dy)
    if (l > 5) return // probably they are panning, ignore it
  }


  function onMouseDown(e) {
    clearPendingClickEventTimeout()

    // if client does not want to handle this event - just ignore the call
    if (beforeMouseDown(e)) return

    lastMouseDownedEvent = e
    lastMouseDownTime = new Date()
    // for IE, left click == 1
    // for Firefox, left click == 0
    const isLeftButton =
      (e.button === 1 && window.event !== null) || e.button === 0
    if (!isLeftButton) return

    smoothScroll.cancel()

    const offset = getOffsetXY(e)
    const point = transformToScreen(offset.x, offset.y)
    clickX = mouseX = point.x
    clickY = mouseY = point.y

    // We need to listen on document itself, since mouse can go outside of the
    // window, and we will loose it
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    textSelection.capture(e.target || e.srcElement)

    return false
  }

  function onMouseMove(e) {
    triggerPanStart()
    const offset = getOffsetXY(e)
    const point = transformToScreen(offset.x, offset.y)
    mouseX = point.x
    mouseY = point.y
  }

  function onMouseUp() {
    const now = new Date()
    if (now - lastMouseDownTime < clickEventTimeInMS)
      handlePotentialClickEvent(lastMouseDownedEvent)
    textSelection.release()
    triggerPanEnd()
    releaseDocumentMouse()
  }

  function releaseDocumentMouse() {
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
    panstartFired = false
  }


  function onMouseWheel(e) {
    // if client does not want to handle this event - just ignore the call
    if (beforeWheel(e)) return

    smoothScroll.cancel()

    let delta = e.deltaY
    if (e.deltaMode > 0) delta *= 100

    const scaleMultiplier = getScaleMultiplier(delta)

    if (scaleMultiplier !== 1) {
      const offset = transformOrigin
        ? getTransformOriginOffset()
        : getOffsetXY(e)
      publicZoomTo(offset.x, offset.y, scaleMultiplier)
      e.preventDefault()
    }
  }

  function getOffsetXY(e) {
    // I tried using e.offsetX, but that gives wrong results for svg, when user clicks on a path.
    const ownerRect = owner.getBoundingClientRect()
    const offsetX = e.clientX - ownerRect.left
    const offsetY = e.clientY - ownerRect.top

    return { x: offsetX, y: offsetY }
  }

  function getTransformOriginOffset() {
    const ownerRect = owner.getBoundingClientRect()
    return {
      x: ownerRect.width * transformOrigin.x,
      y: ownerRect.height * transformOrigin.y
    }
  }

  function publicZoomTo(clientX, clientY, scaleMultiplier) {
    smoothScroll.cancel()
    cancelZoomAnimation()
    return zoomByRatio(clientX, clientY, scaleMultiplier)
  }

  function cancelZoomAnimation() {
    if (zoomToAnimation) {
      zoomToAnimation.cancel()
      zoomToAnimation = null
    }
  }

  function getScaleMultiplier(delta) {
    const sign = Math.sign(delta)
    const deltaAdjustedSpeed = Math.min(0.25, Math.abs((speed * delta) / 128))
    return 1 - sign * deltaAdjustedSpeed
  }

  function triggerPanStart() {
    if (!panstartFired) {
      triggerEvent('panstart')
      panstartFired = true
      smoothScroll.start()
    }
  }

  function triggerPanEnd() {
    if (panstartFired) {
      // we should never run smooth scrolling if it was multiTouch (pinch zoom animation):
      if (!multiTouch) smoothScroll.stop()
      triggerEvent('panend')
    }
  }

  function triggerEvent(name) {
    api.fire(name, api)
  }
}

function parseTransformOrigin(options) {
  if (!options) return
  if (typeof options === 'object') {
    if (!isNumber(options.x) || !isNumber(options.y))
      failTransformOrigin(options)
    return options
  }

  failTransformOrigin()
}

function failTransformOrigin(options) {
  console.error(options)
  throw new Error(
    [
      'Cannot parse transform origin.',
      'Some good examples:',
      '  "center center" can be achieved with {x: 0.5, y: 0.5}',
      '  "top center" can be achieved with {x: 0.5, y: 0}',
      '  "bottom right" can be achieved with {x: 1, y: 1}'
    ].join('\n')
  )
}

function noop() {}

function validateBounds(bounds) {
  const boundsType = typeof bounds
  if (boundsType === 'undefined' || boundsType === 'boolean') return // this is okay
  // otherwise need to be more thorough:
  const validBounds =
    isNumber(bounds.left) &&
    isNumber(bounds.top) &&
    isNumber(bounds.bottom) &&
    isNumber(bounds.right)

  if (!validBounds)
    throw new Error(
      'Bounds object is not valid. It can be: ' +
        'undefined, boolean (true|false) or an object {left, top, right, bottom}'
    )
}

function isNumber(x) {
  return Number.isFinite(x)
}

// IE 11 does not support isNaN:
function isNaN(value) {
  if (Number.isNaN) {
    return Number.isNaN(value)
  }

  return value !== value
}

function rigidScroll() {
  return {
    start: noop,
    stop: noop,
    cancel: noop
  }
}

function autoRun() {
  if (typeof document === 'undefined') return

  const scripts = document.getElementsByTagName('script')
  if (!scripts) return
  let panzoomScript

  for (let i = 0; i < scripts.length; ++i) {
    const x = scripts[i]
    if (x.src && x.src.match(/\bpanzoom(\.min)?\.js/)) {
      panzoomScript = x
      break
    }
  }

  if (!panzoomScript) return

  const query = panzoomScript.getAttribute('query')
  if (!query) return

  const globalName = panzoomScript.getAttribute('name') || 'pz'
  const started = Date.now()

  tryAttach()

  function tryAttach() {
    const el = document.querySelector(query)
    if (!el) {
      const now = Date.now()
      const elapsed = now - started
      if (elapsed < 2000) {
        // Let's wait a bit
        setTimeout(tryAttach, 100)
        return
      }
      // If we don't attach within 2 seconds to the target element, consider it a failure
      console.error('Cannot find the panzoom element', globalName)
      return
    }
    const options = collectOptions(panzoomScript)
    console.log(options)
    window[globalName] = createPanZoom(el, options)
  }

  function collectOptions(script) {
    const attrs = script.attributes
    const options = {}
    for (let j = 0; j < attrs.length; ++j) {
      const attr = attrs[j]
      const nameValue = getPanzoomAttributeNameValue(attr)
      if (nameValue) {
        options[nameValue.name] = nameValue.value
      }
    }

    return options
  }

  function getPanzoomAttributeNameValue(attr) {
    if (!attr.name) return
    const isPanZoomAttribute =
      attr.name[0] === 'p' && attr.name[1] === 'z' && attr.name[2] === '-'

    if (!isPanZoomAttribute) return

    const name = attr.name.substr(3)
    const value = JSON.parse(attr.value)
    return { name: name, value: value }
  }
}

autoRun()
