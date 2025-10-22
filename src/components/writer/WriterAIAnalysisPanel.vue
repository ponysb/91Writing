<template>
  <div class="ai-analysis-panel">
    <el-card shadow="never">
      <template #header>
        <div class="panel-header">
          <span>🤖 AI 智能分析</span>
          <el-tag type="info" size="small">高级功能</el-tag>
        </div>
      </template>

      <!-- 分析类型选择 -->
      <div class="analysis-types">
        <el-button
          v-for="type in analysisTypes"
          :key="type.id"
          :type="activeAnalysis === type.id ? 'primary' : ''"
          size="small"
          @click="selectAnalysis(type.id)"
          class="type-btn"
        >
          <span>{{ type.icon }}</span>
          <span>{{ type.label }}</span>
        </el-button>
      </div>

      <!-- 分析内容区域 -->
      <div class="analysis-content">
        <!-- 创意头脑风暴 -->
        <div v-show="activeAnalysis === 'brainstorm'" class="analysis-section">
          <div class="section-header">
            <h4>💡 创意头脑风暴</h4>
            <el-button size="small" type="primary" @click="runBrainstorm" :loading="loading">
              生成创意
            </el-button>
          </div>

          <div class="brainstorm-options">
            <el-select v-model="brainstormType" size="small" placeholder="选择创意类型">
              <el-option label="情节发展" value="plot" />
              <el-option label="人物设定" value="character" />
              <el-option label="场景描写" value="scene" />
              <el-option label="对话设计" value="dialogue" />
              <el-option label="剧情反转" value="twist" />
            </el-select>

            <el-input-number 
              v-model="ideaCount" 
              :min="3" 
              :max="10" 
              size="small"
              placeholder="创意数量"
            />
          </div>

          <div v-if="brainstormResults.length > 0" class="results-list">
            <el-card
              v-for="(idea, index) in brainstormResults"
              :key="index"
              class="idea-card"
              shadow="hover"
            >
              <div class="idea-header">
                <h5>{{ idea.title }}</h5>
                <el-rate
                  v-model="idea.feasibility"
                  disabled
                  :max="10"
                  show-score
                  text-color="#ff9900"
                />
              </div>
              <p class="idea-description">{{ idea.description }}</p>
              <div class="idea-suggestion">
                <el-icon><Lightbulb /></el-icon>
                <span>{{ idea.suggestion }}</span>
              </div>
              <div class="idea-actions">
                <el-button size="small" @click="adoptIdea(idea)">
                  采纳创意
                </el-button>
                <el-button size="small" @click="refineIdea(idea)">
                  深化创意
                </el-button>
              </div>
            </el-card>
          </div>

          <el-empty v-else description="点击「生成创意」获取灵感" />
        </div>

        <!-- 情节冲突检测 -->
        <div v-show="activeAnalysis === 'conflicts'" class="analysis-section">
          <div class="section-header">
            <h4>⚠️ 情节冲突检测</h4>
            <el-button size="small" type="primary" @click="detectConflicts" :loading="loading">
              开始检测
            </el-button>
          </div>

          <div v-if="conflictsResult" class="analysis-summary">
            <el-alert
              :title="conflictsResult.summary"
              :type="getSummaryType(conflictsResult.conflicts)"
              show-icon
              :closable="false"
            />
          </div>

          <div v-if="conflictsResult?.conflicts?.length > 0" class="results-list">
            <el-card
              v-for="(conflict, index) in conflictsResult.conflicts"
              :key="index"
              class="issue-card"
              :class="`severity-${conflict.severity}`"
              shadow="hover"
            >
              <div class="issue-header">
                <el-tag :type="getSeverityType(conflict.severity)" size="small">
                  {{ conflict.severity }}
                </el-tag>
                <span class="issue-type">{{ conflict.type }}</span>
                <span class="issue-location">{{ conflict.location }}</span>
              </div>
              <p class="issue-description">{{ conflict.description }}</p>
              <div class="issue-suggestion">
                <el-icon><Edit /></el-icon>
                <span>{{ conflict.suggestion }}</span>
              </div>
            </el-card>
          </div>

          <el-empty v-else-if="conflictsResult && conflictsResult.conflicts.length === 0" 
            description="🎉 未发现明显冲突，剧情逻辑良好！" 
          />

          <el-empty v-else description="点击「开始检测」分析情节冲突" />
        </div>

        <!-- 人物一致性检查 -->
        <div v-show="activeAnalysis === 'character'" class="analysis-section">
          <div class="section-header">
            <h4>👥 人物一致性检查</h4>
            <el-button size="small" type="primary" @click="checkCharacters" :loading="loading">
              开始检查
            </el-button>
          </div>

          <div v-if="characterResult" class="analysis-summary">
            <el-alert
              :title="characterResult.summary"
              :type="characterResult.issues.length === 0 ? 'success' : 'warning'"
              show-icon
              :closable="false"
            />
          </div>

          <div v-if="characterResult?.issues?.length > 0" class="results-list">
            <el-card
              v-for="(issue, index) in characterResult.issues"
              :key="index"
              class="issue-card"
              shadow="hover"
            >
              <div class="issue-header">
                <el-tag type="warning" size="small">{{ issue.severity }}</el-tag>
                <span class="character-name">{{ issue.character }}</span>
                <span class="issue-location">{{ issue.chapter }}</span>
              </div>
              <div class="consistency-issue">
                <p><strong>问题：</strong>{{ issue.issue }}</p>
                <p><strong>期望：</strong>{{ issue.expected }}</p>
                <p><strong>实际：</strong>{{ issue.actual }}</p>
              </div>
              <div class="issue-suggestion">
                <el-icon><Edit /></el-icon>
                <span>{{ issue.suggestion }}</span>
              </div>
            </el-card>
          </div>

          <el-empty v-else-if="characterResult && characterResult.issues.length === 0"
            description="🎉 人物行为符合性格设定！"
          />

          <el-empty v-else description="点击「开始检查」分析人物一致性" />
        </div>

        <!-- 时间线验证 -->
        <div v-show="activeAnalysis === 'timeline'" class="analysis-section">
          <div class="section-header">
            <h4>⏰ 时间线验证</h4>
            <el-button size="small" type="primary" @click="validateTimeline" :loading="loading">
              验证时间线
            </el-button>
          </div>

          <div v-if="timelineResult" class="timeline-view">
            <!-- 时间线图 -->
            <div v-if="timelineResult.timeline?.length > 0" class="timeline-chart">
              <div
                v-for="(point, index) in timelineResult.timeline"
                :key="index"
                class="timeline-point"
              >
                <div class="timeline-marker">{{ point.chapter }}</div>
                <div class="timeline-content">
                  <div class="time-label">{{ point.timePoint }}</div>
                  <div class="time-duration">{{ point.duration }}</div>
                  <ul class="time-events">
                    <li v-for="(event, idx) in point.events" :key="idx">{{ event }}</li>
                  </ul>
                </div>
              </div>
            </div>

            <!-- 时间线问题 -->
            <div v-if="timelineResult.issues?.length > 0" class="timeline-issues">
              <h5>⚠️ 发现的问题</h5>
              <el-card
                v-for="(issue, index) in timelineResult.issues"
                :key="index"
                class="issue-card"
                shadow="hover"
              >
                <div class="issue-header">
                  <el-tag type="danger" size="small">{{ issue.type }}</el-tag>
                  <span class="issue-location">{{ issue.chapters }}</span>
                </div>
                <p class="issue-description">{{ issue.description }}</p>
                <div class="issue-suggestion">
                  <el-icon><Edit /></el-icon>
                  <span>{{ issue.suggestion }}</span>
                </div>
              </el-card>
            </div>

            <el-alert
              v-else
              title="时间线合理，没有发现明显问题"
              type="success"
              show-icon
              :closable="false"
            />
          </div>

          <el-empty v-else description="点击「验证时间线」开始分析" />
        </div>

        <!-- 剧情逻辑检查 -->
        <div v-show="activeAnalysis === 'logic'" class="analysis-section">
          <div class="section-header">
            <h4>🔍 剧情逻辑检查</h4>
            <el-button size="small" type="primary" @click="checkLogic" :loading="loading">
              开始检查
            </el-button>
          </div>

          <div v-if="logicResult" class="analysis-summary">
            <el-alert
              :title="logicResult.summary"
              :type="getSummaryType(logicResult.issues)"
              show-icon
              :closable="false"
            />
          </div>

          <div v-if="logicResult?.issues?.length > 0" class="results-list">
            <el-card
              v-for="(issue, index) in logicResult.issues"
              :key="index"
              class="issue-card"
              :class="`severity-${issue.severity}`"
              shadow="hover"
            >
              <div class="issue-header">
                <el-tag :type="getSeverityType(issue.severity)" size="small">
                  {{ issue.severity }}
                </el-tag>
                <span class="issue-type">{{ issue.type }}</span>
                <span class="issue-location">{{ issue.chapter }}</span>
              </div>
              <p class="issue-description"><strong>问题：</strong>{{ issue.issue }}</p>
              <p class="issue-impact"><strong>影响：</strong>{{ issue.impact }}</p>
              <div class="issue-suggestion">
                <el-icon><Edit /></el-icon>
                <span>{{ issue.suggestion }}</span>
              </div>
            </el-card>
          </div>

          <el-empty v-else-if="logicResult && logicResult.issues.length === 0"
            description="🎉 剧情逻辑严密，没有发现明显问题！"
          />

          <el-empty v-else description="点击「开始检查」分析剧情逻辑" />
        </div>

        <!-- 综合分析 -->
        <div v-show="activeAnalysis === 'comprehensive'" class="analysis-section">
          <div class="section-header">
            <h4>📊 综合分析报告</h4>
            <el-button size="small" type="primary" @click="runComprehensiveAnalysis" :loading="loading">
              运行综合分析
            </el-button>
          </div>

          <div v-if="comprehensiveResult" class="comprehensive-report">
            <div class="report-summary">
              <el-statistic title="总问题数" :value="comprehensiveResult.summary.totalIssues" />
              <el-statistic title="分析时间" :value="formatTime(comprehensiveResult.summary.timestamp)" />
            </div>

            <el-tabs>
              <el-tab-pane label="情节冲突" :badge="comprehensiveResult.plotConflicts?.conflicts?.length || 0">
                <div v-if="comprehensiveResult.plotConflicts?.conflicts?.length > 0">
                  <p>{{ comprehensiveResult.plotConflicts.summary }}</p>
                </div>
                <el-empty v-else description="未发现情节冲突" />
              </el-tab-pane>

              <el-tab-pane label="人物一致性" :badge="comprehensiveResult.characterConsistency?.issues?.length || 0">
                <div v-if="comprehensiveResult.characterConsistency?.issues?.length > 0">
                  <p>{{ comprehensiveResult.characterConsistency.summary }}</p>
                </div>
                <el-empty v-else description="人物行为一致" />
              </el-tab-pane>

              <el-tab-pane label="时间线" :badge="comprehensiveResult.timeline?.issues?.length || 0">
                <div v-if="comprehensiveResult.timeline?.issues?.length > 0">
                  <p>{{ comprehensiveResult.timeline.summary }}</p>
                </div>
                <el-empty v-else description="时间线合理" />
              </el-tab-pane>

              <el-tab-pane label="逻辑检查" :badge="comprehensiveResult.plotLogic?.issues?.length || 0">
                <div v-if="comprehensiveResult.plotLogic?.issues?.length > 0">
                  <p>{{ comprehensiveResult.plotLogic.summary }}</p>
                </div>
                <el-empty v-else description="逻辑严密" />
              </el-tab-pane>
            </el-tabs>
          </div>

          <el-empty v-else description="点击「运行综合分析」获取完整报告" />
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import aiAnalysisService from '@/services/aiAnalysis'

