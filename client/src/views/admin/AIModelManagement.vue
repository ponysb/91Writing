<template>
  <div class="ai-model-management">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title">AI模型管理</h1>
      <p class="page-desc">管理系统中的AI模型配置</p>
    </div>

    <!-- 大模型购买提示横条 -->
    <el-alert
      title="大模型API购买渠道"
      type="warning"
      :closable="false"
      show-icon
      class="model-purchase-notice"
    >
      <template #default>
        <div class="notice-content">
          <span>官方大模型中转购买渠道，支持Claude、Gemini、GPT等各种主流大模型API。</span>
          <el-link 
            href="https://item.taobao.com/item.htm?ft=t&id=950390530459" 
            target="_blank" 
            type="primary"
            :underline="false"
            class="purchase-link"
          >
            立即购买API
            <el-icon><ShoppingCart /></el-icon>
          </el-link>
        </div>
      </template>
    </el-alert>

    <!-- 操作栏 -->
    <div class="action-bar">
      <div class="search-section">
        <el-input
          v-model="searchQuery"
          placeholder="搜索模型名称"
          style="width: 300px"
          clearable
          @input="handleSearch"
          @clear="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-select v-model="statusFilter" placeholder="状态筛选" style="width: 120px; margin-left: 12px" @change="handleSearch" clearable>
          <el-option label="全部" value="" />
          <el-option label="启用" value="active" />
          <el-option label="禁用" value="inactive" />
          <el-option label="维护中" value="maintenance" />
        </el-select>
        <el-select v-model="providerFilter" placeholder="提供商筛选" style="width: 120px; margin-left: 12px" clearable @change="handleSearch">
          <el-option label="OpenAI" value="openai" />
        </el-select>
      </div>
      <div class="action-buttons">
        <el-button type="primary" @click="showAddDialog">
          <el-icon><Plus /></el-icon>
          添加模型
        </el-button>
      </div>
    </div>

    <!-- 模型表格 -->
    <el-card shadow="hover">
      <el-table :data="models" style="width: 100%" v-loading="loading">
        <el-table-column prop="name" label="模型名称" min-width="200">
          <template #default="{ row }">
            <div>
              <div style="font-weight: bold;">{{ row.display_name || row.name }}</div>
              <div style="font-size: 12px; color: #999;">{{ row.name }}</div>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column prop="provider" label="提供商" min-width="120">
          <template #default="{ row }">
            <el-tag :type="getProviderTagType(row.provider)">{{ row.provider || '-' }}</el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="model_type" label="类型" min-width="100">
          <template #default="{ row }">
            <span>{{ getModelTypeLabel(row.model_type) }}</span>
          </template>
        </el-table-column>
        
        <el-table-column prop="api_endpoint" label="API端点" min-width="200">
          <template #default="{ row }">
            <span :title="row.api_endpoint">{{ truncateUrl(row.api_endpoint) }}</span>
          </template>
        </el-table-column>
        
        <el-table-column prop="max_tokens" label="最大令牌" min-width="100">
          <template #default="{ row }">
            <span>{{ row.max_tokens === null || row.max_tokens === undefined ? '无限' : (row.max_tokens || '-') }}</span>
          </template>
        </el-table-column>
        
        <el-table-column prop="usage_count" label="使用次数" min-width="100">
          <template #default="{ row }">
            <span>{{ row.usage_count || 0 }}</span>
          </template>
        </el-table-column>
        
        <el-table-column prop="priority" label="优先级" min-width="80">
          <template #default="{ row }">
            <span>{{ row.priority || 0 }}</span>
          </template>
        </el-table-column>
        
        <el-table-column prop="status" label="状态" min-width="120">
          <template #default="{ row }">
            <div>
              <el-tag :type="getStatusTagType(row.status)">{{ getStatusLabel(row.status) }}</el-tag>
              <el-tag v-if="row.is_default" type="primary" size="small" style="margin-left: 5px;">默认</el-tag>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column prop="created_at" label="创建时间" min-width="150">
          <template #default="{ row }">
            <span>{{ formatDate(row.created_at || row.createdAt) }}</span>
          </template>
        </el-table-column>
        
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="editModel(row)">编辑</el-button>
            <el-button type="info" size="small" @click="testModel(row)">测试</el-button>

            <el-button 
              :type="row.status === 'active' ? 'warning' : 'success'" 
              size="small" 
              @click="toggleStatus(row)"
            >
              {{ row.status === 'active' ? '禁用' : '启用' }}
            </el-button>
            <el-button type="danger" size="small" @click="deleteModel(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    
      <!-- 分页 -->
      <div class="pagination-container" style="margin-top: 20px; text-align: center;">
        <el-pagination
          v-model:current-page="pagination.current_page"
          v-model:page-size="pagination.per_page"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadModels"
          @current-change="loadModels"
        />
      </div>
    </el-card>

    <!-- 添加/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑模型' : '添加模型'"
      width="600px"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="模型名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入模型名称" />
        </el-form-item>
        
        <el-form-item label="显示名称">
          <el-input v-model="form.display_name" placeholder="请输入显示名称" />
        </el-form-item>
        
        <el-form-item label="API提供商" prop="provider">
          <el-select v-model="form.provider" placeholder="请选择API提供商">
            <el-option label="OpenAI" value="openai" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="API接口地址" prop="api_endpoint">
          <el-input v-model="form.api_endpoint" placeholder="请输入API接口地址" />
        </el-form-item>
        
        <el-form-item label="API Key" prop="api_key">
          <el-input v-model="form.api_key" type="password" placeholder="请输入API Key" show-password />
        </el-form-item>
        
        <el-form-item label="最大令牌数" prop="max_tokens">
          <div style="display: flex; align-items: center; gap: 12px;">
            <el-switch 
              v-model="form.unlimited_tokens" 
              active-text="无限" 
              inactive-text="限制" 
              @change="handleUnlimitedChange"
            />
            <el-input-number 
              v-model="form.max_tokens" 
              :min="2048" 
              :max="2000000" 
              :disabled="form.unlimited_tokens"
              placeholder="请输入最大令牌数"
              style="flex: 1;"
            />
          </div>
        </el-form-item>
        
        <el-form-item label="优先级">
          <el-input-number 
            v-model="form.priority" 
            :min="0" 
            :max="999" 
            placeholder="请输入优先级"
            style="width: 100%;"
          />
          <div style="font-size: 12px; color: #999; margin-top: 4px;">数字越大优先级越高，默认为0</div>
        </el-form-item>
        
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" placeholder="请输入模型描述" />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="saveModel" :loading="saving">保存</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 测试对话框 -->
    <el-dialog v-model="testDialogVisible" title="测试模型" width="600px">
      <div class="test-section">
        <el-form label-width="80px">
          
          <el-form-item label="测试内容">
            <el-input
              v-model="testPrompt"
              type="textarea"
              :rows="4"
              placeholder="请输入测试提示词"
              show-word-limit
              maxlength="1000"
            />
          </el-form-item>
          
          <el-form-item>
            <el-button type="primary" @click="runTest" :loading="testing">
              <el-icon><ChatDotRound /></el-icon>
              运行测试
            </el-button>
            <el-button @click="testResult = ''" :disabled="!testResult">清空结果</el-button>
          </el-form-item>
        </el-form>
        
        <div v-if="testResult || testing" class="test-result">
           <el-divider content-position="left">
             <el-icon><DocumentCopy /></el-icon>
             <span style="margin-left: 4px;">测试结果</span>
             <el-tag v-if="testing" type="info" size="small" style="margin-left: 8px;">流式输出中...</el-tag>
           </el-divider>
           <el-card shadow="never" style="background-color: #f8f9fa; min-height: 100px;">
             <div v-if="testing && !testResult" style="text-align: center; color: #909399; padding: 20px;">
               <el-icon class="is-loading"><Loading /></el-icon>
               <span style="margin-left: 8px;">正在连接模型...</span>
             </div>
             <pre v-else style="white-space: pre-wrap; word-wrap: break-word; margin: 0; font-family: 'Courier New', monospace; font-size: 13px; line-height: 1.5;">{{ testResult }}</pre>
           </el-card>
         </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus, ChatDotRound, DocumentCopy, Loading, ShoppingCart } from '@element-plus/icons-vue'
