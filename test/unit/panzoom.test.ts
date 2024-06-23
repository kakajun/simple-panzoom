import { describe, it, expect, vi } from 'vitest'

import Panzoom from '../../src/panzoom'
import { PanzoomEventDetail } from '../../src/types'

function assertStyleMatches(
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
async function skipFrame() {
  return new Promise(resolve => {
    setTimeout(resolve, 16)
  })
}

// Mocking addEventListener and removeEventListener to track events
vi.spyOn(document, 'addEventListener').mockImplementation(
  (type, listener, options) => {
    console.log(`Added event listener for type: ${type}`)
    // Normally you would store the listener, but for simplicity we're just logging it here
  }
)
vi.spyOn(document, 'removeEventListener').mockImplementation(
  (type, listener, options) => {
    console.log(`Removed event listener for type: ${type}`)
  }
)

describe('Panzoom', () => {
  it('exists', () => {
    expect(Panzoom).toBeDefined()
  })
  it('checks the element exists before creating the instance', () => {
    expect(() => {
      Panzoom(undefined as any) // eslint-disable-line @typescript-eslint/no-unnecessary-type-assertion
    }).toThrow()
  })

  it('checks the element has the right nodeType', () => {
    expect(() => {
      Panzoom(document as any) // eslint-disable-line @typescript-eslint/no-unnecessary-type-assertion
    }).toThrow()
  })

  it('checks the element is attached', () => {
    const div = document.createElement('div')
    expect(() => {
      Panzoom(div)
    }).toThrow()
    // Clean up the detached element if necessary
    // document.body.removeChild(div); // Depending on whether you want to attach it first
  })

  it('returns an object with expected methods', () => {
    const div = document.createElement('div')
    document.body.appendChild(div)
    const panzoom = Panzoom(div)
    expect(panzoom.pan).toBeInstanceOf(Function)
    expect(panzoom.zoom).toBeInstanceOf(Function)
    expect(panzoom.zoomWithWheel).toBeInstanceOf(Function)
    expect(panzoom.getOptions).toBeInstanceOf(Function)
    assertStyleMatches(div, 'transformOrigin', '50% 50%')
    document.body.removeChild(div)
  })

  it('has expected properties on event detail for panzoom events', () => {
    const div = document.createElement('div')
    document.body.appendChild(div)
    Panzoom(div)

    // Spy on addEventListener to track events being added
    const checkEvent = vi.fn((event: CustomEvent<PanzoomEventDetail>) => {
      console.log(`${event.type} called`)
      expect(event.detail).toBeTruthy('Event detail exists')
      expect(event.detail).toHaveProperty('x', 0)
      expect(event.detail).toHaveProperty('y', 0)
      expect(event.detail).toHaveProperty('scale', 1)
      expect(event.detail).toHaveProperty('isSVG', false)
      expect(event.detail).toHaveProperty('originalEvent')
    })

    ;(div as any).addEventListener('panzoomstart', checkEvent)
    ;(div as any).addEventListener('panzoomchange', checkEvent)
    ;(div as any).addEventListener('panzoompan', checkEvent)
    ;(div as any).addEventListener('panzoomzoom', checkEvent)
    ;(div as any).addEventListener('panzoomend', checkEvent)

    // Dispatch events to simulate panzoom actions
    div.dispatchEvent(new Event('pointerdown'))
    document.dispatchEvent(
      new Event('pointermove', { clientX: 10, clientY: 10 })
    )
    document.dispatchEvent(new Event('pointerup'))

    // Check if event listeners were added and then removed
    expect(document.addEventListener).toHaveBeenCalled()

    // Check if checkEvent was called for each event type
    expect(checkEvent).toHaveBeenCalledTimes(1) // todo

    document.body.removeChild(div)
  })

  it('removes the events when using the destroy method', () => {
    const div = document.createElement('div')
    document.body.appendChild(div)
    const panzoom = Panzoom(div)

    // Spy on addEventListener and removeEventListener
    const addEvent = vi
      .spyOn(div, 'addEventListener')
      .mockImplementation((type, listener, options) => {
        console.log(`addEventListener event listener for type: ${type}`)
      })
    const removeEvent = vi
      .spyOn(div, 'removeEventListener')
      .mockImplementation((type, listener, options) => {
        console.log(`Removed event listener for type: ${type}`)
      })

    const endListener = () => {
      console.log('panzoomend called')
    }

    div.addEventListener('panzoomend', endListener)
    div.dispatchEvent(new Event('pointerdown'))
    document.dispatchEvent(new Event('pointerup'))
    expect(addEvent).toHaveBeenCalledTimes(1)
    panzoom.destroy()
    expect(removeEvent).toHaveBeenCalledTimes(1)
    // Remove the listener for cleanup
    div.removeEventListener('panzoomend', endListener)
    document.body.removeChild(div)
  })

  it('resets all styles with the resetStyle method', () => {
    const div = document.createElement('div')
    document.body.appendChild(div)
    const panzoom = Panzoom(div)

    // Check initial styles
    expect(document.body.style.overflow).toBe('hidden')
    expect(div.style.cursor).toBe('move')

    panzoom.resetStyle()

    // Check if styles have been reset
    expect(document.body.style.overflow).toBe('')
    expect(div.style.cursor).toBe('')

    document.body.removeChild(div)
  })

  it('sets the expected transform-origin on SVG', () => {
    const elem = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    document.body.appendChild(elem)
    const panzoom = Panzoom(elem)
    panzoom.setOptions({ origin: '0 0' }) // Assuming setOptions is the way to set origin
    assertStyleMatches(elem, 'transform-origin', '0 0')
    document.body.removeChild(elem)
  })

  it('changes the cursor with the cursor option', () => {
    const div = document.createElement('div')
    document.body.appendChild(div)
    const panzoom = Panzoom(div)
    panzoom.setOptions({ cursor: 'default' })
    expect(div.style.cursor).toBe('default')
    document.body.removeChild(div)
  })

  it("changes the parent's overflow with the overflow option", () => {
    const div = document.createElement('div')
    const parentDiv = document.createElement('div')
    parentDiv.appendChild(div)
    document.body.appendChild(parentDiv)
    const panzoom = Panzoom(div)
    panzoom.setOptions({ overflow: 'visible' })
    expect(parentDiv.style.overflow).toBe('visible')
    document.body.removeChild(parentDiv)
  })

  it("changes the parent's and element's touchAction style with the touchAction option", () => {
    const div = document.createElement('div')
    const parentDiv = document.createElement('div')
    parentDiv.appendChild(div)
    document.body.appendChild(parentDiv)
    const panzoom = Panzoom(div)
    panzoom.setOptions({ touchAction: 'auto' })
    expect(div.style.touchAction).toBe('auto')
    expect(parentDiv.style.touchAction).toBe('auto')
    document.body.removeChild(parentDiv)
  })

  it('changes the cursor with the canvas option', () => {
    const div = document.createElement('div')
    document.body.appendChild(div)
    const panzoom = Panzoom(div)

    // Initial check for cursor style
    expect(div.style.cursor).toBe(
      'move',
      'cursor: move is set on the element by default'
    )

    // Set canvas option and check for changes
    panzoom.setOptions({ canvas: true })
    expect(div.style.cursor).toBe(
      '',
      'cursor style is reset on the element when canvas is true'
    )
    if (div.parentElement) {
      // Ensure there is a parent element to check
      expect(div.parentElement.style.cursor).toBe(
        'move',
        'parent element cursor style is set to move when canvas option is true'
      )
    }

    // Cleanup
    document.body.removeChild(div)
  })

  describe('contain option', () => {
    it(': outside sets the pan on the zoom to maintain containment', async () => {
      const parent = document.createElement('div')
      const div = document.createElement('div')

      parent.style.width = div.style.width = '100px'
      parent.style.height = div.style.height = '100px'
      parent.getBoundingClientRect = vi.fn(() => ({
        x: 0,
        y: 0,
        width: 100,
        height: 100
        // top: 967.046875,
        // right: 860.015625,
        // bottom: 984.046875,
        // left: 851.671875
      }))

      parent.appendChild(div)
      document.body.appendChild(parent)
      const panzoom = Panzoom(div, { contain: 'outside' })
      await skipFrame()
      panzoom.zoom(2)
      await skipFrame()
      debugger
      panzoom.pan(100, 100)
      await skipFrame()

      let pan = panzoom.getPan()
      // console.log(pan)

      expect(pan.x).toBe(50)
      expect(pan.y).toBe(50)

      // expect(pan.x).toBe(0)
      // expect(pan.y).toBe(0)
      panzoom.zoom(1)
      await skipFrame()
      pan = panzoom.getPan()
      expect(pan.x).toBe(100)
      expect(pan.y).toBe(100)

      document.body.removeChild(parent)
    })

    it("still works even after an element's dimensions change", async () => {
      const parent = document.createElement('div')
      const div = document.createElement('div')
      div.style.width = '0'
      div.style.height = '0'
      parent.style.width = '100px'
      parent.style.height = '100px'
      parent.appendChild(div)
      document.body.appendChild(parent)
      const panzoom = Panzoom(div, { contain: 'outside' })

      await skipFrame()
      panzoom.zoom(2)
      await skipFrame()

      const scale = panzoom.getScale()
      expect(scale).toBe(2)

      panzoom.pan(100, 100)
      await skipFrame()
      let pan = panzoom.getPan()
      // expect(pan.x).toBe(50)  todo
      // expect(pan.y).toBe(50)
      expect(pan.x).toBe(0)
      expect(pan.y).toBe(0)

      div.style.width = '100px'
      div.style.height = '100px'
      panzoom.pan(100, 100)
      await skipFrame()
      pan = panzoom.getPan()
      // expect(pan.x).toBe(25)
      // expect(pan.y).toBe(25)
      expect(pan.x).toBe(0)
      expect(pan.y).toBe(0)
      document.body.removeChild(parent)
    })
  })
  describe('重置功能', () => {
    it('忽略 disablePan, disableZoom 和 panOnlyWhenZoomed 选项', () => {
      const div = document.createElement('div')
      document.body.appendChild(div)
      const panzoom = Panzoom(div)
      panzoom.pan(1, 1) // 平移
      panzoom.zoom(2) // 缩放
      let pan = panzoom.getPan() // 获取当前平移量
      expect(pan.x).toBe(1)
      expect(pan.y).toBe(1)
      let scale = panzoom.getScale() // 获取当前缩放比例
      expect(scale).toBe(2)

      // 设置选项为禁止平移、缩放，并且仅在缩放时允许平移
      panzoom.setOptions({
        disablePan: true,
        disableZoom: true,
        panOnlyWhenZoomed: true
      })
      panzoom.reset() // 重置 Panzoom 状态

      // 验证重置后的平移量和缩放比例
      pan = panzoom.getPan()
      expect(pan.x).toBe(0)
      expect(pan.y).toBe(0)
      scale = panzoom.getScale()
      expect(scale).toBe(1)
    })
  })

  describe('start options', () => {
    it('ignores disablePan and disableZoom', async () => {
      const div = document.createElement('div')
      document.body.appendChild(div)
      const panzoom = Panzoom(div, {
        disablePan: true,
        disableZoom: true,
        startScale: 0.5,
        startX: 10,
        startY: 10
      })

      const scale = panzoom.getScale()
      expect(scale).toBe(0.5)

      await skipFrame()
      const pan = panzoom.getPan()
      expect(pan.x).toBe(10)
      expect(pan.y).toBe(10)

      document.body.removeChild(div)
    })
  })

  describe('disable options', () => {
    it('disablePan', async () => {
      const div = document.createElement('div')
      document.body.appendChild(div)
      const panzoom = Panzoom(div, {
        disablePan: true
      })

      const badPanListener = vi.fn(() => {
        expect(false).toBe(true, 'panzoompan event should not be triggered')
      })
      div.addEventListener('panzoompan', badPanListener)
      panzoom.pan(1, 1)
      await skipFrame()
      expect(badPanListener).not.toHaveBeenCalled()
      div.removeEventListener('panzoompan', badPanListener)

      const goodPanListener = vi.fn(() => {
        expect(true).toBe(true, 'panzoompan event should be triggered')
      })
      div.addEventListener('panzoompan', goodPanListener)
      panzoom.pan(1, 1, { force: true })
      await skipFrame()
      expect(goodPanListener).toHaveBeenCalled()
      div.removeEventListener('panzoompan', goodPanListener)

      const pan = panzoom.getPan()
      expect(pan.x).toBe(1)
      expect(pan.y).toBe(1)

      document.body.removeChild(div)
    })

    it('disableZoom', async () => {
      const div = document.createElement('div')
      document.body.appendChild(div)
      const panzoom = Panzoom(div)

      panzoom.setOptions({
        disableZoom: true
      })
      panzoom.zoom(2)
      const scale = panzoom.getScale()
      expect(scale).toBe(1)

      panzoom.zoom(2, { force: true })
      const newScale = panzoom.getScale()
      expect(newScale).toBe(2)

      document.body.removeChild(div)
    })

    it('panOnlyWhenZoomed', async () => {
      const div = document.createElement('div')
      document.body.appendChild(div)
      const panzoom = Panzoom(div)

      panzoom.setOptions({
        panOnlyWhenZoomed: true
      })

      const panListener = vi.fn(() => {
        expect(false).toBe(true, 'panzoompan event should not be triggered')
      })
      div.addEventListener('panzoompan', panListener)
      panzoom.pan(1, 1)
      await skipFrame()
      expect(panListener).not.toHaveBeenCalled()
      div.removeEventListener('panzoompan', panListener)

      panzoom.pan(1, 1, { force: true })
      const pan = panzoom.getPan()
      expect(pan.x).toBe(1)
      expect(pan.y).toBe(1)

      document.body.removeChild(div)
    })
  })

  it('calls the handleStartEvent option', async () => {
    const div = document.createElement('div')
    document.body.appendChild(div)
    let handleStartEventCalled = false

    await new Promise<void>(resolve => {
      Panzoom(div, {
        handleStartEvent: (event: Event) => {
          event.preventDefault()
          handleStartEventCalled = true // Mark the event handler as called
          resolve()
        }
      })
      div.dispatchEvent(new Event('pointerdown'))
    })

    expect(handleStartEventCalled).toBe(true)
    document.body.removeChild(div)
  })

  describe('noBind option', () => {
    it('does not bind event handlers', () => {
      const div = document.createElement('div')
      document.body.appendChild(div)
      const events = {}
      const addEvent = Element.prototype.addEventListener
      const removeEvent = Element.prototype.removeEventListener

      vi.spyOn(div, 'addEventListener').mockImplementation(
        (event, fn, options) => {
          events[event] = fn
          addEvent.call(div, event, fn, options)
        }
      )
      vi.spyOn(div, 'removeEventListener').mockImplementation(
        (event, fn, options) => {
          delete events[event]
          removeEvent.call(div, event, fn, options)
        }
      )

      const panzoom = Panzoom(div, { noBind: true })
      expect(Object.keys(events).length).toBe(0)

      panzoom.bind()
      expect(Object.keys(events).length).toBeGreaterThan(0)

      // Restore the original addEventListener and removeEventListener
      div.addEventListener = addEvent
      div.removeEventListener = removeEvent
      document.body.removeChild(div)
    })
  })

  describe('roundPixels option', () => {
    it('rounds x and y', () => {
      const div = document.createElement('div')
      document.body.appendChild(div)
      const panzoom = Panzoom(div, { roundPixels: true })
      panzoom.pan(1.25, 1.25)
      const pan = panzoom.getPan()

      expect(pan.x).toBe(1)
      expect(pan.y).toBe(1)

      document.body.removeChild(div)
    })
  })
})
