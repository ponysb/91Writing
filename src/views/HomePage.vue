<template>
  <div class="home-page">
    <!-- ========== 文学封面区 ========== -->
    <section class="hero">
      <div class="hero-paper">
        <div class="hero-rule"></div>
        <div class="hero-meta">
          <span class="meta-date">{{ todayLabel }}</span>
          <span class="meta-divider">·</span>
          <span class="meta-issue">第 {{ issueNumber }} 期</span>
        </div>
        <h1 class="hero-title">
          <span class="hero-glyph">墨</span>
          <span class="hero-title-text">落笔成章，<em>今日方始</em></span>
        </h1>
        <p class="hero-subtitle">
          以 AI 为砚，以文字为墨。让每一行思绪皆有归处。
        </p>
        <div class="hero-actions">
          <button class="btn-primary" @click="createNovel">
            <el-icon><Plus /></el-icon>
            <span>开卷新章</span>
          </button>
          <button class="btn-ghost" @click="openExportDialog">
            <el-icon><Download /></el-icon>
            <span>导出作品集</span>
          </button>
        </div>
      </div>
      <div class="hero-ornament" aria-hidden="true">
        <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
          <circle cx="100" cy="100" r="78" fill="none" stroke="currentColor" stroke-width="0.6" opacity="0.4"/>
          <circle cx="100" cy="100" r="58" fill="none" stroke="currentColor" stroke-width="0.4" opacity="0.3"/>
          <path d="M100 30 L108 100 L100 170 L92 100 Z" fill="currentColor" opacity="0.18"/>
          <circle cx="100" cy="100" r="6" fill="currentColor" opacity="0.7"/>
        </svg>
      </div>
    </section>

    <!-- ========== 统计印谱 ========== -->
    <section class="stats">
      <div
        v-for="(item, idx) in statItems"
        :key="item.key"
        class="stat-card"
        :style="{ animationDelay: (idx * 60) + 'ms' }"
      >
        <div class="stat-icon-wrap">
          <el-icon><component :is="item.icon" /></el-icon>
        </div>
        <div class="stat-body">
          <div class="stat-number">
            <span class="num">{{ item.display }}</span>
            <span class="unit">{{ item.unit }}</span>
          </div>
          <div class="stat-label">{{ item.label }}</div>
        </div>
        <div class="stat-stamp">{{ item.seal }}</div>
      </div>
    </section>

    <!-- ========== 双栏：写作目标 / 快速操作 ========== -->
    <section class="duo-grid">
      <!-- 写作目标 -->
      <article class="panel goals-panel">
        <header class="panel-head">
          <div class="panel-title">
            <span class="panel-idx">壹</span>
            <h3>今日写作目标</h3>
          </div>
          <button class="link-btn" @click="showGoalsDialog = true">
            管理目标<el-icon><ArrowRight /></el-icon>
          </button>
        </header>
        <div class="panel-body">
          <div
            v-for="goal in displayedGoals"
            :key="goal.id"
            class="goal-row"
          >
            <div class="goal-head">
              <span class="goal-name">{{ goal.title }}</span>
              <span class="goal-count">
                {{ goal.currentValue }}<em>/</em>{{ goal.targetValue }}{{ goal.unit }}
              </span>
            </div>
            <div class="goal-bar">
              <div
                class="goal-bar-inner"
                :style="{ width: getGoalProgress(goal) + '%', background: progressGradient(getGoalProgress(goal)) }"
              ></div>
            </div>
          </div>

          <div v-if="displayedGoals.length === 0" class="empty-goals">
            <el-icon class="empty-icon"><Aim /></el-icon>
            <p>尚未立下目标</p>
            <button class="link-btn" @click="showGoalsDialog = true">立下第一志<el-icon><ArrowRight /></el-icon></button>
          </div>

          <div v-if="totalActiveGoals > maxDisplayGoals" class="view-all">
            <button class="link-btn" @click="showGoalsDialog = true">
              查看全部 {{ totalActiveGoals }} 项目标<el-icon><ArrowRight /></el-icon>
            </button>
          </div>
        </div>
      </article>

      <!-- 快速操作 -->
      <article class="panel actions-panel">
        <header class="panel-head">
          <div class="panel-title">
            <span class="panel-idx">贰</span>
            <h3>快捷入口</h3>
          </div>
        </header>
        <div class="panel-body action-grid">
          <button
            v-for="act in quickActions"
            :key="act.key"
            class="action-tile"
            @click="act.handler"
          >
            <div class="action-icon-wrap">
              <el-icon><component :is="act.icon" /></el-icon>
            </div>
            <span class="action-label">{{ act.label }}</span>
            <span class="action-sub">{{ act.sub }}</span>
          </button>
        </div>
      </article>
    </section>

    <!-- ========== 最近书架 ========== -->
    <section class="shelf">
      <header class="shelf-head">
        <div class="shelf-title">
          <span class="panel-idx">叁</span>
          <h3>案头新作</h3>
          <span class="shelf-tip">最近编辑</span>
        </div>
        <button class="link-btn" @click="viewAllNovels">
          全部作品<el-icon><ArrowRight /></el-icon>
        </button>
      </header>

      <div v-if="recentNovels.length > 0" class="shelf-grid">
        <article
          v-for="novel in recentNovels"
          :key="novel.id"
          class="book-card"
          @click="openNovel(novel)"
        >
          <div class="book-spine" :style="{ background: spineColor(novel.id) }">
            <span class="spine-text">{{ novel.title.charAt(0) }}</span>
          </div>
          <div class="book-body">
            <h4 class="book-title">{{ novel.title }}</h4>
            <p class="book-desc">{{ novel.description || '尚未填写简介，留待日后细品。' }}</p>
            <div class="book-meta">
              <span class="meta-pill">
                <el-icon><EditPen /></el-icon>
                {{ formatNumber(novel.wordCount) }} 字
              </span>
              <span class="meta-pill">{{ formatTime(novel.updatedAt) }}</span>
            </div>
          </div>
        </article>
      </div>

      <div v-else class="shelf-empty">
        <el-icon class="empty-icon"><Reading /></el-icon>
        <p class="empty-title">书架空空，待君落笔</p>
        <p class="empty-tip">点击「开卷新章」开始创作第一部作品</p>
        <button class="btn-primary small" @click="createNovel">
          <el-icon><Plus /></el-icon>
          <span>开始创作</span>
        </button>
      </div>
    </section>

    <!-- 写作目标管理对话框 -->
    <el-dialog v-model="showGoalsDialog" title="写作目标管理" width="800px">
      <WritingGoals @close="showGoalsDialog = false" />
    </el-dialog>

    <!-- 导出作品集对话框 -->
    <el-dialog
      v-model="showExportDialog"
      title="导出作品集"
      width="640px"
      class="export-dialog"
    >
      <ExportPortfolio
        v-if="showExportDialog"
        :novels="allNovels"
        @close="showExportDialog = false"
      />
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useNovelStore } from '@/stores/novel'
import {
  Plus, EditPen, Notebook, CreditCard,
  ChatLineSquare, Aim, ArrowRight, Download, Reading
} from '@element-plus/icons-vue'
import WritingGoals from '@/components/WritingGoals.vue'
import ExportPortfolio from '@/components/ExportPortfolio.vue'
import billingService from '@/services/billing.js'

