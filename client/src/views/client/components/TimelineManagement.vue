<template>
  <div class="timeline-management">
    <!-- 操作栏 -->
    <div class="action-bar">
      <el-button type="primary" @click="showCreateDialog">
        <el-icon><Plus /></el-icon>
        新增事件线
      </el-button>
      <el-button 
        type="danger" 
        :disabled="selectedTimelines.length === 0"
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
      
      <div class="search-box">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索事件线名称..."
          clearable
          @input="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div v-if="stats" class="stats-cards">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-number">{{ stats.total_timelines || 0 }}</div>
              <div class="stat-label">总事件线数</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-number">{{ stats.completion_stats?.completed || 0 }}</div>
              <div class="stat-label">已完成事件线</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-number">{{ stats.total_actual_words || 0 }}</div>
              <div class="stat-label">总字数</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-number">{{ Math.round(stats.average_completion || 0) }}%</div>
              <div class="stat-label">平均完成度</div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 事件线列表 -->
    <el-table
      v-loading="loading"
      :data="timelineList"
      @selection-change="handleSelectionChange"
      stripe
      border
    >
      <el-table-column type="selection" width="55" />
      <el-table-column prop="name" label="名称" width="150" />
      <el-table-column prop="type" label="类型" width="100">
        <template #default="{ row }">
          <el-tag :type="getTypeTagType(row.type)" size="small">
            {{ row.type || '未分类' }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column prop="completion_percentage" label="完成度" width="120">
        <template #default="{ row }">
          <el-progress
            :percentage="row.completion_percentage || 0"
            :stroke-width="8"
            :show-text="true"
            :color="getProgressColor(row.completion_percentage)"
          />
        </template>
      </el-table-column>
      <el-table-column prop="word_count_estimate" label="预估字数" width="100" />
      <el-table-column prop="actual_word_count" label="实际字数" width="100" />
      <el-table-column prop="start_date" label="开始日期" width="120">
        <template #default="{ row }">
          {{ formatDate(row.start_date, 'date') }}
        </template>
      </el-table-column>
      <el-table-column prop="end_date" label="结束日期" width="120">
        <template #default="{ row }">
          {{ formatDate(row.end_date, 'date') }}
        </template>
      </el-table-column>
      <el-table-column prop="description" label="描述" show-overflow-tooltip />
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
          <el-col :span="12">
            <el-form-item label="名称" prop="name">
              <el-input v-model="formData.name" placeholder="请输入事件线名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="类型" prop="type">
              <el-select v-model="formData.type" placeholder="请选择事件线类型">
                <el-option label="主线" value="主线" />
                <el-option label="支线" value="支线" />
                <el-option label="暗线" value="暗线" />
                <el-option label="感情线" value="感情线" />
                <el-option label="成长线" value="成长线" />
                <el-option label="冲突线" value="冲突线" />
                <el-option label="其他" value="其他" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">

          <el-col :span="12">
            <el-form-item label="完成度" prop="completion_percentage">
              <el-slider
                v-model="formData.completion_percentage"
                :min="0"
                :max="100"
                show-input
                :format-tooltip="val => `${val}%`"
              />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="预估字数" prop="word_count_estimate">
              <el-input-number
                v-model="formData.word_count_estimate"
                :min="0"
                :step="1000"
                placeholder="预估字数"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="实际字数" prop="actual_word_count">
              <el-input-number
                v-model="formData.actual_word_count"
                :min="0"
                :step="100"
                placeholder="实际字数"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="开始日期" prop="start_date">
              <el-date-picker
                v-model="formData.start_date"
                type="date"
                placeholder="选择开始日期"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="结束日期" prop="end_date">
              <el-date-picker
                v-model="formData.end_date"
                type="date"
                placeholder="选择结束日期"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="formData.description"
            type="textarea"
            :rows="3"
            placeholder="请描述事件线概要"
          />
        </el-form-item>
        
        <el-form-item label="详细内容" prop="content">
          <el-input
            v-model="formData.content"
            type="textarea"
            :rows="6"
            placeholder="请详细描述事件线的发展过程、关键节点等"
          />
        </el-form-item>
        
        <el-form-item label="关联人物" prop="related_characters">
          <el-input
            v-model="formData.related_characters"
            type="textarea"
            :rows="2"
            placeholder="请列出相关人物（用逗号分隔）"
          />
        </el-form-item>
        
        <el-form-item label="关键事件" prop="key_events">
          <el-input
            v-model="formData.key_events"
            type="textarea"
            :rows="3"
            placeholder="请列出关键事件节点"
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
      title="事件线详情"
      width="800px"
    >
      <div v-if="currentTimeline" class="timeline-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="名称">{{ currentTimeline.name }}</el-descriptions-item>
          <el-descriptions-item label="类型">
            <el-tag :type="getTypeTagType(currentTimeline.type)" size="small">
              {{ currentTimeline.type || '未分类' }}
            </el-tag>
          </el-descriptions-item>

          <el-descriptions-item label="完成度">
            <el-progress
              :percentage="currentTimeline.completion_percentage || 0"
              :stroke-width="8"
              :show-text="true"
              :color="getProgressColor(currentTimeline.completion_percentage)"
            />
          </el-descriptions-item>
          <el-descriptions-item label="预估字数">{{ currentTimeline.word_count_estimate || 0 }}</el-descriptions-item>
          <el-descriptions-item label="实际字数">{{ currentTimeline.actual_word_count || 0 }}</el-descriptions-item>
          <el-descriptions-item label="开始日期">{{ formatDate(currentTimeline.start_date, 'date') }}</el-descriptions-item>
          <el-descriptions-item label="结束日期">{{ formatDate(currentTimeline.end_date, 'date') }}</el-descriptions-item>
          <el-descriptions-item label="描述" :span="2">
            {{ currentTimeline.description || '暂无描述' }}
          </el-descriptions-item>
          <el-descriptions-item label="详细内容" :span="2">
            <div class="detail-content">{{ currentTimeline.content || '暂无内容' }}</div>
          </el-descriptions-item>
          <el-descriptions-item label="关联人物" :span="2">
            {{ currentTimeline.related_characters || '暂无关联人物' }}
          </el-descriptions-item>
          <el-descriptions-item label="关键事件" :span="2">
            <div class="detail-content">{{ currentTimeline.key_events || '暂无关键事件' }}</div>
          </el-descriptions-item>
          <el-descriptions-item label="创建时间" :span="2">
            {{ formatDate(currentTimeline.created_at) }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Delete, Refresh, Search, DataAnalysis } from '@element-plus/icons-vue'
import { timelineOps, crudUtils } from '@/utils/crudOperations'

const props = defineProps({
  novelId: {
    type: [String, Number],
    required: true
  }
})

// 响应式数据
const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const detailDialogVisible = ref(false)
const isEdit = ref(false)
const timelineList = ref([])
const selectedTimelines = ref([])
const currentTimeline = ref(null)
const searchKeyword = ref('')
const formRef = ref()
const stats = ref(null)

// 分页数据
const pagination = reactive({
  page: 1,
  limit: 10,
  total: 0
})

// 表单数据
const formData = reactive({
  name: '',
  type: '',

  completion_percentage: 0,
  word_count_estimate: null,
  actual_word_count: null,
  start_date: null,
  end_date: null,
  description: '',
  content: '',
  related_characters: '',
  key_events: '',
  novel_id: props.novelId
})

// 表单验证规则
const formRules = {
  name: [
    { required: true, message: '请输入事件线名称', trigger: 'blur' },
    { min: 1, max: 100, message: '名称长度在1到100个字符', trigger: 'blur' }
  ]
}

// 计算属性
const dialogTitle = computed(() => {
  return isEdit.value ? '编辑事件线' : '新增事件线'
})

// 获取类型标签样式
const getTypeTagType = (type) => {
  const typeMap = {
    '主线': 'danger',
    '支线': 'primary',
    '暗线': 'info',
    '感情线': 'success',
    '成长线': 'warning',
    '冲突线': 'danger'
  }
  return typeMap[type] || 'info'
}



// 获取进度条颜色
const getProgressColor = (percentage) => {
  if (percentage >= 80) return '#67c23a'
  if (percentage >= 50) return '#e6a23c'
  if (percentage >= 20) return '#f56c6c'
  return '#909399'
}

// 防抖搜索
const handleSearch = crudUtils.debounce(() => {
  pagination.page = 1
  loadTimelineList()
}, 300)

// 加载事件线列表
const loadTimelineList = async () => {
  loading.value = true
  try {
    const params = crudUtils.formatPaginationParams(
      pagination.page,
      pagination.limit,
      {
        novel_id: props.novelId,
        search: searchKeyword.value,
        ...crudUtils.formatSortParams('created_at', 'DESC')
      }
    )
    
    const result = await timelineOps.getList(params)
    timelineList.value = result.data || []
    pagination.total = result.total || 0
  } catch (error) {
    crudUtils.handleApiError(error, '获取事件线列表失败')
  } finally {
    loading.value = false
  }
}

// 加载统计信息
const loadStats = async () => {
  try {
    const result = await timelineOps.getTimelineStats(props.novelId)
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
const showEditDialog = (timeline) => {
  isEdit.value = true
  Object.assign(formData, {
    ...timeline,
    start_date: timeline.start_date ? new Date(timeline.start_date) : null,
    end_date: timeline.end_date ? new Date(timeline.end_date) : null
  })
  dialogVisible.value = true
}

// 显示详情对话框
const showDetailDialog = (timeline) => {
  currentTimeline.value = timeline
  detailDialogVisible.value = true
}

// 重置表单
const resetForm = () => {
  if (formRef.value) {
    formRef.value.resetFields()
  }
  Object.assign(formData, {
    name: '',
    type: '',

    completion_percentage: 0,
    word_count_estimate: null,
    actual_word_count: null,
    start_date: null,
    end_date: null,
    description: '',
    content: '',
    related_characters: '',
    key_events: '',
    novel_id: props.novelId
  })
}

// 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    submitting.value = true
    
    // 格式化日期
    const submitData = {
      ...formData,
      start_date: formData.start_date ? formData.start_date.toISOString().split('T')[0] : null,
      end_date: formData.end_date ? formData.end_date.toISOString().split('T')[0] : null
    }
    
    if (isEdit.value) {
      await timelineOps.update(submitData.id, submitData, () => {
        dialogVisible.value = false
        loadTimelineList()
        loadStats()
      })
    } else {
      await timelineOps.createTimeline(submitData, () => {
        dialogVisible.value = false
        loadTimelineList()
        loadStats()
      })
    }
  } catch (error) {
    console.error('表单验证失败:', error)
  } finally {
    submitting.value = false
  }
}

// 删除事件线
const handleDelete = async (timeline) => {
  await timelineOps.delete(timeline.id, timeline.name, () => {
    loadTimelineList()
    loadStats()
  })
}

// 批量删除
const handleBatchDelete = async () => {
  const ids = selectedTimelines.value.map(item => item.id)
  await timelineOps.batchDelete(ids, () => {
    selectedTimelines.value = []
    loadTimelineList()
    loadStats()
  })
}

// 选择变化
const handleSelectionChange = (selection) => {
  selectedTimelines.value = selection
}

// 分页变化
const handleSizeChange = (size) => {
  pagination.limit = size
  pagination.page = 1
  loadTimelineList()
}

const handleCurrentChange = (page) => {
  pagination.page = page
  loadTimelineList()
}

// 刷新列表
const refreshList = () => {
  pagination.page = 1
  searchKeyword.value = ''
  loadTimelineList()
  loadStats()
}

// 格式化日期
const formatDate = (dateString, type = 'datetime') => {
  if (!dateString) return ''
  const date = new Date(dateString)
  if (type === 'date') {
    return date.toLocaleDateString('zh-CN')
  }
  return date.toLocaleString('zh-CN')
}

// 监听小说ID变化
watch(() => props.novelId, (newId) => {
  if (newId) {
    formData.novel_id = newId
    loadTimelineList()
    loadStats()
  }
}, { immediate: true })

// 组件挂载时加载数据
onMounted(() => {
  if (props.novelId) {
    loadTimelineList()
    loadStats()
  }
})
</script>

<style scoped>
.timeline-management {
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

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.timeline-detail {
  padding: 10px 0;
}

.detail-content {
  max-height: 200px;
  overflow-y: auto;
  white-space: pre-wrap;
  line-height: 1.6;
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
  
  .stats-cards .el-col {
    margin-bottom: 10px;
  }
}
</style>