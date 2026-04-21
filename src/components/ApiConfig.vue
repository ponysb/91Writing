<template>
  <div class="api-config">
    <el-card class="config-card">
      <template #header>
        <div class="card-header">
          <span>API配置</span>
          <el-tag :type="isApiConfigured ? 'success' : 'danger'" size="small">
            {{ isApiConfigured ? '已配置' : '未配置' }}
          </el-tag>
        </div>
      </template>
      
      <!-- 配置类型选择 -->
      <div class="config-type-selector">
        <el-radio-group v-model="configType" @change="onConfigTypeChange">
          <el-radio-button label="official">🏢 91写作官方API</el-radio-button>
          <el-radio-button label="custom">⚙️ 自定义API配置</el-radio-button>
        </el-radio-group>
      </div>

      <!-- 主要内容区域 - 左右分栏 -->
      <div class="config-main-content">
        <!-- 左侧：配置说明 -->
        <div class="config-tips-panel">
          <!-- 官方配置说明 -->
          <div v-if="configType === 'official'" class="config-tips official-tips">
            <h4>🏢 官方默认配置</h4>
            <div class="tips-content">
              <p><strong>推荐新手使用</strong>，不会自己获取API和配置大模型的用户可以选择91写作官方推出的，API，只需输入密钥即可。采用<strong>按次计费</strong>模式，价格透明。</p>
              
                             <div class="model-info">
                 <h5>推荐模型：</h5>
                 <ul>
                   <li><strong>Claude-4 Sonnet</strong> - ￥0.1/次（默认）</li>
                   <li><strong>Claude Opus 4</strong> - ￥0.5/次（顶级）</li>
                   <li><strong>Claude-3.7 Thinking</strong> - ￥0.2/次（推理）</li>
                   <li><strong>Claude-3.7 Sonnet</strong> - ￥0.1/次（经济）</li>
                 </ul>
               </div>
              
               <div class="usage-steps">
                 <h5>使用步骤：</h5>
                 <ol>
                   <li>输入API密钥</li>
                   <li>选择模型（推荐Claude-4 Sonnet）</li>
                   <li>保存配置即可使用</li>
                   <li><strong>问题交流QQ群：468734087</strong></li>
                 </ol>
               </div>


               <div class="usage-steps">
                 <h5>使用教程：</h5>
                 <ol>
                   <li><a href="https://www.bilibili.com/video/BV1keKgzaER2" target="_blank">API配置教程</a></li>
                   <li><a href="https://www.bilibili.com/video/BV1AYKgzAEne" target="_blank">本地部署及线上部署教程</a></li>
                  </ol>
               </div>
              
              <div class="purchase-info">
                <p>购买API密钥</p>
                <el-button type="primary" size="small" @click="openPurchaseLink">
                  前往购买
                </el-button>
              </div>
            </div>
          </div>

          <!-- 自定义配置说明 -->
          <div v-else class="config-tips custom-tips">
            <h4>⚙️ 自定义配置</h4>
            <div class="tips-content">
              <p><strong>适合高级用户</strong>，仅支持openai格式API。</p>
              
              <div class="params-info">
                <h5>参数说明：</h5>
                <ul>
                  <li><strong>API地址</strong> - 您的API服务地址</li>
                  <li><strong>API密钥</strong> - 身份验证密钥</li>
                  <li><strong>模型选择</strong> - 如果没有想要的模型，支持自定义模型</li>
                  <li><strong>Token限制</strong> - 控制生成长度</li>
                  <li><strong>创造性</strong> - 0保守，1创新</li>
                </ul>
              </div>
              
              <div class="supported-apis">
                <h5>特殊说明：</h5>
                <ul>
                  <li>openai格式api是大模型通用格式，支持所有大模型</li>
                  <li>支持本地部署大模型，如ollama、llmstudio等，自行学习怎么获取openai格式api</li>
                </ul>
              </div>
              
              <div class="supported-models">
                <h5>新增支持模型：</h5>
                <div class="model-group">
                  <h6>通义千问（阿里云）：</h6>
                  <p>qwen-max、qwen-plus、qwen-turbo、qwen2.5系列等</p>
                  <p class="api-tip">默认API地址：https://dashscope.aliyuncs.com/compatible-mode/v1</p>
                </div>
                <div class="model-group">
                  <h6>豆包（火山引擎）：</h6>
                  <p>doubao-seed-1.8、doubao-pro系列、doubao-lite系列等</p>
                  <p class="api-tip">默认API地址：https://ark.cn-beijing.volces.com/api/v3</p>
                </div>
                <div class="model-group">
                  <h6>Kimi（Moonshot）：</h6>
                  <p>moonshot-v1-8k、moonshot-v1-32k、moonshot-v1-128k等</p>
                  <p class="api-tip">默认API地址：https://api.moonshot.cn/v1</p>
                </div>
                <p class="model-note">💡 选择以上模型时，系统会自动填充对应的API地址模板</p>
              </div>

              <div class="usage-steps">
                 <h5>使用教程：</h5>
                 <ol>
                   <li><a href="https://www.bilibili.com/video/BV1keKgzaER2" target="_blank">API配置教程</a></li>
                   <li><a href="https://www.bilibili.com/video/BV1AYKgzAEne" target="_blank">本地部署及线上部署教程</a></li>
                  </ol>
               </div>
              
              <div class="tips-note">
                <p>💡 建议先测试连接再保存配置</p>
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧：配置表单 -->
        <div class="config-form-panel">
          <!-- 官方默认配置 -->
          <div v-if="configType === 'official'" class="official-config">
            <el-alert 
              title="官方默认配置" 
              type="info" 
              :closable="false"
              show-icon
            >
              <template #default>
                使用官方推荐的API服务，稳定可靠。
              </template>
            </el-alert>
            
            <el-form :model="officialForm" label-width="80px" size="small" class="config-form">
              <el-form-item label="API密钥" required>
                <el-input
                  v-model="officialForm.apiKey"
                  type="password"
                  placeholder="请输入API密钥"
                  show-password
                  clearable
                />
              </el-form-item>
              
              <el-form-item label="API地址">
                <el-input
                  v-model="officialForm.baseURL"
                  placeholder="官方API地址"
                  :disabled="true"
                />
                <div class="form-tip">官方优化地址，无需修改</div>
              </el-form-item>
              
              <el-form-item label="推荐模型">
                <el-select v-model="officialForm.selectedModel" placeholder="选择推荐模型">
                  <el-option
                    v-for="model in officialModels"
                    :key="model.id"
                    :label="model.name"
                    :value="model.id"
                  >
                    <div class="model-option">
                      <span class="model-name">{{ model.name }}</span>
                      <span class="model-price">{{ model.price }}</span>
                    </div>
                    <div class="model-description">{{ model.description }}</div>
                  </el-option>
                </el-select>
              </el-form-item>
              
              <el-form-item label="最大Token">
                <div class="max-tokens-control">
                  <el-checkbox v-model="officialForm.unlimitedTokens" @change="handleOfficialUnlimitedTokensChange">
                    无限制Token
                  </el-checkbox>
                  <el-input-number
                    v-if="!officialForm.unlimitedTokens"
                    v-model="officialForm.maxTokens"
                    :min="1"
                    :max="10000000"
                    :step="1000"
                    style="width: 100%"
                  />
                </div>
              </el-form-item>
              
              <el-form-item label="创造性">
                <el-slider
                  v-model="officialForm.temperature"
                  :min="0"
                  :max="1"
                  :step="0.1"
                  :format-tooltip="formatTemperature"
                  show-tooltip
                />
              </el-form-item>
              
              <el-form-item>
                <el-button type="primary" @click="saveOfficialConfig" :loading="validating">
                  {{ validating ? '验证中...' : '保存配置' }}
                </el-button>
                <el-button @click="testOfficialConnection" :loading="validating">
                  测试连接
                </el-button>
              </el-form-item>
            </el-form>
          </div>

          <!-- 自定义配置 -->
          <div v-else class="custom-config">
            <el-alert 
              title="自定义配置" 
              type="warning" 
              :closable="false"
              show-icon
            >
              <template #default>
                高级用户可自定义API地址和模型参数。
              </template>
            </el-alert>
            
            <el-form :model="customForm" label-width="80px" size="small" class="config-form">
              <el-form-item label="API密钥" required>
                <el-input
                  v-model="customForm.apiKey"
                  type="password"
                  placeholder="请输入API密钥"
                  show-password
                  clearable
                />
              </el-form-item>
              
              <el-form-item label="API地址" required>
                <el-input
                  v-model="customForm.baseURL"
                  placeholder="https://api.openai.com/v1"
                  clearable
                />
              </el-form-item>
              
              <el-form-item label="模型选择">
                <el-select 
                  v-model="customForm.selectedModel" 
                  placeholder="选择模型"
                  filterable
                  allow-create
                >
                  <el-option
                    v-for="model in availableModels"
                    :key="model.id"
                    :label="model.name"
                    :value="model.id"
                  >
                    <span>{{ model.name }}</span>
                    <span style="float: right; color: #8492a6; font-size: 12px">
                      {{ model.description }}
                    </span>
                  </el-option>
                </el-select>
              </el-form-item>
              
              <el-form-item label="自定义模型">
                <div class="custom-model-input">
                  <el-input
                    v-model="customModelInput"
                    placeholder="输入自定义模型名称"
                    @keyup.enter="addCustomModel"
                  />
                  <el-button @click="addCustomModel" type="primary" size="small">添加</el-button>
                </div>
                <div v-if="customModels.length > 0" class="custom-models-list">
                  <el-tag
                    v-for="model in customModels"
                    :key="model.id"
                    closable
                    @close="removeCustomModel(model.id)"
                    size="small"
                    style="margin-right: 8px; margin-bottom: 4px;"
                  >
                    {{ model.name }}
                  </el-tag>
                </div>
              </el-form-item>
              
              <el-form-item label="最大Token">
                <div class="max-tokens-control">
                  <el-checkbox v-model="customForm.unlimitedTokens" @change="handleCustomUnlimitedTokensChange">
                    无限制Token
                  </el-checkbox>
                  <el-input-number
                    v-if="!customForm.unlimitedTokens"
                    v-model="customForm.maxTokens"
                    :min="1"
                    :max="10000000"
                    :step="1000"
                    style="width: 100%"
                  />
                </div>
              </el-form-item>
              
              <el-form-item label="创造性">
                <el-slider
                  v-model="customForm.temperature"
                  :min="0"
                  :max="1"
                  :step="0.1"
                  :format-tooltip="formatTemperature"
                  show-tooltip
                />
              </el-form-item>
              
              <el-form-item>
                <el-button type="primary" @click="saveCustomConfig" :loading="validating">
                  {{ validating ? '验证中...' : '保存配置' }}
                </el-button>
                <el-button @click="testCustomConnection" :loading="validating">
                  测试连接
                </el-button>
                <el-button @click="resetCustomConfig">重置</el-button>
              </el-form-item>
            </el-form>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useNovelStore } from '../stores/novel.js'
