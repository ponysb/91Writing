/**
 * Vue组合式函数：自动国际化
 * 提供响应式的自动翻译功能
 */

import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { getCurrentLocale } from '@/locales'
import { autoTranslate, autoTranslateObject, autoTranslateArray, smartTranslate } from '@/utils/autoI18n'

/**
 * 自动国际化组合式函数
 * @returns {Object} 包含翻译相关的响应式数据和方法
 */
export function useAutoI18n() {
  const { t } = useI18n()
  const currentLocale = ref(getCurrentLocale())
  
  // 监听语言变化
  watch(() => getCurrentLocale(), (newLocale) => {
    currentLocale.value = newLocale
  })
  
  /**
   * 自动翻译文本
   * @param {string} text - 要翻译的文本
   * @param {string} targetLang - 目标语言
   * @returns {Promise<string>} 翻译结果
   */
  const translateText = async (text, targetLang = null) => {
    return await autoTranslate(text, targetLang)
  }
  
  /**
   * 智能翻译（根据当前语言环境自动判断）
   * @param {string} text - 要翻译的文本
   * @returns {Promise<string>} 翻译结果
   */
  const smartTranslateText = async (text) => {
    return await smartTranslate(text)
  }
  
  /**
   * 创建响应式翻译文本
   * @param {string} text - 要翻译的文本
   * @returns {Object} 包含原文和翻译的响应式对象
   */
  const createReactiveTranslation = (text) => {
    const original = ref(text)
    const translated = ref(text)
    const isTranslating = ref(false)
    
    const updateTranslation = async () => {
      if (!original.value) {
        translated.value = ''
        return
      }
      
      isTranslating.value = true
      try {
        translated.value = await smartTranslateText(original.value)
      } catch (error) {
        console.warn('Translation failed:', error)
        translated.value = original.value
      } finally {
        isTranslating.value = false
      }
    }
    
    // 监听原文变化
    watch(original, updateTranslation, { immediate: true })
    
    // 监听语言变化
    watch(currentLocale, updateTranslation)
    
    return {
      original,
      translated,
      isTranslating,
      updateTranslation
    }
  }
  
  /**
   * 翻译对象中的指定字段
   * @param {Object} obj - 要翻译的对象
   * @param {Array<string>} fields - 需要翻译的字段
   * @returns {Promise<Object>} 翻译后的对象
   */
  const translateObject = async (obj, fields = []) => {
    return await autoTranslateObject(obj, fields)
  }
  
  /**
   * 翻译数组中对象的指定字段
   * @param {Array} array - 要翻译的数组
   * @param {Array<string>} fields - 需要翻译的字段
   * @returns {Promise<Array>} 翻译后的数组
   */
  const translateArray = async (array, fields = []) => {
    return await autoTranslateArray(array, fields)
  }
  
  /**
   * 创建响应式翻译对象
   * @param {Object} initialData - 初始数据
   * @param {Array<string>} translatableFields - 需要翻译的字段
   * @returns {Object} 响应式翻译对象
   */
  const createReactiveTranslationObject = (initialData, translatableFields = []) => {
    const data = ref({ ...initialData })
    const translatedData = ref({ ...initialData })
    const isTranslating = ref(false)
    
    const updateTranslations = async () => {
      if (!data.value) return
      
      isTranslating.value = true
      try {
        translatedData.value = await translateObject(data.value, translatableFields)
      } catch (error) {
        console.warn('Object translation failed:', error)
        translatedData.value = { ...data.value }
      } finally {
        isTranslating.value = false
      }
    }
    
    // 监听数据变化
    watch(data, updateTranslations, { deep: true, immediate: true })
    
    // 监听语言变化
    watch(currentLocale, updateTranslations)
    
    return {
      data,
      translatedData,
      isTranslating,
      updateTranslations
    }
  }
  
  /**
   * 创建响应式翻译数组
   * @param {Array} initialArray - 初始数组
   * @param {Array<string>} translatableFields - 需要翻译的字段
   * @returns {Object} 响应式翻译数组
   */
  const createReactiveTranslationArray = (initialArray, translatableFields = []) => {
    const array = ref([...initialArray])
    const translatedArray = ref([...initialArray])
    const isTranslating = ref(false)
    
    const updateTranslations = async () => {
      if (!array.value || !Array.isArray(array.value)) return
      
      isTranslating.value = true
      try {
        translatedArray.value = await translateArray(array.value, translatableFields)
      } catch (error) {
        console.warn('Array translation failed:', error)
        translatedArray.value = [...array.value]
      } finally {
        isTranslating.value = false
      }
    }
    
    // 监听数组变化
    watch(array, updateTranslations, { deep: true, immediate: true })
    
    // 监听语言变化
    watch(currentLocale, updateTranslations)
    
    return {
      array,
      translatedArray,
      isTranslating,
      updateTranslations
    }
  }
  
  /**
   * 混合翻译：优先使用字典，回退到自动翻译
   * @param {string} key - 字典键
   * @param {string} fallbackText - 回退文本
   * @param {Object} params - 插值参数
   * @returns {Promise<string>} 翻译结果
   */
  const hybridTranslate = async (key, fallbackText = '', params = {}) => {
    try {
      // 首先尝试使用字典翻译
      const dictResult = t(key, params)
      if (dictResult !== key) {
        return dictResult
      }
    } catch (error) {
      console.warn('Dictionary translation failed:', error)
    }
    
    // 如果字典翻译失败，使用自动翻译
    if (fallbackText) {
      return await smartTranslateText(fallbackText)
    }
    
    return key
  }
  
  /**
   * 获取状态文本的翻译
   * @param {string} status - 状态值
   * @param {string} type - 状态类型（如：novel, chapter等）
   * @returns {Promise<string>} 翻译后的状态文本
   */
  const getStatusText = async (status, type = 'common') => {
    const key = `${type}.status.${status}`
    return await hybridTranslate(key, status)
  }
  
  return {
    currentLocale: computed(() => currentLocale.value),
    translateText,
    smartTranslateText,
    createReactiveTranslation,
    translateObject,
    translateArray,
    createReactiveTranslationObject,
    createReactiveTranslationArray,
    hybridTranslate,
    getStatusText,
    t // 导出原始的t函数
  }
}

/**
 * 自动翻译指令
 * 用于在模板中自动翻译文本内容
 */
export const vAutoTranslate = {
  async mounted(el, binding) {
    const { value, modifiers } = binding
    if (!value) return
    
    try {
      const translatedText = await smartTranslate(value)
      if (modifiers.html) {
        el.innerHTML = translatedText
      } else {
        el.textContent = translatedText
      }
    } catch (error) {
      console.warn('Auto translate directive failed:', error)
    }
  },
  
  async updated(el, binding) {
    const { value, modifiers } = binding
    if (!value) return
    
    try {
      const translatedText = await smartTranslate(value)
      if (modifiers.html) {
        el.innerHTML = translatedText
      } else {
        el.textContent = translatedText
      }
    } catch (error) {
      console.warn('Auto translate directive failed:', error)
    }
  }
}