<template>
  <div class="novel-list">
    <div class="page-header">
      <h1>小说列表</h1>
      <el-button type="primary" @click="createNovel">
        <el-icon><Plus /></el-icon>
        创建新小说
      </el-button>
    </div>

    <!-- 搜索和筛选 -->
    <div class="search-bar">
      <el-row :gutter="20">
        <el-col :span="10">
          <el-input
            v-model="searchQuery"
            placeholder="搜索小说标题或内容"
            prefix-icon="Search"
            clearable
          />
        </el-col>
        <el-col :span="5">
          <el-select v-model="statusFilter" placeholder="状态筛选" clearable>
            <el-option label="全部" value="" />
            <el-option label="策划中" value="planning" />
            <el-option label="写作中" value="writing" />
            <el-option label="暂停" value="paused" />
            <el-option label="已完成" value="completed" />
            <el-option label="已发布" value="published" />
            <el-option label="已归档" value="archived" />
          </el-select>
        </el-col>
        <el-col :span="5">
          <el-select v-model="genreFilter" placeholder="题材筛选" clearable>
            <el-option label="全部" value="" />
            <el-option 
              v-for="genre in genreOptions" 
              :key="genre.id" 
              :label="genre.name" 
              :value="genre.name" 
            />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-select v-model="sortBy" placeholder="排序方式">
            <el-option label="最近更新" value="updated_at" />
            <el-option label="创建时间" value="created_at" />
            <el-option label="字数" value="current_word_count" />
            <el-option label="评分" value="rating" />
          </el-select>
        </el-col>
      </el-row>
    </div>

    <!-- 小说列表 -->
    <div v-loading="loading" class="novels-grid">
      <el-card
        v-for="novel in novels"
        :key="novel.id"
        class="novel-card"
        shadow="hover"
        @click="openNovel(novel)"
      >
        <div class="novel-cover">
          <img v-if="novel.cover_image" :src="getCoverImageUrl(novel.cover_image)" :alt="novel.title" />
          <div v-else class="default-cover">
            <el-icon size="48"><Reading /></el-icon>
          </div>
        </div>
        <div class="novel-info">
          <h3 class="novel-title">{{ novel.title }}</h3>
          <p class="novel-description">{{ novel.description }}</p>
          <div class="novel-meta">
            <el-tag :type="getStatusType(novel.status)" size="small">
              {{ getStatusText(novel.status) }}
            </el-tag>
            <el-tag v-if="novel.genre" type="info" size="small" class="genre-tag">
              {{ novel.genre }}
            </el-tag>
            <span class="word-count">{{ formatWordCount(novel.current_word_count || 0) }} 字</span>
          </div>
          <div v-if="novel.tags && novel.tags.length > 0" class="novel-tags">
            <el-tag
              v-for="tag in getTagsArray(novel.tags)"
              :key="tag"
              size="small"
              type="warning"
              class="tag-item"
            >
              {{ tag }}
            </el-tag>
          </div>
          <div class="novel-time">
            <span>更新于 {{ formatDate(novel.updated_at) }}</span>
          </div>
        </div>
        <div class="novel-actions" @click.stop>
          <el-dropdown @command="handleAction">
            <el-button type="text">
              <el-icon><MoreFilled /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item :command="{action: 'delete', novel}">删除</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-card>
      
      <!-- 空状态 -->
      <div v-if="!loading && novels.length === 0" class="empty-state">
        <el-empty description="暂无小说">
          <el-button type="primary" @click="createNovel">创建第一部小说</el-button>
        </el-empty>
      </div>
    </div>

    <!-- 分页 -->
    <div class="pagination">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[12, 24, 48]"
        :total="totalNovels"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  Plus,
  Search,
  Reading,
  MoreFilled
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { novelAPI, novelTypeAPI } from '@/api'
import { getCoverImageUrl } from '@/utils/imageUtils'

const router = useRouter()

// 加载状态
const loading = ref(false)

// 搜索和筛选
const searchQuery = ref('')
const statusFilter = ref('')
const sortBy = ref('updated_at')
const genreFilter = ref('')
const genreOptions = ref([])

// 分页
const currentPage = ref(1)
const pageSize = ref(12)
const totalNovels = ref(0)

// 小说数据
const novels = ref([])

// 过滤后的小说列表（现在直接使用API返回的数据）
const filteredNovels = computed(() => {
  return novels.value
})

// 获取状态类型
const getStatusType = (status) => {
  const types = {
    planning: 'info',
    writing: 'primary',
    paused: 'warning',
    completed: 'success',
    published: 'success',
    archived: 'danger'
  }
  return types[status] || 'info'
}

