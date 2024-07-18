<template>
  <div >
    <div id="lipsum" class="zoomable">
      <p>
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam enim
        lectus, euismod ac metus eget, consequat aliquam augue. Fusce vestibulum
        sagittis massa, eget iaculis lorem malesuada ut. Curabitur fringilla a
        lectus sed suscipit. Sed mollis ligula blandit ipsum posuere, et luctus
        sem iaculis. Suspendisse scelerisque mollis dapibus. Sed elementum
        placerat lacus, ac rutrum mauris varius in. Sed malesuada, ipsum in
        facilisis facilisis, eros massa euismod odio, id pretium augue purus sed
        risus. Nulla vitae purus enim. Suspendisse placerat ac turpis sed
        tempor. Cras et vulputate eros. Aenean volutpat tincidunt erat eu
        aliquam. Sed vel ex pulvinar, rutrum velit at, ullamcorper nibh. Ut ac
        rhoncus nulla. Pellentesque eu orci eu libero semper commodo ac sit amet
        massa.
      </p>
      <p>
        Donec condimentum odio ut lorem rhoncus pharetra. Maecenas nisl mi,
        faucibus ut tincidunt eu, lobortis at nunc. Suspendisse ut ipsum nec
        libero pharetra porta. Mauris porttitor neque nec mi rhoncus, a luctus
        massa consectetur. Vestibulum ante ipsum primis in faucibus orci luctus
        et ultrices posuere cubilia Curae; Sed varius mauris et volutpat
        dignissim. Maecenas consectetur porta mollis. Morbi quis hendrerit
        massa. Cras vel eros vitae nisi mollis volutpat blandit id est. Vivamus
        fringilla iaculis lacus eu aliquet. Ut a varius augue, et accumsan
        nulla. Integer eu sem non erat porttitor posuere. Sed dui tortor,
        aliquam sed volutpat vitae, sodales non enim. Vestibulum libero nulla,
        tempus blandit pretium ac, ullamcorper eu nisl.
      </p>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
// import Panzoom from '../src/panzoom'
import Panzoom from '../dist/panzoom'
onMounted(() => {
  const area = document.querySelector('.zoomable')
  const panzoom = Panzoom(area, { contain: 'outside' })
const parent = area.parentElement
// No function bind needed
parent.addEventListener('wheel', panzoom.zoomWithWheel)

// This demo binds to shift + wheel
parent.addEventListener('wheel', function(event) {
  if (!event.shiftKey) return
  panzoom.zoomWithWheel(event)
})
})
</script>

<style>
#app {
  text-align: center;
}
.main-container {
  height: calc(100vh - 4px);
}
</style>
