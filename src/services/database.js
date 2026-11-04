/**
 * IndexedDB 数据库服务
 * 使用 Dexie.js 提供强大的本地数据库功能
 * 解决数据持久化和丢失问题
 */

import Dexie from 'dexie'

class WritingDatabase extends Dexie {
  constructor() {
    super('91WritingDB')
    
    // 定义数据库结构
    this.version(1).stores({
      novels: '++id, title, genre, status, createdAt, updatedAt, *tags',
      chapters: '++id, novelId, title, content, status, wordCount, createdAt, updatedAt',
      characters: '++id, novelId, name, description, *tags, createdAt',
      worldSettings: '++id, novelId, title, description, content, createdAt',
      corpusData: '++id, novelId, title, content, *tags, createdAt',
      events: '++id, novelId, title, description, date, createdAt',
      prompts: '++id, title, category, description, content, *tags, isDefault',
      apiConfigs: '++id, type, config, isActive, createdAt',
      backups: '++id, type, data, createdAt'
    })

    // 定义表的映射
    this.novels = this.table('novels')
    this.chapters = this.table('chapters')
    this.characters = this.table('characters')
    this.worldSettings = this.table('worldSettings')
    this.corpusData = this.table('corpusData')
    this.events = this.table('events')
    this.prompts = this.table('prompts')
    this.apiConfigs = this.table('apiConfigs')
    this.backups = this.table('backups')
  }

  // 小说相关操作
  async saveNovel(novelData) {
    try {
      if (novelData.id) {
        return await this.novels.put(novelData)
      } else {
        return await this.novels.add({
          ...novelData,
          createdAt: new Date(),
          updatedAt: new Date()
        })
      }
    } catch (error) {
      console.error('保存小说失败:', error)
      throw error
    }
  }

  async getNovel(id) {
    try {
      return await this.novels.get(id)
    } catch (error) {
      console.error('获取小说失败:', error)
      throw error
    }
  }

  async getAllNovels() {
    try {
      return await this.novels.orderBy('updatedAt').reverse().toArray()
    } catch (error) {
      console.error('获取小说列表失败:', error)
      throw error
    }
  }

  async deleteNovel(id) {
    try {
      // 删除小说及其相关数据
      await this.transaction('rw', [
        this.novels,
        this.chapters,
        this.characters,
        this.worldSettings,
        this.corpusData,
        this.events
      ], async () => {
        await this.novels.delete(id)
        await this.chapters.where('novelId').equals(id).delete()
        await this.characters.where('novelId').equals(id).delete()
        await this.worldSettings.where('novelId').equals(id).delete()
        await this.corpusData.where('novelId').equals(id).delete()
        await this.events.where('novelId').equals(id).delete()
      })
    } catch (error) {
      console.error('删除小说失败:', error)
      throw error
    }
  }

  // 章节相关操作
  async saveChapter(chapterData) {
    try {
      if (chapterData.id) {
        return await this.chapters.put({
          ...chapterData,
          updatedAt: new Date()
        })
      } else {
        return await this.chapters.add({
          ...chapterData,
          createdAt: new Date(),
          updatedAt: new Date()
        })
      }
    } catch (error) {
      console.error('保存章节失败:', error)
      throw error
    }
  }

  async getChaptersByNovel(novelId) {
    try {
      return await this.chapters
        .where('novelId')
        .equals(novelId)
        .orderBy('createdAt')
        .toArray()
    } catch (error) {
      console.error('获取章节列表失败:', error)
      throw error
    }
  }

  async deleteChapter(id) {
    try {
      return await this.chapters.delete(id)
    } catch (error) {
      console.error('删除章节失败:', error)
      throw error
    }
  }

  // 角色相关操作
  async saveCharacter(characterData) {
    try {
      if (characterData.id) {
        return await this.characters.put(characterData)
      } else {
        return await this.characters.add({
          ...characterData,
          createdAt: new Date()
        })
      }
    } catch (error) {
      console.error('保存角色失败:', error)
      throw error
    }
  }

  async getCharactersByNovel(novelId) {
    try {
      return await this.characters
        .where('novelId')
        .equals(novelId)
        .toArray()
    } catch (error) {
      console.error('获取角色列表失败:', error)
      throw error
    }
  }