// 获取状态文本
const getStatusText = (status) => {
  const texts = {
    planning: '策划中',
    writing: '写作中',
    paused: '暂停',
    completed: '已完成',
    published: '已发布',
    archived: '已归档'
  }
  return texts[status] || '未知'
}

// 处理标签数组
const getTagsArray = (tags) => {
  if (!tags) return []
  if (Array.isArray(tags)) return tags
  if (typeof tags === 'string') {
    return tags.split(',').map(tag => tag.trim()).filter(tag => tag)
  }
  return []
}

// 格式化日期
const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

// 格式化字数
const formatWordCount = (count) => {
  if (count >= 10000) {
    return (count / 10000).toFixed(1) + '万'
  }
  return count.toString()
}

// 创建新小说
const createNovel = () => {
  router.push('/client/novels/new')
}

// 打开小说
const openNovel = (novel) => {
  router.push(`/client/novels/${novel.id}/edit`)
}

// 处理操作
const handleAction = async ({ action, novel }) => {
  switch (action) {
    case 'delete':
      await deleteNovel(novel)
      break
  }
}



// 删除小说
const deleteNovel = async (novel) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除小说「${novel.title}」吗？此操作不可恢复。`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    loading.value = true
    await novelAPI.deleteNovel(novel.id)
    ElMessage.success('删除成功')
    loadNovels()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败：' + (error.message || '未知错误'))
    }
  } finally {
    loading.value = false
  }
}

// 分页处理
const handleSizeChange = (val) => {
  pageSize.value = val
  currentPage.value = 1
  loadNovels()
}

const handleCurrentChange = (val) => {
  currentPage.value = val
  loadNovels()
}

// 加载小说数据
const loadNovels = async () => {
  try {
    loading.value = true
    const params = {
      page: currentPage.value,
      limit: pageSize.value,
      sort_by: sortBy.value,
      sort_order: 'DESC'
    }
    
    // 添加搜索条件
    if (searchQuery.value) {
      params.search = searchQuery.value
    }
    
    // 添加状态筛选
    if (statusFilter.value) {
      params.status = statusFilter.value
    }
    
    // 添加题材筛选
    if (genreFilter.value) {
      params.genre = genreFilter.value
    }
    
    const response = await novelAPI.getMyNovels(params)
    novels.value = response.data.novels || []
    totalNovels.value = response.data.pagination?.total_count || 0
  } catch (error) {
    ElMessage.error('加载小说列表失败：' + (error.message || '未知错误'))
    novels.value = []
    totalNovels.value = 0
  } finally {
    loading.value = false
  }
}

// 加载小说类型
const loadGenreOptions = async () => {
  try {
    const response = await novelTypeAPI.getAvailableNovelTypes()
    genreOptions.value = response.data || []
  } catch (error) {
    console.error('加载小说类型失败：', error)
    genreOptions.value = []
  }
}

// 监听筛选条件变化
watch([searchQuery, statusFilter, genreFilter, sortBy], () => {
  currentPage.value = 1
  loadNovels()
}, { deep: true })

onMounted(() => {
  loadGenreOptions()
  loadNovels()
})
</script>

<style scoped>
.novel-list {
  width: 100%;
  margin: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.page-header h1 {
  margin: 0;
  color: #333;
  font-size: 28px;
  font-weight: bold;
}

.search-bar {
  margin-bottom: 30px;
  padding: 20px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.novels-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.novel-card {
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.novel-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.novel-cover {
  height: 120px;
  background: #f5f7fa;
  border-radius: 4px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.novel-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.default-cover {
  color: #c0c4cc;
}

.novel-info {
  padding-right: 30px;
}

.novel-title {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: bold;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.novel-description {
  margin: 0 0 12px 0;
  color: #666;
  font-size: 14px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.novel-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.genre-tag {
  margin-left: 8px;
}

.novel-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.tag-item {
  font-size: 11px;
  padding: 2px 6px;
}

.word-count {
  color: #999;
  font-size: 12px;
}

.novel-time {
  color: #999;
  font-size: 12px;
}

.novel-actions {
  position: absolute;
  top: 16px;
  right: 16px;
}

.pagination {
  display: flex;
  justify-content: center;
  margin-top: 30px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .novels-grid {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 15px;
  }
  
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }
  
  .search-bar .el-row {
    flex-direction: column;
  }
  
  .search-bar .el-col {
    margin-bottom: 10px;
  }
}
</style>