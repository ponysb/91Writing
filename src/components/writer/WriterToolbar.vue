<template>
  <div class="writer-toolbar">
    <div class="toolbar-left">
      <!-- 返回按钮 -->
      <el-button 
        size="small" 
        @click="handleBack"
        class="back-btn"
      >
        <el-icon><ArrowLeft /></el-icon>
        返回
      </el-button>

      <!-- 分隔符 -->
      <el-divider direction="vertical" />

      <!-- 保存按钮 -->
      <el-button 
        size="small" 
        type="primary"
        :loading="isSaving"
        @click="handleSave"
      >
        <el-icon><DocumentChecked /></el-icon>
        {{ isSaving ? '保存中...' : '保存' }}
      </el-button>

      <!-- 自动保存指示 -->
      <span v-if="lastSaveTime" class="save-status">
        <el-icon><SuccessFilled /></el-icon>
        {{ lastSaveTime }}
      </span>
    </div>

    <div class="toolbar-center">
      <!-- 当前章节信息 -->
      <div v-if="currentChapter" class="current-chapter-info">
        <el-icon><Document /></el-icon>
        <span class="chapter-title">{{ currentChapter.title || '未命名章节' }}</span>
        <el-tag size="small" type="info">{{ wordCount }} 字</el-tag>
      </div>
    </div>

    <div class="toolbar-right">
      <!-- AI 工具菜单 -->
      <el-dropdown @command="handleAICommand" trigger="click">
        <el-button size="small" type="success">
          <el-icon><MagicStick /></el-icon>
          AI 工具
          <el-icon><ArrowDown /></el-icon>
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="continue">
              <el-icon><Connection /></el-icon>
              续写
            </el-dropdown-item>
            <el-dropdown-item command="polish">
              <el-icon><EditPen /></el-icon>
              润色
            </el-dropdown-item>
            <el-dropdown-item command="expand">
              <el-icon><ZoomIn /></el-icon>
              扩写
            </el-dropdown-item>
            <el-dropdown-item command="insert">
              <el-icon><Position /></el-icon>
              插入描写
            </el-dropdown-item>
            <el-dropdown-item divided command="dialogue">
              <el-icon><ChatLineSquare /></el-icon>
              生成对话
            </el-dropdown-item>
            <el-dropdown-item command="scene">
              <el-icon><Picture /></el-icon>
              场景描写
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>

      <el-divider direction="vertical" />

      <!-- 导出菜单 -->
      <el-dropdown @command="handleExportCommand" trigger="click">
        <el-button size="small">
          <el-icon><Download /></el-icon>
          导出
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="txt">
              <el-icon><Document /></el-icon>
              导出为 TXT
            </el-dropdown-item>
            <el-dropdown-item command="md">
              <el-icon><Memo /></el-icon>
              导出为 Markdown
            </el-dropdown-item>
            <el-dropdown-item command="json">
              <el-icon><Tickets /></el-icon>
              导出为 JSON
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>

      <!-- 设置按钮 -->
      <el-button 
        size="small" 
        @click="handleSettings"
        class="settings-btn"
      >
        <el-icon><Setting /></el-icon>
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  currentChapter: {
    type: Object,
    default: null
  },
  isSaving: {
    type: Boolean,
    default: false
  },
  lastSaveTime: {
    type: String,
    default: ''
  },
  wordCount: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits([
  'back',
  'save',
  'ai-command',
  'export',
  'settings'
])

const handleBack = () => {
  emit('back')
}

const handleSave = () => {
  emit('save')
}

const handleAICommand = (command) => {
  emit('ai-command', command)
}

const handleExportCommand = (command) => {
  emit('export', command)
}

const handleSettings = () => {
  emit('settings')
}
</script>

<style scoped>
.writer-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  z-index: 10;
}

.toolbar-left,
.toolbar-center,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toolbar-center {
  flex: 1;
  justify-content: center;
}

.back-btn {
  color: #606266;
}

.save-status {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #67c23a;
  margin-left: 8px;
}

.save-status .el-icon {
  font-size: 14px;
}

.current-chapter-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: #f5f7fa;
  border-radius: 4px;
  max-width: 400px;
}

.chapter-title {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 200px;
}

.settings-btn {
  color: #909399;
}

.el-divider--vertical {
  height: 20px;
  margin: 0;
}
</style>

