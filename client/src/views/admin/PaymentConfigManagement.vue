<template>
  <div class="payment-config-management">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title">支付管理</h1>
      <p class="page-desc">管理系统支付渠道配置，支持多种支付方式</p>
    </div>

    <!-- 支付提示横条 -->
    <el-alert
      title="支付渠道说明"
      type="warning"
      :closable="false"
      show-icon
      class="payment-notice"
    >
      <template #default>
        <div class="notice-content">
          <span>当前系统暂只支持第三方支付蓝兔支付。</span>
          <el-link 
            href="https://www.ltzf.cn/?invite=ltguwf" 
            target="_blank" 
            type="primary"
            :underline="false"
            class="apply-link"
          >
            申请蓝兔支付
            <el-icon><ArrowRight /></el-icon>
          </el-link>
        </div>
      </template>
    </el-alert>

    <!-- 操作栏 -->
    <div class="toolbar">
      <el-button type="primary" @click="showAddDialog">
        <el-icon><Plus /></el-icon>
        添加支付配置
      </el-button>
      <el-button @click="loadConfigs">
        <el-icon><Refresh /></el-icon>
        刷新
      </el-button>
    </div>

    <!-- 配置列表 -->
    <el-card class="table-card" shadow="hover">
      <el-table 
        :data="configs" 
        v-loading="loading" 
        stripe 
        style="width: 100%"
        @sort-change="handleSortChange"
      >
        <el-table-column prop="id" label="ID" width="80" sortable />
        <el-table-column prop="name" label="支付渠道名称" min-width="150" />
        <el-table-column prop="code" label="渠道代码" width="120" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-switch
              v-model="row.status"
              :active-value="1"
              :inactive-value="0"
              @change="toggleStatus(row)"
              :loading="row.statusLoading"
            />
          </template>
        </el-table-column>
        <el-table-column prop="sort_order" label="排序" width="80" sortable />
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="showEditDialog(row)">
              <el-icon><Edit /></el-icon>
              编辑
            </el-button>
            <el-button size="small" @click="viewConfig(row)">
              <el-icon><View /></el-icon>
              查看
            </el-button>
            <el-button 
              size="small" 
              type="danger" 
              @click="deleteConfig(row)"
            >
              <el-icon><Delete /></el-icon>
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
          @size-change="loadConfigs"
          @current-change="loadConfigs"
        />
      </div>
    </el-card>

    <!-- 添加/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑支付渠道' : '添加支付渠道'"
      width="600px"
      @close="resetForm"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="120px"
      >
        <el-form-item label="渠道名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入支付渠道名称" />
        </el-form-item>
        
        <el-form-item label="渠道代码" prop="code">
          <el-select 
            v-model="form.code" 
            placeholder="请选择支付渠道" 
            :disabled="isEdit"
            style="width: 100%"
            @change="handleChannelChange"
          >
            <el-option label="蓝兔支付" value="ltzf" />
            <el-option label="支付宝" value="alipay" />
            <el-option label="微信支付" value="wechat" />
            <el-option label="自定义" value="custom" />
          </el-select>
          <div v-if="form.code === 'custom'" style="margin-top: 8px;">
            <el-input 
              v-model="customCode" 
              placeholder="请输入自定义渠道代码" 
              @input="form.code = customCode"
            />
          </div>
        </el-form-item>
        
        <el-form-item label="配置信息" prop="config">
          <!-- 蓝兔支付配置 -->
          <div v-if="form.code === 'ltzf'" class="config-form">
            <el-form-item label="商户号" required>
              <el-input v-model="configForm.mch_id" placeholder="请输入商户号" />
            </el-form-item>
            <el-form-item label="API密钥" required>
              <el-input v-model="configForm.api_key" type="password" placeholder="请输入API密钥" show-password />
            </el-form-item>
            <el-form-item label="回调地址" required>
              <el-input v-model="configForm.notify_url" placeholder="请输入支付回调地址" />
            </el-form-item>
          </div>
          
          <!-- 支付宝配置 -->
          <div v-else-if="form.code === 'alipay'" class="config-form">
            <el-form-item label="应用ID" required>
              <el-input v-model="configForm.app_id" placeholder="请输入应用ID" />
            </el-form-item>
            <el-form-item label="网关地址" required>
              <el-input v-model="configForm.gateway_url" placeholder="请输入网关地址" />
            </el-form-item>
            <el-form-item label="应用私钥" required>
              <el-input v-model="configForm.private_key" type="textarea" :rows="3" placeholder="请输入应用私钥" />
            </el-form-item>
            <el-form-item label="支付宝公钥" required>
              <el-input v-model="configForm.alipay_public_key" type="textarea" :rows="3" placeholder="请输入支付宝公钥" />
            </el-form-item>
            <el-form-item label="回调地址" required>
              <el-input v-model="configForm.notify_url" placeholder="请输入支付回调地址" />
            </el-form-item>
          </div>
          
          <!-- 微信支付配置 -->
          <div v-else-if="form.code === 'wechat'" class="config-form">
            <el-form-item label="应用ID" required>
              <el-input v-model="configForm.app_id" placeholder="请输入应用ID" />
            </el-form-item>
            <el-form-item label="商户号" required>
              <el-input v-model="configForm.mch_id" placeholder="请输入商户号" />
            </el-form-item>
            <el-form-item label="商户密钥" required>
              <el-input v-model="configForm.mch_key" type="password" placeholder="请输入商户密钥" show-password />
            </el-form-item>
            <el-form-item label="回调地址" required>
              <el-input v-model="configForm.notify_url" placeholder="请输入支付回调地址" />
            </el-form-item>
          </div>
          
          <!-- 其他支付方式或自定义配置 -->
          <div v-else class="config-form">
            <el-alert
              title="自定义配置"
              description="请输入JSON格式的配置信息"
              type="info"
              :closable="false"
              style="margin-bottom: 16px"
            />
            <el-input
              v-model="configText"
              type="textarea"
              :rows="8"
              placeholder="请输入JSON格式的配置信息"
            />
            <div class="config-help">
              <el-text size="small" type="info">
                配置格式示例：<br>
                {
                  "key1": "value1",
                  "key2": "value2"
                }
              </el-text>
            </div>
          </div>
        </el-form-item>
        
        <el-form-item label="排序权重" prop="sort_order">
          <el-input-number 
            v-model="form.sort_order" 
            :min="0" 
            :max="999" 
            placeholder="排序权重"
          />
        </el-form-item>
        
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio :label="1">启用</el-radio>
            <el-radio :label="0">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
        
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="请输入支付渠道描述"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm" :loading="submitting">
          {{ isEdit ? '更新' : '创建' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 查看配置对话框 -->
    <el-dialog
      v-model="viewDialogVisible"
      title="查看支付渠道"
      width="600px"
    >
      <div v-if="viewConfig">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="ID">{{ viewConfigData.id }}</el-descriptions-item>
          <el-descriptions-item label="渠道名称">{{ viewConfigData.name }}</el-descriptions-item>
          <el-descriptions-item label="渠道代码">{{ viewConfigData.code }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="viewConfigData.status === 1 ? 'success' : 'danger'">
              {{ viewConfigData.status === 1 ? '启用' : '禁用' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="排序权重">{{ viewConfigData.sort_order }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatDate(viewConfigData.created_at) }}</el-descriptions-item>
          <el-descriptions-item label="更新时间">{{ formatDate(viewConfigData.updated_at) }}</el-descriptions-item>
          <el-descriptions-item label="描述" :span="2">{{ viewConfigData.description || '无' }}</el-descriptions-item>
        </el-descriptions>
        
        <div class="config-section">
          <h4>配置信息</h4>
          <el-input
            :model-value="JSON.stringify(viewConfigData.config, null, 2)"
            type="textarea"
            :rows="8"
            readonly
          />
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh, Edit, View, Delete, ArrowRight } from '@element-plus/icons-vue'
import { paymentConfigAPI } from '@/api'
import { formatDate } from '@/utils/date'

// 响应式数据
const loading = ref(false)
const submitting = ref(false)
const configs = ref([])
const dialogVisible = ref(false)
const viewDialogVisible = ref(false)
const isEdit = ref(false)
const viewConfigData = ref({})
const formRef = ref()

// 分页数据
const pagination = reactive({
  page: 1,
  limit: 10,
  total: 0
})

// 表单数据
const form = reactive({
  name: '',
  code: '',
  config: {},
  status: 1,
  sort_order: 0,
  description: ''
})

// 配置文本（用于编辑JSON）
const configText = ref('')
const customCode = ref('')

// 表单配置对象（用于结构化编辑）
const configForm = reactive({
  // 蓝兔支付
  mch_id: '',
  api_key: '',
  notify_url: '',
  // 支付宝
  app_id: '',
  gateway_url: '',
  private_key: '',
  alipay_public_key: '',
  // 微信支付
  mch_key: ''
})

// 表单验证规则
const rules = {
  name: [
    { required: true, message: '请输入支付渠道名称', trigger: 'blur' }
  ],
  code: [
    { required: true, message: '请输入渠道代码', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9_-]+$/, message: '渠道代码只能包含字母、数字、下划线和横线', trigger: 'blur' }
  ],
  config: [
    { required: true, message: '请输入配置信息', trigger: 'blur' }
  ]
}

// 加载配置列表
const loadConfigs = async () => {
  try {
    loading.value = true
    const params = {
      page: pagination.page,
      limit: pagination.limit
    }
    
    const response = await paymentConfigAPI.getConfigs(params)
    if (response && response.data) {
      configs.value = response.data.list || []
      pagination.total = response.data.total || 0
      
      // 为每个配置添加状态加载标识
      configs.value.forEach(config => {
        config.statusLoading = false
      })
    }
  } catch (error) {
    console.error('加载支付配置失败:', error)
    ElMessage.error('加载支付配置失败')
  } finally {
    loading.value = false
  }
}

// 显示添加对话框
const showAddDialog = () => {
  isEdit.value = false
  dialogVisible.value = true
  resetForm()
}

// 显示编辑对话框
const showEditDialog = (config) => {
  isEdit.value = true
  dialogVisible.value = true
  
  // 填充表单数据
  Object.assign(form, {
    id: config.id,
    name: config.name,
    code: config.code,
    config: config.config,
    status: config.status,
    sort_order: config.sort_order,
    description: config.description
  })
  
  // 根据支付渠道类型填充配置表单
  if (config.code === 'ltzf') {
    Object.assign(configForm, {
      mch_id: config.config.mch_id || '',
      api_key: config.config.api_key || '',
      notify_url: config.config.notify_url || ''
    })
  } else if (config.code === 'alipay') {
    Object.assign(configForm, {
      app_id: config.config.app_id || '',
      gateway_url: config.config.gateway_url || '',
      private_key: config.config.private_key || '',
      alipay_public_key: config.config.alipay_public_key || '',
      notify_url: config.config.notify_url || ''
    })
  } else if (config.code === 'wechat') {
    Object.assign(configForm, {
      app_id: config.config.app_id || '',
      mch_id: config.config.mch_id || '',
      mch_key: config.config.mch_key || '',
      notify_url: config.config.notify_url || ''
    })
  } else {
    // 其他类型使用JSON编辑
    configText.value = JSON.stringify(config.config || {}, null, 2)
    // 如果是自定义代码，设置customCode
    if (!['ltzf', 'alipay', 'wechat'].includes(config.code)) {
      form.code = 'custom'
      customCode.value = config.code
    }
  }
}

// 查看配置详情
const viewConfig = (config) => {
  viewConfigData.value = { ...config }
  viewDialogVisible.value = true
}

// 处理渠道变更
const handleChannelChange = (value) => {
  if (value === 'ltzf') {
    form.name = '蓝兔支付'
  } else if (value === 'alipay') {
    form.name = '支付宝'
  } else if (value === 'wechat') {
    form.name = '微信支付'
  } else if (value === 'custom') {
    form.name = ''
    customCode.value = ''
  }
}

// 重置表单
const resetForm = () => {
  if (formRef.value) {
    formRef.value.resetFields()
  }
  
  Object.assign(form, {
    name: '',
    code: '',
    config: {},
    status: 1,
    sort_order: 0,
    description: ''
  })
  
  // 重置配置表单
  Object.assign(configForm, {
    mch_id: '',
    api_key: '',
    notify_url: '',
    app_id: '',
    gateway_url: '',
    private_key: '',
    alipay_public_key: '',
    mch_key: ''
  })
  
  configText.value = ''
  customCode.value = ''
}

// 提交表单
const submitForm = async () => {
  try {
    await formRef.value.validate()
    
    // 根据支付渠道类型构建配置对象
    if (form.code === 'ltzf') {
      // 验证蓝兔支付必填字段
      if (!configForm.mch_id || !configForm.api_key || !configForm.notify_url) {
        ElMessage.error('请填写完整的蓝兔支付配置信息')
        return
      }
      form.config = {
        mch_id: configForm.mch_id,
        api_key: configForm.api_key,
        notify_url: configForm.notify_url
      }
    } else if (form.code === 'alipay') {
      // 验证支付宝必填字段
      if (!configForm.app_id || !configForm.gateway_url || !configForm.private_key || !configForm.alipay_public_key || !configForm.notify_url) {
        ElMessage.error('请填写完整的支付宝配置信息')
        return
      }
      form.config = {
        app_id: configForm.app_id,
        gateway_url: configForm.gateway_url,
        private_key: configForm.private_key,
        alipay_public_key: configForm.alipay_public_key,
        notify_url: configForm.notify_url
      }
    } else if (form.code === 'wechat') {
      // 验证微信支付必填字段
      if (!configForm.app_id || !configForm.mch_id || !configForm.mch_key || !configForm.notify_url) {
        ElMessage.error('请填写完整的微信支付配置信息')
        return
      }
      form.config = {
        app_id: configForm.app_id,
        mch_id: configForm.mch_id,
        mch_key: configForm.mch_key,
        notify_url: configForm.notify_url
      }
    } else {
       // 其他类型使用JSON配置
       try {
         form.config = JSON.parse(configText.value)
       } catch (error) {
         ElMessage.error('配置信息格式错误，请输入有效的JSON格式')
         return
       }
       
       // 如果是自定义代码，使用customCode的值
       if (form.code === 'custom') {
         if (!customCode.value.trim()) {
           ElMessage.error('请输入自定义渠道代码')
           return
         }
         form.code = customCode.value.trim()
       }
     }
    
    submitting.value = true
    
    if (isEdit.value) {
      await paymentConfigAPI.updateConfig(form.id, form)
      ElMessage.success('支付配置更新成功')
    } else {
      await paymentConfigAPI.createConfig(form)
      ElMessage.success('支付配置创建成功')
    }
    
    dialogVisible.value = false
    await loadConfigs()
  } catch (error) {
    console.error('提交失败:', error)
    ElMessage.error('操作失败：' + (error.message || '未知错误'))
  } finally {
    submitting.value = false
  }
}

// 切换状态
const toggleStatus = async (config) => {
  try {
    config.statusLoading = true
    await paymentConfigAPI.toggleStatus(config.id)
    ElMessage.success(`支付配置已${config.status === 1 ? '启用' : '禁用'}`)
  } catch (error) {
    // 恢复原状态
    config.status = config.status === 1 ? 0 : 1
    console.error('切换状态失败:', error)
    ElMessage.error('状态切换失败')
  } finally {
    config.statusLoading = false
  }
}

// 删除配置
const deleteConfig = async (config) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除支付配置 "${config.name}" 吗？此操作不可恢复。`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await paymentConfigAPI.deleteConfig(config.id)
    ElMessage.success('支付配置删除成功')
    await loadConfigs()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error('删除失败：' + (error.message || '未知错误'))
    }
  }
}

// 处理排序变化
const handleSortChange = ({ column, prop, order }) => {
  // 这里可以实现服务端排序
  console.log('排序变化:', { column, prop, order })
}

// 组件挂载时加载数据
onMounted(() => {
  loadConfigs()
})
</script>

<style scoped>
.payment-config-management {
  padding: 20px;
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
  font-size: 14px;
}

.toolbar {
  margin-bottom: 20px;
  display: flex;
  gap: 12px;
}

.table-card {
  border-radius: 8px;
}

.pagination-wrapper {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.config-help {
  margin-top: 8px;
  padding: 8px;
  background-color: #f5f7fa;
  border-radius: 4px;
  font-size: 12px;
  line-height: 1.4;
}

.config-section {
  margin-top: 20px;
}

.config-section h4 {
  margin: 0 0 12px 0;
  font-size: 16px;
  color: #303133;
}

:deep(.el-table) {
  border-radius: 8px;
}

:deep(.el-dialog__header) {
  padding: 20px 20px 10px;
}

:deep(.el-dialog__body) {
  padding: 10px 20px 20px;
}

:deep(.el-form-item__label) {
  font-weight: 500;
}

:deep(.el-descriptions__label) {
  font-weight: 500;
}

.config-form {
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  padding: 16px;
  background-color: #fafafa;
}

.config-form .el-form-item {
  margin-bottom: 16px;
}

.config-form .el-form-item:last-child {
  margin-bottom: 0;
}

.payment-notice {
  margin-bottom: 20px;
  background-color: #fdf6ec;
  border-color: #f5dab1;
}

.payment-notice :deep(.el-alert__content) {
  color: #6b4423;
}

.payment-notice :deep(.el-alert__title) {
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

.apply-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-weight: 500;
}

.apply-link:hover {
  color: #409eff;
}

@media (max-width: 768px) {
  .notice-content {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>