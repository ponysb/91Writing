<template>
  <div class="membership-records">
    <!-- 搜索筛选 -->
    <div class="search-section">
      <el-form :model="searchForm" inline>
        <el-form-item label="用户名">
          <el-input
            v-model="searchForm.username"
            placeholder="请输入用户名"
            clearable
            style="width: 200px"
          />
        </el-form-item>
        <el-form-item label="记录类型">
          <el-select
            v-model="searchForm.record_type"
            placeholder="请选择记录类型"
            clearable
            style="width: 150px"
          >
            <el-option label="有效会员记录" value="membership_record" />
            <el-option label="在线支付记录" value="payment_record" />
          </el-select>
        </el-form-item>
        <el-form-item label="激活方式">
          <el-select
            v-model="searchForm.activation_type"
            placeholder="请选择激活方式"
            clearable
            style="width: 150px"
          >
            <el-option label="激活码" value="activation_code" />
            <el-option label="充值" value="recharge" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select
            v-model="searchForm.status"
            placeholder="请选择状态"
            clearable
            style="width: 150px"
          >
            <el-option label="有效" value="active" />
            <el-option label="已过期" value="expired" />
            <el-option label="已支付" value="paid" />
            <el-option label="支付未开通" value="paid_no_membership" />
          </el-select>
        </el-form-item>
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="searchForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 240px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="resetSearch">
            <el-icon><RefreshRight /></el-icon>
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 统计信息 -->
    <div class="stats-section">
      <el-row :gutter="20">
        <el-col :span="8">
          <el-card class="stats-card">
            <div class="stats-content">
              <div class="stats-number">{{ summary?.total_membership_records || 0 }}</div>
              <div class="stats-label">有效会员记录</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card class="stats-card">
            <div class="stats-content">
              <div class="stats-number">{{ summary?.total_payment_records || 0 }}</div>
              <div class="stats-label">在线支付记录</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card class="stats-card">
            <div class="stats-content">
              <div class="stats-number">{{ summary?.total_combined || 0 }}</div>
              <div class="stats-label">总记录数</div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 数据表格 -->
    <div class="table-section">
      <el-table
        v-loading="loading"
        :data="records"
        stripe
        style="width: 100%"
        @sort-change="handleSortChange"
      >
        <el-table-column prop="id" label="记录ID" width="120" sortable="custom" />
        <el-table-column label="记录类型" min-width="120">
          <template #default="{ row }">
            <el-tag
              :type="row.type === 'membership_record' ? 'success' : 'warning'"
              size="small"
            >
              {{ row.type === 'membership_record' ? '有效会员记录' : '在线支付记录' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="用户信息" min-width="120">
          <template #default="{ row }">
            <div>
              <div>{{ row.user?.username || '-' }}</div>
              <div class="text-muted small">ID: {{ row.user_id }}</div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="套餐信息" min-width="150">
          <template #default="{ row }">
            <div v-if="row.package">
              <div>{{ row.package.name || row.package.package_name || '-' }}</div>
              <div class="text-muted small" v-if="row.package.type">
                {{ getMembershipLevelText(row.package.type) }}
              </div>
            </div>
            <span v-else class="text-muted">-</span>
          </template>
        </el-table-column>
        <el-table-column label="激活方式" width="100">
          <template #default="{ row }">
            <el-tag
              :type="row.activation_type === 'activation_code' ? 'primary' : 'success'"
              size="small"
            >
              {{ row.activation_type === 'activation_code' ? '激活码' : '充值' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="激活码/订单号" min-width="180">
          <template #default="{ row }">
            <div v-if="row.activation_code?.code">
              <div>{{ row.activation_code.code }}</div>
              <div class="text-muted small">激活码</div>
            </div>
            <div v-else-if="row.order_id">
              <div>{{ row.order_id }}</div>
              <div class="text-muted small">订单号</div>
            </div>
            <span v-else class="text-muted">-</span>
          </template>
        </el-table-column>
        <el-table-column label="金额/积分" width="120">
          <template #default="{ row }">
            <div v-if="row.payment_amount">
              <div>¥{{ row.payment_amount }}</div>
              <div class="text-muted small">{{ row.payment_method || '' }}</div>
            </div>
            <div v-else-if="row.credits">
              <div>{{ row.credits }} 积分</div>
              <div class="text-muted small" v-if="row.remaining_credits !== undefined">
                剩余: {{ row.remaining_credits }}
              </div>
            </div>
            <span v-else class="text-muted">-</span>
          </template>
        </el-table-column>
        <el-table-column label="时间" min-width="200" sortable="custom">
          <template #default="{ row }">
            <div>
              <div>{{ formatDateTime(row.start_date || row.created_at) }}</div>
              <div class="text-muted small" v-if="row.end_date">
                到期: {{ formatDateTime(row.end_date) }}
              </div>
              <div class="text-muted small" v-else-if="row.success_time">
                完成: {{ formatDateTime(row.success_time) }}
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="状态" min-width="100">
          <template #default="{ row }">
            <el-tag
              :type="getStatusType(row.status)"
              size="small"
            >
              {{ getStatusText(row.status) }}
            </el-tag>
            <div class="text-muted small" v-if="row.note">
              {{ row.note }}
            </div>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button
              type="primary"
              size="small"
              @click="viewDetails(row)"
            >
              详情
            </el-button>
            <el-button
              v-if="row.type === 'payment_record' && row.order_id"
              type="warning"
              size="small"
              @click="recheckOrderStatus(row)"
              :loading="recheckingOrderId === row.id"
              style="margin-left: 5px;"
            >
              重查
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.size"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>

    <!-- 详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      :title="selectedRecord?.type === 'membership_record' ? '有效会员记录详情' : '在线支付记录详情'"
      width="700px"
    >
      <div v-if="selectedRecord" class="record-details">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="记录ID">{{ selectedRecord.id }}</el-descriptions-item>
          <el-descriptions-item label="记录类型">
            <el-tag :type="selectedRecord.type === 'membership_record' ? 'success' : 'warning'">
              {{ selectedRecord.type === 'membership_record' ? '有效会员记录' : '在线支付记录' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="用户ID">{{ selectedRecord.user_id }}</el-descriptions-item>
          <el-descriptions-item label="用户名">{{ selectedRecord.user?.username || '-' }}</el-descriptions-item>
          <el-descriptions-item label="用户邮箱" :span="2">{{ selectedRecord.user?.email || '-' }}</el-descriptions-item>
          
          <!-- 套餐信息 -->
          <el-descriptions-item label="套餐ID" v-if="selectedRecord.package_id">{{ selectedRecord.package_id }}</el-descriptions-item>
          <el-descriptions-item label="套餐名称">
            {{ selectedRecord.package?.name || selectedRecord.package?.package_name || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="套餐类型" v-if="selectedRecord.package?.type">
            <el-tag :type="getMembershipLevelType(selectedRecord.package.type)">
              {{ getMembershipLevelText(selectedRecord.package.type) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="有效天数" v-if="selectedRecord.package?.duration_days || selectedRecord.validity_days">
            {{ selectedRecord.package?.duration_days || selectedRecord.validity_days }}天
          </el-descriptions-item>
          
          <!-- 激活信息 -->
          <el-descriptions-item label="激活方式">
            <el-tag :type="selectedRecord.activation_type === 'activation_code' ? 'primary' : 'success'">
              {{ selectedRecord.activation_type === 'activation_code' ? '激活码' : '充值' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="激活码" v-if="selectedRecord.activation_code?.code">
            {{ selectedRecord.activation_code.code }}
          </el-descriptions-item>
          <el-descriptions-item label="订单号" v-if="selectedRecord.order_id">
            {{ selectedRecord.order_id }}
          </el-descriptions-item>
          
          <!-- 支付信息 -->
          <el-descriptions-item label="支付金额" v-if="selectedRecord.payment_amount">
            ¥{{ selectedRecord.payment_amount }}
          </el-descriptions-item>
          <el-descriptions-item label="支付方式" v-if="selectedRecord.payment_method">
            {{ selectedRecord.payment_method }}
          </el-descriptions-item>
          
          <!-- 积分信息 -->
          <el-descriptions-item label="获得积分" v-if="selectedRecord.credits">
            {{ selectedRecord.credits }}
          </el-descriptions-item>
          <el-descriptions-item label="剩余积分" v-if="selectedRecord.remaining_credits !== undefined">
            {{ selectedRecord.remaining_credits }}
          </el-descriptions-item>
          
          <!-- 时间信息 -->
          <el-descriptions-item label="创建时间">
            {{ formatDateTime(selectedRecord.created_at) }}
          </el-descriptions-item>
          <el-descriptions-item label="更新时间">
            {{ formatDateTime(selectedRecord.updated_at) }}
          </el-descriptions-item>
          <el-descriptions-item label="开始时间" v-if="selectedRecord.start_date">
            {{ formatDateTime(selectedRecord.start_date) }}
          </el-descriptions-item>
          <el-descriptions-item label="到期时间" v-if="selectedRecord.end_date">
            {{ formatDateTime(selectedRecord.end_date) }}
          </el-descriptions-item>
          <el-descriptions-item label="完成时间" v-if="selectedRecord.success_time">
            {{ formatDateTime(selectedRecord.success_time) }}
          </el-descriptions-item>
          
          <!-- 状态信息 -->
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusType(selectedRecord.status)">
              {{ getStatusText(selectedRecord.status) }}
            </el-tag>
          </el-descriptions-item>
          
          <!-- 备注信息 -->
          <el-descriptions-item label="备注" :span="2" v-if="selectedRecord.note || selectedRecord.notes">
            {{ selectedRecord.note || selectedRecord.notes || '-' }}
          </el-descriptions-item>
          
          <!-- 套餐特性 -->
          <el-descriptions-item label="套餐特性" :span="2" v-if="selectedRecord.package?.features">
            <el-tag v-for="feature in selectedRecord.package.features" :key="feature" style="margin-right: 8px; margin-bottom: 4px;">
              {{ feature }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>
      </div>
      <template #footer>
        <el-button @click="detailDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, Search, RefreshRight } from '@element-plus/icons-vue'
import { membershipAPI, paymentAPI } from '@/api'
import { formatDateTime } from '@/utils/date'

// 响应式数据
const loading = ref(false)
const records = ref([])
const selectedRecord = ref(null)
const detailDialogVisible = ref(false)
const summary = ref(null)
const recheckingOrderId = ref(null)

// 搜索表单
const searchForm = reactive({
  username: '',
  record_type: '',
  activation_type: '',
  status: '',
  dateRange: null
})

// 分页数据
const pagination = reactive({
  page: 1,
  size: 20,
  total: 0
})

// 排序数据
const sortData = reactive({
  prop: '',
  order: ''
})

// 获取有效会员记录列表
const loadRecords = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      limit: pagination.size,
      username: searchForm.username || undefined,
      record_type: searchForm.record_type || undefined,
      activation_type: searchForm.activation_type || undefined,
      status: searchForm.status || undefined,
      start_date: searchForm.dateRange?.[0] || undefined,
      end_date: searchForm.dateRange?.[1] || undefined,
      sort_by: sortData.prop || undefined,
      sort_order: sortData.order === 'ascending' ? 'asc' : sortData.order === 'descending' ? 'desc' : undefined
    }
    
    const response = await membershipAPI.getAdminRecords(params)
    records.value = response.data.records || []
    summary.value = response.data.summary || null
    pagination.total = response.data.pagination?.total || 0
  } catch (error) {
    console.error('获取有效会员记录失败:', error)
    ElMessage.error('获取有效会员记录失败')
  } finally {
    loading.value = false
  }
}

// 搜索
const handleSearch = () => {
  pagination.page = 1
  loadRecords()
}

// 重置搜索
const resetSearch = () => {
  Object.assign(searchForm, {
    username: '',
    record_type: '',
    activation_type: '',
    status: '',
    dateRange: null
  })
  pagination.page = 1
  loadRecords()
}

// 刷新数据
const refreshData = () => {
  loadRecords()
}

// 分页大小改变
const handleSizeChange = (size) => {
  pagination.size = size
  pagination.page = 1
  loadRecords()
}

// 当前页改变
const handleCurrentChange = (page) => {
  pagination.page = page
  loadRecords()
}

// 排序改变
const handleSortChange = ({ prop, order }) => {
  sortData.prop = prop
  sortData.order = order
  loadRecords()
}

// 查看详情
const viewDetails = (record) => {
  selectedRecord.value = record
  detailDialogVisible.value = true
}

// 重查订单状态
const recheckOrderStatus = async (record) => {
  if (!record.order_id) {
    ElMessage.warning('该记录没有订单号，无法重查')
    return
  }
  
  recheckingOrderId.value = record.id
  try {
    const response = await paymentAPI.getOrderStatus(record.order_id)
    if (response.code === 200) {
      const status = response.data.status
      if (status === 'paid') {
        ElMessage.success('订单已支付，正在更新记录状态...')
        // 重新加载记录列表以获取最新状态
        await loadRecords()
      } else if (status === 'pending') {
        ElMessage.info('订单仍为待支付状态')
      } else if (status === 'expired') {
        ElMessage.warning('订单已过期')
      } else if (status === 'cancelled') {
        ElMessage.error('订单已取消')
      } else {
        ElMessage.info(`订单状态：${status}`)
      }
    } else {
      ElMessage.error(response.message || '查询订单状态失败')
    }
  } catch (error) {
    console.error('重查订单状态失败:', error)
    ElMessage.error('重查订单状态失败：' + (error.response?.data?.message || error.message))
  } finally {
    recheckingOrderId.value = null
  }
}

// 获取会员等级类型
const getMembershipLevelType = (level) => {
  const typeMap = {
    basic: '',
    premium: 'warning',
    professional: 'success',
    enterprise: 'danger'
  }
  return typeMap[level] || ''
}

// 获取会员等级文本
const getMembershipLevelText = (level) => {
  const textMap = {
    basic: '基础套餐',
    premium: '高级套餐',
    professional: '专业套餐',
    enterprise: '企业套餐'
  }
  return textMap[level] || level
}

// 获取状态类型
const getStatusType = (status) => {
  const typeMap = {
    active: 'success',
    expired: 'danger',
    inactive: 'info',
    paid: 'success',
    paid_no_membership: 'warning',
    pending: 'warning',
    failed: 'danger'
  }
  return typeMap[status] || 'info'
}

// 获取状态文本
const getStatusText = (status) => {
  const textMap = {
    active: '有效',
    expired: '已过期',
    inactive: '未激活',
    paid: '已支付',
    paid_no_membership: '支付未开通',
    pending: '待支付',
    failed: '支付失败'
  }
  return textMap[status] || status
}

// 判断是否过期
const isExpired = (expiresAt) => {
  if (!expiresAt) return false
  return new Date(expiresAt) < new Date()
}

// 组件挂载时加载数据
onMounted(() => {
  loadRecords()
})
</script>

<style scoped>
.membership-records {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-shrink: 0;
}

.page-header h2 {
  margin: 0;
  color: #303133;
}

.search-section {
  background: #fff;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
  width: 100%;
}

.table-section {
  background: #fff;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  width: 100%;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 20px;
  flex-shrink: 0;
}

.text-muted {
  color: #909399;
}

.small {
  font-size: 12px;
}

.stats-section {
  margin-bottom: 20px;
  flex-shrink: 0;
  width: 100%;
}

.stats-card {
  text-align: center;
  border-radius: 8px;
}

.stats-content {
  padding: 10px;
}

.stats-number {
  font-size: 24px;
  font-weight: bold;
  color: #409EFF;
  margin-bottom: 5px;
}

.stats-label {
  font-size: 14px;
  color: #606266;
}

.record-details {
  padding: 10px 0;
}

/* 表格容器样式优化 */
.el-table {
  flex: 1;
}

/* 确保表格能够正确显示滚动条 */
:deep(.el-table__body-wrapper) {
  max-height: calc(100vh - 400px);
  overflow-y: auto;
}
</style>