const router = useRouter()
const novelStore = useNovelStore()

const showGoalsDialog = ref(false)
const showExportDialog = ref(false)

const todayLabel = computed(() => {
  const d = new Date()
  const weeks = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日 · ${weeks[d.getDay()]}`
})

const issueNumber = computed(() => {
  const start = new Date('2025-01-01')
  const diff = Math.floor((Date.now() - start.getTime()) / (1000 * 60 * 60 * 24))
  return diff + 1
})

const stats = computed(() => {
  const novelsData = JSON.parse(localStorage.getItem('novels') || '[]')
  const usageStats = billingService.getUsageStats()
  const totalNovels = novelsData.length
  const totalWords = novelsData.reduce((sum, novel) => sum + (novel.wordCount || 0), 0)
  const totalChapters = novelsData.reduce((sum, novel) => sum + ((novel.chapterList || []).length), 0)
  const totalTokens = usageStats.totalInputTokens + usageStats.totalOutputTokens
  return { totalNovels, totalWords, totalChapters, totalTokens }
})

const statItems = computed(() => [
  { key: 'novels', label: '作品卷数', value: stats.value.totalNovels, unit: '部', seal: '卷', icon: Notebook, display: stats.value.totalNovels },
  { key: 'words', label: '墨字累计', value: stats.value.totalWords, unit: '字', seal: '字', icon: EditPen, display: formatNumber(stats.value.totalWords) },
  { key: 'chapters', label: '已成章回', value: stats.value.totalChapters, unit: '回', seal: '回', icon: ChatLineSquare, display: stats.value.totalChapters },
  { key: 'tokens', label: '已用算符', value: stats.value.totalTokens, unit: 'tok', seal: '符', icon: CreditCard, display: formatNumber(stats.value.totalTokens) }
])

const allNovels = computed(() => JSON.parse(localStorage.getItem('novels') || '[]'))

const goalsRefreshTrigger = ref(0)
const maxDisplayGoals = ref(3)

const activeGoals = computed(() => {
  goalsRefreshTrigger.value
  const goalsData = JSON.parse(localStorage.getItem('writingGoals') || '[]')
  const active = goalsData.filter(goal => goal.status === 'active')
  return active.sort((a, b) => {
    if (a.priority !== undefined && b.priority !== undefined) return a.priority - b.priority
    if (a.priority !== undefined) return -1
    if (b.priority !== undefined) return 1
    return new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
  })
})

const displayedGoals = computed(() => activeGoals.value.slice(0, maxDisplayGoals.value))
const totalActiveGoals = computed(() => activeGoals.value.length)

const recentNovels = computed(() => {
  const novelsData = JSON.parse(localStorage.getItem('novels') || '[]')
  return novelsData
    .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
    .slice(0, 4)
    .map(novel => ({
      id: novel.id,
      title: novel.title,
      description: novel.description,
      wordCount: novel.wordCount || 0,
      updatedAt: new Date(novel.updatedAt || Date.now())
    }))
})

const quickActions = [
  { key: 'prompts', label: '提示词库', sub: '取辞采句', icon: ChatLineSquare, handler: () => router.push('/prompts') },
  { key: 'chapters', label: '章节管理', sub: '排次章回', icon: Notebook, handler: () => router.push('/chapters') },
  { key: 'billing', label: '算符计费', sub: '查勘用度', icon: CreditCard, handler: () => router.push('/billing') },
  { key: 'goals', label: '写作目标', sub: '立志笃行', icon: Aim, handler: () => router.push('/goals') }
]

const getGoalProgress = (goal) => {
  if (!goal.targetValue || goal.targetValue === 0) return 0
  return Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100))
}

const progressGradient = (p) => {
  if (p >= 100) return 'linear-gradient(90deg, #5a7a4a, #7a9a6a)'
  if (p >= 60) return 'linear-gradient(90deg, #9a5b2e, #b36a35)'
  return 'linear-gradient(90deg, #b8762d, #d49a4a)'
}

const spineColors = [
  'linear-gradient(180deg, #9a5b2e 0%, #6b3f1f 100%)',
  'linear-gradient(180deg, #5a6a7a 0%, #3a4a5a 100%)',
  'linear-gradient(180deg, #6a4a3a 0%, #4a3a2a 100%)',
  'linear-gradient(180deg, #7a5a4a 0%, #5a4a3a 100%)'
]
const spineColor = (id) => spineColors[(id || 0) % spineColors.length]

const formatNumber = (num) => {
  if (num >= 10000) return (num / 10000).toFixed(1) + '万'
  return (num || 0).toLocaleString()
}

const formatTime = (date) => {
  const now = new Date()
  const diff = now - date
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(hours / 24)
  if (days > 0) return `${days} 日前`
  if (hours > 0) return `${hours} 时辰前`
  return '方才'
}

const createNovel = () => router.push('/novels')
const openNovel = (novel) => router.push(`/writer?novelId=${novel.id}`)
const viewAllNovels = () => router.push('/novels')
const openExportDialog = () => { showExportDialog.value = true }

const refreshData = () => { goalsRefreshTrigger.value++ }
window.refreshHomeData = refreshData

const onStorage = (e) => { if (e.key === 'writingGoals' || e.key === 'novels') refreshData() }
const onVisibility = () => { if (!document.hidden) refreshData() }

onMounted(() => {
  window.addEventListener('storage', onStorage)
  document.addEventListener('visibilitychange', onVisibility)
})
onUnmounted(() => {
  window.removeEventListener('storage', onStorage)
  document.removeEventListener('visibilitychange', onVisibility)
})
</script>

<style scoped>
.home-page {
  max-width: 1280px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 26px;
}

/* ============ Hero 封面区 ============ */
.hero {
  position: relative;
  background: var(--bg-surface);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  display: flex;
  align-items: center;
  min-height: 220px;
}

.hero-paper {
  flex: 1;
  padding: 36px 44px;
  position: relative;
  background-image:
    radial-gradient(circle at 10% 20%, rgba(154, 91, 46, 0.05) 0%, transparent 40%),
    linear-gradient(180deg, transparent 0%, rgba(246, 241, 232, 0.4) 100%);
}

.hero-rule {
  position: absolute;
  left: 44px;
  right: 44px;
  top: 28px;
  height: 1px;
  background: linear-gradient(90deg, var(--accent), transparent);
}

.hero-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  letter-spacing: 0.18em;
  color: var(--text-placeholder);
  text-transform: uppercase;
  margin-bottom: 18px;
  margin-top: 12px;
}

.meta-divider { color: var(--border-strong); }

.hero-title {
  font-family: var(--font-display);
  font-size: 44px;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.1;
  display: flex;
  align-items: center;
  gap: 18px;
  margin: 0 0 12px 0;
  letter-spacing: 0.01em;
}

.hero-title em {
  font-style: italic;
  color: var(--accent);
  font-weight: 500;
}

.hero-glyph {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 12px;
  background: var(--accent-gradient);
  color: #fff;
  font-family: var(--font-serif);
  font-size: 28px;
  font-weight: 700;
  box-shadow: 0 6px 18px rgba(154, 91, 46, 0.32);
  flex-shrink: 0;
}

.hero-title-text {
  font-family: var(--font-serif);
}

.hero-subtitle {
  font-size: 15px;
  color: var(--text-secondary);
  margin: 0 0 26px 0;
  line-height: 1.6;
  max-width: 560px;
}

.hero-actions {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 11px 22px;
  background: var(--accent-gradient);
  color: #fff;
  border: none;
  border-radius: var(--radius-pill);
  font-family: var(--font-sans);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: all 0.25s var(--ease);
  box-shadow: 0 6px 16px rgba(154, 91, 46, 0.28);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 24px rgba(154, 91, 46, 0.36);
}

.btn-primary.small {
  padding: 9px 18px;
  font-size: 13px;
}

.btn-ghost {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 11px 22px;
  background: transparent;
  color: var(--accent);
  border: 1px solid var(--accent);
  border-radius: var(--radius-pill);
  font-family: var(--font-sans);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.25s var(--ease);
}

.btn-ghost:hover {
  background: var(--accent-soft);
  transform: translateY(-1px);
}

.hero-ornament {
  width: 220px;
  height: 220px;
  color: var(--accent);
  opacity: 0.5;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 30px;
}

.hero-ornament svg {
  width: 100%;
  height: 100%;
  animation: rotate-slow 60s linear infinite;
}

@keyframes rotate-slow {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* ============ 统计印谱 ============ */
.stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.stat-card {
  position: relative;
  background: var(--bg-surface);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  padding: 20px 22px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: var(--shadow-xs);
  transition: all 0.3s var(--ease);
  overflow: hidden;
  opacity: 0;
  animation: fade-up 0.5s var(--ease-out) forwards;
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 3px;
  height: 100%;
  background: var(--accent-gradient);
  opacity: 0;
  transition: opacity 0.3s var(--ease);
}

.stat-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-md);
  border-color: var(--border-strong);
}

.stat-card:hover::before { opacity: 1; }

.stat-icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-sm);
  background: var(--accent-soft);
  color: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.stat-body { flex: 1; min-width: 0; }

.stat-number {
  display: flex;
  align-items: baseline;
  gap: 4px;
  font-family: var(--font-display);
  font-weight: 600;
}

.stat-number .num {
  font-size: 26px;
  color: var(--text-primary);
  line-height: 1;
}

.stat-number .unit {
  font-size: 12px;
  color: var(--text-placeholder);
  font-family: var(--font-sans);
}

.stat-label {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 4px;
  letter-spacing: 0.05em;
}

.stat-stamp {
  position: absolute;
  top: 12px;
  right: 14px;
  font-family: var(--font-serif);
  font-size: 11px;
  color: var(--accent);
  border: 1px solid var(--accent);
  border-radius: 4px;
  padding: 1px 5px;
  opacity: 0.4;
  letter-spacing: 0.1em;
}

@keyframes fade-up {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ============ 双栏面板 ============ */
.duo-grid {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 20px;
}

.panel {
  background: var(--bg-surface);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-xs);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 24px;
  border-bottom: 1px solid var(--border-lighter);
  background: linear-gradient(180deg, var(--bg-elevated), transparent);
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.panel-idx {
  font-family: var(--font-display);
  font-size: 14px;
  color: var(--accent);
  font-weight: 700;
  letter-spacing: 0.1em;
  padding: 2px 8px;
  background: var(--accent-soft);
  border-radius: 4px;
}

.panel-title h3 {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: 0.04em;
}

.link-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  color: var(--accent);
  font-size: 13px;
  font-family: var(--font-sans);
  cursor: pointer;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  transition: all 0.2s var(--ease);
}

.link-btn:hover {
  background: var(--accent-soft);
  gap: 6px;
}

.panel-body {
  padding: 20px 24px;
  flex: 1;
}

/* —— 写作目标 —— */
.goals-panel .panel-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.goal-row {
  padding: 4px 0;
}

.goal-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 8px;
}

.goal-name {
  font-size: 14px;
  color: var(--text-regular);
  font-weight: 500;
}

.goal-count {
  font-family: var(--font-display);
  font-size: 14px;
  color: var(--text-primary);
  font-weight: 600;
}

.goal-count em {
  font-style: normal;
  color: var(--text-placeholder);
  margin: 0 2px;
  font-weight: 400;
}

.goal-bar {
  height: 6px;
  background: var(--bg-surface-2);
  border-radius: var(--radius-pill);
  overflow: hidden;
}

.goal-bar-inner {
  height: 100%;
  border-radius: var(--radius-pill);
  transition: width 0.6s var(--ease-out);
}

.empty-goals {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 28px 0;
  text-align: center;
}

.empty-icon {
  font-size: 28px;
  color: var(--text-placeholder);
  margin-bottom: 4px;
}

.empty-goals p {
  color: var(--text-secondary);
  font-size: 13px;
  margin: 0;
}

.view-all {
  margin-top: 4px;
  padding-top: 12px;
  border-top: 1px dashed var(--border-light);
  text-align: center;
}

/* —— 快捷入口 —— */
.action-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.action-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 18px 12px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-lighter);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.25s var(--ease);
  font-family: var(--font-sans);
}

.action-tile:hover {
  border-color: var(--accent);
  background: var(--accent-soft);
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
}

.action-icon-wrap {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--accent-gradient);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  margin-bottom: 4px;
  box-shadow: 0 3px 8px rgba(154, 91, 46, 0.22);
}

.action-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: 0.04em;
}

.action-sub {
  font-size: 11px;
  color: var(--text-placeholder);
  font-family: var(--font-serif);
}

/* ============ 书架 ============ */
.shelf {
  background: var(--bg-surface);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-xs);
  overflow: hidden;
}

.shelf-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 24px;
  border-bottom: 1px solid var(--border-lighter);
  background: linear-gradient(180deg, var(--bg-elevated), transparent);
}

.shelf-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.shelf-title h3 {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: 0.04em;
}

.shelf-tip {
  font-size: 12px;
  color: var(--text-placeholder);
  font-family: var(--font-serif);
  padding-left: 12px;
  border-left: 1px solid var(--border-light);
}

.shelf-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
  padding: 20px 24px;
}

.book-card {
  display: flex;
  gap: 16px;
  padding: 16px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-lighter);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.3s var(--ease);
  position: relative;
  overflow: hidden;
}

.book-card::after {
  content: '';
  position: absolute;
  right: -10px;
  bottom: -10px;
  width: 60px;
  height: 60px;
  background: radial-gradient(circle, var(--accent-soft) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 0.3s var(--ease);
}

.book-card:hover {
  border-color: var(--accent);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.book-card:hover::after { opacity: 0.6; }

.book-spine {
  width: 38px;
  min-height: 88px;
  border-radius: 4px 6px 6px 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: inset -2px 0 4px rgba(0, 0, 0, 0.18), 2px 2px 6px rgba(60, 40, 20, 0.12);
  position: relative;
}

.spine-text {
  writing-mode: vertical-rl;
  text-orientation: upright;
  font-family: var(--font-serif);
  font-size: 18px;
  color: #fff;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.book-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.book-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  font-family: var(--font-serif);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.book-desc {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  flex: 1;
}

.book-meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 4px;
}

.meta-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--text-secondary);
  background: var(--bg-surface-2);
  border: 1px solid var(--border-lighter);
  padding: 2px 8px;
  border-radius: var(--radius-pill);
}

.meta-pill .el-icon { font-size: 11px; }

.shelf-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 48px 0;
  text-align: center;
}

.shelf-empty .empty-icon {
  font-size: 40px;
  color: var(--border-strong);
  margin-bottom: 4px;
}

.empty-title {
  font-family: var(--font-serif);
  font-size: 17px;
  color: var(--text-primary);
  margin: 0;
}

.empty-tip {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0 0 16px 0;
}

/* ============ 响应式 ============ */
@media (max-width: 1080px) {
  .stats { grid-template-columns: repeat(2, 1fr); }
  .duo-grid { grid-template-columns: 1fr; }
  .shelf-grid { grid-template-columns: 1fr; }
}

@media (max-width: 640px) {
  .hero { flex-direction: column; }
  .hero-ornament { display: none; }
  .hero-title { font-size: 30px; flex-wrap: wrap; }
  .hero-glyph { width: 44px; height: 44px; font-size: 22px; }
  .stats { grid-template-columns: 1fr; }
  .hero-paper { padding: 26px 22px; }
  .hero-rule { left: 22px; right: 22px; }
}
</style>
