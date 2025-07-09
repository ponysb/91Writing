<template>
  <div class="panel-content">
    <el-card shadow="never" class="chapters-card">
      <template #header>
        <div class="card-header">
          <span>📝 章节列表</span>
          <el-dropdown @command="handleChapterCommand">
            <el-button size="small" type="primary">
              <el-icon><Plus /></el-icon>
              新增章节 <el-icon><ArrowDown /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="manual">手动创建</el-dropdown-item>
                <el-dropdown-item command="ai-single">AI生成单章</el-dropdown-item>
                <el-dropdown-item command="ai-batch">AI批量生成</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </template>
      
      <div class="chapters-list">
        <div 
          v-for="(chapter, index) in chapters" 
          :key="chapter.id"
          class="chapter-item"
          :class="{ active: currentChapter?.id === chapter.id }"
          @click="$emit('select-chapter', chapter)"
        >
          <div class="chapter-info">
            <h4>第{{ index + 1 }}章</h4>
            <p>{{ chapter.title }}</p>
            <div class="chapter-meta">
              <span>{{ chapter.wordCount || 0 }}字</span>
              <el-tag v-if="chapter.status" :type="getChapterStatusType(chapter.status)" size="small">
                {{ getChapterStatusText(chapter.status) }}
              </el-tag>
            </div>
            <el-tooltip 
              v-if="chapter.description" 
              :content="chapter.description" 
              placement="top-start"
              :disabled="chapter.description.length <= 50"
              effect="light"
              :show-after="300"
            >
              <p class="chapter-desc chapter-desc-truncated">
                {{ chapter.description.length > 50 ? chapter.description.substring(0, 50) + '...' : chapter.description }}
              </p>
            </el-tooltip>
          </div>
          <div class="chapter-actions">
            <el-dropdown @command="(cmd) => $emit('chapter-action', cmd, chapter)">
              <el-button size="small" type="text">
                <el-icon><MoreFilled /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="edit">编辑信息</el-dropdown-item>
                  <el-dropdown-item command="generate">AI生成正文</el-dropdown-item>
                  <el-dropdown-item divided command="delete">删除</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
        
        <div v-if="chapters.length === 0" class="empty-chapters">
          <p>暂无章节</p>
          <el-button size="small" type="primary" @click="$emit('add-chapter')">
            创建第一章
          </el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { Plus, ArrowDown, MoreFilled } from '@element-plus/icons-vue'

defineProps({
  chapters: {
    type: Array,
    required: true
  },
  currentChapter: {
    type: Object,
    default: null
  }
})

defineEmits([
  'select-chapter',
  'chapter-action', 
  'add-chapter',
  'chapter-command'
])

const handleChapterCommand = (command) => {
  emit('chapter-command', command)
}

const getChapterStatusType = (status) => {
  const statusTypes = {
    'draft': '',
    'completed': 'success',
    'published': 'primary'
  }
  return statusTypes[status] || ''
}

const getChapterStatusText = (status) => {
  const statusTexts = {
    'draft': '草稿',
    'completed': '完成',
    'published': '发表'
  }
  return statusTexts[status] || status
}
</script>

<style scoped>
.panel-content {
  height: 100%;
  padding: 16px;
}

.chapters-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chapters-list {
  flex: 1;
  overflow-y: auto;
}

.chapter-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 12px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.chapter-item:hover {
  border-color: #409eff;
  background-color: #f0f9ff;
}

.chapter-item.active {
  border-color: #409eff;
  background-color: #e6f4ff;
}

.chapter-info {
  flex: 1;
}

.chapter-info h4 {
  font-size: 14px;
  color: #409eff;
  margin: 0 0 4px 0;
}

.chapter-info p {
  font-size: 15px;
  font-weight: 500;
  color: #303133;
  margin: 0 0 8px 0;
}

.chapter-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #909399;
}

.chapter-desc {
  font-size: 12px;
  color: #606266;
  margin: 4px 0 0 0;
  line-height: 1.4;
}

.chapter-desc-truncated {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chapter-actions {
  margin-left: 8px;
}

.empty-chapters {
  text-align: center;
  padding: 40px 20px;
  color: #909399;
}

.empty-chapters p {
  margin-bottom: 16px;
}
</style> 