# IndexedDB 存储管理器使用指南

## 概述

新的 `storageManager.js` 提供了一个强大的数据持久化层，解决了原有 localStorage 的多个问题：

✅ 解决浏览器缓存清除导致的数据丢失  
✅ 支持大容量数据存储（GB级）  
✅ 自动备份和恢复功能  
✅ 降级支持（IndexedDB → localStorage → 内存）  

---

## 快速开始

### 1. 基本使用

```javascript
import storageManager from '@/services/storageManager'

// 保存数据
await storageManager.save('novels', 'novel_123', {
  id: 'novel_123',
  title: '我的小说',
  chapters: [...]
})

// 读取数据
const novel = await storageManager.get('novels', 'novel_123')

// 删除数据
await storageManager.delete('novels', 'novel_123')

// 获取所有数据
const allNovels = await storageManager.getAll('novels')
```

---

## 在 Pinia Store 中使用

### 替换原有的 localStorage 调用

**原来的方式（不推荐）:**
```javascript
// ❌ 旧方式 - localStorage
export const useNovelStore = defineStore('novel', () => {
  const saveNovel = () => {
    const data = {
      id: currentNovel.value.id,
      title: currentNovel.value.title,
      // ...
    }
    localStorage.setItem('novel', JSON.stringify(data))
  }
  
  const loadNovel = () => {
    const data = localStorage.getItem('novel')
    if (data) {
      currentNovel.value = JSON.parse(data)
    }
  }
  
  return { saveNovel, loadNovel }
})
```

**新的方式（推荐）:**
```javascript
// ✅ 新方式 - IndexedDB
import storageManager from '@/services/storageManager'

export const useNovelStore = defineStore('novel', () => {
  const saveNovel = async () => {
    try {
      await storageManager.save('novels', currentNovel.value.id, {
        id: currentNovel.value.id,
        title: currentNovel.value.title,
        chapters: currentNovel.value.chapters,
        // ...
      })
      ElMessage.success('小说已保存')
    } catch (error) {
      console.error('保存失败:', error)
      ElMessage.error('保存失败，请重试')
    }
  }
  
  const loadNovel = async (novelId) => {
    try {
      const data = await storageManager.get('novels', novelId)
      if (data) {
        currentNovel.value = data
      }
    } catch (error) {
      console.error('加载失败:', error)
      ElMessage.error('加载失败')
    }
  }
  
  return { saveNovel, loadNovel }
})
```

---

## 自动保存功能

```javascript
import { watch } from 'vue'
import storageManager from '@/services/storageManager'

export const useNovelStore = defineStore('novel', () => {
  const currentNovel = ref(null)
  
  // 监听数据变化，自动保存
  watch(
    () => currentNovel.value,
    async (newValue) => {
      if (newValue && newValue.id) {
        await storageManager.save('novels', newValue.id, newValue)
        console.log('📝 自动保存完成')
      }
    },
    { deep: true, debounce: 1000 } // 防抖1秒
  )
  
  return { currentNovel }
})
```

---

## 备份和恢复

### 自动备份

```javascript
import storageManager from '@/services/storageManager'

// 手动触发备份
const handleBackup = async () => {
  try {
    await storageManager.autoBackup()
    ElMessage.success('备份成功！')
  } catch (error) {
    ElMessage.error('备份失败: ' + error.message)
  }
}

// 定期自动备份（每天）
setInterval(async () => {
  await storageManager.autoBackup()
  await storageManager.cleanOldBackups() // 清理旧备份
}, 24 * 60 * 60 * 1000) // 每24小时
```

### 从备份恢复

```vue
<template>
  <input 
    type="file" 
    accept=".json"
    @change="handleRestore"
  />
</template>

<script setup>
import storageManager from '@/services/storageManager'

const handleRestore = async (event) => {
  const file = event.target.files[0]
  if (!file) return
  
  try {
    await storageManager.restoreFromFile(file)
    ElMessage.success('数据恢复成功！')
    
    // 重新加载数据
    await loadAllData()
  } catch (error) {
    ElMessage.error('恢复失败: ' + error.message)
  }
}
</script>
```

---

## 数据迁移

### 一次性迁移 localStorage 数据

