<template>
  <div class="distribution-config">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <div class="title-section">
          <h1 class="page-title">
            <el-icon class="title-icon"><Setting /></el-icon>
            分销配置管理
          </h1>
          <p class="page-desc">管理全局分销比例和用户个性化分销配置</p>
        </div>
        <div class="header-actions">
          <el-button @click="refreshData" :icon="Refresh" :loading="loading" type="primary" plain>
            刷新数据
          </el-button>
        </div>
      </div>
    </div>

    <!-- 配置概览统计 -->
    <div class="stats-overview">
      <el-row :gutter="24">
        <el-col :xs="24" :sm="12" :md="6" :lg="4">
          <div class="stat-card global-stat">
            <div class="stat-icon">
              <el-icon><Money /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ (globalConfig.commission_rate * 100).toFixed(1) }}%</div>
              <div class="stat-label">全局分销比例</div>
              <div class="stat-status">
                <el-tag :type="globalConfig.is_enabled ? 'success' : 'danger'" size="small" effect="light">
                  {{ globalConfig.is_enabled ? '已启用' : '已禁用' }}
                </el-tag>
              </div>
            </div>
            <div class="stat-action">
              <el-button type="primary" size="small" @click="editGlobalConfig" :icon="Edit" circle plain />
            </div>
          </div>
        </el-col>
        <el-col :xs="24" :sm="12" :md="6" :lg="4">
          <div class="stat-card">
            <div class="stat-icon users-icon">
              <el-icon><User /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ userConfigs.length }}</div>
              <div class="stat-label">个性化配置用户</div>
              <div class="stat-status">
                <span style="font-size: 12px; color: #718096;">{{ userConfigs.length > 0 ? '有用户配置' : '暂无配置' }}</span>
              </div>
            </div>
          </div>
        </el-col>
        <el-col :xs="24" :sm="12" :md="6" :lg="4">
          <div class="stat-card">
            <div class="stat-icon rate-icon">
              <el-icon><TrendCharts /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ getAverageRate() }}%</div>
              <div class="stat-label">平均分销比例</div>
              <div class="stat-status">
                <span style="font-size: 12px; color: #718096;">基于个性化配置</span>
              </div>
            </div>
          </div>
        </el-col>
        <el-col :xs="24" :sm="12" :md="6" :lg="4">
          <div class="stat-card">
            <div class="stat-icon active-icon">
              <el-icon><CircleCheck /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ getActiveConfigsCount() }}</div>
              <div class="stat-label">活跃配置数</div>
              <div class="stat-status">
                <span style="font-size: 12px; color: #718096;">当前生效中</span>
              </div>
            </div>
          </div>
        </el-col>
        <el-col :xs="24" :sm="12" :md="6" :lg="4">
          <div class="stat-card">
            <div class="stat-icon withdrawal-icon">
              <el-icon><Money /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">¥{{ (globalConfig.min_withdrawal_amount || 0).toFixed(2) }}</div>
              <div class="stat-label">最小可提现金额</div>
              <div class="stat-status">
                <span style="font-size: 12px; color: #718096;">提现门槛设置</span>
              </div>
            </div>
          </div>
        </el-col>
      </el-row>
    </div>

    <!-- 用户个性化配置 -->
    <div class="user-config-section">
      <el-card class="user-config-card" shadow="hover">
        <template #header>
          <div class="section-header">
            <div class="section-title">
              <el-icon class="section-icon"><UserFilled /></el-icon>
              <span>用户个性化分销配置</span>
              <el-badge :value="userConfigs.length" class="config-count-badge" type="primary" />
            </div>
            <div class="section-actions">
              <el-input
                v-model="searchQuery"
                placeholder="搜索用户ID或用户名"
                class="search-input"
                clearable
                @keyup.enter="handleSearch"
              >
                <template #prefix>
                  <el-icon><Search /></el-icon>
                </template>
              </el-input>
              <el-button type="primary" @click="showAddUserConfigDialog" :icon="Plus">
                添加配置
              </el-button>
            </div>
          </div>
        </template>

        <div class="table-container">
          <el-table
            :data="userConfigs"
            v-loading="loading"
            class="modern-table"
            :header-cell-style="{ background: '#f8f9fa', color: '#606266', fontWeight: '600' }"
            :row-style="{ height: '60px' }"
            empty-text="暂无个性化配置"
          >
            <el-table-column prop="user_id" label="用户ID" width="100" align="center">
              <template #default="{ row }">
                <el-tag size="small" type="info" effect="plain">#{{ row.user_id }}</el-tag>
              </template>
            </el-table-column>
            
            <el-table-column prop="username" label="用户信息" min-width="180">
              <template #default="{ row }">
                <div class="user-info">
                  <div class="user-avatar">
                    <el-avatar :size="32" :src="row.avatar">
                      <el-icon><User /></el-icon>
                    </el-avatar>
                  </div>
                  <div class="user-details">
                    <div class="username">{{ row.username || '未知用户' }}</div>
                    <div class="user-meta">ID: {{ row.user_id }}</div>
                  </div>
                </div>
              </template>
            </el-table-column>
            
            <el-table-column label="分销比例" width="150" align="center">
              <template #default="{ row }">
                <div class="rate-display">
                  <div class="rate-value">{{ (row.commission_rate * 100).toFixed(1) }}%</div>
                  <div class="rate-comparison">
                    <span :class="getRateComparisonClass(row.commission_rate)">
                      {{ getRateComparisonText(row.commission_rate) }}
                    </span>
                  </div>
                </div>
              </template>
            </el-table-column>
            
            <el-table-column label="配置状态" width="120" align="center">
              <template #default="{ row }">
                <el-tag type="success" size="small" effect="light">
                  <el-icon><CircleCheck /></el-icon>
                  <span style="margin-left: 4px;">生效中</span>
                </el-tag>
              </template>
            </el-table-column>

            <el-table-column prop="updated_at" label="更新时间" width="160" align="center">
              <template #default="{ row }">
                <div class="time-display">
                  <div class="date">{{ formatDate(row.updated_at) }}</div>
                  <div class="time">{{ formatTime(row.updated_at) }}</div>
                </div>
              </template>
            </el-table-column>
            
            <el-table-column label="操作" width="160" fixed="right" align="center">
              <template #default="{ row }">
                <div class="action-buttons">
                  <el-button
                    type="primary"
                    size="small"
                    @click="editUserConfig(row)"
                    :icon="Edit"
                    circle
                    plain
                  />
                  <el-button
                    type="danger"
                    size="small"
                    @click="deleteUserConfig(row)"
                    :icon="Delete"
                    circle
                    plain
                  />
                </div>
              </template>
            </el-table-column>
          </el-table>
        </div>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.current_page"
          v-model:page-size="pagination.per_page"
          :total="pagination.total_count"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
      </el-card>
    </div>

    <!-- 全局配置编辑对话框 -->
    <el-dialog
      v-model="globalDialogVisible"
      title="编辑全局分销配置"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="globalFormRef"
        :model="globalFormData"
        :rules="globalFormRules"
        label-width="120px"
      >
        <el-form-item label="分销比例" prop="commission_rate">
          <el-input-number
            v-model="globalFormData.commission_rate"
            :min="0"
            :max="100"
            :precision="2"
            :step="0.1"
            style="width: 100%"
          />
          <div class="form-tip">单位：%，范围：0-100</div>
        </el-form-item>
        <el-form-item label="最小可提现金额" prop="min_withdrawal_amount">
          <el-input-number
            v-model="globalFormData.min_withdrawal_amount"
            :min="0.01"
            :precision="2"
            :step="1"
            style="width: 100%"
          />
          <div class="form-tip">单位：元，用户余额达到此金额才能申请提现</div>
        </el-form-item>
        <el-form-item label="启用状态">
          <el-switch v-model="globalFormData.is_enabled" />
          <div class="form-tip">关闭后所有分销功能将停止</div>
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="globalDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitGlobalConfig" :loading="submitting">
            保存
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 用户配置编辑对话框 -->
    <el-dialog
      v-model="userDialogVisible"
      :title="isEditUser ? '编辑用户分销配置' : '添加用户分销配置'"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="userFormRef"
        :model="userFormData"
        :rules="userFormRules"
        label-width="120px"
      >
        <el-form-item label="用户名" prop="username">
          <el-input
            v-model="userFormData.username"
            placeholder="请输入用户名"
            :disabled="isEditUser"
          />
        </el-form-item>
        <el-form-item label="分销比例" prop="commission_rate">
          <el-input-number
            v-model="userFormData.commission_rate"
            :min="0"
            :max="100"
            :precision="2"
            :step="0.1"
            style="width: 100%"
          />
          <div class="form-tip">单位：%，范围：0-100</div>
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="userDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitUserConfig" :loading="submitting">
            {{ isEditUser ? '更新' : '创建' }}
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Setting,
  Plus,
  Refresh,
  Search,
  Edit,
  Delete,
  Money,
  UserFilled,
  User,
  CircleCheck,
  TrendCharts
} from '@element-plus/icons-vue'
import { distributionConfigAPI } from '@/api/distribution'

