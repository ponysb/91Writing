<template>
  <div class="ai-assistant-management">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title">AI助手管理</h1>
      <p class="page-desc">管理系统中的AI助手，配置助手人格、能力和模型参数</p>
    </div>

    <!-- 操作栏 -->
    <div class="action-bar">
      <div class="search-section">
        <el-input
          v-model="searchQuery"
          placeholder="搜索助手名称或描述"
          style="width: 300px"
          clearable
          @input="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-select v-model="typeFilter" placeholder="助手类型" style="width: 120px; margin-left: 12px" @change="handleSearch">
          <el-option label="全部" value="" />
          <el-option label="通用" value="general" />
          <el-option label="写作" value="writing" />
          <el-option label="创意" value="creative" />
          <el-option label="分析" value="analysis" />
        </el-select>
        
        <el-select v-model="statusFilter" placeholder="选择状态" clearable style="width: 120px; margin-left: 12px" @change="handleSearch">
          <el-option label="活跃" value="active" />
          <el-option label="非活跃" value="inactive" />
          <el-option label="训练中" value="training" />
        </el-select>
        
        <el-select v-model="publicFilter" placeholder="公开状态" clearable style="width: 120px; margin-left: 12px" @change="handleSearch">
          <el-option label="公开" value="true" />
          <el-option label="私有" value="false" />
        </el-select>
      </div>
      <div class="action-buttons">
        <el-button type="primary" @click="showAddAssistantDialog">
          <el-icon><Plus /></el-icon>
          添加AI助手
        </el-button>
        <el-button @click="exportAssistants">
          <el-icon><Download /></el-icon>
          导出
        </el-button>
        <el-button 
          type="danger" 
          :disabled="selectedAssistants.length === 0"
          @click="batchDeleteAssistants"
        >
          <el-icon><Delete /></el-icon>
          批量删除
        </el-button>
      </div>
    </div>

    <!-- AI助手表格 -->
    <el-card shadow="hover">
      <el-table
        :data="filteredAssistants"
        style="width: 100%"
        v-loading="loading"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="头像" width="80">
          <template #default="{ row }">
            <el-avatar 
              :size="40" 
              :src="row.avatar" 
              :alt="row.name"
            >
              {{ row.name?.charAt(0) }}
            </el-avatar>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="助手名称" min-width="150" show-overflow-tooltip />
        <el-table-column label="类型" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="getTypeTagType(row.type)">{{ getTypeLabel(row.type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag 
              :type="getStatusTagType(row.status)" 
              size="small"
            >
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="公开" width="80">
          <template #default="{ row }">
            <el-tag :type="row.is_public ? 'success' : 'info'" size="small">
              {{ row.is_public ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="默认" width="80">
          <template #default="{ row }">
            <el-tag :type="row.is_default ? 'warning' : ''" size="small">
              {{ row.is_default ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="created_at" label="创建时间" width="180" />
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="viewAssistant(row)">
              查看
            </el-button>
            <el-button type="warning" size="small" @click="editAssistant(row)">
              编辑
            </el-button>
            <!-- <el-button type="info" size="small" @click="copyAssistant(row)">
              复制
            </el-button> -->
            <el-button 
              :type="row.status === 'active' ? 'danger' : 'success'" 
              size="small" 
              @click="toggleAssistantStatus(row)"
            >
              {{ row.status === 'active' ? '禁用' : '启用' }}
            </el-button>
            <el-button 
              type="danger" 
              size="small" 
              @click="deleteAssistant(row)"
            >
              删除
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

    <!-- 添加/编辑AI助手对话框 -->
    <el-dialog
      v-model="assistantDialogVisible"
      :title="isEdit ? '编辑AI助手' : '添加AI助手'"
      width="900px"
      @close="resetAssistantForm"
    >
      <el-form
        ref="assistantFormRef"
        :model="assistantForm"
        :rules="assistantFormRules"
        label-width="120px"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="助手名称" prop="name">
              <el-input v-model="assistantForm.name" placeholder="请输入助手名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="助手类型" prop="type">
              <el-select v-model="assistantForm.type" placeholder="请选择助手类型">
                <el-option label="通用" value="general" />
                <el-option label="写作" value="writing" />
                <el-option label="创意" value="creative" />
                <el-option label="分析" value="analysis" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item label="助手描述" prop="description">
          <el-input 
            v-model="assistantForm.description" 
            type="textarea" 
            :rows="3"
            placeholder="请输入助手描述"
          />
        </el-form-item>
        

        
        <el-form-item label="人格设定" prop="personality">
          <el-input 
            v-model="assistantForm.personality" 
            type="textarea" 
            :rows="4"
            placeholder="请输入助手的人格设定"
          />
        </el-form-item>
        
        <el-form-item label="系统提示词" prop="system_prompt">
          <el-input 
            v-model="assistantForm.system_prompt" 
            type="textarea" 
            :rows="6"
            placeholder="请输入系统提示词"
          />
        </el-form-item>
        
        <el-form-item label="上下文提示词" prop="context_prompt">
          <el-input 
            v-model="assistantForm.context_prompt" 
            type="textarea" 
            :rows="4"
            placeholder="请输入上下文提示词"
          />
        </el-form-item>
        

        
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="状态" prop="status">
              <el-select v-model="assistantForm.status" placeholder="请选择状态">
                <el-option label="活跃" value="active" />
                <el-option label="非活跃" value="inactive" />
                <el-option label="训练中" value="training" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="是否公开">
              <el-switch v-model="assistantForm.is_public" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="设为默认">
              <el-switch v-model="assistantForm.is_default" />
            </el-form-item>
          </el-col>
        </el-row>
        

      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="assistantDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="saveAssistant" :loading="saving">
            {{ isEdit ? '更新' : '添加' }}
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- AI助手详情对话框 -->
    <el-dialog
      v-model="assistantDetailVisible"
      title="AI助手详情"
      width="800px"
    >
      <div v-if="selectedAssistant" class="assistant-detail">
        <div class="detail-header">
          <el-avatar :size="60" :src="selectedAssistant.avatar">
            {{ selectedAssistant.name?.charAt(0) }}
          </el-avatar>
          <div class="header-info">
            <h2>{{ selectedAssistant.name }}</h2>
            <div class="tags">
              <el-tag :type="getTypeTagType(selectedAssistant.type)" size="small">
                {{ getTypeLabel(selectedAssistant.type) }}
              </el-tag>
              <el-tag :type="getStatusTagType(selectedAssistant.status)" size="small">
                {{ getStatusLabel(selectedAssistant.status) }}
              </el-tag>
              <el-tag v-if="selectedAssistant.is_public" type="success" size="small">公开</el-tag>
              <el-tag v-if="selectedAssistant.is_default" type="warning" size="small">默认</el-tag>
            </div>
          </div>
        </div>
        
        <div class="detail-content">
          <h3>描述</h3>
          <p>{{ selectedAssistant.description || '暂无描述' }}</p>
          
          <h3>人格设定</h3>
          <p>{{ selectedAssistant.personality || '暂无人格设定' }}</p>
          
          <h3>能力列表</h3>
          <div class="capabilities">
            <el-tag 
              v-for="capability in selectedAssistant.capabilities" 
              :key="capability" 
              size="small" 
              style="margin-right: 8px; margin-bottom: 8px"
            >
              {{ capability }}
            </el-tag>
          </div>
          
          <h3>系统提示词</h3>
          <div class="prompt-content">
            <pre>{{ selectedAssistant.system_prompt || '暂无系统提示词' }}</pre>
          </div>
          
          <h3>上下文提示词</h3>
          <div class="prompt-content">
            <pre>{{ selectedAssistant.context_prompt || '暂无上下文提示词' }}</pre>
          </div>
          
          <h3>模型配置</h3>
          <div class="model-config">
            <p><strong>温度参数：</strong>{{ selectedAssistant.model_config?.temperature || 0.8 }}</p>
            <p><strong>最大Token数：</strong>{{ selectedAssistant.model_config?.max_tokens || 2000 }}</p>
          </div>
          
          <div class="detail-stats">
            <el-row :gutter="20">
              <el-col :span="6">
                <div class="stat-item">
                  <div class="stat-value">{{ selectedAssistant.usage_count || 0 }}</div>
                  <div class="stat-label">使用次数</div>
                </div>
              </el-col>
              <el-col :span="6">
                <div class="stat-item">
                  <div class="stat-value">{{ selectedAssistant.total_tokens || 0 }}</div>
                  <div class="stat-label">总Token数</div>
                </div>
              </el-col>
              <el-col :span="6">
                <div class="stat-item">
                  <div class="stat-value">{{ selectedAssistant.rating || 0 }}</div>
                  <div class="stat-label">评分</div>
                </div>
              </el-col>
              <el-col :span="6">
                <div class="stat-item">
                  <div class="stat-value">{{ selectedAssistant.rating_count || 0 }}</div>
                  <div class="stat-label">评分次数</div>
                </div>
              </el-col>
            </el-row>
          </div>
          
          <div class="detail-time">
            <p><strong>创建时间：</strong>{{ selectedAssistant.created_at }}</p>
            <p><strong>更新时间：</strong>{{ selectedAssistant.updated_at }}</p>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Search,
  Plus,
  Download,
  Delete
} from '@element-plus/icons-vue'
import { aiAssistantAPI } from '@/api'

// 响应式数据
const loading = ref(false)
const saving = ref(false)
const searchQuery = ref('')
const typeFilter = ref('')
const statusFilter = ref('')
const publicFilter = ref('')
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)
const selectedAssistants = ref([])

// AI助手列表数据
const assistants = ref([])

// 过滤后的AI助手列表
const filteredAssistants = computed(() => {
  let filtered = assistants.value
  
  if (searchQuery.value) {
    filtered = filtered.filter(assistant => 
      assistant.name?.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      assistant.description?.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
  }
  
  if (typeFilter.value) {
    filtered = filtered.filter(assistant => assistant.type === typeFilter.value)
  }
  
  if (statusFilter.value) {
    filtered = filtered.filter(assistant => assistant.status === statusFilter.value)
  }
  
  if (publicFilter.value !== '') {
    const isPublic = publicFilter.value === 'true'
    filtered = filtered.filter(assistant => assistant.is_public === isPublic)
  }
  
  return filtered
})

// AI助手表单
const assistantDialogVisible = ref(false)
const assistantDetailVisible = ref(false)
const isEdit = ref(false)
const assistantFormRef = ref()
const selectedAssistant = ref(null)
const assistantForm = ref({
  id: null,
  name: '',
  description: '',
  personality: '',
  system_prompt: '',
  context_prompt: '',
  type: 'general',
  status: 'active',
  is_public: true,
  is_default: false
})

// 表单验证规则
const assistantFormRules = {
  name: [
    { required: true, message: '请输入助手名称', trigger: 'blur' }
  ],
  type: [
    { required: true, message: '请选择助手类型', trigger: 'change' }
  ],
  description: [
    { required: true, message: '请输入助手描述', trigger: 'blur' }
  ],
  personality: [
    { required: true, message: '请输入人格设定', trigger: 'blur' }
  ],
  system_prompt: [
    { required: true, message: '请输入系统提示词', trigger: 'blur' }
  ],
  status: [
    { required: true, message: '请选择状态', trigger: 'change' }
  ]
}

// 工具方法
const getTypeLabel = (type) => {
  const typeMap = {
    general: '通用',
    writing: '写作',
    creative: '创意',
    analysis: '分析'
  }
  return typeMap[type] || type
}

const getTypeTagType = (type) => {
  const typeTagMap = {
    general: '',
    writing: 'success',
    creative: 'warning',
    analysis: 'info'
  }
  return typeTagMap[type] || ''
}

const getStatusLabel = (status) => {
  const statusMap = {
    active: '活跃',
    inactive: '非活跃',
    training: '训练中'
  }
  return statusMap[status] || status
}

const getStatusTagType = (status) => {
  const statusTagMap = {
    active: 'success',
    inactive: 'danger',
    training: 'warning'
  }
  return statusTagMap[status] || ''
}

// 数据加载
const loadAssistants = async () => {
  try {
    loading.value = true
    const params = {
      page: currentPage.value,
      limit: pageSize.value
    }
    
    if (searchQuery.value) {
      params.search = searchQuery.value
    }
    if (typeFilter.value) {
      params.type = typeFilter.value
    }
    if (statusFilter.value) {
      params.status = statusFilter.value
    }
    if (publicFilter.value !== '') {
      params.is_public = publicFilter.value === 'true'
    }
    
    const response = await aiAssistantAPI.getAssistants(params)
    
    if (response.data) {
      assistants.value = response.data.assistants || response.data || []
      total.value = response.data.total || assistants.value.length
    }
  } catch (error) {
    console.error('加载AI助手失败:', error)
    ElMessage.error('加载AI助手失败')
  } finally {
    loading.value = false
  }
}

// 搜索处理
const handleSearch = () => {
  currentPage.value = 1
  loadAssistants()
}

// 分页处理
const handleSizeChange = (size) => {
  pageSize.value = size
  currentPage.value = 1
  loadAssistants()
}

const handleCurrentChange = (page) => {
  currentPage.value = page
  loadAssistants()
}

// 选择处理
const handleSelectionChange = (selection) => {
  selectedAssistants.value = selection
}

// 对话框操作
const showAddAssistantDialog = () => {
  isEdit.value = false
  resetAssistantForm()
  assistantDialogVisible.value = true
}

const resetAssistantForm = () => {
  assistantForm.value = {
    id: null,
    name: '',
    description: '',
    personality: '',
    system_prompt: '',
    context_prompt: '',
    type: 'general',
    status: 'active',
    is_public: true,
    is_default: false
  }
  if (assistantFormRef.value) {
    assistantFormRef.value.clearValidate()
  }
}

// CRUD操作
const saveAssistant = async () => {
  try {
    await assistantFormRef.value.validate()
    saving.value = true
    
    const formData = { ...assistantForm.value }
    
    if (isEdit.value) {
      await aiAssistantAPI.updateAssistant(formData.id, formData)
      ElMessage.success('AI助手更新成功')
    } else {
      await aiAssistantAPI.createAssistant(formData)
      ElMessage.success('AI助手创建成功')
    }
    
    assistantDialogVisible.value = false
    await loadAssistants()
  } catch (error) {
    console.error('保存AI助手失败:', error)
    ElMessage.error('保存AI助手失败')
  } finally {
    saving.value = false
  }
}

const viewAssistant = (assistant) => {
  selectedAssistant.value = assistant
  assistantDetailVisible.value = true
}

const editAssistant = (assistant) => {
  isEdit.value = true
  assistantForm.value = { 
    ...assistant,
    model_config: assistant.model_config || { temperature: 0.8, max_tokens: 2000 },
    capabilities: assistant.capabilities || []
  }
  assistantDialogVisible.value = true
}

const copyAssistant = async (assistant) => {
  try {
    await aiAssistantAPI.copyAssistant(assistant.id)
    ElMessage.success('AI助手复制成功')
    await loadAssistants()
  } catch (error) {
    console.error('复制AI助手失败:', error)
    ElMessage.error('复制AI助手失败')
  }
}

const toggleAssistantStatus = async (assistant) => {
  try {
    const newStatus = assistant.status === 'active' ? 'inactive' : 'active'
    await aiAssistantAPI.updateAssistant(assistant.id, { status: newStatus })
    ElMessage.success(`AI助手已${newStatus === 'active' ? '启用' : '禁用'}`)
    await loadAssistants()
  } catch (error) {
    console.error('切换AI助手状态失败:', error)
    ElMessage.error('切换AI助手状态失败')
  }
}

const deleteAssistant = async (assistant) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除AI助手 "${assistant.name}" 吗？此操作不可恢复。`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await aiAssistantAPI.deleteAssistant(assistant.id)
    ElMessage.success('AI助手删除成功')
    await loadAssistants()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除AI助手失败:', error)
      ElMessage.error('删除AI助手失败')
    }
  }
}

const batchDeleteAssistants = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedAssistants.value.length} 个AI助手吗？此操作不可恢复。`,
      '确认批量删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const ids = selectedAssistants.value.map(assistant => assistant.id)
    await aiAssistantAPI.batchDeleteAssistants({ ids })
    ElMessage.success('批量删除成功')
    selectedAssistants.value = []
    await loadAssistants()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量删除AI助手失败:', error)
      ElMessage.error('批量删除AI助手失败')
    }
  }
}

const exportAssistants = () => {
  ElMessage.info('导出功能开发中...')
}

// 生命周期
onMounted(() => {
  loadAssistants()
})
</script>

<style scoped>
.ai-assistant-management {
  padding: 20px;
}

.page-header {
  margin-bottom: 24px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 8px 0;
}

.page-desc {
  color: #6b7280;
  margin: 0;
}

.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
}

.search-section {
  display: flex;
  align-items: center;
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

.assistant-detail {
  max-height: 600px;
  overflow-y: auto;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e5e7eb;
}

.header-info h2 {
  margin: 0 0 8px 0;
  font-size: 20px;
  font-weight: 600;
}

.tags {
  display: flex;
  gap: 8px;
}

.detail-content h3 {
  margin: 20px 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: #374151;
}

.detail-content p {
  margin: 0 0 16px 0;
  color: #6b7280;
  line-height: 1.6;
}

.capabilities {
  margin-bottom: 16px;
}

.prompt-content {
  background: #f3f4f6;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 16px;
}

.prompt-content pre {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  line-height: 1.5;
}

.model-config {
  background: #f9fafb;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 16px;
}

.model-config p {
  margin: 0 0 8px 0;
}

.detail-stats {
  margin: 20px 0;
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: #6b7280;
}

.detail-time {
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
}

.detail-time p {
  margin: 0 0 8px 0;
  font-size: 14px;
}
</style>