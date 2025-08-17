<template>
  <div class="dashboard">
    <!-- 用户信息头部 -->
    <div class="dashboard-header">
      <div class="user-welcome">
        <div class="welcome-content">
          <div class="welcome-left">
            <div class="greeting">
              <h1>👋 你好, {{ dashboardData.user?.nickname || dashboardData.user?.username || 'Guest' }}!</h1>
              <p>今天是 {{ currentDate }}</p>
            </div>
            <div class="user-stats">
              <div class="stat-item">
                <span class="stat-label">会员等级</span>
                <el-tag :type="getMemberTagType(dashboardData.membership?.currentLevel)" size="small" class="member-tag">
                  <el-icon><Star /></el-icon>
                  {{ dashboardData.membership?.currentPackage || '普通用户' }}
                </el-tag>
              </div>
              <div class="stat-item">
                <span class="stat-label">可用积分</span>
                <span class="credits-value">{{ dashboardData.membership?.remainingCredits || 0 }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">登录次数</span>
                <span class="login-count">{{ dashboardData.statistics?.totalLogins || 0 }}</span>
              </div>
              <!-- <div class="stat-item">
                <span class="stat-label">邀请用户</span>
                <span class="invite-count">{{ dashboardData.statistics?.totalInvites || 0 }}</span>
              </div> -->
            </div>
          </div>
          <div class="welcome-right">
            <div class="user-avatar-container">
              <el-avatar :size="80" :src="dashboardData.user?.avatar" class="user-avatar">
                <el-icon size="40"><User /></el-icon>
              </el-avatar>
              <div v-if="dashboardData.membership?.currentLevel && dashboardData.membership?.currentLevel !== 'basic'" 
                   class="avatar-badge" 
                   :class="getBadgeClass(dashboardData.membership?.currentLevel)">
                {{ getBadgeText(dashboardData.membership?.currentLevel) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-grid">
      <div class="stat-card blue-card">
        <div class="stat-header">
          <div class="stat-icon">
            <el-icon size="24"><Reading /></el-icon>
          </div>
          <div class="stat-trend">
            <el-icon size="16"><TrendCharts /></el-icon>
          </div>
        </div>
        <div class="stat-content">
          <div class="stat-title">长篇小说</div>
          <div class="stat-number">{{ dashboardData.statistics?.totalNovels || 0 }}</div>
          <div class="stat-subtitle">本周新增</div>
          <div class="stat-change">{{ dashboardData.weeklyStats?.novelsCreated || 0 }}</div>
        </div>
      </div>

      <div class="stat-card green-card">
        <div class="stat-header">
          <div class="stat-icon">
            <el-icon size="24"><Edit /></el-icon>
          </div>
          <div class="stat-trend">
            <el-icon size="16"><TrendCharts /></el-icon>
          </div>
        </div>
        <div class="stat-content">
          <div class="stat-title">短篇作品</div>
          <div class="stat-number">{{ dashboardData.statistics?.totalShortStories || 0 }}</div>
          <div class="stat-subtitle">本周新增</div>
          <div class="stat-change">{{ dashboardData.weeklyStats?.shortStoriesCreated || 0 }}</div>
        </div>
      </div>

      <div class="stat-card orange-card">
        <div class="stat-header">
          <div class="stat-icon">
            <el-icon size="24"><ChatDotRound /></el-icon>
          </div>
          <div class="stat-trend">
            <el-icon size="16"><TrendCharts /></el-icon>
          </div>
        </div>
        <div class="stat-content">
          <div class="stat-title">总作品数</div>
          <div class="stat-number">{{ dashboardData.statistics?.totalWorks || 0 }}</div>
          <div class="stat-subtitle">总字数</div>
          <div class="stat-change">{{ formatWordCount(dashboardData.statistics?.totalWordCount) }}</div>
        </div>
      </div>

      <div class="stat-card pink-card">
        <div class="stat-header">
          <div class="stat-icon">
            <el-icon size="24"><Tools /></el-icon>
          </div>
          <div class="stat-trend">
            <el-icon size="16"><TrendCharts /></el-icon>
          </div>
        </div>
        <div class="stat-content">
          <div class="stat-title">AI调用次数</div>
          <div class="stat-number">{{ dashboardData.statistics?.totalAiUsage || 0 }}</div>
          <div class="stat-subtitle">本周调用</div>
          <div class="stat-change">{{ dashboardData.weeklyStats?.aiCallsMade || 0 }}</div>
        </div>
      </div>
    </div>

    <!-- 数据图表 -->
    <div class="charts-section">
      <el-row :gutter="24">
        <el-col :span="12">
          <div class="chart-card">
            <div class="chart-header">
              <div class="chart-title">
                <h3>Ai调用趋势分析</h3>
                <p>过去7天</p>
              </div>
              <div class="chart-actions">
                <!-- <el-button type="text" size="small">查看更多</el-button> -->
              </div>
            </div>
            <div class="chart-container">
              <div v-if="!dashboardData.charts?.aiCallTrend?.length" class="chart-placeholder">
                <el-icon><TrendCharts /></el-icon>
                <p>{{ $t('common.noData') }}</p>
              </div>
              <div v-else class="chart-container" style="height: 250px;">
                <v-chart class="chart" :option="aiCallTrendOption" autoresize />
              </div>
            </div>
          </div>
        </el-col>
        <el-col :span="12">
          <div class="chart-card">
            <div class="chart-header">
              <div class="chart-title">
                <h3>调用类型分布</h3>
                <p>总统计</p>
              </div>
              <div class="chart-actions">
                <!-- <el-button type="text" size="small">查看更多</el-button> -->
              </div>
            </div>
            <div class="chart-container">
              <div v-if="!dashboardData.charts?.businessTypeDistribution?.length" class="chart-placeholder">
                <el-icon><PieChart /></el-icon>
                <p>{{ $t('common.noData') }}</p>
              </div>
              <div v-else class="chart-container" style="height: 250px;">
                <v-chart class="chart" :option="businessTypeOption" autoresize />
              </div>
            </div>
          </div>
        </el-col>
      </el-row>
    </div>

    <!-- 最近作品 -->
    <div class="recent-works">
      <el-row :gutter="20">
        <el-col :span="12">
          <el-card class="works-card" shadow="hover">
            <template #header>
              <div class="card-header">
                <span>最近长篇小说</span>
                <el-button type="text" size="small" @click="navigateTo('/client/novels')">查看全部</el-button>
              </div>
            </template>
            <div class="works-list">
              <div v-if="!dashboardData.recentWorks?.novels?.length" class="empty-state">
                <el-icon><Reading /></el-icon>
                <p>暂无长篇小说</p>
                <el-button type="primary" size="small" @click="navigateTo('/client/novels')">创建新小说</el-button>
              </div>
              <div v-else>
                <div 
                  v-for="novel in dashboardData.recentWorks.novels" 
                  :key="novel.id"
                  class="work-item"
                  @click="navigateTo(`/client/novels/${novel.id}/edit`)"
                >
                  <div class="work-info">
                    <h4>{{ novel.title }}</h4>
                    <p>{{ formatWordCount(novel.current_word_count) }} 字 · {{ getStatusText(novel.status) }}</p>
                    <span class="work-time">{{ formatDate(novel.updated_at) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="12">
          <el-card class="works-card" shadow="hover">
            <template #header>
              <div class="card-header">
                <span>最近短篇作品</span>
                <el-button type="text" size="small" @click="navigateTo('/client/short-story')">查看全部</el-button>
              </div>
            </template>
            <div class="works-list">
              <div v-if="!dashboardData.recentWorks?.shortStories?.length" class="empty-state">
                <el-icon><Edit /></el-icon>
                <p>暂无短篇作品</p>
                <el-button type="primary" size="small" @click="navigateTo('/client/short-story')">开始创作</el-button>
              </div>
              <div v-else>
                <div 
                  v-for="story in dashboardData.recentWorks.shortStories" 
                  :key="story.id"
                  class="work-item"
                  @click="navigateTo(`/client/short-story/${story.id}`)"
                >
                  <div class="work-info">
                    <h4>{{ story.title }}</h4>
                    <p>{{ formatWordCount(story.word_count) }} 字 · {{ getShortStoryTypeName(story.type) }}</p>
                    <span class="work-time">{{ formatDate(story.updated_at) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 快速操作 -->
    <div class="quick-actions">
      <h2>快速操作</h2>
      <div class="actions-grid">
        <el-card class="action-card" shadow="hover" @click="navigateTo('/client/novels')">
          <div class="action-content">
            <el-icon size="24"><Reading /></el-icon>
            <h3>创建新小说</h3>
            <p>开始您的新作品</p>
          </div>
        </el-card>

        <el-card class="action-card" shadow="hover" @click="navigateTo('/client/short-story')">
          <div class="action-content">
            <el-icon size="24"><Edit /></el-icon>
            <h3>短文写作</h3>
            <p>快速创作短篇内容</p>
          </div>
        </el-card>

        <el-card class="action-card" shadow="hover" @click="navigateTo('/client/prompts')">
          <div class="action-content">
            <el-icon size="24"><ChatDotRound /></el-icon>
            <h3>浏览提示词</h3>
            <p>发现创作灵感</p>
          </div>
        </el-card>

        <el-card class="action-card" shadow="hover" @click="navigateTo('/client/tools')">
          <div class="action-content">
            <el-icon size="24"><Tools /></el-icon>
            <h3>使用工具</h3>
            <p>提升创作效率</p>
          </div>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { dashboardAPI } from '@/api'
import { ElMessage, ElLoading } from 'element-plus'
import { useI18n } from 'vue-i18n'
import {
  Reading,
  Edit,
  ChatDotRound,
  Tools,
  User,
  Star,
  TrendCharts,
  PieChart
} from '@element-plus/icons-vue'

// ECharts 相关导入
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, PieChart as EChartsPieChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
} from 'echarts/components'
import VChart from 'vue-echarts'

// 注册 ECharts 组件
use([
  CanvasRenderer,
  LineChart,
  EChartsPieChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
])

const router = useRouter()
const userStore = useUserStore()
const { t: $t } = useI18n()

// 仪表盘数据
const dashboardData = ref({
  user: {},
  membership: {},
  statistics: {},
  weeklyStats: {},
  charts: {
    aiCallTrend: [],
    businessTypeDistribution: []
  },
  recentWorks: {
    novels: [],
    shortStories: []
  }
})

const loading = ref(false)

// 当前日期
const currentDate = computed(() => {
  return new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  })
})

// 获取会员标签类型
const getMemberTagType = (level) => {
  const typeMap = {
    'basic': '',
    'premium': 'warning',
    'vip': 'success'
  }
  return typeMap[level] || ''
}

// 获取徽章样式类
const getBadgeClass = (level) => {
  const classMap = {
    'premium': 'badge-premium',
    'vip': 'badge-vip'
  }
  return classMap[level] || ''
}

// 获取徽章文本
const getBadgeText = (level) => {
  const textMap = {
    'premium': 'PRO',
    'vip': 'VIP'
  }
  return textMap[level] || ''
}

// 格式化数字
const formatNumber = (num) => {
  if (!num) return '0'
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + 'W'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

// 格式化字数
const formatWordCount = (count) => {
  if (!count) return '0'
  return formatNumber(count)
}

// 格式化日期
const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now - date
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (days === 0) {
    return '今天'
  } else if (days === 1) {
    return '昨天'
  } else if (days < 7) {
    return `${days}天前`
  } else {
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric'
    })
  }
}

// 获取状态文本
const getStatusText = (status) => {
  const statusMap = {
    'draft': '草稿',
    'writing': '创作中',
    'completed': '已完成',
    'published': '已发布',
    'planning': '策划中'
  }
  return statusMap[status] || status
}

// 获取业务类型名称
const getBusinessTypeName = (type) => {
  const typeMap = {
    'ai_chat': 'AI对话',
    'short_article': '短文写作',
    'short_story': '短篇小说',
    'general': '通用功能',
    'outline': '大纲生成',
    'character': '人物生成',
    'dialogue': '对话生成',
    'plot': '情节生成',
    'polish': '文本润色',
    'creative': '创意建议',
    'content': '正文生成',
    'worldview': '世界观生成',
    'book_analyze': '拆书分析'
  }
  return typeMap[type] || type
}

// 获取短篇作品类型名称
const getShortStoryTypeName = (type) => {
  const typeMap = {
    'short_novel': '短篇小说',
    'article': '文章',
    'poem': '诗歌',
    'script': '剧本'
  }
  return typeMap[type] || type
}

// 导航到指定页面
const navigateTo = (path) => {
  router.push(path)
}

// 加载仪表盘数据
const loadDashboardData = async () => {
  loading.value = true
  try {
    const response = await dashboardAPI.getUserDashboard()
    if (response.success) {
      dashboardData.value = response.data
    } else {
      ElMessage.error(response.message || '获取仪表盘数据失败')
    }
  } catch (error) {
    console.error('加载仪表盘数据失败:', error)
    ElMessage.error('获取仪表盘数据失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

// AI调用趋势图表配置
const aiCallTrendOption = computed(() => {
  const data = dashboardData.value.charts?.aiCallTrend || []
  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#e5e7eb',
      borderWidth: 1,
      textStyle: {
        color: '#374151',
        fontSize: 12
      },
      extraCssText: 'border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);'
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: data.map(item => item.date),
      axisLine: {
        lineStyle: {
          color: '#e5e7eb'
        }
      },
      axisTick: {
        show: false
      },
      axisLabel: {
        color: '#6b7280',
        fontSize: 12
      }
    },
    yAxis: {
      type: 'value',
      axisLine: {
        show: false
      },
      axisTick: {
        show: false
      },
      axisLabel: {
        color: '#6b7280',
        fontSize: 12
      },
      splitLine: {
        lineStyle: {
          color: '#f3f4f6',
          type: 'dashed'
        }
      }
    },
    series: [{
      data: data.map(item => item.count),
      type: 'line',
      smooth: true,
      lineStyle: {
        width: 3,
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 1,
          y2: 0,
          colorStops: [
            { offset: 0, color: '#667eea' },
            { offset: 1, color: '#764ba2' }
          ]
        }
      },
      itemStyle: {
        color: '#667eea',
        borderWidth: 2,
        borderColor: '#ffffff'
      },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(102, 126, 234, 0.3)' },
            { offset: 1, color: 'rgba(102, 126, 234, 0.05)' }
          ]
        }
      },
      symbol: 'circle',
      symbolSize: 6
    }]
  }
})

