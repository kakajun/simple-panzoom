import { test } from 'tap'
import { JSDOM } from 'jsdom'
const globalDom = new JSDOM('', { pretendToBeVisual: true })
global.window = globalDom.window
global.document = globalDom.window.document
global.HTMLElement = globalDom.window.HTMLElement
global.SVGElement = globalDom.window.SVGElement

import createPanzoom from '../'

test('it can be created', t => {
  // Note - have to do it after globals initialized.
  const dom = new JSDOM(`<body><div class='content'></div></body>`)
  const document = dom.window.document
  const content = document.querySelector('.content')

  const panzoom = createPanzoom(content)
  t.ok(panzoom, 'Created')
  t.end()
})

test('can get min/max zoom', t => {
  // Note - have to do it after globals initialized.
  const dom = new JSDOM(`<body><div class='content'></div></body>`)
  const document = dom.window.document
  const content = document.querySelector('.content')
  const panzoom = createPanzoom(content, {
    minZoom: 1,
    maxZoom: 2
  })
  t.equal(panzoom.getMinZoom(), 1, 'min zoom is valid')
  t.equal(panzoom.getMaxZoom(), 2, 'max zoom is valid')
  t.end()
})

test('it updates transformation matrix on wheel event', t => {
  const dom = new JSDOM(`<body><div class='content'></div></body>`)
  const document = dom.window.document
  const content = document.querySelector('.content')

  const panzoom = createPanzoom(content)
  const wheelEvent = new dom.window.WheelEvent('wheel', { deltaY: 1 })
  document.body.dispatchEvent(wheelEvent)
  setTimeout(() => {
    const transform = panzoom.getTransform()

    t.ok(transform.scale !== 1, 'Scale is updated')
    t.ok(content.style.transform, 'transform applied')
    t.end()
  }, 40)
})

test('it disposes correctly', t => {
  const dom = new JSDOM(`<body><div class='content'></div></body>`)
  const document = dom.window.document
  const content = document.querySelector('.content')

  const panzoom = createPanzoom(content)
  const wheelEvent = new dom.window.WheelEvent('wheel', { deltaY: 1 })
  content.dispatchEvent(wheelEvent)
  let originalTransform
  setTimeout(verifyFirstChangeAndDispose, 40)

  function verifyFirstChangeAndDispose() {
    originalTransform = content.style.transform
    t.ok(originalTransform, 'transform applied first time')

    panzoom.dispose()

    const secondWheel = new dom.window.WheelEvent('wheel', { deltaY: 1 })
    content.dispatchEvent(secondWheel)
    setTimeout(verifyTransformIsNotChanged, 40)
  }

  function verifyTransformIsNotChanged() {
    t.equal(
      content.style.transform,
      originalTransform,
      'Transform has not changed after dispose'
    )
    t.end()
  }
})

test('it can use keyboard', t => {
  const dom = new JSDOM(`<body><div class='content'></div></body>`)
  const document = dom.window.document
  const content = document.querySelector('.content')

  // JSDOM does not support this, have to override:
  content.parentElement.getBoundingClientRect = makeBoundingRect(100, 100)

  const panzoom = createPanzoom(content)
  const counter = {}
  panzoom.on('pan', countEvent(counter, 'pan'))
  panzoom.on('transform', countEvent(counter, 'transform'))
  panzoom.on('zoom', countEvent(counter, 'zoom'))

  const DOWN_ARROW = 40
  const keyEvent = new dom.window.KeyboardEvent('keydown', {
    keyCode: DOWN_ARROW,
    bubbles: true
  })
  content.dispatchEvent(keyEvent)
  setTimeout(verifyTransformIsChanged, 40)

  function verifyTransformIsChanged() {
    t.equal(counter.pan, 1, 'pan called')
    t.equal(counter.transform, 1, 'transform called')
    t.notOk(counter.zoom, 'Zoom should not have been called')
    t.equal(
      content.style.transform.toString(),
      'matrix(1, 0, 0, 1, 0, -5)',
      'keydown changed the y position'
    )
    panzoom.dispose()
    t.end()
  }
})

