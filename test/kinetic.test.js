import { describe, it, expect } from 'vitest'
import kinetic from '../lib/kinetic'

describe('Kinetic Scroller', () => {
  it('exists and can be instantiated', () => {
    const getPoint = () => ({ x: 0, y: 0 })
    const scroll = () => {}

    const kineticScroller = kinetic(getPoint, scroll)

    // 模拟开始和停止方法调用，假设它们存在并执行无误
    kineticScroller.start()
    kineticScroller.stop()

    expect(kineticScroller).toBeTruthy()
  })
})