import apiService from '../services/api.js'

const store = useNovelStore()
const validating = ref(false)
const customModelInput = ref('')
const customModels = ref([])
const configType = ref('official') // 'official' 或 'custom'

// 官方默认配置
const officialForm = reactive({
  apiKey: '',
  baseURL: 'https://ai.91hub.vip/v1',
  selectedModel: 'claude-4-sonnet',
  maxTokens: 2000000,
  unlimitedTokens: false,
  temperature: 0.7
})

// 自定义配置
const customForm = reactive({
  apiKey: '',
  baseURL: 'https://api.openai.com/v1',
  selectedModel: 'gpt-3.5-turbo',
  maxTokens: 2000000,
  unlimitedTokens: false,
  temperature: 0.7
})

// 官方推荐模型（带价格）
const officialModels = [
  {
    id: 'claude-4-sonnet',
    name: 'Claude-4 Sonnet',
    description: '最新一代Claude模型，擅长创意写作和长文本处理',
    price: '￥0.1/次'
  },
  {
    id: 'claude-opus-4-20250514',
    name: 'Claude Opus 4',
    description: '最强性能Claude模型，顶级创作能力',
    price: '￥0.5/次'
  },
  {
    id: 'claude-3-7-sonnet-thinking',
    name: 'Claude-3.7 Sonnet Thinking',
    description: '具备思维链的Claude模型，逻辑推理强',
    price: '￥0.2/次'
  },
  {
    id: 'claude-3-7-sonnet-20250219',
    name: 'Claude-3.7 Sonnet',
    description: '高性能版本，平衡性能与成本',
    price: '￥0.1/次'
  }
]

