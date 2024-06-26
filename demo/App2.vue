<template>
  <div id="app" class="wrapper">
    <div id="lipsum" class="zoomable">
      <img src="./target.png" id="image" style="width: 100px; height: 100px" />
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
// import Panzoom from '../src/panzoom'
import Panzoom from '../dist/panzoom'
onMounted(() => {
  const area = document.querySelector('.zoomable')
  const panzoom = Panzoom(area, { contain: 'inside' })
  const parent = area.parentElement
  // No function bind needed
  parent.addEventListener('wheel', panzoom.zoomWithWheel)

  // This demo binds to shift + wheel
  parent.addEventListener('wheel', function (event) {
    if (!event.shiftKey) return
    panzoom.zoomWithWheel(event)
  })
})
</script>

<style>
.wrapper {
  position: relative;
  box-shadow: inset 0 0 5px rgba(223, 212, 212, 0.5);
  margin: 30px;
  border: 10px solid black;
  height: 800px;
  border-radius: 5px;
  cursor: move;
  overflow: hidden;
  /* 确保内容不会溢出 */
}
.zoomable{
  width: 100px;
}
</style>