const props = defineProps({
  novelId: {
    type: String,
    required: true
  }
})

// 状态
const activeAnalysis = ref('brainstorm')
const loading = ref(false)

// 创意头脑风暴
const brainstormType = ref('plot')
const ideaCount = ref(5)
const brainstormResults = ref([])

// 检测结果
const conflictsResult = ref(null)
const characterResult = ref(null)
const timelineResult = ref(null)
const logicResult = ref(null)
const comprehensiveResult = ref(null)

// 分析类型
const analysisTypes = [
  { id: 'brainstorm', label: '创意头脑风暴', icon: '💡' },
  { id: 'conflicts', label: '情节冲突', icon: '⚠️' },
  { id: 'character', label: '人物一致性', icon: '👥' },
  { id: 'timeline', label: '时间线', icon: '⏰' },
  { id: 'logic', label: '剧情逻辑', icon: '🔍' },
  { id: 'comprehensive', label: '综合分析', icon: '📊' }
]

// 方法
const selectAnalysis = (type) => {
  activeAnalysis.value = type
}

const getNovelData = () => {
  // 从 localStorage 获取小说数据
  const chaptersKey = `novel_chapters_${props.novelId}`
  const charactersKey = `novel_characters_${props.novelId}`
  const worldviewKey = `novel_worldview_${props.novelId}`

  return {
    title: '当前小说', // 需要从 store 获取
    chapters: JSON.parse(localStorage.getItem(chaptersKey) || '[]'),
    characters: JSON.parse(localStorage.getItem(charactersKey) || '[]'),
    worldview: JSON.parse(localStorage.getItem(worldviewKey) || '{}')
  }
}

