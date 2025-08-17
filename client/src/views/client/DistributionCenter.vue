<template>
  <div class="distribution-center">
    <!-- 标签页 -->
    <el-card class="tabs-card" shadow="never">
      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <!-- 邀请管理 -->
        <el-tab-pane label="邀请管理" name="invite">
          <div class="tab-content">
            <!-- 邀请码管理 -->
            <div class="invite-code-section">
              <el-card shadow="never" class="invite-card">
                <div class="invite-content">
                  <div class="invite-code-display">
                    <div class="code-item">
                      <label>邀请码:</label>
                      <div class="code-value">
                        <el-input
                          v-model="myInviteCode"
                          readonly
                          placeholder="加载中..."
                        >
                          <template #append>
                            <el-button @click="copyInviteCode" :icon="CopyDocument">
                              复制
                            </el-button>
                          </template>
                        </el-input>
                      </div>
                    </div>
                    
                    <div class="code-item">
                      <label>邀请链接:</label>
                      <div class="code-value">
                        <el-input
                          v-model="inviteLink"
                          readonly
                          placeholder="加载中..."
                        >
                          <template #append>
                            <el-button @click="copyInviteLink" :icon="CopyDocument">
                              复制
                            </el-button>
                          </template>
                        </el-input>
                      </div>
                    </div>
                  </div>
                </div>
              </el-card>
            </div>

            <!-- 邀请统计和提现区域 -->
            <div class="invite-stats-section">
              <el-row :gutter="20">
                <!-- 左侧：统计数据 -->
                <el-col :span="15">
                  <el-row :gutter="15">
                    <el-col :span="8">
                      <el-card class="stats-card" shadow="hover">
                        <div class="stats-content">
                          <div class="stats-icon">
                            <el-icon><UserFilled /></el-icon>
                          </div>
                          <div class="stats-info">
                            <div class="stats-number">{{ inviteStats.total_invites || 0 }}</div>
                            <div class="stats-label">总邀请人数</div>
                          </div>
                        </div>
                      </el-card>
                    </el-col>
                    <el-col :span="8">
                      <el-card class="stats-card" shadow="hover">
                        <div class="stats-content">
                          <div class="stats-icon">
                            <el-icon><Check /></el-icon>
                          </div>
                          <div class="stats-info">
                            <div class="stats-number">{{ inviteStats.valid_invites || 0 }}</div>
                            <div class="stats-label">开通会员</div>
                          </div>
                        </div>
                      </el-card>
                    </el-col>
                    <el-col :span="8">
                      <el-card class="stats-card" shadow="hover">
                        <div class="stats-content">
                          <div class="stats-icon">
                            <el-icon><Money /></el-icon>
                          </div>
                          <div class="stats-info">
                            <div class="stats-number">¥{{ formatMoney(accountInfo.total_commission || 0) }}</div>
                            <div class="stats-label">累计佣金</div>
                            <div class="stats-rate">当前佣金率: {{ ((accountInfo.commission_rate || 0) * 100).toFixed(1) }}%</div>
                          </div>
                        </div>
                      </el-card>
                    </el-col>
                  </el-row>
                </el-col>
                
                <!-- 右侧：提现区域 -->
                <el-col :span="9">
                  <div class="withdraw-section">
                    <el-card class="withdraw-card" shadow="hover" style="margin-bottom: 10px;">
                      <div class="withdraw-content">
                        <div class="withdraw-icon">
                          <el-icon><Wallet /></el-icon>
                        </div>
                        <div class="withdraw-info">
                          <div class="withdraw-amount">¥{{ formatMoney(accountInfo.available_amount || 0) }}</div>
                          <div class="withdraw-label">可提现金额</div>
                        </div>
                      </div>
                    </el-card>
                    <div class="withdraw-action">
                      <el-button 
                        type="primary" 
                        size="default"
                        @click="openWithdrawDialog"
                        :disabled="!canWithdraw"
                        style="width: 100%; height: 50px; font-size: 14px;"
                      >
                        <el-icon><CreditCard /></el-icon>
                        申请提现
                      </el-button>
                      <div v-if="!canWithdraw" class="withdraw-tip">
                        最低提现金额：¥{{ minWithdrawAmount }}
                      </div>
                    </div>
                  </div>
                </el-col>
              </el-row>
            </div>

            <!-- 邀请记录 -->
            <div class="invite-records-section">
              <el-card shadow="never">
                <div class="records-header">
                  <h3>邀请记录</h3>
                  <div class="records-filters">
                    <el-select v-model="inviteFilter.status" placeholder="状态" clearable size="small" style="width: 120px; margin-right: 10px">
                      <el-option label="待验证" value="pending" />
                      <el-option label="已生效" value="active" />
                      <el-option label="已失效" value="invalid" />
                    </el-select>
                    <el-date-picker
                      v-model="inviteFilter.dateRange"
                      type="daterange"
                      range-separator="至"
                      start-placeholder="开始日期"
                      end-placeholder="结束日期"
                      format="YYYY-MM-DD"
                      value-format="YYYY-MM-DD"
                      size="small"
                      style="width: 240px; margin-right: 10px"
                    />
                    <el-button @click="loadInviteRecords" :loading="inviteLoading" size="small">
                      <el-icon><Search /></el-icon>
                      查询
                    </el-button>
                  </div>
                </div>

                <el-table
                  :data="inviteRecords"
                  v-loading="inviteLoading"
                  stripe
                  style="width: 100%"
                >
                  <el-table-column prop="id" label="记录ID" min-width="80" />
                  <el-table-column label="被邀请人" min-width="200">
                    <template #default="{ row }">
                      <div class="invitee-info">
                        <div class="username">{{ row.invitee?.username || row.invitee_username }}</div>
                        <div class="email">{{ row.invitee?.email || row.invitee_email }}</div>
                      </div>
                    </template>
                  </el-table-column>

                  <el-table-column label="注册时间" min-width="150">
                    <template #default="{ row }">
                      {{ formatDate(row.register_time) }}
                    </template>
                  </el-table-column>
                  <el-table-column label="来源" min-width="100">
                    <template #default="{ row }">
                      <span class="source">{{ getSourceLabel(row.source) }}</span>
                    </template>
                  </el-table-column>
                  <el-table-column label="创建时间" min-width="150">
                    <template #default="{ row }">
                      {{ formatDate(row.created_at) }}
                    </template>
                  </el-table-column>
                </el-table>

                <!-- 分页 -->
                <div class="pagination-wrapper">
                  <el-pagination
                    v-model:current-page="invitePage"
                    v-model:page-size="invitePageSize"
                    :total="inviteTotal"
                    :page-sizes="[10, 20, 50]"
                    layout="total, sizes, prev, pager, next, jumper"
                    @size-change="handleInvitePageSizeChange"
                    @current-change="handleInvitePageChange"
                  />
                </div>
              </el-card>
            </div>
          </div>
        </el-tab-pane>

        <!-- 分成记录 -->
        <el-tab-pane label="分成记录" name="commission">
          <div class="tab-content">
            <!-- 筛选器 -->
            <div class="filter-section">
              <div class="filter-left">
                <el-select
                  v-model="commissionFilter.type"
                  placeholder="分成类型"
                  style="width: 120px"
                  clearable
                  @change="loadCommissionRecords"
                >
                  <el-option label="注册分成" value="registration" />
                  <el-option label="购买分成" value="purchase" />
                  <el-option label="订阅分成" value="subscription" />
                </el-select>
                <el-select
                  v-model="commissionFilter.status"
                  placeholder="结算状态"
                  style="width: 120px"
                  clearable
                  @change="loadCommissionRecords"
                >
                  <el-option label="未结算" value="pending" />
                  <el-option label="已结算" value="settled" />
                  <el-option label="已提现" value="withdrawn" />
                </el-select>
                <el-date-picker
                  v-model="commissionFilter.dateRange"
                  type="daterange"
                  range-separator="至"
                  start-placeholder="开始日期"
                  end-placeholder="结束日期"
                  format="YYYY-MM-DD"
                  value-format="YYYY-MM-DD"
                  style="width: 240px"
                  @change="loadCommissionRecords"
                />
              </div>
              <div class="filter-right">
                <el-button @click="resetCommissionFilter" :icon="Refresh">
                  重置
                </el-button>
              </div>
            </div>

            <!-- 分成记录表格 -->
            <el-table
              :data="commissionRecords"
              v-loading="commissionLoading"
              stripe
              style="width: 100%"
            >
              <el-table-column prop="id" label="记录ID" min-width="80" />
              <el-table-column label="邀请码" min-width="120">
                <template #default="{ row }">
                  <span>{{ row.inviteRecord?.invite_code || '-' }}</span>
                </template>
              </el-table-column>
              <el-table-column label="被邀请人" min-width="150">
                <template #default="{ row }">
                  <div class="invitee-info">
                    <div class="username">{{ row.invitee?.username || row.invitee?.nickname || '-' }}</div>
                    <div class="email">{{ row.invitee?.email || '-' }}</div>
                  </div>
                </template>
              </el-table-column>
              <el-table-column label="分成类型" min-width="100">
                <template #default="{ row }">
                  <el-tag :type="getCommissionTypeTag(row.commission_type)" size="small">
                    {{ getCommissionTypeLabel(row.commission_type) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="分成金额" min-width="100">
                <template #default="{ row }">
                  <span class="amount-text">¥{{ formatMoney(row.commission_amount) }}</span>
                </template>
              </el-table-column>
              <el-table-column label="来源金额" min-width="100">
                <template #default="{ row }">
                  <span class="source-amount">¥{{ formatMoney(row.original_amount) }}</span>
                </template>
              </el-table-column>
              <el-table-column label="分成比例" min-width="80">
                <template #default="{ row }">
                  <span class="rate-text">{{ (row.commission_rate * 100).toFixed(1) }}%</span>
                </template>
              </el-table-column>
              <el-table-column label="状态" min-width="100">
                <template #default="{ row }"> 
                   <el-tag :type="getCommissionStatusTag(row.settlement_status)" size="small"> 
                     {{ getCommissionStatusLabel(row.settlement_status) }} 
                   </el-tag> 
                 </template>
              </el-table-column>
              <el-table-column label="创建时间" min-width="150">
                <template #default="{ row }">
                  <span class="date-text">{{ formatDate(row.created_at) }}</span>
                </template>
              </el-table-column>
            </el-table>

            <!-- 分页 -->
            <div class="pagination-wrapper">
              <el-pagination
                v-model:current-page="commissionPagination.current_page"
                v-model:page-size="commissionPagination.per_page"
                :total="commissionPagination.total_count"
                :page-sizes="[10, 20, 50]"
                layout="total, sizes, prev, pager, next, jumper"
                @size-change="handleCommissionSizeChange"
                @current-change="handleCommissionCurrentChange"
              />
            </div>

            <!-- 批量提现操作 -->
            <div v-if="selectedCommissions.length > 0" class="batch-actions">
              <el-card shadow="never">
                <div class="batch-content">
                  <div class="batch-info">
                    <span>已选择 {{ selectedCommissions.length }} 条记录</span>
                    <span class="total-amount">总金额: ¥{{ selectedTotalAmount }}</span>
                  </div>
                  <div class="batch-buttons">
                    <el-button @click="clearSelection">清空选择</el-button>
                    <el-button
                      type="primary"
                      @click="batchWithdraw"
                      :disabled="!canBatchWithdraw"
                    >
                      批量提现
                    </el-button>
                  </div>
                </div>
              </el-card>
            </div>
          </div>
        </el-tab-pane>

        <!-- 提现记录 -->
        <el-tab-pane label="提现记录" name="withdrawal">
          <div class="tab-content">
            <!-- 筛选器 -->
            <div class="filter-section">
              <div class="filter-left">
                <el-select
                  v-model="withdrawalFilter.status"
                  placeholder="提现状态"
                  style="width: 120px"
                  clearable
                  @change="loadWithdrawalRecords"
                >
                  <el-option label="待审核" value="pending" />
                  <el-option label="已批准" value="approved" />
                  <el-option label="已拒绝" value="rejected" />
                  <el-option label="已完成" value="completed" />
                  <el-option label="失败" value="failed" />
                </el-select>
                <el-date-picker
                  v-model="withdrawalFilter.dateRange"
                  type="daterange"
                  range-separator="至"
                  start-placeholder="开始日期"
                  end-placeholder="结束日期"
                  format="YYYY-MM-DD"
                  value-format="YYYY-MM-DD"
                  style="width: 240px"
                  @change="loadWithdrawalRecords"
                />
              </div>
              <div class="filter-right">
                <el-button @click="resetWithdrawalFilter" :icon="Refresh">
                  重置
                </el-button>
              </div>
            </div>

            <!-- 提现记录表格 -->
            <el-table
              :data="withdrawalRecords"
              v-loading="withdrawalLoading"
              stripe
              style="width: 100%"
            >
              <el-table-column prop="id" label="工单ID" width="80" />
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
                    <div class="account-info">{{ maskAccount(row.withdrawal_account) }}</div>
                  </div>
                </template>
              </el-table-column>
              <el-table-column label="状态" width="100" align="center">
                <template #default="{ row }">
                  <el-tag :type="getStatusTagType(row.status)" size="small">
                    {{ getStatusLabel(row.status) }}
                  </el-tag>
                </template>
              </el-table-column>

              <!-- 打款账号 -->
              <el-table-column label="打款账号" width="150" align="center">
                <template #default="{ row }">
                  <el-tag :type="getStatusTagType(row.transaction_id)" size="small">
                    {{ getStatusLabel(row.transaction_id) || '-' }}
                  </el-tag>
                </template>
              </el-table-column>

              <el-table-column label="申请时间" width="150">
                <template #default="{ row }">
                  {{ formatDate(row.created_at) }}
                </template>
              </el-table-column>
              <el-table-column label="处理时间" width="150">
                <template #default="{ row }">
                  {{ row.processed_at ? formatDate(row.processed_at) : '未处理' }}
                </template>
              </el-table-column>
              <el-table-column label="备注" min-width="150">
                <template #default="{ row }">
                  <div class="notes-section">
                    <div v-if="row.withdrawal_notes" class="user-notes">
                      <span class="notes-label">我的备注:</span>
                      <span class="notes-text">{{ row.withdrawal_notes }}</span>
                    </div>
                    <div v-if="row.admin_notes" class="admin-notes">
                      <span class="notes-label">管理员备注:</span>
                      <span class="notes-text">{{ row.admin_notes }}</span>
                    </div>
                    <span v-if="!row.withdrawal_notes && !row.admin_notes" class="text-muted">无备注</span>
                  </div>
                </template>
              </el-table-column>
            </el-table>

            <!-- 分页 -->
            <div class="pagination-wrapper">
              <el-pagination
                v-model:current-page="withdrawalPagination.current_page"
                v-model:page-size="withdrawalPagination.per_page"
                :total="withdrawalPagination.total"
                :page-sizes="[10, 20, 50]"
                layout="total, sizes, prev, pager, next, jumper"
                @size-change="handleWithdrawalSizeChange"
                @current-change="handleWithdrawalCurrentChange"
              />
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 提现申请对话框 -->
    <el-dialog
      v-model="withdrawDialogVisible"
      title="申请提现"
      width="1000px"
      :close-on-click-modal="false"
      class="withdraw-dialog"
    >
      <div class="withdraw-dialog-content">
        <!-- 左侧：提现信息表单 -->
        <div class="withdraw-left-panel">
          <div class="panel-section">
            <div class="section-title">
              <el-icon><CreditCard /></el-icon>
              <span>提现信息</span>
            </div>
            <el-form
              ref="withdrawFormRef"
              :model="withdrawForm"
              :rules="withdrawFormRules"
              label-width="100px"
              class="withdraw-form"
            >
              <el-form-item label="提现方式" prop="withdrawal_method">
                <el-radio-group v-model="withdrawForm.withdrawal_method" class="payment-methods">
                  <el-radio-button label="alipay">
                    <div class="payment-option">
                      <span class="payment-icon">💰</span>
                      <span>支付宝</span>
                    </div>
                  </el-radio-button>
                  <el-radio-button label="wechat">
                    <div class="payment-option">
                      <span class="payment-icon">💚</span>
                      <span>微信</span>
                    </div>
                  </el-radio-button>
                </el-radio-group>
              </el-form-item>
              
              <el-form-item label="账户姓名" prop="account_name">
                <el-input
                  v-model="withdrawForm.account_name"
                  placeholder="请输入账户持有人姓名"
                  size="large"
                />
              </el-form-item>
              
              <el-form-item label="提现账户" prop="withdrawal_account">
                <el-input
                  v-model="withdrawForm.withdrawal_account"
                  :placeholder="getAccountPlaceholder(withdrawForm.withdrawal_method)"
                  size="large"
                />
              </el-form-item>
              
              <el-form-item label="备注" prop="user_notes">
                <el-input
                  v-model="withdrawForm.user_notes"
                  type="textarea"
                  :rows="3"
                  placeholder="请输入备注信息（可选）"
                  resize="none"
                />
              </el-form-item>
            </el-form>
          </div>

          <!-- 提现汇总 -->
          <div class="panel-section" v-if="selectedWithdrawCommissions.length > 0">
            <div class="section-title">
              <el-icon><Money /></el-icon>
              <span>提现汇总</span>
            </div>
            <div class="withdraw-summary">
              <div class="summary-grid">
                <div class="summary-card">
                  <div class="summary-label">选中记录</div>
                  <div class="summary-value count">{{ selectedWithdrawCommissions.length }} 条</div>
                </div>
                <div class="summary-card highlight">
                  <div class="summary-label">提现金额</div>
                  <div class="summary-value total">¥{{ formatMoney(selectedWithdrawTotalAmount) }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧：分成记录选择 -->
        <div class="withdraw-right-panel">
          <div class="panel-section">
            <div class="section-title">
              <el-icon><Coin /></el-icon>
              <span>选择分成记录</span>
            </div>
            
            <!-- 筛选器 -->
            <div class="commission-filters">
              <el-select 
                v-model="withdrawCommissionFilter.type" 
                placeholder="分成类型" 
                clearable 
                size="default"
                style="width: 130px;"
              >
                <el-option label="注册分成" value="registration" />
                <el-option label="购买分成" value="purchase" />
                <el-option label="订阅分成" value="subscription" />
              </el-select>
              <el-date-picker
                v-model="withdrawCommissionFilter.dateRange"
                type="daterange"
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                size="default"
                style="width: 260px;"
              />
              <el-button 
                @click="loadWithdrawableCommissions" 
                :loading="withdrawCommissionLoading" 
                size="default"
                type="primary"
                plain
              >
                <el-icon><Refresh /></el-icon>
                刷新
              </el-button>
            </div>

            <!-- 分成记录表格 -->
            <div class="commission-table-container">
              <el-table
                ref="withdrawCommissionTableRef"
                :data="withdrawableCommissions"
                @selection-change="handleWithdrawCommissionSelect"
                stripe
                style="width: 100%"
                max-height="320px"
                class="commission-table"
              >
                <el-table-column type="selection" width="50" :selectable="isCommissionSelectable" />
                <el-table-column prop="id" label="ID" min-width="60" />
                <el-table-column label="邀请码" min-width="100">
                  <template #default="{ row }">
                    <span>{{ row.inviteRecord?.invite_code || '-' }}</span>
                  </template>
                </el-table-column>
                <el-table-column label="类型" min-width="90">
                  <template #default="{ row }">
                    <el-tag :type="getCommissionTypeTag(row.commission_type)" size="small">
                      {{ getCommissionTypeLabel(row.commission_type) }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="commission_amount" label="分成金额" min-width="90">
                  <template #default="{ row }">
                    <span class="amount-text">¥{{ formatMoney(row.commission_amount) }}</span>
                  </template>
                </el-table-column>
                <el-table-column prop="source_amount" label="来源金额" min-width="90">
                  <template #default="{ row }">
                    <span class="source-amount">¥{{ formatMoney(row.source_amount) }}</span>
                  </template>
                </el-table-column>
                <el-table-column prop="commission_rate" label="比例" min-width="60">
                  <template #default="{ row }">
                    <span class="rate-text">{{ (row.commission_rate * 100).toFixed(1) }}%</span>
                  </template>
                </el-table-column>
                <el-table-column prop="created_at" label="创建时间" min-width="120">
                  <template #default="{ row }">
                    <span class="date-text">{{ formatDate(row.created_at) }}</span>
                  </template>
                </el-table-column>
              </el-table>

              <!-- 分页 -->
              <div class="commission-pagination">
                <el-pagination
                  v-model:current-page="withdrawCommissionPagination.current_page"
                  v-model:page-size="withdrawCommissionPagination.per_page"
                  :total="withdrawCommissionPagination.total"
                  :page-sizes="[10, 20, 50]"
                  layout="total, sizes, prev, pager, next"
                  size="small"
                  @size-change="handleWithdrawCommissionSizeChange"
                  @current-change="handleWithdrawCommissionCurrentChange"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="withdraw-dialog-footer">
          <el-button size="large" @click="withdrawDialogVisible = false">取消</el-button>
          <el-button
            type="primary"
            size="large"
            @click="submitWithdraw"
            :loading="submitting"
            :disabled="!canSubmitWithdraw"
            class="submit-btn"
          >
            <el-icon><Check /></el-icon>
            确认申请（¥{{ formatMoney(selectedWithdrawTotalAmount) }}）
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Money,
  Refresh,
  Wallet,
  CreditCard,
  Coin,
  Clock,
  CopyDocument,
  UserFilled,
  Check,
  Calendar,
  Search
} from '@element-plus/icons-vue'
import { distributionAPI, invitationAPI } from '@/api'
import api from '@/api'

// 响应式数据
const loading = ref(false)
const commissionLoading = ref(false)
const withdrawalLoading = ref(false)
const withdrawCommissionLoading = ref(false)
const inviteLoading = ref(false)
const submitting = ref(false)
const activeTab = ref('invite')
const withdrawDialogVisible = ref(false)
const withdrawFormRef = ref()
const withdrawCommissionTableRef = ref()
const selectedCommissions = ref([])
const selectedWithdrawCommissions = ref([])
// 最低提现金额从接口获取
const minWithdrawAmount = computed(() => {
  return accountInfo.value.min_withdrawal_amount || 10
})

// 邀请管理相关数据
const myInviteCode = ref('')
const inviteLink = ref('')
const inviteStats = ref({
  total_invites: 0,
  valid_invites: 0,
  total_commission: 0,
  this_month_invites: 0
})
const inviteRecords = ref([])
const invitePage = ref(1)
const invitePageSize = ref(20)
const inviteTotal = ref(0)

// 数据
const accountInfo = ref({})
const commissionRecords = ref([])
const withdrawalRecords = ref([])
const withdrawableCommissions = ref([])

const commissionPagination = reactive({
  current_page: 1,
  per_page: 20,
  total_count: 0
})

const withdrawalPagination = reactive({
  current_page: 1,
  per_page: 20,
  total_count: 0
})

const withdrawCommissionPagination = reactive({
  current_page: 1,
  per_page: 10,
  total_count: 0
})

// 筛选器
const commissionFilter = reactive({
  type: '',
  status: '',
  dateRange: []
})

const withdrawalFilter = reactive({
  status: '',
  dateRange: []
})

const withdrawCommissionFilter = reactive({
  type: '',
  dateRange: []
})

// 邀请筛选器
const inviteFilter = reactive({
  status: '',
  dateRange: []
})

// 提现表单
const withdrawForm = reactive({
  withdrawal_method: 'alipay',
  withdrawal_account: '',
  account_name: '',
  user_notes: '',
  amount: 0,
  commission_record_ids: []
})

// 表单验证规则
const withdrawFormRules = {
  withdrawal_method: [
    { required: true, message: '请选择提现方式', trigger: 'change' }
  ],
  withdrawal_account: [
    { required: true, message: '请输入提现账户', trigger: 'blur' }
  ],
  account_name: [
    { required: true, message: '请输入账户姓名', trigger: 'blur' }
  ]
}

// 计算属性
const canWithdraw = computed(() => {
  return accountInfo.value.available_amount >= minWithdrawAmount.value
})

const selectedWithdrawTotalAmount = computed(() => {
  return selectedWithdrawCommissions.value.reduce((total, record) => {
    return total + parseFloat(record.commission_amount || 0)
  }, 0)
})

const canSubmitWithdraw = computed(() => {
  return selectedWithdrawCommissions.value.length > 0 && 
         withdrawForm.withdrawal_method && 
         withdrawForm.withdrawal_account && 
         withdrawForm.account_name &&
         selectedWithdrawTotalAmount.value >= minWithdrawAmount.value
})

const selectedTotalAmount = computed(() => {
  const selectedRecords = commissionRecords.value.filter(record => 
    selectedCommissions.value.includes(record.id)
  )
  const total = selectedRecords.reduce((sum, record) => sum + parseFloat(record.commission_amount), 0)
  return formatMoney(total)
})

const canBatchWithdraw = computed(() => {
  const total = parseFloat(selectedTotalAmount.value)
  return selectedCommissions.value.length > 0 && total >= minWithdrawAmount.value
})

// 方法
const loadAccountInfo = async () => {
  try {
    const response = await distributionAPI.account.getMyAccount()
    console.log('分销账户API响应:', response)
    if (response.success) {
      accountInfo.value = response.data || {}
      console.log('分销账户数据:', accountInfo.value)
      console.log('累计佣金数据:', accountInfo.value.total_commission)
    }
  } catch (error) {
    console.error('加载账户信息失败:', error)
    ElMessage.error('加载账户信息失败')
  }
}

// 邀请管理相关方法

// 加载邀请数据
const loadInviteData = async () => {
  await Promise.all([
    loadMyInviteCode(),
    loadInviteRecords(),
    loadAccountInfo()
  ])
}

// 获取我的邀请码和统计信息
const loadMyInviteCode = async () => {
  inviteLoading.value = true
  try {
    const response = await api.get('/invite-records/my-invite-code')
    console.log('邀请码API响应:', response.data)
    
    if (response.data && response.data.invite_code) {
      const apiData = response.data
      
      // 设置邀请码
      myInviteCode.value = apiData.invite_code || ''
      
      // 生成邀请链接
      if (myInviteCode.value) {
        inviteLink.value = `${window.location.origin}/register?invite_code=${myInviteCode.value}`
      }
      
      // 设置统计数据
      if (apiData.stats) {
        inviteStats.value = {
          total_invites: apiData.stats.total_invites || 0,
          valid_invites: apiData.stats.successful_invites || 0,
          total_commission: apiData.stats.total_commission || 0,
          this_month_invites: apiData.stats.this_month_invites || 0
        }
        console.log('API返回的统计数据:', apiData.stats)
        console.log('累计佣金原始值:', apiData.stats.total_commission)
      } else {
        console.log('API未返回统计数据')
      }
      
      console.log('解析后的邀请码:', myInviteCode.value)
      console.log('解析后的邀请链接:', inviteLink.value)
      console.log('解析后的统计数据:', inviteStats.value)
    } else {
      console.error('API返回格式错误:', response.data)
      ElMessage.error('获取邀请码失败：数据格式错误')
    }
  } catch (error) {
    console.error('获取邀请码失败:', error)
    ElMessage.error('获取邀请码失败')
  } finally {
    inviteLoading.value = false
  }
}

// 获取邀请记录
const loadInviteRecords = async () => {
  inviteLoading.value = true
  try {
    const params = {
      page: invitePage.value,
      limit: invitePageSize.value
    }
    
    // 添加筛选条件
    if (inviteFilter.status) {
      params.status = inviteFilter.status
    }
    if (inviteFilter.dateRange && inviteFilter.dateRange.length === 2) {
      params.start_date = inviteFilter.dateRange[0]
      params.end_date = inviteFilter.dateRange[1]
    }
    
    const response = await api.get('/invite-records/my-records', { params })
    console.log('邀请记录API响应:', response.data)
    
    if (response.data) {
      let recordsData = response.data.data || response.data
      let records = []
      let total = 0
      
      // 处理不同的数据结构
      if (Array.isArray(recordsData)) {
        records = recordsData
        total = recordsData.length
      } else if (recordsData.inviteRecords) {
        records = recordsData.inviteRecords
        total = recordsData.pagination?.total || recordsData.total || records.length
      } else if (recordsData.records) {
        records = recordsData.records
        total = recordsData.total || records.length
      } else {
        records = []
        total = 0
      }
      
      inviteRecords.value = records.map(record => ({
        id: record.id,
        invite_code: record.invite_code || record.code || '-',
        invitee_username: record.invitee?.username || record.invitee_username || record.username || '-',
        invitee_email: record.invitee?.email || record.invitee_email || record.email || '-',
        status: record.status || 'pending',
        commission_rate: parseFloat(record.commission_rate || 0),
        created_at: record.created_at || record.invite_time,
        register_time: record.register_time || record.registered_at,
        source: record.source || 'web'
      }))
      
      inviteTotal.value = total
    } else {
      inviteRecords.value = []
      inviteTotal.value = 0
    }
  } catch (error) {
    console.error('获取邀请记录失败:', error)
    ElMessage.error('获取邀请记录失败')
    inviteRecords.value = []
    inviteTotal.value = 0
  } finally {
    inviteLoading.value = false
  }
}

// 复制邀请码
const copyInviteCode = async () => {
  if (!myInviteCode.value) {
    ElMessage.warning('邀请码为空，无法复制')
    return
  }
  
  try {
    await navigator.clipboard.writeText(myInviteCode.value)
    ElMessage.success('邀请码复制成功')
  } catch (error) {
    console.error('复制失败:', error)
    ElMessage.error('复制失败，请手动复制')
  }
}

// 复制邀请链接
const copyInviteLink = async () => {
  if (!inviteLink.value) {
    ElMessage.warning('邀请链接为空，无法复制')
    return
  }
  
  try {
    await navigator.clipboard.writeText(inviteLink.value)
    ElMessage.success('邀请链接复制成功')
  } catch (error) {
    console.error('复制失败:', error)
    ElMessage.error('复制失败，请手动复制')
  }
}

// 刷新邀请码
const refreshInviteCode = async () => {
  try {
    const response = await api.post('/invite-records/refresh-invite-code')
    if (response.data && response.data.invite_code) {
      myInviteCode.value = response.data.invite_code
      inviteLink.value = `${window.location.origin}/register?invite_code=${myInviteCode.value}`
      ElMessage.success('邀请码刷新成功')
    } else {
      await loadMyInviteCode()
    }
  } catch (error) {
    console.error('刷新邀请码失败:', error)
    ElMessage.error('刷新邀请码失败')
  }
}

// 获取邀请状态类型
const getInviteStatusType = (status) => {
  const statusMap = {
    'pending': 'warning',
    'registered': 'primary',
    'activated': 'success',
    'active': 'success',
    'expired': 'danger',
    'invalid': 'danger'
  }
  return statusMap[status] || 'info'
}

// 获取邀请状态文本
const getInviteStatusText = (status) => {
  const statusMap = {
    'pending': '待验证',
    'active': '已生效',
    'invalid': '已失效'
  }
  return statusMap[status] || '未知'
}

// 获取来源标签
const getSourceLabel = (source) => {
  const sourceMap = {
    'web': '网页',
    'mobile': '手机',
    'api': 'API',
    'user_invite_code': '邀请码',
    'admin_invite': '管理员邀请',
    'other': '其他'
  }
  return sourceMap[source] || source || '未知'
}

// 邀请记录分页处理
const handleInvitePageSizeChange = (size) => {
  invitePageSize.value = size
  invitePage.value = 1
  loadInviteRecords()
}

const handleInvitePageChange = (page) => {
  invitePage.value = page
  loadInviteRecords()
}



const loadCommissionRecords = async () => {
  try {
    commissionLoading.value = true
    const params = {
      page: commissionPagination.current_page,
      limit: commissionPagination.per_page,
      commission_type: commissionFilter.type,
      settlement_status: commissionFilter.status
    }
    
    if (commissionFilter.dateRange && commissionFilter.dateRange.length === 2) {
      params.start_date = commissionFilter.dateRange[0]
      params.end_date = commissionFilter.dateRange[1]
    }
    
    const response = await distributionAPI.commissionRecord.getMyRecords(params)
    
    if (response.success) {
      commissionRecords.value = response.data.commissionRecords || []
      Object.assign(commissionPagination, response.data.pagination || {})
    }
  } catch (error) {
    console.error('加载分成记录失败:', error)
    ElMessage.error('加载分成记录失败')
  } finally {
    commissionLoading.value = false
  }
}

const loadWithdrawalRecords = async () => {
  try {
    withdrawalLoading.value = true
    const params = {
      page: withdrawalPagination.current_page,
      limit: withdrawalPagination.per_page,
      status: withdrawalFilter.status
    }
    
    if (withdrawalFilter.dateRange && withdrawalFilter.dateRange.length === 2) {
      params.start_date = withdrawalFilter.dateRange[0]
      params.end_date = withdrawalFilter.dateRange[1]
    }
    
    const response = await distributionAPI.withdrawal.getMyRequests(params)
    
    if (response.success) {
        withdrawalRecords.value = response.data.list || []
        const pagination = response.data.pagination || {}
        withdrawalPagination.current_page = pagination.page || 1
        withdrawalPagination.per_page = pagination.limit || 10
        withdrawalPagination.total = pagination.total || 0
      }
  } catch (error) {
    console.error('加载提现记录失败:', error)
    ElMessage.error('加载提现记录失败')
  } finally {
    withdrawalLoading.value = false
  }
}

const refreshData = () => {
  loadAccountInfo()
  if (activeTab.value === 'invite') {
    loadInviteData()
  } else if (activeTab.value === 'commission') {
    loadCommissionRecords()
  } else {
    loadWithdrawalRecords()
  }
}

const handleTabChange = (tabName) => {
  if (tabName === 'invite') {
    loadInviteData()
  } else if (tabName === 'commission') {
    loadCommissionRecords()
  } else {
    loadWithdrawalRecords()
  }
}

const resetCommissionFilter = () => {
  commissionFilter.type = ''
  commissionFilter.status = ''
  commissionFilter.dateRange = []
  commissionPagination.current_page = 1
  loadCommissionRecords()
}

const resetWithdrawalFilter = () => {
  withdrawalFilter.status = ''
  withdrawalFilter.dateRange = []
  withdrawalPagination.current_page = 1
  loadWithdrawalRecords()
}

const handleCommissionSizeChange = (size) => {
  commissionPagination.per_page = size
  commissionPagination.current_page = 1
  loadCommissionRecords()
}

const handleCommissionCurrentChange = (page) => {
  commissionPagination.current_page = page
  loadCommissionRecords()
}

const handleWithdrawalSizeChange = (size) => {
  withdrawalPagination.per_page = size
  withdrawalPagination.current_page = 1
  loadWithdrawalRecords()
}

const handleWithdrawalCurrentChange = (page) => {
  withdrawalPagination.current_page = page
  loadWithdrawalRecords()
}

const handleCommissionSelect = () => {
  // 选择变化时的处理
}

const clearSelection = () => {
  selectedCommissions.value = []
}

const openWithdrawDialog = () => {
  resetWithdrawForm()
  resetWithdrawCommissionData()
  loadWithdrawableCommissions()
  withdrawDialogVisible.value = true
}

const resetWithdrawCommissionData = () => {
  selectedWithdrawCommissions.value = []
  withdrawableCommissions.value = []
  withdrawCommissionPagination.current_page = 1
  withdrawCommissionPagination.total_count = 0
  withdrawCommissionFilter.type = ''
  withdrawCommissionFilter.dateRange = []
}

const loadWithdrawableCommissions = async () => {
  try {
    withdrawCommissionLoading.value = true
    const params = {
      page: withdrawCommissionPagination.current_page,
      limit: withdrawCommissionPagination.per_page,
      settlement_status: 'unsettled' // 只加载未结算的分成记录
    }
    
    if (withdrawCommissionFilter.type) {
      params.commission_type = withdrawCommissionFilter.type
    }
    
    if (withdrawCommissionFilter.dateRange && withdrawCommissionFilter.dateRange.length === 2) {
      params.start_date = withdrawCommissionFilter.dateRange[0]
      params.end_date = withdrawCommissionFilter.dateRange[1]
    }
    
    const response = await distributionAPI.commissionRecord.getMyRecords(params)
    withdrawableCommissions.value = response.data.commissionRecords || []
    const pagination = response.data.pagination || {}
    withdrawCommissionPagination.current_page = pagination.page || 1
    withdrawCommissionPagination.per_page = pagination.limit || 10
    withdrawCommissionPagination.total = pagination.total || 0
  } catch (error) {
    console.error('加载可提现分成记录失败:', error)
    ElMessage.error('加载可提现分成记录失败')
  } finally {
    withdrawCommissionLoading.value = false
  }
}

const handleWithdrawCommissionSelect = (selection) => {
  selectedWithdrawCommissions.value = selection
  withdrawForm.commission_record_ids = selection.map(record => record.id)
}

const isCommissionSelectable = (row) => {
  return row.settlement_status === 'unsettled'
}

const handleWithdrawCommissionSizeChange = (size) => {
  withdrawCommissionPagination.per_page = size
  withdrawCommissionPagination.current_page = 1
  loadWithdrawableCommissions()
}

const handleWithdrawCommissionCurrentChange = (page) => {
  withdrawCommissionPagination.current_page = page
  loadWithdrawableCommissions()
}

const batchWithdraw = () => {
  if (selectedCommissions.value.length === 0) {
    ElMessage.warning('请选择要提现的分成记录')
    return
  }
  
  const total = parseFloat(selectedTotalAmount.value)
  if (total < minWithdrawAmount.value) {
    ElMessage.warning(`选择的分成总金额不能少于${minWithdrawAmount.value}元`)
    return
  }
  
  withdrawForm.amount = selectedTotalAmount.value
  withdrawForm.commission_record_ids = [...selectedCommissions.value]
  withdrawDialogVisible.value = true
}

const resetWithdrawForm = () => {
  withdrawForm.withdrawal_method = 'alipay'
  withdrawForm.withdrawal_account = ''
  withdrawForm.account_name = ''
  withdrawForm.user_notes = ''
  withdrawForm.commission_record_ids = []
}



const submitWithdraw = async () => {
  try {
    if (selectedWithdrawCommissions.value.length === 0) {
      ElMessage.warning('请选择要提现的分成记录')
      return
    }
    
    if (selectedWithdrawTotalAmount.value < minWithdrawAmount.value) {
      ElMessage.warning(`提现金额不能少于${minWithdrawAmount.value}元`)
      return
    }
    
    await withdrawFormRef.value.validate()
    submitting.value = true
    
    const data = {
      commission_record_ids: withdrawForm.commission_record_ids,
      withdrawal_method: withdrawForm.withdrawal_method,
      withdrawal_account: withdrawForm.withdrawal_account,
      account_name: withdrawForm.account_name,
      user_notes: withdrawForm.user_notes
    }
    
    await distributionAPI.withdrawal.createRequest(data)
    ElMessage.success('提现申请提交成功')
    
    withdrawDialogVisible.value = false
    selectedWithdrawCommissions.value = []
    selectedCommissions.value = []
    refreshData()
  } catch (error) {
    console.error('提现申请失败:', error)
    ElMessage.error('提现申请失败')
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

const maskAccount = (account) => {
  if (!account) return ''
  if (account.length <= 8) return account
  return account.substring(0, 4) + '****' + account.substring(account.length - 4)
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
    subscription: '订阅分成',
    activation: '激活分成'
  }
  return typeMap[type] || type
}

const getCommissionStatusTag = (status) => {
  const statusMap = {
    unsettled: 'warning',
    settled: 'success', 
    cancelled: 'danger',
    pending: 'warning'
  }
  return statusMap[status] || 'info'
}

const getCommissionStatusLabel = (status) => {
  const statusMap = {
    unsettled: '待结算',
    settled: '已结算',
    cancelled: '已取消',
    pending: '待结算'
  }
  return statusMap[status] || status
}

const getSettlementStatusTag = (status) => {
  const statusMap = {
    pending: 'warning',
    settled: 'success',
    withdrawn: 'info'
  }
  return statusMap[status] || 'info'
}

const getSettlementStatusLabel = (status) => {
  const statusMap = {
    pending: '未结算',
    settled: '已结算',
    withdrawn: '已提现'
  }
  return statusMap[status] || status
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
    wechat: 'success'
  }
  return methodMap[method] || 'info'
}

const getMethodLabel = (method) => {
  const methodMap = {
    alipay: '支付宝',
    wechat: '微信'
  }
  return methodMap[method] || method
}

const getAccountPlaceholder = (method) => {
  const placeholderMap = {
    alipay: '请输入支付宝账号',
    wechat: '请输入微信号'
  }
  return placeholderMap[method] || '请输入账户信息'
}

const getInviteStatusTag = (status) => {
  const statusMap = {
    pending: 'warning',
    registered: 'success',
    activated: 'primary',
    expired: 'danger'
  }
  return statusMap[status] || 'info'
}

const getInviteStatusLabel = (status) => {
  const statusMap = {
    pending: '待注册',
    registered: '已注册',
    activated: '已激活',
    expired: '已过期'
  }
  return statusMap[status] || status
}



// 生命周期
onMounted(() => {
  loadInviteData()
})
</script>

<style scoped>
.distribution-center {
  padding: 24px;
  background-color: #fafbfc;
  min-height: 100vh;
}

/* 标签页卡片 */
.tabs-card {
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: 1px solid #f0f0f0;
  overflow: hidden;
}

.tab-content {
  padding: 24px;
}

/* 邀请码管理区域 */
.invite-code-section {
  margin-bottom: 24px;
}

.invite-card {
  background: #ffffff;
  border-radius: 8px;
  border: 1px solid #f0f0f0;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.02);
}

.invite-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #f5f5f5;
}

.invite-header h3 {
  margin: 0;
  color: #1f2937;
  font-size: 16px;
  font-weight: 600;
}

.invite-content {
  padding: 24px;
}

.invite-code-display {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.code-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.code-item label {
  min-width: 80px;
  color: #6b7280;
  font-size: 14px;
  font-weight: 500;
}

.code-value {
  flex: 1;
}

/* 邀请统计区域 */
.invite-stats-section {
  margin-bottom: 24px;
}

.stats-card {
  background: #ffffff;
  border-radius: 8px;
  border: 1px solid #f0f0f0;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.02);
  transition: all 0.2s ease;
}

.stats-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
}

.stats-content {
  display: flex;
  align-items: center;
  padding: 20px;
}

.stats-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  font-size: 20px;
  background: #f8fafc;
  color: #6366f1;
}

.stats-info {
  flex: 1;
}

.stats-number {
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 4px;
  line-height: 1;
}

.stats-label {
  color: #6b7280;
  font-size: 13px;
  font-weight: 500;
}

.stats-rate {
  color: #059669;
  font-size: 12px;
  font-weight: 600;
  margin-top: 2px;
}

/* 邀请记录区域 */
.invite-records-section {
  background: #ffffff;
  border-radius: 8px;
  border: 1px solid #f0f0f0;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.02);
}

.records-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #f5f5f5;
}

