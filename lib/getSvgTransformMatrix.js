/**
 * Returns transformation matrix for an element. If no such transformation matrix
 * exist - a new one is created.
 */
export default getSvgTransformMatrix

function getSvgTransformMatrix(svgElement) {
  const baseVal = svgElement.transform.baseVal
  if (baseVal.numberOfItems) return baseVal.getItem(0)

  const owner = svgElement.ownerSVGElement || svgElement
  const transform = owner.createSVGTransform()
  svgElement.transform.baseVal.appendItem(transform)

  return transform
}