import { aiModelAPI } from '@/api'

// 响应式数据
const loading = ref(false)
const saving = ref(false)
const testing = ref(false)
const searchQuery = ref('')
const statusFilter = ref('')
const providerFilter = ref('')
const dialogVisible = ref(false)
const testDialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref()
const testPrompt = ref('这是一个测试数据，为了节省tokens，只需要输出1')
const testResult = ref('')
const currentTestModel = ref(null)

// 分页数据
const pagination = ref({
  current_page: 1,
  total_pages: 1,
  total: 0,
  per_page: 10
})

// 模型列表
const models = ref([])

// 表单数据
const form = ref({
  id: null,
  name: '',
  display_name: '',
  description: '',
  provider: '',
  model_type: 'chat',
  api_endpoint: '',
  api_key: '',
  max_tokens: 4096,
  unlimited_tokens: false,
  temperature: 0.7,
  status: 'active',
  is_default: false,
  is_public: true,
  priority: 0
})

// 表单验证规则
const rules = {
  name: [{ required: true, message: '请输入模型名称', trigger: 'blur' }],
  provider: [{ required: true, message: '请选择提供商', trigger: 'change' }],
  api_endpoint: [{ required: true, message: '请输入API接口地址', trigger: 'blur' }],
  api_key: [{ required: false, message: '请输入API Key', trigger: 'blur' }]
}

