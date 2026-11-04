<template>
  <div class="writer-chapter-list">
    <div class="list-header">
      <div class="header-left">
        <span class="header-title">📝 章节列表</span>
        <el-tag size="small" type="info">共 {{ chapters.length }} 章</el-tag>
      </div>
      <div class="header-right">
        <el-dropdown @command="handleCommand" trigger="click">
          <el-button size="small" type="primary">
            <el-icon><Plus /></el-icon>
            新增章节
            <el-icon><ArrowDown /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="manual">
                <el-icon><EditPen /></el-icon>
                手动创建
              </el-dropdown-item>
              <el-dropdown-item command="ai-single">
                <el-icon><MagicStick /></el-icon>
                AI生成单章
              </el-dropdown-item>
              <el-dropdown-item command="ai-batch">
                <el-icon><Grid /></el-icon>
                AI批量生成
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <!-- 搜索和筛选 -->
    <div class="list-filter" v-if="chapters.length > 10">
      <el-input
        v-model="searchKeyword"
        placeholder="搜索章节..."
        clearable
        size="small"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
    </div>

    <!-- 虚拟滚动列表 -->
    <VirtualList
      ref="virtualListRef"
      :items="filteredChapters"
      :item-height="100"
      :buffer="3"
      item-key="id"
      class="chapter-virtual-list"
    >
      <template #default="{ item: chapter, index }">
        <div
          class="chapter-item"
          :class="{ 
            active: currentChapter?.id === chapter.id,
            draft: chapter.status === 'draft',
            completed: chapter.status === 'completed',
            published: chapter.status === 'published'
          }"
          @click="selectChapter(chapter)"
        >
          <div class="chapter-main">
            <div class="chapter-header">
              <div class="chapter-number">第 {{ index + 1 }} 章</div>
              <el-tag 
                v-if="chapter.status" 
                :type="getStatusType(chapter.status)" 
                size="small"
                class="chapter-status-tag"
              >
                {{ getStatusText(chapter.status) }}
              </el-tag>
            </div>
            
            <div class="chapter-title">{{ chapter.title || '未命名章节' }}</div>
            
            <div class="chapter-meta">
              <span class="meta-item">
                <el-icon><Document /></el-icon>
                {{ chapter.wordCount || 0 }} 字
              </span>
              <span class="meta-item">
                <el-icon><Clock /></el-icon>
                {{ formatDate(chapter.updatedAt) }}
              </span>
            </div>
            
            <div 
              v-if="chapter.description" 
              class="chapter-description"
            >
              {{ truncateText(chapter.description, 60) }}
            </div>
          </div>

          <div class="chapter-actions">
            <el-dropdown 
              @command="(cmd) => handleChapterAction(cmd, chapter)"
              trigger="click"
              @click.stop
            >
              <el-button size="small" type="text" class="action-btn">
                <el-icon><MoreFilled /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="edit">
                    <el-icon><Edit /></el-icon>
                    编辑信息
                  </el-dropdown-item>
                  <el-dropdown-item command="generate">
                    <el-icon><MagicStick /></el-icon>
                    AI生成正文
                  </el-dropdown-item>
                  <el-dropdown-item command="duplicate">
                    <el-icon><CopyDocument /></el-icon>
                    复制章节
                  </el-dropdown-item>
                  <el-dropdown-item divided command="delete">
                    <el-icon><Delete /></el-icon>
                    删除
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
      </template>
    </VirtualList>

    <!-- 空状态 -->
    <div v-if="chapters.length === 0" class="empty-state">
      <el-empty description="暂无章节">
        <el-button type="primary" @click="handleCommand('manual')">
          <el-icon><Plus /></el-icon>
          创建第一章
        </el-button>
      </el-empty>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import VirtualList from '../VirtualList.vue'

const props = defineProps({
  chapters: {
    type: Array,
    required: true,
    default: () => []
  },
  currentChapter: {
    type: Object,
    default: null
  }
})

const emit = defineEmits([
  'select-chapter',
  'add-chapter',
  'edit-chapter',
  'generate-chapter',
  'duplicate-chapter',
  'delete-chapter'
])

const virtualListRef = ref(null)
const searchKeyword = ref('')

