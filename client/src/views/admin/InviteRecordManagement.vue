<template>
  <div class="invite-record-management">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <div class="title-section">
          <h1 class="page-title">
            <el-icon class="title-icon"><UserFilled /></el-icon>
            邀请记录管理
          </h1>
          <p class="page-desc">管理用户邀请关系、邀请码生成与统计分析</p>
        </div>
        <div class="header-actions">
          <el-button type="primary" @click="showCreateDialog" :icon="Plus">
            创建邀请
          </el-button>
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
                <el-icon><TrendCharts /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-number">{{ stats.total_invites || 0 }}</div>
                <div class="stat-label">总邀请数</div>
                <div class="stat-trend">+{{ stats.today_invites || 0 }} 今日新增</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card success" shadow="hover">
            <div class="stat-content">
              <div class="stat-icon">
                <el-icon><SuccessFilled /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-number">{{ stats.active_count || 0 }}</div>
                <div class="stat-label">已激活</div>
                <div class="stat-trend">{{ getSuccessRate() }}% 成功率</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card warning" shadow="hover">
            <div class="stat-content">
              <div class="stat-icon">
                <el-icon><Clock /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-number">{{ stats.pending_count || 0 }}</div>
                <div class="stat-label">待使用</div>
                <div class="stat-trend">{{ stats.expired_count || 0 }} 已过期</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card info" shadow="hover">
            <div class="stat-content">
              <div class="stat-icon">
                <el-icon><Money /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-number">¥{{ formatMoney(stats.total_commission_earned) }}</div>
                <div class="stat-label">总佣金</div>
                <div class="stat-trend">¥{{ formatMoney(stats.pending_commission) }} 待结算</div>
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
            placeholder="搜索邀请码、用户名、邮箱或手机号"
            style="width: 300px"
            clearable
            @keyup.enter="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          
          <el-select v-model="filters.status" placeholder="状态筛选" style="width: 140px">
            <el-option label="全部状态" value="" />
            <el-option label="待使用" value="pending" />
            <el-option label="已注册" value="registered" />
            <el-option label="已激活" value="activated" />
            <el-option label="已过期" value="expired" />
            <el-option label="已使用" value="used" />
          </el-select>
          
          <el-select v-model="filters.source" placeholder="邀请来源" style="width: 140px">
            <el-option label="全部来源" value="" />
            <el-option label="网页" value="web" />
            <el-option label="手机应用" value="mobile" />
            <el-option label="微信" value="wechat" />
            <el-option label="QQ" value="qq" />
            <el-option label="邮件" value="email" />
            <el-option label="短信" value="sms" />
            <el-option label="用户邀请码" value="user_invite_code" />
             <el-option label="管理员创建" value="admin_create" />
             <el-option label="其他" value="other" />
          </el-select>
          
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            style="width: 240px"
            @change="handleDateChange"
          />
        </div>
        
        <div class="filter-right">
          <el-button @click="resetFilters" :icon="RefreshLeft">重置</el-button>
          <el-button type="success" @click="exportData" :icon="Download">
            导出数据
          </el-button>
          <el-dropdown @command="handleBatchAction">
            <el-button type="warning">
              批量操作<el-icon class="el-icon--right"><ArrowDown /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="cancel" :disabled="!hasSelection">
                  批量取消
                </el-dropdown-item>
                <el-dropdown-item command="renew" :disabled="!hasSelection">
                  批量续期
                </el-dropdown-item>
                <el-dropdown-item command="delete" :disabled="!hasSelection">
                  批量删除
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
    </el-card>

    <!-- 邀请记录表格 -->
    <el-card class="table-card" shadow="never">
      <el-table 
        ref="tableRef"
        :data="inviteRecords" 
        style="width: 100%" 
        v-loading="loading"
        @selection-change="handleSelectionChange"
        row-key="id"
        stripe
      >
        <el-table-column type="selection" width="55" />
        
        <el-table-column prop="id" label="ID" width="80" sortable />
        
        <el-table-column prop="invite_code" label="邀请码" width="140">
          <template #default="{ row }">
            <div class="invite-code-cell">
              <span class="invite-code">{{ row.invite_code }}</span>
              <el-button 
                type="text" 
                size="small" 
                @click="copyInviteCode(row.invite_code)"
                class="copy-btn"
              >
                <el-icon><CopyDocument /></el-icon>
              </el-button>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column label="邀请者" min-width="120">
          <template #default="{ row }">
            <div class="user-info">
              <el-avatar :size="32">
                {{ row.inviter_username?.[0] || 'U' }}
              </el-avatar>
              <div class="user-details">
                <div class="username">{{ row.inviter_username || '-' }}</div>
                <div class="user-id">ID: {{ row.inviter_id || '-' }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column label="被邀请者" min-width="120">
           <template #default="{ row }">
             <div class="user-info" v-if="row.invitee_id && row.invitee_username">
               <el-avatar :size="32">
                 {{ row.invitee_username?.[0] || 'U' }}
               </el-avatar>
               <div class="user-details">
                 <div class="username">{{ row.invitee_username }}</div>
                 <div class="user-id">ID: {{ row.invitee_id }}</div>
               </div>
             </div>
             <div v-else-if="row.invitee_username || row.invitee_email" class="pending-user">
               <el-icon class="pending-icon"><User /></el-icon>
               <div class="user-details">
                 <div class="username">{{ row.invitee_username || '未知用户' }}</div>
                 <div class="user-email">{{ row.invitee_email || '-' }}</div>
               </div>
             </div>
             <span v-else class="text-muted">-</span>
           </template>
         </el-table-column>
        
        <el-table-column prop="invitee_email" label="邮箱" width="180" show-overflow-tooltip />
         
         <el-table-column prop="invitee_phone" label="手机号" width="130" />
        
        <el-table-column prop="commission_rate" label="分成比例" width="100" sortable>
          <template #default="{ row }">
            <el-tag type="info" size="small">
              {{ (parseFloat(row.commission_rate || 0) * 100).toFixed(1) }}%
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
        
        <el-table-column prop="source" label="来源" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="getSourceTagType(row.source)">
              {{ getSourceLabel(row.source) }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="created_at" label="创建时间" width="160" sortable>
          <template #default="{ row }">
            <div class="time-info">
              <div>{{ formatDate(row.created_at) }}</div>
              <div class="time-detail">{{ formatTime(row.created_at) }}</div>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column prop="register_time" label="注册时间" width="160">
           <template #default="{ row }">
             <div v-if="row.register_time" class="time-info">
               <div>{{ formatDate(row.register_time) }}</div>
               <div class="time-detail">{{ formatTime(row.register_time) }}</div>
             </div>
             <span v-else class="text-muted">-</span>
           </template>
         </el-table-column>
         
         <el-table-column prop="expire_time" label="过期时间" width="160">
           <template #default="{ row }">
             <div v-if="row.expire_time" class="time-info">
               <div :class="{ 'text-danger': isExpired(row.expire_time) }">
                 {{ formatDate(row.expire_time) }}
               </div>
               <div class="time-detail">{{ formatTime(row.expire_time) }}</div>
             </div>
             <span v-else class="text-muted">-</span>
           </template>
         </el-table-column>
        
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button type="primary" size="small" @click="viewDetail(row)" :icon="View">
                详情
              </el-button>
              <el-dropdown @command="(command) => handleRowAction(command, row)">
                <el-button size="small">
                  更多<el-icon class="el-icon--right"><ArrowDown /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item 
                      command="cancel" 
                      v-if="['pending', 'registered'].includes(row.status)"
                    >
                      取消邀请
                    </el-dropdown-item>
                    <el-dropdown-item 
                      command="renew" 
                      v-if="row.status === 'expired'"
                    >
                      续期邀请
                    </el-dropdown-item>
                    <el-dropdown-item command="copy">
                      复制邀请码
                    </el-dropdown-item>
                    <el-dropdown-item command="share">
                      分享邀请
                    </el-dropdown-item>
                    <el-dropdown-item command="delete" divided>
                      删除记录
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
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
          @size-change="handlePageSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

    <!-- 创建邀请对话框 -->
    <el-dialog 
      v-model="dialogs.create" 
      title="创建邀请记录" 
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form 
        ref="createFormRef" 
        :model="createForm" 
        :rules="createRules" 
        label-width="120px"
        class="create-form"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="分成比例" prop="commission_rate">
              <el-input-number 
                v-model="createForm.commission_rate" 
                :min="0" 
                :max="1" 
                :precision="3" 
                style="width: 100%"
                placeholder="0.150"
              />
              <div class="form-tip">范围：0-1之间的小数（如0.15表示15%）</div>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="有效期" prop="expires_days">
              <el-input-number 
                v-model="createForm.expires_days" 
                :min="1" 
                :max="365" 
                style="width: 100%"
                placeholder="30"
              />
              <div class="form-tip">单位：天（1-365天）</div>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item label="邀请来源" prop="source">
          <el-select v-model="createForm.source" placeholder="请选择邀请来源" style="width: 100%">
            <el-option label="网页" value="web" />
            <el-option label="手机应用" value="mobile" />
            <el-option label="微信" value="wechat" />
            <el-option label="QQ" value="qq" />
            <el-option label="邮件" value="email" />
            <el-option label="短信" value="sms" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="备注信息" prop="notes">
          <el-input 
            v-model="createForm.notes" 
            type="textarea" 
            :rows="3" 
            placeholder="请输入备注信息（可选）"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogs.create = false">取消</el-button>
          <el-button type="primary" @click="createInvite" :loading="creating">
            创建邀请
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 详情对话框 -->
    <el-dialog 
      v-model="dialogs.detail" 
      title="邀请记录详情" 
      width="800px"
      :close-on-click-modal="false"
    >
      <div v-if="selectedRecord" class="invite-detail">
        <el-tabs v-model="activeTab" class="detail-tabs">
          <el-tab-pane label="基本信息" name="basic">
            <div class="detail-section">
              <el-descriptions :column="2" border>
                <el-descriptions-item label="邀请码">
                  <div class="invite-code-display">
                    <span class="invite-code">{{ selectedRecord.invite_code }}</span>
                    <el-button 
                      type="text" 
                      size="small" 
                      @click="copyInviteCode(selectedRecord.invite_code)"
                    >
                      <el-icon><CopyDocument /></el-icon>
                    </el-button>
                  </div>
                </el-descriptions-item>
                <el-descriptions-item label="状态">
                  <el-tag :type="getStatusTagType(selectedRecord.status)">
                    {{ getStatusLabel(selectedRecord.status) }}
                  </el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="邀请者">
                  <div class="user-info-detail" v-if="selectedRecord.inviter_username">
                    <el-avatar :size="24">
                      {{ selectedRecord.inviter_username?.[0] || 'U' }}
                    </el-avatar>
                    <span>{{ selectedRecord.inviter_username }}</span>
                  </div>
                  <span v-else>-</span>
                </el-descriptions-item>
                <el-descriptions-item label="被邀请者">
                   <div class="user-info-detail" v-if="selectedRecord.invitee_id && selectedRecord.invitee_username">
                     <el-avatar :size="24">
                       {{ selectedRecord.invitee_username?.[0] || 'U' }}
                     </el-avatar>
                     <span>{{ selectedRecord.invitee_username }}</span>
                   </div>
                   <span v-else-if="selectedRecord.invitee_username">{{ selectedRecord.invitee_username }}</span>
                   <span v-else class="text-muted">未注册</span>
                 </el-descriptions-item>
                 <el-descriptions-item label="邮箱">
                   {{ selectedRecord.invitee_email || '-' }}
                 </el-descriptions-item>
                 <el-descriptions-item label="手机号">
                   {{ selectedRecord.invitee_phone || '-' }}
                 </el-descriptions-item>
                <el-descriptions-item label="分成比例">
                  <el-tag type="info">
                    {{ (parseFloat(selectedRecord.commission_rate || 0) * 100).toFixed(1) }}%
                  </el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="邀请来源">
                  <el-tag :type="getSourceTagType(selectedRecord.source)">
                    {{ getSourceLabel(selectedRecord.source) }}
                  </el-tag>
                </el-descriptions-item>
              </el-descriptions>
            </div>
          </el-tab-pane>
          
          <el-tab-pane label="时间信息" name="time">
            <div class="detail-section">
              <el-descriptions :column="1" border>
                <el-descriptions-item label="创建时间">
                  {{ formatDateTime(selectedRecord.created_at) }}
                </el-descriptions-item>
                <el-descriptions-item label="使用时间" v-if="selectedRecord.used_at">
                   {{ formatDateTime(selectedRecord.used_at) }}
                 </el-descriptions-item>
                 <el-descriptions-item label="更新时间" v-if="selectedRecord.updated_at">
                   {{ formatDateTime(selectedRecord.updated_at) }}
                 </el-descriptions-item>
                 <el-descriptions-item label="过期时间" v-if="selectedRecord.expires_at">
                    <span :class="{ 'text-danger': isExpired(selectedRecord.expires_at) }">
                      {{ formatDateTime(selectedRecord.expires_at) }}
                    </span>
                 </el-descriptions-item>
                <el-descriptions-item label="更新时间">
                  {{ formatDateTime(selectedRecord.updated_at) }}
                </el-descriptions-item>
              </el-descriptions>
            </div>
          </el-tab-pane>
          
          <el-tab-pane label="其他信息" name="other">
            <div class="detail-section">
              <el-descriptions :column="1" border>
                <el-descriptions-item label="注册IP" v-if="selectedRecord.register_ip">
                  {{ selectedRecord.register_ip }}
                </el-descriptions-item>
                <el-descriptions-item label="备注" v-if="selectedRecord.notes">
                  {{ selectedRecord.notes }}
                </el-descriptions-item>
                <el-descriptions-item label="元数据" v-if="selectedRecord.metadata">
                  <pre class="metadata-display">{{ JSON.stringify(selectedRecord.metadata, null, 2) }}</pre>
                </el-descriptions-item>
              </el-descriptions>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogs.detail = false">关闭</el-button>
          <el-button type="primary" @click="editRecord(selectedRecord)" v-if="canEdit(selectedRecord)">
            编辑
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue'
import { ElMessage, ElMessageBox, ElNotification } from 'element-plus'
import { 
  Search, Plus, Refresh, RefreshLeft, Download, ArrowDown, 
  View, CopyDocument, UserFilled, TrendCharts, SuccessFilled, 
  Clock, Money, User
} from '@element-plus/icons-vue'
import { distributionAPI } from '@/api'

// 响应式数据
const loading = ref(false)
const creating = ref(false)
const inviteRecords = ref([])
const stats = ref({})
const searchQuery = ref('')
const dateRange = ref([])
const selectedRows = ref([])
const selectedRecord = ref(null)
const activeTab = ref('basic')
const tableRef = ref()
const createFormRef = ref()

// 筛选条件
const filters = reactive({
  status: '',
  source: ''
})

// 分页
const pagination = reactive({
  page: 1,
  size: 20,
  total: 0
})

// 对话框状态
const dialogs = reactive({
  create: false,
  detail: false
})

// 创建表单
const createForm = reactive({
  commission_rate: 0.15,
  expires_days: 30,
  source: 'web',
  notes: ''
})

// 表单验证规则
const createRules = {
  commission_rate: [
    { required: true, message: '请输入分成比例', trigger: 'blur' },
    { type: 'number', min: 0, max: 1, message: '分成比例必须在0-1之间', trigger: 'blur' }
  ],
  expires_days: [
    { required: true, message: '请输入有效期', trigger: 'blur' },
    { type: 'number', min: 1, max: 365, message: '有效期必须在1-365天之间', trigger: 'blur' }
  ],
  source: [
    { required: true, message: '请选择邀请来源', trigger: 'change' }
  ]
}

// 计算属性
const hasSelection = computed(() => selectedRows.value.length > 0)

const getSuccessRate = () => {
  const total = stats.value.total_invites || 0
  const active = stats.value.active_count || 0
  return total > 0 ? ((active / total) * 100).toFixed(1) : '0.0'
}

// 工具函数
const formatMoney = (amount) => {
  return (amount || 0).toFixed(2)
}

const formatDate = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('zh-CN')
}

const formatTime = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleTimeString('zh-CN', { hour12: false })
}

