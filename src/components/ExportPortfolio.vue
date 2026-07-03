<template>
  <div class="export-portfolio">
    <!-- 顶部：作品选择 -->
    <section class="block">
      <header class="block-head">
        <h4>
          <span class="block-idx">壹</span>
          选择作品
        </h4>
        <div class="block-actions">
          <button class="link-btn" @click="selectAll">全选</button>
          <span class="sep">·</span>
          <button class="link-btn" @click="selectNone">清空</button>
        </div>
      </header>
      <div class="novel-list" v-if="novels.length > 0">
        <label
          v-for="novel in novels"
          :key="novel.id"
          class="novel-check"
          :class="{ 'checked': selectedIds.includes(novel.id) }"
        >
          <input
            type="checkbox"
            :value="novel.id"
            v-model="selectedIds"
            class="check-input"
          />
          <span class="check-box">
            <el-icon v-if="selectedIds.includes(novel.id)"><Check /></el-icon>
          </span>
          <div class="novel-meta">
            <span class="novel-title">{{ novel.title || '未命名作品' }}</span>
            <span class="novel-sub">
              {{ (novel.chapterList || []).length }} 章 · {{ formatNumber(novel.wordCount || 0) }} 字
            </span>
          </div>
        </label>
      </div>
      <div v-else class="empty-state">
        <el-icon class="empty-icon"><Reading /></el-icon>
        <p>暂无可导出的作品，请先创作</p>
      </div>
    </section>

    <!-- 中部：格式与字号 -->
    <section class="block">
      <header class="block-head">
        <h4>
          <span class="block-idx">贰</span>
          导出格式与排版
        </h4>
      </header>

      <div class="form-grid">
        <!-- 格式选择 -->
        <div class="form-row">
          <label class="form-label">导出格式</label>
          <div class="format-tabs">
            <button
              v-for="fmt in formats"
              :key="fmt.value"
              class="format-tab"
              :class="{ 'active': format === fmt.value }"
              @click="format = fmt.value"
            >
              <el-icon><component :is="fmt.icon" /></el-icon>
              <span>{{ fmt.label }}</span>
              <small>{{ fmt.desc }}</small>
            </button>
          </div>
        </div>

        <!-- 字号调整 -->
        <div class="form-row">
          <label class="form-label">
            正文字号
            <span class="value-tag">{{ fontSize }}px</span>
          </label>
          <div class="slider-row">
            <span class="slider-tip small">小</span>
            <input
              type="range"
              min="10"
              max="22"
              step="1"
              v-model.number="fontSize"
              class="slider"
            />
            <span class="slider-tip large">大</span>
            <div class="size-preview" :style="{ fontSize: fontSize + 'px' }">
              字
            </div>
          </div>
        </div>

        <!-- 章节标题字号 -->
        <div class="form-row">
          <label class="form-label">
            章节标题字号
            <span class="value-tag">{{ chapterTitleSize }}px</span>
          </label>
          <div class="slider-row">
            <span class="slider-tip small">小</span>
            <input
              type="range"
              min="14"
              max="30"
              step="1"
              v-model.number="chapterTitleSize"
              class="slider"
            />
            <span class="slider-tip large">大</span>
          </div>
        </div>

        <!-- 行高 -->
        <div class="form-row">
          <label class="form-label">
            行距
            <span class="value-tag">{{ lineHeight.toFixed(1) }}</span>
          </label>
          <div class="slider-row">
            <span class="slider-tip small">紧</span>
            <input
              type="range"
              min="1.2"
              max="2.4"
              step="0.1"
              v-model.number="lineHeight"
              class="slider"
            />
            <span class="slider-tip large">疏</span>
          </div>
        </div>

        <!-- 著者 -->
        <div class="form-row">
          <label class="form-label">著者署名</label>
          <el-input
            v-model="author"
            placeholder="请输入作者名"
            clearable
          />
        </div>

        <!-- 包含目录 -->
        <div class="form-row">
          <label class="form-label">附加选项</label>
          <div class="switch-row">
            <label class="switch-item">
              <input type="checkbox" v-model="includeToc" />
              <span>包含目录页</span>
            </label>
          </div>
        </div>
      </div>
    </section>

    <!-- 底部：操作 -->
    <section class="footer-actions">
      <div class="summary">
        <span>已选 <strong>{{ selectedIds.length }}</strong> / {{ novels.length }} 部</span>
        <span class="dot">·</span>
        <span>{{ formatLabel }}</span>
      </div>
      <div class="action-buttons">
        <button class="btn-ghost" @click="handleClose">取消</button>
        <button
          class="btn-primary"
          :disabled="!canExport || exporting"
          @click="doExport"
        >
          <el-icon v-if="!exporting"><Download /></el-icon>
          <el-icon v-else class="rotating"><Loading /></el-icon>
          <span>{{ exporting ? '生成中…' : '开始导出' }}</span>
        </button>
      </div>
    </section>

    <!-- 进度条 -->
    <transition name="fade">
      <div v-if="exporting && progress > 0" class="progress-bar-wrap">
        <div class="progress-bar-track">
          <div class="progress-bar-inner" :style="{ width: progress + '%' }"></div>
        </div>
        <span class="progress-text">{{ progress }}%</span>
      </div>
    </transition>

    <!-- 预览 -->
    <div v-if="previewText" class="preview-tip">
      <el-icon><CircleCheck /></el-icon>
      <span>{{ previewText }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Check, Download, Loading, Reading,
  Document, Notebook, Tickets
} from '@element-plus/icons-vue'
import {
  exportNovelsToPDF,
  exportNovelsToWord,
  exportNovelsToText
} from '@/services/exportService.js'

