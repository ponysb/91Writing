<template>
  <div 
    ref="containerRef" 
    class="virtual-list-container"
    @scroll="handleScroll"
  >
    <!-- 总高度占位元素 -->
    <div 
      class="virtual-list-phantom" 
      :style="{ height: totalHeight + 'px' }"
    />
    
    <!-- 可见内容容器 -->
    <div 
      class="virtual-list-content"
      :style="{ transform: `translateY(${offsetY}px)` }"
    >
      <div
        v-for="item in visibleItems"
        :key="item[itemKey]"
        class="virtual-list-item"
        :style="{ height: itemHeight + 'px' }"
      >
        <slot :item="item" :index="item._index" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  // 列表数据
  items: {
    type: Array,
    required: true,
    default: () => []
  },
  // 每项高度
  itemHeight: {
    type: Number,
    default: 80
  },
  // 唯一标识键名
  itemKey: {
    type: String,
    default: 'id'
  },
  // 预渲染数量（缓冲区）
  buffer: {
    type: Number,
    default: 5
  }
})

const containerRef = ref(null)
const scrollTop = ref(0)
const containerHeight = ref(0)

// 计算总高度
const totalHeight = computed(() => {
  return props.items.length * props.itemHeight
})

// 计算可见范围
const visibleCount = computed(() => {
  return Math.ceil(containerHeight.value / props.itemHeight)
})

// 计算起始索引
const startIndex = computed(() => {
  const index = Math.floor(scrollTop.value / props.itemHeight)
  return Math.max(0, index - props.buffer)
})

// 计算结束索引
const endIndex = computed(() => {
  const index = startIndex.value + visibleCount.value + props.buffer * 2
  return Math.min(props.items.length, index)
})

// 计算偏移量
const offsetY = computed(() => {
  return startIndex.value * props.itemHeight
})

// 计算可见项
const visibleItems = computed(() => {
  return props.items
    .slice(startIndex.value, endIndex.value)
    .map((item, idx) => ({
      ...item,
      _index: startIndex.value + idx
    }))
})

// 滚动处理
const handleScroll = (e) => {
  scrollTop.value = e.target.scrollTop
}

// 初始化容器高度
const updateContainerHeight = () => {
  if (containerRef.value) {
    containerHeight.value = containerRef.value.clientHeight
  }
}

// 滚动到指定项
const scrollToItem = (index) => {
  if (containerRef.value) {
    const targetScrollTop = index * props.itemHeight
    containerRef.value.scrollTop = targetScrollTop
  }
}

// 滚动到指定项（带动画）
const scrollToItemSmooth = (index) => {
  if (containerRef.value) {
    const targetScrollTop = index * props.itemHeight
    containerRef.value.scrollTo({
      top: targetScrollTop,
      behavior: 'smooth'
    })
  }
}

// 监听窗口大小变化
let resizeObserver = null

onMounted(() => {
  updateContainerHeight()
  
  // 使用 ResizeObserver 监听容器大小变化
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      updateContainerHeight()
    })
    resizeObserver.observe(containerRef.value)
  } else {
    // 降级到 window resize
    window.addEventListener('resize', updateContainerHeight)
  }
})

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
  } else {
    window.removeEventListener('resize', updateContainerHeight)
  }
})

// 暴露方法给父组件
defineExpose({
  scrollToItem,
  scrollToItemSmooth
})
</script>

<style scoped>
.virtual-list-container {
  height: 100%;
  overflow-y: auto;
  position: relative;
}

.virtual-list-phantom {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: -1;
}

.virtual-list-content {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  will-change: transform;
}

.virtual-list-item {
  box-sizing: border-box;
}

/* 优化滚动性能 */
.virtual-list-container {
  -webkit-overflow-scrolling: touch;
  scroll-behavior: smooth;
}

/* 自定义滚动条样式 */
.virtual-list-container::-webkit-scrollbar {
  width: 6px;
}

.virtual-list-container::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.virtual-list-container::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.virtual-list-container::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>

