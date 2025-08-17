<template>
  <div class="novel-management">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title">小说管理</h1>
      <p class="page-desc">管理系统中的所有小说内容</p>
    </div>

    <!-- 操作栏 -->
    <div class="action-bar">
      <div class="search-section">
        <el-input
          v-model="searchQuery"
          placeholder="搜索小说标题或作者"
          style="width: 300px"
          clearable
          @input="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-select v-model="statusFilter" placeholder="发布状态" style="width: 120px; margin-left: 12px" @change="handleSearch">
          <el-option label="全部" value="" />
          <el-option label="策划中" value="planning" />
          <el-option label="写作中" value="writing" />
          <el-option label="暂停" value="paused" />
          <el-option label="已完成" value="completed" />
          <el-option label="已发布" value="published" />
          <el-option label="已归档" value="archived" />
        </el-select>
        <el-select v-model="typeFilter" placeholder="小说类型" style="width: 120px; margin-left: 12px" @change="handleSearch">
          <el-option label="全部" value="" />
          <el-option 
            v-for="type in typeOptions" 
            :key="type.id" 
            :label="type.name" 
            :value="type.name" 
          />
        </el-select>
      </div>
      <div class="action-buttons">
        <el-button @click="exportNovels">
          <el-icon><Download /></el-icon>
          导出
        </el-button>
        <el-button type="danger" @click="batchDelete" :disabled="selectedNovels.length === 0">
          <el-icon><Delete /></el-icon>
          批量删除
        </el-button>
      </div>
    </div>

    <!-- 小说表格 -->
    <el-card shadow="hover">
      <el-table
        :data="filteredNovels"
        style="width: 100%"
        v-loading="loading"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="封面" width="80">
          <template #default="{ row }">
            <el-image
              :src="getCoverImageUrl(row.cover_image)"
              :preview-src-list="[getCoverImageUrl(row.cover_image)]"
              style="width: 50px; height: 70px"
              fit="cover"
              preview-teleported
            >
              <template #error>
                <div class="image-slot">
                  <el-icon><Picture /></el-icon>
                </div>
              </template>
            </el-image>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="小说标题" min-width="200" show-overflow-tooltip />
        <el-table-column prop="protagonist" label="主角" width="120" />
        <el-table-column label="类型" width="100">
          <template #default="{ row }">
            <el-tag size="small">{{ getTypeLabel(row.genre) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="标签" width="150">
          <template #default="{ row }">
            <div class="tags-container">
              <el-tag
                v-for="tag in getTagsArray(row.tags)"
                :key="tag"
                size="small"
                type="warning"
                class="tag-item"
              >
                {{ tag }}
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag 
              :type="getStatusType(row.status)" 
              size="small"
            >
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="current_word_count" label="字数" width="100">
          <template #default="{ row }">
            {{ formatWordCount(row.current_word_count) }}
          </template>
        </el-table-column>
        <el-table-column prop="chapter_count" label="章节数" width="100" />
        <el-table-column prop="view_count" label="阅读量" width="100">
          <template #default="{ row }">
            {{ formatNumber(row.view_count) }}
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column prop="updated_at" label="更新时间" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.updated_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="viewNovel(row)">
              查看
            </el-button>
            <el-button type="warning" size="small" @click="editNovel(row)">
              编辑
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 小说详情对话框 -->
    <el-dialog
      v-model="novelDetailVisible"
      title="小说详情"
      width="800px"
    >
      <div v-if="selectedNovel" class="novel-detail">
        <div class="detail-header">
          <el-image
            :src="getCoverImageUrl(selectedNovel.cover_image)"
            style="width: 120px; height: 160px"
            fit="cover"
          >
            <template #error>
              <div class="image-slot">
                <el-icon><Picture /></el-icon>
              </div>
            </template>
          </el-image>
          <div class="detail-info">
            <h2>{{ selectedNovel.title }}</h2>
            <p><strong>主角：</strong>{{ selectedNovel.protagonist || '未设置' }}</p>
            <p><strong>类型：</strong>{{ getTypeLabel(selectedNovel.genre) }}</p>
            <p><strong>状态：</strong>
              <el-tag :type="getStatusType(selectedNovel.status)" size="small">
                {{ getStatusLabel(selectedNovel.status) }}
              </el-tag>
            </p>
            <p><strong>字数：</strong>{{ formatWordCount(selectedNovel.current_word_count) }}</p>
            <p><strong>章节数：</strong>{{ selectedNovel.chapter_count || 0 }}</p>
            <p><strong>阅读量：</strong>{{ formatNumber(selectedNovel.view_count) }}</p>
          </div>
        </div>
        <div class="detail-content">
          <h3>简介</h3>
          <p>{{ selectedNovel.summary || '暂无简介' }}</p>
          <h3>标签</h3>
          <div class="tags">
            <el-tag 
              v-for="tag in (selectedNovel.tags ? selectedNovel.tags.split(',').filter(t => t.trim()) : [])" 
              :key="tag" 
              style="margin-right: 8px"
            >
              {{ tag.trim() }}
            </el-tag>
            <span v-if="!selectedNovel.tags || !selectedNovel.tags.trim()" style="color: #999;">暂无标签</span>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api, { novelAPI, novelTypeAPI } from '@/api'
import {
  Search,
  Download,
  Delete,
  Picture,
  ArrowDown
} from '@element-plus/icons-vue'
import { getCoverImageUrl } from '@/utils/imageUtils'
import { formatDateTime } from '@/utils/date'

// 响应式数据
const loading = ref(false)
const searchQuery = ref('')
const statusFilter = ref('')
const typeFilter = ref('')
const typeOptions = ref([])
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)
const selectedNovels = ref([])
const novelDetailVisible = ref(false)
const selectedNovel = ref(null)

// 小说列表数据
const novels = ref([])

// 过滤后的小说列表（现在直接返回API数据，过滤在服务端完成）
const filteredNovels = computed(() => {
  return novels.value
})

// 工具方法
const getTypeLabel = (genre) => {
  const genreMap = {
    '科幻': '科幻',
    '奇幻': '奇幻', 
    '都市': '都市',
    '历史': '历史',
    '悬疑': '悬疑',
    fantasy: '玄幻',
    urban: '都市',
    scifi: '科幻',
    history: '历史'
  }
  return genreMap[genre] || genre
}

const getStatusLabel = (status) => {
  const statusMap = {
    planning: '策划中',
    writing: '写作中',
    paused: '暂停',
    completed: '已完成',
    published: '已发布',
    archived: '已归档'
  }
  return statusMap[status] || status
}

const getStatusType = (status) => {
  const typeMap = {
    planning: 'info',
    writing: 'primary',
    paused: 'warning',
    completed: 'success',
    published: 'success',
    archived: 'danger'
  }
  return typeMap[status] || ''
}

const formatWordCount = (count) => {
  if (!count) return '0字'
  if (count >= 10000) {
    return (count / 10000).toFixed(1) + '万字'
  }
  return count + '字'
}

const getTagsArray = (tags) => {
  if (!tags) return []
  if (Array.isArray(tags)) return tags
  if (typeof tags === 'string') {
    return tags.split(',').map(tag => tag.trim()).filter(tag => tag)
  }
  return []
}

const formatNumber = (num) => {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + '万'
  }
  return num.toString()
}

