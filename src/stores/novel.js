import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import apiService from '../services/api.js'
import backendApi from '../services/backendApi.js'

export const useNovelStore = defineStore('novel', () => {
  // 状态
  const currentNovel = ref('')
  const generatedContent = ref('')
  const outline = ref('')
  const isGeneratingOutline = ref(false)
  const chapters = ref([])
  const selectedChapter = ref(null)
  const isGeneratingChapter = ref(false)
  const aiChatHistory = ref([])
  const currentChatInput = ref('')
  const isAiChatting = ref(false)
  const templates = ref([])
  const selectedTemplate = ref(null)
  const keywords = ref('')
  const isGenerating = ref(false)
  const corpus = ref([])

  // 后端数据
  const novels = ref([])
  const currentNovelId = ref(null)
  const currentChapterId = ref(null)

  // 写作工具数据
  const characters = ref([])
  const worldSettings = ref([])

  // API配置 - 单一配置（支持任意 OpenAI 格式接口）
  const apiConfig = ref({
    apiKey: '',
    baseURL: 'https://api.openai.com/v1',
    selectedModel: 'gpt-3.5-turbo',
    maxTokens: 2000000,
    unlimitedTokens: false,
    temperature: 0.7
  })

  const isApiConfigured = ref(false)

  // 获取当前API配置
  const getCurrentApiConfig = () => {
    return apiConfig.value
  }

  // 初始化时加载API配置（优先从后端，降级到本地）
  const initializeApiConfig = async () => {
    try {
      // 尝试从后端加载配置
      const token = localStorage.getItem('auth_token')
      if (token) {
        try {
          const config = await backendApi.getAIConfig()
          if (config) {
            apiConfig.value = {
              apiKey: config.api_key,
              baseURL: config.base_url || 'https://api.openai.com/v1',
              selectedModel: config.model || 'gpt-3.5-turbo',
              maxTokens: config.max_tokens || 2000000,
              temperature: config.temperature || 0.7
            }
            isApiConfigured.value = true
            apiService.updateConfig(apiConfig.value)
            return
          }
        } catch (e) {
          console.log('后端配置加载失败，使用本地配置')
        }
      }

      // 降级到本地配置
      const saved = localStorage.getItem('apiConfig')
      if (saved) {
        apiConfig.value = { ...apiConfig.value, ...JSON.parse(saved) }
      } else {
        const legacyCustom = localStorage.getItem('customApiConfig')
        if (legacyCustom) {
          apiConfig.value = { ...apiConfig.value, ...JSON.parse(legacyCustom) }
          localStorage.setItem('apiConfig', JSON.stringify(apiConfig.value))
        }
      }

      isApiConfigured.value = !!apiConfig.value.apiKey
      apiService.updateConfig(apiConfig.value)
    } catch (error) {
      console.error('初始化API配置失败:', error)
    }
  }

  // 保存API配置到后端
  const saveApiConfigToBackend = async () => {
    try {
      await backendApi.saveAIConfig({
        provider: 'openai',
        api_key: apiConfig.value.apiKey,
        base_url: apiConfig.value.baseURL,
        model: apiConfig.value.selectedModel,
        max_tokens: apiConfig.value.maxTokens,
        temperature: apiConfig.value.temperature
      })
    } catch (error) {
      console.error('保存API配置到后端失败:', error)
    }
  }

  // 立即执行初始化
  initializeApiConfig()
  
  // 摘要功能
  const articleSummary = ref('')
  const isGeneratingSummary = ref(false)
  
  // 写作建议
  const writingAdvice = ref('')
  const isGeneratingAdvice = ref(false)
  
  // 文章统计信息
  const articleStats = ref({
    wordCount: 0,
    readingTime: 0,
    sentiment: '',
    tags: [],
    category: '',
    score: 0
  })

  // 计算属性
  const wordCount = computed(() => {
    // 去除HTML标签，计算纯文本字数，与文章统计保持一致
    return currentNovel.value.replace(/<[^>]*>/g, '').length
  })

  const readingTime = computed(() => {
    // 按照每分钟200字的阅读速度计算
    return Math.ceil(wordCount.value / 200)
  })

  // 方法
  const setCurrentNovel = async (content) => {
    currentNovel.value = content
    await updateStats()
  }

  const setGeneratedContent = (content) => {
    generatedContent.value = content
  }

  const addToNovel = async () => {
    if (generatedContent.value) {
      // 如果当前内容为空，直接设置
      if (!currentNovel.value || currentNovel.value === '<p><br></p>') {
        currentNovel.value = `<p>${generatedContent.value}</p>`
      } else {
        // 如果有内容，添加新段落
        currentNovel.value += `<p><br></p><p>${generatedContent.value}</p>`
      }
      await updateStats()
    }
  }

  const clearNovel = async () => {
    currentNovel.value = ''
    await updateStats()
  }

  const setOutline = (content) => {
    outline.value = content
  }

  const setGeneratingOutline = (status) => {
    isGeneratingOutline.value = status
  }

  const clearOutline = () => {
    outline.value = ''
    chapters.value = []
  }

  // 章节管理方法
  const parseOutlineToChapters = () => {
    const outlineText = outline.value
    const chapterRegex = /###\s*(.+?)\n([\s\S]*?)(?=###|$)/g
    const newChapters = []
    let match
    let index = 1
    
    while ((match = chapterRegex.exec(outlineText)) !== null) {
      newChapters.push({
        id: index++,
        title: match[1].trim(),
        content: match[2].trim(),
        generatedText: '',
        isCompleted: false
      })
    }
    
    chapters.value = newChapters
  }

  const setSelectedChapter = (chapter) => {
    selectedChapter.value = chapter
  }

  const updateChapterContent = (chapterId, content) => {
    const chapter = chapters.value.find(c => c.id === chapterId)
    if (chapter) {
      chapter.content = content
    }
  }

  const setChapterGenerated = (chapterId, text) => {
    const chapter = chapters.value.find(c => c.id === chapterId)
    if (chapter) {
      chapter.generatedText = text
      chapter.isCompleted = true
    }
  }

  const setGeneratingChapter = (status) => {
    isGeneratingChapter.value = status
  }

  // AI对话功能
  const addChatMessage = (message, isUser = true) => {
    // 生成唯一ID，避免快速操作时ID重复
    const generateUniqueId = () => {
      const timestamp = Date.now()
      const random = Math.floor(Math.random() * 10000)
      return timestamp + random
    }
    
    aiChatHistory.value.push({
      id: generateUniqueId(),
      content: message,
      isUser,
      timestamp: new Date().toLocaleTimeString()
    })
  }

  const setChatInput = (input) => {
    currentChatInput.value = input
  }

  const setAiChatting = (status) => {
    isAiChatting.value = status
  }

  const clearChatHistory = () => {
    aiChatHistory.value = []
  }

  const setTemplate = (template) => {
    selectedTemplate.value = template
  }

  const setKeywords = (kw) => {
    keywords.value = kw
  }

  const setGenerating = (status) => {
    isGenerating.value = status
  }

  const addCorpus = (text) => {
    // 生成唯一ID，避免快速操作时ID重复
    const generateUniqueId = () => {
      const timestamp = Date.now()
      const random = Math.floor(Math.random() * 10000)
      return timestamp + random
    }
    
    corpus.value.push({
      id: generateUniqueId(),
      content: text,
      createdAt: new Date().toISOString()
    })
  }

  const removeCorpus = (id) => {
    const index = corpus.value.findIndex(item => item.id === id)
    if (index > -1) {
      corpus.value.splice(index, 1)
    }
  }

  const updateStats = async () => {
    // 从HTML中提取纯文本进行统计
    const content = currentNovel.value.replace(/<[^>]*>/g, '')
    
    // 基础统计（立即更新）
    articleStats.value = {
      wordCount: content.length,
      readingTime: Math.ceil(content.length / 200),
      sentiment: analyzeSentiment(content),
      tags: generateTags(content),
      category: categorizeContent(content),
      score: calculateScore(content)
    }
    
    // 如果配置了API且内容足够长，使用AI进行深度分析
    if (isApiConfigured.value && content.length > 100) {
      try {
        await updateStatsWithAI(content)
      } catch (error) {
        console.log('AI分析失败，使用本地分析结果:', error.message)
      }
    }
  }
  
  // 使用AI进行深度文章分析
  const updateStatsWithAI = async (content) => {
    try {
      const analysis = await apiService.analyzeArticle(content)
      
      // 更新AI分析结果
      articleStats.value = {
        ...articleStats.value,
        sentiment: analysis.sentiment || articleStats.value.sentiment,
        tags: analysis.tags || articleStats.value.tags,
        category: analysis.category || articleStats.value.category,
        score: analysis.score || articleStats.value.score,
        aiAnalysis: analysis // 保存完整的AI分析结果
      }
    } catch (error) {
      console.error('AI文章分析失败:', error)
      throw error
    }
  }

  // API配置方法
  const updateApiConfig = (config) => {
    apiConfig.value = { ...apiConfig.value, ...config }
    apiService.updateConfig(apiConfig.value)
    isApiConfigured.value = !!apiConfig.value.apiKey
  }

  const validateApiKey = async () => {
    try {
      const isValid = await apiService.validateAPIKey()
      isApiConfigured.value = isValid
      return isValid
    } catch (error) {
      console.error('API密钥验证失败:', error)
      isApiConfigured.value = false
      return false
    }
  }

  // 使用真实API生成大纲
  const generateOutlineWithAPI = async (theme) => {
    if (!isApiConfigured.value) {
      throw new Error('请先配置API密钥')
    }
    
    setGeneratingOutline(true)
    try {
      const result = await apiService.generateOutline(theme, keywords.value, selectedTemplate.value)
      setOutline(result)
      parseOutlineToChapters()
      return result
    } catch (error) {
      console.error('生成大纲失败:', error)
      throw error
    } finally {
      setGeneratingOutline(false)
    }
  }

  // 流式生成大纲
  const generateOutlineWithAPIStream = async (theme, onChunk = null) => {
    if (!isApiConfigured.value) {
      throw new Error('请先配置API密钥')
    }
    
    setGeneratingOutline(true)
    setOutline('')
    
    try {
      const result = await apiService.generateOutlineStream(theme, keywords.value, selectedTemplate.value, (chunk, fullContent) => {
        setOutline(fullContent)
        if (onChunk) onChunk(chunk, fullContent)
      })
      parseOutlineToChapters()
      return result
    } catch (error) {
      console.error('生成大纲失败:', error)
      throw error
    } finally {
      setGeneratingOutline(false)
    }
  }

  // 使用真实API生成章节内容
  const generateChapterWithAPI = async (chapter, novelInfo = null) => {
    if (!isApiConfigured.value) {
      throw new Error('请先配置API密钥')
    }
    
    setGeneratingChapter(true)
    try {
      const previousContent = currentNovel.value.replace(/<[^>]*>/g, '')
      const result = await apiService.generateChapterContent(
        chapter.title,
        chapter.content,
        previousContent,
        selectedTemplate.value,
        characters.value,
        worldSettings.value,
        novelInfo || {}
      )
      setChapterGenerated(chapter.id, result)
      setGeneratedContent(result)
      return result
    } catch (error) {
      console.error('生成章节内容失败:', error)
      throw error
    } finally {
      setGeneratingChapter(false)
    }
  }

  // AI对话功能
  const sendChatMessageWithAPI = async (message) => {
    if (!isApiConfigured.value) {
      throw new Error('请先配置API密钥')
    }
    
    setAiChatting(true)
    
    try {
      const response = await apiService.chatWithAI(message, aiChatHistory.value)
      addChatMessage(response, false)
      return response
    } catch (error) {
      console.error('AI对话失败:', error)
      addChatMessage('抱歉，AI暂时无法回应，请稍后再试。', false)
      throw error
    } finally {
      setAiChatting(false)
    }
  }

  // 摘要相关方法
  const setGeneratingSummary = (status) => {
    isGeneratingSummary.value = status
  }

  const setArticleSummary = (summary) => {
    articleSummary.value = summary
  }

  // 生成文章摘要
  const generateSummaryWithAPI = async (options = {}) => {
    if (!isApiConfigured.value) {
      throw new Error('请先配置API密钥')
    }
    
    if (!currentNovel.value) {
      throw new Error('请先输入文章内容')
    }
    
    isGeneratingSummary.value = true
    try {
      const content = currentNovel.value.replace(/<[^>]*>/g, '')
      const summary = await apiService.generateSummary(content, options)
      articleSummary.value = summary
      return summary
    } catch (error) {
      console.error('生成摘要失败:', error)
      throw error
    } finally {
      isGeneratingSummary.value = false
    }
  }

  // 获取写作建议
  const getWritingAdviceWithAPI = async () => {
    if (!isApiConfigured.value) {
      throw new Error('请先配置API密钥')
    }
    
    if (!currentNovel.value) {
      throw new Error('请先输入文章内容')
    }
    
    isGeneratingAdvice.value = true
    try {
      const content = currentNovel.value.replace(/<[^>]*>/g, '')
      const advice = await apiService.getWritingAdvice(content)
      writingAdvice.value = advice
      return advice
    } catch (error) {
      console.error('获取写作建议失败:', error)
      throw error
    } finally {
      isGeneratingAdvice.value = false
    }
  }

  // 基于语料库生成个性化内容
  const generatePersonalizedContent = async (prompt) => {
    if (!isApiConfigured.value) {
      throw new Error('请先配置API密钥')
    }
    
    if (corpus.value.length === 0) {
      throw new Error('请先添加语料库内容')
    }
    
    setGenerating(true)
    try {
      const result = await apiService.generatePersonalizedContent(prompt, corpus.value)
      setGeneratedContent(result)
      return result
    } catch (error) {
      console.error('生成个性化内容失败:', error)
      throw error
    } finally {
      setGenerating(false)
    }
  }

  // 使用真实API生成通用内容
  const generateContentWithAPI = async (keywords, template, outline, wordLimit) => {
    if (!isApiConfigured.value) {
      throw new Error('请先配置API密钥')
    }
    
    try {
      const result = await apiService.generateGeneralContent(keywords, template, outline, wordLimit)
      setGeneratedContent(result)
      return result
    } catch (error) {
      console.error('生成内容失败:', error)
      throw error
    }
  }

  // 流式生成内容
  const generateContentWithAPIStream = async (keywords, template, outline, wordLimit, onChunk = null) => {
    if (!isApiConfigured.value) {
      throw new Error('请先配置API密钥')
    }
    
    setGenerating(true)
    setGeneratedContent('') // 清空之前的内容
    
    try {
      const result = await apiService.generateGeneralContentStream(keywords, template, outline, wordLimit, (chunk, fullContent) => {
        // 实时更新生成的内容
        setGeneratedContent(fullContent)
        console.log('流式内容更新:', chunk) // 添加调试日志
        if (onChunk) onChunk(chunk, fullContent)
      })
      console.log('流式生成完成:', result) // 添加调试日志
      return result
    } catch (error) {
      console.error('生成内容失败:', error)
      throw error
    } finally {
      setGenerating(false)
    }
  }

  // 语料库管理
  const addCorpusFromFile = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target.result
        addCorpus(content)
        resolve(content)
      }
      reader.onerror = reject
      reader.readAsText(file)
    })
  }

  const exportCorpus = () => {
    const data = JSON.stringify(corpus.value, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'corpus.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const importCorpus = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result)
          corpus.value = data
          resolve(data)
        } catch (error) {
          reject(new Error('语料库文件格式错误'))
        }
      }
      reader.onerror = reject
      reader.readAsText(file)
    })
  }

  // 简单的情感分析
  const analyzeSentiment = (content) => {
    const positiveWords = ['快乐', '幸福', '美好', '成功', '胜利', '爱', '喜欢']
    const negativeWords = ['悲伤', '痛苦', '失败', '死亡', '恐惧', '愤怒', '绝望']
    
    let positiveCount = 0
    let negativeCount = 0
    
    positiveWords.forEach(word => {
      positiveCount += (content.match(new RegExp(word, 'g')) || []).length
    })
    
    negativeWords.forEach(word => {
      negativeCount += (content.match(new RegExp(word, 'g')) || []).length
    })
    
    if (positiveCount > negativeCount) return '积极'
    if (negativeCount > positiveCount) return '消极'
    return '中性'
  }

  // 生成标签
  const generateTags = (content) => {
    const tags = []
    if (content.includes('修仙') || content.includes('仙人')) tags.push('修仙')
    if (content.includes('爱情') || content.includes('恋人')) tags.push('爱情')
    if (content.includes('悬疑') || content.includes('推理')) tags.push('悬疑')
    if (content.includes('科幻') || content.includes('未来')) tags.push('科幻')
    if (content.includes('古代') || content.includes('穿越')) tags.push('古代')
    return tags
  }

  // 内容分类
  const categorizeContent = (content) => {
    if (content.includes('修仙') || content.includes('异世界')) return '玄幻'
    if (content.includes('都市') || content.includes('现代')) return '都市'
    if (content.includes('悬疑') || content.includes('推理')) return '悬疑'
    if (content.includes('科幻') || content.includes('未来')) return '科幻'
    if (content.includes('古代') || content.includes('历史')) return '历史'
    return '其他'
  }

  // 计算文章评分
  const calculateScore = (content) => {
    let score = 50 // 基础分
    
    // 根据字数调整分数
    if (content.length > 1000) score += 10
    if (content.length > 3000) score += 10
    if (content.length > 5000) score += 10
    
    // 根据段落数调整分数
    const paragraphs = content.split('\n\n').filter(p => p.trim())
    if (paragraphs.length > 3) score += 5
    if (paragraphs.length > 6) score += 5
    
    // 根据对话调整分数
    const dialogues = (content.match(/[""]/g) || []).length
    if (dialogues > 4) score += 5
    
    return Math.min(100, score)
  }

  // 人物管理方法
  const addCharacter = (character) => {
    characters.value.push({
      id: Date.now(),
      ...character,
      traits: character.traitsInput ? character.traitsInput.split(',').map(t => t.trim()).filter(t => t) : []
    })
  }
  
  const removeCharacter = (id) => {
    characters.value = characters.value.filter(char => char.id !== id)
  }
  
  // 世界观设定管理方法
  const addWorldSetting = (setting) => {
    // 生成唯一ID，避免快速操作时ID重复
    const generateUniqueId = () => {
      const timestamp = Date.now()
      const random = Math.floor(Math.random() * 10000)
      return timestamp + random
    }
    
    worldSettings.value.push({
      id: generateUniqueId(),
      ...setting
    })
  }
  
  const removeWorldSetting = (id) => {
    worldSettings.value = worldSettings.value.filter(setting => setting.id !== id)
  }

  const updateWorldSetting = (id, updatedSetting) => {
    const index = worldSettings.value.findIndex(setting => setting.id === id)
    if (index > -1) {
      worldSettings.value[index] = { ...worldSettings.value[index], ...updatedSetting }
    }
  }

  // ========== 后端 API 集成方法 ==========

  // 加载小说列表
  const loadNovelsFromBackend = async () => {
    try {
      const data = await backendApi.getNovels()
      novels.value = data
      return data
    } catch (error) {
      console.error('加载小说列表失败:', error)
      throw error
    }
  }

  // 加载单个小说
  const loadNovelFromBackend = async (novelId) => {
    try {
      const data = await backendApi.getNovel(novelId)
      currentNovelId.value = novelId
      return data
    } catch (error) {
      console.error('加载小说失败:', error)
      throw error
    }
  }

  // 创建小说
  const createNovelInBackend = async (novelData) => {
    try {
      const data = await backendApi.createNovel(novelData)
      await loadNovelsFromBackend()
      return data
    } catch (error) {
      console.error('创建小说失败:', error)
      throw error
    }
  }

  // 更新小说
  const updateNovelInBackend = async (novelId, novelData) => {
    try {
      const data = await backendApi.updateNovel(novelId, novelData)
      await loadNovelsFromBackend()
      return data
    } catch (error) {
      console.error('更新小说失败:', error)
      throw error
    }
  }

  // 删除小说
  const deleteNovelInBackend = async (novelId) => {
    try {
      await backendApi.deleteNovel(novelId)
      await loadNovelsFromBackend()
    } catch (error) {
      console.error('删除小说失败:', error)
      throw error
    }
  }

  // 加载章节列表
  const loadChaptersFromBackend = async (novelId) => {
    try {
      const data = await backendApi.getChapters(novelId)
      chapters.value = data
      return data
    } catch (error) {
      console.error('加载章节列表失败:', error)
      throw error
    }
  }

  // 创建章节
  const createChapterInBackend = async (novelId, chapterData) => {
    try {
      const data = await backendApi.createChapter(novelId, chapterData)
      await loadChaptersFromBackend(novelId)
      return data
    } catch (error) {
      console.error('创建章节失败:', error)
      throw error
    }
  }

  // 更新章节
  const updateChapterInBackend = async (chapterId, chapterData) => {
    try {
      const data = await backendApi.updateChapter(chapterId, chapterData)
      if (currentNovelId.value) {
        await loadChaptersFromBackend(currentNovelId.value)
      }
      return data
    } catch (error) {
      console.error('更新章节失败:', error)
      throw error
    }
  }

  // 删除章节
  const deleteChapterInBackend = async (chapterId) => {
    try {
      await backendApi.deleteChapter(chapterId)
      if (currentNovelId.value) {
        await loadChaptersFromBackend(currentNovelId.value)
      }
    } catch (error) {
      console.error('删除章节失败:', error)
      throw error
    }
  }

  // 加载角色列表
  const loadCharactersFromBackend = async (novelId) => {
    try {
      const data = await backendApi.getCharacters(novelId)
      characters.value = data
      return data
    } catch (error) {
      console.error('加载角色列表失败:', error)
      throw error
    }
  }

  // 创建角色
  const createCharacterInBackend = async (novelId, characterData) => {
    try {
      const data = await backendApi.createCharacter(novelId, characterData)
      await loadCharactersFromBackend(novelId)
      return data
    } catch (error) {
      console.error('创建角色失败:', error)
      throw error
    }
  }

  // 更新角色
  const updateCharacterInBackend = async (characterId, characterData) => {
    try {
      const data = await backendApi.updateCharacter(characterId, characterData)
      if (currentNovelId.value) {
        await loadCharactersFromBackend(currentNovelId.value)
      }
      return data
    } catch (error) {
      console.error('更新角色失败:', error)
      throw error
    }
  }

  // 删除角色
  const deleteCharacterInBackend = async (characterId) => {
    try {
      await backendApi.deleteCharacter(characterId)
      if (currentNovelId.value) {
        await loadCharactersFromBackend(currentNovelId.value)
      }
    } catch (error) {
      console.error('删除角色失败:', error)
      throw error
    }
  }

  // 加载世界观设定
  const loadWorldSettingsFromBackend = async (novelId) => {
    try {
      const data = await backendApi.getWorldSettings(novelId)
      worldSettings.value = data
      return data
    } catch (error) {
      console.error('加载世界观设定失败:', error)
      throw error
    }
  }

  // 创建世界观设定
  const createWorldSettingInBackend = async (novelId, settingData) => {
    try {
      const data = await backendApi.createWorldSetting(novelId, settingData)
      await loadWorldSettingsFromBackend(novelId)
      return data
    } catch (error) {
      console.error('创建世界观设定失败:', error)
      throw error
    }
  }

  // 更新世界观设定
  const updateWorldSettingInBackend = async (settingId, settingData) => {
    try {
      const data = await backendApi.updateWorldSetting(settingId, settingData)
      if (currentNovelId.value) {
        await loadWorldSettingsFromBackend(currentNovelId.value)
      }
      return data
    } catch (error) {
      console.error('更新世界观设定失败:', error)
      throw error
    }
  }

  // 删除世界观设定
  const deleteWorldSettingInBackend = async (settingId) => {
    try {
      await backendApi.deleteWorldSetting(settingId)
      if (currentNovelId.value) {
        await loadWorldSettingsFromBackend(currentNovelId.value)
      }
    } catch (error) {
      console.error('删除世界观设定失败:', error)
      throw error
    }
  }

  // 加载写作目标
  const loadGoalsFromBackend = async () => {
    try {
      const data = await backendApi.getGoals()
      return data
    } catch (error) {
      console.error('加载写作目标失败:', error)
      throw error
    }
  }

  // 更新写作目标
  const updateGoalsInBackend = async (goalsData) => {
    try {
      const data = await backendApi.updateGoals(goalsData)
      return data
    } catch (error) {
      console.error('更新写作目标失败:', error)
      throw error
    }
  }

  // 记录写作活动
  const recordActivityInBackend = async (wordCount) => {
    try {
      const data = await backendApi.recordActivity(wordCount)
      return data
    } catch (error) {
      console.error('记录写作活动失败:', error)
      throw error
    }
  }

  // 加载提示词模板
  const loadPromptsFromBackend = async (category = null) => {
    try {
      const data = await backendApi.getPrompts(category)
      templates.value = data
      return data
    } catch (error) {
      console.error('加载提示词模板失败:', error)
      throw error
    }
  }

  // 创建提示词模板
  const createPromptInBackend = async (promptData) => {
    try {
      const data = await backendApi.createPrompt(promptData)
      await loadPromptsFromBackend()
      return data
    } catch (error) {
      console.error('创建提示词模板失败:', error)
      throw error
    }
  }

  // 更新提示词模板
  const updatePromptInBackend = async (promptId, promptData) => {
    try {
      const data = await backendApi.updatePrompt(promptId, promptData)
      await loadPromptsFromBackend()
      return data
    } catch (error) {
      console.error('更新提示词模板失败:', error)
      throw error
    }
  }

  // 删除提示词模板
  const deletePromptInBackend = async (promptId) => {
    try {
      await backendApi.deletePrompt(promptId)
      await loadPromptsFromBackend()
    } catch (error) {
      console.error('删除提示词模板失败:', error)
      throw error
    }
  }

  // 通用内容生成方法
  const generateContent = async (prompt, onChunk = null) => {
    if (!isApiConfigured.value) {
      throw new Error('请先配置API')
    }
    
    try {
      isGenerating.value = true
      
      // 如果提供了onChunk回调，使用流式API
      if (onChunk) {
        const result = await apiService.generateTextStream(prompt, {
          type: 'content_generation'
        }, (chunk, fullContent) => {
          onChunk(chunk)
        })
        
        return result
      } else {
        // 否则使用流式API（不提供回调）
        const result = await apiService.generateTextStream(prompt, {
          type: 'content_generation'
        }, null)
        
        return result
      }
    } catch (error) {
      console.error('生成内容失败:', error)
      throw error
    } finally {
      isGenerating.value = false
    }
  }

  return {
    // 状态
    currentNovel,
    generatedContent,
    outline,
    isGeneratingOutline,
    chapters,
    selectedChapter,
    isGeneratingChapter,
    aiChatHistory,
    currentChatInput,
    isAiChatting,
    templates,
    selectedTemplate,
    keywords,
    isGenerating,
    corpus,
    characters,
    worldSettings,
    articleStats,
    apiConfig,
    isApiConfigured,
    articleSummary,
    isGeneratingSummary,
    writingAdvice,
    isGeneratingAdvice,
    
    // 计算属性
    wordCount,
    readingTime,
    
    // 方法
    setCurrentNovel,
    setGeneratedContent,
    addToNovel,
    clearNovel,
    setOutline,
    setGeneratingOutline,
    clearOutline,
    parseOutlineToChapters,
    setSelectedChapter,
    updateChapterContent,
    setChapterGenerated,
    setGeneratingChapter,
    addChatMessage,
    setChatInput,
    setAiChatting,
    clearChatHistory,
    setTemplate,
    setKeywords,
    setGenerating,
    addCorpus,
    removeCorpus,
    addCharacter,
    removeCharacter,
    addWorldSetting,
    removeWorldSetting,
    updateWorldSetting,
    updateStats,
    
    // API相关方法
    updateApiConfig,
    getCurrentApiConfig,
    validateApiKey,
    generateOutlineWithAPI,
    generateOutlineWithAPIStream,
    generateChapterWithAPI,
    sendChatMessageWithAPI,
    generateSummaryWithAPI,
    getWritingAdviceWithAPI,
    generatePersonalizedContent,
    generateContentWithAPI,
    generateContentWithAPIStream,
    addCorpusFromFile,
    exportCorpus,
    importCorpus,
    setGeneratingSummary,
    setArticleSummary,
    generateContent,

    // 后端 API 方法
    novels,
    currentNovelId,
    currentChapterId,
    loadNovelsFromBackend,
    loadNovelFromBackend,
    createNovelInBackend,
    updateNovelInBackend,
    deleteNovelInBackend,
    loadChaptersFromBackend,
    createChapterInBackend,
    updateChapterInBackend,
    deleteChapterInBackend,
    loadCharactersFromBackend,
    createCharacterInBackend,
    updateCharacterInBackend,
    deleteCharacterInBackend,
    loadWorldSettingsFromBackend,
    createWorldSettingInBackend,
    updateWorldSettingInBackend,
    deleteWorldSettingInBackend,
    loadGoalsFromBackend,
    updateGoalsInBackend,
    recordActivityInBackend,
    loadPromptsFromBackend,
    createPromptInBackend,
    updatePromptInBackend,
    deletePromptInBackend,
    saveApiConfigToBackend
  }
})