// 模型默认API地址映射
const modelApiEndpoints = {
  // 通义千问（阿里云）
  'qwen-max': 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  'qwen-plus': 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  'qwen-turbo': 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  'qwen2.5-72b-instruct': 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  'qwen2.5-14b-instruct': 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  'qwen2.5-7b-instruct': 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  
  // 豆包（火山引擎）
  'doubao-seed-1.8': 'https://ark.cn-beijing.volces.com/api/v3',
  'doubao-pro-32k': 'https://ark.cn-beijing.volces.com/api/v3',
  'doubao-pro-128k': 'https://ark.cn-beijing.volces.com/api/v3',
  'doubao-lite-32k': 'https://ark.cn-beijing.volces.com/api/v3',
  'doubao-lite-128k': 'https://ark.cn-beijing.volces.com/api/v3',
  
  // Kimi（Moonshot）
  'moonshot-v1-8k': 'https://api.moonshot.cn/v1',
  'moonshot-v1-32k': 'https://api.moonshot.cn/v1',
  'moonshot-v1-128k': 'https://api.moonshot.cn/v1'
}

// 自定义配置可选模型
const defaultModels = [
  {
    id: 'deepseek-reasoner',
    name: 'deepseek-r1',
    description: 'deepseek-r1'
  },
  {
    id: 'deepseek-chat',
    name: 'deepseek-v3',
    description: 'deepseek-v3'
  },
  {
    id: 'claude-3.7-sonnet',
    name: 'claude-3.7-sonnet',
    description: 'claude-3.7-sonnet'
  },
  {
    id: 'claude-4-sonnet',
    name: 'claude-4-sonnet',
    description: 'claude-4-sonnet'
  },
  {
    id: 'gemini-2.5-pro-preview-05-06',
    name: 'gemini-2.5-pro-preview-05-06',
    description: 'gemini-2.5-pro-preview-05-06'
  },
  // 通义千问系列模型
  {
    id: 'qwen-max',
    name: 'qwen-max',
    description: '通义千问超强大模型'
  },
  {
    id: 'qwen-plus',
    name: 'qwen-plus',
    description: '通义千问高性价比模型'
  },
  {
    id: 'qwen-turbo',
    name: 'qwen-turbo',
    description: '通义千问快速响应模型'
  },
  {
    id: 'qwen2.5-72b-instruct',
    name: 'qwen2.5-72b-instruct',
    description: '通义千问2.5 72B版本'
  },
  {
    id: 'qwen2.5-14b-instruct',
    name: 'qwen2.5-14b-instruct',
    description: '通义千问2.5 14B版本'
  },
  {
    id: 'qwen2.5-7b-instruct',
    name: 'qwen2.5-7b-instruct',
    description: '通义千问2.5 7B版本'
  },
  // 豆包系列模型
  {
    id: 'doubao-seed-1.8',
    name: 'doubao-seed-1.8',
    description: '豆包种子模型1.8版本'
  },
  {
    id: 'doubao-pro-32k',
    name: 'doubao-pro-32k',
    description: '豆包专业版 32K上下文'
  },
  {
    id: 'doubao-pro-128k',
    name: 'doubao-pro-128k',
    description: '豆包专业版 128K上下文'
  },
  {
    id: 'doubao-lite-32k',
    name: 'doubao-lite-32k',
    description: '豆包轻量版 32K上下文'
  },
  {
    id: 'doubao-lite-128k',
    name: 'doubao-lite-128k',
    description: '豆包轻量版 128K上下文'
  },
  // Kimi系列模型
  {
    id: 'moonshot-v1-8k',
    name: 'moonshot-v1-8k',
    description: 'Kimi 8K上下文模型'
  },
  {
    id: 'moonshot-v1-32k',
    name: 'moonshot-v1-32k',
    description: 'Kimi 32K上下文模型'
  },
  {
    id: 'moonshot-v1-128k',
    name: 'moonshot-v1-128k',
    description: 'Kimi 128K上下文模型'
  }
]