// 方法
const handleSearch = () => {
  currentPage.value = 1
  loadNovels()
}

const handleSelectionChange = (selection) => {
  selectedNovels.value = selection
}

const handleSizeChange = (size) => {
  pageSize.value = size
  currentPage.value = 1
  loadNovels()
}

const handleCurrentChange = (page) => {
  currentPage.value = page
  loadNovels()
}

const viewNovel = async (novel) => {
      try {
        loading.value = true
        const response = await novelAPI.getNovel(novel.id)
        selectedNovel.value = response.data
        novelDetailVisible.value = true
      } catch (error) {
        console.error('获取小说详情失败:', error)
        ElMessage.error('获取小说详情失败')
      } finally {
        loading.value = false
      }
    }

const editNovel = (novel) => {
  ElMessage.info('编辑功能开发中')
}



const batchDelete = async () => {
  try {
    await ElMessageBox.confirm(`确定要删除选中的 ${selectedNovels.value.length} 部小说吗？此操作不可恢复！`, '确认批量删除', {
      type: 'warning'
    })
    
    const idsToDelete = selectedNovels.value.map(novel => novel.id)
    
    // 调用批量删除API
    const response = await novelAPI.batchDeleteNovels(idsToDelete)
    
    // 从本地列表中移除已删除的小说
    novels.value = novels.value.filter(novel => !idsToDelete.includes(novel.id))
    selectedNovels.value = []
    
    ElMessage.success(`成功删除 ${response.data.deleted_count} 部小说`)
  } catch (error) {
    if (error.message) {
      ElMessage.error(error.message)
    }
  }
}

const exportNovels = () => {
  ElMessage.info('导出功能开发中')
}

const loadNovels = async () => {
  loading.value = true
  try {
    const params = {
      page: currentPage.value,
      limit: pageSize.value,
      search: searchQuery.value || undefined,
      genre: typeFilter.value || undefined,
      status: statusFilter.value || undefined,
      sort_by: 'updated_at',
      sort_order: 'DESC'
    }
    
    const response = await novelAPI.getAdminNovels(params)
    novels.value = response.data.novels || []
    total.value = response.data.pagination?.total_count || 0
  } catch (error) {
    ElMessage.error('加载小说列表失败')
    console.error('Load novels error:', error)
  } finally {
    loading.value = false
  }
}

// 加载小说类型
const loadTypeOptions = async () => {
  try {
    const response = await novelTypeAPI.getAvailableNovelTypes()
    typeOptions.value = response.data || []
  } catch (error) {
    console.error('加载小说类型失败：', error)
    typeOptions.value = []
  }
}

onMounted(() => {
  loadTypeOptions()
  loadNovels()
})
</script>

<style scoped>
.novel-management {
  padding: 20px;
}

.page-header {
  margin-bottom: 24px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #333;
  margin: 0 0 8px 0;
}

.page-desc {
  color: #666;
  margin: 0;
}

.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 16px;
}

.search-section {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.action-buttons {
  display: flex;
  gap: 12px;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.image-slot {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  background: #f5f7fa;
  color: #909399;
  font-size: 20px;
}

.novel-detail {
  padding: 20px;
}

.detail-header {
  display: flex;
  gap: 20px;
  margin-bottom: 24px;
}

.detail-info {
  flex: 1;
}

.detail-info h2 {
  margin: 0 0 16px 0;
  font-size: 24px;
  color: #333;
}

.detail-info p {
  margin: 8px 0;
  color: #666;
}

.detail-content h3 {
  margin: 20px 0 12px 0;
  font-size: 16px;
  color: #333;
}

.detail-content p {
  line-height: 1.6;
  color: #666;
}

.tags {
  margin-top: 8px;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  max-width: 140px;
}

.tag-item {
  font-size: 11px;
  padding: 2px 4px;
  max-width: 60px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .action-bar {
    flex-direction: column;
    align-items: stretch;
  }
  
  .search-section {
    justify-content: center;
  }
  
  .action-buttons {
    justify-content: center;
  }
  
  .detail-header {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
}
</style>