const runBrainstorm = async () => {
  loading.value = true
  try {
    const novelData = getNovelData()
    const result = await aiAnalysisService.brainstorm(novelData, {
      type: brainstormType.value,
      count: ideaCount.value
    })

    if (result.success) {
      brainstormResults.value = result.ideas
      ElMessage.success(`成功生成 ${result.count} 个创意！`)
    } else {
      ElMessage.error('创意生成失败')
    }
  } catch (error) {
    console.error(error)
    ElMessage.error('操作失败')
  } finally {
    loading.value = false
  }
}

const detectConflicts = async () => {
  loading.value = true
  try {
    const novelData = getNovelData()
    conflictsResult.value = await aiAnalysisService.detectPlotConflicts(novelData.chapters)
  } catch (error) {
    console.error(error)
    ElMessage.error('检测失败')
  } finally {
    loading.value = false
  }
}

const checkCharacters = async () => {
  loading.value = true
  try {
    const novelData = getNovelData()
    characterResult.value = await aiAnalysisService.checkCharacterConsistency(
      novelData.characters,
      novelData.chapters
    )
  } catch (error) {
    console.error(error)
    ElMessage.error('检查失败')
  } finally {
    loading.value = false
  }
}

const validateTimeline = async () => {
  loading.value = true
  try {
    const novelData = getNovelData()
    timelineResult.value = await aiAnalysisService.validateTimeline(novelData.chapters)
  } catch (error) {
    console.error(error)
    ElMessage.error('验证失败')
  } finally {
    loading.value = false
  }
}

