<template>
  <div class="ai-call-record-management">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title">AI调用记录管理</h1>
      <p class="page-desc">查看和管理AI业务调用记录</p>
    </div>



    <!-- 筛选和操作区域 -->
    <el-card class="filter-card" shadow="never">
      <div class="filter-row">
        <div class="filter-left">
          <el-select v-model="filters.business_type" placeholder="业务类型" clearable style="width: 150px" @change="handleFilterChange">
            <el-option label="AI大纲生成" value="outline" />
            <el-option label="AI人物生成" value="character" />
            <el-option label="AI对话生成" value="dialogue" />
            <el-option label="AI情节生成" value="plot" />
            <el-option label="AI文本润色" value="polish" />
            <el-option label="AI创意建议" value="creative" />
            <el-option label="AI正文生成" value="content" />
            <el-option label="AI世界观生成" value="worldview" />
            <el-option label="AI拆书分析" value="book_analyze" />
            <el-option label="AI聊天对话" value="ai_chat" />
            <el-option label="AI短篇故事生成" value="short_story" />
            <el-option label="AI短文生成" value="short_article" />
            <el-option label="AI文章生成" value="article" />
          </el-select>
          
          <el-select v-model="filters.status" placeholder="调用状态" clearable style="width: 120px" @change="handleFilterChange">
            <el-option label="成功" value="success" />
            <el-option label="失败" value="error" />
            <el-option label="超时" value="timeout" />
          </el-select>
          
          <el-select v-model="filters.model_id" placeholder="AI模型" clearable style="width: 150px" @change="handleFilterChange">
            <el-option 
              v-for="model in aiModels" 
              :key="model.id" 
              :label="model.name" 
              :value="model.id" 
            />
          </el-select>
          
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            @change="handleDateRangeChange"
            style="width: 240px"
          />
          
          <el-button type="primary" @click="loadRecords">
            <el-icon><Search /></el-icon>
            查询
          </el-button>
          
          <el-button @click="resetFilters">
            <el-icon><Refresh /></el-icon>
            重置
          </el-button>
        </div>
        
        <div class="filter-right">
          <el-button 
            type="danger" 
            :disabled="selectedRecords.length === 0"
            @click="handleBatchDelete"
          >
            <el-icon><Delete /></el-icon>
            批量删除
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- 记录列表 -->
    <el-card class="table-card" shadow="never">
      <el-table 
        v-loading="loading"
        :data="records"
        @selection-change="handleSelectionChange"
        stripe
        style="width: 100%"
      >
        <el-table-column type="selection" width="55" />
        
        <el-table-column prop="id" label="ID" min-width="80" />
        
        <el-table-column label="用户" min-width="120">
          <template #default="{ row }">
            <div class="user-info">
              <div class="username">{{ row.user?.username || '-' }}</div>
              <div class="email">{{ row.user?.email || '-' }}</div>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column label="业务类型" min-width="120">
          <template #default="{ row }">
            <el-tag :type="getBusinessTypeTagType(row.business_type)" size="small">
              {{ getBusinessTypeName(row.business_type) }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column label="AI模型" min-width="120">
          <template #default="{ row }">
            {{ row.aiModel?.name || '-' }}
          </template>
        </el-table-column>
        
        <el-table-column label="Token消耗" min-width="120">
          <template #default="{ row }">
            <div v-if="row.tokens_used">
              <div class="token-info">
                <span class="total">{{ row.tokens_used.total_tokens || 0 }}</span>
                <div class="detail">
                  输入: {{ row.tokens_used.prompt_tokens || 0 }}
                  输出: {{ row.tokens_used.completion_tokens || 0 }}
                </div>
              </div>
            </div>
            <span v-else>-</span>
          </template>
        </el-table-column>
        
        <el-table-column label="响应时间" min-width="100">
          <template #default="{ row }">
            <span v-if="row.response_time">{{ row.response_time }}ms</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        
        <el-table-column label="状态" min-width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)" size="small">
              {{ getStatusName(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="created_at" label="调用时间" min-width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.created_at) }}
          </template>
        </el-table-column>
        
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button size="small" @click="showDetailDialog(row)">
                查看详情
              </el-button>
              <el-button size="small" type="danger" @click="handleDelete(row)">
                删除
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
      
      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
        v-model:current-page="pagination.current_page"
        v-model:page-size="pagination.per_page"
        :page-sizes="[10, 20, 50, 100]"
        :total="pagination.total_count"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="loadRecords"
        @current-change="loadRecords"
      />
      </div>
    </el-card>

    <!-- 详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="AI调用记录详情"
      width="80%"
      :before-close="handleDetailDialogClose"
    >
      <div v-if="currentRecord" class="record-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="记录ID">{{ currentRecord.id }}</el-descriptions-item>
          <el-descriptions-item label="用户">{{ currentRecord.user?.username }} ({{ currentRecord.user?.email }})</el-descriptions-item>
          <el-descriptions-item label="业务类型">
            <el-tag :type="getBusinessTypeTagType(currentRecord.business_type)" size="small">
              {{ getBusinessTypeName(currentRecord.business_type) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="AI模型">{{ currentRecord.aiModel?.name }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusTagType(currentRecord.status)" size="small">
              {{ getStatusName(currentRecord.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="响应时间">{{ currentRecord.response_time }}ms</el-descriptions-item>
          <el-descriptions-item label="调用时间" :span="2">{{ formatDateTime(currentRecord.created_at) }}</el-descriptions-item>
          <el-descriptions-item label="请求参数">{{ currentRecord.request_params }}</el-descriptions-item>
          <el-descriptions-item label="IP地址">{{ currentRecord.ip_address }}</el-descriptions-item>
          <el-descriptions-item label="用户代理" :span="2">
            <div class="user-agent">{{ currentRecord.user_agent }}</div>
          </el-descriptions-item>
        </el-descriptions>
        
        <div v-if="currentRecord.tokens_used" class="token-detail">
          <h4>Token使用详情</h4>
          <el-row :gutter="20">
            <el-col :span="8">
              <el-statistic title="输入Token" :value="currentRecord.tokens_used.prompt_tokens || 0" />
            </el-col>
            <el-col :span="8">
              <el-statistic title="输出Token" :value="currentRecord.tokens_used.completion_tokens || 0" />
            </el-col>
            <el-col :span="8">
              <el-statistic title="总Token" :value="currentRecord.tokens_used.total_tokens || 0" />
            </el-col>
          </el-row>
        </div>
        
        <div v-if="currentRecord.request_params" class="request-params">
          <h4>请求参数</h4>
          <el-input
            v-model="currentRecord.request_params"
            type="textarea"
            :rows="4"
            readonly
          />
        </div>
        
        <div v-if="currentRecord.system_prompt" class="system-prompt">
          <h4>系统提示词</h4>
          <el-input
            v-model="currentRecord.system_prompt"
            type="textarea"
            :rows="6"
            readonly
          />
        </div>
        
        <div v-if="currentRecord.user_prompt" class="user-prompt">
          <h4>用户提示词</h4>
          <el-input
            v-model="currentRecord.user_prompt"
            type="textarea"
            :rows="6"
            readonly
          />
        </div>
        
        <div v-if="currentRecord.response_content" class="response-content">
          <h4>AI响应内容</h4>
          <el-input
            v-model="currentRecord.response_content"
            type="textarea"
            :rows="10"
            readonly
          />
        </div>
        
        <div v-if="currentRecord.error_message" class="error-message">
          <h4>错误信息</h4>
          <el-alert
            :title="currentRecord.error_message"
            type="error"
            :closable="false"
          />
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Search,
  Refresh,
  Delete
} from '@element-plus/icons-vue'
import { aiCallRecordAPI, aiModelAPI } from '@/api'
import { formatDateTime } from '@/utils/date'

// 响应式数据
const loading = ref(false)
const records = ref([])
const selectedRecords = ref([])
const aiModels = ref([])
const dateRange = ref([])

// 筛选条件
const filters = reactive({
  business_type: '',
  status: '',
  model_id: '',
  start_date: '',
  end_date: ''
})

// 分页信息
const pagination = reactive({
  current_page: 1,
  per_page: 20,
  total_count: 0,
  total_pages: 0
})

// 详情对话框
const detailDialogVisible = ref(false)
const currentRecord = ref(null)

// 业务类型映射
const businessTypeMap = {
  outline: '大纲生成',
  character: '人物生成',
  dialogue: '对话生成',
  plot: '情节生成',
  polish: '文本润色',
  creative: '创意建议',
  content: '正文生成',
  worldview: '世界观生成',
  book_analyze: '拆书分析'
}

// 状态映射
const statusMap = {
  success: '成功',
  error: '失败',
  timeout: '超时'
}

// 获取业务类型名称
const getBusinessTypeName = (type) => {
  const typeMap = {
    'outline': 'AI大纲生成',
    'character': 'AI人物生成',
    'dialogue': 'AI对话生成',
    'plot': 'AI情节生成',
    'polish': 'AI文本润色',
    'creative': 'AI创意建议',
    'content': 'AI正文生成',
    'worldview': 'AI世界观生成',
    'book_analyze': 'AI拆书分析',
    'ai_chat': 'AI聊天对话',
    'short_story': 'AI短篇故事生成',
    'short_article': 'AI短文生成',
    'article': 'AI文章生成'
  }
  return typeMap[type] || type || '未知类型'
}

// 获取业务类型标签类型
const getBusinessTypeTagType = (type) => {
  const typeMap = {
    outline: 'primary',
    character: 'success',
    dialogue: 'info',
    plot: 'warning',
    polish: 'danger',
    creative: '',
    content: 'primary',
    worldview: 'success',
    book_analyze: 'info'
  }
  return typeMap[type] || ''
}

// 获取状态名称
const getStatusName = (status) => {
  return statusMap[status] || status
}

// 获取状态标签类型
const getStatusTagType = (status) => {
  const typeMap = {
    success: 'success',
    error: 'danger',
    timeout: 'warning'
  }
  return typeMap[status] || ''
}



// 处理日期范围变化
const handleDateRangeChange = (dates) => {
  if (dates && dates.length === 2) {
    filters.start_date = dates[0]
    filters.end_date = dates[1]
  } else {
    filters.start_date = ''
    filters.end_date = ''
  }
}

// 重置筛选条件
const resetFilters = () => {
  Object.keys(filters).forEach(key => {
    filters[key] = ''
  })
  dateRange.value = []
  pagination.current_page = 1
  loadRecords()
}

// 处理筛选条件变化
const handleFilterChange = () => {
  pagination.current_page = 1
  loadRecords()
}

// 加载记录列表
const loadRecords = async () => {
  try {
    loading.value = true
    const params = {
      page: pagination.current_page,
      limit: pagination.per_page,
      ...filters
    }
    
    // 移除空值
    Object.keys(params).forEach(key => {
      if (params[key] === '' || params[key] === null || params[key] === undefined) {
        delete params[key]
      }
    })
    
    const response = await aiCallRecordAPI.getAdminRecords(params)
    if (response.success) {
      records.value = response.data.records
      // 适配API返回的分页格式
      pagination.current_page = response.data.pagination.current_page
      pagination.per_page = response.data.pagination.per_page
      pagination.total_count = response.data.pagination.total
      pagination.total_pages = response.data.pagination.total_pages
    }
  } catch (error) {
    console.error('加载记录失败:', error)
    ElMessage.error('加载记录失败')
  } finally {
    loading.value = false
  }
}



// 加载AI模型列表
const loadAiModels = async () => {
  try {
    const response = await aiModelAPI.getModels()
    if (response.success) {
      aiModels.value = response.data.models
    }
  } catch (error) {
    console.error('加载AI模型失败:', error)
  }
}

// 处理选择变化
const handleSelectionChange = (selection) => {
  selectedRecords.value = selection
}

// 分页处理函数已通过 @size-change="loadRecords" 和 @current-change="loadRecords" 直接绑定

// 显示详情对话框
const showDetailDialog = async (record) => {
  try {
    const response = await aiCallRecordAPI.getAdminRecord(record.id)
    if (response.success) {
      currentRecord.value = response.data
      detailDialogVisible.value = true
    }
  } catch (error) {
    console.error('获取记录详情失败:', error)
    ElMessage.error('获取记录详情失败')
  }
}

// 关闭详情对话框
const handleDetailDialogClose = () => {
  detailDialogVisible.value = false
  currentRecord.value = null
}

// 删除记录
const handleDelete = async (record) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除记录 #${record.id} 吗？此操作不可恢复。`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const response = await aiCallRecordAPI.deleteRecord(record.id)
    if (response.success) {
      ElMessage.success('删除成功')
      loadRecords()
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除记录失败:', error)
      ElMessage.error('删除记录失败')
    }
  }
}

// 批量删除
const handleBatchDelete = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedRecords.value.length} 条记录吗？此操作不可恢复。`,
      '确认批量删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const ids = selectedRecords.value.map(record => record.id)
    const response = await aiCallRecordAPI.batchDeleteRecords({ ids })
    if (response.success) {
      ElMessage.success(`成功删除 ${response.data.deleted_count} 条记录`)
      selectedRecords.value = []
      loadRecords()
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量删除失败:', error)
      ElMessage.error('批量删除失败')
    }
  }
}

// 组件挂载时加载数据
onMounted(() => {
  loadRecords()
  loadAiModels()
})
</script>

<style scoped>
.ai-call-record-management {
  padding: 20px;
  width: 100%;
}

.page-header {
  margin-bottom: 20px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 8px 0;
}

.page-desc {
  color: #909399;
  margin: 0;
}



.filter-card {
  margin-bottom: 20px;
  border: none;
}

.filter-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.filter-left {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.filter-right {
  display: flex;
  gap: 12px;
}

.table-card {
  border: none;
}

.user-info .username {
  font-weight: 500;
  color: #303133;
}

.user-info .email {
  font-size: 12px;
  color: #909399;
}

.token-info .total {
  font-weight: 500;
  color: #303133;
}

.token-info .detail {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}

.pagination-wrapper {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.record-detail {
  max-height: 70vh;
  overflow-y: auto;
}

.record-detail h4 {
  margin: 20px 0 10px 0;
  color: #303133;
  font-size: 16px;
  font-weight: 600;
}

.token-detail {
  margin-top: 20px;
}

.action-buttons {
  display: flex;
  gap: 8px;
  align-items: center;
}

.request-params,
.system-prompt,
.user-prompt,
.response-content,
.error-message {
  margin-top: 20px;
}

.request-params :deep(.el-textarea__inner),
.system-prompt :deep(.el-textarea__inner),
.user-prompt :deep(.el-textarea__inner),
.response-content :deep(.el-textarea__inner) {
  font-family: 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;
}
</style>