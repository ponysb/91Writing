<template>
  <div class="admin-dashboard">

    <!-- 概览统计卡片 -->
    <div class="overview-section">
      <h2 class="section-title">平台概览</h2>
      <div class="stats-grid">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon user-icon">
              <el-icon><UserFilled /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ formatNumber(dashboardData.overview?.totalUsers) }}</div>
              <div class="stat-label">总用户数</div>
              <div class="stat-change positive">活跃用户 {{ dashboardData.overview?.activeUsers || 0 }}</div>
            </div>
          </div>
        </el-card>

        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon novel-icon">
              <el-icon><Reading /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ formatNumber(dashboardData.overview?.totalNovels) }}</div>
              <div class="stat-label">长篇小说</div>
              <div class="stat-change">短篇 {{ formatNumber(dashboardData.overview?.totalShortStories) }}</div>
            </div>
          </div>
        </el-card>

        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon revenue-icon">
              <el-icon><Money /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">¥{{ formatMoney(dashboardData.overview?.weekRevenue) }}</div>
              <div class="stat-label">本周收入</div>
              <div class="stat-change">订单 {{ dashboardData.overview?.paidOrders || 0 }}/{{ dashboardData.overview?.totalOrders || 0 }}</div>
            </div>
          </div>
        </el-card>

        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon ai-icon">
              <el-icon><TrendCharts /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ formatNumber(dashboardData.overview?.totalAiCalls) }}</div>
              <div class="stat-label">AI调用总数</div>
              <div class="stat-change">今日 {{ formatNumber(dashboardData.overview?.todayAiCalls || 0) }} 次</div>
            </div>
          </div>
        </el-card>
      </div>
    </div>

    <!-- 今日数据 -->
    <div class="today-section">
      <h2 class="section-title">今日数据</h2>
      <div class="today-stats">
        <div class="today-item">
          <div class="today-value">{{ dashboardData.todayStats?.newUsers || 0 }}</div>
          <div class="today-label">新用户</div>
        </div>
        <div class="today-item">
          <div class="today-value">{{ dashboardData.todayStats?.newNovels || 0 }}</div>
          <div class="today-label">新小说</div>
        </div>
        <div class="today-item">
          <div class="today-value">{{ dashboardData.todayStats?.newShortStories || 0 }}</div>
          <div class="today-label">新短篇</div>
        </div>
        <div class="today-item">
          <div class="today-value">{{ dashboardData.todayStats?.aiCalls || 0 }}</div>
          <div class="today-label">AI调用</div>
        </div>
      </div>
    </div>

    <!-- 数据图表 -->
    <div class="charts-section">
      <h2 class="section-title">数据分析</h2>
      <div class="chart-row">
        <el-card class="chart-card" shadow="hover">
          <template #header>
            <div class="chart-header">
              <h3>用户增长趋势</h3>
              <el-select v-model="userChartPeriod" size="small" style="width: 100px">
                <el-option label="7天" value="7d" />
                <el-option label="30天" value="30d" />
                <el-option label="90天" value="90d" />
              </el-select>
            </div>
          </template>
          <div class="chart-content">
            <div class="chart-stats">
               <div class="chart-stat">
                 <span class="stat-label">本周新增</span>
                 <span class="stat-value">{{ dashboardData.weeklyStats?.newUsers || 0 }}</span>
               </div>
               <div class="chart-stat">
                 <span class="stat-label">活跃用户</span>
                 <span class="stat-value">{{ dashboardData.overview?.activeUsers || 0 }}</span>
               </div>
             </div>
            <div class="chart-container" style="height: 300px;">
              <v-chart class="chart" :option="userGrowthChartOption" autoresize />
            </div>
          </div>
        </el-card>

        <el-card class="chart-card" shadow="hover">
          <template #header>
            <div class="chart-header">
              <h3>收入统计</h3>
              <el-select v-model="revenueChartPeriod" size="small" style="width: 100px">
                <el-option label="本周" value="week" />
                <el-option label="本月" value="month" />
                <el-option label="本年" value="year" />
              </el-select>
            </div>
          </template>
          <div class="chart-content">
            <div class="chart-stats">
               <div class="chart-stat">
                 <span class="stat-label">本周收入</span>
                 <span class="stat-value">¥{{ formatMoney(dashboardData.overview?.weekRevenue) }}</span>
               </div>
               <div class="chart-stat">
                 <span class="stat-label">订单数</span>
                 <span class="stat-value">{{ dashboardData.overview?.totalOrders || 0 }}</span>
               </div>
             </div>
            <div class="chart-container" style="height: 300px;">
              <v-chart class="chart" :option="revenueChartOption" autoresize />
            </div>
          </div>
        </el-card>
      </div>

      <div class="chart-row">
        <el-card class="chart-card full-width" shadow="hover">
          <template #header>
            <div class="chart-header">
              <h3>AI业务分析</h3>
              <div class="chart-filters">
                <el-select v-model="aiBusinessPeriod" size="small" style="width: 100px">
                  <el-option label="今日" value="today" />
                  <el-option label="本周" value="week" />
                  <el-option label="本月" value="month" />
                </el-select>
              </div>
            </div>
          </template>
          <div v-if="!dashboardData.charts?.businessTypeDistribution?.length" class="chart-placeholder">
            <el-icon><PieChart /></el-icon>
            <p>暂无数据</p>
          </div>
          <div v-else class="chart-container" style="height: 300px;">
            <v-chart class="chart" :option="businessTypeChartOption" autoresize />
          </div>
        </el-card>
      </div>
    </div>

    <!-- 最新动态 -->
    <div class="activities-section">
      <h2 class="section-title">系统动态</h2>
      <div class="activities-grid">
        <el-card class="activity-card" shadow="hover">
          <template #header>
            <h3>活跃用户</h3>
          </template>
          <div class="activity-list">
            <div v-if="!dashboardData.topActiveUsers?.length" class="empty-state">
              <el-icon><UserFilled /></el-icon>
              <span>暂无数据</span>
            </div>
            <div v-else class="user-item" v-for="user in dashboardData.topActiveUsers" :key="user.userId">
              <div class="user-info">
                <span class="user-name">{{ user.nickname || user.username }}</span>
                <span class="user-time">{{ user.callCount }}次调用</span>
              </div>
              <el-tag type="primary" size="small">
                活跃用户
              </el-tag>
            </div>
          </div>
        </el-card>

        <el-card class="activity-card" shadow="hover">
          <template #header>
            <h3>会员分布</h3>
          </template>
          <div class="activity-list">
            <div v-if="!dashboardData.membershipDistribution?.length" class="empty-state">
              <el-icon><UserFilled /></el-icon>
              <span>暂无数据</span>
            </div>
            <div v-else class="member-item" v-for="member in dashboardData.membershipDistribution" :key="member.type">
              <div class="member-info">
                <span class="member-type">{{ getMemberTypeName(member.type) }}</span>
                <span class="member-count">{{ member.count }}人</span>
              </div>
              <el-tag :type="getMemberTagType(member.type)" size="small">
                {{ getMemberTypeName(member.type) }}
              </el-tag>
            </div>
          </div>
        </el-card>

        <el-card class="activity-card" shadow="hover">
          <template #header>
            <h3>系统状态</h3>
          </template>
          <div class="system-status">
            <div class="status-item">
              <span class="status-label">服务状态</span>
              <el-tag type="success" size="small">正常</el-tag>
            </div>
            <div class="status-item">
              <span class="status-label">数据库</span>
              <el-tag type="success" size="small">正常</el-tag>
            </div>
            <div class="status-item">
              <span class="status-label">AI服务</span>
              <el-tag type="success" size="small">正常</el-tag>
            </div>
            <!-- <div class="status-item">
              <span class="status-label">存储空间</span>
              <span class="status-value">{{ dashboardData.systemStatus?.storageUsage || '0%' }}</span>
            </div> -->
          </div>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { 
  UserFilled, 
  Reading, 
  Money, 
  TrendCharts,
  Document,
  PieChart,
  Refresh,
  Monitor
} from '@element-plus/icons-vue'
import { ElMessage, ElLoading } from 'element-plus'
import { dashboardAPI } from '@/api'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, BarChart, PieChart as EChartsPie } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
} from 'echarts/components'
import VChart from 'vue-echarts'

