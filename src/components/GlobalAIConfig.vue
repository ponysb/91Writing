<template>
  <el-dialog 
    v-model="visible" 
    title="🤖 全局AI配置" 
    width="800px"
    :close-on-click-modal="false"
  >
    <div class="ai-config-container">
      <!-- 全局指令 -->
      <el-form-item label="全局指令" required>
        <el-input 
          v-model="config.globalInstructions" 
          type="textarea" 
          :rows="4"
          placeholder="设置AI的行为偏好和创作风格，这些指令将应用到所有AI功能中..."
        />
        <div class="form-tip">
          💡 全局指令具有最高优先级，会影响所有AI生成的内容
        </div>
      </el-form-item>
      
      <!-- 创意级别 -->
      <el-form-item label="创意级别">
        <el-radio-group v-model="config.creativityLevel">
          <el-radio 
            v-for="(level, key) in creativityConfigs" 
            :key="key" 
            :label="key"
          >
            <div class="creativity-option">
              <div class="level-name">{{ level.name }}</div>
              <div class="level-desc">{{ level.desc }}</div>
            </div>
          </el-radio>
        </el-radio-group>
      </el-form-item>
      
      <!-- 开发者模式 -->
      <el-form-item label="开发者模式">
        <el-switch 
          v-model="config.enableDeveloperMode"
          active-text="启用"
          inactive-text="禁用"
        />
        <div class="form-tip">
          🔧 开发者模式会添加额外的创作自由度指令
        </div>
      </el-form-item>
      
      <!-- 自定义系统提示词 -->
      <el-form-item label="自定义系统提示词">
        <el-input 
          v-model="config.customSystemPrompt" 
          type="textarea" 
          :rows="3"
          placeholder="自定义系统级别的提示词..."
        />
        <div class="form-tip">
          📝 系统提示词会在全局指令之后应用
        </div>
      </el-form-item>
      
      <!-- 高级设置 -->
      <el-collapse v-model="activeCollapse">
        <el-collapse-item title="高级设置" name="advanced">
          <div class="advanced-settings">
            <!-- 温度参数 -->
            <el-form-item label="创造性参数">
              <el-slider 
                v-model="config.temperature" 
                :min="0" 
                :max="2" 
                :step="0.1"
                show-input
                :format-tooltip="formatTemperature"
              />
              <div class="form-tip">
                温度越高，AI的创造性越强，但可能不够稳定
              </div>
            </el-form-item>
            
            <!-- 最大输出长度 -->
            <el-form-item label="最大输出长度">
              <el-input-number 
                v-model="config.maxTokens" 
                :min="100" 
                :max="8000"
                :step="100"
              />
              <span class="form-tip">tokens</span>
            </el-form-item>
            
            <!-- 模型选择 -->
            <el-form-item label="默认模型">
              <el-select v-model="config.model" placeholder="选择默认模型">
                <el-option label="GPT-4" value="gpt-4" />
                <el-option label="GPT-3.5 Turbo" value="gpt-3.5-turbo" />
                <el-option label="Claude-3" value="claude-3" />
                <el-option label="Gemini Pro" value="gemini-pro" />
              </el-select>
            </el-form-item>
          </div>
        </el-collapse-item>
      </el-collapse>
      
      <!-- 预览系统提示词 -->
      <el-form-item label="系统提示词预览">
        <el-input 
          :value="systemPromptPreview" 
          type="textarea" 
          :rows="6"
          readonly
          placeholder="系统提示词预览..."
        />
        <div class="form-tip">
          📋 这是实际发送给AI的系统提示词
        </div>
      </el-form-item>
    </div>
    
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="resetConfig">重置</el-button>
        <el-button @click="exportConfig">导出配置</el-button>
        <el-button @click="importConfig">导入配置</el-button>
        <el-button type="primary" @click="saveConfig">保存配置</el-button>
      </div>
    </template>
    
    <!-- 导入配置对话框 -->
    <el-dialog v-model="showImportDialog" title="导入配置" width="500px">
      <el-input 
        v-model="importConfigText" 
        type="textarea" 
        :rows="10"
        placeholder="粘贴配置JSON..."
      />
      <template #footer>
        <el-button @click="showImportDialog = false">取消</el-button>
        <el-button type="primary" @click="handleImportConfig">导入</el-button>
      </template>
    </el-dialog>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { 
  globalAIConfig, 
  creativityConfigs, 
  buildGlobalSystemPrompt,
  updateGlobalConfig,
  resetGlobalConfig,
  exportConfig,
  importConfig as importConfigService
} from '../services/aiConfig.js'

const props = defineProps({
  modelValue: Boolean
})

const emit = defineEmits(['update:modelValue'])

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// 本地配置副本
const config = ref({ ...globalAIConfig })
const activeCollapse = ref([])
const showImportDialog = ref(false)
const importConfigText = ref('')

// 系统提示词预览
const systemPromptPreview = computed(() => {
  // 临时更新配置以预览
  const tempConfig = { ...globalAIConfig, ...config.value }
  return buildGlobalSystemPrompt()
})

// 温度参数格式化
const formatTemperature = (value) => {
  if (value < 0.3) return '保守'
  if (value < 0.7) return '适中'
  if (value < 1.0) return '大胆'
  return '极致'
}

// 监听配置变化，实时更新全局配置
watch(config, (newConfig) => {
  updateGlobalConfig(newConfig)
}, { deep: true })

// 保存配置
const saveConfig = () => {
  updateGlobalConfig(config.value)
  ElMessage.success('配置已保存')
  visible.value = false
}

// 重置配置
const resetConfig = () => {
  resetGlobalConfig()
  config.value = { ...globalAIConfig }
  ElMessage.success('配置已重置')
}

// 导出配置
const exportConfig = () => {
  const configData = exportConfig()
  const dataStr = JSON.stringify(configData, null, 2)
  const dataBlob = new Blob([dataStr], { type: 'application/json' })
  const url = URL.createObjectURL(dataBlob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = 'ai-config.json'
  link.click()
  
  URL.revokeObjectURL(url)
  ElMessage.success('配置已导出')
}

// 导入配置
const importConfig = () => {
  showImportDialog.value = true
}

// 处理导入配置
const handleImportConfig = () => {
  try {
    const configData = JSON.parse(importConfigText.value)
    if (importConfigService(configData)) {
      config.value = { ...globalAIConfig }
      showImportDialog.value = false
      importConfigText.value = ''
      ElMessage.success('配置导入成功')
    } else {
      ElMessage.error('配置导入失败')
    }
  } catch (error) {
    ElMessage.error('配置格式错误: ' + error.message)
  }
}
</script>

<style scoped>
.ai-config-container {
  max-height: 600px;
  overflow-y: auto;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.creativity-option {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.level-name {
  font-weight: 500;
  color: #303133;
}

.level-desc {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}

.advanced-settings {
  padding: 16px;
  background-color: #f8f9fa;
  border-radius: 6px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