  async deleteCharacter(id) {
    try {
      return await this.characters.delete(id)
    } catch (error) {
      console.error('删除角色失败:', error)
      throw error
    }
  }

  // 世界观设定操作
  async saveWorldSetting(settingData) {
    try {
      if (settingData.id) {
        return await this.worldSettings.put(settingData)
      } else {
        return await this.worldSettings.add({
          ...settingData,
          createdAt: new Date()
        })
      }
    } catch (error) {
      console.error('保存世界观设定失败:', error)
      throw error
    }
  }

  async getWorldSettingsByNovel(novelId) {
    try {
      return await this.worldSettings
        .where('novelId')
        .equals(novelId)
        .toArray()
    } catch (error) {
      console.error('获取世界观设定失败:', error)
      throw error
    }
  }

  // 语料库操作
  async saveCorpus(corpusData) {
    try {
      if (corpusData.id) {
        return await this.corpusData.put(corpusData)
      } else {
        return await this.corpusData.add({
          ...corpusData,
          createdAt: new Date()
        })
      }
    } catch (error) {
      console.error('保存语料失败:', error)
      throw error
    }
  }

  async getCorpusByNovel(novelId) {
    try {
      return await this.corpusData
        .where('novelId')
        .equals(novelId)
        .toArray()
    } catch (error) {
      console.error('获取语料列表失败:', error)
      throw error
    }
  }

  // 事件线操作
  async saveEvent(eventData) {
    try {
      if (eventData.id) {
        return await this.events.put(eventData)
      } else {
        return await this.events.add({
          ...eventData,
          createdAt: new Date()
        })
      }
    } catch (error) {
      console.error('保存事件失败:', error)
      throw error
    }
  }

  async getEventsByNovel(novelId) {
    try {
      return await this.events
        .where('novelId')
        .equals(novelId)
        .orderBy('date')
        .toArray()
    } catch (error) {
      console.error('获取事件列表失败:', error)
      throw error
    }
  }

  // 提示词操作
  async savePrompt(promptData) {
    try {
      if (promptData.id) {
        return await this.prompts.put(promptData)
      } else {
        return await this.prompts.add(promptData)
      }
    } catch (error) {
      console.error('保存提示词失败:', error)
      throw error
    }
  }

  async getAllPrompts() {
    try {
      return await this.prompts.toArray()
    } catch (error) {
      console.error('获取提示词列表失败:', error)
      throw error
    }
  }

  async deletePrompt(id) {
    try {
      return await this.prompts.delete(id)
    } catch (error) {
      console.error('删除提示词失败:', error)
      throw error
    }
  }

  // API配置操作
  async saveApiConfig(configData) {
    try {
      // 先将所有配置设为非激活状态
      await this.apiConfigs.toCollection().modify({ isActive: false })
      
      // 保存新配置并设为激活状态
      if (configData.id) {
        return await this.apiConfigs.put({
          ...configData,
          isActive: true,
          updatedAt: new Date()
        })
      } else {
        return await this.apiConfigs.add({
          ...configData,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        })
      }
    } catch (error) {
      console.error('保存API配置失败:', error)
      throw error
    }
  }

  async getActiveApiConfig() {
    try {
      return await this.apiConfigs.where('isActive').equals(true).first()
    } catch (error) {
      console.error('获取活动API配置失败:', error)
      throw error
    }
  }

  // 数据备份操作
  async createBackup(type = 'full') {
    try {
      const backupData = {
        novels: await this.novels.toArray(),
        chapters: await this.chapters.toArray(),
        characters: await this.characters.toArray(),
        worldSettings: await this.worldSettings.toArray(),
        corpusData: await this.corpusData.toArray(),
        events: await this.events.toArray(),
        prompts: await this.prompts.toArray(),
        apiConfigs: await this.apiConfigs.toArray()
      }

      return await this.backups.add({
        type,
        data: backupData,
        createdAt: new Date()
      })
    } catch (error) {
      console.error('创建备份失败:', error)
      throw error
    }
  }

