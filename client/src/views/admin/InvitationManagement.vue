<template>
  <div class="invitation-management">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title">分成记录管理</h1>
      <p class="page-desc">管理用户分成记录和佣金结算</p>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-cards">
      <el-card class="stat-card">
        <div class="stat-content">
          <div class="stat-number">{{ totalInvitations }}</div>
          <div class="stat-label">总分成记录</div>
        </div>
      </el-card>
      <el-card class="stat-card">
        <div class="stat-content">
          <div class="stat-number">{{ activeInviters }}</div>
          <div class="stat-label">活跃分成者</div>
        </div>
      </el-card>
      <el-card class="stat-card">
        <div class="stat-content">
          <div class="stat-number">¥{{ totalCommission }}</div>
          <div class="stat-label">总佣金</div>
        </div>
      </el-card>
      <el-card class="stat-card">
        <div class="stat-content">
          <div class="stat-number">¥{{ pendingCommission }}</div>
          <div class="stat-label">待结算佣金</div>
        </div>
      </el-card>
    </div>

    <!-- 操作栏 -->
    <div class="action-bar">
      <div class="search-section">
        <el-input
          v-model="searchQuery"
          placeholder="搜索用户名或邀请码"
          style="width: 300px"
          clearable
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-select v-model="statusFilter" placeholder="状态筛选" style="width: 140px; margin-left: 12px">
          <el-option label="全部" value="" />
          <el-option label="待确认" value="pending" />
          <el-option label="已确认" value="confirmed" />
          <el-option label="已结算" value="settled" />
        </el-select>
        <el-select v-model="commissionTypeFilter" placeholder="分成类型" style="width: 120px; margin-left: 12px">
          <el-option label="全部" value="" />
          <el-option label="购买分成" value="purchase" />
          <el-option label="激活分成" value="activation" />
          <el-option label="续费分成" value="renewal" />
          <el-option label="升级分成" value="upgrade" />
        </el-select>
      </div>
      <div class="action-buttons">
        <el-button type="primary" @click="showCommissionDialog">
          <el-icon><Money /></el-icon>
          佣金设置
        </el-button>
        <el-button type="success" @click="batchSettle">
          <el-icon><Check /></el-icon>
          批量结算
        </el-button>
      </div>
    </div>

    <!-- 邀请关系表格 -->
    <el-card shadow="hover">
      <el-table :data="filteredInvitations" style="width: 100%" v-loading="loading">
        <el-table-column type="selection" width="55" />
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="inviterName" label="邀请者" min-width="120" />
        <el-table-column prop="inviteeName" label="被邀请者" min-width="120" />
        <el-table-column prop="inviteCode" label="邀请码" width="120">
          <template #default="{ row }">
            <span class="invite-code">{{ row.inviteCode }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="orderAmount" label="订单金额" width="100">
          <template #default="{ row }">
            <span class="amount">¥{{ parseFloat(row.orderAmount || 0).toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="commissionRate" label="佣金比例" width="100">
          <template #default="{ row }">
            {{ row.commissionRate }}%
          </template>
        </el-table-column>
        <el-table-column prop="commissionAmount" label="佣金金额" width="100">
          <template #default="{ row }">
            <span class="commission">¥{{ parseFloat(row.commissionAmount || 0).toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="commissionType" label="分成类型" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="getCommissionTypeTagType(row.commissionType)">
              {{ getCommissionTypeLabel(row.commissionType) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)" size="small">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="160" />
        <el-table-column prop="settledAt" label="结算时间" width="160">
          <template #default="{ row }">
            <span v-if="row.settledAt">{{ row.settledAt }}</span>
            <span v-else class="text-muted">-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="viewDetail(row)">详情</el-button>
            <el-button 
              v-if="row.status === 'confirmed'" 
              type="success" 
              size="small" 
              @click="settleCommission(row)"
            >
              结算
            </el-button>
            <el-button 
              v-if="row.status === 'pending'" 
              type="warning" 
              size="small" 
              @click="confirmInvitation(row)"
            >
              确认
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
          :total="filteredInvitations.length"
          layout="total, sizes, prev, pager, next, jumper"
        />
      </div>
    </el-card>

    <!-- 佣金设置对话框 -->
    <el-dialog v-model="commissionDialogVisible" title="佣金设置" width="500px">
      <el-form ref="commissionFormRef" :model="commissionForm" :rules="commissionRules" label-width="120px">
        <el-form-item label="一级佣金比例" prop="level1Rate">
          <el-input-number v-model="commissionForm.level1Rate" :min="0" :max="100" :precision="1" style="width: 100%" />
          <span style="margin-left: 8px">%</span>
        </el-form-item>
        <el-form-item label="二级佣金比例" prop="level2Rate">
          <el-input-number v-model="commissionForm.level2Rate" :min="0" :max="100" :precision="1" style="width: 100%" />
          <span style="margin-left: 8px">%</span>
        </el-form-item>
        <el-form-item label="最低结算金额" prop="minSettleAmount">
          <el-input-number v-model="commissionForm.minSettleAmount" :min="0" :precision="2" style="width: 100%" />
          <span style="margin-left: 8px">元</span>
        </el-form-item>
        <el-form-item label="结算周期" prop="settleCycle">
          <el-select v-model="commissionForm.settleCycle" placeholder="请选择结算周期">
            <el-option label="实时结算" value="realtime" />
            <el-option label="每日结算" value="daily" />
            <el-option label="每周结算" value="weekly" />
            <el-option label="每月结算" value="monthly" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="commissionDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveCommissionSettings" :loading="saving">
          保存设置
        </el-button>
      </template>
    </el-dialog>

    <!-- 详情对话框 -->
    <el-dialog v-model="detailDialogVisible" title="邀请详情" width="600px">
      <div v-if="selectedInvitation" class="invitation-detail">
        <div class="detail-section">
          <h4>邀请信息</h4>
          <div class="detail-item">
            <label>邀请者：</label>
            <span>{{ selectedInvitation.inviterName }}</span>
          </div>
          <div class="detail-item">
            <label>被邀请者：</label>
            <span>{{ selectedInvitation.inviteeName }}</span>
          </div>
          <div class="detail-item">
            <label>邀请码：</label>
            <span class="invite-code">{{ selectedInvitation.inviteCode }}</span>
          </div>
          <div class="detail-item">
            <label>邀请时间：</label>
            <span>{{ selectedInvitation.createdAt }}</span>
          </div>
        </div>
        
        <div class="detail-section">
          <h4>订单信息</h4>
          <div class="detail-item" v-if="selectedInvitation.orderId">
            <label>订单ID：</label>
            <span>{{ selectedInvitation.orderId }}</span>
          </div>
          <div class="detail-item">
            <label>订单金额：</label>
            <span class="amount">¥{{ parseFloat(selectedInvitation.orderAmount || 0).toFixed(2) }}</span>
          </div>
          <div class="detail-item">
            <label>佣金比例：</label>
            <span>{{ selectedInvitation.commissionRate }}%</span>
          </div>
          <div class="detail-item">
            <label>佣金金额：</label>
            <span class="commission">¥{{ parseFloat(selectedInvitation.commissionAmount || 0).toFixed(2) }}</span>
          </div>
          <div class="detail-item">
            <label>分成类型：</label>
            <el-tag :type="getCommissionTypeTagType(selectedInvitation.commissionType)" size="small">
              {{ getCommissionTypeLabel(selectedInvitation.commissionType) }}
            </el-tag>
          </div>
          <div class="detail-item">
            <label>状态：</label>
            <el-tag :type="getStatusTagType(selectedInvitation.status)" size="small">
              {{ getStatusLabel(selectedInvitation.status) }}
            </el-tag>
          </div>
          <div class="detail-item" v-if="selectedInvitation.settledAt">
            <label>结算时间：</label>
            <span>{{ selectedInvitation.settledAt }}</span>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Money, Check } from '@element-plus/icons-vue'
import { invitationAPI } from '@/api'

// 日期时间格式化函数
const formatDateTime = (dateString) => {
  if (!dateString) return '-'
  try {
    const date = new Date(dateString)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  } catch (error) {
    return dateString
  }
}

const loading = ref(false)
const saving = ref(false)
const searchQuery = ref('')
const statusFilter = ref('')
const commissionTypeFilter = ref('')
const currentPage = ref(1)
const pageSize = ref(20)
const commissionDialogVisible = ref(false)
const detailDialogVisible = ref(false)
const commissionFormRef = ref()
const selectedInvitation = ref(null)

const invitations = ref([])

const commissionForm = ref({
  level1Rate: 10.0,
  level2Rate: 5.0,
  minSettleAmount: 10.0,
  settleCycle: 'weekly'
})

const commissionRules = {
  level1Rate: [{ required: true, message: '请输入一级佣金比例', trigger: 'blur' }],
  level2Rate: [{ required: true, message: '请输入二级佣金比例', trigger: 'blur' }],
  minSettleAmount: [{ required: true, message: '请输入最低结算金额', trigger: 'blur' }],
  settleCycle: [{ required: true, message: '请选择结算周期', trigger: 'change' }]
}

const filteredInvitations = computed(() => {
  let result = invitations.value
  
  if (searchQuery.value) {
    result = result.filter(invitation => 
      invitation.inviterName.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      invitation.inviteeName.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      invitation.inviteCode.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      (invitation.orderId && invitation.orderId.toString().includes(searchQuery.value))
    )
  }
  
  if (statusFilter.value) {
    result = result.filter(invitation => invitation.status === statusFilter.value)
  }
  
  if (commissionTypeFilter.value) {
    result = result.filter(invitation => invitation.commissionType === commissionTypeFilter.value)
  }
  
  return result
})

const stats = ref({
  totalInvitations: 0,
  activeInviters: 0,
  totalCommission: '0.00',
  pendingCommission: '0.00'
})

const totalInvitations = computed(() => stats.value.totalInvitations)
const activeInviters = computed(() => stats.value.activeInviters)
const totalCommission = computed(() => stats.value.totalCommission)
const pendingCommission = computed(() => stats.value.pendingCommission)

const getStatusLabel = (status) => {
  const labels = {
    pending: '待确认',
    confirmed: '已确认',
    settled: '已结算'
  }
  return labels[status] || status
}

const getStatusTagType = (status) => {
  const types = {
    pending: 'warning',
    confirmed: 'success',
    settled: 'info'
  }
  return types[status] || ''
}

const getCommissionTypeLabel = (type) => {
  const labels = {
    purchase: '购买分成',
    activation: '激活分成',
    renewal: '续费分成',
    upgrade: '升级分成'
  }
  return labels[type] || type
}

const getCommissionTypeTagType = (type) => {
  const types = {
    purchase: 'primary',
    activation: 'success',
    renewal: 'warning',
    upgrade: 'danger'
  }
  return types[type] || ''
}

const showCommissionDialog = () => {
  commissionDialogVisible.value = true
}

const saveCommissionSettings = async () => {
  try {
    await commissionFormRef.value.validate()
    saving.value = true
    
    const settingsData = {
      level1_rate: commissionForm.value.level1Rate,
      level2_rate: commissionForm.value.level2Rate,
      min_settle_amount: commissionForm.value.minSettleAmount,
      settle_cycle: commissionForm.value.settleCycle
    }
    
    await invitationAPI.updateCommissionSettings(settingsData)
    
    ElMessage.success('佣金设置保存成功')
    commissionDialogVisible.value = false
  } catch (error) {
    console.error('保存失败:', error)
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

const viewDetail = (invitation) => {
  selectedInvitation.value = invitation
  detailDialogVisible.value = true
}

const confirmInvitation = async (invitation) => {
  try {
    await ElMessageBox.confirm(`确定要确认分成记录吗？`, '确认操作')
    await invitationAPI.batchConfirmCommission([invitation.id])
    invitation.status = 'confirmed'
    ElMessage.success('分成记录确认成功')
    await loadInvitations()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('确认失败:', error)
      ElMessage.error('确认失败')
    }
  }
}

const settleCommission = async (invitation) => {
  try {
    await ElMessageBox.confirm(`确定要结算佣金 ¥${invitation.commissionAmount} 吗？`, '确认结算')
    await invitationAPI.settleCommission(invitation.id)
    invitation.status = 'settled'
    invitation.settledAt = formatDateTime(new Date().toISOString())
    ElMessage.success('佣金结算成功')
    await loadInvitations()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('结算失败:', error)
      ElMessage.error('结算失败')
    }
  }
}

const batchSettle = async () => {
  const confirmedInvitations = invitations.value.filter(inv => inv.status === 'confirmed')
  if (confirmedInvitations.length === 0) {
    ElMessage.warning('没有可结算的佣金')
    return
  }
  
  try {
    const totalAmount = confirmedInvitations.reduce((sum, inv) => sum + parseFloat(inv.commissionAmount), 0)
    await ElMessageBox.confirm(`确定要批量结算 ${confirmedInvitations.length} 笔佣金，总金额 ¥${totalAmount.toFixed(2)} 吗？`, '批量结算')
    
    const ids = confirmedInvitations.map(inv => inv.id)
    const response = await invitationAPI.batchSettleCommission(ids)
    
    ElMessage.success(`成功结算 ${response.data.confirmed_count || confirmedInvitations.length} 笔佣金`)
    await loadInvitations()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量结算失败:', error)
      ElMessage.error('批量结算失败')
    }
  }
}

const loadInvitations = async () => {
  try {
    loading.value = true
    
    // 获取邀请记录和分成记录的综合数据
     const [inviteResponse, commissionResponse, statsResponse] = await Promise.all([
       invitationAPI.getAdminInviteRecords({
         page: currentPage.value,
         limit: pageSize.value,
         search: searchQuery.value
       }),
       invitationAPI.getAdminCommissionRecords({
         page: currentPage.value,
         limit: pageSize.value,
         search: searchQuery.value,
         status: statusFilter.value,
         commission_type: commissionTypeFilter.value
       }),
       invitationAPI.getAdminStats()
     ])
    
    // 合并邀请记录和分成记录数据
    const inviteRecords = inviteResponse.data.invite_records || []
    const commissionRecords = commissionResponse.data.commission_records || []
    
    // 将分成记录映射到邀请记录
    const mergedData = commissionRecords.map(commission => {
      const invite = inviteRecords.find(inv => inv.id === commission.invite_record_id)
      return {
        id: commission.id,
        inviteRecordId: commission.invite_record_id,
        inviterName: commission.inviter?.nickname || commission.inviter?.username || '未知用户',
        inviteeName: commission.invited_user?.nickname || commission.invited_user?.username || '未知用户',
        inviteCode: invite?.invite_code || '未知',
        orderAmount: commission.original_amount || 0,
        commissionRate: (commission.commission_rate * 100).toFixed(1),
        commissionAmount: commission.commission_amount || 0,
        status: commission.settlement_status === 'settled' ? 'settled' : 
                commission.status === 'confirmed' ? 'confirmed' : 'pending',
        createdAt: formatDateTime(commission.created_at),
        settledAt: commission.settlement_time ? formatDateTime(commission.settlement_time) : null,
        orderId: commission.order_id,
        commissionType: commission.commission_type,
        settlementStatus: commission.settlement_status
      }
    })
    
    invitations.value = mergedData
    
    // 更新统计数据
    if (statsResponse.data) {
      stats.value = {
        totalInvitations: statsResponse.data.total_invites || 0,
        activeInviters: statsResponse.data.active_inviters || 0,
        totalCommission: (statsResponse.data.total_commission || 0).toFixed(2),
        pendingCommission: (statsResponse.data.pending_commission || 0).toFixed(2)
      }
    }
    
  } catch (error) {
    console.error('加载数据失败:', error)
    ElMessage.error('加载数据失败')
  } finally {
    loading.value = false
  }
}

const loadCommissionSettings = async () => {
  try {
    const response = await invitationAPI.getCommissionSettings()
    if (response.data) {
      Object.assign(commissionForm.value, {
        level1Rate: response.data.level1_rate || 10.0,
        level2Rate: response.data.level2_rate || 5.0,
        minSettleAmount: response.data.min_settle_amount || 10.0,
        settleCycle: response.data.settle_cycle || 'weekly'
      })
    }
  } catch (error) {
    console.error('加载佣金设置失败:', error)
    ElMessage.error('加载佣金设置失败')
  }
}

onMounted(() => {
  loadInvitations()
  loadCommissionSettings()
})
</script>

<style scoped>
.invitation-management {
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

.stats-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 20px;
}

.stat-card {
  text-align: center;
}

.stat-content {
  padding: 20px;
}

.stat-number {
  font-size: 32px;
  font-weight: 600;
  color: #409eff;
  margin-bottom: 8px;
}

.stat-label {
  color: #666;
  font-size: 14px;
}

.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.search-section {
  display: flex;
  align-items: center;
}

.action-buttons {
  display: flex;
  gap: 12px;
}

.invite-code {
  font-family: monospace;
  font-weight: 600;
  color: #409eff;
}

.amount {
  font-weight: 600;
  color: #e74c3c;
}

.commission {
  font-weight: 600;
  color: #27ae60;
}

.text-muted {
  color: #999;
}

.pagination-wrapper {
  margin-top: 20px;
  text-align: center;
}

.invitation-detail {
  padding: 20px 0;
}

.detail-section {
  margin-bottom: 24px;
}

.detail-section h4 {
  margin: 0 0 16px 0;
  color: #333;
  font-size: 16px;
  font-weight: 600;
  border-bottom: 1px solid #eee;
  padding-bottom: 8px;
}

.detail-item {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.detail-item label {
  width: 100px;
  font-weight: 600;
  color: #333;
}

.detail-item span {
  flex: 1;
}
</style>