// 工具函数
const getProviderTagType = (provider) => {
  const providerMap = {
    'openai': 'primary'
  }
  return providerMap[provider] || 'info'
}

const getModelTypeLabel = (modelType) => {
  const typeMap = {
    'chat': '聊天',
    'text': '文本',
    'image': '图像',
    'speech': '语音',
    'embedding': '嵌入'
  }
  return typeMap[modelType] || modelType || '未知'
}

const getStatusTagType = (status) => {
  const statusMap = {
    'active': 'success',
    'inactive': 'danger',
    'maintenance': 'warning'
  }
  return statusMap[status] || 'info'
}

const getStatusLabel = (status) => {
  const statusMap = {
    'active': '启用',
    'inactive': '禁用',
    'maintenance': '维护中'
  }
  return statusMap[status] || status || '未知'
}

const truncateUrl = (url) => {
  if (!url) return '-'
  if (url.length <= 30) return url
  return url.substring(0, 30) + '...'
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  try {
    return new Date(dateStr).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch (error) {
    return '-'
  }
}

// API调用函数
const loadModels = async () => {
  try {
    loading.value = true
    const params = {
      page: pagination.value.current_page,
      limit: pagination.value.per_page,
      search: searchQuery.value,
      status: statusFilter.value,
      provider: providerFilter.value
    }
    
    console.log('请求参数:', params)
    const response = await aiModelAPI.getModels(params)
    console.log('API响应:', response)
    
    if (response && response.data) {
      // 处理不同的响应格式
      let responseData
      if (response.data.success) {
        responseData = response.data.data
      } else if (response.data.models) {
        responseData = response.data
      } else if (Array.isArray(response.data)) {
        responseData = { models: response.data, pagination: { total: response.data.length } }
      } else {
        responseData = response.data
      }
      
      models.value = responseData.models || responseData || []
      
      // 更新分页信息
      if (responseData.pagination) {
        pagination.value = {
          current_page: responseData.pagination.current_page || 1,
          per_page: responseData.pagination.per_page || 10,
          total: responseData.pagination.total || responseData.pagination.total_count || 0,
          total_pages: responseData.pagination.total_pages || 1
        }
      }
      
      console.log('解析后的模型数据:', models.value)
      console.log('分页信息:', pagination.value)
    } else {
      console.error('API响应格式错误:', response)
      models.value = []
    }
    
  } catch (error) {
    console.error('加载模型列表失败:', error)
    ElMessage.error('加载模型列表失败: ' + (error.message || '网络错误'))
    models.value = []
  } finally {
    loading.value = false
  }
}

const showAddDialog = () => {
  isEdit.value = false
  form.value = {
    id: null,
    name: '',
    display_name: '',
    description: '',
    provider: '',
    model_type: 'chat',
    api_endpoint: '',
    api_key: '',
    max_tokens: 4096,
    unlimited_tokens: false,
    temperature: 0.7,
    status: 'active',
    is_default: false,
    is_public: true,
    priority: 0
  }
  dialogVisible.value = true
}

// 处理无限令牌切换
const handleUnlimitedChange = (value) => {
  console.log('无限令牌切换:', value)
  if (value) {
    form.value.max_tokens = null
    console.log('设置为无限令牌, max_tokens:', form.value.max_tokens)
  } else {
    form.value.max_tokens = 4096
    console.log('设置为限制令牌, max_tokens:', form.value.max_tokens)
  }
}

const editModel = async (model) => {
  try {
    isEdit.value = true
    form.value = { 
      ...model,
      unlimited_tokens: model.max_tokens === null || model.max_tokens === undefined,
      api_key: '' // 编辑时清空API Key字段，安全起见后端不返回真实值
    }
    dialogVisible.value = true
  } catch (error) {
    console.error('编辑模型失败:', error)
    ElMessage.error('编辑模型失败')
  }
}

const saveModel = async () => {
  try {
    await formRef.value.validate()
    saving.value = true
    
    // 准备提交数据，移除前端专用字段
    const submitData = { ...form.value }
    delete submitData.unlimited_tokens
    
    // 如果API Key为空则不提交该字段（编辑模式下不更新，新增模式下不设置）
    if (!submitData.api_key || submitData.api_key.trim() === '') {
      delete submitData.api_key
    }
    
    console.log('表单数据:', form.value)
    console.log('提交数据:', submitData)
    console.log('是否编辑模式:', isEdit.value)
    
    let response
    if (isEdit.value) {
      response = await aiModelAPI.updateModel(form.value.id, submitData)
    } else {
      response = await aiModelAPI.createModel(submitData)
    }
    
    console.log('保存模型响应:', response)
    
    // 修复响应判断逻辑：axios拦截器已经处理了success字段，成功时直接返回data
    if (response && response.success === true) {
      ElMessage.success(isEdit.value ? '模型更新成功' : '模型创建成功')
      dialogVisible.value = false
      await loadModels()
    } else {
      const errorMsg = response?.message || '保存模型失败'
      ElMessage.error(errorMsg)
    }
  } catch (error) {
    console.error('保存模型失败:', error)
    ElMessage.error('保存模型失败: ' + (error.message || '网络错误'))
  } finally {
    saving.value = false
  }
}

const testModel = (model) => {
  currentTestModel.value = model
  testResult.value = ''
  testDialogVisible.value = true
}

const runTest = async () => {
  if (!testPrompt.value.trim()) {
    ElMessage.warning('请输入测试提示词')
    return
  }
  
  testing.value = true
  testResult.value = ''
  const startTime = Date.now()
  
  try {
    // 本地流式测试
    await runLocalStreamTest()
  } catch (error) {
    console.error('测试模型失败:', error)
    const errorMsg = error.response?.data?.message || error.message || '网络错误'
    testResult.value += '\n\n测试失败: ' + errorMsg
    ElMessage.error('测试失败: ' + errorMsg)
  } finally {
    testing.value = false
  }
}

// 本地流式测试方法
const runLocalStreamTest = async () => {
  const model = currentTestModel.value
  const localStartTime = Date.now()
  
  try {
    // 构建请求数据
    const requestData = {
      model: model.name,
      messages: [
        {
          role: 'user',
          content: testPrompt.value
        }
      ],
      temperature: model.temperature || 0.7,
      stream: true // 启用流式输出
    }
    
    // 直接调用模型API
    const response = await fetch(model.api_endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${model.api_key}`
      },
      body: JSON.stringify(requestData)
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('无法获取响应流')
    }
    
    const decoder = new TextDecoder()
     let fullResponse = ''
     let reasoningContent = ''
     let isThinking = false
     
     testResult.value = `开始时间: ${new Date().toLocaleTimeString()}\n`
     
     while (true) {
       const { done, value } = await reader.read()
       
       if (done) {
         const responseTime = Date.now() - localStartTime
         testResult.value += `\n\n响应完成，总耗时: ${responseTime}ms`
         ElMessage.success('流式测试完成')
         break
       }
       
       const chunk = decoder.decode(value, { stream: true })
       const lines = chunk.split('\n')
       
       for (const line of lines) {
         if (line.startsWith('data: ')) {
           const data = line.slice(6)
           
           if (data === '[DONE]') {
             continue
           }
           
           try {
             const parsed = JSON.parse(data)
             const delta = parsed.choices?.[0]?.delta
             
             // 处理思维链模型的思考过程
             if (delta?.reasoning_content) {
               reasoningContent += delta.reasoning_content
               if (!isThinking) {
                 isThinking = true
                 testResult.value += `\n🤔 思考过程:\n`
               }
               testResult.value = `开始时间: ${new Date(localStartTime).toLocaleTimeString()}\n\n🤔 思考过程:\n${reasoningContent}${fullResponse ? '\n\n💬 模型响应:\n' + fullResponse : ''}`
             }
             
             // 处理正常的响应内容
             if (delta?.content) {
               fullResponse += delta.content
               let displayText = `开始时间: ${new Date(localStartTime).toLocaleTimeString()}\n`
               
               if (reasoningContent) {
                 displayText += `\n🤔 思考过程:\n${reasoningContent}\n\n💬 模型响应:\n${fullResponse}`
               } else {
                 displayText += `\n💬 模型响应:\n${fullResponse}`
               }
               
               testResult.value = displayText
             }
           } catch (e) {
             // 忽略解析错误
           }
         }
       }
     }
  } catch (error) {
    const responseTime = Date.now() - localStartTime
    testResult.value += `\n\n流式测试失败 (${responseTime}ms):\n${error.message}`
    throw error
  }
}

const toggleStatus = async (model) => {
  const action = model.status === 'active' ? '禁用' : '启用'
  try {
    await ElMessageBox.confirm(`确定要${action}模型「${model.display_name || model.name}」吗？`, '确认操作')
    
    const response = await aiModelAPI.updateModel(model.id, {
      status: model.status === 'active' ? 'inactive' : 'active'
    })
    
    console.log('切换状态响应:', response)
    
    // 修复响应判断逻辑：axios拦截器已经处理了success字段，成功时直接返回data
    if (response && response.success === true) {
      ElMessage.success(`模型${action}成功`)
      await loadModels()
    } else {
      const errorMsg = response?.message || '操作失败'
      ElMessage.error(errorMsg)
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('切换状态失败:', error)
      const errorMsg = error.response?.data?.message || error.message || '网络错误'
      ElMessage.error('操作失败: ' + errorMsg)
    }
  }
}



const deleteModel = async (model) => {
  try {
    await ElMessageBox.confirm(`确定要删除模型「${model.display_name || model.name}」吗？此操作不可恢复！`, '确认删除', {
      type: 'warning'
    })
    
    const response = await aiModelAPI.deleteModel(model.id)
    console.log('删除模型响应:', response)
    
    // 修复响应判断逻辑：axios拦截器已经处理了success字段，成功时直接返回data
    if (response && response.success === true) {
      ElMessage.success('模型删除成功')
      await loadModels()
    } else {
      const errorMsg = response?.message || '删除模型失败'
      ElMessage.error(errorMsg)
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除模型失败:', error)
      const errorMsg = error.response?.data?.message || error.message || '网络错误'
      ElMessage.error('删除失败: ' + errorMsg)
    }
  }
}

const handleSearch = () => {
  pagination.value.current_page = 1
  loadModels()
}

// 组件挂载时加载数据
onMounted(() => {
  loadModels()
})
</script>

<style scoped>
.model-purchase-notice {
  margin-bottom: 20px;
  background-color: #fdf6ec;
  border-color: #f5dab1;
}

.model-purchase-notice :deep(.el-alert__content) {
  color: #6b4423;
}

.model-purchase-notice :deep(.el-alert__title) {
  color: #6b4423;
  font-weight: 600;
}

.notice-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.purchase-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-weight: 500;
}

.purchase-link:hover {
  color: #409eff;
}

@media (max-width: 768px) {
  .notice-content {
    flex-direction: column;
    align-items: flex-start;
  }
}
.ai-model-management {
  padding: 20px;
  width: 100%;
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
  width: 100%;
}

.search-section {
  display: flex;
  align-items: center;
}

.action-buttons {
  display: flex;
  gap: 12px;
}

.test-section {
  margin-bottom: 20px;
}

.test-result {
  margin-top: 16px;
  padding: 12px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.test-result h4 {
  margin: 0 0 8px 0;
  color: #333;
}

.test-result p {
  margin: 0;
  color: #666;
  line-height: 1.5;
  white-space: pre-wrap;
}
</style>