```javascript
import storageManager from '@/services/storageManager'

// 在应用启动时执行一次
const migrateData = async () => {
  const migrated = localStorage.getItem('data_migrated')
  
  if (!migrated) {
    try {
      const count = await storageManager.migrateFromLocalStorage()
      if (count > 0) {
        ElMessage.success(`已迁移 ${count} 条数据到安全存储`)
        localStorage.setItem('data_migrated', 'true')
      }
    } catch (error) {
      console.error('数据迁移失败:', error)
    }
  }
}

// 在 main.js 或 App.vue 中调用
onMounted(() => {
  migrateData()
})
```

---

## 存储使用情况监控

```vue
<template>
  <div class="storage-info">
    <h3>存储使用情况</h3>
    <div v-for="(info, key) in storageInfo.indexedDB" :key="key">
      <p>{{ key }}: {{ info.count }} 条 ({{ info.sizeReadable }})</p>
    </div>
    <p>
      localStorage: {{ storageInfo.localStorage.usedReadable }} / 
      {{ storageInfo.localStorage.percentage }}%
    </p>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import storageManager from '@/services/storageManager'

const storageInfo = ref({})

onMounted(async () => {
  storageInfo.value = await storageManager.getStorageInfo()
})
</script>
```

---

## 最佳实践

### 1. 使用统一的数据键命名

```javascript
// 推荐
const STORAGE_KEYS = {
  novels: 'novels',
  chapters: 'chapters',
  prompts: 'prompts',
  settings: 'settings'
}

await storageManager.save(STORAGE_KEYS.novels, novelId, novelData)
```

### 2. 错误处理

```javascript
const saveData = async (key, data) => {
  try {
    await storageManager.save('novels', key, data)
    return true
  } catch (error) {
    console.error('保存失败:', error)
    
    // 降级：尝试使用 localStorage
    try {
      localStorage.setItem(key, JSON.stringify(data))
      ElMessage.warning('已使用备用存储方式')
      return true
    } catch (fallbackError) {
      ElMessage.error('保存失败')
      return false
    }
  }
}
```

### 3. 数据版本管理

```javascript
const saveNovelWithVersion = async (novel) => {
  const versionedData = {
    version: '1.0',
    data: novel,
    savedAt: new Date().toISOString()
  }
  
  await storageManager.save('novels', novel.id, versionedData)
}

const loadNovelWithVersion = async (novelId) => {
  const saved = await storageManager.get('novels', novelId)
  
  if (saved) {
    // 处理版本兼容
    if (saved.version === '1.0') {
      return saved.data
    } else {
      // 旧版本数据，进行转换
      return migrateOldData(saved)
    }
  }
  
  return null
}
```

---

## 常见问题

### Q: 数据会自动同步到其他标签页吗？
A: 不会。IndexedDB 需要手动刷新。可以使用 BroadcastChannel API 实现同步。

### Q: 用户清除浏览器数据会影响 IndexedDB 吗？
A: 会。但可以通过定期自动备份到文件来防止数据丢失。

### Q: IndexedDB 有容量限制吗？
A: 有，但通常很大（几GB）。可以通过 `navigator.storage.estimate()` 查询。

---

## 性能优化

### 批量操作

```javascript
// ❌ 不推荐 - 逐个保存
for (const chapter of chapters) {
  await storageManager.save('chapters', chapter.id, chapter)
}

// ✅ 推荐 - 批量保存
const transaction = db.transaction(['chapters'], 'readwrite')
const store = transaction.objectStore('chapters')

for (const chapter of chapters) {
  store.put({
    id: chapter.id,
    data: chapter,
    timestamp: Date.now()
  })
}

await new Promise((resolve, reject) => {
  transaction.oncomplete = resolve
  transaction.onerror = reject
})
```

---

## 调试技巧

### 在控制台查看 IndexedDB

```javascript
// Chrome DevTools
// Application → Storage → IndexedDB → 91writing

// 或者在控制台：
const request = indexedDB.open('91writing')
request.onsuccess = (event) => {
  const db = event.target.result
  console.log('Store names:', db.objectStoreNames)
}
```

### 清空所有数据

```javascript
await indexedDB.deleteDatabase('91writing')
localStorage.clear()
location.reload()
```

---

## 总结

使用新的 `storageManager` 可以：

✅ 防止数据丢失  
✅ 支持大容量存储  
✅ 自动备份恢复  
✅ 更好的性能  

建议立即在项目中替换所有 localStorage 调用！

