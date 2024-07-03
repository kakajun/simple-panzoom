<template>
  <div id="app" class="wrapper">
    <div id="lipsum" class="zoomable">
      <img src="./bg.png" id="image" style="width: 742px; height: 423px" />
      <!-- <img src="./1.png" id="image" style="width: 742px; height: 423px" /> -->
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import Panzoom from '../src/panzoom'
// import Panzoom from '../dist/panzoom'
onMounted(() => {
  const area = document.querySelector('.zoomable')
  const panzoom = Panzoom(area, {
    startX: 0,
    startY: 0,
    startScale: 1.1,
    // contain: 'inside',
    zoomDoubleClickSpeed: 1,
    zoomSpeed: 1
    // panOnlyWhenZoomed: false,
    // disablePan: false,
    // disableZoom: false,
    // disableXAxis: false,
    // disableYAxis: false
  })

  const parent = area.parentElement
  // No function bind needed
  parent.addEventListener('wheel', panzoom.zoomWithWheel)
  // setTimeout(() => {
  //   const dims = panzoom.setStyle('zoomable', 'style', 'none')
  //   console.log(dims, 'dims')
  // }, 3000)
  area.addEventListener('panzoomchange', event => {
    console.log(event, 'event')
  })

  //  startX.value = ((1 - scale) * width) / 2 + x
  //   startX.value = ((1 - scale) * height) / 2 + y
  // console.log(newx, newy, '44')
})
</script>

<style>
.wrapper {
  position: absolute;
  top: 100px;
  left: 100px;
  right: 30px;
  width: calc(100% - 60px);
  box-sizing: border-box;
  box-shadow: inset 0 0 5px rgba(223, 212, 212, 0.5);
  border: 1px solid black;
  height: 800px;
  border-radius: 5px;
  cursor: move;
  overflow: hidden;
  /* 确保内容不会溢出 */
}
</style>