const availableModels = computed(() => {
  return [...defaultModels, ...customModels.value]
})

const isApiConfigured = computed(() => store.isApiConfigured)

// 监听模型选择变化，自动填充对应的API地址
watch(() => customForm.selectedModel, (newModel) => {
  if (newModel && modelApiEndpoints[newModel]) {
    // 只有当API地址是默认值或者为空时，才自动填充
    if (customForm.baseURL === 'https://api.openai.com/v1' || customForm.baseURL === '') {
      customForm.baseURL = modelApiEndpoints[newModel]
    }
  }
})

const formatTemperature = (value) => {
  if (value <= 0.3) return '保守'
  if (value <= 0.7) return '平衡'
  return '创新'
}

// 打开购买链接
const openPurchaseLink = () => {
  window.open('https://item.taobao.com/item.htm?ft=t&id=938261705242', '_blank')
}

// 配置类型切换
const onConfigTypeChange = (type) => {
  configType.value = type
  // 根据配置类型更新store中的配置
  const currentForm = type === 'official' ? officialForm : customForm
  store.updateApiConfig(currentForm, type)
  store.switchConfigType(type)
}

// 官方配置相关方法
const handleOfficialUnlimitedTokensChange = () => {
  if (officialForm.unlimitedTokens) {
    officialForm.maxTokens = null
  } else {
    officialForm.maxTokens = 2000000
  }
}