// 响应式数据
const loading = ref(false)
const submitting = ref(false)
const globalDialogVisible = ref(false)
const userDialogVisible = ref(false)
const isEditUser = ref(false)
const searchQuery = ref('')
const globalFormRef = ref()
const userFormRef = ref()

// 全局配置
const globalConfig = ref({
  commission_rate: 0.1,
  is_enabled: true
})

// 用户配置列表
const userConfigs = ref([])
const pagination = reactive({
  current_page: 1,
  per_page: 20,
  total_count: 0,
  total_pages: 0
})

// 全局配置表单数据
const globalFormData = reactive({
  commission_rate: 10,
  is_enabled: true,
  min_withdrawal_amount: 10
})

// 用户配置表单数据
const userFormData = reactive({
  user_id: '',
  username: '',
  commission_rate: 10
})

// 表单验证规则
const globalFormRules = {
  commission_rate: [
    { required: true, message: '请输入分销比例', trigger: 'blur' },
    { type: 'number', min: 0, max: 100, message: '分销比例必须在0-100之间', trigger: 'blur' }
  ],
  min_withdrawal_amount: [
    { required: true, message: '请输入最小可提现金额', trigger: 'blur' },
    { type: 'number', min: 0.01, message: '最小可提现金额必须大于0', trigger: 'blur' }
  ]
}

const userFormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' }
  ],
  commission_rate: [
    { required: true, message: '请输入分销比例', trigger: 'blur' },
    { type: 'number', min: 0, max: 100, message: '分销比例必须在0-100之间', trigger: 'blur' }
  ]
}

// 方法
const loadGlobalConfig = async () => {
  try {
    const response = await distributionConfigAPI.getAdminConfigs()
    if (response.success) {
      globalConfig.value = response.data.global_config || {}
    }
  } catch (error) {
    console.error('加载全局配置失败:', error)
    ElMessage.error('加载全局配置失败')
  }
}

const loadUserConfigs = async () => {
  try {
    loading.value = true
    const params = {
      page: pagination.current_page,
      limit: pagination.per_page,
      search: searchQuery.value
    }
    
    const response = await distributionConfigAPI.getAdminConfigs(params)
    
    if (response.success) {
      userConfigs.value = response.data.user_configs || []
      Object.assign(pagination, response.data.pagination || {})
    }
  } catch (error) {
    console.error('加载用户配置失败:', error)
    ElMessage.error('加载用户配置失败')
  } finally {
    loading.value = false
  }
}

const refreshData = () => {
  loadGlobalConfig()
  loadUserConfigs()
}

const handleSearch = () => {
  pagination.current_page = 1
  loadUserConfigs()
}

const handleSizeChange = (size) => {
  pagination.per_page = size
  pagination.current_page = 1
  loadUserConfigs()
}

const handleCurrentChange = (page) => {
  pagination.current_page = page
  loadUserConfigs()
}

const editGlobalConfig = () => {
  globalFormData.commission_rate = globalConfig.value.commission_rate * 100
  globalFormData.is_enabled = globalConfig.value.is_enabled
  globalFormData.min_withdrawal_amount = globalConfig.value.min_withdrawal_amount || 10
  globalDialogVisible.value = true
}

const submitGlobalConfig = async () => {
  try {
    await globalFormRef.value.validate()
    submitting.value = true
    
    const data = {
      commission_rate: globalFormData.commission_rate / 100,
      is_enabled: globalFormData.is_enabled,
      min_withdrawal_amount: globalFormData.min_withdrawal_amount
    }
    
    const response = await distributionConfigAPI.setGlobalConfig(data)
    
    if (response.success) {
      ElMessage.success('全局配置更新成功')
      globalDialogVisible.value = false
      loadGlobalConfig()
    }
  } catch (error) {
    console.error('更新全局配置失败:', error)
    ElMessage.error('更新全局配置失败')
  } finally {
    submitting.value = false
  }
}

const showAddUserConfigDialog = () => {
  isEditUser.value = false
  resetUserForm()
  userDialogVisible.value = true
}

const editUserConfig = (config) => {
  isEditUser.value = true
  userFormData.user_id = config.user_id
  userFormData.username = config.username
  userFormData.commission_rate = config.commission_rate * 100
  userDialogVisible.value = true
}

const submitUserConfig = async () => {
  try {
    await userFormRef.value.validate()
    submitting.value = true
    
    const data = {
      commission_rate: userFormData.commission_rate / 100
    }
    
    const response = await distributionConfigAPI.setUserConfig(userFormData.username, data)
    
    if (response.success) {
      ElMessage.success(isEditUser.value ? '用户配置更新成功' : '用户配置创建成功')
      userDialogVisible.value = false
      loadUserConfigs()
    }
  } catch (error) {
    console.error('保存用户配置失败:', error)
    ElMessage.error('保存用户配置失败')
  } finally {
    submitting.value = false
  }
}

