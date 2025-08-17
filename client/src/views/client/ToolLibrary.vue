<template>
  <div class="tool-library">
    <div class="page-header">
      <h1>创作工具库</h1>
      <p>选择合适的AI助手来提升您的创作效率</p>
    </div>

    <div class="loading" v-if="loading">
      <el-icon class="is-loading"><Loading /></el-icon>
      <span>加载中...</span>
    </div>

    <div class="tools-grid" v-else>
      <!-- AI助手列表 -->
      <div 
        class="tool-card" 
        v-for="assistant in assistants" 
        :key="assistant.id"
        @click="goToAIChat(assistant)"
      >
        <div class="tool-icon">
          <el-avatar :size="60" :src="assistant.avatar">
            <el-icon size="30"><Avatar /></el-icon>
          </el-avatar>
        </div>
        <div class="tool-info">
          <h3>{{ assistant.name }}</h3>
          <p>{{ assistant.description || '暂无描述' }}</p>
          <div class="assistant-meta">
            <el-tag :type="getAssistantTypeColor(assistant.type)" size="small">
              {{ getAssistantTypeText(assistant.type) }}
            </el-tag>
            <span class="usage-count">使用次数: {{ assistant.usage_count }}</span>
          </div>
        </div>
        <div class="tool-action">
          <el-button type="primary" size="small">
            <el-icon><ChatDotRound /></el-icon>
            开始对话
          </el-button>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div class="empty-state" v-if="!loading && assistants.length === 0">
      <el-empty description="暂无可用的AI助手">
        <el-button type="primary" @click="loadAssistants">
          <el-icon><Refresh /></el-icon>
          重新加载
        </el-button>
      </el-empty>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { 
  ChatDotRound, 
  Avatar,
  Loading,
  Refresh
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { aiAssistantAPI } from '@/api'

const router = useRouter()

// 响应式数据
const assistants = ref([])
const loading = ref(false)

// 工具方法
const getAssistantTypeColor = (type) => {
  const colors = {
    general: 'info',
    writing: 'primary',
    creative: 'success',
    analysis: 'warning'
  }
  return colors[type] || 'default'
}

const getAssistantTypeText = (type) => {
  const texts = {
    general: '通用助手',
    writing: '写作助手',
    creative: '创意助手',
    analysis: '分析助手'
  }
  return texts[type] || '其他'
}

// 加载AI助手列表
const loadAssistants = async () => {
  try {
    loading.value = true
    const response = await aiAssistantAPI.getAssistants({
      is_public: true,
      status: 'active',
      page: 1,
      per_page: 50
    })
    
    // 根据API响应结构获取助手列表
    assistants.value = response.data.assistants || response.data || []
  } catch (error) {
    console.error('加载AI助手失败:', error)
    ElMessage.error('加载AI助手失败：' + error.message)
  } finally {
    loading.value = false
  }
}

// 进入AI助手对话
const goToAIChat = (assistant) => {
  router.push({
    path: '/client/ai-chat',
    query: {
      assistant_id: assistant.id
    }
  })
}

// 页面加载时获取数据
onMounted(() => {
  loadAssistants()
})
</script>

<style scoped>
.tool-library {
  padding: 24px;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  min-height: 100vh;
}

.page-header {
  text-align: center;
  margin-bottom: 40px;
}

.page-header h1 {
  font-size: 32px;
  font-weight: 700;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0 0 12px 0;
}

.page-header p {
  font-size: 16px;
  color: #64748b;
  margin: 0;
  font-weight: 500;
}

.tools-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.tool-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 28px;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  min-height: 200px;
  position: relative;
  overflow: hidden;
}

.tool-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%);
  transform: scaleX(0);
  transition: transform 0.3s ease;
}

.tool-card:hover::before {
  transform: scaleX(1);
}

.tool-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 8px 32px rgba(59, 130, 246, 0.15);
  border-color: rgba(59, 130, 246, 0.2);
  background: rgba(255, 255, 255, 0.98);
}

.tool-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
  position: relative;
}

.tool-icon .el-avatar {
  border: 2px solid rgba(59, 130, 246, 0.1);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1);
}

.tool-card:hover .tool-icon .el-avatar {
  border-color: rgba(59, 130, 246, 0.3);
  transform: scale(1.08) rotate(2deg);
  box-shadow: 0 8px 24px rgba(59, 130, 246, 0.2);
}

.tool-info {
  flex: 1;
  margin-bottom: 20px;
}

.tool-info h3 {
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 8px 0;
  transition: color 0.3s ease;
}

.tool-card:hover .tool-info h3 {
  color: #3b82f6;
}

.tool-info p {
  font-size: 14px;
  color: #64748b;
  line-height: 1.6;
  margin: 0 0 12px 0;
  font-weight: 400;
}

.assistant-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
  padding: 8px 12px;
  background: rgba(59, 130, 246, 0.05);
  border-radius: 8px;
  transition: all 0.3s ease;
}

.tool-card:hover .assistant-meta {
  background: rgba(59, 130, 246, 0.1);
}

.usage-count {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
}

.tool-action {
  margin-top: auto;
}

.tool-action .el-button {
  padding: 10px 20px;
  font-weight: 600;
  border-radius: 10px;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  border: none;
  color: white;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
}

.tool-action .el-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.4);
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #64748b;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  margin: 20px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
}

.loading .el-icon {
  font-size: 28px;
  margin-bottom: 12px;
  color: #3b82f6;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #64748b;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  margin: 20px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .tool-library {
    padding: 16px;
  }
  
  .tools-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .page-header h1 {
    font-size: 24px;
  }
  
  .tool-card {
    padding: 20px;
    min-height: 180px;
  }
  
  .tool-icon {
    width: 60px;
    height: 60px;
    margin-bottom: 16px;
  }
  
  .tool-info h3 {
    font-size: 18px;
  }
}

@media (max-width: 480px) {
  .page-header {
    margin-bottom: 24px;
  }
  
  .page-header h1 {
    font-size: 20px;
  }
  
  .page-header p {
    font-size: 14px;
  }
  
  .tool-card {
    padding: 16px;
    min-height: 160px;
  }
  
  .tool-icon {
    width: 50px;
    height: 50px;
  }
  
  .tool-info h3 {
    font-size: 16px;
  }
  
  .tool-info p {
    font-size: 13px;
  }
}
</style>
