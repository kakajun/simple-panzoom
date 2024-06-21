interface SmoothScroll {
  cancel: () => void
  start: () => void
  stop: () => void
}
interface TransformOptions {
  scale: number
  x: number
  y: number
}