  async restoreFromBackup(backupId) {
    try {
      const backup = await this.backups.get(backupId)
      if (!backup) {
        throw new Error('备份不存在')
      }

      // 清空现有数据并恢复备份
      await this.transaction('rw', [
        this.novels,
        this.chapters,
        this.characters,
        this.worldSettings,
        this.corpusData,
        this.events,
        this.prompts,
        this.apiConfigs
      ], async () => {
        await this.novels.clear()
        await this.chapters.clear()
        await this.characters.clear()
        await this.worldSettings.clear()
        await this.corpusData.clear()
        await this.events.clear()
        await this.prompts.clear()
        await this.apiConfigs.clear()

        // 恢复数据
        if (backup.data.novels) await this.novels.bulkAdd(backup.data.novels)
        if (backup.data.chapters) await this.chapters.bulkAdd(backup.data.chapters)
        if (backup.data.characters) await this.characters.bulkAdd(backup.data.characters)
        if (backup.data.worldSettings) await this.worldSettings.bulkAdd(backup.data.worldSettings)
        if (backup.data.corpusData) await this.corpusData.bulkAdd(backup.data.corpusData)
        if (backup.data.events) await this.events.bulkAdd(backup.data.events)
        if (backup.data.prompts) await this.prompts.bulkAdd(backup.data.prompts)
        if (backup.data.apiConfigs) await this.apiConfigs.bulkAdd(backup.data.apiConfigs)
      })

      return true
    } catch (error) {
      console.error('恢复备份失败:', error)
      throw error
    }
  }

  // 数据迁移：从 localStorage 迁移到 IndexedDB
  async migrateFromLocalStorage() {
    try {
      console.log('🔄 开始从 localStorage 迁移数据到 IndexedDB...')
      
      // 迁移小说数据
      const novelsData = localStorage.getItem('novels')
      if (novelsData) {
        const novels = JSON.parse(novelsData)
        for (const novel of novels) {
          // 保存小说基本信息
          const novelId = await this.saveNovel({
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

          // 迁移章节数据
          if (novel.chapterList && novel.chapterList.length > 0) {
            for (const chapter of novel.chapterList) {
              await this.saveChapter({
                novelId: novelId,
                title: chapter.title,
                content: chapter.content || '',
                description: chapter.description || '',
                status: chapter.status || 'draft',
                wordCount: chapter.wordCount || 0,
                createdAt: new Date(chapter.createdAt || chapter.updatedAt),
                updatedAt: new Date(chapter.updatedAt)
              })
            }
          }

          // 迁移角色数据
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

          // 迁移语料库数据
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

          // 迁移事件数据
          if (novel.events && novel.events.length > 0) {
            for (const event of novel.events) {
              await this.saveEvent({
                novelId: novelId,
                title: event.title,
                description: event.description || '',
                date: new Date(event.date || event.createdAt)
              })
            }
          }
        }
      }

      // 迁移提示词数据
      const promptsData = localStorage.getItem('prompts')
      if (promptsData) {
        const prompts = JSON.parse(promptsData)
        for (const prompt of prompts) {
          await this.savePrompt(prompt)
        }
      }

      // 创建迁移完成的备份
      await this.createBackup('migration')
      
      console.log('✅ 数据迁移完成')
      return true
    } catch (error) {
      console.error('❌ 数据迁移失败:', error)
      throw error
    }
  }

  // 清理旧备份
  async cleanOldBackups(keepCount = 5) {
    try {
      const backups = await this.backups.orderBy('createdAt').reverse().toArray()
      if (backups.length > keepCount) {
        const toDelete = backups.slice(keepCount)
        for (const backup of toDelete) {
          await this.backups.delete(backup.id)
        }
      }
    } catch (error) {
      console.error('清理备份失败:', error)
    }
  }
}

// 创建数据库实例
const db = new WritingDatabase()

// 数据库初始化和错误处理
db.on('ready', async () => {
  console.log('📦 IndexedDB 数据库已就绪')
  
  // 检查是否需要从 localStorage 迁移数据
  const existingNovels = await db.novels.count()
  if (existingNovels === 0 && localStorage.getItem('novels')) {
    console.log('🔄 检测到 localStorage 数据，开始迁移...')
    try {
      await db.migrateFromLocalStorage()
      console.log('✅ 数据迁移完成')
      
      // 可选：迁移完成后清理 localStorage（谨慎操作）
      // localStorage.removeItem('novels')
      // localStorage.removeItem('prompts')
      
    } catch (error) {
      console.error('❌ 数据迁移失败:', error)
    }
  }
})

db.on('error', (error) => {
  console.error('❌ IndexedDB 错误:', error)
})

export default db