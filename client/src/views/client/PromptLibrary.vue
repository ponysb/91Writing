<template>
  <div class="prompt-library">
    <!-- 顶部导航标签 -->
    <div class="top-tabs">
      <div class="tab-item" :class="{ active: activeTab === 'all' }" @click="activeTab = 'all'">
        <el-icon><Star /></el-icon>
        全部
      </div>
      <div 
        v-for="category in availableCategories" 
        :key="category.value"
        class="tab-item" 
        :class="{ active: activeTab === category.value }" 
        @click="activeTab = category.value"
      >
        <el-icon><component :is="category.icon" /></el-icon>
        {{ category.label }}
      </div>
    </div>

    <!-- 搜索框 -->
    <div class="search-container">
      <el-input
        v-model="searchQuery"
        placeholder="搜索提示词..."
        prefix-icon="Search"
        clearable
        class="search-input"
      />
    </div>

    <!-- 提示词卡片网格 -->
    <div class="prompts-grid">
      <div
        v-for="prompt in filteredPrompts"
        :key="prompt.id"
        class="prompt-card"
      >
        <div class="card-icon">
          <el-icon :size="32" :color="getCategoryIconColor(prompt.category)">
            <component :is="getCategoryIcon(prompt.category)" />
          </el-icon>
        </div>
        
        <div class="card-content">
          <h3 class="card-title">{{ prompt.name }}</h3>
          <p class="card-description">{{ prompt.description }}</p>
        </div>
        
        <div class="card-footer">
          <div class="card-tags">
            <el-tag
              v-for="tag in (prompt.tags || [])"
              :key="tag"
              size="small"
              class="tag-item"
            >
              {{ tag }}
            </el-tag>
          </div>
        </div>
      </div>
    </div>

    <!-- 分页 -->
    <div class="pagination">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="totalPrompts"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import {
  Star,
  Document,
  User,
  Connection,
  Picture,
  ChatDotRound,
  Sunny,
  Camera,
  Files,
  Lightning,
  Tools,
  Plus,
  Reading,
  DataAnalysis,
  MagicStick
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { promptAPI } from '@/api'

// 当前激活的标签
const activeTab = ref('all')

// 搜索
const searchQuery = ref('')

// 分页
const currentPage = ref(1)
const pageSize = ref(10)
const totalPrompts = ref(0)

// 提示词数据
const prompts = ref([])

// 可用分类列表（存储所有分类）
const allCategories = ref([])

// 显示的分类列表（只显示有数据的分类）
const availableCategories = computed(() => {
  return allCategories.value.map(category => ({
    value: category,
    label: getCategoryLabel(category),
    icon: getCategoryIcon(category)
  }))
})

// 由于分页在后端处理，直接使用prompts数据
const filteredPrompts = computed(() => {
  return prompts.value || []
})

// 分类标签映射
const getCategoryLabel = (category) => {
  const categoryMap = {
    'outline': '大纲',
    'synopsis': '简介',
    'detailed_outline': '细纲',
    'basic_text': '基础正文',
    'scene': '场景描写',
    'action_plot': '动作情节',
    'psychology': '心理描写',
    'smart_continue': '智能续写',
    'polish': '润色优化',
    'character': '人物生成',
    'rewrite': '改写',
    'golden_title': '黄金标题',
    'golden_finger': '金手指',
    'golden_opening': '黄金开篇',
    'inspiration': '灵感激发',
    'worldview': '世界观生成',
    'brainstorm': '脑洞生成',
    'short_writing': '短文写作',
    'short_story': '短篇小说',
    'book_analysis': '拆书分析',
    // 兼容旧的分类
    'novel': '小说创作',
    'plot': '情节发展',
    'structure': '结构正文',
    'dialogue': '对话生成',
    'action': '动作描写'
  }
  return categoryMap[category] || category
}

// 分类图标映射
const getCategoryIcon = (category) => {
  const iconMap = {
    'outline': Document,
    'basic_text': Files,
    'scene': Camera,
    'action_plot': Lightning,
    'psychology': Sunny,
    'smart_continue': Tools,
    'polish': MagicStick,
    'character': User,
    'rewrite': Plus,
    'golden_title': Star,
    'golden_finger': Connection,
    'golden_opening': Picture,
    'inspiration': Lightning,
    'worldview': Picture,
    'brainstorm': Star,
    'short_writing': Document,
    'short_story': Files,
    'book_analysis': Reading,
    // 兼容旧的分类
    'novel': Document,
    'plot': Connection,
    'structure': Files,
    'dialogue': ChatDotRound,
    'action': Lightning
  }
  return iconMap[category] || Document
}

// 分类图标颜色映射
const getCategoryIconColor = (category) => {
  const colorMap = {
    'outline': '#409EFF',
    'basic_text': '#67C23A',
    'scene': '#9C27B0',
    'action_plot': '#F56C6C',
    'psychology': '#FF9800',
    'smart_continue': '#00BCD4',
    'polish': '#FF5722',
    'character': '#67C23A',
    'rewrite': '#795548',
    'golden_title': '#FFD700',
    'golden_finger': '#FFA500',
    'golden_opening': '#FF6347',
    'inspiration': '#32CD32',
    'worldview': '#3B82F6',
    'brainstorm': '#FF1493',
    'short_writing': '#4682B4',
    'short_story': '#20B2AA',
    'book_analysis': '#CD853F',
    // 兼容旧的分类
    'novel': '#409EFF',
    'plot': '#E6A23C',
    'structure': '#67C23A',
    'dialogue': '#909399',
    'action': '#F56C6C'
  }
  return colorMap[category] || '#409EFF'
}

// 分页处理
const handleSizeChange = (val) => {
  pageSize.value = val
  currentPage.value = 1 // 重置到第一页
  loadPrompts()
}

const handleCurrentChange = (val) => {
  currentPage.value = val
  loadPrompts()
}

// 加载可用分类
const loadCategories = async () => {
  try {
    const response = await promptAPI.getPrompts({
      status: 'active',
      page: 1,
      limit: 1000 // 获取足够多的数据来统计分类
    })
    const categories = new Set()
    if (response.data.prompts) {
      response.data.prompts.forEach(prompt => {
        if (prompt.category) {
          categories.add(prompt.category)
        }
      })
    }
    allCategories.value = Array.from(categories)
  } catch (error) {
    console.error('加载分类失败：', error)
    allCategories.value = []
  }
}

// 加载提示词数据
const loadPrompts = async () => {
  try {
    const response = await promptAPI.getPrompts({
      category: activeTab.value === 'all' ? undefined : activeTab.value,
      search: searchQuery.value,
      status: 'active', // 只显示启用状态的提示词
      page: currentPage.value,
      limit: pageSize.value
    })
    prompts.value = response.data.prompts || []
    totalPrompts.value = response.data.pagination?.totalCount || 0
  } catch (error) {
    ElMessage.error('加载提示词失败：' + error.message)
    prompts.value = [] // 确保在错误情况下prompts是空数组
    totalPrompts.value = 0
  }
}

// 监听搜索和分类变化
watch([activeTab, searchQuery], () => {
  currentPage.value = 1 // 重置到第一页
  loadPrompts()
})

onMounted(async () => {
  await loadCategories()
  loadPrompts()
})
</script>

<style scoped>
.prompt-library {
  width: 100%;
  padding: 24px;
  background: #f5f7fa;
  min-height: 100vh;
}

/* 顶部标签 */
.top-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  padding: 8px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  overflow-x: auto;
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  font-size: 14px;
  font-weight: 500;
  color: #606266;
  background: transparent;
}