const props = defineProps({
  novels: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['close'])

const selectedIds = ref(props.novels.map(n => n.id))
const format = ref('pdf')
const fontSize = ref(14)
const chapterTitleSize = ref(18)
const lineHeight = ref(1.8)
const author = ref(localStorage.getItem('exportAuthor') || '墨章用户')
const includeToc = ref(true)
const exporting = ref(false)
const progress = ref(0)
const previewText = ref('')

const formats = [
  { value: 'pdf', label: 'PDF', desc: '排版精美，跨平台', icon: Document },
  { value: 'word', label: 'Word', desc: '可继续编辑', icon: Notebook },
  { value: 'txt', label: '纯文本', desc: '通用简洁', icon: Tickets }
]

const formatLabel = computed(() => {
  const f = formats.find(x => x.value === format.value)
  return f ? f.label : ''
})

const canExport = computed(() => selectedIds.value.length > 0)

const selectAll = () => { selectedIds.value = props.novels.map(n => n.id) }
const selectNone = () => { selectedIds.value = [] }

const formatNumber = (num) => {
  if (num >= 10000) return (num / 10000).toFixed(1) + '万'
  return (num || 0).toLocaleString()
}

const doExport = async () => {
  if (selectedIds.value.length === 0) {
    ElMessage.warning('请至少选择一部作品')
    return
  }
  const selectedNovels = props.novels.filter(n => selectedIds.value.includes(n.id))
  exporting.value = true
  progress.value = 0
  previewText.value = ''

  // 保存作者名以备下次使用
  localStorage.setItem('exportAuthor', author.value)

  try {
    const options = {
      fontSize: fontSize.value,
      chapterTitleSize: chapterTitleSize.value,
      lineHeight: lineHeight.value,
      author: author.value,
      includeToc: includeToc.value
    }

    const onProgress = (p) => { progress.value = p }

    let result
    if (format.value === 'pdf') {
      result = await exportNovelsToPDF(selectedNovels, options, onProgress)
    } else if (format.value === 'word') {
      result = exportNovelsToWord(selectedNovels, options, onProgress)
    } else {
      result = exportNovelsToText(selectedNovels, options)
      progress.value = 100
    }

    previewText.value = `已生成：${result.filename}`
    ElMessage.success(`作品集已导出（${selectedNovels.length} 部）`)
  } catch (err) {
    console.error('导出失败:', err)
    ElMessage.error('导出失败：' + (err.message || '未知错误'))
  } finally {
    exporting.value = false
    setTimeout(() => { progress.value = 0 }, 1500)
  }
}

const handleClose = () => emit('close')
</script>

<style scoped>
.export-portfolio {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 4px 0;
}

.block {
  background: var(--bg-elevated);
  border: 1px solid var(--border-lighter);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.block-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 18px;
  background: linear-gradient(180deg, rgba(243, 230, 211, 0.4), transparent);
  border-bottom: 1px solid var(--border-lighter);
}

.block-head h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: var(--font-serif);
  letter-spacing: 0.05em;
}

.block-idx {
  font-family: var(--font-display);
  font-size: 12px;
  color: var(--accent);
  background: var(--accent-soft);
  padding: 1px 7px;
  border-radius: 4px;
  font-weight: 700;
  letter-spacing: 0.1em;
}

.block-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
}

.link-btn {
  background: none;
  border: none;
  color: var(--accent);
  cursor: pointer;
  font-family: var(--font-sans);
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 4px;
  transition: background 0.2s;
}

.link-btn:hover { background: var(--accent-soft); }

.sep { color: var(--border-strong); margin: 0 2px; }

/* 作品列表 */
.novel-list {
  padding: 12px;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  max-height: 240px;
  overflow-y: auto;
}

.novel-check {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: var(--bg-surface);
  border: 1px solid var(--border-lighter);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s var(--ease);
}

.novel-check:hover {
  border-color: var(--border-strong);
  background: var(--bg-elevated);
}

.novel-check.checked {
  border-color: var(--accent);
  background: var(--accent-soft);
}

.check-input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.check-box {
  width: 18px;
  height: 18px;
  border: 1.5px solid var(--border-strong);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s var(--ease);
  background: var(--bg-surface);
  color: #fff;
  font-size: 11px;
}

