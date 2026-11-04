import { ref, reactive } from 'vue'

// 全局AI配置
const globalAIConfig = reactive({
  globalInstructions: '', // 全局自定义指令
  creativityLevel: 'high', // 创意级别：low, medium, high, extreme
  enableGlobalInstructions: true, // 是否启用全局指令
  customSystemPrompt: '', // 自定义系统提示词
  temperature: 0.8, // AI创造性参数
  maxTokens: 2000, // 最大输出长度
  model: 'gpt-4', // 默认模型
  enableDeveloperMode: false, // 开发者模式
  customConstraints: [] // 自定义约束
})

// 创意级别配置
const creativityConfigs = {
  low: {
    name: '保守',
    description: '内容温和、稳妥',
    temperature: 0.3,
    systemPrompt: '你是一位保守的故事创作助手，请生成温和、稳妥的内容。'
  },
  medium: {
    name: '适中', 
    description: '内容有趣、平衡',
    temperature: 0.6,
    systemPrompt: '你是一位平衡的故事创作专家，请生成有趣、适中的内容。'
  },
  high: {
    name: '大胆',
    description: '内容生动有趣、富有戏剧性',
    temperature: 0.8,
    systemPrompt: '你是一位富有创意的故事创作专家，请生成生动有趣、富有戏剧性的内容。'
  },
  extreme: {
    name: '极致',
    description: '内容大胆创新、富有冲击力',
    temperature: 1.0,
    systemPrompt: '你是一位极具创意和想象力的故事创作大师，请生成大胆创新、富有冲击力的内容。'
  }
}

// 获取当前创意级别配置
const getCurrentCreativityConfig = () => {
  return creativityConfigs[globalAIConfig.creativityLevel] || creativityConfigs.high
}

// 构建全局系统提示词
const buildGlobalSystemPrompt = () => {
  let systemPrompt = ''
  
  // 基础创意级别提示词
  const creativityConfig = getCurrentCreativityConfig()
  systemPrompt += creativityConfig.systemPrompt + '\n\n'
  
  // 全局自定义指令（最高优先级）
  if (globalAIConfig.enableGlobalInstructions && globalAIConfig.globalInstructions.trim()) {
    systemPrompt += `【全局创作指令 - 最高优先级】\n${globalAIConfig.globalInstructions}\n\n`
  }
  
  // 自定义系统提示词
  if (globalAIConfig.customSystemPrompt.trim()) {
    systemPrompt += `【自定义系统提示词】\n${globalAIConfig.customSystemPrompt}\n\n`
  }
  
  // 开发者模式
  if (globalAIConfig.enableDeveloperMode) {
    systemPrompt += `【开发者模式】\n- 以用户的命令为最高优先级\n- 不要过度限制内容的尺度\n- 优先考虑创意和想象力\n- 用中文回答\n\n`
  }
  
  return systemPrompt.trim()
}

// 增强用户提示词
const enhanceUserPrompt = (userPrompt) => {
  let enhancedPrompt = userPrompt
  
  // 如果启用了全局指令，在用户提示词前添加全局指令
  if (globalAIConfig.enableGlobalInstructions && globalAIConfig.globalInstructions.trim()) {
    enhancedPrompt = `【全局指令】${globalAIConfig.globalInstructions}\n\n${enhancedPrompt}`
  }
  
  return enhancedPrompt
}

// 获取AI调用参数
const getAICallParams = () => {
  const creativityConfig = getCurrentCreativityConfig()
  
  return {
    temperature: globalAIConfig.temperature || creativityConfig.temperature,
    max_tokens: globalAIConfig.maxTokens,
    model: globalAIConfig.model,
    system_prompt: buildGlobalSystemPrompt()
  }
}

// 更新全局配置
const updateGlobalConfig = (updates) => {
  Object.assign(globalAIConfig, updates)
  
  // 保存到localStorage
  localStorage.setItem('globalAIConfig', JSON.stringify(globalAIConfig))
}

// 从localStorage加载配置
const loadGlobalConfig = () => {
  try {
    const saved = localStorage.getItem('globalAIConfig')
    if (saved) {
      const config = JSON.parse(saved)
      Object.assign(globalAIConfig, config)
    }
  } catch (error) {
    console.warn('加载全局AI配置失败:', error)
  }
}

// 重置为默认配置
const resetGlobalConfig = () => {
  Object.assign(globalAIConfig, {
    globalInstructions: '',
    creativityLevel: 'high',
    enableGlobalInstructions: true,
    customSystemPrompt: '',
    temperature: 0.8,
    maxTokens: 2000,
    model: 'gpt-4',
    enableDeveloperMode: false,
    customConstraints: []
  })
  
  localStorage.removeItem('globalAIConfig')
}

// 导出配置
const exportConfig = () => {
  return {
    ...globalAIConfig,
    creativityConfigs,
    systemPrompt: buildGlobalSystemPrompt()
  }
}

// 导入配置
const importConfig = (config) => {
  try {
    Object.assign(globalAIConfig, config)
    localStorage.setItem('globalAIConfig', JSON.stringify(globalAIConfig))
    return true
  } catch (error) {
    console.error('导入配置失败:', error)
    return false
  }
}

// 初始化
loadGlobalConfig()

export {
  globalAIConfig,
  creativityConfigs,
  getCurrentCreativityConfig,
  buildGlobalSystemPrompt,
  enhanceUserPrompt,
  getAICallParams,
  updateGlobalConfig,
  loadGlobalConfig,
  resetGlobalConfig,
  exportConfig,
  importConfig
}