// 过滤章节
const filteredChapters = computed(() => {
  if (!searchKeyword.value) {
    return props.chapters
  }
  
  const keyword = searchKeyword.value.toLowerCase()
  return props.chapters.filter(chapter => {
    return (
      chapter.title?.toLowerCase().includes(keyword) ||
      chapter.description?.toLowerCase().includes(keyword)
    )
  })
})

// 选择章节
const selectChapter = (chapter) => {
  emit('select-chapter', chapter)
}

// 处理命令
const handleCommand = (command) => {
  emit('add-chapter', command)
}

// 处理章节操作
const handleChapterAction = (command, chapter) => {
  switch (command) {
    case 'edit':
      emit('edit-chapter', chapter)
      break
    case 'generate':
      emit('generate-chapter', chapter)
      break
    case 'duplicate':
      emit('duplicate-chapter', chapter)
      break
    case 'delete':
      emit('delete-chapter', chapter)
      break
  }
}

// 获取状态类型
const getStatusType = (status) => {
  const typeMap = {
    draft: 'warning',
    completed: 'success',
    published: 'primary',
    outline: 'info'
  }
  return typeMap[status] || 'info'
}

// 获取状态文本
const getStatusText = (status) => {
  const textMap = {
    draft: '草稿',
    completed: '已完成',
    published: '已发表',
    outline: '大纲'
  }
  return textMap[status] || status
}

// 格式化日期
const formatDate = (date) => {
  if (!date) return '未知'
  
  try {
    const d = new Date(date)
    const now = new Date()
    const diff = now - d
    
    // 小于1分钟
    if (diff < 60000) {
      return '刚刚'
    }
    // 小于1小时
    if (diff < 3600000) {
      return `${Math.floor(diff / 60000)} 分钟前`
    }
    // 小于1天
    if (diff < 86400000) {
      return `${Math.floor(diff / 3600000)} 小时前`
    }
    // 小于7天
    if (diff < 604800000) {
      return `${Math.floor(diff / 86400000)} 天前`
    }
    
    // 超过7天，显示具体日期
    return d.toLocaleDateString('zh-CN')
  } catch (error) {
    return '未知'
  }
}

// 截断文本
const truncateText = (text, maxLength) => {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

// 滚动到指定章节
const scrollToChapter = (chapterId) => {
  const index = props.chapters.findIndex(c => c.id === chapterId)
  if (index !== -1 && virtualListRef.value) {
    virtualListRef.value.scrollToItemSmooth(index)
  }
}

// 暴露方法
defineExpose({
  scrollToChapter
})
</script>

<style scoped>
.writer-chapter-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
  border-right: 1px solid #e4e7ed;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #e4e7ed;
  background: #fafafa;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-title {
  font-weight: 600;
  font-size: 14px;
  color: #303133;
}

.list-filter {
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
}

.chapter-virtual-list {
  flex: 1;
  overflow: hidden;
}

.chapter-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: all 0.2s;
  background: #fff;
  position: relative;
}

.chapter-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: transparent;
  transition: background 0.2s;
}

.chapter-item:hover {
  background: #f5f7fa;
}

.chapter-item.active {
  background: #e6f7ff;
}

.chapter-item.active::before {
  background: #1890ff;
}

.chapter-item.draft {
  border-left: 3px solid #e6a23c;
}

.chapter-item.completed {
  border-left: 3px solid #67c23a;
}

.chapter-item.published {
  border-left: 3px solid #409eff;
}

.chapter-main {
  flex: 1;
  min-width: 0;
}

.chapter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.chapter-number {
  font-size: 12px;
  color: #909399;
  font-weight: 500;
}

.chapter-status-tag {
  font-size: 11px;
}

.chapter-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chapter-meta {
  display: flex;
  gap: 16px;
  margin-bottom: 6px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #909399;
}

.meta-item .el-icon {
  font-size: 14px;
}

.chapter-description {
  font-size: 12px;
  color: #606266;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chapter-actions {
  margin-left: 8px;
}

.action-btn {
  color: #909399;
  padding: 4px;
}

.action-btn:hover {
  color: #409eff;
}

.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
}
</style>

