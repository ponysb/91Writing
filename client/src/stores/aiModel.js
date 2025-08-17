import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { aiModelAPI } from '@/api'
import { ElMessage } from 'element-plus'

export const useAiModelStore = defineStore('aiModel', () => {
  // 可用模型列表
  const availableModels = ref([])
  
  // 当前选中的模型ID
  const selectedModelId = ref(null)
  
  // 加载状态
  const loading = ref(false)
  
  // 获取当前选中的模型信息
  const currentModel = computed(() => {
    return availableModels.value.find(model => model.id === selectedModelId.value)
  })
  
  // 加载可用模型列表
  const loadAvailableModels = async () => {
    try {
      loading.value = true
      const response = await aiModelAPI.getModels()
      console.log('AI模型API响应:', response)
      
      let modelsData = []
      
      // 处理不同的API响应格式
      if (response.data) {
        if (Array.isArray(response.data)) {
          // 直接数组格式: { data: [...] }
          modelsData = response.data
        } else if (response.data.data && Array.isArray(response.data.data)) {
          // 嵌套data字段: { data: { data: [...] } }
          modelsData = response.data.data
        } else if (response.data.models && Array.isArray(response.data.models)) {
          // 直接models字段: { models: [...] }
          modelsData = response.data.models
        }
      }
      
      console.log('解析后的模型数据:', modelsData)
      availableModels.value = modelsData
      
      // 设置默认选中的模型，优先使用用户保存的选择
      if (availableModels.value.length > 0) {
        const savedModelId = localStorage.getItem('selectedModelId')
        const foundModel = savedModelId && availableModels.value.find(model => model.id == savedModelId)
        if (foundModel) {
          selectedModelId.value = foundModel.id
        } else {
          const defaultModel = availableModels.value.find(model => model.is_default) || availableModels.value[0]
          selectedModelId.value = defaultModel.id
          // 当保存的模型不存在时，更新localStorage为新选择的模型
          localStorage.setItem('selectedModelId', defaultModel.id.toString())
        }
      }
      
      if (availableModels.value.length === 0) {
        ElMessage.warning('暂无可用的AI模型')
      }
    } catch (error) {
      console.error('加载AI模型列表失败:', error)
      ElMessage.error('加载AI模型列表失败')
    } finally {
      loading.value = false
    }
  }
  
  // 切换模型
  const selectModel = (modelId) => {
    const model = availableModels.value.find(m => m.id === modelId)
    if (model) {
      selectedModelId.value = modelId
      // 保存用户偏好到localStorage
      localStorage.setItem('selectedModelId', modelId.toString())
      console.log('切换到模型:', modelId)
      ElMessage.success(`已切换到 ${model.display_name || model.name}`)
    }
  }
  
  // 初始化模型选择（从localStorage恢复）
  const initializeModelSelection = () => {
    const savedModelId = localStorage.getItem('selectedModelId')
    if (savedModelId && availableModels.value.length > 0) {
      const foundModel = availableModels.value.find(model => model.id == savedModelId)
      if (foundModel) {
        selectedModelId.value = foundModel.id
      }
    }
  }
  
  return {
    availableModels,
    selectedModelId,
    currentModel,
    loading,
    loadAvailableModels,
    selectModel,
    initializeModelSelection
  }
})