<template>
  <div>
    <div class="log"></div>
    <div class="container-parent">
      <div class="container">
        <div class="content">
          <img
            src="./target.png"
            id="image"
            style="width: 100%; height: auto"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
// import Panzoom from '../src/panzoom'
import Panzoom from '../dist/panzoom'
onMounted(() => {
  const area = document.querySelector('.content')
  const panzoom = Panzoom(area, { contain: 'outside' })

  const parent = area.parentElement
  // No function bind needed
  parent.addEventListener('wheel', panzoom.zoomWithWheel)
})
</script>

<style>
* {
  box-sizing: border-box;
}

body {
  position: relative;
  background-color: #eee;
  min-height: 100vh;
  margin: 0;
  padding: 0;
  overflow: hidden;
}

.container-parent {
  position: relative;
  box-shadow: inset 0 0 5px rgba(223, 212, 212, 0.5);
  margin: 30px;
  /* padding: 20px; */
  /* 调整padding以适应内容 */
  border: 10px solid black;
  border-radius: 5px;
  cursor: move;
  overflow: hidden;
  /* 确保内容不会溢出 */
}

.container {
  width: 100%;
  height: 600px;
  position: relative;
  transform-origin: 0 0;
  /* 设置缩放原点为左上角 */
  transform: translateZ(0);
  /* 开启硬件加速 */
}

.content {
  width: 100px;
  height: 100px;
}

.log {
  position: absolute;
  left: 0;
  top: 0;
}
</style>
