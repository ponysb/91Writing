<template>
  <div class="commission-records">
    <!-- 页面头部 -->
    <div class="page-header">
      <h2>分成记录管理</h2>
      <p class="page-description">管理和查看所有用户的分成记录</p>
      <el-button type="primary" @click="refreshData" :loading="loading">
        <el-icon><Refresh /></el-icon>
        刷新
      </el-button>
    </div>

    <!-- 统计概览 -->
    <div class="stats-section">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card class="stats-card">
            <div class="stats-content">
              <div class="stats-value">{{ formatCurrency(stats.totalAmount) }}</div>
              <div class="stats-label">总分成金额</div>
            </div>
            <el-icon class="stats-icon"><Money /></el-icon>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stats-card">
            <div class="stats-content">
              <div class="stats-value">{{ stats.totalRecords }}</div>
              <div class="stats-label">分成记录总数</div>
            </div>
            <el-icon class="stats-icon"><DataAnalysis /></el-icon>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stats-card">
            <div class="stats-content">
              <div class="stats-value">{{ formatCurrency(stats.settledAmount) }}</div>
              <div class="stats-label">已结算金额</div>
            </div>
            <el-icon class="stats-icon"><Check /></el-icon>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stats-card">
            <div class="stats-content">
              <div class="stats-value">{{ formatCurrency(stats.pendingAmount) }}</div>
              <div class="stats-label">待结算金额</div>
            </div>
            <el-icon class="stats-icon"><Clock /></el-icon>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 搜索筛选 -->
    <div class="search-section">
      <div class="search-content">
        <el-form :model="searchForm" inline>
        <el-form-item label="用户搜索">
          <el-input
            v-model="searchForm.keyword"
            placeholder="用户名/邮箱/用户ID"
            clearable
            style="width: 200px"
          />
        </el-form-item>
        <el-form-item label="分成类型">
          <el-select v-model="searchForm.commission_type" placeholder="请选择分成类型" clearable style="width: 150px">
            <el-option label="邀请分成" value="invite" />
            <el-option label="购买分成" value="purchase" />
            <el-option label="续费分成" value="renewal" />
          </el-select>
        </el-form-item>
        <el-form-item label="结算状态">
          <el-select v-model="searchForm.settlement_status" placeholder="请选择结算状态" clearable style="width: 150px">
            <el-option label="未结算" value="unsettled" />
            <el-option label="已结算" value="settled" />
            <el-option label="结算中" value="processing" />
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
          <el-button type="primary" @click="handleSearch" :loading="loading">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="resetSearch">
            <el-icon><Refresh /></el-icon>
            重置
          </el-button>
        </el-form-item>
        </el-form>
      </div>
    </div>

    <!-- 数据表格 -->
    <div class="table-section">
      <div class="table-content">
        <el-table
        :data="records"
        v-loading="loading"
        stripe
        border
        style="width: 100%"
        @sort-change="handleSortChange"
      >
        <el-table-column prop="id" label="记录ID" width="80" sortable="custom" />
        <el-table-column label="用户信息" min-width="200">
          <template #default="{ row }">
            <div>
              <div class="user-info">
                <strong>{{ row.invitee?.username || row.invitee?.nickname || row.user?.username || row.user?.nickname }}</strong>
              </div>
              <div class="text-muted small">ID: {{ row.invitee_id || row.user_id }}</div>
              <div class="text-muted small">{{ row.invitee?.email || row.user?.email }}</div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="邀请记录" min-width="180">
          <template #default="{ row }">
            <div v-if="row.inviteRecord || row.invite_record">
              <div class="text-muted small">邀请码: {{ row.inviteRecord?.invite_code || row.invite_record?.invite_code }}</div>
              <div class="text-muted small">邀请人: {{ row.inviter?.username || row.invite_record?.inviter?.username }}</div>
            </div>
            <div v-else class="text-muted">-</div>
          </template>
        </el-table-column>
        <el-table-column label="分成类型" width="100">
          <template #default="{ row }">
            <el-tag :type="getCommissionTypeColor(row.commission_type)" size="small">
              {{ getCommissionTypeText(row.commission_type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="金额信息" min-width="180">
          <template #default="{ row }">
            <div>
              <div>订单金额: <strong>¥{{ formatCurrency(row.original_amount || row.order_amount) }}</strong></div>
              <div>分成金额: <strong class="commission-amount">¥{{ formatCurrency(row.commission_amount) }}</strong></div>
              <div class="text-muted small">分成比例: {{ (parseFloat(row.commission_rate) * 100).toFixed(1) }}%</div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="订单信息" min-width="150">
          <template #default="{ row }">
            <div>
              <div v-if="row.order_id">订单: {{ row.order_id }}</div>
              <div v-if="row.order_type" class="text-muted small">
                类型: {{ getOrderTypeText(row.order_type) }}
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="结算状态" width="120">
          <template #default="{ row }">
            <el-tag :type="getSettlementType(row.settlement_status)" size="small">
              {{ getSettlementText(row.settlement_status) }}
            </el-tag>
            <div v-if="row.withdrawal_request_id" class="text-muted small mt-1">
              提现ID: {{ row.withdrawal_request_id }}
            </div>
          </template>
        </el-table-column>
        <el-table-column label="时间" min-width="180">
          <template #default="{ row }">
            <div>
              <div class="text-muted small">创建: {{ formatDateTime(row.created_at) }}</div>
              <div v-if="row.settlement_time" class="text-muted small">
                结算: {{ formatDateTime(row.settlement_time) }}
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="viewDetails(row)">
              详情
            </el-button>
            <el-button 
              v-if="row.settlement_status === 'unsettled' && row.status === 'confirmed'"
              type="success" 
              size="small" 
              @click="settleCommission(row.id)"
            >
              结算
            </el-button>
          </template>
        </el-table-column>
      </el-table>

        <!-- 分页 -->
        <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.size"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
        </div>
      </div>
    </div>

    <!-- 详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="分成记录详情"
      width="800px"
    >
      <div v-if="selectedRecord" class="record-details">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="记录ID">{{ selectedRecord.id }}</el-descriptions-item>
          <el-descriptions-item label="用户ID">{{ selectedRecord.user_id }}</el-descriptions-item>
          
          <!-- 用户信息 -->
          <el-descriptions-item label="用户名">{{ selectedRecord.user?.username }}</el-descriptions-item>
          <el-descriptions-item label="用户昵称">{{ selectedRecord.user?.nickname }}</el-descriptions-item>
          <el-descriptions-item label="用户邮箱">{{ selectedRecord.user?.email }}</el-descriptions-item>
          
          <!-- 邀请记录信息 -->
          <el-descriptions-item label="邀请记录ID" v-if="selectedRecord.invite_record_id">
            {{ selectedRecord.invite_record_id }}
          </el-descriptions-item>
          <el-descriptions-item label="邀请码" v-if="selectedRecord.invite_record?.invite_code">
            {{ selectedRecord.invite_record.invite_code }}
          </el-descriptions-item>
          <el-descriptions-item label="邀请人" v-if="selectedRecord.invite_record?.inviter">
            {{ selectedRecord.invite_record.inviter.username }}
          </el-descriptions-item>
          
          <!-- 订单信息 -->
          <el-descriptions-item label="订单ID">{{ selectedRecord.order_id }}</el-descriptions-item>
          <el-descriptions-item label="订单类型" v-if="selectedRecord.order_type">
            {{ getOrderTypeText(selectedRecord.order_type) }}
          </el-descriptions-item>
          <el-descriptions-item label="订单金额">¥{{ formatCurrency(selectedRecord.original_amount || selectedRecord.order_amount) }}</el-descriptions-item>
          
          <!-- 分成信息 -->
          <el-descriptions-item label="分成类型">
            <el-tag :type="getCommissionTypeColor(selectedRecord.commission_type)">
              {{ getCommissionTypeText(selectedRecord.commission_type) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="分成比例">{{ (parseFloat(selectedRecord.commission_rate) * 100).toFixed(1) }}%</el-descriptions-item>
          <el-descriptions-item label="分成金额">¥{{ formatCurrency(selectedRecord.commission_amount) }}</el-descriptions-item>
          
          <!-- 结算信息 -->
          <el-descriptions-item label="结算状态">
            <el-tag :type="getSettlementType(selectedRecord.settlement_status)">
              {{ getSettlementText(selectedRecord.settlement_status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="提现申请ID" v-if="selectedRecord.withdrawal_request_id">
            {{ selectedRecord.withdrawal_request_id }}
          </el-descriptions-item>
          
          <!-- 时间信息 -->
          <el-descriptions-item label="创建时间">{{ formatDateTime(selectedRecord.created_at) }}</el-descriptions-item>
          <el-descriptions-item label="更新时间">{{ formatDateTime(selectedRecord.updated_at) }}</el-descriptions-item>
          <el-descriptions-item label="结算时间" v-if="selectedRecord.settlement_time">
            {{ formatDateTime(selectedRecord.settlement_time) }}
          </el-descriptions-item>
          
          <!-- 其他信息 -->
          <el-descriptions-item label="备注" :span="2" v-if="selectedRecord.notes">
            {{ selectedRecord.notes }}
          </el-descriptions-item>
          
          <!-- 元数据 -->
          <el-descriptions-item label="元数据" :span="2" v-if="selectedRecord.metadata">
            <pre>{{ JSON.stringify(selectedRecord.metadata, null, 2) }}</pre>
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
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Search, Money, DataAnalysis, Check, Clock } from '@element-plus/icons-vue'
import { distributionAPI } from '@/api'
import { formatDateTime } from '@/utils/date'

// 响应式数据
const loading = ref(false)
const records = ref([])
const selectedRecord = ref(null)
const detailDialogVisible = ref(false)

// 统计数据
const stats = reactive({
  totalAmount: 0,
  totalRecords: 0,
  settledAmount: 0,
  pendingAmount: 0
})

// 搜索表单
const searchForm = reactive({
  keyword: '',
  commission_type: '',
  settlement_status: '',
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
  prop: 'created_at',
  order: 'descending'
})

// 加载分成记录列表
const loadRecords = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      limit: pagination.size,
      sort: sortData.prop,
      order: sortData.order === 'ascending' ? 'ASC' : 'DESC'
    }
    
    // 添加搜索条件
    if (searchForm.keyword) {
      params.keyword = searchForm.keyword
    }
    if (searchForm.commission_type) {
      params.commission_type = searchForm.commission_type
    }
    if (searchForm.settlement_status) {
      params.settlement_status = searchForm.settlement_status
    }
    if (searchForm.dateRange && searchForm.dateRange.length === 2) {
      params.start_date = searchForm.dateRange[0]
      params.end_date = searchForm.dateRange[1]
    }
    
    const response = await distributionAPI.commissionRecord.getAdminRecords(params)
    console.log('分成记录API响应:', response)
    
    // 处理分成记录数据 - 兼容不同的API响应格式
    let recordList = []
    if (response?.data?.success && response.data.data) {
      // 新API格式: { success: true, data: { records: [...], pagination: {...} } }
      recordList = response.data.data.records || response.data.data.commission_records || []
      // 更新分页信息
      if (response.data.data.pagination) {
        pagination.total = response.data.data.pagination.total || response.data.data.pagination.total_count || 0
        pagination.page = response.data.data.pagination.page || response.data.data.pagination.current_page || 1
        pagination.size = response.data.data.pagination.limit || response.data.data.pagination.per_page || 20
      }
    } else if (response?.data?.commission_records) {
      // 直接在data下的commission_records
      recordList = response.data.commission_records
    } else if (response?.data?.records) {
      // 兼容旧格式
      recordList = response.data.records
    } else if (Array.isArray(response?.data)) {
      recordList = response.data
    } else if (Array.isArray(response)) {
      recordList = response
    }
    
    records.value = recordList
    
    // 计算统计数据
    stats.totalRecords = recordList.length
    stats.totalAmount = recordList.reduce((sum, record) => sum + parseFloat(record.commission_amount || 0), 0)
    stats.settledAmount = recordList.filter(r => r.settlement_status === 'settled').reduce((sum, record) => sum + parseFloat(record.commission_amount || 0), 0)
    stats.pendingAmount = recordList.filter(r => r.settlement_status === 'unsettled').reduce((sum, record) => sum + parseFloat(record.commission_amount || 0), 0)
  } catch (error) {
    console.error('获取分成记录失败:', error)
    ElMessage.error('获取分成记录失败')
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
    keyword: '',
    commission_type: '',
    settlement_status: '',
    dateRange: null
  })
  pagination.page = 1
  loadRecords()
}

// 刷新数据
const refreshData = () => {
  loadRecords()
  loadStats()
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

// 格式化货币
const formatCurrency = (amount) => {
  if (!amount) return '0.00'
  return parseFloat(amount).toFixed(2)
}

// 获取分成类型颜色
const getCommissionTypeColor = (type) => {
  const typeMap = {
    invite: 'success',
    activation: 'primary',
    purchase: 'warning',
    renewal: 'info'
  }
  return typeMap[type] || ''
}

// 获取分成类型文本
const getCommissionTypeText = (type) => {
  const textMap = {
    invite: '邀请分成',
    activation: '激活分成',
    purchase: '购买分成',
    renewal: '续费分成'
  }
  return textMap[type] || type
}

// 获取订单类型文本
const getOrderTypeText = (type) => {
  const textMap = {
    membership: '会员套餐',
    package: '充值套餐',
    renewal: '续费订单'
  }
  return textMap[type] || type
}

// 获取结算状态类型
const getSettlementType = (status) => {
  const typeMap = {
    unsettled: 'warning',
    settled: 'success',
    settling: 'info'
  }
  return typeMap[status] || 'info'
}

// 获取结算状态文本
const getSettlementText = (status) => {
  const textMap = {
    unsettled: '未结算',
    settled: '已结算',
    processing: '结算中'
  }
  return textMap[status] || status
}

// 组件挂载时加载数据
onMounted(() => {
  loadRecords()
})
</script>

<style scoped>
.commission-records {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  flex-shrink: 0;
}

.page-header h2 {
  margin: 0;
  color: #303133;
}

.page-description {
  margin: 5px 0 0 0;
  color: #909399;
  font-size: 14px;
}

.stats-section {
  margin-bottom: 20px;
  flex-shrink: 0;
}

.stats-card {
  position: relative;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
}

.stats-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.stats-content {
  padding: 20px;
}

.stats-value {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 8px;
}

.stats-label {
  font-size: 14px;
  color: #909399;
}

.stats-icon {
  position: absolute;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 40px;
  color: #e4e7ed;
  opacity: 0.8;
}

.search-section {
  background: #fff;
  padding: 0;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}

.search-content {
  padding: 20px;
}

.table-section {
  background: #fff;
  padding: 0;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.table-content {
  padding: 20px;
  flex: 1;
  display: flex;
  flex-direction: column;
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

.user-info {
  margin-bottom: 2px;
}

.commission-amount {
  color: #67c23a;
  font-weight: bold;
}

.mt-1 {
  margin-top: 4px;
}

.record-details {
  padding: 10px 0;
}

.record-details pre {
  background: #f5f7fa;
  padding: 10px;
  border-radius: 4px;
  font-size: 12px;
  max-height: 200px;
  overflow-y: auto;
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