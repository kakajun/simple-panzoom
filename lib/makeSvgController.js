export default function makeSvgController(svgElement, options) {
  if (!isSVGElement(svgElement)) {
    throw new Error('svg element is required for svg.panzoom to work')
  }

  const owner = svgElement.ownerSVGElement
  if (!owner) {
    throw new Error(
      'Do not apply panzoom to the root <svg> element. ' +
        'Use its child instead (e.g. <g></g>). ' +
        'As of March 2016 only FireFox supported transform on the root element'
    )
  }

  if (!options.disableKeyboardInteraction) {
    owner.setAttribute('tabindex', 0)
  }

  const api = {
    getBBox: getBBox,
    getScreenCTM: getScreenCTM,
    getOwner: getOwner,
    applyTransform: applyTransform,
    initTransform: initTransform
  }

  return api

  function getOwner() {
    return owner
  }

  function getBBox() {
    const boundingBox = svgElement.getBBox()
    return {
      left: boundingBox.x,
      top: boundingBox.y,
      width: boundingBox.width,
      height: boundingBox.height
    }
  }

  function getScreenCTM() {
    const ctm = owner.getCTM()
    if (!ctm) {
      // This is likely firefox: https://bugzilla.mozilla.org/show_bug.cgi?id=873106
      // The code below is not entirely correct, but still better than nothing
      return owner.getScreenCTM()
    }
    return ctm
  }

  function initTransform(transform) {
    let screenCTM = svgElement.getCTM()

    // The above line returns null on Firefox
    if (screenCTM === null) {
      screenCTM = document
        .createElementNS('http://www.w3.org/2000/svg', 'svg')
        .createSVGMatrix()
    }

    transform.x = screenCTM.e
    transform.y = screenCTM.f
    transform.scale = screenCTM.a
    owner.removeAttributeNS(null, 'viewBox')
  }

  function applyTransform(transform) {
    svgElement.setAttribute(
      'transform',
      'matrix(' +
        transform.scale +
        ' 0 0 ' +
        transform.scale +
        ' ' +
        transform.x +
        ' ' +
        transform.y +
        ')'
    )
  }
}

export function isSVGElement(element) {
  return element && element.ownerSVGElement && element.getCTM
}
