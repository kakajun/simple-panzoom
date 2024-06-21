import { describe, it, expect, vi } from 'vitest'
import { JSDOM } from 'jsdom'
import createPanzoom from '../'

// 这里定义全局的 DOM 环境，与原始代码相同
const globalDom = new JSDOM('', { pretendToBeVisual: true })
global.window = globalDom.window
global.document = globalDom.window.document
global.HTMLElement = globalDom.window.HTMLElement
global.SVGElement = globalDom.window.SVGElement
// .concurrent
describe('Panzoom Tests', () => {
  it('it can be created', async () => {
    // 创建一个 JSDOM 实例
    const dom = new JSDOM(`<body><div class='content'></div></body>`)
    const document = dom.window.document
    const content = document.querySelector('.content')

    // 创建 panzoom 实例
    const panzoom = createPanzoom(content)

    // 使用 expect 进行断言
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

    // 使用 expect 进行断言
    expect(panzoom.getMinZoom()).toBe(1)
    expect(panzoom.getMaxZoom()).toBe(2)
  })
  // 测试 panzoom 在鼠标滚轮事件时是否正确更新变换矩阵
  it('it updates transformation matrix on wheel event', async () => {
    const dom = new JSDOM(`<body><div class='content'></div></body>`).window
    const document = dom.document
    const content = document.querySelector('.content')
    const panzoom = createPanzoom(content)

    // 创建并分派 WheelEvent
    const wheelEvent = new dom.WheelEvent('wheel', { deltaY: 1 })
    document.body.dispatchEvent(wheelEvent)

    // 等待异步更新完成
    await new Promise(resolve => setTimeout(resolve, 40))

    // 使用 expect 进行断言
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

    // 创建并分派 WheelEvent
    const wheelEvent = new dom.WheelEvent('wheel', { deltaY: 1 })
    content.dispatchEvent(wheelEvent)

    // 等待异步更新完成
    await new Promise(resolve => setTimeout(resolve, 40))

    const originalTransform = content.style.transform
    expect(originalTransform).toBeDefined()

    // 调用 dispose 方法
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

    // 等待异步更新完成
    await new Promise(resolve => setTimeout(resolve, 40))
    // 使用 expect 进行断言
    expect(counter.transform).toBe(1)
    expect(counter.zoom).toBeUndefined()
    panzoom.dispose()
  })

  // 检查 panzoom 是否允许取消键盘事件
  it('it allows to cancel keyboard events', async () => {
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

    const DOWN_ARROW = 40
    let filterKeyCalledCorrectly = false
    const panzoom = createPanzoom(content, {
      filterKey(e, x, y, z) {
        expect(e.keyCode).toBe(DOWN_ARROW)
        expect(x).toBe(0)
        expect(y).toBe(-1)
        expect(z).toBe(0)
        filterKeyCalledCorrectly = true

        // 允许取消键盘事件
        return true
      }
    })

    const keyEvent = new KeyboardEvent('keydown', {
      keyCode: DOWN_ARROW,
      bubbles: true
    })
    content.dispatchEvent(keyEvent)

    // 等待异步更新完成
    await new Promise(resolve => setTimeout(resolve, 40))

    // 使用 expect 进行断言
    expect(content.style.transform).toBe('matrix(1, 0, 0, 1, 0, 0)')
    expect(filterKeyCalledCorrectly).toBe(true)
    panzoom.dispose()
  })

  // 测试用例检查 panzoom 是否在双击时正确地缩放。
  it('double click zooms in', async () => {
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
    let calledTimes = 0
    panzoom.on('zoom', () => {
      calledTimes += 1
    })

    // 创建并分派双击事件
    const doubleClick = new MouseEvent('dblclick', {
      bubbles: true,
      cancelable: true,
      clientX: 50,
      clientY: 50
    })
    content.dispatchEvent(doubleClick)

    // 等待异步更新完成
    await new Promise(resolve => setTimeout(resolve, 40))

    // 使用 expect 进行断言
    const transform = parseMatrixTransform(content.style.transform)
    expect(doubleClick.defaultPrevented).toBe(true)
    expect(transform).toBeDefined()
    expect(transform.scaleX).not.toBe(1)
    expect(transform.scaleX).toBe(transform.scaleY)
    expect(transform.dx).not.toBe(0)
    expect(transform.dy).not.toBe(0)
    expect(calledTimes).toBeGreaterThan(0)
    panzoom.dispose()
  })

  // 需要将 parseMatrixTransform 函数也转换为使用 expect 断言
  function parseMatrixTransform(transformString) {
    const matches = transformString.match(
      /matrix\((\d+\.?\d*), 0, 0, (\d+\.?\d*), (\d+\.?\d*), (\d+\.?\d*)\)/
    )
    if (!matches) return

    return {
      scaleX: parseFloat(matches[1]),
      scaleY: parseFloat(matches[2]),
      dx: parseFloat(matches[3]),
      dy: parseFloat(matches[4])
    }
  }

  // 取消 preventDefault 行为的测试用例
  it('Can cancel preventDefault', async () => {
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

    const panzoom = createPanzoom(content, {
      onDoubleClick() {
        // 我们不想阻止默认行为
        return false
      }
    })

    let calledTimes = 0
    panzoom.on('zoom', () => {
      calledTimes += 1
    })

    // 创建并分派双击事件
    const doubleClick = new MouseEvent('dblclick', {
      bubbles: true,
      cancelable: true,
      clientX: 50,
      clientY: 50
    })
    content.dispatchEvent(doubleClick)

    // 等待异步更新完成
    await new Promise(resolve => setTimeout(resolve, 40))

    // 使用 expect 进行断言
    expect(doubleClick.defaultPrevented).toBe(false)
    const transform = parseMatrixTransform(content.style.transform)
    expect(transform).toBeDefined()
    expect(transform.scaleX).not.toBe(1)
    expect(transform.scaleX).toBe(transform.scaleY)
    expect(transform.dx).not.toBe(0)
    expect(transform.dy).not.toBe(0)
    expect(calledTimes).toBeGreaterThan(0)
    panzoom.dispose()
  })
})
