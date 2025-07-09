<template>
  <el-dialog
    v-model="dialogVisible"
    :title="announcement.title"
    width="800px"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :show-close="false"
    top="5vh"
    class="announcement-dialog"
  >
    <div class="announcement-content">
      <div class="announcement-meta">
        <el-tag type="info" size="small">{{ announcement.date }}</el-tag>
        <el-tag type="success" size="small">v{{ announcement.version }}</el-tag>
      </div>
      
      <div class="announcement-body" v-html="renderedContent"></div>
      
      <div class="announcement-footer">
        <div class="footer-buttons">
          <el-button type="primary" @click="closeDialog">
            我知道了
          </el-button>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { marked } from 'marked'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  announcement: {
    type: Object,
    default: () => ({
      version: '1.0.0',
      title: '系统公告',
      date: '2024-01-01',
      content: ''
    })
  }
})

const emit = defineEmits(['update:visible', 'close'])

const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})



// 渲染markdown内容
const renderedContent = computed(() => {
  return marked(props.announcement.content || '')
})

// 关闭对话框
const closeDialog = () => {
  dialogVisible.value = false
  emit('close')
}

onMounted(() => {
  // 配置marked选项
  marked.setOptions({
    breaks: true,
    gfm: true
  })
})
</script>

<style scoped>
.announcement-dialog {
  border-radius: 12px;
}

.announcement-content {
  padding: 0;
}

.announcement-meta {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #ebeef5;
}

.announcement-body {
  max-height: 60vh;
  overflow-y: auto;
  padding: 16px 0;
  line-height: 1.6;
}

.announcement-body :deep(h1) {
  font-size: 24px;
  color: #303133;
  margin: 20px 0 16px 0;
  border-bottom: 2px solid #409eff;
  padding-bottom: 8px;
}

.announcement-body :deep(h2) {
  font-size: 20px;
  color: #409eff;
  margin: 16px 0 12px 0;
}

.announcement-body :deep(h3) {
  font-size: 18px;
  color: #606266;
  margin: 14px 0 10px 0;
}

.announcement-body :deep(p) {
  margin: 8px 0;
  color: #606266;
}

.announcement-body :deep(ul),
.announcement-body :deep(ol) {
  margin: 8px 0;
  padding-left: 20px;
}

.announcement-body :deep(li) {
  margin: 4px 0;
  color: #606266;
}

.announcement-body :deep(code) {
  background: #f5f7fa;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  color: #e6a23c;
}

.announcement-body :deep(pre) {
  background: #f5f7fa;
  padding: 12px;
  border-radius: 6px;
  overflow-x: auto;
  margin: 12px 0;
}

.announcement-body :deep(blockquote) {
  border-left: 4px solid #409eff;
  background: #ecf5ff;
  padding: 12px 16px;
  margin: 12px 0;
  color: #606266;
}

.announcement-body :deep(a) {
  color: #409eff;
  text-decoration: none;
}

.announcement-body :deep(a:hover) {
  text-decoration: underline;
}

.announcement-body :deep(strong) {
  color: #303133;
  font-weight: 600;
}

.announcement-body :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 12px 0;
}

.announcement-body :deep(th),
.announcement-body :deep(td) {
  border: 1px solid #ebeef5;
  padding: 8px 12px;
  text-align: left;
}

.announcement-body :deep(th) {
  background: #f5f7fa;
  font-weight: 600;
}

.announcement-footer {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #ebeef5;
}

.footer-buttons {
  display: flex;
  gap: 12px;
}

:deep(.el-dialog__header) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px 12px 0 0;
  padding: 20px 24px;
}

:deep(.el-dialog__title) {
  color: white;
  font-weight: 600;
  font-size: 18px;
}

:deep(.el-dialog__body) {
  padding: 24px;
}
</style> 