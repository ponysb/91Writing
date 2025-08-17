<template>
  <div class="distribution-accounts">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <div class="title-section">
          <h1 class="page-title">
            <el-icon class="title-icon"><User /></el-icon>
            佣金账户管理
          </h1>
          <p class="page-desc">管理所有有邀请过用户的佣金账户，查看分销数据和调整分成比例</p>
        </div>
        <div class="header-actions">
          <el-button @click="refreshData" :icon="Refresh" :loading="loading">
            刷新
          </el-button>
        </div>
      </div>
    </div>

    <!-- 统计概览 -->
    <div class="stats-overview">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card class="stat-card total" shadow="hover">
            <div class="stat-content">
              <div class="stat-icon">
                <el-icon><User /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-number">{{ stats.total_users || 0 }}</div>
                <div class="stat-label">分销用户总数</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card success" shadow="hover">
            <div class="stat-content">
              <div class="stat-icon">
                <el-icon><Money /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-number">¥{{ formatMoney(stats.total_commission) }}</div>
                <div class="stat-label">总佣金金额</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card warning" shadow="hover">
            <div class="stat-content">
              <div class="stat-icon">
                <el-icon><Wallet /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-number">¥{{ formatMoney(stats.total_available) }}</div>
                <div class="stat-label">可提现金额</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card info" shadow="hover">
            <div class="stat-content">
              <div class="stat-icon">
                <el-icon><CreditCard /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-number">¥{{ formatMoney(stats.total_withdrawn) }}</div>
                <div class="stat-label">已提现金额</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 筛选和搜索 -->
    <el-card class="filter-card" shadow="never">
      <div class="filter-section">
        <div class="filter-left">
          <el-input
            v-model="searchQuery"
            placeholder="搜索用户名或邮箱"
            style="width: 300px"
            clearable
            @keyup.enter="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>
        <div class="filter-right">
          <el-select
            v-model="sortBy"
            placeholder="排序字段"
            style="width: 150px"
            @change="handleSearch"
          >
            <el-option label="总佣金" value="total_commission" />
            <el-option label="可提现金额" value="available_amount" />
            <el-option label="已提现金额" value="total_withdrawn" />
            <el-option label="邀请人数" value="invite_count" />
          </el-select>
          <el-select
            v-model="sortOrder"
            placeholder="排序方向"
            style="width: 100px"
            @change="handleSearch"
          >
            <el-option label="降序" value="desc" />
            <el-option label="升序" value="asc" />
          </el-select>
          <el-button type="primary" @click="handleSearch" :loading="loading">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- 账户列表 -->
    <el-card class="table-card" shadow="never">
      <el-table
        :data="accounts"
        v-loading="loading"
        stripe
        border
        style="width: 100%"
      >
        <el-table-column label="用户信息" min-width="200" fixed="left">
          <template #default="{ row }">
            <div class="user-info">
              <div class="username">{{ row.username }}</div>
              <div class="email">{{ row.email }}</div>
              <div class="user-id">ID: {{ row.user_id }}</div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="分销比例" width="120" align="center">
          <template #default="{ row }">
            <div class="commission-rate">
              <span class="rate-value">{{ (row.commission_rate * 100).toFixed(1) }}%</span>
              <el-button
                type="primary"
                size="small"
                link
                @click="editCommissionRate(row)"
                :icon="Edit"
              >
                调整
              </el-button>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="邀请统计" min-width="150" align="center">
          <template #default="{ row }">
            <div class="invite-stats">
              <div class="total-invites">总邀请: {{ row.invite_count || 0 }}</div>
              <div class="successful-invites">成功: {{ row.successful_invite_count || 0 }}</div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="累计销售订单" min-width="120" align="center">
          <template #default="{ row }">
            <span class="order-count">{{ row.total_orders || 0 }}</span>
          </template>
        </el-table-column>
        <el-table-column label="总佣金" min-width="120" align="center">
          <template #default="{ row }">
            <span class="amount total">¥{{ formatMoney(row.total_commission) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="已提现" min-width="120" align="center">
          <template #default="{ row }">
            <span class="amount withdrawn">¥{{ formatMoney(row.total_withdrawn) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="可提现" min-width="120" align="center">
          <template #default="{ row }">
            <span class="amount available">¥{{ formatMoney(row.available_amount) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="最后分成时间" min-width="150" align="center">
          <template #default="{ row }">
            <span v-if="row.last_commission_at">
              {{ formatDate(row.last_commission_at) }}
            </span>
            <span v-else class="text-muted">暂无</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button
              type="primary"
              size="small"
              @click="viewDetails(row)"
              :icon="View"
            >
              详情
            </el-button>
            <el-button
              type="warning"
              size="small"
              @click="editCommissionRate(row)"
              :icon="Edit"
            >
              调整比例
            </el-button>
          </template>
        </el-table-column>
      </el-table>

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

    <!-- 调整分成比例对话框 -->
    <el-dialog
      v-model="rateDialogVisible"
      title="调整分成比例"
      width="500px"
      :close-on-click-modal="false"
    >
      <div v-if="selectedAccount" class="rate-dialog-content">
        <div class="user-info-section">
          <h4>用户信息</h4>
          <p><strong>用户名:</strong> {{ selectedAccount.username }}</p>
          <p><strong>邮箱:</strong> {{ selectedAccount.email }}</p>
          <p><strong>当前比例:</strong> {{ (selectedAccount.commission_rate * 100).toFixed(1) }}%</p>
        </div>
        
        <el-form
          ref="rateFormRef"
          :model="rateForm"
          :rules="rateFormRules"
          label-width="120px"
        >
          <el-form-item label="新分成比例" prop="commission_rate">
            <el-input-number
              v-model="rateForm.commission_rate"
              :min="0"
              :max="100"
              :precision="2"
              style="width: 100%"
            />
            <div class="form-tip">输入百分比数值，如：15 表示 15%</div>
          </el-form-item>

        </el-form>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="rateDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitRateChange" :loading="submitting">
            确定调整
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 账户详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="账户详情"
      width="800px"
      :close-on-click-modal="false"
    >
      <div v-if="accountDetail" class="account-detail">
        <el-tabs v-model="activeTab">
          <el-tab-pane label="基本信息" name="basic">
            <div class="basic-info">
              <el-row :gutter="20">
                <el-col :span="12">
                  <div class="info-item">
                    <label>用户ID:</label>
                    <span>{{ accountDetail.user_info.user_id }}</span>
                  </div>
                  <div class="info-item">
                    <label>用户名:</label>
                    <span>{{ accountDetail.user_info.username }}</span>
                  </div>
                  <div class="info-item">
                    <label>邮箱:</label>
                    <span>{{ accountDetail.user_info.email }}</span>
                  </div>
                  <div class="info-item">
                    <label>手机号:</label>
                    <span>{{ accountDetail.user_info.phone || '未设置' }}</span>
                  </div>
                </el-col>
                <el-col :span="12">
                  <div class="info-item">
                    <label>注册时间:</label>
                    <span>{{ formatDate(accountDetail.user_info.created_at) }}</span>
                  </div>
                  <div class="info-item">
                    <label>分成比例:</label>
                    <span>{{ (accountDetail.commission_summary.commission_rate * 100).toFixed(1) }}%</span>
                  </div>
                  <div class="info-item">
                    <label>总佣金:</label>
                    <span class="amount">¥{{ formatMoney(accountDetail.commission_summary.total_commission) }}</span>
                  </div>
                  <div class="info-item">
                    <label>可提现:</label>
                    <span class="amount available">¥{{ formatMoney(accountDetail.commission_summary.available_amount) }}</span>
                  </div>
                </el-col>
              </el-row>
            </div>
          </el-tab-pane>
          
          <el-tab-pane label="邀请统计" name="invite">
            <div class="invite-summary">
              <el-row :gutter="20">
                <el-col :span="6">
                  <div class="summary-item">
                    <div class="summary-number">{{ accountDetail.invite_summary.total_invites }}</div>
                    <div class="summary-label">总邀请数</div>
                  </div>
                </el-col>
                <el-col :span="6">
                  <div class="summary-item">
                    <div class="summary-number success">{{ accountDetail.invite_summary.successful_invites }}</div>
                    <div class="summary-label">成功邀请</div>
                  </div>
                </el-col>
                <el-col :span="6">
                  <div class="summary-item">
                    <div class="summary-number warning">{{ accountDetail.invite_summary.pending_invites }}</div>
                    <div class="summary-label">待注册</div>
                  </div>
                </el-col>
                <el-col :span="6">
                  <div class="summary-item">
                    <div class="summary-number danger">{{ accountDetail.invite_summary.expired_invites }}</div>
                    <div class="summary-label">已过期</div>
                  </div>
                </el-col>
              </el-row>
            </div>
          </el-tab-pane>
          
          <el-tab-pane label="最近分成" name="commission">
            <el-table
              :data="accountDetail.recent_commissions"
              stripe
              style="width: 100%"
            >
              <el-table-column prop="id" label="ID" width="80" />
              <el-table-column label="分成类型" width="120">
                <template #default="{ row }">
                  <el-tag :type="getCommissionTypeTag(row.commission_type)" size="small">
                    {{ getCommissionTypeLabel(row.commission_type) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="分成金额" width="120">
                <template #default="{ row }">
                  <span class="amount">¥{{ formatMoney(row.commission_amount) }}</span>
                </template>
              </el-table-column>
              <el-table-column label="结算状态" width="120">
                <template #default="{ row }">
                  <el-tag :type="getSettlementStatusTag(row.settlement_status)" size="small">
                    {{ getSettlementStatusLabel(row.settlement_status) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="创建时间" width="150">
                <template #default="{ row }">
                  {{ formatDate(row.created_at) }}
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>
          
          <el-tab-pane label="提现记录" name="withdrawal">
            <el-table
              :data="accountDetail.recent_withdrawals"
              stripe
              style="width: 100%"
            >
              <el-table-column prop="id" label="ID" width="80" />
              <el-table-column label="提现金额" width="120">
                <template #default="{ row }">
                  <span class="amount">¥{{ formatMoney(row.total_amount) }}</span>
                </template>
              </el-table-column>
              <el-table-column label="实际到账" width="120">
                <template #default="{ row }">
                  <span class="amount">¥{{ formatMoney(row.actual_amount) }}</span>
                </template>
              </el-table-column>
              <el-table-column label="状态" width="100">
                <template #default="{ row }">
                  <el-tag :type="getWithdrawalStatusTag(row.status)" size="small">
                    {{ getWithdrawalStatusLabel(row.status) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="申请时间" width="150">
                <template #default="{ row }">
                  {{ formatDate(row.created_at) }}
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>
        </el-tabs>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  User,
  Refresh,
  Search,
  Edit,
  View,
  Money,
  Wallet,
  CreditCard
} from '@element-plus/icons-vue'
import { distributionAccountAPI, distributionConfigAPI } from '@/api/distribution'

// 响应式数据
const loading = ref(false)
const submitting = ref(false)
const searchQuery = ref('')
const sortBy = ref('total_commission')
const sortOrder = ref('desc')
const rateDialogVisible = ref(false)
const detailDialogVisible = ref(false)
const activeTab = ref('basic')
const rateFormRef = ref()

// 数据
const accounts = ref([])
const stats = ref({})
const selectedAccount = ref(null)
const accountDetail = ref(null)

const pagination = reactive({
  current_page: 1,
  per_page: 20,
  total_count: 0,
  total_pages: 0
})

// 表单数据
const rateForm = reactive({
  commission_rate: 0
})

// 表单验证规则
const rateFormRules = {
  commission_rate: [
    { required: true, message: '请输入分成比例', trigger: 'blur' },
    { type: 'number', min: 0, max: 100, message: '分成比例必须在0-100之间', trigger: 'blur' }
  ]
}

// 方法
const loadAccounts = async () => {
  try {
    loading.value = true
    const params = {
      page: pagination.current_page,
      limit: pagination.per_page,
      search: searchQuery.value,
      sort_by: sortBy.value,
      sort_order: sortOrder.value
    }
    
    const response = await distributionAccountAPI.getAdminAccounts(params)
    
    if (response.success) {
      accounts.value = response.data.list || []
      const paginationData = response.data.pagination || {}
      pagination.current_page = paginationData.page || 1
      pagination.per_page = paginationData.limit || 20
      pagination.total_count = paginationData.total ? paginationData.total.length : 0
      pagination.total_pages = paginationData.pages || Math.ceil(pagination.total_count / pagination.per_page)
      
      // 计算统计数据
      const accountList = response.data.list || []
      stats.value = {
        total_users: accountList.length,
        total_commission: accountList.reduce((sum, account) => sum + (account.total_commission || 0), 0),
        total_available: accountList.reduce((sum, account) => sum + (account.available_amount || 0), 0),
        total_withdrawn: accountList.reduce((sum, account) => sum + (account.withdrawn_amount || 0), 0)
      }
    }
  } catch (error) {
    console.error('加载账户失败:', error)
    ElMessage.error('加载账户失败')
  } finally {
    loading.value = false
  }
}

const refreshData = () => {
  loadAccounts()
}

const handleSearch = () => {
  pagination.current_page = 1
  loadAccounts()
}

const handleSizeChange = (size) => {
  pagination.per_page = size
  pagination.current_page = 1
  loadAccounts()
}

const handleCurrentChange = (page) => {
  pagination.current_page = page
  loadAccounts()
}

const editCommissionRate = (account) => {
  selectedAccount.value = account
  rateForm.commission_rate = account.commission_rate * 100
  rateDialogVisible.value = true
}

const submitRateChange = async () => {
  try {
    await rateFormRef.value.validate()
    submitting.value = true
    
    const data = {
      commission_rate: rateForm.commission_rate / 100
    }
    
    // 使用新的分销配置API设置用户个性化分销比例
    await distributionConfigAPI.setUserConfig(selectedAccount.value.username, data)
    ElMessage.success('分成比例调整成功')
    
    rateDialogVisible.value = false
    loadAccounts()
  } catch (error) {
    console.error('调整失败:', error)
    ElMessage.error('分成比例调整失败')
  } finally {
    submitting.value = false
  }
}

const viewDetails = async (account) => {
  try {
    loading.value = true
    const response = await distributionAccountAPI.getAdminAccount(account.user_id)
    
    if (response.success) {
      accountDetail.value = response.data
      detailDialogVisible.value = true
      activeTab.value = 'basic'
    }
  } catch (error) {
    console.error('加载详情失败:', error)
    ElMessage.error('加载账户详情失败')
  } finally {
    loading.value = false
  }
}

// 工具方法
const formatMoney = (amount) => {
  return parseFloat(amount || 0).toFixed(2)
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleString('zh-CN')
}

const getCommissionTypeTag = (type) => {
  const typeMap = {
    registration: 'success',
    purchase: 'warning',
    subscription: 'primary'
  }
  return typeMap[type] || 'info'
}

const getCommissionTypeLabel = (type) => {
  const typeMap = {
    registration: '注册分成',
    purchase: '购买分成',
    subscription: '订阅分成'
  }
  return typeMap[type] || type
}

const getSettlementStatusTag = (status) => {
  const statusMap = {
    unsettled: 'warning',
    processing: 'primary',
    settled: 'success',
    failed: 'danger'
  }
  return statusMap[status] || 'info'
}

const getSettlementStatusLabel = (status) => {
  const statusMap = {
    unsettled: '未结算',
    processing: '处理中',
    settled: '已结算',
    failed: '结算失败'
  }
  return statusMap[status] || status
}

const getWithdrawalStatusTag = (status) => {
  const statusMap = {
    pending: 'warning',
    approved: 'primary',
    rejected: 'danger',
    completed: 'success',
    failed: 'danger'
  }
  return statusMap[status] || 'info'
}

const getWithdrawalStatusLabel = (status) => {
  const statusMap = {
    pending: '待审核',
    approved: '已批准',
    rejected: '已拒绝',
    completed: '已完成',
    failed: '失败'
  }
  return statusMap[status] || status
}

// 生命周期
onMounted(() => {
  loadAccounts()
})
</script>

<style scoped>
.distribution-accounts {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title-section {
  display: flex;
  flex-direction: column;
}

.page-title {
  display: flex;
  align-items: center;
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.title-icon {
  margin-right: 8px;
  color: #409eff;
}

.page-desc {
  margin: 8px 0 0 0;
  color: #909399;
  font-size: 14px;
}

.stats-overview {
  margin-bottom: 20px;
}

.stat-card {
  height: 100px;
}

.stat-content {
  display: flex;
  align-items: center;
  height: 100%;
}

.stat-icon {
  font-size: 32px;
  margin-right: 16px;
  color: #409eff;
}

.stat-info {
  flex: 1;
}

.stat-number {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 4px;
}

.stat-label {
  color: #909399;
  font-size: 14px;
}

.filter-card {
  margin-bottom: 20px;
}

.filter-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.filter-right {
  display: flex;
  gap: 12px;
}

.table-card {
  margin-bottom: 20px;
}

.user-info {
  line-height: 1.5;
}

.username {
  font-weight: 600;
  color: #303133;
}

.email {
  color: #606266;
  font-size: 12px;
}

.user-id {
  color: #909399;
  font-size: 12px;
}

.commission-rate {
  text-align: center;
}

.rate-value {
  display: block;
  font-weight: 600;
  color: #409eff;
  margin-bottom: 4px;
}

.invite-stats {
  text-align: center;
  line-height: 1.5;
}

.total-invites {
  font-weight: 600;
  color: #303133;
}

.successful-invites {
  color: #67c23a;
  font-size: 12px;
}

.amount {
  font-weight: 600;
}

.amount.total {
  color: #409eff;
}

.amount.withdrawn {
  color: #909399;
}

.amount.available {
  color: #67c23a;
}

.order-count {
  font-weight: 600;
  color: #e6a23c;
}

.text-muted {
  color: #c0c4cc;
}

.pagination-wrapper {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.rate-dialog-content {
  padding: 10px 0;
}

.user-info-section {
  background: #f5f7fa;
  padding: 16px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.user-info-section h4 {
  margin: 0 0 12px 0;
  color: #303133;
}

.user-info-section p {
  margin: 8px 0;
  color: #606266;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.account-detail {
  padding: 10px 0;
}

.basic-info {
  padding: 20px 0;
}

.info-item {
  display: flex;
  margin-bottom: 16px;
  align-items: center;
}

.info-item label {
  width: 100px;
  color: #909399;
  font-size: 14px;
}

.info-item span {
  color: #303133;
  font-weight: 500;
}

.invite-summary {
  padding: 20px 0;
}

.summary-item {
  text-align: center;
  padding: 20px;
  background: #f5f7fa;
  border-radius: 8px;
}

.summary-number {
  font-size: 28px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
}

.summary-number.success {
  color: #67c23a;
}

.summary-number.warning {
  color: #e6a23c;
}

.summary-number.danger {
  color: #f56c6c;
}

.summary-label {
  color: #909399;
  font-size: 14px;
}
</style>