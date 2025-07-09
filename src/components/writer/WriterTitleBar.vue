<template>
  <div class="title-bar">
    <div class="title-left">
      <el-button @click="$emit('go-back')" size="small">
        <el-icon><ArrowLeft /></el-icon>
        返回列表
      </el-button>
      <span class="novel-title">{{ novelTitle || '小说编辑' }}</span>
    </div>
  </div>
</template>

<script setup>
import { ArrowLeft } from '@element-plus/icons-vue'

defineProps({
  novelTitle: {
    type: String,
    default: ''
  }
})

defineEmits(['go-back'])
</script>

<style scoped>
.title-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: white;
  border-bottom: 1px solid #e4e7ed;
  position: sticky;
  top: 0;
  z-index: 10;
}

.title-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.novel-title {
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
}
</style> 