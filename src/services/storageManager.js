/**
 * 统一存储管理器 - 91写作数据持久化层
 * 优先级: IndexedDB (主存储) > localStorage (缓存) > 内存
 * 
 * 解决问题:
 * - 浏览器缓存清除导致的数据丢失
 * - localStorage 容量限制 (5-10MB)
 * - 无备份和恢复机制
 * 
 * @author 91写作团队
 * @version 1.0.0
 */

import { ElMessage } from 'element-plus'

class StorageManager {
  constructor() {
    this.db = null
    this.dbName = '91writing'
    this.version = 1
    this.stores = {
      novels: 'novels',          // 小说数据
      chapters: 'chapters',      // 章节数据
      prompts: 'prompts',        // 提示词库
      settings: 'settings',      // 系统设置
      backups: 'backups'         // 自动备份
    }
    this.initDB()
  }

  /**
   * 初始化 IndexedDB
   */
  async initDB() {
    if (this.db) {
      return this.db
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)
      
      request.onerror = () => {
        console.error('❌ IndexedDB 打开失败:', request.error)
        reject(request.error)
      }
      
      request.onsuccess = () => {
        this.db = request.result
        console.log('✅ IndexedDB 初始化成功')
        resolve(this.db)
      }
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result
        console.log('🔄 升级 IndexedDB schema...')
        
        // 创建对象存储
        Object.values(this.stores).forEach(storeName => {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, { keyPath: 'id' })
            
            // 添加索引
            if (storeName === 'novels') {
              store.createIndex('updatedAt', 'updatedAt', { unique: false })
              store.createIndex('genre', 'genre', { unique: false })
            } else if (storeName === 'chapters') {
              store.createIndex('novelId', 'novelId', { unique: false })
              store.createIndex('updatedAt', 'updatedAt', { unique: false })
            } else if (storeName === 'backups') {
              store.createIndex('timestamp', 'timestamp', { unique: false })
            }
            
            console.log(`✅ 创建对象存储: ${storeName}`)
          }
        })
      }
    })
  }

  /**
   * 保存数据到 IndexedDB
   * @param {string} storeName - 存储对象名称
   * @param {string} key - 数据键
   * @param {any} data - 数据内容
   */
  async save(storeName, key, data) {
    try {
      if (!this.db) {
        await this.initDB()
      }
      
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([storeName], 'readwrite')
        const store = transaction.objectStore(storeName)
        
        const dataToSave = {
          id: key,
          data: data,
          timestamp: Date.now(),
          updatedAt: new Date().toISOString()
        }
        
        const request = store.put(dataToSave)
        
        request.onerror = () => {
          console.error('❌ IndexedDB 保存失败:', request.error)
          reject(request.error)
        }
        
        request.onsuccess = () => {
          // 同时保存到 localStorage 作为缓存
          try {
            localStorage.setItem(`cache_${storeName}_${key}`, JSON.stringify(data))
          } catch (e) {
            // localStorage 满了，忽略错误
            console.warn('⚠️ localStorage 已满，仅保存到 IndexedDB')
          }
          
          console.log(`💾 数据已保存: ${storeName}/${key}`)
          resolve(true)
        }
      })
    } catch (error) {
      console.error('保存数据失败:', error)
      throw error
    }
  }

  /**
   * 从 IndexedDB 读取数据
   * @param {string} storeName - 存储对象名称
   * @param {string} key - 数据键
   */
  async get(storeName, key) {
    try {
      if (!this.db) {
        await this.initDB()
      }
      
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([storeName], 'readonly')
        const store = transaction.objectStore(storeName)
        const request = store.get(key)
        
        request.onerror = () => {
          console.error('❌ IndexedDB 读取失败:', request.error)
          reject(request.error)
        }
        
        request.onsuccess = () => {
          if (request.result) {
            console.log(`📖 数据已读取: ${storeName}/${key}`)
            resolve(request.result.data)
          } else {
            // 降级到 localStorage
            console.log('⚠️ IndexedDB 无数据，尝试从 localStorage 恢复...')
            try {
              const cached = localStorage.getItem(`cache_${storeName}_${key}`)
              if (cached) {
                const data = JSON.parse(cached)
                // 重新保存到 IndexedDB
                this.save(storeName, key, data).catch(e => {
                  console.warn('恢复到 IndexedDB 失败:', e)
                })
                resolve(data)
              } else {
                resolve(null)
              }
            } catch (e) {
              console.error('从 localStorage 恢复失败:', e)
              resolve(null)
            }
          }
        }
      })
    } catch (error) {
      console.error('读取数据失败:', error)
      throw error
    }
  }

  /**
   * 删除数据
   * @param {string} storeName - 存储对象名称
   * @param {string} key - 数据键
   */
  async delete(storeName, key) {
    try {
      if (!this.db) {
        await this.initDB()
      }
      
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([storeName], 'readwrite')
        const store = transaction.objectStore(storeName)
        const request = store.delete(key)
        
        request.onerror = () => reject(request.error)
        request.onsuccess = () => {
          // 同时删除 localStorage 缓存
          try {
            localStorage.removeItem(`cache_${storeName}_${key}`)
          } catch (e) {
            console.warn('删除 localStorage 缓存失败')
          }
          
          console.log(`🗑️ 数据已删除: ${storeName}/${key}`)
          resolve(true)
        }
      })
    } catch (error) {
      console.error('删除数据失败:', error)
      throw error
    }
  }

  /**
   * 获取所有数据
   * @param {string} storeName - 存储对象名称
   */
  async getAll(storeName) {
    try {
      if (!this.db) {
        await this.initDB()
      }
      
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([storeName], 'readonly')
        const store = transaction.objectStore(storeName)
        const request = store.getAll()
        
        request.onerror = () => reject(request.error)
        request.onsuccess = () => {
          const results = request.result.map(item => ({
            id: item.id,
            ...item.data,
            _meta: {
              timestamp: item.timestamp,
              updatedAt: item.updatedAt
            }
          }))
          resolve(results)
        }
      })
    } catch (error) {
      console.error('获取所有数据失败:', error)
      throw error
    }
  }

  /**
   * 自动备份到本地文件
   */
  async autoBackup() {
    try {
      console.log('🔄 开始自动备份...')
      
      const allData = {}
      
      // 收集所有存储的数据
      for (const [key, storeName] of Object.entries(this.stores)) {
        if (storeName !== 'backups') {
          allData[key] = await this.getAll(storeName)
        }
      }
      
      const backup = {
        version: '0.7.0',
        timestamp: new Date().toISOString(),
        data: allData,
        metadata: {
          totalNovels: allData.novels?.length || 0,
          totalChapters: allData.chapters?.length || 0,
          totalPrompts: allData.prompts?.length || 0
        }
      }
      
      // 保存备份记录到 IndexedDB
      await this.save('backups', `backup_${Date.now()}`, backup)
      
      // 下载为文件
      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: 'application/json'
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `91writing_backup_${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      console.log('✅ 自动备份完成')
      ElMessage.success('数据已备份到本地文件')
      
      return backup
    } catch (error) {
      console.error('❌ 自动备份失败:', error)
      ElMessage.error('备份失败，请重试')
      throw error
    }
  }

  /**
   * 从备份文件恢复数据
   * @param {File} file - 备份文件
   */
  async restoreFromFile(file) {
    try {
      console.log('🔄 开始恢复数据...')
      
      const text = await file.text()
      const backupData = JSON.parse(text)
      
      // 验证备份数据格式
      if (!backupData.data || !backupData.version) {
        throw new Error('无效的备份文件格式')
      }
      
      if (!this.db) {
        await this.initDB()
      }
      
      // 恢复所有数据
      for (const [storeName, items] of Object.entries(backupData.data)) {
        const actualStoreName = this.stores[storeName]
        if (!actualStoreName) continue
        
        const transaction = this.db.transaction([actualStoreName], 'readwrite')
        const store = transaction.objectStore(actualStoreName)
        
        // 清空现有数据（可选）
        // store.clear()
        
        // 导入数据
        for (const item of items) {
          const dataToSave = {
            id: item.id || item._meta?.id,
            data: item,
            timestamp: Date.now(),
            updatedAt: new Date().toISOString()
          }
          store.put(dataToSave)
        }
      }
      
      console.log('✅ 数据恢复完成')
      ElMessage.success('数据恢复成功！')
      
      return true
    } catch (error) {
      console.error('❌ 数据恢复失败:', error)
      ElMessage.error('数据恢复失败: ' + error.message)
      throw error
    }
  }

  /**
   * 获取存储使用情况
   */
  async getStorageInfo() {
    try {
      const info = {
        indexedDB: {},
        localStorage: {
          used: 0,
          limit: 5 * 1024 * 1024 // 5MB (估算)
        }
      }
      
      // 计算 IndexedDB 使用情况
      for (const [key, storeName] of Object.entries(this.stores)) {
        const items = await this.getAll(storeName)
        const size = JSON.stringify(items).length
        info.indexedDB[key] = {
          count: items.length,
          size: size,
          sizeReadable: this.formatBytes(size)
        }
      }
      
      // 计算 localStorage 使用情况
      let localStorageSize = 0
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          localStorageSize += localStorage[key].length + key.length
        }
      }
      info.localStorage.used = localStorageSize
      info.localStorage.usedReadable = this.formatBytes(localStorageSize)
      info.localStorage.percentage = (localStorageSize / info.localStorage.limit * 100).toFixed(2)
      
      return info
    } catch (error) {
      console.error('获取存储信息失败:', error)
      throw error
    }
  }

  /**
   * 格式化字节大小
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  /**
   * 清理旧备份（保留最近10个）
   */
  async cleanOldBackups() {
    try {
      const backups = await this.getAll('backups')
      
      // 按时间戳排序
      backups.sort((a, b) => b._meta.timestamp - a._meta.timestamp)
      
      // 删除超过10个的旧备份
      if (backups.length > 10) {
        const toDelete = backups.slice(10)
        for (const backup of toDelete) {
          await this.delete('backups', backup.id)
        }
        console.log(`🗑️ 已清理 ${toDelete.length} 个旧备份`)
      }
    } catch (error) {
      console.error('清理旧备份失败:', error)
    }
  }

  /**
   * 迁移 localStorage 数据到 IndexedDB
   */
  async migrateFromLocalStorage() {
    try {
      console.log('🔄 开始迁移 localStorage 数据到 IndexedDB...')
      
      const keysToMigrate = {
        'novels': 'novels',
        'prompts': 'prompts',
        'writingGoals': 'settings',
        'apiConfig': 'settings'
      }
      
      let migratedCount = 0
      
      for (const [lsKey, storeName] of Object.entries(keysToMigrate)) {
        const data = localStorage.getItem(lsKey)
        if (data) {
          try {
            const parsed = JSON.parse(data)
            if (Array.isArray(parsed)) {
              // 数组数据，逐个保存
              for (const item of parsed) {
                await this.save(storeName, item.id || Date.now().toString(), item)
                migratedCount++
              }
            } else {
              // 单个对象
              await this.save(storeName, lsKey, parsed)
              migratedCount++
            }
          } catch (e) {
            console.warn(`迁移 ${lsKey} 失败:`, e)
          }
        }
      }
      
      if (migratedCount > 0) {
        console.log(`✅ 已迁移 ${migratedCount} 条数据到 IndexedDB`)
        ElMessage.success(`已迁移 ${migratedCount} 条数据到安全存储`)
      } else {
        console.log('ℹ️ 没有需要迁移的数据')
      }
      
      return migratedCount
    } catch (error) {
      console.error('❌ 数据迁移失败:', error)
      throw error
    }
  }
}

// 导出单例
export default new StorageManager()

