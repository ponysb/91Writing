/**
 * 自动国际化工具
 * 用于处理后台数据的自动翻译和字典翻译的结合
 */

import { getCurrentLocale } from '@/locales'

// 缓存翻译结果，避免重复翻译
const translationCache = new Map()

// 常用词汇的字典映射
const commonDictionary = {
  'zh-CN': {
    // 小说相关
    '创作中': 'writing',
    '已完成': 'completed', 
    '已暂停': 'paused',
    '草稿': 'draft',
    '已发布': 'published',
    '主角': 'protagonist',
    '配角': 'supporting',
    '反派': 'antagonist',
    '路人': 'minor',
    '男': 'male',
    '女': 'female',
    '其他': 'other',
    '奇幻': 'fantasy',
    '科幻': 'sci-fi',
    '现代': 'modern',
    '历史': 'historical',
    '参考': 'reference',
    '描写': 'description',
    '对话': 'dialogue',
    '情节': 'plot',
    '未命名小说': 'Untitled Novel',
    '未命名世界观': 'Untitled Worldview',
    '暂无简介': 'No description',
    '暂无数据': 'No data',
    '字': 'words',
    '部作品': 'works',
    '次': 'times',
    '本周': 'This week',
    '章节目录': 'Chapter List',
    '新增章节': 'Add Chapter',
    '返回列表': 'Back to List',
    '保存': 'Save',
    '设置': 'Settings',
    '取消': 'Cancel',
    '确认': 'Confirm',
    '编辑': 'Edit',
    '删除': 'Delete',
    '创建第一章': 'Create First Chapter',
    '请选择或创建一个章节开始编写': 'Please select or create a chapter to start writing',
    '章节标题': 'Chapter Title',
    '章节状态': 'Chapter Status',
    '章节纲要': 'Chapter Outline',
    '小说标题': 'Novel Title',
    '小说简介': 'Novel Description',
    '小说状态': 'Novel Status',
    '目标字数': 'Target Word Count',
    '请输入章节标题': 'Please enter chapter title',
    '请选择状态': 'Please select status',
    '请输入章节纲要，描述本章的主要内容和情节发展...': 'Please enter chapter outline, describe the main content and plot development of this chapter...',
    '请输入小说标题': 'Please enter novel title',
    '请输入小说简介': 'Please enter novel description'
  },
  'en-US': {
    // 英文到中文的映射（反向）
    'writing': '创作中',
    'completed': '已完成',
    'paused': '已暂停',
    'draft': '草稿',
    'published': '已发布',
    'protagonist': '主角',
    'supporting': '配角',
    'antagonist': '反派',
    'minor': '路人',
    'male': '男',
    'female': '女',
    'other': '其他',
    'fantasy': '奇幻',
    'sci-fi': '科幻',
    'modern': '现代',
    'historical': '历史',
    'reference': '参考',
    'description': '描写',
    'dialogue': '对话',
    'plot': '情节',
    'Untitled Novel': '未命名小说',
    'Untitled Worldview': '未命名世界观',
    'No description': '暂无简介',
    'No data': '暂无数据',
    'words': '字',
    'works': '部作品',
    'times': '次',
    'This week': '本周'
  }
}

/**
 * 获取字典翻译
 * @param {string} text - 要翻译的文本
 * @param {string} targetLang - 目标语言
 * @returns {string|null} - 翻译结果或null
 */
function getDictionaryTranslation(text, targetLang) {
  const currentLang = getCurrentLocale()
  if (currentLang === targetLang) return text
  
  const dictionary = commonDictionary[currentLang]
  return dictionary?.[text] || null
}

/**
 * 自动翻译文本
 * @param {string} text - 要翻译的文本
 * @param {string} targetLang - 目标语言 ('zh-CN' | 'en-US')
 * @returns {Promise<string>} - 翻译结果
 */
