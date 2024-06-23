import { describe, it, expect } from 'vitest'
import isAttached from '../../src/isAttached'

describe('isAttached', () => {
  it('determines if an attached element is attached', () => {
    const div = document.createElement('div')
    document.body.appendChild(div)
    expect(isAttached(div)).toBe(true)
    document.body.removeChild(div)
  })

  it('determines if an attached shadow dom element is attached', () => {
    const div = document.createElement('div')
    const shadowChild = document.createElement('div')
    div.attachShadow({ mode: 'open' }).appendChild(shadowChild)
    document.body.appendChild(div)
    expect(isAttached(shadowChild)).toBe(true)
    document.body.removeChild(div)
  })

  it('determines if a nested, attached shadow dom element is attached', () => {
    const div = document.createElement('div')
    const shadowChild = document.createElement('div')
    const shadowGrandChild = document.createElement('div')
    shadowChild.attachShadow({ mode: 'open' }).appendChild(shadowGrandChild)
    div.attachShadow({ mode: 'open' }).appendChild(shadowChild)
    document.body.appendChild(div)
    expect(isAttached(shadowGrandChild)).toBe(true)
    document.body.removeChild(div)
  })

  it('determines if a detached shadow dom element is attached', () => {
    const div = document.createElement('div')
    const shadowChild = document.createElement('div')
    div.attachShadow({ mode: 'open' }).appendChild(shadowChild)
    expect(isAttached(shadowChild)).toBe(false)
  })

  it('determines if a detached element is attached', () => {
    const div = document.createElement('div')
    expect(isAttached(div)).toBe(false)
  })

  it('does not consider a document attached', () => {
    expect(isAttached(document)).toBe(false)
  })
})