const saveOfficialConfig = async () => {
  if (!officialForm.apiKey) {
    ElMessage.warning('请输入API密钥')
    return
  }
  
  // 确保官方配置始终使用正确的API地址
  officialForm.baseURL = 'https://ai.91hub.vip/v1'
  
  validating.value = true
  try {
    // 使用新的store API，指定配置类型为官方配置
    store.updateApiConfig(officialForm, 'official')
    store.switchConfigType('official')
    const isValid = await store.validateApiKey()
    
    if (isValid) {
      ElMessage.success('官方配置保存成功')
      localStorage.setItem('officialApiConfig', JSON.stringify(officialForm))
    } else {
      ElMessage.error('API密钥验证失败，请检查配置')
    }
  } catch (error) {
    ElMessage.error('配置保存失败：' + error.message)
  } finally {
    validating.value = false
  }
}

const testOfficialConnection = async () => {
  if (!officialForm.apiKey) {
    ElMessage.warning('请先输入API密钥')
    return
  }
  
  // 确保官方配置始终使用正确的API地址
  officialForm.baseURL = 'https://ai.91hub.vip/v1'
  
  validating.value = true
  try {
    // 使用新的store API进行测试
    store.updateApiConfig(officialForm, 'official')
    store.switchConfigType('official')
    const isValid = await store.validateApiKey()
    
    if (isValid) {
      ElMessage.success('官方配置连接测试成功')
    } else {
      ElMessage.error('连接测试失败')
    }
  } catch (error) {
    ElMessage.error('连接测试失败：' + error.message)
  } finally {
    validating.value = false
  }
}

// 自定义配置相关方法
const handleCustomUnlimitedTokensChange = () => {
  if (customForm.unlimitedTokens) {
    customForm.maxTokens = null
  } else {
    customForm.maxTokens = 2000000
  }
}

const addCustomModel = () => {
  const modelName = customModelInput.value.trim()
  if (!modelName) return
  
  const exists = availableModels.value.some(model => model.id === modelName)
  if (exists) {
    ElMessage.warning('该模型已存在')
    return
  }
  
  customModels.value.push({
    id: modelName,
    name: modelName,
    description: '自定义模型'
  })
  
  customModelInput.value = ''
  ElMessage.success('自定义模型添加成功')
  saveCustomModels()
}

const removeCustomModel = (modelId) => {
  const index = customModels.value.findIndex(model => model.id === modelId)
  if (index > -1) {
    customModels.value.splice(index, 1)
    
    if (customForm.selectedModel === modelId) {
      customForm.selectedModel = 'gpt-3.5-turbo'
    }
    
    ElMessage.success('自定义模型删除成功')
    saveCustomModels()
  }
}