const checkLogic = async () => {
  loading.value = true
  try {
    const novelData = getNovelData()
    logicResult.value = await aiAnalysisService.checkPlotLogic(
      novelData.chapters,
      novelData.worldview
    )
  } catch (error) {
    console.error(error)
    ElMessage.error('检查失败')
  } finally {
    loading.value = false
  }
}

const runComprehensiveAnalysis = async () => {
  loading.value = true
  try {
    const novelData = getNovelData()
    comprehensiveResult.value = await aiAnalysisService.comprehensiveAnalysis(novelData)
  } catch (error) {
    console.error(error)
    ElMessage.error('分析失败')
  } finally {
    loading.value = false
  }
}

const adoptIdea = (idea) => {
  ElMessage.success('创意已采纳！可以在编辑器中使用')
  // TODO: 将创意添加到编辑器或笔记中
}

const refineIdea = (idea) => {
  ElMessage.info('深化创意功能开发中...')
  // TODO: 使用 AI 深化这个创意
}

const getSeverityType = (severity) => {
  const typeMap = {
    '严重': 'danger',
    '中等': 'warning',
    '轻微': 'info'
  }
  return typeMap[severity] || 'info'
}

const getSummaryType = (issues) => {
  if (!issues || issues.length === 0) return 'success'
  const hasSevere = issues.some(i => i.severity === '严重')
  return hasSevere ? 'error' : 'warning'
}