.tab-item:hover {
  background: #f5f7fa;
  color: #409eff;
}

.tab-item.active {
  background: #409eff;
  color: white;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);
}

.tab-item .el-icon {
  font-size: 16px;
}

/* 搜索框 */
.search-container {
  margin-bottom: 24px;
}

.search-input {
  max-width: 400px;
}

/* 卡片网格 */
.prompts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.prompt-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  border: 1px solid #e4e7ed;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* 卡片图标 */
.card-icon {
  margin-bottom: 16px;
}

/* 卡片内容 */
.card-content {
  margin-bottom: 20px;
}

.card-title {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  line-height: 1.4;
}

.card-description {
  margin: 0;
  color: #606266;
  font-size: 14px;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 卡片底部 */
.card-footer {
  display: flex;
  align-items: center;
}

.card-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  flex: 1;
}

.tag-item {
  background: #f0f2f5;
  color: #606266;
  border: none;
  font-size: 12px;
}



/* 分页 */
.pagination {
  display: flex;
  justify-content: center;
  margin-top: 30px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .prompt-library {
    padding: 16px;
  }
  
  .prompts-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .top-tabs {
    padding: 4px;
  }
  
  .tab-item {
    padding: 8px 12px;
    font-size: 13px;
  }
  
  .prompt-card {
    padding: 20px;
  }
  
  .card-title {
    font-size: 16px;
  }
  
  .card-footer {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
}
</style>