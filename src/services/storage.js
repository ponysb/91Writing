/**
 * 增强的数据持久化服务
 * 解决数据丢失问题，提供多重备份机制
 */

class StorageService {
  constructor() {
    this.prefix = '91writing_'
    this.backupPrefix = '91writing_backup_'
    this.maxBackups = 5 // 最多保留5个备份
    this.autoBackupInterval = 5 * 60 * 1000 // 5分钟自动备份一次
    this.isAutoBackupEnabled = true
    
    // 启动自动备份
    this.startAutoBackup()
    
    // 监听页面关闭事件，进行最后的备份
    window.addEventListener('beforeunload', () => {
      this.createEmergencyBackup()
    })
    
    // 监听localStorage变化
    window.addEventListener('storage', (e) => {
      if (e.key && e.key.startsWith(this.prefix)) {
        console.log('检测到数据变化:', e.key)
      }
    })
  }

  /**
   * 增强的保存方法
   * @param {string} key 键名
   * @param {any} data 数据
   * @param {boolean} createBackup 是否创建备份
   */
  save(key, data, createBackup = true) {
    try {
      const fullKey = this.prefix + key
      const serializedData = JSON.stringify(data)
      
      // 检查数据大小
      const dataSize = new Blob([serializedData]).size
      console.log(`保存数据 ${key}, 大小: ${this.formatSize(dataSize)}`)
      
      // 保存主数据
      localStorage.setItem(fullKey, serializedData)
      
      // 创建备份
      if (createBackup) {
        this.createBackup(key, data)
      }
      
      // 记录保存时间
      localStorage.setItem(fullKey + '_timestamp', Date.now())
      
      console.log(`✅ 数据保存成功: ${key}`)
      return true
    } catch (error) {
      console.error(`❌ 数据保存失败: ${key}`, error)
      
      // 如果是存储空间不足，尝试清理旧备份
      if (error.name === 'QuotaExceededError') {
        this.cleanOldBackups()
        // 重试保存
        try {
          localStorage.setItem(this.prefix + key, JSON.stringify(data))
          console.log(`🔄 重试保存成功: ${key}`)
          return true
        } catch (retryError) {
          console.error(`🔄 重试保存失败: ${key}`, retryError)
        }
      }
      
      return false
    }
  }

  /**
   * 增强的加载方法
   * @param {string} key 键名
   * @param {any} defaultValue 默认值
   * @returns {any} 数据
   */
  load(key, defaultValue = null) {
    try {
      const fullKey = this.prefix + key
      const data = localStorage.getItem(fullKey)
      
      if (data === null) {
        console.log(`📂 数据不存在，尝试从备份恢复: ${key}`)
        return this.loadFromBackup(key, defaultValue)
      }
      
      const parsedData = JSON.parse(data)
      console.log(`✅ 数据加载成功: ${key}`)
      return parsedData
    } catch (error) {
      console.error(`❌ 数据加载失败: ${key}`, error)
      console.log(`🔄 尝试从备份恢复: ${key}`)
      return this.loadFromBackup(key, defaultValue)
    }
  }

  /**
   * 创建数据备份
   * @param {string} key 键名
   * @param {any} data 数据
   */
  createBackup(key, data) {
    try {
      const timestamp = Date.now()
      const backupKey = `${this.backupPrefix}${key}_${timestamp}`
      
      localStorage.setItem(backupKey, JSON.stringify({
        data: data,
        timestamp: timestamp,
        key: key
      }))
      
      // 清理旧备份，只保留最新的几个
      this.cleanOldBackups(key)
      
      console.log(`💾 备份创建成功: ${backupKey}`)
    } catch (error) {
      console.error(`💾 备份创建失败: ${key}`, error)
    }
  }

