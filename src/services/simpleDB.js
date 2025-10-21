/**
 * 简化版 IndexedDB 数据库服务
 * 无需外部依赖，直接使用原生 IndexedDB API
 * 提供稳定的数据持久化解决方案
 */

class SimpleIndexedDB {
  constructor() {
    this.dbName = '91WritingDB'
    this.version = 1
    this.db = null
    this.isReady = false
    this.initPromise = this.init()
  }

  // 初始化数据库
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)

      request.onerror = () => {
        console.error('❌ IndexedDB 打开失败:', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        this.isReady = true
        console.log('✅ IndexedDB 数据库已就绪')
        resolve(this.db)
      }

      request.onupgradeneeded = (event) => {
        const db = event.target.result
        console.log('🔄 创建/升级数据库结构...')

        // 创建对象存储（表）
        if (!db.objectStoreNames.contains('novels')) {
          const novelStore = db.createObjectStore('novels', { keyPath: 'id', autoIncrement: true })
          novelStore.createIndex('title', 'title', { unique: false })
          novelStore.createIndex('updatedAt', 'updatedAt', { unique: false })
        }

        if (!db.objectStoreNames.contains('chapters')) {
          const chapterStore = db.createObjectStore('chapters', { keyPath: 'id', autoIncrement: true })
          chapterStore.createIndex('novelId', 'novelId', { unique: false })
        }

        if (!db.objectStoreNames.contains('characters')) {
          const characterStore = db.createObjectStore('characters', { keyPath: 'id', autoIncrement: true })
          characterStore.createIndex('novelId', 'novelId', { unique: false })
        }

        if (!db.objectStoreNames.contains('worldSettings')) {
          const settingStore = db.createObjectStore('worldSettings', { keyPath: 'id', autoIncrement: true })
          settingStore.createIndex('novelId', 'novelId', { unique: false })
        }

        if (!db.objectStoreNames.contains('corpusData')) {
          const corpusStore = db.createObjectStore('corpusData', { keyPath: 'id', autoIncrement: true })
          corpusStore.createIndex('novelId', 'novelId', { unique: false })
        }

        if (!db.objectStoreNames.contains('events')) {
          const eventStore = db.createObjectStore('events', { keyPath: 'id', autoIncrement: true })
          eventStore.createIndex('novelId', 'novelId', { unique: false })
        }

        if (!db.objectStoreNames.contains('prompts')) {
          db.createObjectStore('prompts', { keyPath: 'id', autoIncrement: true })
        }

        if (!db.objectStoreNames.contains('apiConfigs')) {
          const configStore = db.createObjectStore('apiConfigs', { keyPath: 'id', autoIncrement: true })
          configStore.createIndex('type', 'type', { unique: false })
        }

        if (!db.objectStoreNames.contains('backups')) {
          const backupStore = db.createObjectStore('backups', { keyPath: 'id', autoIncrement: true })
          backupStore.createIndex('createdAt', 'createdAt', { unique: false })
        }
      }
    })
  }

  // 确保数据库已就绪
  async ensureReady() {
    if (!this.isReady) {
      await this.initPromise
    }
    return this.db
  }

  // 通用保存方法
  async save(storeName, data) {
    await this.ensureReady()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      
      const now = new Date()
      
      // 使用数据清理方法确保数据可以被存储
      const cleanData = this.sanitizeData(data)
      const saveData = {
        ...cleanData,
        updatedAt: now
      }
      
      if (!data.id) {
        saveData.createdAt = now
      }
      
      console.log(`准备保存到 ${storeName}:`, saveData)
      
      const request = data.id ? store.put(saveData) : store.add(saveData)
      
      request.onsuccess = () => {
        console.log(`💾 保存到 ${storeName} 成功:`, request.result)
        resolve(request.result)
      }
      
      request.onerror = () => {
        console.error(`❌ 保存到 ${storeName} 失败:`, request.error)
        console.error('失败的数据:', saveData)
        reject(request.error)
      }
      
      transaction.onerror = () => {
        console.error(`❌ 事务失败:`, transaction.error)
        reject(transaction.error)
      }
    })
  }

  // 深度克隆方法，处理特殊对象和 Vue 响应式对象
  deepClone(obj) {
    if (obj === null || obj === undefined) {
      return obj
    }
    
    // 处理基本类型
    if (typeof obj !== 'object') {
      return obj
    }
    
    // 处理日期对象
    if (obj instanceof Date) {
      return new Date(obj.getTime())
    }
    
    // 处理正则表达式
    if (obj instanceof RegExp) {
      return new RegExp(obj)
    }
    
    // 处理数组
    if (Array.isArray(obj)) {
      return obj.map(item => this.deepClone(item))
    }
    
    // 处理普通对象和 Vue 响应式对象
    if (typeof obj === 'object') {
      const cloned = {}
      
      // 获取对象的所有可枚举属性
      const keys = Object.keys(obj)
      for (const key of keys) {
        // 跳过 Vue 的内部属性
        if (key.startsWith('__') || key.startsWith('_')) {
          continue
        }
        
        try {
          const value = obj[key]
          // 跳过函数和 Symbol
          if (typeof value === 'function' || typeof value === 'symbol') {
            continue
          }
          
          cloned[key] = this.deepClone(value)
        } catch (error) {
          // 如果访问属性时出错，跳过该属性
          console.warn(`跳过属性 ${key}:`, error.message)
          continue
        }
      }
      
      return cloned
    }
    
    return obj
  }

  // 数据清理方法，确保数据可以被 IndexedDB 存储
  sanitizeData(data) {
    try {
      // 先尝试 JSON 序列化和反序列化来清理数据
      const jsonString = JSON.stringify(data)
      return JSON.parse(jsonString)
    } catch (error) {
      console.warn('JSON 序列化失败，使用深度克隆:', error)
      return this.deepClone(data)
    }
  }

  // 通用获取方法
  async get(storeName, id) {
    await this.ensureReady()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.get(id)
      
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  // 通用获取所有方法
  async getAll(storeName, indexName = null, indexValue = null) {
    await this.ensureReady()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly')
      const store = transaction.objectStore(storeName)
      
      let request
      if (indexName && indexValue !== null) {
        const index = store.index(indexName)
        request = index.getAll(indexValue)
      } else {
        request = store.getAll()
      }
      
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  // 通用删除方法
  async delete(storeName, id) {
    await this.ensureReady()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.delete(id)
      
      request.onsuccess = () => {
        console.log(`🗑️ 从 ${storeName} 删除成功:`, id)
        resolve(true)
      }
      request.onerror = () => reject(request.error)
    })
  }

  // 小说相关操作
  async saveNovel(novelData) {
    try {
      // 验证和清理小说数据
      const cleanNovelData = {
        title: String(novelData.title || ''),
        genre: String(novelData.genre || ''),
        status: String(novelData.status || 'writing'),
        description: String(novelData.description || ''),
        cover: String(novelData.cover || ''),
        tags: Array.isArray(novelData.tags) ? novelData.tags.map(String) : [],
        wordCount: Number(novelData.wordCount || 0),
        chapters: Number(novelData.chapters || 0),
        totalWords: Number(novelData.totalWords || 0),
        avgWordsPerChapter: Number(novelData.avgWordsPerChapter || 0),
        writingDays: Number(novelData.writingDays || 0),
        genrePrompt: String(novelData.genrePrompt || ''),
        // 确保关联数组是简单数组
        chapterList: Array.isArray(novelData.chapterList) ? novelData.chapterList : [],
        characters: Array.isArray(novelData.characters) ? novelData.characters : [],
        worldSettings: Array.isArray(novelData.worldSettings) ? novelData.worldSettings : [],
        corpusData: Array.isArray(novelData.corpusData) ? novelData.corpusData : [],
        events: Array.isArray(novelData.events) ? novelData.events : [],
        writingRecords: Array.isArray(novelData.writingRecords) ? novelData.writingRecords : []
      }
      
      // 如果有 ID，保留它
      if (novelData.id) {
        cleanNovelData.id = novelData.id
      }
      
      // 如果有时间戳，保留它们
      if (novelData.createdAt) {
        cleanNovelData.createdAt = new Date(novelData.createdAt)
      }
      if (novelData.updatedAt) {
        cleanNovelData.updatedAt = new Date(novelData.updatedAt)
      }
      
      console.log('清理后的小说数据:', cleanNovelData)
      
      return await this.save('novels', cleanNovelData)
    } catch (error) {
      console.error('保存小说失败:', error)
      throw error
    }
  }

  async getNovel(id) {
    return await this.get('novels', id)
  }

  async getAllNovels() {
    const novels = await this.getAll('novels')
    return novels.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
  }

  async deleteNovel(id) {
    // 删除小说及其相关数据
    const chapters = await this.getAll('chapters', 'novelId', id)
    const characters = await this.getAll('characters', 'novelId', id)
    const worldSettings = await this.getAll('worldSettings', 'novelId', id)
    const corpusData = await this.getAll('corpusData', 'novelId', id)
    const events = await this.getAll('events', 'novelId', id)

    // 删除相关数据
    for (const chapter of chapters) await this.delete('chapters', chapter.id)
    for (const character of characters) await this.delete('characters', character.id)
    for (const setting of worldSettings) await this.delete('worldSettings', setting.id)
    for (const corpus of corpusData) await this.delete('corpusData', corpus.id)
    for (const event of events) await this.delete('events', event.id)

    // 删除小说本身
    return await this.delete('novels', id)
  }

  // 章节操作
  async saveChapter(chapterData) {
    return await this.save('chapters', chapterData)
  }

  async getChaptersByNovel(novelId) {
    const chapters = await this.getAll('chapters', 'novelId', novelId)
    return chapters.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
  }

  async deleteChapter(id) {
    return await this.delete('chapters', id)
  }

  // 角色操作
  async saveCharacter(characterData) {
    return await this.save('characters', characterData)
  }

  async getCharactersByNovel(novelId) {
    return await this.getAll('characters', 'novelId', novelId)
  }

  async deleteCharacter(id) {
    return await this.delete('characters', id)
  }

  // 世界观设定操作
  async saveWorldSetting(settingData) {
    return await this.save('worldSettings', settingData)
  }

  async getWorldSettingsByNovel(novelId) {
    return await this.getAll('worldSettings', 'novelId', novelId)
  }

  async deleteWorldSetting(id) {
    return await this.delete('worldSettings', id)
  }

  // 语料库操作
  async saveCorpus(corpusData) {
    return await this.save('corpusData', corpusData)
  }

  async getCorpusByNovel(novelId) {
    return await this.getAll('corpusData', 'novelId', novelId)
  }

  async deleteCorpus(id) {
    return await this.delete('corpusData', id)
  }

  // 事件操作
  async saveEvent(eventData) {
    return await this.save('events', eventData)
  }

  async getEventsByNovel(novelId) {
    const events = await this.getAll('events', 'novelId', novelId)
    return events.sort((a, b) => new Date(a.date) - new Date(b.date))
  }

  async deleteEvent(id) {
    return await this.delete('events', id)
  }

  // 提示词操作
  async savePrompt(promptData) {
    return await this.save('prompts', promptData)
  }

  async getAllPrompts() {
    return await this.getAll('prompts')
  }

  async deletePrompt(id) {
    return await this.delete('prompts', id)
  }

  // API配置操作
  async saveApiConfig(configData) {
    // 先清除所有活动状态
    const allConfigs = await this.getAll('apiConfigs')
    for (const config of allConfigs) {
      if (config.isActive) {
        await this.save('apiConfigs', { ...config, isActive: false })
      }
    }
    
    // 保存新的活动配置
    return await this.save('apiConfigs', { ...configData, isActive: true })
  }

  async getActiveApiConfig() {
    const configs = await this.getAll('apiConfigs')
    return configs.find(config => config.isActive)
  }

  // 数据备份
  async createBackup(type = 'auto') {
    try {
      const backupData = {
        novels: await this.getAllNovels(),
        prompts: await this.getAllPrompts(),
        timestamp: new Date().toISOString(),
        type: type
      }

      // 为每个小说获取相关数据
      for (const novel of backupData.novels) {
        novel.chapters = await this.getChaptersByNovel(novel.id)
        novel.characters = await this.getCharactersByNovel(novel.id)
        novel.worldSettings = await this.getWorldSettingsByNovel(novel.id)
        novel.corpusData = await this.getCorpusByNovel(novel.id)
        novel.events = await this.getEventsByNovel(novel.id)
      }

      const backupId = await this.save('backups', {
        type,
        data: backupData,
        size: JSON.stringify(backupData).length
      })

      console.log(`💾 创建备份成功: ${backupId}`)
      
      // 清理旧备份（保留最近5个）
      const backups = await this.getAll('backups')
      if (backups.length > 5) {
        const sortedBackups = backups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        for (let i = 5; i < sortedBackups.length; i++) {
          await this.delete('backups', sortedBackups[i].id)
        }
      }

      return backupId
    } catch (error) {
      console.error('❌ 创建备份失败:', error)
      throw error
    }
  }

  // 数据迁移：从 localStorage 到 IndexedDB
  async migrateFromLocalStorage() {
    try {
      console.log('🔄 开始数据迁移...')
      
      // 检查是否已有数据
      const existingNovels = await this.getAllNovels()
      if (existingNovels.length > 0) {
        console.log('📦 IndexedDB 中已有数据，跳过迁移')
        return false
      }

      // 迁移小说数据
      const novelsJson = localStorage.getItem('novels')
      if (novelsJson) {
        const novels = JSON.parse(novelsJson)
        console.log(`📚 发现 ${novels.length} 部小说，开始迁移...`)
        
        for (const novel of novels) {
          // 保存小说基本信息
          const savedNovel = await this.saveNovel({
            title: novel.title,
            genre: novel.genre,
            status: novel.status || 'writing',
            description: novel.description,
            cover: novel.cover,
            tags: novel.tags || [],
            wordCount: novel.wordCount || 0,
            createdAt: new Date(novel.createdAt),
            updatedAt: new Date(novel.updatedAt)
          })

          const novelId = savedNovel

          // 迁移章节
          if (novel.chapterList && novel.chapterList.length > 0) {
            for (const chapter of novel.chapterList) {
              await this.saveChapter({
                novelId: novelId,
                title: chapter.title,
                content: chapter.content || '',
                description: chapter.description || '',
                status: chapter.status || 'draft',
                wordCount: chapter.wordCount || 0,
                createdAt: new Date(chapter.createdAt || chapter.updatedAt || Date.now()),
                updatedAt: new Date(chapter.updatedAt || Date.now())
              })
            }
          }

          // 迁移角色
          if (novel.characters && novel.characters.length > 0) {
            for (const character of novel.characters) {
              await this.saveCharacter({
                novelId: novelId,
                name: character.name,
                description: character.description || '',
                tags: character.tags || [],
                personality: character.personality || '',
                background: character.background || '',
                relationships: character.relationships || '',
                abilities: character.abilities || ''
              })
            }
          }

          // 迁移世界观设定
          if (novel.worldSettings && novel.worldSettings.length > 0) {
            for (const setting of novel.worldSettings) {
              await this.saveWorldSetting({
                novelId: novelId,
                title: setting.title,
                description: setting.description || '',
                content: setting.content || ''
              })
            }
          }

          // 迁移语料库
          if (novel.corpusData && novel.corpusData.length > 0) {
            for (const corpus of novel.corpusData) {
              await this.saveCorpus({
                novelId: novelId,
                title: corpus.title,
                content: corpus.content || '',
                tags: corpus.tags || []
              })
            }
          }

          // 迁移事件
          if (novel.events && novel.events.length > 0) {
            for (const event of novel.events) {
              await this.saveEvent({
                novelId: novelId,
                title: event.title,
                description: event.description || '',
                date: new Date(event.date || event.createdAt || Date.now())
              })
            }
          }
        }
      }

      // 迁移提示词
      const promptsJson = localStorage.getItem('prompts')
      if (promptsJson) {
        const prompts = JSON.parse(promptsJson)
        console.log(`📝 发现 ${prompts.length} 个提示词，开始迁移...`)
        
        for (const prompt of prompts) {
          await this.savePrompt(prompt)
        }
      }

      // 创建迁移备份
      await this.createBackup('migration')
      
      console.log('✅ 数据迁移完成！')
      return true
    } catch (error) {
      console.error('❌ 数据迁移失败:', error)
      return false
    }
  }

  // 导出数据
  async exportAllData() {
    try {
      const novels = await this.getAllNovels()
      
      // 为每个小说加载完整数据
      for (const novel of novels) {
        novel.chapterList = await this.getChaptersByNovel(novel.id)
        novel.characters = await this.getCharactersByNovel(novel.id)
        novel.worldSettings = await this.getWorldSettingsByNovel(novel.id)
        novel.corpusData = await this.getCorpusByNovel(novel.id)
        novel.events = await this.getEventsByNovel(novel.id)
      }

      const exportData = {
        novels: novels,
        prompts: await this.getAllPrompts(),
        exportTime: new Date().toISOString(),
        version: '2.0',
        source: 'IndexedDB'
      }

      return exportData
    } catch (error) {
      console.error('❌ 导出数据失败:', error)
      throw error
    }
  }
}

// 创建数据库实例
const db = new SimpleIndexedDB()

// 自动迁移检查
db.initPromise.then(async () => {
  try {
    // 检查是否需要从 localStorage 迁移
    const hasLocalStorage = localStorage.getItem('novels') || localStorage.getItem('prompts')
    if (hasLocalStorage) {
      const migrated = await db.migrateFromLocalStorage()
      if (migrated) {
        // 迁移成功后的提示
        if (window.ElMessage) {
          window.ElMessage.success('🎉 数据已成功迁移到更稳定的存储系统！')
        }
      }
    }
  } catch (error) {
    console.error('自动迁移失败:', error)
  }
})

export default db