const saveCustomModels = () => {
  localStorage.setItem('customModels', JSON.stringify(customModels.value))
}

const loadCustomModels = () => {
  const saved = localStorage.getItem('customModels')
  if (saved) {
    try {
      customModels.value = JSON.parse(saved)
    } catch (error) {
      console.error('加载自定义模型失败:', error)
    }
  }
}

const saveCustomConfig = async () => {
  if (!customForm.apiKey) {
    ElMessage.warning('请输入API密钥')
    return
  }
  
  validating.value = true
  try {
    // 使用新的store API，指定配置类型为自定义配置
    store.updateApiConfig(customForm, 'custom')
    store.switchConfigType('custom')
    const isValid = await store.validateApiKey()
    
    if (isValid) {
      ElMessage.success('自定义配置保存成功')
      localStorage.setItem('customApiConfig', JSON.stringify(customForm))
    } else {
      ElMessage.error('API密钥验证失败，请检查配置')
    }
  } catch (error) {
    ElMessage.error('配置保存失败：' + error.message)
  } finally {
    validating.value = false
  }
}

const testCustomConnection = async () => {
  if (!customForm.apiKey) {
    ElMessage.warning('请先输入API密钥')
    return
  }
  
  validating.value = true
  try {
    // 使用新的store API进行测试
    store.updateApiConfig(customForm, 'custom')
    store.switchConfigType('custom')
    const isValid = await store.validateApiKey()
    
    if (isValid) {
      ElMessage.success('自定义配置连接测试成功')
    } else {
      ElMessage.error('连接测试失败')
    }
  } catch (error) {
    ElMessage.error('连接测试失败：' + error.message)
  } finally {
    validating.value = false
  }
}

const resetCustomConfig = () => {
  Object.assign(customForm, {
    apiKey: '',
    baseURL: 'https://api.openai.com/v1',
    selectedModel: 'gpt-3.5-turbo',
    maxTokens: 2000000,
    unlimitedTokens: false,
    temperature: 0.7
  })
  localStorage.removeItem('customApiConfig')
  ElMessage.success('自定义配置已重置')
}

// 加载保存的配置
const loadSavedConfig = () => {
  // 加载配置类型
  const savedType = localStorage.getItem('apiConfigType') || 'official'
  configType.value = savedType
  
  // 加载官方配置 - 只允许加载API密钥，其他参数保持默认值
  const savedOfficial = localStorage.getItem('officialApiConfig')
  if (savedOfficial) {
    try {
      const config = JSON.parse(savedOfficial)
      // 官方配置只允许覆盖API密钥，其他参数（特别是baseURL）保持默认值
      if (config.apiKey) {
        officialForm.apiKey = config.apiKey
      }
      // 其他参数可以覆盖，但baseURL必须保持官方地址
      if (config.selectedModel) {
        officialForm.selectedModel = config.selectedModel
      }
      if (config.maxTokens !== undefined) {
        officialForm.maxTokens = config.maxTokens
      }
      if (config.unlimitedTokens !== undefined) {
        officialForm.unlimitedTokens = config.unlimitedTokens
      } else if (config.maxTokens === null) {
        officialForm.unlimitedTokens = true
      }
      if (config.temperature !== undefined) {
        officialForm.temperature = config.temperature
      }
      // 强制保持官方API地址，不允许被覆盖
      officialForm.baseURL = 'https://ai.91hub.vip/v1'
    } catch (error) {
      console.error('加载官方配置失败:', error)
    }
  }
  
  // 加载自定义配置 - 完全独立的数据源
  const savedCustom = localStorage.getItem('customApiConfig')
  if (savedCustom) {
    try {
      const config = JSON.parse(savedCustom)
      if (config.unlimitedTokens === undefined) {
        config.unlimitedTokens = config.maxTokens === null
      }
      Object.assign(customForm, config)
    } catch (error) {
      console.error('加载自定义配置失败:', error)
    }
  }
  
  // 应用当前配置类型的配置到store
  const currentForm = configType.value === 'official' ? officialForm : customForm
  store.updateApiConfig(currentForm, configType.value)
  store.switchConfigType(configType.value)
}