// 注册ECharts组件
use([
  CanvasRenderer,
  LineChart,
  BarChart,
  EChartsPie,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
])

// 加载状态
const loading = ref(false)

// 图表筛选条件
const userChartPeriod = ref('7d')
const revenueChartPeriod = ref('week')
const aiBusinessPeriod = ref('today')

// 仪表盘数据
const dashboardData = ref({
  overview: {
    totalUsers: 0,
    activeUsers: 0,
    totalNovels: 0,
    totalShortStories: 0,
    weekRevenue: 0,
    todayRevenue: 0,
    totalAiCalls: 0,
    paidOrders: 0,
    totalOrders: 0
  },
  todayStats: {
    newUsers: 0,
    newNovels: 0,
    newShortStories: 0,
    aiCalls: 0
  },
  weeklyStats: {
    newUsers: 0,
    aiCalls: 0
  },
  membershipDistribution: [],
  charts: {
    userRegistrationTrend: [],
    aiCallTrend: [],
    revenueTrend: [],
    businessTypeDistribution: []
  },
  topActiveUsers: [],
  systemStatus: {
    storageUsage: '0%'
  }
})

// 用户增长图表配置
const userGrowthChartOption = computed(() => {
  const data = dashboardData.value.charts?.userRegistrationTrend || []
  return {
    title: {
      text: '用户注册趋势',
      left: 'center',
      textStyle: {
        fontSize: 14,
        color: '#333'
      }
    },
    tooltip: {
      trigger: 'axis',
      formatter: '{b}: {c}人'
    },
    xAxis: {
      type: 'category',
      data: data.map(item => {
        const date = new Date(item.date)
        return `${date.getMonth() + 1}/${date.getDate()}`
      }),
      axisLabel: {
        fontSize: 12
      }
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        fontSize: 12
      }
    },
    series: [{
      data: data.map(item => item.count),
      type: 'line',
      smooth: true,
      itemStyle: {
        color: '#409EFF'
      },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [{
            offset: 0, color: 'rgba(64, 158, 255, 0.3)'
          }, {
            offset: 1, color: 'rgba(64, 158, 255, 0.1)'
          }]
        }
      }
    }],
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    }
  }
})

