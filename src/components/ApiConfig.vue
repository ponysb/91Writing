<template>
  <div class="api-config">
    <el-card class="config-card" shadow="never">
      <template #header>
        <div class="card-header">
          <div class="header-title">
            <span class="header-mark">API</span>
            <div>
              <h3>接口配置</h3>
              <p>连接您的 OpenAI 兼容接口，开启 AI 创作能力</p>
            </div>
          </div>
          <el-tag :type="isApiConfigured ? 'success' : 'danger'" size="small" effect="light">
            <el-icon style="vertical-align: middle; margin-right: 4px;">
              <CircleCheck v-if="isApiConfigured" /><CircleClose v-else />
            </el-icon>
            {{ isApiConfigured ? '已配置' : '未配置' }}
          </el-tag>
        </div>
      </template>

      <div class="config-body">
        <!-- 左侧：说明面板 -->
        <aside class="tips-panel">
          <div class="tips-illustration">
            <span class="quill">✒</span>
          </div>
          <h4>自定义接口</h4>
          <p class="tips-lead">
            支持所有 <strong>OpenAI 格式</strong>的 API 接口，兼容各大模型服务与本地部署方案。
          </p>

          <div class="tips-block">
            <h5>参数说明</h5>
            <ul>
              <li><strong>API 地址</strong> — 接口服务地址（含 /v1）</li>
              <li><strong>API 密钥</strong> — 身份验证密钥</li>
              <li><strong>模型</strong> — 可从预设选择，亦可自定义</li>
              <li><strong>最大 Token</strong> — 控制生成长度</li>
              <li><strong>创造性</strong> — 0 偏保守，1 偏创新</li>
            </ul>
          </div>

          <div class="tips-block">
            <h5>兼容服务</h5>
            <ul>
              <li>OpenAI、Claude、DeepSeek、通义千问等</li>
              <li>本地部署：Ollama、LM Studio 等</li>
            </ul>
          </div>

          <div class="tips-note">
            <el-icon><InfoFilled /></el-icon>
            <span>建议保存前先测试连接</span>
          </div>
        </aside>

        <!-- 右侧：配置表单 -->
        <section class="form-panel">
          <el-form :model="form" label-position="top" size="default" class="config-form">
            <div class="form-row">
              <el-form-item label="API 密钥" required>
                <el-input
                  v-model="form.apiKey"
                  type="password"
                  placeholder="sk-..."
                  show-password
                  clearable
                >
                  <template #prefix><el-icon><Key /></el-icon></template>
                </el-input>
              </el-form-item>
            </div>

            <div class="form-row">
              <el-form-item label="API 地址" required>
                <el-input
                  v-model="form.baseURL"
                  placeholder="https://api.openai.com/v1"
                  clearable
                >
                  <template #prefix><el-icon><Link /></el-icon></template>
                </el-input>
              </el-form-item>
            </div>

            <div class="form-row two-col">
              <el-form-item label="模型选择">
                <el-select
                  v-model="form.selectedModel"
                  placeholder="选择或输入模型"
                  filterable
                  allow-create
                  style="width: 100%"
                >
                  <el-option
                    v-for="model in availableModels"
                    :key="model.id"
                    :label="model.name"
                    :value="model.id"
                  >
                    <span>{{ model.name }}</span>
                    <span class="opt-desc">{{ model.description }}</span>
                  </el-option>
                </el-select>
              </el-form-item>

              <el-form-item label="自定义模型">
                <div class="custom-model-input">
                  <el-input
                    v-model="customModelInput"
                    placeholder="输入模型名称"
                    @keyup.enter="addCustomModel"
                  />
                  <el-button @click="addCustomModel" type="primary" plain>
                    <el-icon><Plus /></el-icon>
                  </el-button>
                </div>
                <div v-if="customModels.length > 0" class="custom-models-list">
                  <el-tag
                    v-for="model in customModels"
                    :key="model.id"
                    closable
                    size="small"
                    @close="removeCustomModel(model.id)"
                  >
                    {{ model.name }}
                  </el-tag>
                </div>
              </el-form-item>
            </div>

            <div class="form-row two-col">
              <el-form-item label="最大 Token">
                <div class="max-tokens-control">
                  <el-checkbox v-model="form.unlimitedTokens" @change="handleUnlimitedTokensChange">
                    无限制
                  </el-checkbox>
                  <el-input-number
                    v-if="!form.unlimitedTokens"
                    v-model="form.maxTokens"
                    :min="1"
                    :max="10000000"
                    :step="1000"
                    style="width: 100%"
                  />
                </div>
              </el-form-item>

              <el-form-item label="创造性">
                <div class="temperature-control">
                  <el-slider
                    v-model="form.temperature"
                    :min="0"
                    :max="1"
                    :step="0.1"
                    :format-tooltip="formatTemperature"
                    show-tooltip
                  />
                  <span class="temp-label">{{ formatTemperature(form.temperature) }}</span>
                </div>
              </el-form-item>
            </div>

            <div class="form-actions">
              <el-button @click="testConnection" :loading="validating" plain>
                <el-icon><Connection /></el-icon>
                测试连接
              </el-button>
              <el-button type="primary" @click="saveConfig" :loading="validating">
                <el-icon><Check /></el-icon>
                保存配置
              </el-button>
              <el-button @click="resetConfig" text>
                重置
              </el-button>
            </div>
          </el-form>
        </section>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Key, Link, Plus, Check, Connection, CircleCheck, CircleClose, InfoFilled } from '@element-plus/icons-vue'
