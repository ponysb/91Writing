<template>
  <div class="corpus-management">
    <!-- 操作栏 -->
    <div class="action-bar">
      <el-button type="primary" @click="showCreateDialog">
        <el-icon><Plus /></el-icon>
        新增语料
      </el-button>
      <el-button 
        type="danger" 
        :disabled="selectedCorpus.length === 0"
        @click="handleBatchDelete"
      >
        <el-icon><Delete /></el-icon>
        批量删除
      </el-button>
      <el-button @click="refreshList">
        <el-icon><Refresh /></el-icon>
        刷新
      </el-button>
      <el-button @click="loadStats">
        <el-icon><DataAnalysis /></el-icon>
        统计信息
      </el-button>
      <el-button @click="showRecommendDialog">
        <el-icon><MagicStick /></el-icon>
        推荐语料
      </el-button>
      
      <div class="search-box">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索语料标题或内容..."
          clearable
          @input="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
      </div>
    </div>

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <el-select v-model="filters.type" placeholder="内容类型" clearable @change="handleFilterChange">
        <el-option label="描写" value="描写" />
        <el-option label="对话" value="对话" />
        <el-option label="情节" value="情节" />
        <el-option label="背景" value="背景" />
        <el-option label="心理" value="心理" />
        <el-option label="动作" value="动作" />
        <el-option label="其他" value="其他" />
      </el-select>
    </div>

    <!-- 统计卡片 -->
    <div v-if="stats" class="stats-cards">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-number">{{ stats.total_corpus || 0 }}</div>
              <div class="stat-label">总语料数</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-number">{{ stats.total_words || 0 }}</div>
              <div class="stat-label">总字数</div>
            </div>
          </el-card>
        </el-col>

      </el-row>
    </div>

    <!-- 语料列表 -->
    <el-table
      v-loading="loading"
      :data="corpusList"
      @selection-change="handleSelectionChange"
      stripe
      border
    >
      <el-table-column type="selection" width="55" />
      <el-table-column prop="title" label="标题" width="200" show-overflow-tooltip />
      <el-table-column prop="type" label="内容类型" width="100">
        <template #default="{ row }">
          <el-tag :type="getTypeTagType(row.type)" size="small">
            {{ getTypeDisplayName(row.type) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="word_count" label="字数" width="80" />
      <el-table-column prop="content" label="内容预览" show-overflow-tooltip>
        <template #default="{ row }">
          {{ getContentPreview(row.content) }}
        </template>
      </el-table-column>
      <el-table-column prop="created_at" label="创建时间" width="180">
        <template #default="{ row }">
          {{ formatDate(row.created_at) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="showDetailDialog(row)">
            查看
          </el-button>
          <el-button size="small" type="primary" @click="showEditDialog(row)">
            编辑
          </el-button>
          <el-button size="small" type="danger" @click="handleDelete(row)">
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="pagination-wrapper">
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.limit"
        :total="pagination.total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>

    <!-- 创建/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="700px"
      @close="resetForm"
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="120px"
      >
        <el-row :gutter="20">
          <el-col :span="16">
            <el-form-item label="标题" prop="title">
              <el-input v-model="formData.title" placeholder="请输入语料标题" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="内容类型" prop="type">
              <el-select v-model="formData.type" placeholder="请选择类型">
                <el-option label="描写" value="描写" />
                <el-option label="对话" value="对话" />
                <el-option label="情节" value="情节" />
                <el-option label="背景" value="背景" />
                <el-option label="心理" value="心理" />
                <el-option label="动作" value="动作" />
                <el-option label="其他" value="其他" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item label="内容" prop="content">
          <el-input
            v-model="formData.content"
            type="textarea"
            :rows="8"
            placeholder="请输入语料内容"
            @input="updateWordCount"
          />
          <div class="word-count-tip">字数：{{ formData.word_count || 0 }}</div>
        </el-form-item>
        
        <el-form-item label="标签" prop="tags">
          <el-input
            v-model="formData.tags"
            placeholder="请输入标签，用逗号分隔"
          />
        </el-form-item>
        
        <el-form-item label="来源" prop="source">
          <el-input
            v-model="formData.source"
            placeholder="请输入语料来源（可选）"
          />
        </el-form-item>
        
        <el-form-item label="备注" prop="notes">
          <el-input
            v-model="formData.notes"
            type="textarea"
            :rows="3"
            placeholder="请输入备注信息（可选）"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmit" :loading="submitting">
            {{ isEdit ? '更新' : '创建' }}
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="语料详情"
      width="800px"
    >
      <div v-if="currentCorpus" class="corpus-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="标题">{{ currentCorpus.title }}</el-descriptions-item>
          <el-descriptions-item label="内容类型">
            <el-tag :type="getTypeTagType(currentCorpus.type)" size="small">
              {{ getTypeDisplayName(currentCorpus.type) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="字数">{{ currentCorpus.word_count || 0 }}</el-descriptions-item>
          <el-descriptions-item label="标签" :span="2">
            {{ currentCorpus.tags || '无标签' }}
          </el-descriptions-item>
          <el-descriptions-item label="来源" :span="2">
            {{ currentCorpus.source || '未知来源' }}
          </el-descriptions-item>
          <el-descriptions-item label="内容" :span="2">
            <div class="detail-content">{{ currentCorpus.content || '暂无内容' }}</div>
          </el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">
            {{ currentCorpus.notes || '无备注' }}
          </el-descriptions-item>
          <el-descriptions-item label="创建时间" :span="2">
            {{ formatDate(currentCorpus.created_at) }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>

    <!-- 推荐语料对话框 -->
    <el-dialog
      v-model="recommendDialogVisible"
      title="推荐语料"
      width="600px"
    >
      <el-form :model="recommendCriteria" label-width="120px">
        <el-form-item label="推荐类型">
          <el-select v-model="recommendCriteria.type" placeholder="选择语料类型">
            <el-option label="描写" value="描写" />
            <el-option label="对话" value="对话" />
            <el-option label="情节" value="情节" />
            <el-option label="背景" value="背景" />
            <el-option label="心理" value="心理" />
            <el-option label="动作" value="动作" />
          </el-select>
        </el-form-item>
        

        
        <el-form-item label="关键词">
          <el-input
            v-model="recommendCriteria.keywords"
            placeholder="输入关键词，用逗号分隔"
          />
        </el-form-item>
        
        <el-form-item label="推荐数量">
          <el-input-number
            v-model="recommendCriteria.limit"
            :min="1"
            :max="50"
            :step="1"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="recommendDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleRecommend" :loading="recommending">
            获取推荐
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Delete, Refresh, Search, DataAnalysis, MagicStick } from '@element-plus/icons-vue'
import { corpusOps, crudUtils } from '@/utils/crudOperations'

const props = defineProps({
  novelId: {
    type: [String, Number],
    required: true
  }
})

// 响应式数据
const loading = ref(false)
const submitting = ref(false)
const recommending = ref(false)
const dialogVisible = ref(false)
const detailDialogVisible = ref(false)
const recommendDialogVisible = ref(false)
const isEdit = ref(false)
const corpusList = ref([])
const selectedCorpus = ref([])
const currentCorpus = ref(null)
const searchKeyword = ref('')
const formRef = ref()
const stats = ref(null)

// 筛选条件
const filters = reactive({
  type: ''
})

// 推荐条件
const recommendCriteria = reactive({
  type: '',
  keywords: '',
  limit: 10
})

// 分页数据
const pagination = reactive({
  page: 1,
  limit: 10,
  total: 0
})

// 表单数据
const formData = reactive({
  title: '',
  type: '',
  content: '',
  word_count: 0,
  tags: '',
  source: '',
  notes: '',
  novel_id: props.novelId
})

// 表单验证规则
const formRules = {
  title: [
    { required: true, message: '请输入语料标题', trigger: 'blur' },
    { min: 1, max: 200, message: '标题长度在1到200个字符', trigger: 'blur' }
  ],
  content: [
    { required: true, message: '请输入语料内容', trigger: 'blur' },
    { min: 10, message: '内容至少10个字符', trigger: 'blur' }
  ]
}

// 计算属性
const dialogTitle = computed(() => {
  return isEdit.value ? '编辑语料' : '新增语料'
})

// 获取类型标签样式
const getTypeTagType = (type) => {
  const typeMap = {
    '描写': 'primary',
    '对话': 'success',
    '情节': 'warning',
    '背景': 'info',
    '心理': 'danger',
    '动作': 'info'
  }
  return typeMap[type] || 'info'
}

// 获取类型中文显示名称
const getTypeDisplayName = (type) => {
  const displayMap = {
    '描写': '描写',
    '对话': '对话',
    '情节': '情节',
    '背景': '背景',
    '心理': '心理',
    '动作': '动作',
    '其他': '其他'
  }
  return displayMap[type] || '未分类'
}



// 获取内容预览
const getContentPreview = (content) => {
  if (!content) return ''
  return content.length > 50 ? content.substring(0, 50) + '...' : content
}

// 更新字数
const updateWordCount = () => {
  formData.word_count = formData.content ? formData.content.length : 0
}

// 防抖搜索
const handleSearch = crudUtils.debounce(() => {
  pagination.page = 1
  loadCorpusList()
}, 300)

// 筛选变化
const handleFilterChange = () => {
  pagination.page = 1
  loadCorpusList()
}

// 加载语料列表
const loadCorpusList = async () => {
  loading.value = true
  try {
    const params = crudUtils.formatPaginationParams(
      pagination.page,
      pagination.limit,
      {
        novel_id: props.novelId,
        search: searchKeyword.value,
        ...filters,
        ...crudUtils.formatSortParams('created_at', 'DESC')
      }
    )
    

    
    const result = await corpusOps.getList(params)
    corpusList.value = result.data || []
    pagination.total = result.total || 0
  } catch (error) {
    crudUtils.handleApiError(error, '获取语料列表失败')
  } finally {
    loading.value = false
  }
}

// 加载统计信息
const loadStats = async () => {
  try {
    const result = await corpusOps.getCorpusStats(props.novelId)
    stats.value = result
  } catch (error) {
    console.error('获取统计信息失败:', error)
  }
}

// 显示创建对话框
const showCreateDialog = () => {
  isEdit.value = false
  resetForm()
  dialogVisible.value = true
}

// 显示编辑对话框
const showEditDialog = (corpus) => {
  isEdit.value = true
  Object.assign(formData, corpus)
  dialogVisible.value = true
}

// 显示详情对话框
const showDetailDialog = (corpus) => {
  currentCorpus.value = corpus
  detailDialogVisible.value = true
}

// 显示推荐对话框
const showRecommendDialog = () => {
  recommendDialogVisible.value = true
}

// 重置表单
const resetForm = () => {
  if (formRef.value) {
    formRef.value.resetFields()
  }
  Object.assign(formData, {
    title: '',
    type: '',
    content: '',
    word_count: 0,
    tags: '',
    source: '',
    notes: '',
    novel_id: props.novelId
  })
}

// 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    submitting.value = true
    
    if (isEdit.value) {
      await corpusOps.update(formData.id, formData, () => {
        dialogVisible.value = false
        loadCorpusList()
        loadStats()
      }, (error) => {
        // 使用统一的错误处理方法
        crudUtils.handleApiError(error, '更新语料失败')
      })
    } else {
      await corpusOps.createCorpus(formData, () => {
        dialogVisible.value = false
        loadCorpusList()
        loadStats()
      }, (error) => {
        // 使用统一的错误处理方法
        crudUtils.handleApiError(error, '创建语料失败')
      })
    }
  } catch (error) {
    // 表单验证失败的处理
    if (error.fields) {
      // Element Plus 表单验证错误
      const firstError = Object.values(error.fields)[0][0]
      ElMessage.error(firstError.message)
    } else {
      console.error('表单验证失败:', error)
    }
  } finally {
    submitting.value = false
  }
}

// 获取推荐语料
const handleRecommend = async () => {
  recommending.value = true
  try {
    const criteria = {
      ...recommendCriteria,
      novel_id: props.novelId
    }
    
    const result = await corpusOps.recommendCorpus(criteria)
    
    if (result && result.length > 0) {
      ElMessage.success(`找到 ${result.length} 条推荐语料`)
      // 这里可以显示推荐结果，或者将推荐结果添加到当前列表
      console.log('推荐语料:', result)
    } else {
      ElMessage.info('未找到符合条件的推荐语料')
    }
    
    recommendDialogVisible.value = false
  } catch (error) {
    crudUtils.handleApiError(error, '获取推荐语料失败')
  } finally {
    recommending.value = false
  }
}

// 删除语料
const handleDelete = async (corpus) => {
  await corpusOps.delete(corpus.id, corpus.title, () => {
    loadCorpusList()
    loadStats()
  })
}

// 批量删除
const handleBatchDelete = async () => {
  const ids = selectedCorpus.value.map(item => item.id)
  await corpusOps.batchDelete(ids, () => {
    selectedCorpus.value = []
    loadCorpusList()
    loadStats()
  })
}

// 选择变化
const handleSelectionChange = (selection) => {
  selectedCorpus.value = selection
}

// 分页变化
const handleSizeChange = (size) => {
  pagination.limit = size
  pagination.page = 1
  loadCorpusList()
}

const handleCurrentChange = (page) => {
  pagination.page = page
  loadCorpusList()
}

// 刷新列表
const refreshList = () => {
  pagination.page = 1
  searchKeyword.value = ''
  Object.assign(filters, {
    type: ''
  })
  loadCorpusList()
  loadStats()
}

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleString('zh-CN')
}

// 监听小说ID变化
watch(() => props.novelId, (newId) => {
  if (newId) {
    formData.novel_id = newId
    loadCorpusList()
    loadStats()
  }
}, { immediate: true })

// 组件挂载时加载数据
onMounted(() => {
  if (props.novelId) {
    loadCorpusList()
    loadStats()
  }
})
</script>

<style scoped>
.corpus-management {
  padding: 20px;
}

.action-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.search-box {
  margin-left: auto;
  width: 300px;
}

.filter-bar {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.filter-bar .el-select {
  width: 150px;
}

.stats-cards {
  margin-bottom: 20px;
}

.stat-card {
  text-align: center;
}

.stat-content {
  padding: 10px;
}

.stat-number {
  font-size: 24px;
  font-weight: bold;
  color: #409eff;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 14px;
  color: #606266;
}

.word-count-tip {
  margin-top: 5px;
  font-size: 12px;
  color: #909399;
  text-align: right;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.corpus-detail {
  padding: 10px 0;
}

.detail-content {
  max-height: 300px;
  overflow-y: auto;
  white-space: pre-wrap;
  line-height: 1.6;
  padding: 10px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

@media (max-width: 768px) {
  .action-bar {
    flex-direction: column;
    align-items: stretch;
  }
  
  .search-box {
    margin-left: 0;
    width: 100%;
  }
  
  .filter-bar {
    flex-direction: column;
  }
  
  .filter-bar .el-select {
    width: 100%;
  }
  
  .stats-cards .el-col {
    margin-bottom: 10px;
  }
}
</style>