// 收入统计图表配置
const revenueChartOption = computed(() => {
  const data = dashboardData.value.charts?.revenueTrend || []
  return {
    title: {
      text: '收入趋势',
      left: 'center',
      textStyle: {
        fontSize: 14,
        color: '#333'
      }
    },
    tooltip: {
      trigger: 'axis',
      formatter: '{b}: ¥{c}'
    },
    xAxis: {
      type: 'category',
      data: data.map(item => {
        const date = new Date(item.date)
        return `${date.getMonth() + 1}/${date.getDate()}`
      }),
      axisLabel: {
        fontSize: 12
      }
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        fontSize: 12,
        formatter: '¥{value}'
      }
    },
    series: [{
      data: data.map(item => item.revenue),
      type: 'bar',
      itemStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [{
            offset: 0, color: '#67C23A'
          }, {
            offset: 1, color: '#85CE61'
          }]
        }
      }
    }],
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    }
  }
})

// 业务类型分布图表配置
const businessTypeChartOption = computed(() => {
  const data = dashboardData.value.charts?.businessTypeDistribution || []
  return {
    title: {
      text: 'AI业务类型分布',
      left: 'center',
      textStyle: {
        fontSize: 14,
        color: '#333'
      }
    },
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      textStyle: {
        fontSize: 12
      }
    },
    series: [{
      name: '业务类型',
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      label: {
        show: false,
        position: 'center'
      },
      emphasis: {
        label: {
          show: true,
          fontSize: '18',
          fontWeight: 'bold'
        }
      },
      labelLine: {
        show: false
      },
      data: data.map((item, index) => ({
        value: item.count,
        name: getBusinessTypeName(item.type),
        itemStyle: {
          color: ['#409EFF', '#67C23A', '#E6A23C', '#F56C6C', '#909399'][index % 5]
        }
      }))
    }]
  }
})