const formatTime = (timestamp) => {
  if (!timestamp) return ''
  return new Date(timestamp).toLocaleString('zh-CN')
}
</script>

<style scoped>
.ai-analysis-panel {
  height: 100%;
  overflow: auto;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.analysis-types {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 20px;
}

.type-btn {
  display: flex;
  align-items: center;
  gap: 6px;
}

.analysis-section {
  min-height: 400px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-header h4 {
  margin: 0;
  font-size: 16px;
}

.brainstorm-options {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.results-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 16px;
}

.idea-card {
  border-left: 3px solid #409eff;
}

.idea-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.idea-header h5 {
  margin: 0;
  font-size: 16px;
  color: #303133;
}

.idea-description {
  margin: 12px 0;
  line-height: 1.6;
  color: #606266;
}

.idea-suggestion {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 4px;
  margin-bottom: 12px;
}

.idea-actions {
  display: flex;
  gap: 8px;
}

.issue-card {
  border-left: 3px solid #e6a23c;
}

.issue-card.severity-严重 {
  border-left-color: #f56c6c;
}

.issue-card.severity-轻微 {
  border-left-color: #909399;
}

.issue-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.issue-type,
.character-name {
  font-weight: 600;
  color: #303133;
}

.issue-location {
  color: #909399;
  font-size: 13px;
}

.issue-description,
.issue-impact {
  margin: 8px 0;
  line-height: 1.6;
  color: #606266;
}

.consistency-issue p {
  margin: 8px 0;
  line-height: 1.6;
}

.analysis-summary {
  margin-bottom: 16px;
}

.timeline-chart {
  position: relative;
  padding-left: 40px;
  margin: 20px 0;
}

.timeline-point {
  position: relative;
  padding-bottom: 30px;
}

.timeline-point::before {
  content: '';
  position: absolute;
  left: -28px;
  top: 8px;
  bottom: -22px;
  width: 2px;
  background: #dcdfe6;
}

.timeline-point:last-child::before {
  display: none;
}

.timeline-marker {
  position: absolute;
  left: -40px;
  top: 0;
  width: 28px;
  height: 28px;
  background: #409eff;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
}

.timeline-content {
  padding: 12px;
  background: #f5f7fa;
  border-radius: 4px;
}

.time-label {
  font-weight: 600;
  color: #303133;
  margin-bottom: 6px;
}

.time-duration {
  font-size: 13px;
  color: #909399;
  margin-bottom: 8px;
}

.time-events {
  list-style: none;
  padding: 0;
  margin: 0;
}

.time-events li {
  padding: 4px 0;
  color: #606266;
  font-size: 14px;
}

.timeline-issues {
  margin-top: 24px;
}

.timeline-issues h5 {
  margin-bottom: 12px;
}

.comprehensive-report {
  margin-top: 16px;
}

.report-summary {
  display: flex;
  gap: 24px;
  margin-bottom: 24px;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 4px;
}
</style>

