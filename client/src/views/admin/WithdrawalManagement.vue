<template>
  <div class="withdrawal-management">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <div class="title-section">
          <h1 class="page-title">
            <el-icon class="title-icon"><CreditCard /></el-icon>
            提现工单管理
          </h1>
          <p class="page-desc">管理用户提现申请，审核和处理提现工单</p>
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
          <el-card class="stat-card pending" shadow="hover">
            <div class="stat-content">
              <div class="stat-icon">
                <el-icon><Clock /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-number">{{ stats.pending_count || 0 }}</div>
                <div class="stat-label">待审核</div>
                <div class="stat-amount">¥{{ formatMoney(stats.pending_amount) }}</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card approved" shadow="hover">
            <div class="stat-content">
              <div class="stat-icon">
                <el-icon><Check /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-number">{{ stats.approved_count || 0 }}</div>
                <div class="stat-label">已批准</div>
                <div class="stat-amount">¥{{ formatMoney(stats.approved_amount) }}</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card completed" shadow="hover">
            <div class="stat-content">
              <div class="stat-icon">
                <el-icon><SuccessFilled /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-number">{{ stats.completed_count || 0 }}</div>
                <div class="stat-label">已完成</div>
                <div class="stat-amount">¥{{ formatMoney(stats.completed_amount) }}</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card rejected" shadow="hover">
            <div class="stat-content">
              <div class="stat-icon">
                <el-icon><Close /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-number">{{ stats.rejected_count || 0 }}</div>
                <div class="stat-label">已拒绝</div>
                <div class="stat-amount">¥{{ formatMoney(stats.rejected_amount) }}</div>
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
             placeholder="搜索用户名或提现账户"
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
          v-model="statusFilter"
          placeholder="提现状态"
          style="width: 120px"
          clearable
          @change="handleSearch"
        >
          <el-option label="待审核" value="pending" />
          <el-option label="已批准" value="approved" />
          <el-option label="已拒绝" value="rejected" />
          <el-option label="已完成" value="completed" />
          <el-option label="失败" value="failed" />
        </el-select>
        <el-select
          v-model="methodFilter"
          placeholder="提现方式"
          style="width: 120px"
          clearable
          @change="handleSearch"
        >
          <el-option label="支付宝" value="alipay" />
          <el-option label="微信" value="wechat" />
          <el-option label="银行卡" value="bank" />
        </el-select>
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
          style="width: 240px"
          @change="handleSearch"
        />
        <el-button type="primary" @click="handleSearch" :loading="loading">
          <el-icon><Search /></el-icon>
          搜索
        </el-button>
        <el-button @click="resetFilters">
          <el-icon><Refresh /></el-icon>
          重置
        </el-button>
        </div>
      </div>
    </el-card>

    <!-- 提现申请列表 -->
    <el-card class="table-card" shadow="never">
      <el-table
        :data="withdrawals"
        v-loading="loading"
        stripe
        border
        style="width: 100%"
      >
        <el-table-column prop="id" label="工单ID" width="80" />
        <el-table-column label="用户信息" width="180">
          <template #default="{ row }">
            <div class="user-info">
              <div class="username">{{ row.user?.username || row.username }}</div>
              <div class="email">{{ row.user?.email || row.email }}</div>
              <div class="user-id">ID: {{ row.user_id }}</div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="提现金额" width="150" align="center">
          <template #default="{ row }">
            <div class="amount-info">
              <div class="total-amount">¥{{ formatMoney(row.withdrawal_amount) }}</div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="提现方式" width="120" align="center">
          <template #default="{ row }">
            <div class="withdrawal-method">
              <el-tag :type="getMethodTagType(row.withdrawal_method)" size="small">
                {{ getMethodLabel(row.withdrawal_method) }}
              </el-tag>
              <div class="account-info">{{ row.withdrawal_account }}</div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="账户姓名" width="100" align="center">
          <template #default="{ row }">
            <span class="account-name">{{ row.account_name }}</span>
          </template>
        </el-table-column>
        <el-table-column label="提现备注" width="150">
          <template #default="{ row }">
            <el-tooltip
              v-if="row.withdrawal_notes"
              :content="row.withdrawal_notes"
              placement="top"
            >
              <span class="notes-text">{{ truncateText(row.withdrawal_notes, 20) }}</span>
            </el-tooltip>
            <span v-else class="text-muted">无备注</span>
          </template>
        </el-table-column>
        <el-table-column label="工单状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)" size="small">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="申请时间" width="150" align="center">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="审核操作" width="200" fixed="right">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button
                type="primary"
                size="small"
                @click="viewDetails(row)"
                :icon="View"
              >
                详情
              </el-button>
              <el-button
                v-if="row.status === 'pending'"
                type="success"
                size="small"
                @click="approveWithdrawal(row)"
                :icon="Check"
              >
                批准
              </el-button>
              <el-button
                v-if="row.status === 'pending'"
                type="danger"
                size="small"
                @click="rejectWithdrawal(row)"
                :icon="Close"
              >
                拒绝
              </el-button>
              <el-button
                v-if="row.status === 'approved'"
                type="warning"
                size="small"
                @click="completeWithdrawal(row)"
                :icon="SuccessFilled"
              >
                完成
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
          :total="pagination.total_count"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 审核对话框 -->
    <el-dialog
      v-model="reviewDialogVisible"
      :title="reviewAction === 'approve' ? '批准提现' : '拒绝提现'"
      width="600px"
      :close-on-click-modal="false"
    >
      <div v-if="selectedWithdrawal" class="review-content">
        <div class="withdrawal-info">
          <h4>提现信息</h4>
          <el-row :gutter="20">
            <el-col :span="12">
              <div class="info-item">
                <label>用户:</label>
                <span>{{ selectedWithdrawal.user?.username || selectedWithdrawal.username }}</span>
              </div>
              <div class="info-item">
                <label>提现金额:</label>
                <span class="amount">¥{{ formatMoney(selectedWithdrawal.withdrawal_amount) }}</span>
              </div>
            </el-col>
            <el-col :span="12">
              <div class="info-item">
                <label>提现方式:</label>
                <span>{{ getMethodLabel(selectedWithdrawal.withdrawal_method) }}</span>
              </div>
              <div class="info-item">
                <label>提现账户:</label>
                <span>{{ selectedWithdrawal.withdrawal_account }}</span>
              </div>
              <div class="info-item">
                <label>账户姓名:</label>
                <span>{{ selectedWithdrawal.account_name }}</span>
              </div>
              <div class="info-item">
                <label>申请时间:</label>
                <span>{{ formatDate(selectedWithdrawal.created_at) }}</span>
              </div>
            </el-col>
          </el-row>
          <div v-if="selectedWithdrawal.withdrawal_notes" class="user-notes">
            <label>用户备注:</label>
            <p>{{ selectedWithdrawal.withdrawal_notes }}</p>
          </div>
        </div>
        
        <el-form
          ref="reviewFormRef"
          :model="reviewForm"
          :rules="reviewFormRules"
          label-width="120px"
        >
          <el-form-item
            v-if="reviewAction === 'approve'"
            label="交易ID"
            prop="transaction_id"
          >
            <el-input
              v-model="reviewForm.transaction_id"
              placeholder="请输入转账交易ID"
            />
          </el-form-item>
          <el-form-item label="管理员备注" prop="admin_notes">
            <el-input
              v-model="reviewForm.admin_notes"
              type="textarea"
              :rows="3"
              :placeholder="reviewAction === 'approve' ? '请输入批准备注' : '请输入拒绝原因'"
            />
          </el-form-item>
        </el-form>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="reviewDialogVisible = false">取消</el-button>
          <el-button
            :type="reviewAction === 'approve' ? 'success' : 'danger'"
            @click="submitReview"
            :loading="submitting"
          >
            {{ reviewAction === 'approve' ? '确认批准' : '确认拒绝' }}
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 完成提现对话框 -->
    <el-dialog
      v-model="completeDialogVisible"
      title="完成提现"
      width="500px"
      :close-on-click-modal="false"
    >
      <div v-if="selectedWithdrawal" class="complete-content">
        <div class="withdrawal-summary">
          <p><strong>用户:</strong> {{ selectedWithdrawal.user?.username || selectedWithdrawal.username }}</p>
          <p><strong>提现金额:</strong> ¥{{ formatMoney(selectedWithdrawal.withdrawal_amount) }}</p>
          <p><strong>提现账户:</strong> {{ selectedWithdrawal.withdrawal_account }}</p>
        </div>
        
        <el-form
          ref="completeFormRef"
          :model="completeForm"
          :rules="completeFormRules"
          label-width="120px"
        >
          <el-form-item label="交易ID" prop="transaction_id">
            <el-input
              v-model="completeForm.transaction_id"
              placeholder="请输入最终交易ID"
            />
          </el-form-item>
          <el-form-item label="完成备注" prop="admin_notes">
            <el-input
              v-model="completeForm.admin_notes"
              type="textarea"
              :rows="3"
              placeholder="请输入完成备注"
            />
          </el-form-item>
        </el-form>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="completeDialogVisible = false">取消</el-button>
          <el-button type="success" @click="submitComplete" :loading="submitting">
            确认完成
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="提现详情"
      width="700px"
      :close-on-click-modal="false"
    >
      <div v-if="withdrawalDetail" class="detail-content">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="工单ID">{{ withdrawalDetail.id }}</el-descriptions-item>
          <el-descriptions-item label="用户ID">{{ withdrawalDetail.user_id }}</el-descriptions-item>
          <el-descriptions-item label="用户名">{{ withdrawalDetail.user?.username || withdrawalDetail.username }}</el-descriptions-item>
          <el-descriptions-item label="邮箱">{{ withdrawalDetail.user?.email || withdrawalDetail.email }}</el-descriptions-item>
          <el-descriptions-item label="提现金额">¥{{ formatMoney(withdrawalDetail.total_amount) }}</el-descriptions-item>
          <el-descriptions-item label="手续费">¥{{ formatMoney(withdrawalDetail.fee_amount) }}</el-descriptions-item>
          <el-descriptions-item label="实际到账">¥{{ formatMoney(withdrawalDetail.actual_amount) }}</el-descriptions-item>
          <el-descriptions-item label="提现方式">
            <el-tag :type="getMethodTagType(withdrawalDetail.withdrawal_method)" size="small">
              {{ getMethodLabel(withdrawalDetail.withdrawal_method) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="提现账户">{{ withdrawalDetail.withdrawal_account }}</el-descriptions-item>
          <el-descriptions-item label="账户姓名">{{ withdrawalDetail.account_name }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusTagType(withdrawalDetail.status)" size="small">
              {{ getStatusLabel(withdrawalDetail.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="交易ID">{{ withdrawalDetail.transaction_id || '暂无' }}</el-descriptions-item>
          <el-descriptions-item label="申请时间">{{ formatDate(withdrawalDetail.created_at) }}</el-descriptions-item>
          <el-descriptions-item label="处理时间">
            {{ withdrawalDetail.processed_at ? formatDate(withdrawalDetail.processed_at) : '未处理' }}
          </el-descriptions-item>
          <el-descriptions-item label="用户备注" :span="2">
            {{ withdrawalDetail.withdrawal_notes || '无备注' }}
          </el-descriptions-item>
          <el-descriptions-item label="管理员备注" :span="2">
            {{ withdrawalDetail.admin_notes || '无备注' }}
          </el-descriptions-item>
        </el-descriptions>
        
        <div v-if="withdrawalDetail.commission_records?.length" class="commission-records">
          <h4>关联分成记录</h4>
          <el-table :data="withdrawalDetail.commission_records" stripe style="width: 100%">
            <el-table-column prop="id" label="记录ID" width="80" />
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
            <el-table-column label="来源订单" width="120">
              <template #default="{ row }">
                {{ row.source_order_id || '无' }}
              </template>
            </el-table-column>
            <el-table-column label="创建时间">
              <template #default="{ row }">
                {{ formatDate(row.created_at) }}
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  CreditCard,
  Refresh,
  Search,
  View,
  Check,
  Close,
  Clock,
  SuccessFilled
} from '@element-plus/icons-vue'
import { withdrawalRequestAPI } from '@/api/distribution'

// 响应式数据
const loading = ref(false)
const submitting = ref(false)
const searchQuery = ref('')
const statusFilter = ref('')
const methodFilter = ref('')
const dateRange = ref([])
const reviewDialogVisible = ref(false)
const completeDialogVisible = ref(false)
const detailDialogVisible = ref(false)
const reviewAction = ref('approve')
const reviewFormRef = ref()
const completeFormRef = ref()

// 数据
const withdrawals = ref([])
const stats = ref({})
const selectedWithdrawal = ref(null)
const withdrawalDetail = ref(null)

const pagination = reactive({
  current_page: 1,
  per_page: 20,
  total_count: 0,
  total_pages: 0
})

// 表单数据
const reviewForm = reactive({
  transaction_id: '',
  admin_notes: ''
})

const completeForm = reactive({
  transaction_id: '',
  admin_notes: ''
})

// 表单验证规则
const reviewFormRules = {
  admin_notes: [
    { required: true, message: '请输入备注', trigger: 'blur' }
  ]
}

const completeFormRules = {
  transaction_id: [
    { required: true, message: '请输入交易ID', trigger: 'blur' }
  ],
  admin_notes: [
    { required: true, message: '请输入完成备注', trigger: 'blur' }
  ]
}

// 方法
const loadWithdrawals = async () => {
  try {
    loading.value = true
    const params = {
      page: pagination.current_page,
      limit: pagination.per_page,
      search: searchQuery.value,
      status: statusFilter.value,
      withdrawal_method: methodFilter.value
    }
    
    if (dateRange.value && dateRange.value.length === 2) {
      params.start_date = dateRange.value[0]
      params.end_date = dateRange.value[1]
    }
    
    const response = await withdrawalRequestAPI.getAdminRequests(params)
    
    if (response.success) {
      withdrawals.value = response.data.list || []
      const paginationData = response.data.pagination || {}
      pagination.current_page = paginationData.page || 1
      pagination.per_page = paginationData.limit || 10
      pagination.total = paginationData.total || 0
      stats.value = response.data.stats || {}
    }
  } catch (error) {
    console.error('加载提现申请失败:', error)
    ElMessage.error('加载提现申请失败')
  } finally {
    loading.value = false
  }
}

const refreshData = () => {
  loadWithdrawals()
}

const handleSearch = () => {
  pagination.current_page = 1
  loadWithdrawals()
}

const resetFilters = () => {
  searchQuery.value = ''
  statusFilter.value = ''
  methodFilter.value = ''
  dateRange.value = []
  handleSearch()
}

const handleSizeChange = (size) => {
  pagination.per_page = size
  pagination.current_page = 1
  loadWithdrawals()
}

const handleCurrentChange = (page) => {
  pagination.current_page = page
  loadWithdrawals()
}

const viewDetails = async (withdrawal) => {
  try {
    loading.value = true
    const response = await withdrawalRequestAPI.getRequest(withdrawal.id)
    
    if (response.success) {
      withdrawalDetail.value = response.data
      detailDialogVisible.value = true
    }
  } catch (error) {
    console.error('加载详情失败:', error)
    ElMessage.error('加载提现详情失败')
  } finally {
    loading.value = false
  }
}

const approveWithdrawal = (withdrawal) => {
  selectedWithdrawal.value = withdrawal
  reviewAction.value = 'approve'
  reviewForm.transaction_id = ''
  reviewForm.admin_notes = ''
  reviewDialogVisible.value = true
}

const rejectWithdrawal = (withdrawal) => {
  selectedWithdrawal.value = withdrawal
  reviewAction.value = 'reject'
  reviewForm.transaction_id = ''
  reviewForm.admin_notes = ''
  reviewDialogVisible.value = true
}

const submitReview = async () => {
  try {
    await reviewFormRef.value.validate()
    submitting.value = true
    
    const data = {
      status: reviewAction.value === 'approve' ? 'approved' : 'rejected',
      admin_notes: reviewForm.admin_notes
    }
    
    if (reviewAction.value === 'approve' && reviewForm.transaction_id) {
      data.transaction_id = reviewForm.transaction_id
    }
    
    await withdrawalRequestAPI.reviewRequest(selectedWithdrawal.value.id, data)
    ElMessage.success(`${reviewAction.value === 'approve' ? '批准' : '拒绝'}成功`)
    
    reviewDialogVisible.value = false
    loadWithdrawals()
  } catch (error) {
    console.error('审核失败:', error)
    ElMessage.error('审核失败')
  } finally {
    submitting.value = false
  }
}

const completeWithdrawal = (withdrawal) => {
  selectedWithdrawal.value = withdrawal
  completeForm.transaction_id = withdrawal.transaction_id || ''
  completeForm.admin_notes = ''
  completeDialogVisible.value = true
}

const submitComplete = async () => {
  try {
    await completeFormRef.value.validate()
    submitting.value = true
    
    const data = {
      transaction_id: completeForm.transaction_id,
      admin_notes: completeForm.admin_notes
    }
    
    await withdrawalRequestAPI.completeRequest(selectedWithdrawal.value.id, data)
    ElMessage.success('提现完成成功')
    
    completeDialogVisible.value = false
    loadWithdrawals()
  } catch (error) {
    console.error('完成失败:', error)
    ElMessage.error('提现完成失败')
  } finally {
    submitting.value = false
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

const truncateText = (text, length) => {
  if (!text) return ''
  return text.length > length ? text.substring(0, length) + '...' : text
}

const getStatusTagType = (status) => {
  const statusMap = {
    pending: 'warning',
    approved: 'primary',
    rejected: 'danger',
    completed: 'success',
    failed: 'danger'
  }
  return statusMap[status] || 'info'
}

const getStatusLabel = (status) => {
  const statusMap = {
    pending: '待审核',
    approved: '已批准',
    rejected: '已拒绝',
    completed: '已完成',
    failed: '失败'
  }
  return statusMap[status] || status
}

const getMethodTagType = (method) => {
  const methodMap = {
    alipay: 'primary',
    wechat: 'success',
    bank: 'warning'
  }
  return methodMap[method] || 'info'
}

const getMethodLabel = (method) => {
  const methodMap = {
    alipay: '支付宝',
    wechat: '微信',
    bank: '银行卡'
  }
  return methodMap[method] || method
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



// 生命周期
onMounted(() => {
  loadWithdrawals()
})
</script>

<style scoped>
.withdrawal-management {
  padding: 20px;
  background: #f5f7fa;
  min-height: 100vh;
}

.page-header {
  margin-bottom: 20px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  background: #fff;
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
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
  height: 120px;
}

.stat-content {
  display: flex;
  align-items: center;
  height: 100%;
}

.stat-icon {
  font-size: 32px;
  margin-right: 16px;
}

.stat-card.pending .stat-icon {
  color: #e6a23c;
}

.stat-card.approved .stat-icon {
  color: #409eff;
}

.stat-card.completed .stat-icon {
  color: #67c23a;
}

.stat-card.rejected .stat-icon {
  color: #f56c6c;
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
  margin-bottom: 4px;
}

.stat-amount {
  color: #409eff;
  font-size: 16px;
  font-weight: 600;
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

/* 表格样式优化 */
.el-table {
  width: 100%;
}

:deep(.el-table__inner-wrapper) {
  width: 100% !important;
}

:deep(.el-table__header-wrapper),
:deep(.el-table__body-wrapper) {
  width: 100% !important;
}

:deep(.el-table__header),
:deep(.el-table__body) {
  width: 100% !important;
  table-layout: auto;
}

:deep(.el-table .el-table__cell) {
  padding: 12px 8px;
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

.amount-info {
  text-align: center;
  line-height: 1.5;
}

.total-amount {
  font-weight: 600;
  color: #303133;
  font-size: 16px;
}

.fee-info {
  color: #e6a23c;
  font-size: 12px;
}

.actual-amount {
  color: #67c23a;
  font-size: 14px;
  font-weight: 600;
}

.withdrawal-method {
  text-align: center;
  line-height: 1.5;
}

.account-info {
  color: #606266;
  font-size: 12px;
  margin-top: 4px;
  word-break: break-all;
}

.account-name {
  font-weight: 600;
  color: #303133;
}

.notes-text {
  color: #606266;
  cursor: pointer;
}

.text-muted {
  color: #c0c4cc;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.pagination-wrapper {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.review-content,
.complete-content {
  padding: 10px 0;
}

.withdrawal-info,
.withdrawal-summary {
  background: #f5f7fa;
  padding: 16px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.withdrawal-info h4 {
  margin: 0 0 16px 0;
  color: #303133;
}

.info-item {
  display: flex;
  margin-bottom: 12px;
  align-items: center;
}

.info-item label {
  width: 80px;
  color: #909399;
  font-size: 14px;
}

.info-item span {
  color: #303133;
  font-weight: 500;
}

.info-item .amount {
  color: #409eff;
  font-weight: 600;
}

.info-item .amount.actual {
  color: #67c23a;
}

.user-notes {
  margin-top: 16px;
}

.user-notes label {
  display: block;
  color: #909399;
  font-size: 14px;
  margin-bottom: 8px;
}

.user-notes p {
  background: #fff;
  padding: 12px;
  border-radius: 4px;
  margin: 0;
  color: #303133;
  line-height: 1.5;
}

.detail-content {
  padding: 10px 0;
}

.commission-records {
  margin-top: 20px;
}

.commission-records h4 {
  margin: 0 0 16px 0;
  color: #303133;
}

.amount {
  font-weight: 600;
  color: #409eff;
}

/* 响应式布局 */
@media (max-width: 992px) {
  .filter-section {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .filter-left,
  .filter-right {
    width: 100%;
  }
  
  .filter-right {
    flex-wrap: wrap;
  }
}

@media (max-width: 768px) {
  .withdrawal-management {
    padding: 12px;
  }
  
  .header-content {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
    padding: 16px;
  }
  
  .action-buttons {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 8px;
  }
  
  .action-buttons .el-button {
    flex: 1;
    min-width: 60px;
  }
}
</style>