  /**
   * 从备份恢复数据
   * @param {string} key 键名
   * @param {any} defaultValue 默认值
   * @returns {any} 恢复的数据
   */
  loadFromBackup(key, defaultValue = null) {
    try {
      const backups = this.getBackups(key)
      
      if (backups.length === 0) {
        console.log(`📂 没有找到备份: ${key}`)
        return defaultValue
      }
      
      // 按时间戳排序，获取最新的备份
      backups.sort((a, b) => b.timestamp - a.timestamp)
      const latestBackup = backups[0]
      
      console.log(`🔄 从备份恢复数据: ${key}, 备份时间: ${new Date(latestBackup.timestamp).toLocaleString()}`)
      
      // 恢复主数据
      this.save(key, latestBackup.data, false)
      
      return latestBackup.data
    } catch (error) {
      console.error(`🔄 备份恢复失败: ${key}`, error)
      return defaultValue
    }
  }

  /**
   * 获取指定键的所有备份
   * @param {string} key 键名
   * @returns {Array} 备份列表
   */
  getBackups(key) {
    const backups = []
    const pattern = `${this.backupPrefix}${key}_`
    
    for (let i = 0; i < localStorage.length; i++) {
      const storageKey = localStorage.key(i)
      if (storageKey && storageKey.startsWith(pattern)) {
        try {
          const backupData = JSON.parse(localStorage.getItem(storageKey))
          backups.push({
            key: storageKey,
            timestamp: backupData.timestamp,
            data: backupData.data
          })
        } catch (error) {
          console.error(`解析备份失败: ${storageKey}`, error)
        }
      }
    }
    
    return backups
  }

  /**
   * 清理旧备份
   * @param {string} key 可选，指定键名只清理该键的备份
   */
  cleanOldBackups(key = null) {
    try {
      if (key) {
        // 清理指定键的旧备份
        const backups = this.getBackups(key)
        if (backups.length > this.maxBackups) {
          // 按时间戳排序，删除最旧的备份
          backups.sort((a, b) => a.timestamp - b.timestamp)
          const toDelete = backups.slice(0, backups.length - this.maxBackups)
          
          toDelete.forEach(backup => {
            localStorage.removeItem(backup.key)
            console.log(`🗑️ 清理旧备份: ${backup.key}`)
          })
        }
      } else {
        // 清理所有旧备份
        const allBackups = []
        for (let i = 0; i < localStorage.length; i++) {
          const storageKey = localStorage.key(i)
          if (storageKey && storageKey.startsWith(this.backupPrefix)) {
            try {
              const backupData = JSON.parse(localStorage.getItem(storageKey))
              allBackups.push({
                key: storageKey,
                timestamp: backupData.timestamp
              })
            } catch (error) {
              // 删除损坏的备份
              localStorage.removeItem(storageKey)
            }
          }
        }
        
        // 按时间排序，删除最旧的备份
        allBackups.sort((a, b) => a.timestamp - b.timestamp)
        const totalBackupsToKeep = this.maxBackups * 10 // 总共保留的备份数量
        
        if (allBackups.length > totalBackupsToKeep) {
          const toDelete = allBackups.slice(0, allBackups.length - totalBackupsToKeep)
          toDelete.forEach(backup => {
            localStorage.removeItem(backup.key)
            console.log(`🗑️ 清理旧备份: ${backup.key}`)
          })
        }
      }
    } catch (error) {
      console.error('清理备份失败:', error)
    }
  }

  /**
   * 创建紧急备份（页面关闭时）
   */
  createEmergencyBackup() {
    try {
      const emergency = {}
      const patterns = ['novels', 'prompts', 'apiConfig', 'novelGenres']
      
      patterns.forEach(pattern => {
        const data = this.load(pattern)
        if (data) {
          emergency[pattern] = data
        }
      })
      
      localStorage.setItem('91writing_emergency_backup', JSON.stringify({
        data: emergency,
        timestamp: Date.now()
      }))
      
      console.log('🚨 紧急备份已创建')
    } catch (error) {
      console.error('🚨 紧急备份创建失败:', error)
    }
  }