// 业务类型分布图表配置
const businessTypeOption = computed(() => {
  const data = dashboardData.value.charts?.businessTypeDistribution || []
  const colors = [
    '#667eea', '#764ba2', '#f093fb', '#f5576c',
    '#4facfe', '#00f2fe', '#43e97b', '#38f9d7',
    '#fa709a', '#fee140', '#a8edea', '#fed6e3'
  ]
  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#e5e7eb',
      borderWidth: 1,
      textStyle: {
        color: '#374151',
        fontSize: 12
      },
      extraCssText: 'border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);',
      formatter: '{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      right: '10%',
      top: 'center',
      textStyle: {
        color: '#6b7280',
        fontSize: 12
      },
      itemWidth: 12,
      itemHeight: 12,
      itemGap: 8
    },
    series: [{
      name: '业务类型',
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['35%', '50%'],
      data: data.map((item, index) => ({
        value: item.count,
        name: getBusinessTypeName(item.type),
        itemStyle: {
          color: colors[index % colors.length],
          borderWidth: 2,
          borderColor: '#ffffff'
        }
      })),
      emphasis: {
        itemStyle: {
          shadowBlur: 15,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.2)'
        },
        scaleSize: 5
      },
      labelLine: {
        show: false
      },
      label: {
        show: false
      }
    }]
  }
})

