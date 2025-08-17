<template>
  <el-dialog
    v-model="visible"
    :title="null"
    width="600px"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :show-close="false"
    center
    class="announcement-dialog"
  >
    <div class="announcement-wrapper">
      <!-- 头部 -->
      <div class="announcement-header">
        <div class="header-left">
          <div class="announcement-icon">
            <el-icon size="24"><Bell /></el-icon>
          </div>
          <div class="header-info">
            <h3 class="announcement-title">{{ currentAnnouncement?.title || '系统公告' }}</h3>
            <div class="announcement-meta">
              <el-tag :type="getTypeTagType(currentAnnouncement?.type)" size="small" round>
                {{ getTypeLabel(currentAnnouncement?.type) }}
              </el-tag>
              <span class="announcement-time">
                <el-icon size="14"><Clock /></el-icon>
                {{ formatDate(currentAnnouncement?.createdAt) }}
              </span>
            </div>
          </div>
        </div>
        <div class="header-right">
          <span class="announcement-counter">{{ currentIndex + 1 }} / {{ announcements.length }}</span>
        </div>
      </div>
      
      <!-- 内容 -->
      <div class="announcement-body">
        <div class="content-text">
          {{ currentAnnouncement?.content }}
        </div>
      </div>
      
      <!-- 底部操作 -->
      <div class="announcement-footer">
        <div class="footer-left">
          <el-checkbox v-model="dontShowAgain" class="dont-show-checkbox">
            <span class="checkbox-text">不再显示此公告</span>
          </el-checkbox>
        </div>
        <div class="footer-right">
          <el-button 
            @click="handlePrevious" 
            :disabled="currentIndex === 0"
            size="default"
            class="nav-btn"
          >
            <el-icon><ArrowLeft /></el-icon>
            上一个
          </el-button>
          <el-button 
            @click="handleNext" 
            :disabled="currentIndex === announcements.length - 1"
            size="default"
            class="nav-btn"
          >
            下一个
            <el-icon><ArrowRight /></el-icon>
          </el-button>
          <el-button 
            type="primary" 
            @click="handleClose"
            size="default"
            class="close-btn"
          >
            {{ currentIndex === announcements.length - 1 ? '知道了' : '跳过' }}
          </el-button>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Bell, Clock, ArrowLeft, ArrowRight } from '@element-plus/icons-vue'

// Props
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  announcements: {
    type: Array,
    default: () => []
  }
})

// Emits
const emit = defineEmits(['update:modelValue', 'close', 'markAsRead'])

// 响应式数据
const visible = ref(false)
const currentIndex = ref(0)
const dontShowAgain = ref(false)

// 计算属性
const currentAnnouncement = computed(() => {
  return props.announcements[currentIndex.value] || null
})

// 监听 modelValue 变化
watch(() => props.modelValue, (newVal) => {
  visible.value = newVal
  if (newVal && props.announcements.length > 0) {
    currentIndex.value = 0
    dontShowAgain.value = false
  }
})

// 监听 visible 变化
watch(visible, (newVal) => {
  emit('update:modelValue', newVal)
})

// 处理上一个
const handlePrevious = () => {
  if (currentIndex.value > 0) {
    currentIndex.value--
    dontShowAgain.value = false
  }
}

// 处理下一个
const handleNext = () => {
  if (currentIndex.value < props.announcements.length - 1) {
    // 如果选择了不再显示，记录当前公告
    if (dontShowAgain.value && currentAnnouncement.value) {
      markAnnouncementAsRead(currentAnnouncement.value.id)
    }
    currentIndex.value++
    dontShowAgain.value = false
  }
}

// 处理关闭
const handleClose = () => {
  // 如果选择了不再显示，记录当前公告
  if (dontShowAgain.value && currentAnnouncement.value) {
    markAnnouncementAsRead(currentAnnouncement.value.id)
  }
  
  visible.value = false
  emit('close')
}

// 标记公告为已读
const markAnnouncementAsRead = (announcementId) => {
  try {
    // 获取已读公告列表
    const readAnnouncements = JSON.parse(localStorage.getItem('readAnnouncements') || '[]')
    
    // 添加当前公告ID
    if (!readAnnouncements.includes(announcementId)) {
      readAnnouncements.push(announcementId)
      localStorage.setItem('readAnnouncements', JSON.stringify(readAnnouncements))
    }
    
    emit('markAsRead', announcementId)
  } catch (error) {
    console.error('标记公告已读失败:', error)
  }
}

