import { setStyle, setTransform } from '../../src/css'
import { describe, it, expect } from 'vitest'

function assertStyle(
  elem: HTMLElement | SVGElement,
  name: string,
  value: string
) {
  const capName = name[0].toUpperCase() + name.slice(1)
  const style: any = elem.style
  if (style[name]) {
    expect(style[name]).toBe(value)
  } else if (style[`webkit${capName}`]) {
    expect(style[`webkit${capName}`]).toBe(value)
  } else if (style[`moz${capName}`]) {
    expect(style[`moz${capName}`]).toBe(value)
  } else if (style[`ms${capName}`]) {
    expect(style[`ms${capName}`]).toBe(value)
  }
}

describe('css', () => {
  describe('setStyle', () => {
    it('sets a style on an HTMLElement', () => {
      const elem = document.createElement('div')
      const border = '1px solid black'
      setStyle(elem, 'border', border)
      assertStyle(elem, 'border', border)
    })

    it('sets a style on an SVGElement', () => {
      const elem = document.createElementNS('http://www.w3.org/2000/svg', 'g')
      const strokeWidth = '1px'
      setStyle(elem, 'stroke-width', strokeWidth)
      assertStyle(elem, 'stroke-width', strokeWidth)
    })
  })

  describe('setTransform', () => {
    it('sets the default transform-origin for HTML', () => {
      const elem = document.createElement('div')
      setTransform(elem, { x: 1, y: 1, scale: 1 })
      assertStyle(elem, 'transform', 'scale(1) translate(1px, 1px)')
    })

    it('sets the default transform-origin for SVG', () => {
      const elem = document.createElementNS('http://www.w3.org/2000/svg', 'g')
      setTransform(elem, { x: 1, y: 1, scale: 1 })
      assertStyle(elem, 'transform', 'scale(1) translate(1px, 1px)')
    })
  })
})