// 格式化数字
const formatNumber = (num) => {
  if (!num) return '0'
  return num.toLocaleString()
}

// 格式化金额
const formatMoney = (amount) => {
  if (!amount) return '0.00'
  return Number(amount).toFixed(2)
}

// 格式化日期
const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now - date
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (days === 0) {
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours === 0) {
      const minutes = Math.floor(diff / (1000 * 60))
      return minutes <= 0 ? '刚刚' : `${minutes}分钟前`
    }
    return `${hours}小时前`
  } else if (days === 1) {
    return '昨天'
  } else if (days < 7) {
    return `${days}天前`
  } else {
    return date.toLocaleDateString()
  }
}

// 获取会员标签类型
const getMemberTagType = (memberType) => {
  const typeMap = {
    'vip': 'warning',
    'premium': 'success',
    'basic': 'info'
  }
  return typeMap[memberType] || 'info'
}

// 获取会员类型名称
const getMemberTypeName = (type) => {
  const typeMap = {
    'vip': 'VIP会员',
    'premium': '高级会员',
    'basic': '普通会员'
  }
  return typeMap[type] || type
}

// 获取业务类型名称
const getBusinessTypeName = (type) => {
  const typeMap = {
    'outline': 'AI大纲生成',
    'character': 'AI人物生成',
    'dialogue': 'AI对话生成',
    'plot': 'AI情节生成',
    'polish': 'AI文本润色',
    'creative': 'AI创意建议',
    'content': 'AI正文生成',
    'worldview': 'AI世界观生成',
    'book_analyze': 'AI拆书分析',
    'ai_chat': 'AI聊天对话',
    'short_story': 'AI短篇故事生成',
    'short_article': 'AI短文生成',
    'article': 'AI文章生成'
  }
  return typeMap[type] || type || '未知类型'
}

// 计算业务类型百分比
const getBusinessPercentage = (count) => {
  if (!dashboardData.value?.charts?.businessTypeDistribution) {
    return 0
  }
  const total = dashboardData.value.charts.businessTypeDistribution.reduce((sum, item) => sum + item.count, 0)
  return total > 0 ? (count / total * 100) : 0
}

