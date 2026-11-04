<template>
  <div class="writer-status-bar">
    <div class="status-left">
      <!-- 字数统计 -->
      <div class="status-item">
        <el-icon><Document /></el-icon>
        <span>总字数：<strong>{{ formatNumber(totalWords) }}</strong></span>
      </div>

      <!-- 章节数 -->
      <div class="status-item">
        <el-icon><Folder /></el-icon>
        <span>章节：<strong>{{ chapterCount }}</strong></span>
      </div>

      <!-- 今日字数 -->
      <div class="status-item" v-if="todayWords > 0">
        <el-icon><Calendar /></el-icon>
        <span>今日：<strong class="highlight">{{ formatNumber(todayWords) }}</strong> 字</span>
      </div>
    </div>

    <div class="status-center">
      <!-- 写作目标进度 -->
      <div class="progress-info" v-if="dailyGoal > 0">
        <span class="progress-label">今日目标</span>
        <el-progress 
          :percentage="goalPercentage" 
          :color="getProgressColor(goalPercentage)"
          :stroke-width="8"
          :show-text="false"
          class="progress-bar"
        />
        <span class="progress-text">{{ todayWords }} / {{ dailyGoal }}</span>
      </div>
    </div>

    <div class="status-right">
      <!-- 光标位置 -->
      <div class="status-item" v-if="cursorPosition">
        <el-icon><Position /></el-icon>
        <span>行 {{ cursorPosition.line }}，列 {{ cursorPosition.column }}</span>
      </div>

      <!-- API 状态 -->
      <div class="status-item">
        <el-tag 
          :type="apiStatus === 'connected' ? 'success' : 'danger'" 
          size="small"
          effect="plain"
        >
          <el-icon>
            <SuccessFilled v-if="apiStatus === 'connected'" />
            <CircleClose v-else />
          </el-icon>
          {{ apiStatus === 'connected' ? 'API 已连接' : 'API 未连接' }}
        </el-tag>
      </div>

      <!-- 自动保存状态 -->
      <div class="status-item">
        <el-icon :class="{ 'icon-spinning': isAutoSaving }">
          <Loading v-if="isAutoSaving" />
          <DocumentChecked v-else />
        </el-icon>
        <span>{{ autoSaveText }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  totalWords: {
    type: Number,
    default: 0
  },
  chapterCount: {
    type: Number,
    default: 0
  },
  todayWords: {
    type: Number,
    default: 0
  },
  dailyGoal: {
    type: Number,
    default: 0
  },
  cursorPosition: {
    type: Object,
    default: null
  },
  apiStatus: {
    type: String,
    default: 'disconnected' // connected | disconnected
  },
  isAutoSaving: {
    type: Boolean,
    default: false
  },
  lastSaveTime: {
    type: String,
    default: ''
  }
})

// 格式化数字
const formatNumber = (num) => {
  if (!num) return '0'
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

// 计算目标完成百分比
const goalPercentage = computed(() => {
  if (!props.dailyGoal) return 0
  const percentage = Math.round((props.todayWords / props.dailyGoal) * 100)
  return Math.min(percentage, 100)
})

// 获取进度条颜色
const getProgressColor = (percentage) => {
  if (percentage < 30) return '#f56c6c'
  if (percentage < 60) return '#e6a23c'
  if (percentage < 100) return '#409eff'
  return '#67c23a'
}

// 自动保存文本
const autoSaveText = computed(() => {
  if (props.isAutoSaving) {
    return '保存中...'
  }
  if (props.lastSaveTime) {
    return `已保存 ${props.lastSaveTime}`
  }
  return '自动保存'
})
</script>

<style scoped>
.writer-status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: #f5f7fa;
  border-top: 1px solid #e4e7ed;
  font-size: 12px;
  color: #606266;
  height: 40px;
}

.status-left,
.status-center,
.status-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.status-center {
  flex: 1;
  justify-content: center;
  max-width: 400px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.status-item .el-icon {
  font-size: 14px;
  color: #909399;
}

.status-item strong {
  color: #303133;
  font-weight: 600;
}

.status-item .highlight {
  color: #409eff;
}

.progress-info {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.progress-label {
  font-size: 12px;
  color: #909399;
  white-space: nowrap;
}

.progress-bar {
  flex: 1;
  min-width: 100px;
}

.progress-text {
  font-size: 12px;
  color: #606266;
  white-space: nowrap;
  min-width: 80px;
  text-align: right;
}

.icon-spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>