onMounted(() => {
  loadCustomModels()
  loadSavedConfig()
})
</script>

<style scoped>
.api-config {
  padding: 20px;
  max-width: 100%;
}

.config-card {
  max-width: 1600px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.config-type-selector {
  margin-bottom: 20px;
  text-align: center;
}

/* 主要内容区域 - 左右分栏布局 */
.config-main-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
  align-items: start;
}

/* 左侧配置说明面板 */
.config-tips-panel {
  min-height: 400px;
}

.config-tips {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 20px;
  height: 100%;
}

.config-tips.official-tips {
  background: #e8f4fd;
  border-color: #b3d9f7;
}

.config-tips.custom-tips {
  background: #fef4e8;
  border-color: #f7d9b3;
}

.config-tips h4 {
  margin: 0 0 12px 0;
  color: #2c3e50;
  font-size: 16px;
  font-weight: 600;
}

.config-tips h5 {
  margin: 16px 0 8px 0;
  color: #34495e;
  font-size: 14px;
  font-weight: 600;
}

.tips-content p {
  margin: 0 0 12px 0;
  color: #5a6c7d;
  line-height: 1.5;
}

.tips-content ul,
.tips-content ol {
  margin: 8px 0;
  padding-left: 20px;
}

.tips-content li {
  margin-bottom: 4px;
  color: #5a6c7d;
  line-height: 1.4;
  font-size: 13px;
}

.purchase-info {
  margin-top: 16px;
  padding: 12px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 6px;
  text-align: center;
}

.purchase-info p {
  margin: 0 0 8px 0;
  font-size: 13px;
}

.tips-note {
  margin-top: 16px;
  padding: 8px 12px;
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 4px;
}

.tips-note p {
  margin: 0;
  font-size: 12px;
  color: #856404;
}

/* 右侧配置表单面板 */
.config-form-panel {
  min-height: 400px;
}

.config-form {
  margin-top: 16px;
  padding: 0 8px;
}

.model-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.model-name {
  font-weight: 500;
}

.model-price {
  color: #F56C6C;
  font-size: 12px;
  font-weight: 600;
}

.model-description {
  color: #909399;
  font-size: 12px;
  margin-top: 2px;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.custom-model-input {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.custom-models-list {
  margin-top: 8px;
}

.max-tokens-control {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 新增支持模型样式 */
.supported-models {
  margin-top: 16px;
}

.supported-models h5 {
  margin: 16px 0 8px 0;
  color: #34495e;
  font-size: 14px;
  font-weight: 600;
}

.model-group {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 8px;
}

.model-group h6 {
  margin: 0 0 6px 0;
  color: #2c3e50;
  font-size: 13px;
  font-weight: 600;
}

.model-group p {
  margin: 0 0 4px 0;
  color: #5a6c7d;
  font-size: 12px;
  line-height: 1.4;
}

.model-group .api-tip {
  color: #409EFF;
  font-size: 11px;
  font-family: monospace;
  background: #ecf5ff;
  padding: 4px 8px;
  border-radius: 4px;
  margin-top: 6px;
}

.model-note {
  margin-top: 12px;
  padding: 8px 12px;
  background: #f0f9eb;
  border: 1px solid #c2e7b0;
  border-radius: 4px;
  color: #67c23a;
  font-size: 12px;
}

/* 响应式布局 */
@media (max-width: 900px) {
  .config-main-content {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .config-tips-panel,
  .config-form-panel {
    min-height: auto;
  }
  
  .config-card {
    max-width: 100%;
  }
}

@media (max-width: 1200px) and (min-width: 901px) {
  .config-main-content {
    grid-template-columns: 1fr 1fr;
    gap: 24px;
  }
}

:deep(.el-form-item__label) {
  font-weight: 500;
}

:deep(.el-slider__runway) {
  margin: 16px 0;
}

:deep(.el-radio-button__inner) {
  padding: 10px 20px;
  font-weight: 500;
}

:deep(.el-alert) {
  margin-bottom: 16px;
}

.official-config, .custom-config {
  min-height: 350px;
}
</style>