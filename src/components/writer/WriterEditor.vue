<template>
  <div class="editor-panel">
    <el-card shadow="never" v-if="currentChapter">
      <template #header>
        <div class="editor-header">
          <div class="editor-header-left">
            <h3 class="chapter-title">✍️ {{ currentChapter.title }}</h3>
            <div class="chapter-meta">
              <span class="word-count">{{ contentWordCount }}字</span>
              <el-select 
                v-if="currentChapter.status" 
                v-model="currentChapter.status" 
                size="small" 
                style="width: 80px;"
                @change="$emit('update-status', currentChapter.status)"
                popper-class="chapter-status-dropdown"
              >
                <el-option label="草稿" value="draft" />
                <el-option label="完成" value="completed" />
                <el-option label="发表" value="published" />
              </el-select>
              <span v-if="isSaving" class="saving-indicator">● 保存中...</span>
            </div>
          </div>
          <div class="editor-header-right">
            <el-button-group>
              <el-button size="small" @click="$emit('generate-from-outline')" :disabled="!currentChapter.description">
                <el-icon><Star /></el-icon>
                根据大纲生成
              </el-button>
              <el-button size="small" @click="$emit('open-continue-dialog')">
                <el-icon><ArrowRight /></el-icon>
                续写
              </el-button>
              <el-button size="small" @click="$emit('enhance-content')">
                <el-icon><Tools /></el-icon>
                优化
              </el-button>
            </el-button-group>
          </div>
        </div>
      </template>
      
      <div class="editor-container">
        <div class="editor-wrapper">
          <Toolbar
            :editor="editorRef"
            :defaultConfig="toolbarConfig"
            mode="default"
            style="border-bottom: 1px solid #e4e7ed;"
          />
          <Editor
            :model-value="content"
            :defaultConfig="editorConfig"
            mode="default"
            @onCreated="handleCreated"
            @onChange="handleChange"
            style="overflow-y: hidden;"
          />
        </div>
      </div>
    </el-card>
    
    <!-- 未选择章节状态 -->
    <el-card shadow="never" v-else>
      <div class="empty-editor">
        <el-icon class="empty-icon"><Document /></el-icon>
        <p>请选择或创建一个章节开始编辑</p>
        <el-button type="primary" @click="$emit('add-new-chapter')">创建第一章</el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onBeforeUnmount, shallowRef, onMounted } from 'vue'
import { Editor, Toolbar } from '@wangeditor/editor-for-vue'
import { Star, ArrowRight, Tools, Document } from '@element-plus/icons-vue'
import '@wangeditor/editor/dist/css/style.css'

const props = defineProps({
  currentChapter: {
    type: Object,
    default: null
  },
  content: {
    type: String,
    default: ''
  },
  isSaving: {
    type: Boolean,
    default: false
  },
  toolbarConfig: {
    type: Object,
    default: () => ({})
  },
  editorConfig: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits([
  'update:content',
  'update-status',
  'generate-from-outline',
  'open-continue-dialog',
  'enhance-content',
  'add-new-chapter',
  'editor-created',
  'content-change'
])

// 编辑器实例，必须用 shallowRef
const editorRef = shallowRef()

// 计算字数
const contentWordCount = computed(() => {
  if (!props.content) return 0
  // 去除HTML标签并计算字数
  const textContent = props.content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ')
  return textContent.length
})

const handleCreated = (editor) => {
  editorRef.value = editor
  emit('editor-created', editor)
}

const handleChange = (editor) => {
  const html = editor.getHtml()
  emit('update:content', html)
  emit('content-change', html, editor)
}

// 组件销毁时，也及时销毁编辑器
onBeforeUnmount(() => {
  const editor = editorRef.value
  if (editor == null) return
  editor.destroy()
})
</script>

<style scoped>
.editor-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.editor-panel .el-card {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.editor-panel :deep(.el-card__body) {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.editor-header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.chapter-title {
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
  margin: 0;
}

.chapter-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  color: #606266;
}

.word-count {
  font-weight: 500;
}

.saving-indicator {
  color: #67c23a;
  font-size: 12px;
}

.editor-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  overflow: hidden;
}

.editor-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.editor-wrapper :deep(.w-e-toolbar) {
  border-bottom: 1px solid #e4e7ed !important;
}

.editor-wrapper :deep(.w-e-text-container) {
  flex: 1;
}

.editor-wrapper :deep(.w-e-text-placeholder) {
  top: 20px;
  left: 20px;
}

.empty-editor {
  text-align: center;
  padding: 80px 20px;
  color: #909399;
}

.empty-icon {
  font-size: 64px;
  color: #c0c4cc;
  margin-bottom: 16px;
}

.empty-editor p {
  font-size: 16px;
  margin-bottom: 24px;
}
</style> 