// 加载仪表盘数据
const loadDashboardData = async () => {
  loading.value = true
  try {
    const response = await dashboardAPI.getAdminDashboard()
    // console.log('仪表盘数据加载中...', response)
    
    if (response && response.success === true && response.data) {
      // 更新数据
      Object.assign(dashboardData.value, response.data)
      console.log('仪表盘数据加载成功:', dashboardData.value)
    } else {
      ElMessage.error(response?.message || '加载数据失败')
    }
  } catch (error) {
    console.error('加载仪表盘数据失败:', error)
    ElMessage.error('加载数据失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

// 刷新数据
const refreshData = () => {
  loadDashboardData()
}

// 查看系统状态
const viewSystemStatus = async () => {
  try {
    const response = await dashboardAPI.getSystemStatus()
    if (response.success === true) {
      ElMessage.success('系统运行正常')
    }
  } catch (error) {
    ElMessage.error('获取系统状态失败')
  }
}

// 页面加载时获取数据
onMounted(() => {
  loadDashboardData()
})
</script>

<style scoped>
.admin-dashboard {
  padding: 24px;
  background-color: #f5f7fa;
  min-height: 100vh;
}



.section-title {
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 16px 0;
}

/* 概览部分 */
.overview-section {
  margin-bottom: 32px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
}

.stat-card {
  border: none;
  border-radius: 12px;
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
}

.stat-content {
  display: flex;
  align-items: center;
  padding: 8px;
}

.stat-icon {
  width: 64px;
  height: 64px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  font-size: 24px;
  color: white;
}

.user-icon {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.novel-icon {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.revenue-icon {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.ai-icon {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: #1f2937;
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: #6b7280;
  font-weight: 500;
  margin-bottom: 4px;
}

.stat-change {
  font-size: 12px;
  color: #9ca3af;
}

.stat-change.positive {
  color: #10b981;
}

/* 今日数据 */
.today-section {
  margin-bottom: 32px;
}

.today-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  padding: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.today-item {
  text-align: center;
  padding: 16px;
  border-radius: 8px;
  background: #f8fafc;
}

.today-value {
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 4px;
}

.today-label {
  font-size: 14px;
  color: #6b7280;
}

/* 图表部分 */
.charts-section {
  margin-bottom: 32px;
}

.chart-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 24px;
  margin-bottom: 24px;
}

.chart-row:last-child {
  margin-bottom: 0;
}

.chart-card {
  border: none;
  border-radius: 12px;
}

.chart-card.full-width {
  grid-column: 1 / -1;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chart-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.chart-content {
  padding: 16px 0;
}

.chart-stats {
  display: flex;
  gap: 24px;
  margin-bottom: 16px;
}

.chart-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.chart-stat .stat-label {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 4px;
}

.chart-stat .stat-value {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

.chart-placeholder {
  height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  background: #f8fafc;
  border-radius: 8px;
}

.chart-icon {
  font-size: 48px;
  margin-bottom: 8px;
  opacity: 0.5;
}

.chart-container {
  width: 100%;
  position: relative;
}

.chart {
  width: 100%;
  height: 100%;
}

/* AI业务统计 */
.ai-business-stats {
  padding: 16px 0;
}

.business-type {
  margin-bottom: 16px;
}

.business-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.business-name {
  font-size: 14px;
  color: #374151;
  font-weight: 500;
}

.business-count {
  font-size: 12px;
  color: #6b7280;
}

.business-bar {
  height: 8px;
  background: #f3f4f6;
  border-radius: 4px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #1d4ed8);
  transition: width 0.3s ease;
}

/* 活动部分 */
.activities-section {
  margin-bottom: 32px;
}

.activities-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
}

.activity-card {
  border: none;
  border-radius: 12px;
}

.activity-card .el-card__header {
  padding: 16px 20px;
  border-bottom: 1px solid #f3f4f6;
}

.activity-card h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.activity-list {
  max-height: 300px;
  overflow-y: auto;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: #9ca3af;
}

.empty-state .el-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.user-item, .work-item, .member-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  border-bottom: 1px solid #f3f4f6;
}

.user-item:last-child, .work-item:last-child, .member-item:last-child {
  border-bottom: none;
}

.user-info, .work-info, .member-info {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.user-name, .work-title, .member-type {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 4px;
}

.work-author {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 4px;
}

.user-time, .work-time, .member-count {
  font-size: 12px;
  color: #9ca3af;
}

/* 系统状态 */
.system-status {
  padding: 16px 20px;
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f3f4f6;
}

.status-item:last-child {
  border-bottom: none;
}

.status-label {
  font-size: 14px;
  color: #374151;
}

.status-value {
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
}

@media (max-width: 768px) {
  .admin-dashboard {
    padding: 16px;
  }
  
  .page-header {
    flex-direction: column;
    gap: 16px;
  }
  
  .header-actions {
    width: 100%;
    justify-content: flex-start;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .today-stats {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .chart-row {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .chart-container {
    height: 200px !important;
  }
  
  .activities-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .stat-content {
    flex-direction: column;
    text-align: center;
  }
  
  .stat-icon {
    margin-right: 0;
    margin-bottom: 12px;
  }
}

@media (max-width: 480px) {
  .today-stats {
    grid-template-columns: 1fr;
  }
  
  .chart-container {
    height: 180px !important;
  }
  
  .chart-header {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }
  
  .chart-stats {
    flex-direction: column;
    gap: 12px;
  }
  
  .stat-value {
    font-size: 24px;
  }
}
</style>