  /**
   * 恢复紧急备份
   */
  restoreEmergencyBackup() {
    try {
      const emergency = localStorage.getItem('91writing_emergency_backup')
      if (!emergency) {
        console.log('🚨 没有找到紧急备份')
        return false
      }
      
      const emergencyData = JSON.parse(emergency)
      const patterns = Object.keys(emergencyData.data)
      
      patterns.forEach(pattern => {
        this.save(pattern, emergencyData.data[pattern], false)
        console.log(`🚨 恢复紧急备份: ${pattern}`)
      })
      
      console.log('🚨 紧急备份恢复完成')
      return true
    } catch (error) {
      console.error('🚨 紧急备份恢复失败:', error)
      return false
    }
  }

  /**
   * 启动自动备份
   */
  startAutoBackup() {
    if (!this.isAutoBackupEnabled) return
    
    setInterval(() => {
      this.autoBackup()
    }, this.autoBackupInterval)
    
    console.log(`⏰ 自动备份已启动，间隔: ${this.autoBackupInterval / 1000}秒`)
  }

  /**
   * 执行自动备份
   */
  autoBackup() {
    try {
      const patterns = ['novels', 'prompts', 'apiConfig', 'novelGenres']
      
      patterns.forEach(pattern => {
        const data = this.load(pattern)
        if (data) {
          this.createBackup(pattern, data)
        }
      })
      
      console.log('⏰ 自动备份完成')
    } catch (error) {
      console.error('⏰ 自动备份失败:', error)
    }
  }

  /**
   * 获取存储使用情况
   */
  getStorageInfo() {
    let totalSize = 0
    let itemCount = 0
    const items = {}
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      const value = localStorage.getItem(key)
      const size = new Blob([value]).size
      
      totalSize += size
      itemCount++
      
      if (key.startsWith(this.prefix) || key.startsWith(this.backupPrefix)) {
        items[key] = {
          size: size,
          formattedSize: this.formatSize(size)
        }
      }
    }
    
    return {
      totalSize: totalSize,
      formattedTotalSize: this.formatSize(totalSize),
      itemCount: itemCount,
      items: items,
      quota: this.getStorageQuota()
    }
  }

  /**
   * 获取存储配额信息
   */
  getStorageQuota() {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      return navigator.storage.estimate().then(estimate => {
        return {
          quota: estimate.quota,
          usage: estimate.usage,
          formattedQuota: this.formatSize(estimate.quota),
          formattedUsage: this.formatSize(estimate.usage),
          percentageUsed: (estimate.usage / estimate.quota * 100).toFixed(2)
        }
      })
    }
    return Promise.resolve(null)
  }

  /**
   * 格式化文件大小
   */
  formatSize(bytes) {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  /**
   * 导出所有数据
   */
  exportAllData() {
    const exportData = {
      timestamp: Date.now(),
      version: '1.0',
      data: {}
    }
    
    // 导出主要数据
    const patterns = ['novels', 'prompts', 'apiConfig', 'novelGenres', 'customModels']
    patterns.forEach(pattern => {
      const data = this.load(pattern)
      if (data) {
        exportData.data[pattern] = data
      }
    })
    
    // 导出备份信息
    exportData.backups = {}
    patterns.forEach(pattern => {
      const backups = this.getBackups(pattern)
      if (backups.length > 0) {
        exportData.backups[pattern] = backups
      }
    })
    
    return exportData
  }

  /**
   * 导入数据
   */
  importData(importData) {
    try {
      if (!importData.data) {
        throw new Error('无效的导入数据格式')
      }
      
      // 创建导入前备份
      this.createEmergencyBackup()
      
      // 导入主要数据
      Object.keys(importData.data).forEach(pattern => {
        this.save(pattern, importData.data[pattern], true)
        console.log(`📥 导入数据: ${pattern}`)
      })
      
      console.log('📥 数据导入完成')
      return true
    } catch (error) {
      console.error('📥 数据导入失败:', error)
      return false
    }
  }
}

// 创建单例
const storageService = new StorageService()

export default storageService