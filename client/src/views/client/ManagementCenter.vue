<template>
  <div class="management-center">
    <el-card class="header-card">
      <h2>内容管理中心</h2>
      <p>管理您的小说人物、世界观、事件线和语料库</p>
    </el-card>

    <el-tabs v-model="activeTab" type="card" class="management-tabs">
      <!-- 人物管理 -->
      <el-tab-pane label="人物管理" name="characters">
        <CharacterManagement :novel-id="currentNovelId" />
      </el-tab-pane>

      <!-- 世界观管理 -->
      <el-tab-pane label="世界观管理" name="worldviews">
        <WorldviewManagement :novel-id="currentNovelId" />
      </el-tab-pane>

      <!-- 事件线管理 -->
      <el-tab-pane label="事件线管理" name="timelines">
        <TimelineManagement :novel-id="currentNovelId" />
      </el-tab-pane>

      <!-- 语料库管理 -->
      <el-tab-pane label="语料库管理" name="corpus">
        <CorpusManagement :novel-id="currentNovelId" />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import CharacterManagement from './components/CharacterManagement.vue'
import WorldviewManagement from './components/WorldviewManagement.vue'
import TimelineManagement from './components/TimelineManagement.vue'
import CorpusManagement from './components/CorpusManagement.vue'

const route = useRoute()
const activeTab = ref('characters')

// 从路由参数获取当前小说ID
const currentNovelId = computed(() => {
  return route.params.novelId || route.query.novelId
})
</script>

<style scoped>
.management-center {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.header-card {
  margin-bottom: 20px;
  text-align: center;
}

.header-card h2 {
  margin: 0 0 10px 0;
  color: #303133;
}

.header-card p {
  margin: 0;
  color: #606266;
}

.management-tabs {
  min-height: 600px;
}

:deep(.el-tabs__content) {
  padding: 20px 0;
}

:deep(.el-tab-pane) {
  min-height: 500px;
}
</style>