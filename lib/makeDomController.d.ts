// makeDomController.d.ts

// 定义makeDomController函数的输入类型
type MakeDomControllerOptions = {
  disableKeyboardInteraction?: boolean
}

// 定义BBox类型，代表边界框
interface BBox {
  left: number
  top: number
  width: number
  height: number
}

// 定义Transform类型，代表变换属性
interface Transform {
  scale: number
  x: number
  y: number
}

// 声明isDomElement的类型
export function isDomElement(element: any): element is HTMLElement

// 声明makeDomController函数的类型和返回类型
declare function makeDomController(
  domElement: HTMLElement,
  options?: MakeDomControllerOptions
): {
  getBBox: () => BBox
  getOwner: () => HTMLElement
  applyTransform: (transform: Transform) => void
}

// 导出默认的makeDomController函数和isDomElement函数
export default makeDomController