.novel-check.checked .check-box {
  background: var(--accent);
  border-color: var(--accent);
}

.novel-meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.novel-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.novel-sub {
  font-size: 11px;
  color: var(--text-placeholder);
}

.empty-state {
  padding: 30px 20px;
  text-align: center;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 32px;
  color: var(--border-strong);
  margin-bottom: 8px;
}

/* 表单 */
.form-grid {
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  font-size: 13px;
  color: var(--text-regular);
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.value-tag {
  font-family: var(--font-display);
  font-size: 13px;
  color: var(--accent);
  background: var(--accent-soft);
  padding: 1px 8px;
  border-radius: 4px;
  font-weight: 600;
}

.format-tabs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.format-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 12px 8px;
  background: var(--bg-surface);
  border: 1px solid var(--border-lighter);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s var(--ease);
  font-family: var(--font-sans);
  color: var(--text-regular);
}

.format-tab .el-icon {
  font-size: 18px;
  color: var(--text-secondary);
}

.format-tab span {
  font-size: 13px;
  font-weight: 600;
}

.format-tab small {
  font-size: 10px;
  color: var(--text-placeholder);
  font-family: var(--font-serif);
}

.format-tab:hover {
  border-color: var(--border-strong);
  background: var(--bg-elevated);
}

.format-tab.active {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--accent);
}

.format-tab.active .el-icon { color: var(--accent); }

/* 滑块 */
.slider-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.slider-tip {
  font-size: 11px;
  color: var(--text-placeholder);
  font-family: var(--font-serif);
}

.slider-tip.large { font-size: 14px; }

.slider {
  flex: 1;
  -webkit-appearance: none;
  appearance: none;
  height: 4px;
  background: var(--bg-surface-2);
  border-radius: var(--radius-pill);
  outline: none;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--accent);
  cursor: pointer;
  border: 2px solid #fff;
  box-shadow: 0 1px 4px rgba(154, 91, 46, 0.4);
  transition: transform 0.15s var(--ease);
}

.slider::-webkit-slider-thumb:hover { transform: scale(1.15); }

.slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--accent);
  cursor: pointer;
  border: 2px solid #fff;
  box-shadow: 0 1px 4px rgba(154, 91, 46, 0.4);
}

.size-preview {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-surface);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-sm);
  font-family: var(--font-serif);
  color: var(--text-primary);
  flex-shrink: 0;
  overflow: hidden;
}

.switch-row {
  display: flex;
  gap: 16px;
}

.switch-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-regular);
  cursor: pointer;
}

.switch-item input {
  accent-color: var(--accent);
  width: 14px;
  height: 14px;
}

/* 底部操作 */
.footer-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 18px;
  background: var(--bg-surface);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-sm);
}

.summary {
  font-size: 13px;
  color: var(--text-secondary);
  font-family: var(--font-serif);
}

.summary strong {
  color: var(--accent);
  font-family: var(--font-display);
  font-size: 16px;
  margin: 0 2px;
}

.dot {
  margin: 0 6px;
  color: var(--border-strong);
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 18px;
  background: var(--accent-gradient);
  color: #fff;
  border: none;
  border-radius: var(--radius-pill);
  font-family: var(--font-sans);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s var(--ease);
  box-shadow: 0 4px 12px rgba(154, 91, 46, 0.28);
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(154, 91, 46, 0.36);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
}

.btn-ghost {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 18px;
  background: transparent;
  color: var(--text-regular);
  border: 1px solid var(--border-base);
  border-radius: var(--radius-pill);
  font-family: var(--font-sans);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s var(--ease);
}

.btn-ghost:hover {
  border-color: var(--accent);
  color: var(--accent);
  background: var(--accent-soft);
}

/* 进度条 */
.progress-bar-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 18px;
  background: var(--accent-soft);
  border-radius: var(--radius-sm);
  border: 1px solid var(--accent);
}

.progress-bar-track {
  flex: 1;
  height: 6px;
  background: rgba(154, 91, 46, 0.2);
  border-radius: var(--radius-pill);
  overflow: hidden;
}

.progress-bar-inner {
  height: 100%;
  background: var(--accent-gradient);
  border-radius: var(--radius-pill);
  transition: width 0.3s var(--ease);
}

.progress-text {
  font-family: var(--font-display);
  font-size: 13px;
  color: var(--accent);
  font-weight: 700;
  min-width: 36px;
  text-align: right;
}

.preview-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: rgba(90, 122, 74, 0.08);
  border: 1px solid var(--success);
  border-radius: var(--radius-sm);
  color: var(--success);
  font-size: 13px;
}

.rotating {
  animation: rotating 1s linear infinite;
}

@keyframes rotating {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s var(--ease);
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

@media (max-width: 640px) {
  .novel-list {
    grid-template-columns: 1fr;
  }
  .format-tabs {
    grid-template-columns: 1fr;
  }
  .footer-actions {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