const deleteUserConfig = async (config) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除用户 ${config.username || config.user_id} 的个性化分销配置吗？删除后将使用全局默认比例。`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const response = await distributionConfigAPI.deleteUserConfig(config.username)
    
    if (response.success) {
      ElMessage.success('删除成功')
      loadUserConfigs()
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除用户配置失败:', error)
      ElMessage.error('删除用户配置失败')
    }
  }
}

const resetUserForm = () => {
  userFormData.user_id = ''
  userFormData.username = ''
  userFormData.commission_rate = 10
  userFormRef.value?.clearValidate()
}

const formatDate = (dateTime) => {
  if (!dateTime) return '-'
  return new Date(dateTime).toLocaleDateString('zh-CN')
}

const formatTime = (dateTime) => {
  if (!dateTime) return '-'
  return new Date(dateTime).toLocaleTimeString('zh-CN')
}

const getAverageRate = () => {
  if (userConfigs.value.length === 0) return '0.0'
  const total = userConfigs.value.reduce((sum, config) => sum + config.commission_rate, 0)
  return ((total / userConfigs.value.length) * 100).toFixed(1)
}

const getActiveConfigsCount = () => {
  return userConfigs.value.length
}

const getRateComparisonClass = (rate) => {
  const globalRate = globalConfig.value.commission_rate
  if (rate > globalRate) return 'rate-higher'
  if (rate < globalRate) return 'rate-lower'
  return 'rate-equal'
}

const getRateComparisonText = (rate) => {
  const globalRate = globalConfig.value.commission_rate
  if (rate > globalRate) return '高于全局'
  if (rate < globalRate) return '低于全局'
  return '等于全局'
}

// 生命周期
onMounted(() => {
  refreshData()
})
</script>

<style scoped>
.distribution-config {
  padding: 24px;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  min-height: 100vh;
}

.page-header {
  margin-bottom: 24px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 32px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.title-section {
  display: flex;
  flex-direction: column;
}

.page-title {
  display: flex;
  align-items: center;
  font-size: 28px;
  font-weight: 700;
  color: #1a202c;
  margin: 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.title-icon {
  margin-right: 8px;
  color: #667eea;
}

.page-desc {
  color: #718096;
  margin: 8px 0 0 0;
  font-size: 14px;
  font-weight: 500;
}

.stats-overview {
  margin-bottom: 24px;
}

.stat-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
}

.stat-card.global-stat::before {
  background: linear-gradient(90deg, #48bb78 0%, #38a169 100%);
}

.stat-icon {
  font-size: 32px;
  padding: 12px;
  border-radius: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 56px;
  height: 56px;
}

.users-icon {
  background: linear-gradient(135deg, #4299e1 0%, #3182ce 100%);
}

.rate-icon {
  background: linear-gradient(135deg, #ed8936 0%, #dd6b20 100%);
}

.active-icon {
  background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
}

.withdrawal-icon {
  background: linear-gradient(135deg, #9f7aea 0%, #805ad5 100%);
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #1a202c;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: #718096;
  font-weight: 500;
  margin-bottom: 8px;
}

.stat-status {
  margin-top: 8px;
}

.stat-action {
  margin-left: auto;
}

.user-config-section {
  margin-bottom: 24px;
}

.user-config-card {
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  overflow: hidden;
  margin-bottom: 24px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 18px;
  font-weight: 600;
  color: #1a202c;
}

.section-icon {
  font-size: 20px;
  color: #667eea;
}

.config-count-badge {
  margin-left: 8px;
}

.section-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.search-input {
  width: 240px;
}

.table-container {
  border-radius: 12px;
  overflow: hidden;
}

.modern-table {
  border-radius: 12px;
  overflow: hidden;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-avatar {
  flex-shrink: 0;
}

.user-details {
  flex: 1;
}

.username {
  font-weight: 600;
  color: #1a202c;
  font-size: 14px;
  margin-bottom: 2px;
}

.user-meta {
  font-size: 12px;
  color: #718096;
}

.rate-display {
  text-align: center;
}

.rate-value {
  font-size: 18px;
  font-weight: 700;
  color: #48bb78;
  margin-bottom: 4px;
}

.rate-comparison {
  font-size: 12px;
}

.rate-higher {
  color: #f56565;
  font-weight: 600;
}

.rate-lower {
  color: #4299e1;
  font-weight: 600;
}

.rate-equal {
  color: #718096;
  font-weight: 500;
}

.time-display {
  text-align: center;
}

.date {
  font-size: 13px;
  color: #1a202c;
  font-weight: 500;
  margin-bottom: 2px;
}

.time {
  font-size: 12px;
  color: #718096;
}

.action-buttons {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.effective-rate {
  font-weight: 600;
  color: #67c23a;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.dialog-footer {
  text-align: right;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .distribution-config {
    padding: 16px;
  }
  
  .header-content {
    flex-direction: column;
    gap: 16px;
    padding: 20px;
  }
  
  .section-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .section-actions {
    flex-direction: column;
    gap: 12px;
  }
  
  .search-input {
    width: 100%;
  }
  
  .stat-card {
    flex-direction: column;
    text-align: center;
    gap: 12px;
  }
}
</style>