import { useNovelStore } from '../stores/novel.js'

const store = useNovelStore()
const validating = ref(false)
const customModelInput = ref('')
const customModels = ref([])

// 单一配置表单
const form = reactive({
  apiKey: '',
  baseURL: 'https://api.openai.com/v1',
  selectedModel: 'gpt-3.5-turbo',
  maxTokens: 2000000,
  unlimitedTokens: false,
  temperature: 0.7
})

// 预设可选模型
const defaultModels = [
  { id: 'gpt-4o', name: 'GPT-4o', description: 'OpenAI 多模态旗舰' },
  { id: 'gpt-4o-mini', name: 'GPT-4o mini', description: '轻量快速' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: '经典经济' },
  { id: 'claude-3-7-sonnet', name: 'claude-3.7-sonnet', description: 'Claude 创作' },
  { id: 'claude-4-sonnet', name: 'claude-4-sonnet', description: 'Claude 新一代' },
  { id: 'deepseek-reasoner', name: 'deepseek-r1', description: '深度推理' },
  { id: 'deepseek-chat', name: 'deepseek-v3', description: '深度求索对话' },
  { id: 'gemini-2.5-pro-preview-05-06', name: 'gemini-2.5-pro', description: 'Gemini 预览' }
]

const availableModels = computed(() => [...defaultModels, ...customModels.value])
const isApiConfigured = computed(() => store.isApiConfigured)

const formatTemperature = (value) => {
  if (value <= 0.3) return '保守'
  if (value <= 0.7) return '平衡'
  return '创新'
}

const handleUnlimitedTokensChange = () => {
  form.maxTokens = form.unlimitedTokens ? null : 2000000
}

const addCustomModel = () => {
  const modelName = customModelInput.value.trim()
  if (!modelName) return
  if (availableModels.value.some(m => m.id === modelName)) {
    ElMessage.warning('该模型已存在')
    return
  }
  customModels.value.push({ id: modelName, name: modelName, description: '自定义模型' })
  customModelInput.value = ''
  ElMessage.success('自定义模型已添加')
  saveCustomModels()
}

const removeCustomModel = (modelId) => {
  const index = customModels.value.findIndex(m => m.id === modelId)
  if (index > -1) {
    customModels.value.splice(index, 1)
    if (form.selectedModel === modelId) form.selectedModel = 'gpt-3.5-turbo'
    ElMessage.success('自定义模型已移除')
    saveCustomModels()
  }
}

const saveCustomModels = () => {
  localStorage.setItem('customModels', JSON.stringify(customModels.value))
}

const loadCustomModels = () => {
  const saved = localStorage.getItem('customModels')
  if (saved) {
    try { customModels.value = JSON.parse(saved) } catch (e) { console.error('加载自定义模型失败:', e) }
  }
}

const saveConfig = async () => {
  if (!form.apiKey) { ElMessage.warning('请输入 API 密钥'); return }
  if (!form.baseURL) { ElMessage.warning('请输入 API 地址'); return }
  validating.value = true
  try {
    store.updateApiConfig(form)
    const isValid = await store.validateApiKey()
    if (isValid) {
      ElMessage.success('配置保存成功')
    } else {
      ElMessage.error('密钥验证失败，请检查配置')
    }
  } catch (error) {
    ElMessage.error('保存失败：' + error.message)
  } finally {
    validating.value = false
  }
}

const testConnection = async () => {
  if (!form.apiKey) { ElMessage.warning('请先输入 API 密钥'); return }
  validating.value = true
  try {
    store.updateApiConfig(form)
    const isValid = await store.validateApiKey()
    if (isValid) ElMessage.success('连接测试成功')
    else ElMessage.error('连接测试失败')
  } catch (error) {
    ElMessage.error('连接失败：' + error.message)
  } finally {
    validating.value = false
  }
}

const resetConfig = () => {
  Object.assign(form, {
    apiKey: '',
    baseURL: 'https://api.openai.com/v1',
    selectedModel: 'gpt-3.5-turbo',
    maxTokens: 2000000,
    unlimitedTokens: false,
    temperature: 0.7
  })
  ElMessage.info('表单已重置')
}