test('it allows to cancel keyboard events', t => {
  const dom = new JSDOM(`<body><div class='content'></div></body>`)
  const document = dom.window.document
  const content = document.querySelector('.content')

  // JSDOM does not support this, have to override:
  content.parentElement.getBoundingClientRect = makeBoundingRect(100, 100)

  const DOWN_ARROW = 40
  let filterKeyCalledCorrectly = false
  const panzoom = createPanzoom(content, {
    filterKey(e, x, y, z) {
      t.equal(e.keyCode, DOWN_ARROW, 'down arrow is used')
      t.equal(x, 0, 'x has not changed')
      t.equal(y, -1, 'y changed!')
      t.equal(z, 0, 'z has not changed')
      filterKeyCalledCorrectly = true

      // don't let panzoom to handle this event
      return true
    }
  })

  const keyEvent = new dom.window.KeyboardEvent('keydown', {
    keyCode: DOWN_ARROW,
    bubbles: true
  })
  content.dispatchEvent(keyEvent)
  setTimeout(verifyTransformIsChanged, 40)

  function verifyTransformIsChanged() {
    t.equal(
      content.style.transform.toString(),
      'matrix(1, 0, 0, 1, 0, 0)',
      'keydown does not change'
    )
    t.equal(filterKeyCalledCorrectly, true, 'filter key called correctly')
    panzoom.dispose()
    t.end()
  }
})

test('double click zooms in', t => {
  const dom = new JSDOM(`<body><div class='content'></div></body>`)
  const document = dom.window.document
  const content = document.querySelector('.content')
  // JSDOM does not support this, have to override:
  content.parentElement.getBoundingClientRect = makeBoundingRect(100, 100)

  const panzoom = createPanzoom(content)

  let calledTimes = 0
  panzoom.on('zoom', function () {
    calledTimes += 1
  })

  const doubleClick = new dom.window.MouseEvent('dblclick', {
    bubbles: true,
    cancelable: true,
    clientX: 50,
    clientY: 50
  })

  content.dispatchEvent(doubleClick)
  t.ok(doubleClick.defaultPrevented, 'default prevented')
  setTimeout(verifyTransformIsChanged, 40)

  function verifyTransformIsChanged() {
    const transform = parseMatrixTransform(content.style.transform)
    t.ok(transform, 'Transform is defined')
    t.ok(transform.scaleX !== 1, 'Scale has changed')
    t.ok(transform.scaleX === transform.scaleY, 'Scale is proportional')
    t.ok(transform.dx !== 0 && transform.dy !== 0, 'translated a bit')
    t.ok(calledTimes > 0, 'zoom event triggered')
    panzoom.dispose()
    t.end()
  }
})

test('Can cancel preventDefault', t => {
  const dom = new JSDOM(`<body><div class='content'></div></body>`)
  const document = dom.window.document
  const content = document.querySelector('.content')
  // JSDOM does not support this, have to override:
  content.parentElement.getBoundingClientRect = makeBoundingRect(100, 100)

  const panzoom = createPanzoom(content, {
    onDoubleClick() {
      // we don't want to prevent default!
      return false
    }
  })

  let calledTimes = 0
  panzoom.on('zoom', function () {
    calledTimes += 1
  })

  const doubleClick = new dom.window.MouseEvent('dblclick', {
    bubbles: true,
    cancelable: true,
    clientX: 50,
    clientY: 50
  })

  content.dispatchEvent(doubleClick)
  t.notOk(doubleClick.defaultPrevented, 'default should not be prevented')
  setTimeout(verifyTransformIsChanged, 40)

  function verifyTransformIsChanged() {
    const transform = parseMatrixTransform(content.style.transform)
    t.ok(transform, 'Transform is defined')
    t.ok(transform.scaleX !== 1, 'Scale has changed')
    t.ok(transform.scaleX === transform.scaleY, 'Scale is proportional')
    t.ok(transform.dx !== 0 && transform.dy !== 0, 'translated a bit')
    t.ok(calledTimes > 0, 'zoom event triggered')
    panzoom.dispose()
    t.end()
  }
})

function makeBoundingRect(width, height) {
  return function getBoundingClientRect() {
    return {
      left: 0,
      top: 0,
      width: width,
      height: height
    }
  }
}

function parseMatrixTransform(transformString) {
  if (!transformString) return
  const matches = transformString.match(
    /matrix\(([-+]?\d*\.?\d*), 0, 0, ([-+]?\d*\.?\d*), ([-+]?\d*\.?\d*), ([-+]?\d*\.?\d*)\)/
  )
  if (!matches) return

  return {
    scaleX: parseFloat(matches[1]),
    scaleY: parseFloat(matches[2]),
    dx: parseFloat(matches[3]),
    dy: parseFloat(matches[4])
  }
}

function countEvent(counter, name) {
  return function () {
    counter[name] = (counter[name] || 0) + 1
  }
}