// 获取类型标签类型
const getTypeTagType = (type) => {
  const typeMap = {
    info: '',
    success: 'success',
    warning: 'warning',
    error: 'danger'
  }
  return typeMap[type] || ''
}

// 获取类型标签文本
const getTypeLabel = (type) => {
  const typeMap = {
    info: '信息',
    success: '成功',
    warning: '警告',
    error: '错误'
  }
  return typeMap[type] || '信息'
}

// 获取优先级标签类型
const getPriorityTagType = (priority) => {
  const priorityMap = {
    high: 'danger',
    medium: 'warning',
    low: 'info'
  }
  return priorityMap[priority] || ''
}

// 获取优先级标签文本
const getPriorityLabel = (priority) => {
  const priorityMap = {
    high: '高',
    medium: '中',
    low: '低'
  }
  return priorityMap[priority] || '中'
}

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 暴露方法给父组件
defineExpose({
  markAnnouncementAsRead
})
</script>

<style scoped>
:deep(.announcement-dialog .el-dialog) {
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

:deep(.announcement-dialog .el-dialog__body) {
  padding: 0;
}

.announcement-wrapper {
  background: white;
  color: #333;
  position: relative;
}

.announcement-header {
  padding: 20px 20px 16px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 1px solid #f0f0f0;
}

.header-left {
  display: flex;
  gap: 12px;
  flex: 1;
}

.announcement-icon {
  width: 40px;
  height: 40px;
  background: #f5f7fa;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #409eff;
  flex-shrink: 0;
}

.header-info {
  flex: 1;
}

.announcement-title {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
  line-height: 1.4;
}

.announcement-meta {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.announcement-time {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #666;
  background: #f5f7fa;
  padding: 4px 8px;
  border-radius: 12px;
}

.header-right {
  flex-shrink: 0;
}

.announcement-counter {
  background: #f5f7fa;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  color: #666;
  border: 1px solid #e4e7ed;
}

.announcement-body {
  padding: 20px;
  background: white;
  color: #333;
  min-height: 100px;
}

.content-text {
  font-size: 14px;
  line-height: 1.6;
  color: #333;
  word-break: break-word;
  white-space: pre-wrap;
}

.announcement-footer {
  padding: 16px 20px;
  background: #fafafa;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid #f0f0f0;
}

.footer-left {
  flex: 1;
}

.dont-show-checkbox {
  color: #666;
}

.checkbox-text {
  font-size: 14px;
  color: #666;
}

.footer-right {
  display: flex;
  gap: 8px;
}

.nav-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  border-radius: 6px;
  background: white;
  border: 1px solid #dcdfe6;
  color: #606266;
}

.nav-btn:hover:not(:disabled) {
  background: #ecf5ff;
  border-color: #409eff;
  color: #409eff;
}

.nav-btn:disabled {
  background: #f5f7fa;
  border-color: #e4e7ed;
  color: #c0c4cc;
}

.close-btn {
  background: #409eff;
  border: 1px solid #409eff;
  color: white;
  border-radius: 6px;
  padding: 8px 16px;
  font-weight: 500;
}

.close-btn:hover {
  background: #66b1ff;
  border-color: #66b1ff;
}

/* 响应式设计 */
@media (max-width: 768px) {
  :deep(.announcement-dialog .el-dialog) {
    width: 95% !important;
    margin: 0 auto;
  }
  
  .announcement-header {
    padding: 20px 16px 16px;
    flex-direction: column;
    gap: 16px;
  }
  
  .header-left {
    width: 100%;
  }
  
  .announcement-title {
    font-size: 18px;
  }
  
  .announcement-meta {
    gap: 8px;
  }
  
  .announcement-body {
    padding: 20px 16px;
  }
  
  .announcement-footer {
    padding: 16px;
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .footer-right {
    justify-content: center;
    flex-wrap: wrap;
  }
  
  .nav-btn, .close-btn {
    flex: 1;
    min-width: 80px;
  }
}

/* 动画效果 */
:deep(.announcement-dialog .el-dialog) {
  animation: slideInDown 0.4s ease-out;
}

@keyframes slideInDown {
  from {
    opacity: 0;
    transform: translateY(-30px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>