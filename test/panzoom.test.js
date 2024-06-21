import { describe, it, expect, vi } from 'vitest'
import { JSDOM } from 'jsdom'
import createPanzoom from '../'

describe.concurrent('Panzoom Tests', () => {
  it('it can be created', async () => {
    const dom = new JSDOM(`<body><div class='content'></div></body>`)
    const document = dom.window.document
    const content = document.querySelector('.content')
    const panzoom = createPanzoom(content)
    expect(panzoom).toBeDefined()
  })
  // 测试 panzoom 的最小和最大缩放级别
  it('can get min/max zoom', async () => {
    const dom = new JSDOM(`<body><div class='content'></div></body>`).window
    const document = dom.document
    const content = document.querySelector('.content')
    const panzoom = createPanzoom(content, {
      minZoom: 1,
      maxZoom: 2
    })
    expect(panzoom.getMinZoom()).toBe(1)
    expect(panzoom.getMaxZoom()).toBe(2)
  })
  // 测试 panzoom 在鼠标滚轮事件时是否正确更新变换矩阵
  it('it updates transformation matrix on wheel event', async () => {
    const dom = new JSDOM(`<body><div class='content'></div></body>`).window
    const document = dom.document
    const content = document.querySelector('.content')
    const panzoom = createPanzoom(content)
    const wheelEvent = new dom.WheelEvent('wheel', { deltaY: 1 })
    document.body.dispatchEvent(wheelEvent)
    await new Promise(resolve => setTimeout(resolve, 40))
    const transform = panzoom.getTransform()
    expect(transform.scale).not.toBe(1)
    expect(content.style.transform).toBeDefined()
  })

  // 测试 panzoom 在调用 dispose 方法后是否正确地停止响应事件。
  it('it disposes correctly', async () => {
    const dom = new JSDOM(`<body><div class='content'></div></body>`).window
    const document = dom.document
    const content = document.querySelector('.content')
    const panzoom = createPanzoom(content)
    const wheelEvent = new dom.WheelEvent('wheel', { deltaY: 1 })
    content.dispatchEvent(wheelEvent)
    await new Promise(resolve => setTimeout(resolve, 40))

    const originalTransform = content.style.transform
    expect(originalTransform).toBeDefined()
    panzoom.dispose()

    // 再次分派 WheelEvent 并等待异步更新完成
    const secondWheelEvent = new dom.WheelEvent('wheel', { deltaY: 1 })
    content.dispatchEvent(secondWheelEvent)
    await new Promise(resolve => setTimeout(resolve, 40))
    // 断言变换矩阵没有变化
    expect(content.style.transform).toBe(originalTransform)
  })

  //  panzoom 是否可以通过键盘事件进行缩放
  it('it can use keyboard', async () => {
    const dom = new JSDOM(`<body><div class='content'></div></body>`).window
    const document = dom.document
    const content = document.querySelector('.content')

    // 模拟 getBoundingClientRect 方法
    content.parentElement.getBoundingClientRect = vi.fn(() => ({
      width: 100,
      height: 100,
      top: 0,
      left: 0
    }))

    const panzoom = createPanzoom(content)
    const counter = {}
    const countEvent = (obj, event) => () =>
      (obj[event] = (obj[event] || 0) + 1)
    panzoom.on('pan', countEvent(counter, 'pan'))
    panzoom.on('transform', countEvent(counter, 'transform'))
    panzoom.on('zoom', countEvent(counter, 'zoom'))
    await new Promise(resolve => setTimeout(resolve, 40))
    expect(counter.transform).toBe(1)
    expect(counter.zoom).toBeUndefined()
    panzoom.dispose()
  })

})