const formatDateTime = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString('zh-CN')
}

const isExpired = (dateString) => {
  if (!dateString) return false
  return new Date(dateString) < new Date()
}

const getStatusLabel = (status) => {
  const labels = {
    pending: '待使用',
    active: '已激活',
    registered: '已注册',
    activated: '已激活',
    expired: '已过期',
    used: '已使用'
  }
  return labels[status] || status
}

const getStatusTagType = (status) => {
  const types = {
    pending: 'warning',
    active: 'success',
    registered: 'success',
    activated: 'primary',
    expired: 'danger',
    used: 'primary'
  }
  return types[status] || ''
}

const getSourceLabel = (source) => {
  const labels = {
    web: '网页',
    mobile: '手机应用',
    wechat: '微信',
    qq: 'QQ',
    email: '邮件',
    sms: '短信',
    other: '其他'
  }
  return labels[source] || source
}

const getSourceTagType = (source) => {
  const types = {
    web: '',
    mobile: 'success',
    wechat: 'success',
    qq: 'warning',
    email: 'info',
    sms: 'warning',
    other: 'info'
  }
  return types[source] || ''
}

const canEdit = (record) => {
  return ['pending', 'active', 'registered', 'activated'].includes(record?.status)
}

// 主要方法
const loadData = async () => {
  try {
    loading.value = true
    
    // 调用API获取邀请记录，传递分页参数
    const params = {
      page: pagination.page,
      limit: pagination.size
    }
    
    // 添加筛选参数
    if (filters.status) {
      params.status = filters.status
    }
    
    if (searchQuery.value) {
      params.search = searchQuery.value
    }
    
    const response = await distributionAPI.inviteRecord.getAdminRecords(params)
    
    console.log('API响应数据:', response)
    
    // 处理邀请记录数据 - 根据实际API响应格式解析
    let records = []
    if (response?.data?.success && response.data.data) {
      // 实际API格式: { success: true, data: { inviteRecords: [...], pagination: {...} } }
      records = response.data.data.inviteRecords || response.data.data.records || []
      // 更新分页信息
      if (response.data.data.pagination) {
        pagination.total = response.data.data.pagination.total || response.data.data.pagination.total_count || 0
        pagination.page = response.data.data.pagination.page || response.data.data.pagination.current_page || 1
        pagination.size = response.data.data.pagination.limit || response.data.data.pagination.per_page || 20
      }
    } else if (response?.data?.inviteRecords) {
      // 直接在data下的inviteRecords
      records = response.data.inviteRecords
    } else if (response?.data?.records) {
      // 兼容旧格式
      records = response.data.records
    } else if (Array.isArray(response?.data)) {
      records = response.data
    } else if (Array.isArray(response)) {
      records = response
    }
    
    console.log('解析后的记录数据:', records)
    
    if (records.length > 0) {
      let filteredRecords = records
      
      // 客户端筛选
      if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase()
        filteredRecords = filteredRecords.filter(record => 
          record.invite_code?.toLowerCase().includes(query) ||
          record.invitee_username?.toLowerCase().includes(query) ||
          record.invitee_email?.toLowerCase().includes(query) ||
          record.inviter_username?.toLowerCase().includes(query)
        )
      }
      
      if (filters.status) {
        filteredRecords = filteredRecords.filter(record => record.status === filters.status)
      }
      
      if (filters.source) {
        filteredRecords = filteredRecords.filter(record => record.source === filters.source)
      }
      
      if (dateRange.value && dateRange.value.length === 2) {
        const startDate = dateRange.value[0]
        const endDate = dateRange.value[1]
        filteredRecords = filteredRecords.filter(record => {
          const recordDate = new Date(record.created_at)
          return recordDate >= startDate && recordDate <= endDate
        })
      }
      
      // 分页处理
      pagination.total = filteredRecords.length
      const startIndex = (pagination.page - 1) * pagination.size
      const endIndex = startIndex + pagination.size
      inviteRecords.value = filteredRecords.slice(startIndex, endIndex)
      
      // 计算统计数据
      const allRecords = records
      const totalInvites = allRecords.length
      const activeCount = allRecords.filter(r => r.status === 'active' || r.status === 'registered' || r.status === 'activated').length
      const usedCount = allRecords.filter(r => r.status === 'used').length
      const pendingCount = allRecords.filter(r => r.status === 'pending').length
      const expiredCount = allRecords.filter(r => r.status === 'expired').length
      const totalCommission = allRecords.reduce((sum, r) => sum + (parseFloat(r.commission_rate) || 0), 0)
      
      // 今日新增
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayInvites = allRecords.filter(r => new Date(r.created_at) >= today).length
      
      stats.value = {
        total_invites: totalInvites,
        active_count: activeCount,
        used_count: usedCount,
        pending_count: pendingCount,
        expired_count: expiredCount,
        total_commission_earned: totalCommission,
        pending_commission: totalCommission * 0.3, // 假设30%待结算
        today_invites: todayInvites
      }
      
    } else {
      console.log('没有找到邀请记录数据')
      inviteRecords.value = []
      pagination.total = 0
      stats.value = {
        total_invites: 0,
        registered_count: 0,
        pending_count: 0,
        expired_count: 0,
        total_commission_earned: 0,
        pending_commission: 0,
        today_invites: 0
      }
    }
    
  } catch (error) {
    console.error('加载数据失败:', error)
    ElMessage.error('加载数据失败')
    inviteRecords.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

const refreshData = () => {
  loadData()
}

const handleSearch = () => {
  pagination.page = 1
  loadData()
}

const handleDateChange = () => {
  pagination.page = 1
  loadData()
}

const resetFilters = () => {
  searchQuery.value = ''
  filters.status = ''
  filters.source = ''
  dateRange.value = []
  pagination.page = 1
  loadData()
}

const handlePageSizeChange = (size) => {
  pagination.size = size
  pagination.page = 1
  loadData()
}

const handlePageChange = (page) => {
  pagination.page = page
  loadData()
}

const handleSelectionChange = (selection) => {
  selectedRows.value = selection
}

// 创建邀请
const showCreateDialog = () => {
  dialogs.create = true
}

const createInvite = async () => {
  try {
    await createFormRef.value.validate()
    creating.value = true
    
    const response = await distributionAPI.inviteRecord.createAdminRecord(createForm)
    
    ElMessage.success('邀请创建成功')
    dialogs.create = false
    
    // 重置表单
    Object.assign(createForm, {
      commission_rate: 0.15,
      expires_days: 30,
      source: 'web',
      notes: ''
    })
    
    await loadData()
    
  } catch (error) {
    console.error('创建邀请失败:', error)
    ElMessage.error('创建邀请失败')
  } finally {
    creating.value = false
  }
}

// 查看详情
const viewDetail = (record) => {
  selectedRecord.value = record
  activeTab.value = 'basic'
  dialogs.detail = true
}

// 复制邀请码
const copyInviteCode = async (code) => {
  try {
    await navigator.clipboard.writeText(code)
    ElMessage.success('邀请码已复制到剪贴板')
  } catch (error) {
    console.error('复制失败:', error)
    ElMessage.error('复制失败')
  }
}

// 行操作
const handleRowAction = async (command, row) => {
  switch (command) {
    case 'cancel':
      await cancelInvite(row)
      break
    case 'renew':
      await renewInvite(row)
      break
    case 'copy':
      await copyInviteCode(row.invite_code)
      break
    case 'share':
      shareInvite(row)
      break
    case 'delete':
      await deleteInvite(row)
      break
  }
}

// 取消邀请
const cancelInvite = async (record) => {
  try {
    await ElMessageBox.confirm(
      `确定要取消邀请码 ${record.invite_code} 吗？`,
      '确认取消',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await distributionAPI.inviteRecord.cancelRecord(record.id)
    
    ElMessage.success('邀请已取消')
    await loadData()
    
  } catch (error) {
    if (error !== 'cancel') {
      console.error('取消邀请失败:', error)
      ElMessage.error('取消邀请失败')
    }
  }
}

// 续期邀请
const renewInvite = async (record) => {
  try {
    await ElMessageBox.confirm(
      `确定要续期邀请码 ${record.invite_code} 吗？将延长30天有效期。`,
      '确认续期',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info'
      }
    )
    
    await distributionAPI.inviteRecord.renewRecord(record.id, 30)
    
    ElMessage.success('邀请已续期')
    await loadData()
    
  } catch (error) {
    if (error !== 'cancel') {
      console.error('续期邀请失败:', error)
      ElMessage.error('续期邀请失败')
    }
  }
}

// 分享邀请
const shareInvite = (record) => {
  const shareText = `邀请您注册使用我们的服务，邀请码：${record.invite_code}`
  
  if (navigator.share) {
    navigator.share({
      title: '邀请注册',
      text: shareText
    })
  } else {
    copyInviteCode(shareText)
  }
}

// 删除邀请
const deleteInvite = async (record) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除邀请码 ${record.invite_code} 吗？此操作不可恢复。`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'danger'
      }
    )
    
    await distributionAPI.inviteRecord.deleteRecord(record.id)
    
    ElMessage.success('邀请已删除')
    await loadData()
    
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除邀请失败:', error)
      ElMessage.error('删除邀请失败')
    }
  }
}

// 批量操作
const handleBatchAction = async (command) => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请先选择要操作的记录')
    return
  }
  
  const ids = selectedRows.value.map(row => row.id)
  const codes = selectedRows.value.map(row => row.invite_code).join(', ')
  
  try {
    switch (command) {
      case 'cancel':
        await ElMessageBox.confirm(
          `确定要取消选中的 ${ids.length} 个邀请吗？\n邀请码：${codes}`,
          '批量取消',
          { type: 'warning' }
        )
        // 实现批量取消
        ElMessage.info('批量取消功能开发中...')
        break
        
      case 'renew':
        await ElMessageBox.confirm(
          `确定要续期选中的 ${ids.length} 个邀请吗？\n邀请码：${codes}`,
          '批量续期',
          { type: 'info' }
        )
        // 实现批量续期
        ElMessage.info('批量续期功能开发中...')
        break
        
      case 'delete':
        await ElMessageBox.confirm(
          `确定要删除选中的 ${ids.length} 个邀请吗？此操作不可恢复。\n邀请码：${codes}`,
          '批量删除',
          { type: 'danger' }
        )
        // 实现批量删除
        ElMessage.info('批量删除功能开发中...')
        break
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量操作失败:', error)
      ElMessage.error('批量操作失败')
    }
  }
}

// 导出数据
const exportData = () => {
  ElMessage.info('导出功能开发中...')
}

// 编辑记录
const editRecord = (record) => {
  ElMessage.info('编辑功能开发中...')
}

// 监听筛选条件变化
watch([() => filters.status, () => filters.source], () => {
  pagination.page = 1
  loadData()
})

// 生命周期
onMounted(() => {
  loadData()
})
</script>

<style scoped>
.invite-record-management {
  padding: 24px;
  background: #f5f7fa;
  min-height: 100vh;
}

.page-header {
  margin-bottom: 24px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.title-section {
  flex: 1;
}

.page-title {
  font-size: 28px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 8px 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.title-icon {
  font-size: 32px;
  color: #3b82f6;
}

.page-desc {
  color: #6b7280;
  margin: 0;
  font-size: 16px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.stats-overview {
  margin-bottom: 24px;
}

.stat-card {
  border: none;
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.stat-card.total {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.stat-card.success {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  color: white;
}

.stat-card.warning {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
}

.stat-card.info {
  background: linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%);
  color: white;
}

.stat-content {
  display: flex;
  align-items: center;
  padding: 24px;
}

.stat-icon {
  font-size: 48px;
  margin-right: 20px;
  opacity: 0.8;
}

.stat-info {
  flex: 1;
}

.stat-number {
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 4px;
  line-height: 1;
}

.stat-label {
  font-size: 16px;
  margin-bottom: 4px;
  opacity: 0.9;
}

.stat-trend {
  font-size: 14px;
  opacity: 0.8;
}

.filter-card {
  margin-bottom: 24px;
  border: none;
  border-radius: 12px;
}

.filter-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.filter-left {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
}

.filter-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.table-card {
  border: none;
  border-radius: 12px;
  overflow: hidden;
}

.invite-code-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.invite-code {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  background: #f1f5f9;
  padding: 4px 8px;
  border-radius: 6px;
  font-weight: 600;
  color: #1e40af;
  border: 1px solid #e2e8f0;
}

.copy-btn {
  padding: 4px;
  color: #6b7280;
}

.copy-btn:hover {
  color: #3b82f6;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-details {
  flex: 1;
  min-width: 0;
}

.username {
  font-weight: 500;
  color: #1f2937;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-id {
  font-size: 12px;
  color: #6b7280;
}

.user-email {
  font-size: 12px;
  color: #6b7280;
}

.pending-user {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pending-icon {
  color: #f59e0b;
}

.time-info {
  font-size: 13px;
}

.time-detail {
  color: #6b7280;
  font-size: 11px;
}

.text-muted {
  color: #9ca3af;
}

.text-danger {
  color: #ef4444;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #f3f4f6;
}

.create-form .form-tip {
  font-size: 12px;
  color: #6b7280;
  margin-top: 4px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.invite-detail {
  max-height: 600px;
  overflow-y: auto;
}

.detail-tabs {
  margin-top: -16px;
}

.detail-section {
  padding: 16px 0;
}

.invite-code-display {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-info-detail {
  display: flex;
  align-items: center;
  gap: 8px;
}

.metadata-display {
  background: #f8fafc;
  padding: 12px;
  border-radius: 6px;
  font-size: 12px;
  color: #475569;
  max-height: 200px;
  overflow-y: auto;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .stats-overview {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .invite-record-management {
    padding: 16px;
  }
  
  .header-content {
    flex-direction: column;
    gap: 16px;
  }
  
  .filter-section {
    flex-direction: column;
    align-items: stretch;
  }
  
  .filter-left {
    flex-direction: column;
    gap: 12px;
  }
  
  .stats-overview {
    grid-template-columns: 1fr;
  }
  
  .stat-content {
    padding: 16px;
  }
  
  .stat-number {
    font-size: 24px;
  }
}
</style>