.records-header h3 {
  margin: 0;
  color: #1f2937;
  font-size: 16px;
  font-weight: 600;
}

.records-filters {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 筛选区域样式 */
.filter-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 20px;
  background: #ffffff;
  border-radius: 8px;
  border: 1px solid #f0f0f0;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.02);
}

.filter-left {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.filter-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 筛选器组件样式优化 */
.filter-section .el-select {
  min-width: 140px;
}

.filter-section .el-date-picker {
  min-width: 260px;
}

.filter-section .el-button {
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.filter-section .el-button--default {
  background: #f8fafc;
  border-color: #e2e8f0;
  color: #475569;
}

.filter-section .el-button--default:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
  color: #334155;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* 筛选区域响应式设计 */
@media (max-width: 768px) {
  .filter-section {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
    padding: 16px;
  }
  
  .filter-left {
    justify-content: flex-start;
    gap: 12px;
  }
  
  .filter-right {
    justify-content: flex-end;
  }
  
  .filter-section .el-select,
  .filter-section .el-date-picker {
    min-width: auto;
    flex: 1;
  }
}

@media (max-width: 480px) {
  .filter-left {
    flex-direction: column;
    align-items: stretch;
  }
  
  .filter-section .el-select,
  .filter-section .el-date-picker {
    width: 100%;
  }
}

/* 表格相关样式 */
.invitee-info {
  line-height: 1.4;
}

.username {
  font-weight: 600;
  color: #1f2937;
  font-size: 14px;
}

.email {
  color: #6b7280;
  font-size: 12px;
  margin-top: 2px;
}

.user-id {
  color: #9ca3af;
  font-size: 12px;
}

.amount {
  font-weight: 600;
  color: #059669;
}

.rate {
  color: #059669;
  font-weight: 600;
}

.order-id {
  color: #6b7280;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
  font-size: 12px;
}

.source {
  color: #6b7280;
  font-size: 13px;
}

.text-muted {
  color: #d1d5db;
}

/* 分页样式 */
.pagination-wrapper {
  margin-top: 24px;
  padding: 20px 0;
  display: flex;
  justify-content: center;
  border-top: 1px solid #f3f4f6;
}

/* 批量操作样式 */
.batch-actions {
  margin-top: 24px;
  background: #ffffff;
  border-radius: 8px;
  border: 1px solid #f0f0f0;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.02);
}

.batch-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
}

.batch-info {
  display: flex;
  gap: 24px;
  align-items: center;
}

.total-amount {
  color: #059669;
  font-weight: 600;
  font-size: 16px;
}

.batch-buttons {
  display: flex;
  gap: 12px;
}

/* 金额信息样式 */
.amount-info {
  text-align: center;
  line-height: 1.4;
  padding: 12px;
  background: #f8fafc;
  border-radius: 6px;
}

.total-amount {
  font-weight: 600;
  color: #1f2937;
  font-size: 16px;
}

.fee-info {
  color: #f59e0b;
  font-size: 12px;
  margin-top: 4px;
}

.actual-amount {
  color: #059669;
  font-size: 14px;
  font-weight: 600;
  margin-top: 4px;
}

/* 提现方法样式 */
.withdrawal-method {
  text-align: center;
  line-height: 1.4;
  padding: 8px;
}

.account-info {
  color: #6b7280;
  font-size: 12px;
  margin-top: 4px;
  word-break: break-all;
  background: #f9fafb;
  padding: 4px 8px;
  border-radius: 4px;
}

/* 备注样式 */
.notes-section {
  line-height: 1.4;
  padding: 8px;
}

.user-notes,
.admin-notes {
  margin-bottom: 6px;
  padding: 6px 8px;
  background: #f9fafb;
  border-radius: 4px;
  border-left: 3px solid #e5e7eb;
}

.notes-label {
  color: #6b7280;
  font-size: 12px;
  margin-right: 6px;
  font-weight: 500;
}

.notes-text {
  color: #374151;
  font-size: 13px;
}

/* 提现对话框样式 */
.withdraw-content {
  padding: 16px 0;
}

.account-summary {
  background: #f8fafc;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 24px;
  border: 1px solid #e2e8f0;
}

.account-summary h4 {
  margin: 0 0 16px 0;
  color: #1f2937;
  font-size: 16px;
  font-weight: 600;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding: 8px 0;
}

.summary-item label {
  color: #6b7280;
  font-size: 14px;
  font-weight: 500;
}

.summary-item .amount {
  font-weight: 600;
  font-size: 15px;
}

.summary-item .amount.available {
  color: #059669;
}

.summary-item .amount.min {
  color: #f59e0b;
}

.fee-info {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  color: #6b7280;
  font-size: 12px;
}

/* 提现弹窗样式重构 */
.withdraw-dialog {
  --el-dialog-border-radius: 12px;
}

.withdraw-dialog .el-dialog__header {
  padding: 20px 24px 16px;
  border-bottom: 1px solid #f0f0f0;
  background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
}

.withdraw-dialog .el-dialog__title {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

.withdraw-dialog .el-dialog__body {
  padding: 0;
}

.withdraw-dialog-content {
  display: flex;
  gap: 24px;
  padding: 24px;
  min-height: 500px;
}

/* 左侧面板 */
.withdraw-left-panel {
  flex: 1;
  min-width: 400px;
}

/* 右侧面板 */
.withdraw-right-panel {
  flex: 1.2;
  min-width: 500px;
}

/* 面板区块 */
.panel-section {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  margin-bottom: 20px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.panel-section:last-child {
  margin-bottom: 0;
}

/* 区块标题 */
.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 20px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-bottom: 1px solid #e2e8f0;
  font-size: 16px;
  font-weight: 600;
  color: #334155;
}

.section-title .el-icon {
  font-size: 18px;
  color: #3b82f6;
}

/* 提现表单 */
.withdraw-form {
  padding: 24px;
}

.withdraw-form .el-form-item {
  margin-bottom: 24px;
}

.withdraw-form .el-form-item__label {
  font-weight: 500;
  color: #374151;
}

/* 支付方式选择 */
.payment-methods {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.payment-methods .el-radio-button {
  margin: 0;
}

.payment-methods .el-radio-button__inner {
  padding: 12px 16px;
  border-radius: 8px;
  border: 2px solid #e5e7eb;
  background: #ffffff;
  transition: all 0.3s ease;
}

.payment-methods .el-radio-button__inner:hover {
  border-color: #3b82f6;
  background: #f0f9ff;
}

.payment-methods .el-radio-button.is-active .el-radio-button__inner {
  border-color: #3b82f6;
  background: #3b82f6;
  color: #ffffff;
}

.payment-option {
  display: flex;
  align-items: center;
  gap: 8px;
}

.payment-icon {
  font-size: 16px;
}

/* 提现汇总 */
.withdraw-summary {
  padding: 20px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.summary-card {
  padding: 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  text-align: center;
  transition: all 0.3s ease;
}

.summary-card:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.summary-card.highlight {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  border-color: #3b82f6;
}

.summary-label {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 4px;
  font-weight: 500;
}

.summary-value {
  font-size: 16px;
  font-weight: 700;
}

.summary-value.count {
  color: #3b82f6;
}

.summary-value.total {
  color: #059669;
}

.summary-value.fee {
  color: #f59e0b;
}

.summary-value.actual {
  color: #1d4ed8;
  font-size: 18px;
}

/* 分成记录筛选器 */
.commission-filters {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

/* 分成记录表格容器 */
.commission-table-container {
  background: #ffffff;
}

.commission-table {
  border: none;
}

.commission-table .el-table__header {
  background: #f8fafc;
}

.commission-table .el-table__header th {
  background: #f8fafc;
  color: #374151;
  font-weight: 600;
  border-bottom: 1px solid #e2e8f0;
}

.commission-table .amount-text {
  color: #059669;
  font-weight: 600;
}

.commission-table .source-amount {
  color: #6b7280;
}

.commission-table .rate-text {
  color: #3b82f6;
  font-weight: 500;
}

.commission-table .date-text {
  color: #6b7280;
  font-size: 12px;
}

/* 分成记录分页 */
.commission-pagination {
  padding: 16px 20px;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: center;
}

/* 弹窗底部 */
.withdraw-dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
}

.submit-btn {
  padding: 12px 24px;
  font-weight: 600;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.submit-btn:hover:not(.is-disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

/* 提现卡片样式 */
.withdraw-card {
  height: 80px;
  border: 1px solid #e5e7eb;
  transition: all 0.3s ease;
}

.withdraw-card:hover {
  border-color: #10b981;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.15);
}

.withdraw-content {
  display: flex;
  align-items: center;
  height: 100%;
  padding: 0;
}

.withdraw-icon {
  margin-right: 16px;
  color: #10b981;
  font-size: 24px;
}

.withdraw-info {
  flex: 1;
}

.withdraw-amount {
  font-size: 20px;
  font-weight: 700;
  color: #10b981;
  margin-bottom: 4px;
}

.withdraw-label {
  font-size: 14px;
  color: #6b7280;
  font-weight: 500;
}

/* 提现操作区域 */
.withdraw-action {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.withdraw-action .el-button {
  height: 40px !important;
}

.withdraw-tip {
  margin-top: 8px;
  font-size: 12px;
  color: #f59e0b;
  text-align: center;
}

.withdraw-action .el-button {
  border-radius: 8px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.withdraw-action .el-button:hover:not(.is-disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(64, 158, 255, 0.3);
}

.withdraw-action .el-button.is-disabled {
  opacity: 0.6;
}
</style>