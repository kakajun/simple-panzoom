# simple-panzoom
经修改的panzoom,打包出来给vue3-sketch-ruler使用, 添加修改了部分方法, 其他的和[panzoom](https://github.com/timmywil/panzoom) 一样; 使用文档也参照panzoom

## 修改内容
1. 在setTrigger 方法中加获取dimsOut的尺寸的方法, 使得zoom和移动的方法都能内容和外框的尺寸
2. 增加导出类型, PanzoomEventDetail 新增 dimsOut类型
3. 新增类型dimsOut类型: `export type Dimensions = ReturnType<typeof getDimensions>`