export async function autoTranslate(text, targetLang = null) {
  if (!text || typeof text !== 'string') return text
  
  const currentLang = getCurrentLocale()
  const target = targetLang || (currentLang === 'zh-CN' ? 'en-US' : 'zh-CN')
  
  // 如果目标语言和当前语言相同，直接返回
  if (currentLang === target) return text
  
  // 生成缓存键
  const cacheKey = `${text}_${currentLang}_${target}`
  
  // 检查缓存
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey)
  }
  
  // 首先尝试字典翻译
  const dictionaryResult = getDictionaryTranslation(text, target)
  if (dictionaryResult) {
    translationCache.set(cacheKey, dictionaryResult)
    return dictionaryResult
  }
  
  // 如果字典中没有，使用在线翻译API（这里可以集成百度翻译、谷歌翻译等）
  try {
    const translatedText = await translateWithAPI(text, currentLang, target)
    translationCache.set(cacheKey, translatedText)
    return translatedText
  } catch (error) {
    console.warn('Auto translation failed:', error)
    return text // 翻译失败时返回原文
  }
}

/**
 * 使用API进行翻译（示例实现）
 * @param {string} text - 要翻译的文本
 * @param {string} from - 源语言
 * @param {string} to - 目标语言
 * @returns {Promise<string>} - 翻译结果
 */
async function translateWithAPI(text, from, to) {
  // 这里可以集成实际的翻译API
  // 例如：百度翻译API、谷歌翻译API等
  
  // 示例：使用免费的翻译服务（需要根据实际情况调整）
  try {
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text,
        from: from === 'zh-CN' ? 'zh' : 'en',
        to: to === 'zh-CN' ? 'zh' : 'en'
      })
    })
    
    if (response.ok) {
      const result = await response.json()
      return result.translatedText || text
    }
  } catch (error) {
    console.error('Translation API error:', error)
  }
  
  return text
}

/**
 * 批量翻译对象中的文本字段
 * @param {Object} obj - 要翻译的对象
 * @param {Array<string>} fields - 需要翻译的字段名数组
 * @param {string} targetLang - 目标语言
 * @returns {Promise<Object>} - 翻译后的对象
 */
export async function autoTranslateObject(obj, fields = [], targetLang = null) {
  if (!obj || typeof obj !== 'object') return obj
  
  const result = { ...obj }
  
  for (const field of fields) {
    if (result[field] && typeof result[field] === 'string') {
      result[field] = await autoTranslate(result[field], targetLang)
    }
  }
  
  return result
}

/**
 * 批量翻译数组中对象的指定字段
 * @param {Array} array - 要翻译的数组
 * @param {Array<string>} fields - 需要翻译的字段名数组
 * @param {string} targetLang - 目标语言
 * @returns {Promise<Array>} - 翻译后的数组
 */
export async function autoTranslateArray(array, fields = [], targetLang = null) {
  if (!Array.isArray(array)) return array
  
  const promises = array.map(item => autoTranslateObject(item, fields, targetLang))
  return Promise.all(promises)
}

/**
 * 智能翻译：根据当前语言环境自动翻译
 * @param {string} text - 要翻译的文本
 * @returns {Promise<string>} - 翻译结果
 */
export async function smartTranslate(text) {
  const currentLang = getCurrentLocale()
  
  // 如果当前是中文环境，且文本是中文，则翻译为英文
  if (currentLang === 'en-US' && /[\u4e00-\u9fa5]/.test(text)) {
    return autoTranslate(text, 'en-US')
  }
  
  // 如果当前是英文环境，且文本是英文，则翻译为中文
  if (currentLang === 'zh-CN' && /^[a-zA-Z\s]+$/.test(text)) {
    return autoTranslate(text, 'zh-CN')
  }
  
  return text
}

/**
 * 清除翻译缓存
 */
export function clearTranslationCache() {
  translationCache.clear()
}

/**
 * 添加自定义字典条目
 * @param {string} lang - 语言代码
 * @param {Object} entries - 字典条目
 */
export function addDictionaryEntries(lang, entries) {
  if (!commonDictionary[lang]) {
    commonDictionary[lang] = {}
  }
  Object.assign(commonDictionary[lang], entries)
}