onMounted(() => {
  loadDashboardData()
})
</script>

<style scoped>
.dashboard {
  width: 100%;
  margin: 0;
  padding: 20px;
  background: transparent;
  color: #495057;
}

.dashboard-header {
  margin-bottom: 30px;
}

.user-welcome {
  background: #ffffff;
  border-radius: 16px;
  padding: 32px;
  color: #1f2937;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  margin-bottom: 32px;
  border: 1px solid #f0f2f5;
}

.welcome-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.welcome-left {
  flex: 1;
}

.greeting h1 {
  font-size: 32px;
  font-weight: 700;
  margin: 0 0 8px 0;
  line-height: 1.2;
  color: #1f2937;
}

.greeting p {
  font-size: 16px;
  color: #6b7280;
  margin: 0 0 24px 0;
}

.user-stats {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stat-label {
  font-size: 14px;
  color: #6b7280;
  font-weight: 500;
}

.member-tag {
  background: #10b981 !important;
  border: none !important;
  color: white !important;
  font-weight: 600;
}

.credits-value {
  font-size: 20px;
  font-weight: 700;
  color: #f59e0b;
}

.login-count {
  font-size: 18px;
  font-weight: 600;
  color: #10b981;
}

.invite-count {
  font-size: 18px;
  font-weight: 600;
  color: #8b5cf6;
}

.welcome-right {
  position: relative;
}

.user-avatar-container {
  position: relative;
  display: inline-block;
}

.user-avatar {
  background: #f3f4f6;
  border: 3px solid #e5e7eb;
}

.avatar-badge {
  position: absolute;
  bottom: -4px;
  right: -4px;
  background: #f59e0b;
  color: white;
  font-size: 12px;
  font-weight: 700;
  padding: 4px 8px;
  border-radius: 12px;
  border: 2px solid white;
}

.badge-premium {
  background: #f59e0b !important;
}

.badge-vip {
  background: #10b981 !important;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
  margin-bottom: 30px;
}

.stat-card {
  border-radius: 16px;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  background: white;
  border: 1px solid #f0f2f5;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
}

.blue-card .stat-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.green-card .stat-header {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.orange-card .stat-header {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.pink-card .stat-header {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.stat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  color: white;
  position: relative;
  border-radius: 16px 16px 0 0;
}

.stat-header::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: rgba(0, 0, 0, 0.1);
}

.stat-icon {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-trend {
  opacity: 0.7;
}

.stat-content {
  display: flex;
  flex-direction: column;
  padding: 24px;
  background: white;
  color: #1f2937;
}

.stat-title {
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 8px;
  font-weight: 500;
}

.stat-number {
  font-size: 32px;
  font-weight: bold;
  margin-bottom: 12px;
  line-height: 1;
  color: #1f2937;
}

.stat-subtitle {
  font-size: 12px;
  color: #9ca3af;
  margin-bottom: 4px;
}

.stat-change {
  font-size: 16px;
  font-weight: 600;
  color: #374151;
}

.charts-section {
  margin-bottom: 30px;
}

.chart-card {
  background: #ffffff;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  border: 1px solid #f0f2f5;
}

.chart-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.chart-title h3 {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 4px 0;
}

.chart-title p {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

.chart-actions {
  display: flex;
  align-items: center;
}

.chart-container {
  height: 300px;
  position: relative;
}

.chart-container {
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chart-placeholder {
  text-align: center;
  padding: 40px 20px;
  color: #999;
}

.chart-placeholder .el-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.chart-placeholder p {
  margin: 0;
}

.chart-container {
  width: 100%;
  position: relative;
}

.chart {
  width: 100%;
  height: 100%;
}

.trend-list {
  width: 100%;
}

.trend-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.trend-item:last-child {
  border-bottom: none;
}

.trend-date {
  font-size: 14px;
  color: #666;
}

.trend-count {
  font-weight: 600;
  color: #409eff;
}

.business-type-list {
  width: 100%;
}

.business-type-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.business-type-item:last-child {
  border-bottom: none;
}

.type-name {
  font-size: 14px;
  color: #333;
}

.type-count {
  font-weight: 600;
  color: #67c23a;
}

.recent-works {
  margin-bottom: 30px;
}

.works-card {
  background: #ffffff;
  border: 1px solid #e9ecef;
  border-radius: 12px;
  color: #495057;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.2s;
}

.works-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.works-list {
  max-height: 300px;
  overflow-y: auto;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #999;
}

.empty-state .el-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.empty-state p {
  margin: 0 0 16px 0;
}

.work-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f1f3f4;
  cursor: pointer;
  transition: all 0.2s;
}

.work-item:hover {
  background: #f8f9fa;
  border-radius: 4px;
  padding-left: 8px;
}

.work-item:last-child {
  border-bottom: none;
}

.work-info h4 {
  font-size: 16px;
  color: #333;
  margin: 0 0 8px 0;
  font-weight: 600;
}

.work-info p {
  font-size: 14px;
  color: #666;
  margin: 0 0 8px 0;
}

.work-time {
  font-size: 12px;
  color: #999;
}

.quick-actions {
  margin-bottom: 30px;
}

.quick-actions h2 {
  font-size: 20px;
  color: #333;
  margin: 0 0 20px 0;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.action-card {
  background: #ffffff;
  border: 1px solid #e9ecef;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  color: #495057;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.action-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.action-content {
  text-align: center;
  padding: 8px;
}

.action-content .el-icon {
  color: #409eff;
  margin-bottom: 12px;
}

.action-content h3 {
  font-size: 16px;
  color: #333;
  margin: 0 0 8px 0;
}

.action-content p {
  color: #666;
  margin: 0;
  font-size: 14px;
}

@media (max-width: 768px) {
  .dashboard {
    padding: 16px;
  }
  
  .welcome-content {
    flex-direction: column;
    text-align: center;
    gap: 16px;
  }
  
  .user-stats {
    justify-content: center;
    gap: 16px;
  }
  
  .stat-item {
    min-width: 80px;
  }
  
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }
  
  .chart-container {
    height: 200px !important;
  }
  
  .actions-grid {
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  }
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .chart-container {
    height: 180px !important;
  }
  
  .card-header {
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
  }
}
</style>