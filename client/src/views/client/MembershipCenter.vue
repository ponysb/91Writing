<template>
  <div class="membership-center">
    <!-- 页面标题 -->
    <div class="membership-container">
      <el-row :gutter="20">
        <!-- 会员信息 -->
        <el-col :span="24">
          <el-card class="member-info-card">
            <template #header>
              <div class="card-header">
                <h3>会员信息</h3>
                <el-button type="primary" size="small" @click="refreshMemberInfo">
                  <el-icon><Refresh /></el-icon>
                  刷新
                </el-button>
              </div>
            </template>
            <div class="member-info">
              <el-row :gutter="20">
                <el-col :xs="24" :sm="12" :md="6">
                  <div class="info-item">
                    <div class="info-label">用户名</div>
                    <div class="info-value">{{ userInfo.username || '-' }}</div>
                  </div>
                </el-col>
                <el-col :xs="24" :sm="12" :md="6">
                  <div class="info-item">
                    <div class="info-label">会员到期</div>
                    <div class="info-value">{{ membershipExpireTime || '-' }}</div>
                  </div>
                </el-col>
                <el-col :xs="24" :sm="12" :md="6">
                  <div class="info-item">
                    <div class="info-label">剩余积分</div>
                    <div class="info-value credits">
                      <el-icon><CreditCard /></el-icon>
                      {{ userInfo.remaining_usage || 0 }}
                    </div>
                  </div>
                </el-col>
                <el-col :xs="24" :sm="12" :md="6">
                  <div class="info-item">
                    <div class="info-label">累计使用</div>
                    <div class="info-value">{{ totalUsage || 0 }}</div>
                  </div>
                </el-col>
              </el-row>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <el-row :gutter="20" style="margin-top: 20px;">
        <!-- 激活码兑换 -->
        <el-col :xs="24" :md="12">
          <el-card class="activation-card">
            <template #header>
              <h3>激活码兑换</h3>
            </template>
            <div class="activation-form">
              <el-form @submit.prevent="activateCode">
                <el-form-item>
                  <el-input
                    v-model="activationForm.code"
                    placeholder="请输入16位激活码"
                    maxlength="16"
                    show-word-limit
                    @keyup.enter="activateCode"
                  >
                    <template #prepend>
                      <el-icon><Key /></el-icon>
                    </template>
                  </el-input>
                </el-form-item>
                <el-form-item>
                  <el-row :gutter="10">
                    <el-col :span="siteSettingsStore.hasCardPlatform ? 12 : 24">
                      <el-button 
                        type="primary" 
                        @click="activateCode" 
                        :loading="activating"
                        style="width: 100%;"
                      >
                        {{ activating ? '兑换中...' : '立即兑换' }}
                      </el-button>
                    </el-col>
                    <el-col v-if="siteSettingsStore.hasCardPlatform" :span="12">
                      <el-button 
                        type="success" 
                        @click="openCardPlatform"
                        style="width: 100%;"
                      >
                        发卡平台
                      </el-button>
                    </el-col>
                  </el-row>
                </el-form-item>
              </el-form>
              <div class="activation-tips">
                <el-alert
                  title="兑换说明"
                  type="info"
                  :closable="false"
                  show-icon
                >
                  <ul>
                    <li>激活码为16位字符，不区分大小写</li>
                    <li>每个激活码只能使用一次</li>
                    <li>兑换成功后积分将立即到账</li>
                  </ul>
                </el-alert>
              </div>
            </div>
          </el-card>
        </el-col>

        <!-- 会员开通记录 -->
        <el-col :xs="24" :md="12">
          <el-card class="membership-records-card">
            <template #header>
              <div class="card-header">
                <h3>会员开通记录</h3>
                <el-button type="text" size="small" @click="viewAllMembershipRecords">
                  查看全部
                  <el-icon><ArrowRight /></el-icon>
                </el-button>
              </div>
            </template>
            <div class="membership-records">
              <div v-if="loadingMembershipRecords" class="loading-container">
                <el-skeleton :rows="3" animated />
              </div>
              <div v-else-if="membershipRecords.length === 0" class="empty-container">
                <el-empty description="暂无开通记录" :image-size="80" />
              </div>
              <div v-else>
                <div 
                  v-for="record in membershipRecords.slice(0, 5)" 
                  :key="record.id" 
                  class="record-item"
                >
                  <div class="record-info">
                    <div class="record-title">{{ record.package_name || '会员套餐' }}</div>
                    <div class="record-detail">
                      {{ formatTime(record.created_at) }} • 
                      <span :class="getStatusClass(record.status)">{{ getStatusText(record.status) }}</span>
                    </div>
                  </div>
                  <div class="record-amount">¥{{ record.payment_amount || 0 }}</div>
                </div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 套餐推荐 -->
      <el-row :gutter="20" style="margin-top: 20px;">
        <el-col :span="24">
          <el-card>
            <template #header>
              <h3>VIP套餐推荐</h3>
            </template>
            <div class="packages-grid">
              <div 
                v-for="pkg in recommendedPackages" 
                :key="pkg.id"
                class="package-item"
                :class="{ recommended: pkg.is_recommended }"
                @click="selectPackage(pkg)"
              >
                <div class="package-header">
                  <h4>{{ pkg.name }}</h4>
                  <div v-if="pkg.badge" class="package-badge">{{ pkg.badge }}</div>
                </div>
                <div class="package-price">
                  <span class="current-price">¥{{ pkg.current_price }}</span>
                  <span v-if="pkg.original_price > pkg.current_price" class="original-price">
                    ¥{{ pkg.original_price }}
                  </span>
                  <span v-if="pkg.discount > 0" class="discount-badge">
                    {{ pkg.discount }}折
                  </span>
                </div>
                <div class="package-info">
                  <div class="validity">有效期：{{ pkg.validity_days }}天</div>
                  <div class="description">{{ pkg.description }}</div>
                  <div class="features">
                    <div 
                      v-for="feature in getPackageFeatures(pkg.features)" 
                      :key="feature" 
                      class="feature-item"
                    >
                      <el-icon><Check /></el-icon>
                      {{ feature }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 使用记录 -->
      <el-row :gutter="20" style="margin-top: 20px;">
        <el-col :span="24">
          <el-card class="usage-history-card">
            <template #header>
              <div class="card-header">
                <h3>最近使用记录</h3>
                <el-button type="text" size="small" @click="viewAllHistory">
                  查看全部
                  <el-icon><ArrowRight /></el-icon>
                </el-button>
              </div>
            </template>
            <div class="usage-history">
              <div v-if="loadingHistory" class="loading-container">
                <el-skeleton :rows="3" animated />
              </div>
              <div v-else-if="usageHistory.length === 0" class="empty-container">
                <el-empty description="暂无使用记录" :image-size="80" />
              </div>
              <div v-else>
                <div 
                  v-for="item in usageHistory" 
                  :key="item.id" 
                  class="history-item"
                >
                  <div class="history-info">
                    <div class="history-title">{{ item.action || getBusinessTypeName(item.business_type) }}</div>
                    <div class="history-detail">{{ formatTime(item.created_at) }}</div>
                  </div>
                  <div class="credits-change" :class="item.type || 'subtract'">
                    {{ item.type === 'add' ? '+' : '-' }}{{ item.credits || item.usage_count || 1 }}
                  </div>
                </div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 支付对话框 -->
    <el-dialog
      v-model="paymentDialogVisible"
      title="支付订单"
      width="500px"
      :close-on-click-modal="false"
      :show-close="!orderInfo"
      @close="closePaymentDialog"
    >
      <div v-if="selectedPackage" class="payment-dialog">
        <div class="package-info">
          <h3>{{ selectedPackage.name }}</h3>
          <div class="price-info">
            <span class="current-price">¥{{ selectedPackage.current_price }}</span>
            <span v-if="selectedPackage.original_price > selectedPackage.current_price" class="original-price">
              ¥{{ selectedPackage.original_price }}
            </span>
          </div>
          <div class="package-desc">{{ selectedPackage.description }}</div>
        </div>
        
        <div v-if="!orderInfo" class="payment-area">
          <el-button 
            type="primary" 
            size="large" 
            @click="createPaymentOrder" 
            :loading="paymentLoading"
            style="width: 100%;"
          >
            {{ paymentLoading ? '创建订单中...' : '立即支付' }}
          </el-button>
        </div>
        
        <div v-else class="payment-area">
          <div class="payment-warning">
            <el-alert
              title="为避免支付失败，请勿刷新页面，点 我已支付 按钮关闭弹窗，支付成功后请等待10秒后"
              type="warning"
              :closable="false"
              show-icon
            />
          </div>
          <div class="qrcode-container">
            <img :src="orderInfo.qrcode_url" alt="支付二维码" class="qrcode-image" />
          </div>
          <div class="payment-info">
            <div class="payment-tip">请使用微信扫码支付</div>
            <div class="order-amount">支付金额：¥{{ orderInfo.total_fee }}</div>
            <div class="order-no">订单号：{{ orderInfo.out_trade_no }}</div>
            <div class="payment-actions">
              <el-button @click="checkOrderStatus">查询支付状态</el-button>
              <el-button type="primary" @click="createPaymentOrder">重新生成</el-button>
              <el-button type="success" @click="handlePaymentComplete">我已支付</el-button>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>

    <!-- 使用记录详情对话框 -->
    <el-dialog
      v-model="historyDialogVisible"
      title="使用记录"
      width="800px"
      @close="closeHistoryDialog"
    >
      <div class="history-dialog">
        <el-table 
          :data="allUsageHistory" 
          v-loading="loadingHistory"
          stripe
        >
          <el-table-column label="业务类型" width="120">
            <template #default="{ row }">
              {{ getBusinessTypeName(row.business_type) }}
            </template>
          </el-table-column>
          <!-- <el-table-column prop="action" label="操作" width="150" /> -->
          <el-table-column label="积分变化" width="100">
            <template #default="{ row }">
              <span class="credits-change" :class="row.type || 'subtract'">
                {{ row.type === 'add' ? '+' : '-' }}{{ row.credits || row.usage_count || 1 }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="created_at" label="时间" width="180">
            <template #default="{ row }">
              {{ formatTime(row.created_at) }}
            </template>
          </el-table-column>
          <el-table-column prop="description" label="说明" show-overflow-tooltip />
        </el-table>
        
        <div class="dialog-pagination">
          <el-pagination
            v-model:current-page="historyPage"
            v-model:page-size="historyPageSize"
            :total="historyTotal"
            :page-sizes="[10, 20, 50]"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="loadUsageHistory"
            @current-change="loadUsageHistory"
          />
        </div>
      </div>
    </el-dialog>

    <!-- 会员开通记录详情对话框 -->
    <el-dialog
      v-model="membershipDialogVisible"
      title="会员开通记录"
      width="900px"
      @close="closeMembershipDialog"
    >
      <div class="membership-dialog">
        <el-table 
          :data="allMembershipRecords" 
          v-loading="loadingMembershipRecords"
          stripe
        >
          <el-table-column prop="order_id" label="订单号" width="180" show-overflow-tooltip />
          <el-table-column prop="package_name" label="套餐名称" width="120" />
          <el-table-column label="支付金额" width="100">
            <template #default="{ row }">
              ¥{{ row.payment_amount || 0 }}
            </template>
          </el-table-column>
          <el-table-column prop="payment_method" label="支付方式" width="100" />
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="getStatusType(row.status)">{{ getStatusText(row.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="created_at" label="创建时间" width="180">
            <template #default="{ row }">
              {{ formatTime(row.created_at) }}
            </template>
          </el-table-column>
          <el-table-column prop="paid_at" label="支付时间" width="180">
            <template #default="{ row }">
              {{ formatTime(row.paid_at) }}
            </template>
          </el-table-column>
        </el-table>
        
        <div class="dialog-pagination">
          <el-pagination
            v-model:current-page="membershipPage"
            v-model:page-size="membershipPageSize"
            :total="membershipTotal"
            :page-sizes="[10, 20, 50]"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="loadMembershipRecords"
            @current-change="loadMembershipRecords"
          />
        </div>
      </div>
    </el-dialog>

    <!-- 客服浮窗 -->
    <div class="customer-service-float" @click="showCustomerServiceDialog">
      <el-icon size="24"><ChatDotRound /></el-icon>
      <span>联系客服</span>
    </div>

    <!-- 客服联系方式弹窗 -->
    <el-dialog
      v-model="customerServiceDialogVisible"
      title="联系客服"
      width="400px"
      @close="closeCustomerServiceDialog"
    >
      <div class="customer-service-content">
        <div v-if="siteSettingsStore.settings.contactEmail" class="contact-item">
          <div class="contact-label">
            <el-icon><Message /></el-icon>
            邮箱
          </div>
          <div class="contact-value">{{ siteSettingsStore.settings.contactEmail }}</div>
          <el-button type="text" @click="copyToClipboard(siteSettingsStore.settings.contactEmail)">复制</el-button>
        </div>
        
        <div v-if="siteSettingsStore.settings.contactQQ" class="contact-item">
          <div class="contact-label">
            <el-icon><ChatDotRound /></el-icon>
            QQ
          </div>
          <div class="contact-value">{{ siteSettingsStore.settings.contactQQ }}</div>
          <el-button type="text" @click="copyToClipboard(siteSettingsStore.settings.contactQQ)">复制</el-button>
        </div>
        
        <div v-if="siteSettingsStore.settings.contactWechat" class="contact-item">
          <div class="contact-label">
            <el-icon><ChatDotRound /></el-icon>
            微信
          </div>
          <div class="contact-value">{{ siteSettingsStore.settings.contactWechat }}</div>
          <el-button type="text" @click="copyToClipboard(siteSettingsStore.settings.contactWechat)">复制</el-button>
        </div>
        
        <div v-if="!hasAnyContact" class="no-contact">
          <el-empty description="暂未设置客服联系方式" :image-size="80" />
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { 
  Refresh, 
  CreditCard, 
  Key, 
  ArrowRight, 
  Clock, 
  Check,
  ChatDotRound,
  Message
} from '@element-plus/icons-vue'
import { authAPI, paymentAPI, activationCodeAPI, aiCallRecordAPI, membershipAPI } from '@/api'
import { useUserStore } from '@/stores/user'
import { useSiteSettingsStore } from '@/stores/siteSettings'

const userStore = useUserStore()
const siteSettingsStore = useSiteSettingsStore()

// 用户信息
const userInfo = ref({
  username: '',
  nickname: '',
  email: '',
  avatar: '',
  remaining_usage: 0,
  status: '',
  created_at: ''
})

// 激活码兑换
const activationForm = ref({
  code: ''
})
const activating = ref(false)

// 使用记录
const usageHistory = ref([])
const allUsageHistory = ref([])
const historyDialogVisible = ref(false)
const loadingHistory = ref(false)
const historyPage = ref(1)
const historyPageSize = ref(10)
const historyTotal = ref(0)

// 业务类型映射字典
const businessTypeMap = {
  outline: 'AI大纲生成',
  character: 'AI人物生成',
  dialogue: 'AI对话生成',
  plot: 'AI情节生成',
  polish: 'AI文本润色',
  creative: 'AI创意建议',
  content: 'AI正文生成',
  worldview: 'AI世界观生成',
  book_analyze: 'AI拆书分析',
  ai_chat: 'AI聊天对话',
  short_story: 'AI短篇故事生成',
  short_article: 'AI短文生成',
  article: 'AI文章生成'
}

// 获取业务类型中文名称
const getBusinessTypeName = (type) => {
  return businessTypeMap[type] || type || '未知类型'
}

// 会员开通记录
const membershipRecords = ref([])
const allMembershipRecords = ref([])
const membershipDialogVisible = ref(false)
const loadingMembershipRecords = ref(false)
const membershipPage = ref(1)
const membershipPageSize = ref(10)
const membershipTotal = ref(0)

// 推荐套餐
const recommendedPackages = ref([])

// 支付相关状态
const paymentDialogVisible = ref(false)
const selectedPackage = ref(null)
const paymentLoading = ref(false)
const orderInfo = ref(null)
const paymentStatusTimer = ref(null)

// 客服弹窗状态
const customerServiceDialogVisible = ref(false)

// 计算累计使用
const totalUsage = computed(() => {
  return allUsageHistory.value.reduce((total, item) => {
    if (item.type !== 'add') {
      return total + (item.credits || item.usage_count || 1)
    }
    return total
  }, 0)
})

// 计算会员到期时间（取最后一个到期时间）
const membershipExpireTime = computed(() => {
  if (!membershipRecords.value || membershipRecords.value.length === 0) {
    return null
  }
  
  // 找到最新的激活状态的会员记录的到期时间
  const activeRecords = membershipRecords.value.filter(record => record.status === 'active')
  if (activeRecords.length === 0) {
    return null
  }
  
  // 按到期时间排序，取最晚到期的
  const latestRecord = activeRecords.sort((a, b) => new Date(b.end_date) - new Date(a.end_date))[0]
  
  // 返回格式化的到期时间（只显示年月日）
  if (latestRecord.end_date) {
    return formatDate(latestRecord.end_date)
  }
  
  return null
})

// 刷新会员信息
const refreshMemberInfo = async () => {
  try {
    const response = await authAPI.getCurrentUser()
    if (response.success) {
      const userData = response.data.user || response.data
      userInfo.value = {
        username: userData.username,
        nickname: userData.nickname,
        email: userData.email,
        avatar: userData.avatar,
        remaining_usage: userData.remaining_credits || userData.remaining_usage || 0,
        status: userData.status,
        created_at: userData.created_at
      }
      // 更新userStore，确保包含remaining_usage字段
      userStore.updateUserInfo({
        ...userData,
        remaining_usage: userData.remaining_credits || userData.remaining_usage || 0,
        remaining_credits: userData.remaining_credits || userData.remaining_usage || 0
      })
    }
  } catch (error) {
    console.error('获取用户信息失败:', error)
    ElMessage.error('获取用户信息失败：' + (error.response?.data?.message || error.message))
  }
}

// 激活码兑换
const activateCode = async () => {
  if (!activationForm.value.code.trim()) {
    ElMessage.warning('请输入激活码')
    return
  }
  
  if (activationForm.value.code.length !== 16) {
    ElMessage.warning('激活码必须是16位')
    return
  }
  
  activating.value = true
  
  try {
    const response = await activationCodeAPI.activate(activationForm.value.code.toUpperCase())
    
    if (response.success) {
      const creditsAdded = response.data?.credits_added || 0
      const packageName = response.data?.package_info?.name || '套餐'
      const remainingCredits = response.data?.remaining_credits || 0
      
      ElMessage.success(`激活码兑换成功！获得 ${creditsAdded} 积分（${packageName}），当前剩余 ${remainingCredits} 积分`)
      activationForm.value.code = ''
      
      // 立即更新显示的剩余积分
      userInfo.value.remaining_usage = remainingCredits
      // 同时更新userStore中的数据
      userStore.updateUserInfo({
        remaining_usage: remainingCredits,
        remaining_credits: remainingCredits
      })
      
      // 刷新相关数据
      await refreshMemberInfo()
      await loadRecentUsageHistory()
      await loadRecentMembershipRecords()
      
      // 触发全局事件，通知头部导航刷新剩余次数
      window.dispatchEvent(new CustomEvent('membershipUpdated'))
    } else {
      ElMessage.error(response.message || '激活码兑换失败')
    }
  } catch (error) {
    console.error('激活码兑换失败:', error)
    const errorMsg = error.response?.data?.message || error.message || '激活码兑换失败'
    ElMessage.error(errorMsg)
  } finally {
    activating.value = false
  }
}

// 打开发卡平台
const openCardPlatform = () => {
  if (siteSettingsStore.settings.cardPlatformUrl) {
    window.open(siteSettingsStore.settings.cardPlatformUrl, '_blank')
  }
}

// 判断是否有任何联系方式
const hasAnyContact = computed(() => {
  const settings = siteSettingsStore.settings
  return !!(settings.contactEmail || settings.contactQQ || settings.contactWechat)
})

// 显示客服弹窗
const showCustomerServiceDialog = () => {
  customerServiceDialogVisible.value = true
}

// 关闭客服弹窗
const closeCustomerServiceDialog = () => {
  customerServiceDialogVisible.value = false
}

// 复制到剪贴板
const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('已复制到剪贴板')
  } catch (error) {
    // 降级方案
    const textArea = document.createElement('textarea')
    textArea.value = text
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)
    ElMessage.success('已复制到剪贴板')
  }
}

// 加载最近使用记录
const loadRecentUsageHistory = async () => {
  try {
    loadingHistory.value = true
    const response = await aiCallRecordAPI.getRecords({ page: 1, limit: 5 })
    
    if (response.success && response.data) {
      const records = response.data.records || response.data
      usageHistory.value = Array.isArray(records) ? records : []
    } else {
      usageHistory.value = []
    }
  } catch (error) {
    console.error('获取使用记录失败:', error)
    usageHistory.value = []
  } finally {
    loadingHistory.value = false
  }
}

// 加载最近会员开通记录
const loadRecentMembershipRecords = async () => {
  try {
    loadingMembershipRecords.value = true
    const response = await membershipAPI.getRecords({ page: 1, limit: 5 })
    
    if (response.success && response.data) {
      const records = response.data.records || response.data
      membershipRecords.value = Array.isArray(records) ? records : []
    } else {
      membershipRecords.value = []
    }
  } catch (error) {
    console.error('获取会员开通记录失败:', error)
    membershipRecords.value = []
  } finally {
    loadingMembershipRecords.value = false
  }
}

// 查看全部使用记录
const viewAllHistory = () => {
  historyDialogVisible.value = true
  loadUsageHistory()
}

// 加载使用记录
const loadUsageHistory = async () => {
  loadingHistory.value = true
  try {
    const response = await aiCallRecordAPI.getRecords({
      page: historyPage.value,
      limit: historyPageSize.value
    })
    
    if (response.success && response.data) {
      allUsageHistory.value = response.data.records || response.data
      historyTotal.value = response.data.pagination?.total || response.data.total || 0
    } else {
      allUsageHistory.value = []
      historyTotal.value = 0
    }
  } catch (error) {
    console.error('加载使用记录失败:', error)
    ElMessage.error('加载使用记录失败：' + (error.response?.data?.message || error.message))
  } finally {
    loadingHistory.value = false
  }
}

// 关闭使用记录对话框
const closeHistoryDialog = () => {
  historyDialogVisible.value = false
  allUsageHistory.value = []
}

// 查看全部会员开通记录
const viewAllMembershipRecords = () => {
  membershipDialogVisible.value = true
  loadMembershipRecords()
}

// 加载会员开通记录
const loadMembershipRecords = async () => {
  loadingMembershipRecords.value = true
  try {
    const response = await membershipAPI.getRecords({
      page: membershipPage.value,
      limit: membershipPageSize.value
    })
    
    if (response.success && response.data) {
      allMembershipRecords.value = response.data.records || response.data
      membershipTotal.value = response.data.pagination?.total || response.data.total || 0
    } else {
      allMembershipRecords.value = []
      membershipTotal.value = 0
    }
  } catch (error) {
    console.error('加载会员开通记录失败:', error)
    ElMessage.error('加载会员开通记录失败：' + (error.response?.data?.message || error.message))
  } finally {
    loadingMembershipRecords.value = false
  }
}

// 关闭会员开通记录对话框
const closeMembershipDialog = () => {
  membershipDialogVisible.value = false
  allMembershipRecords.value = []
}

// 加载推荐套餐
const loadRecommendedPackages = async () => {
  try {
    const response = await paymentAPI.getVipPackages()
    console.log('VIP套餐API响应:', response)
    
    let packages = []
    
    // 处理多种响应格式
    if (response && response.code === 200 && response.data) {
      packages = Array.isArray(response.data) ? response.data : []
    } else if (response && response.success && response.data) {
      packages = Array.isArray(response.data) ? response.data : []
    } else if (response && Array.isArray(response)) {
      packages = response
    } else {
      console.warn('VIP套餐数据格式异常:', response)
      packages = []
    }
    
    // 处理套餐数据
    recommendedPackages.value = packages
      .filter(pkg => pkg && pkg.is_active !== false) // 过滤非激活套餐
      .map(pkg => ({
        ...pkg,
        current_price: pkg.price || pkg.current_price,
        discount: pkg.discount || (pkg.original_price > (pkg.price || pkg.current_price) ? 
          Math.round((1 - (pkg.price || pkg.current_price) / pkg.original_price) * 100) : 0)
      }))
      .sort((a, b) => {
        // 按后端返回的sort_order自然排序（从小到大）
        return (a.sort_order || 0) - (b.sort_order || 0)
      })
      
    console.log('处理后的套餐数据:', recommendedPackages.value)
  } catch (error) {
    console.error('获取VIP套餐失败:', error)
    recommendedPackages.value = []
  }
}

// 选择套餐
const selectPackage = (pkg) => {
  selectedPackage.value = pkg
  paymentDialogVisible.value = true
}

// 创建支付订单
const createPaymentOrder = async () => {
  if (!selectedPackage.value) return
  
  paymentLoading.value = true
  try {
    const response = await paymentAPI.createOrder({
      package_id: selectedPackage.value.id,
      product_type: 'vip'
    })
    
    if (response.code === 200) {
      orderInfo.value = response.data
      ElMessage.success('支付订单创建成功，请扫码支付')
      // 开始轮询订单状态
      startOrderStatusPolling()
    } else {
      ElMessage.error(response.message || '创建支付订单失败')
    }
  } catch (error) {
    console.error('创建支付订单失败:', error)
    ElMessage.error('创建支付订单失败：' + (error.response?.data?.message || error.message))
  } finally {
    paymentLoading.value = false
  }
}

// 开始轮询订单状态
const startOrderStatusPolling = () => {
  if (paymentStatusTimer.value) {
    clearInterval(paymentStatusTimer.value)
  }
  
  paymentStatusTimer.value = setInterval(async () => {
    if (!orderInfo.value?.out_trade_no) return
    
    try {
      const response = await paymentAPI.getOrderStatus(orderInfo.value.out_trade_no)
      if (response.code === 200) {
        const status = response.data.status
        if (status === 'paid') {
          // 支付成功
          clearInterval(paymentStatusTimer.value)
          ElMessage.success('支付成功！VIP权限已激活')
          paymentDialogVisible.value = false
          // 刷新用户信息和记录
          await refreshMemberInfo()
          await loadRecentMembershipRecords()
        } else if (status === 'expired' || status === 'cancelled') {
          // 订单过期或取消
          clearInterval(paymentStatusTimer.value)
          ElMessage.warning('订单已过期或取消')
        }
      }
    } catch (error) {
      console.error('查询订单状态失败:', error)
    }
  }, 3000) // 每3秒查询一次
}

// 停止轮询
const stopOrderStatusPolling = () => {
  if (paymentStatusTimer.value) {
    clearInterval(paymentStatusTimer.value)
    paymentStatusTimer.value = null
  }
}

// 关闭支付对话框
const closePaymentDialog = () => {
  paymentDialogVisible.value = false
  selectedPackage.value = null
  orderInfo.value = null
  stopOrderStatusPolling()
}

// 处理用户点击"我已支付"按钮
const handlePaymentComplete = async () => {
  try {
    // 先查询一次订单状态
    await checkOrderStatus()
    // 如果支付状态还是待支付，则关闭弹窗
    if (paymentDialogVisible.value) {
      ElMessage.info('如果您已完成支付，请稍等片刻，系统将自动确认')
      closePaymentDialog()
    }
  } catch (error) {
    console.error('处理支付完成失败:', error)
    closePaymentDialog()
  }
}

// 手动查询订单状态
const checkOrderStatus = async () => {
  if (!orderInfo.value?.out_trade_no) return
  
  try {
    const response = await paymentAPI.getOrderStatus(orderInfo.value.out_trade_no)
    if (response.code === 200) {
      const status = response.data.status
      if (status === 'paid') {
        ElMessage.success('支付成功！VIP权限已激活')
        paymentDialogVisible.value = false
        await refreshMemberInfo()
        await loadRecentMembershipRecords()
        stopOrderStatusPolling()
        // 触发全局事件，通知头部导航刷新剩余次数
        window.dispatchEvent(new CustomEvent('membershipUpdated'))
      } else if (status === 'pending') {
        ElMessage.info('订单待支付，请继续扫码支付')
      } else if (status === 'expired') {
        ElMessage.warning('订单已过期，请重新创建订单')
      } else if (status === 'cancelled') {
        ElMessage.warning('订单已取消')
      }
    }
  } catch (error) {
    console.error('查询订单状态失败:', error)
    ElMessage.error('查询订单状态失败')
  }
}

// 格式化时间
const formatTime = (time) => {
  if (!time) return '-'
  return new Date(time).toLocaleString('zh-CN')
}

// 格式化日期（只显示年月日）
const formatDate = (time) => {
  if (!time) return '-'
  return new Date(time).toLocaleDateString('zh-CN')
}

// 获取套餐特性
const getPackageFeatures = (features) => {
  if (!features) return []
  if (Array.isArray(features)) {
    return features.filter(f => f && f.trim())
  }
  if (typeof features === 'string') {
    return features.split(',').map(f => f.trim()).filter(f => f)
  }
  return []
}

// 获取状态文本
const getStatusText = (status) => {
  const statusMap = {
    'pending': '待支付',
    'paid': '已支付',
    'expired': '已过期',
    'cancelled': '已取消',
    'refunded': '已退款'
  }
  return statusMap[status] || status || '未知'
}

// 获取状态类型
const getStatusType = (status) => {
  const typeMap = {
    'pending': 'warning',
    'paid': 'success',
    'expired': 'info',
    'cancelled': 'info',
    'refunded': 'danger'
  }
  return typeMap[status] || 'info'
}

// 获取状态样式类
const getStatusClass = (status) => {
  const classMap = {
    'pending': 'status-warning',
    'paid': 'status-success',
    'expired': 'status-info',
    'cancelled': 'status-info',
    'refunded': 'status-danger'
  }
  return classMap[status] || 'status-info'
}

// 页面初始化
onMounted(async () => {
  await siteSettingsStore.loadPublicSettings()
  await refreshMemberInfo()
  await loadRecommendedPackages()
  await loadRecentUsageHistory()
  await loadRecentMembershipRecords()
})
</script>

<style scoped>
.membership-center {
  padding: 20px;
  background: transparent;
  min-height: 100vh;
  color: #495057;
}

.membership-container {
  max-width: 1200px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h3 {
  margin: 0;
  color: #303133;
}

/* 会员信息卡片 */
.member-info-card {
  margin-bottom: 20px;
  background: #ffffff;
  border: 1px solid #e9ecef;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.member-info {
  padding: 20px 0;
}

.info-item {
  text-align: center;
  padding: 20px;
  border-radius: 8px;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  color: #495057;
  margin-bottom: 10px;
  transition: all 0.2s;
}

.info-item:hover {
  background: #e9ecef;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.info-label {
  font-size: 14px;
  color: #6c757d;
  margin-bottom: 8px;
  font-weight: 500;
}

.info-value {
  font-size: 24px;
  font-weight: bold;
  color: #2c3e50;
}

.info-value.credits {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #007bff;
}

/* 激活码兑换卡片 */
.activation-card {
  height: 100%;
  background: #ffffff;
  border: 1px solid #e9ecef;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.activation-form {
  padding: 20px 0;
}

.activation-tips {
  margin-top: 20px;
}

.activation-tips ul {
  margin: 10px 0 0 0;
  padding-left: 20px;
}

.activation-tips li {
  margin-bottom: 5px;
  font-size: 13px;
  color: #606266;
}

/* 会员开通记录卡片 */
.membership-records-card {
  height: 100%;
  background: #ffffff;
  border: 1px solid #e9ecef;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.membership-records {
  padding: 20px 0;
  max-height: 300px;
  overflow-y: auto;
}

.record-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f1f3f4;
  transition: all 0.2s;
}

.record-item:hover {
  background: #f8f9fa;
  border-radius: 4px;
  padding-left: 8px;
}

.record-item:last-child {
  border-bottom: none;
}

.record-info {
  flex: 1;
}

.record-title {
  font-weight: 500;
  color: #2c3e50;
  margin-bottom: 4px;
}

.record-detail {
  font-size: 12px;
  color: #6c757d;
}

.record-amount {
  font-weight: bold;
  color: #007bff;
  font-size: 16px;
}

.status-success {
  color: #28a745;
}

.status-warning {
  color: #ffc107;
}

.status-danger {
  color: #dc3545;
}

.status-info {
  color: #6c757d;
}

/* 使用记录卡片 */
.usage-history-card {
  height: 100%;
  background: #ffffff;
  border: 1px solid #e9ecef;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.usage-history {
  padding: 20px 0;
  max-height: 300px;
  overflow-y: auto;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f1f3f4;
  transition: all 0.2s;
}

.history-item:hover {
  background: #f8f9fa;
  border-radius: 4px;
  padding-left: 8px;
}

.history-item:last-child {
  border-bottom: none;
}

.history-info {
  flex: 1;
}

.history-title {
  font-weight: 500;
  color: #2c3e50;
  margin-bottom: 4px;
}

.history-detail {
  font-size: 12px;
  color: #6c757d;
}

.credits-change {
  font-weight: bold;
  font-size: 16px;
}

.credits-change.add {
  color: #28a745;
}

.credits-change.subtract {
  color: #dc3545;
}

/* 套餐推荐 */
.packages-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  padding: 20px 0;
}

.package-item {
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.2s;
  background: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.package-item:hover {
  border-color: #007bff;
  box-shadow: 0 4px 12px rgba(0, 123, 255, 0.15);
  transform: translateY(-2px);
}

.package-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 15px;
  border-bottom: 1px solid #f0f0f0;
}

.package-header h4 {
  margin: 0;
  color: #2c3e50;
  font-size: 18px;
}

.package-price {
  margin-bottom: 10px;
}

.current-price {
  font-size: 24px;
  font-weight: bold;
  color: #007bff;
}

.original-price {
  font-size: 16px;
  color: #6c757d;
  text-decoration: line-through;
  margin-left: 8px;
}

.package-discount {
  display: inline-block;
  background: #dc3545;
  color: white;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  margin-top: 5px;
}

.package-badge {
  display: inline-block;
  background: #28a745;
  color: white;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.package-content {
  margin-bottom: 20px;
}

.package-duration {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  color: #6c757d;
  font-size: 14px;
}

.package-duration .el-icon {
  margin-right: 5px;
}

.package-description {
  color: #6c757d;
  font-size: 12px;
  line-height: 1.4;
  margin-bottom: 10px;
}

.package-features {
  margin-top: 10px;
}

.feature-item {
  display: flex;
  align-items: center;
  margin-bottom: 5px;
  color: #6c757d;
  font-size: 12px;
}

.feature-item .el-icon {
  margin-right: 5px;
  color: #28a745;
}

.recommended {
  background: #f8f9fa;
  border-color: #007bff !important;
}

.recommended .package-header h4 {
  color: #2c3e50;
}

.recommended .current-price {
  color: #007bff;
}

/* 支付对话框样式 */
.payment-dialog {
  padding: 20px 0;
  border-radius: 8px;
  background: #ffffff;
  color: #495057;
}

.package-info {
  border-bottom: 1px solid #e9ecef;
  padding-bottom: 20px;
  margin-bottom: 20px;
}

.package-info h3 {
  margin: 0 0 10px 0;
  color: #2c3e50;
  font-size: 20px;
}

.price-info {
  margin-bottom: 10px;
}

.price-info .current-price {
  font-size: 28px;
  font-weight: bold;
  color: #007bff;
}

.price-info .original-price {
  font-size: 18px;
  color: #6c757d;
  text-decoration: line-through;
  margin-left: 10px;
}

.package-desc {
  color: #495057;
  margin-bottom: 15px;
  line-height: 1.5;
}

.payment-area {
  text-align: center;
}

.payment-warning {
  margin-bottom: 20px;
}

.qrcode-container {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
}

.qrcode-image {
  width: 200px;
  height: 200px;
  border: 1px solid #e9ecef;
  border-radius: 8px;
}

.payment-info {
  text-align: center;
}

.payment-tip {
  color: #495057;
  margin-bottom: 10px;
  font-size: 14px;
}

.order-amount {
  font-size: 18px;
  font-weight: bold;
  color: #007bff;
  margin-bottom: 5px;
}

.order-no {
  color: #6c757d;
  font-size: 12px;
  margin-bottom: 20px;
}

.payment-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
}

.payment-actions .el-button {
  margin: 5px;
}

/* 对话框样式 */
.dialog-pagination {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

/* 客服浮窗样式 */
.customer-service-float {
  position: fixed;
  right: 30px;
  bottom: 100px;
  width: 120px;
  height: 50px;
  background: white;
  color: #333;
  border: 1px solid #e0e0e0;
  border-radius: 25px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  z-index: 1000;
  font-size: 14px;
  font-weight: 500;
}

.customer-service-float:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
  background: #f8f9fa;
  border-color: #409eff;
}

.customer-service-float .el-icon {
  margin-right: 6px;
}

/* 客服弹窗内容样式 */
.customer-service-content {
  padding: 10px 0;
}

.contact-item {
  display: flex;
  align-items: center;
  padding: 15px 0;
  border-bottom: 1px solid #f0f0f0;
}

.contact-item:last-child {
  border-bottom: none;
}

.contact-label {
  display: flex;
  align-items: center;
  width: 80px;
  color: #666;
  font-weight: 500;
}

.contact-label .el-icon {
  margin-right: 8px;
  color: #409eff;
}

.contact-value {
  flex: 1;
  margin: 0 15px;
  color: #333;
  font-family: 'Courier New', monospace;
  background: #f8f9fa;
  padding: 8px 12px;
  border-radius: 4px;
  border: 1px solid #e9ecef;
}

.no-contact {
  text-align: center;
  padding: 40px 20px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .customer-service-float {
    right: 20px;
    bottom: 80px;
    width: 100px;
    height: 45px;
    font-size: 12px;
  }
  
  .contact-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .contact-label {
    width: auto;
  }
  
  .contact-value {
    width: 100%;
    margin: 0;
  }
}

.loading-container,
.empty-container {
  padding: 20px;
  text-align: center;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .membership-center {
    padding: 10px;
  }
  
  .member-info .el-col {
    margin-bottom: 10px;
  }
  
  .packages-grid {
    grid-template-columns: 1fr;
  }
  
  .info-item {
    padding: 15px;
  }
  
  .info-value {
    font-size: 20px;
  }
}
</style>