<template>
  <div class="prompt-management">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title">提示词管理</h1>
      <p class="page-desc">管理系统中的AI提示词模板</p>
    </div>

    <!-- 操作栏 -->
    <div class="action-bar">
      <div class="search-section">
        <el-input
          v-model="searchQuery"
          placeholder="搜索提示词标题或描述"
          style="width: 300px"
          clearable
          @input="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-select v-model="categoryFilter" placeholder="分类" style="width: 150px; margin-left: 12px" @change="handleSearch">
          <el-option label="全部" value="" />
          <el-option label="大纲" value="outline" />
          <el-option label="简介" value="synopsis" />
          <el-option label="细纲" value="detailed_outline" />
          <el-option label="基础正文" value="basic_text" />
          <el-option label="场景描写" value="scene" />
          <el-option label="动作情节" value="action_plot" />
          <el-option label="心理描写" value="psychology" />
          <el-option label="智能续写" value="smart_continue" />
          <el-option label="润色优化" value="polish" />
          <el-option label="人物生成" value="character" />
          <el-option label="改写" value="rewrite" />
          <el-option label="黄金标题" value="golden_title" />
          <el-option label="金手指" value="golden_finger" />
          <el-option label="黄金开篇" value="golden_opening" />
          <el-option label="灵感激发" value="inspiration" />
          <el-option label="世界观生成" value="worldview" />
          <el-option label="脑洞生成" value="brainstorm" />
          <el-option label="短文写作" value="short_writing" />
          <el-option label="短篇小说" value="short_story" />
          <el-option label="拆书分析" value="book_analysis" />
        </el-select>
        
        <el-select v-model="statusFilter" placeholder="选择状态" clearable style="width: 120px; margin-left: 12px" @change="handleSearch">
          <el-option label="启用" value="active" />
          <el-option label="禁用" value="inactive" />
        </el-select>
      </div>
      <div class="action-buttons">
        <el-button type="primary" @click="showAddPromptDialog">
          <el-icon><Plus /></el-icon>
          添加提示词
        </el-button>
        <el-button 
          type="danger" 
          :disabled="selectedPrompts.length === 0"
          @click="batchDelete"
        >
          <el-icon><Delete /></el-icon>
          批量删除 ({{ selectedPrompts.length }})
        </el-button>
        <el-button @click="exportPrompts">
          <el-icon><Download /></el-icon>
          导出
        </el-button>
      </div>
    </div>

    <!-- 提示词表格 -->
    <el-card shadow="hover">
      <el-table
        :data="filteredPrompts"
        style="width: 100%"
        v-loading="loading"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="标题" min-width="200" show-overflow-tooltip />
        <el-table-column label="分类" width="120">
          <template #default="{ row }">
            <el-tag size="small">{{ getCategoryLabel(row.category) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="250" show-overflow-tooltip />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag 
              :type="row.status === 'active' ? 'success' : 'danger'" 
              size="small"
            >
              {{ row.status === 'active' ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="usage_count" label="使用次数" width="100" />
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
        <el-table-column label="操作" width="260" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="viewPrompt(row)">
              查看
            </el-button>
            <el-button type="warning" size="small" @click="editPrompt(row)">
              编辑
            </el-button>
            <el-button 
              :type="row.status === 'active' ? 'danger' : 'success'" 
              size="small" 
              @click="togglePromptStatus(row)"
            >
              {{ row.status === 'active' ? '禁用' : '启用' }}
            </el-button>
            <el-button 
              type="danger" 
              size="small" 
              @click="deletePrompt(row)"
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

    <!-- 添加/编辑提示词对话框 -->
    <el-dialog
      v-model="promptDialogVisible"
      :title="isEdit ? '编辑提示词' : '添加提示词'"
      width="800px"
      @close="resetPromptForm"
    >
      <el-form
        ref="promptFormRef"
        :model="promptForm"
        :rules="promptFormRules"
        label-width="80px"
      >
        <el-form-item label="标题" prop="title">
          <el-input v-model="promptForm.title" placeholder="请输入提示词标题" />
        </el-form-item>
        <el-form-item label="分类" prop="category">
          <el-select v-model="promptForm.category" placeholder="请选择分类">
            <el-option label="大纲" value="outline" />
            <el-option label="简介" value="synopsis" />
            <el-option label="细纲" value="detailed_outline" />
            <el-option label="基础正文" value="basic_text" />
            <el-option label="场景描写" value="scene" />
            <el-option label="动作情节" value="action_plot" />
            <el-option label="心理描写" value="psychology" />
            <el-option label="智能续写" value="smart_continue" />
            <el-option label="润色优化" value="polish" />
            <el-option label="人物生成" value="character" />
            <el-option label="改写" value="rewrite" />
            <el-option label="黄金标题" value="golden_title" />
            <el-option label="金手指" value="golden_finger" />
            <el-option label="黄金开篇" value="golden_opening" />
            <el-option label="灵感激发" value="inspiration" />
            <el-option label="世界观生成" value="worldview" />
            <el-option label="脑洞生成" value="brainstorm" />
            <el-option label="短文写作" value="short_writing" />
            <el-option label="短篇小说" value="short_story" />
            <el-option label="拆书分析" value="book_analysis" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input 
            v-model="promptForm.description" 
            type="textarea" 
            :rows="3"
            placeholder="请输入提示词描述"
          />
        </el-form-item>
        <el-form-item label="提示词" prop="content">
          <el-input 
            v-model="promptForm.content" 
            type="textarea" 
            :rows="8"
            placeholder="请输入提示词内容"
          />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="promptForm.status" placeholder="请选择状态">
            <el-option label="启用" value="active" />
            <el-option label="禁用" value="inactive" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="promptDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="savePrompt" :loading="saving">
            {{ isEdit ? '更新' : '添加' }}
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 提示词详情对话框 -->
    <el-dialog
      v-model="promptDetailVisible"
      title="提示词详情"
      width="800px"
    >
      <div v-if="selectedPrompt" class="prompt-detail">
        <div class="detail-header">
          <h2>{{ selectedPrompt.name || selectedPrompt.title }}</h2>
          <el-tag :type="selectedPrompt.status === 'active' ? 'success' : 'danger'">
            {{ selectedPrompt.status === 'active' ? '启用' : '禁用' }}
          </el-tag>
        </div>
        
        <div class="detail-content">
          <h3>分类</h3>
          <p>{{ getCategoryLabel(selectedPrompt.category) }}</p>
          
          <h3>描述</h3>
          <p>{{ selectedPrompt.description || '暂无描述' }}</p>
          
          <h3>提示词内容</h3>
          <div class="prompt-content">
            <pre>{{ selectedPrompt.content || '暂无内容' }}</pre>
          </div>
          
          <div class="detail-stats">
            <p><strong>使用次数：</strong>{{ selectedPrompt.usage_count || 0 }}</p>
            <p><strong>创建时间：</strong>{{ formatDateTime(selectedPrompt.created_at) }}</p>
            <p><strong>更新时间：</strong>{{ formatDateTime(selectedPrompt.updated_at) }}</p>
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
import { promptAPI } from '@/api'
import { formatDateTime } from '@/utils/date'

// 响应式数据
const loading = ref(false)
const saving = ref(false)
const searchQuery = ref('')
const categoryFilter = ref('')
const statusFilter = ref('')
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)
const selectedPrompts = ref([])

// 提示词列表数据
const prompts = ref([])

// 过滤后的提示词列表
const filteredPrompts = computed(() => {
  return prompts.value
})

// 提示词表单
const promptDialogVisible = ref(false)
const promptDetailVisible = ref(false)
const isEdit = ref(false)
const promptFormRef = ref()
const selectedPrompt = ref(null)
const promptForm = ref({
  id: null,
  title: '',
  category: '',
  description: '',
  content: '',
  status: 'active'
})

// 表单验证规则
const promptFormRules = {
  title: [
    { required: true, message: '请输入提示词标题', trigger: 'blur' }
  ],
  category: [
    { required: true, message: '请选择分类', trigger: 'change' }
  ],
  description: [
    { required: true, message: '请输入描述', trigger: 'blur' }
  ],
  content: [
    { required: true, message: '请输入提示词内容', trigger: 'blur' }
  ],
  status: [
    { required: true, message: '请选择状态', trigger: 'change' }
  ]
}

// 工具方法
const getCategoryLabel = (category) => {
  const categoryMap = {
    outline: '大纲',
    synopsis: '简介',
    detailed_outline: '细纲',
    basic_text: '基础正文',
    scene: '场景描写',
    action_plot: '动作情节',
    psychology: '心理描写',
    smart_continue: '智能续写',
    polish: '润色优化',
    character: '人物生成',
    rewrite: '改写',
    golden_title: '黄金标题',
    golden_finger: '金手指',
    golden_opening: '黄金开篇',
    inspiration: '灵感激发',
    worldview: '世界观生成',
    brainstorm: '脑洞生成',
    short_writing: '短文写作',
    short_story: '短篇小说',
    book_analysis: '拆书分析',
    // 兼容旧的分类
    novel: '小说创作',
    plot: '情节发展',
    structure: '结构正文',
    dialogue: '对话生成',
    action: '动作描写'
  }
  return categoryMap[category] || category
}

// 方法
const handleSearch = () => {
  currentPage.value = 1
  loadPrompts()
}

const handleSelectionChange = (selection) => {
  selectedPrompts.value = selection
}

const handleSizeChange = (size) => {
  pageSize.value = size
  currentPage.value = 1
  loadPrompts()
}

const handleCurrentChange = (page) => {
  currentPage.value = page
  loadPrompts()
}

const showAddPromptDialog = () => {
  isEdit.value = false
  promptDialogVisible.value = true
}

const viewPrompt = async (prompt) => {
  try {
    loading.value = true
    const response = await promptAPI.getPrompt(prompt.id)
    selectedPrompt.value = response.data
    promptDetailVisible.value = true
  } catch (error) {
    console.error('获取提示词详情失败:', error)
    ElMessage.error('获取提示词详情失败')
  } finally {
    loading.value = false
  }
}

const editPrompt = async (prompt) => {
  try {
    loading.value = true
    // 获取完整的提示词详情
    const response = await promptAPI.getPrompt(prompt.id)
    const fullPrompt = response.data
    
    isEdit.value = true
    promptForm.value = {
      id: fullPrompt.id,
      title: fullPrompt.name || fullPrompt.title,
      category: fullPrompt.category,
      description: fullPrompt.description,
      content: fullPrompt.content,
      status: fullPrompt.status
    }
    promptDialogVisible.value = true
  } catch (error) {
    console.error('获取提示词详情失败:', error)
    ElMessage.error('获取提示词详情失败')
  } finally {
    loading.value = false
  }
}

const resetPromptForm = () => {
  promptForm.value = {
    id: null,
    title: '',
    category: '',
    description: '',
    content: '',
    status: 'active'
  }
  promptFormRef.value?.resetFields()
}

const savePrompt = async () => {
  try {
    await promptFormRef.value.validate()
    saving.value = true
    
    if (isEdit.value) {
      // 更新提示词
      await promptAPI.updatePrompt(promptForm.value.id, {
        name: promptForm.value.title,
        content: promptForm.value.content,
        description: promptForm.value.description,
        category: promptForm.value.category,
        status: promptForm.value.status
      })
      ElMessage.success('提示词更新成功')
    } else {
      // 添加提示词
      await promptAPI.createPrompt({
        name: promptForm.value.title,
        content: promptForm.value.content,
        description: promptForm.value.description,
        category: promptForm.value.category,
        status: promptForm.value.status,
        type: 'system',
        language: 'zh-CN',
        is_public: true
      })
      ElMessage.success('提示词添加成功')
    }
    
    promptDialogVisible.value = false
    loadPrompts() // 重新加载列表
  } catch (error) {
    console.error('保存提示词失败:', error)
    ElMessage.error('保存提示词失败')
  } finally {
    saving.value = false
  }
}

const togglePromptStatus = async (prompt) => {
  try {
    const action = prompt.status === 'active' ? '禁用' : '启用'
    await ElMessageBox.confirm(`确定要${action}提示词「${prompt.name || prompt.title}」吗？`, '确认操作')
    
    const newStatus = prompt.status === 'active' ? 'inactive' : 'active'
    await promptAPI.updatePrompt(prompt.id, {
      status: newStatus
    })
    
    // 更新本地状态
    prompt.status = newStatus
    ElMessage.success(`提示词${action}成功`)
  } catch (error) {
    if (error.message !== 'cancel') {
      console.error('切换提示词状态失败:', error)
      ElMessage.error('操作失败')
    }
  }
}

const exportPrompts = () => {
  ElMessage.info('导出功能开发中')
}

const deletePrompt = async (prompt) => {
  try {
    await ElMessageBox.confirm(`确定要删除提示词「${prompt.name || prompt.title}」吗？`, '确认删除', {
      type: 'warning'
    })
    
    await promptAPI.deletePrompt(prompt.id)
    
    // 从本地列表中移除
    const index = prompts.value.findIndex(p => p.id === prompt.id)
    if (index !== -1) {
      prompts.value.splice(index, 1)
    }
    ElMessage.success('提示词删除成功')
  } catch (error) {
    if (error.message !== 'cancel') {
      console.error('删除提示词失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

const batchDelete = async () => {
  if (selectedPrompts.value.length === 0) {
    ElMessage.warning('请选择要删除的提示词')
    return
  }
  
  try {
    await ElMessageBox.confirm(`确定要删除选中的 ${selectedPrompts.value.length} 个提示词吗？`, '确认删除', {
      type: 'warning'
    })
    
    const idsToDelete = selectedPrompts.value.map(p => p.id)
    await promptAPI.batchDeletePrompts(idsToDelete)
    
    // 从本地列表中移除
    prompts.value = prompts.value.filter(p => !idsToDelete.includes(p.id))
    selectedPrompts.value = []
    
    ElMessage.success(`成功删除 ${idsToDelete.length} 个提示词`)
  } catch (error) {
    if (error.message !== 'cancel') {
      console.error('批量删除提示词失败:', error)
      ElMessage.error('批量删除失败')
    }
  }
}

const loadPrompts = async () => {
  loading.value = true
  try {
    const params = {
      page: currentPage.value,
      limit: pageSize.value
    }
    
    // 添加搜索条件
    if (searchQuery.value.trim()) {
      params.search = searchQuery.value.trim()
    }
    
    // 添加分类过滤
    if (categoryFilter.value) {
      params.category = categoryFilter.value
    }
    
    // 添加状态过滤
    if (statusFilter.value) {
      params.status = statusFilter.value
    }
    
    const response = await promptAPI.getPrompts(params)
    
    // 确保数据是数组格式
    if (response.data) {
      if (Array.isArray(response.data)) {
        prompts.value = response.data
        total.value = response.data.length
      } else if (response.data.prompts && Array.isArray(response.data.prompts)) {
        prompts.value = response.data.prompts
        total.value = response.data.pagination?.totalCount || response.data.prompts.length
      } else if (response.data.items && Array.isArray(response.data.items)) {
        prompts.value = response.data.items
        total.value = response.data.total || response.data.items.length
      } else {
        prompts.value = []
        total.value = 0
      }
    } else {
      prompts.value = []
      total.value = 0
    }
  } catch (error) {
    console.error('加载提示词失败:', error)
    ElMessage.error('加载提示词列表失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadPrompts()
})
</script>

<style scoped>
.prompt-management {
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

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.prompt-detail {
  padding: 20px;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #eee;
}

.detail-header h2 {
  margin: 0;
  font-size: 24px;
  color: #333;
}

.detail-content h3 {
  margin: 20px 0 12px 0;
  font-size: 16px;
  color: #333;
}

.detail-content p {
  line-height: 1.6;
  color: #666;
  margin-bottom: 16px;
}

.prompt-content {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 20px;
}

.prompt-content pre {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 14px;
  line-height: 1.5;
  color: #333;
}

.detail-stats {
  background: #f8f9fa;
  padding: 16px;
  border-radius: 6px;
  border-left: 4px solid #409eff;
}

.detail-stats p {
  margin: 8px 0;
  color: #666;
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
    align-items: flex-start;
    gap: 12px;
  }
}
</style>