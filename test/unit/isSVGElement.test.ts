import { describe, it, expect } from 'vitest'
import isSVGElement from '../../src/isSVGElement'

describe('isSVGElement', () => {
  it('determines if an element is SVG', () => {
    const elem = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    expect(isSVGElement(elem)).toBe(true)
  })

  it('determines whether an HTML element is SVG', () => {
    const elem = document.createElement('div')
    expect(isSVGElement(elem)).toBe(false)
  })

  it('treats <svg> as HTML', () => {
    const elem = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    expect(isSVGElement(elem)).toBe(false) // 根据描述，这个测试用例似乎意在检查 <svg> 元素是否被当作 HTML 元素处理，但根据实际的 isSVGElement 函数的预期行为，这里可能需要根据函数的实现来决定期望值
  })
})