const loadSavedConfig = () => {
  const saved = localStorage.getItem('apiConfig')
  if (saved) {
    try {
      const config = JSON.parse(saved)
      if (config.unlimitedTokens === undefined) {
        config.unlimitedTokens = config.maxTokens === null
      }
      Object.assign(form, config)
    } catch (e) { console.error('加载配置失败:', e) }
  } else {
    // 向后兼容
    const legacy = localStorage.getItem('customApiConfig')
    if (legacy) {
      try { Object.assign(form, JSON.parse(legacy)) } catch (e) { /* ignore */ }
    }
  }
  store.updateApiConfig(form)
}

onMounted(() => {
  loadCustomModels()
  loadSavedConfig()
})
</script>

<style scoped>
.api-config {
  padding: 4px 8px;
}

.config-card {
  border: none !important;
  box-shadow: none !important;
  background: transparent !important;
}

.config-card :deep(.el-card__header) {
  padding: 20px 24px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-lighter);
  border-radius: var(--radius-md) var(--radius-md) 0 0 !important;
}

.config-card :deep(.el-card__body) {
  padding: 0;
  background: var(--bg-surface);
  border-radius: 0 0 var(--radius-md) var(--radius-md) !important;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-mark {
  font-family: var(--font-display);
  font-size: 32px;
  font-weight: 700;
  color: var(--accent);
  letter-spacing: 0.04em;
  line-height: 1;
}

.header-title h3 {
  margin: 0;
  font-size: 18px;
  color: var(--text-primary);
}

.header-title p {
  margin: 4px 0 0 0;
  font-size: 13px;
  color: var(--text-secondary);
  font-family: var(--font-sans);
}

/* 主体两栏 */
.config-body {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 0;
}

/* 左侧说明 */
.tips-panel {
  padding: 28px 24px;
  background: linear-gradient(160deg, var(--accent-soft) 0%, var(--bg-surface-2) 100%);
  border-right: 1px solid var(--border-lighter);
}

.tips-illustration {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--bg-surface);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30px;
  box-shadow: var(--shadow-sm);
  margin-bottom: 18px;
}

.quill {
  filter: drop-shadow(0 2px 4px rgba(154, 91, 46, 0.3));
}

.tips-panel h4 {
  margin: 0 0 10px 0;
  font-size: 18px;
  color: var(--accent-deep);
}

.tips-lead {
  margin: 0 0 20px 0;
  font-size: 13.5px;
  line-height: 1.7;
  color: var(--text-regular);
}

.tips-block {
  margin-bottom: 18px;
}

.tips-block h5 {
  margin: 0 0 8px 0;
  font-size: 13px;
  color: var(--accent-deep);
  font-family: var(--font-sans);
  font-weight: 600;
  letter-spacing: 0.02em;
}

.tips-block ul {
  margin: 0;
  padding-left: 4px;
  list-style: none;
}

.tips-block li {
  position: relative;
  padding-left: 16px;
  margin-bottom: 6px;
  font-size: 12.5px;
  line-height: 1.6;
  color: var(--text-regular);
}

.tips-block li::before {
  content: '';
  position: absolute;
  left: 2px;
  top: 9px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--accent);
  opacity: 0.6;
}

.tips-note {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 20px;
  padding: 10px 12px;
  background: var(--bg-surface);
  border-radius: var(--radius-sm);
  font-size: 12.5px;
  color: var(--text-secondary);
  border: 1px dashed var(--border-strong);
}

.tips-note .el-icon {
  color: var(--accent);
}

/* 右侧表单 */
.form-panel {
  padding: 28px 28px 24px;
}

.config-form {
  max-width: 640px;
}

.form-row {
  margin-bottom: 4px;
}

.form-row.two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
}

.opt-desc {
  float: right;
  color: var(--text-placeholder);
  font-size: 12px;
}

.custom-model-input {
  display: flex;
  gap: 8px;
}

.custom-models-list {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.max-tokens-control {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.temperature-control {
  display: flex;
  align-items: center;
  gap: 12px;
}

.temperature-control .el-slider {
  flex: 1;
}

.temp-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--accent);
  min-width: 36px;
  text-align: center;
  padding: 2px 8px;
  background: var(--accent-soft);
  border-radius: var(--radius-pill);
}

.form-actions {
  display: flex;
  gap: 10px;
  margin-top: 28px;
  padding-top: 20px;
  border-top: 1px solid var(--border-lighter);
}

:deep(.el-form-item__label) {
  font-weight: 500;
  color: var(--text-regular);
  padding-bottom: 4px;
}

:deep(.el-input__wrapper) {
  background-color: var(--bg-elevated) !important;
}

/* 响应式 */
@media (max-width: 900px) {
  .config-body {
    grid-template-columns: 1fr;
  }
  .tips-panel {
    border-right: none;
    border-bottom: 1px solid var(--border-lighter);
  }
  .form-row.two-col {
    grid-template-columns: 1fr;
  }
}
</style>
