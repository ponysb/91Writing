<template>
  <div class="ai-chat-container">
    <!-- 左侧会话列表 -->
    <div class="conversation-sidebar">
      <div class="sidebar-header">
        <div class="user-info">
          <div class="avatar">AI</div>
          <span class="username">AI网文助手</span>
        </div>
        <button class="new-chat-btn" @click="createNewConversation">
          <el-icon><Plus /></el-icon>
          开始新对话
        </button>
      </div>
      
      <div class="conversation-list">
        <!-- 空状态 -->
        <div v-if="conversations.length === 0" class="empty-state">
          <div class="empty-icon">
            <el-icon><ChatDotRound /></el-icon>
          </div>
          <div class="empty-text">
            <h3>暂无对话记录</h3>
            <p>点击"开始新对话"创建您的第一个对话</p>
          </div>
        </div>
        
        <!-- 会话列表 -->
        <div 
          v-for="conversation in conversations" 
          :key="conversation.id"
          class="conversation-item"
          :class="{ active: conversation.id === currentConversationId }"
          @click="selectConversation(conversation.id)"
        >
          <div class="conversation-preview">
            <div class="conversation-title">{{ conversation.title }}</div>
            <div class="conversation-snippet" v-if="conversation.lastMessage">
              {{ conversation.lastMessage.length > 50 ? conversation.lastMessage.substring(0, 50) + '...' : conversation.lastMessage }}
            </div>
          </div>
          <div class="conversation-meta">
            <div class="conversation-time">{{ formatTime(conversation.updatedAt) }}</div>
            <div class="conversation-indicator" v-if="conversation.id === currentConversationId">
              <div class="active-dot"></div>
            </div>
          </div>
        </div>
      </div>
      

    </div>

    <!-- 右侧聊天区域 -->
    <div class="chat-area">
      <!-- 聊天头部 -->
      <div class="chat-header">
        <div class="header-left">
          <el-dropdown @command="handleAssistantChange" trigger="click">
            <div class="assistant-selector">
              <span class="assistant-name">{{ currentAssistant.name }}</span>
              <el-icon><ArrowDown /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item 
                  v-for="assistant in availableAssistants" 
                  :key="assistant.id" 
                  :command="assistant.id"
                  :class="{ 'is-active': assistant.id === currentAssistant.id }"
                >
                  <div class="assistant-item">
                    <el-avatar :size="24" :src="assistant.avatar">
                      <el-icon><Avatar /></el-icon>
                    </el-avatar>
                    <div class="assistant-info">
                      <span class="assistant-name">{{ assistant.name }}</span>
                      <span class="assistant-type">{{ getAssistantTypeText(assistant.type) }}</span>
                    </div>
                  </div>
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
        <div class="chat-actions">
          <el-button text @click="exportConversation">
            <el-icon><Download /></el-icon>
            导出对话
          </el-button>
          <el-button text @click="deleteCurrentConversation">
            <el-icon><Delete /></el-icon>
            删除对话
          </el-button>
        </div>
      </div>

      <!-- 消息列表 -->
      <div class="messages-container" ref="messagesContainer">
        <div v-if="messages.length === 0" class="welcome-screen">
          <h2>今天能帮你创作什么网文？</h2>
          <div class="suggestion-cards">
            <div class="suggestion-card" @click="useSuggestion('帮我构思一个玄幻小说的世界观')">
              <el-icon><Clock /></el-icon>
              <span>帮我构思一个玄幻小说的世界观</span>
            </div>
            <div class="suggestion-card" @click="useSuggestion('帮我设计一个都市言情小说的男女主角')">
              <el-icon><Edit /></el-icon>
              <span>帮我设计一个都市言情小说的男女主角</span>
            </div>
            <div class="suggestion-card" @click="useSuggestion('帮我写一个悬疑小说的开头')">
              <el-icon><TrendCharts /></el-icon>
              <span>帮我写一个悬疑小说的开头</span>
            </div>
            <div class="suggestion-card" @click="useSuggestion('帮我制定网文连载更新计划')">
              <el-icon><Document /></el-icon>
              <span>帮我制定网文连载更新计划</span>
            </div>
          </div>
        </div>

        <div v-for="message in messages" :key="message.id" class="message-item" :class="message.role">
          <div class="message-avatar">
            <div v-if="message.role === 'user'" class="user-avatar">U</div>
            <div v-else class="assistant-avatar">AI</div>
          </div>
          <div class="message-bubble">
            <div class="message-content">
              <div class="message-text" v-html="parseMarkdown(message.content)"></div>
            </div>
            <div class="message-footer">
              <div class="message-time">{{ formatTime(message.createdAt) }}</div>
              <div class="message-actions">
                <el-button 
                  text 
                  size="small" 
                  @click="copyMessage(message.content)"
                  class="copy-btn"
                >
                  <el-icon><DocumentCopy /></el-icon>
                  复制
                </el-button>
              </div>
            </div>
          </div>
        </div>

        <div v-if="isGenerating" class="message-item assistant">
          <div class="message-avatar">
            <div class="assistant-avatar">M</div>
          </div>
          <div class="message-content">
            <div class="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      </div>

      <!-- 输入区域 -->
      <div class="input-area">
        <div class="input-container">
          <el-input
            v-model="inputMessage"
            type="textarea"
            :rows="3"
            :autosize="{ minRows: 3, maxRows: 8 }"
            placeholder="向我提问吧... (Enter发送，Ctrl+Enter换行)"
            @keydown.enter.exact.prevent="handleSendMessage"
            @keydown.enter.ctrl.exact="inputMessage += '\n'"
          />
          <div class="input-actions">
            <el-button 
              type="primary" 
              :disabled="!inputMessage.trim() || isGenerating"
              @click="handleSendMessage"
            >
              <el-icon><Promotion /></el-icon>
            </el-button>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  Plus, Avatar, Download, ArrowDown, Delete,
  Clock, Edit, TrendCharts, Document, Promotion, DocumentCopy, ChatDotRound
} from '@element-plus/icons-vue'
import { aiChatAPI, aiConversationAPI, aiAssistantAPI, aiModelAPI } from '@/api'
import { marked } from 'marked'
import { useAiModelStore } from '@/stores/aiModel'

// 路由和用户状态
const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const aiModelStore = useAiModelStore()

// 响应式数据
const conversations = ref([])
const messages = ref([])
const currentConversationId = ref(null)
const inputMessage = ref('')
const isGenerating = ref(false)
const messagesContainer = ref(null)
const currentAssistant = ref({ name: 'AI助手', id: 1 })
const availableAssistants = ref([])

// 获取当前选中的模型
const getCurrentModel = computed(() => {
  return aiModelStore.currentModel
})

// 处理模型选择
const handleModelChange = (modelId) => {
  aiModelStore.selectModel(modelId)
}

// 获取助手类型文本
const getAssistantTypeText = (type) => {
  const texts = {
    general: '通用助手',
    writing: '写作助手',
    creative: '创意助手',
    analysis: '分析助手'
  }
  return texts[type] || '其他'
}

// 加载可用的AI助手列表
const loadAssistants = async () => {
  try {
    const response = await aiAssistantAPI.getAssistants({
      is_public: true,
      status: 'active',
      page: 1,
      limit: 50
    })
    
    // 根据API响应结构获取助手列表
    availableAssistants.value = response.data.assistants || response.data || []
    
    // 如果当前助手不在列表中，设置第一个助手为当前助手
    if (availableAssistants.value.length > 0) {
      const currentExists = availableAssistants.value.find(a => a.id === currentAssistant.value.id)
      if (!currentExists) {
        currentAssistant.value = availableAssistants.value[0]
      }
    }
  } catch (error) {
    console.error('加载AI助手列表失败:', error)
    ElMessage.error('加载AI助手列表失败')
  }
}

// 处理助手切换
const handleAssistantChange = async (assistantId) => {
  try {
    const selectedAssistant = availableAssistants.value.find(a => a.id === assistantId)
    if (selectedAssistant) {
      currentAssistant.value = selectedAssistant
      ElMessage.success(`已切换到 ${selectedAssistant.name}`)
      
      // 切换助手后重新加载对话列表
      const conversationParams = {}
      if (currentAssistant.value.id) {
        conversationParams.assistant_id = currentAssistant.value.id
      }
      
      const response = await aiConversationAPI.getConversations(conversationParams)
      conversations.value = response.data?.conversations || response.data || []
      
      // 清空当前对话
      currentConversationId.value = null
      messages.value = []
      
      // 如果有对话，选择第一个
      if (conversations.value.length > 0) {
        selectConversation(conversations.value[0].id)
      }
    }
  } catch (error) {
    console.error('切换助手失败:', error)
    ElMessage.error('切换助手失败')
  }
}

// 创建新对话
const createNewConversation = async () => {
  try {
    const response = await aiConversationAPI.createConversation({
      title: '新对话',
      assistant_id: currentAssistant.value.id
    })
    
    const newConversation = {
      id: response.data.id,
      title: response.data.title,
      lastMessage: '',
      time: '刚刚'
    }
    
    conversations.value.unshift(newConversation)
    currentConversationId.value = newConversation.id
    messages.value = []
    
    return newConversation
  } catch (error) {
    console.error('创建对话失败:', error)
    ElMessage.error('创建对话失败')
    // 如果创建失败，生成一个临时ID
    const tempId = 'temp_' + Date.now()
    currentConversationId.value = tempId
    return { id: tempId, title: '新对话', lastMessage: '', time: '刚刚' }
  }
}

// 选择对话
const selectConversation = async (conversationId) => {
  currentConversationId.value = conversationId
  await loadMessages(conversationId)
}

// 加载消息
const loadMessages = async (conversationId) => {
  try {
    const response = await aiConversationAPI.getMessages(conversationId)
    // 处理可能的嵌套数据结构
    messages.value = response.data?.messages || response.data || []
    scrollToBottom()
  } catch (error) {
    console.error('加载消息失败:', error)
    messages.value = []
  }
}

// 使用建议
const useSuggestion = (suggestion) => {
  inputMessage.value = suggestion
  handleSendMessage()
}

// 发送消息
const handleSendMessage = async () => {
  if (!inputMessage.value.trim() || isGenerating.value) return
  
  const userMessage = {
    id: Date.now(),
    role: 'user',
    content: inputMessage.value,
    createdAt: new Date()
  }
  
  messages.value.push(userMessage)
  const messageContent = inputMessage.value
  inputMessage.value = ''
  
  // 确保有当前会话
  if (!currentConversationId.value) {
    await createNewConversation()
  }
  
  // 添加AI消息占位符
  const aiMessageIndex = messages.value.length
  messages.value.push({
    id: Date.now() + 1,
    role: 'assistant',
    content: '',
    createdAt: new Date(),
    streaming: true
  })
  
  scrollToBottom()
  isGenerating.value = true
  
  try {
    // 使用流式请求
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'}/ai-chat/conversation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userStore.token}`
      },
      body: JSON.stringify({
        conversation_id: currentConversationId.value,
        content: messageContent,
        content_type: 'text',
        stream: true,
        assistant_id: currentAssistant.value.id,
        model_id: String(aiModelStore.selectedModelId || '1'),
        temperature: 0.8,
        attachments: [],
        metadata: {
          context: 'AI聊天对话'
        }
      })
    })
    
    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`
      try {
        const errorText = await response.text()
        const errorData = JSON.parse(errorText)
        errorMessage = errorData.message || errorMessage
      } catch (parseError) {
        console.error('Failed to parse error response:', parseError)
      }
      throw new Error(errorMessage)
    }
    
    // 处理流式响应
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      
      for (const line of lines) {
        if (line.trim() === '') continue
        
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          
          if (data === '[DONE]') {
            messages.value[aiMessageIndex].streaming = false
            break
          }
          
          try {
            const parsed = JSON.parse(data)
            if (parsed.content) {
              messages.value[aiMessageIndex].content += parsed.content
              scrollToBottom()
            }
          } catch (e) {
            console.warn('解析SSE数据失败:', e, data)
          }
        }
      }
    }
    
  } catch (error) {
    console.error('发送消息失败:', error)
    // 移除失败的消息
    messages.value.splice(aiMessageIndex, 1)
    ElMessage.error('AI回复失败：' + error.message)
  } finally {
    isGenerating.value = false
  }
}

// 解析markdown内容
const parseMarkdown = (content) => {
  if (!content) return ''
  try {
    return marked(content)
  } catch (error) {
    console.error('Markdown解析失败:', error)
    return content
  }
}

// 复制消息内容
const copyMessage = async (content) => {
  try {
    await navigator.clipboard.writeText(content)
    ElMessage.success('消息已复制到剪贴板')
  } catch (error) {
    console.error('复制失败:', error)
    ElMessage.error('复制失败，请手动复制')
  }
}

// 格式化时间
const formatTime = (time) => {
  if (!time) return ''
  const date = new Date(time)
  const now = new Date()
  const diff = now - date
  
  if (diff < 60000) {
    return '刚刚'
  } else if (diff < 3600000) {
    return `${Math.floor(diff / 60000)}分钟前`
  } else if (diff < 86400000) {
    return `${Math.floor(diff / 3600000)}小时前`
  } else {
    return date.toLocaleDateString()
  }
}

// 删除当前对话
const deleteCurrentConversation = async () => {
  if (!currentConversationId.value) {
    ElMessage.warning('请先选择要删除的对话')
    return
  }
  
  try {
    await ElMessageBox.confirm(
      '确定要删除当前对话吗？此操作不可恢复。',
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    // 调用删除API
    await aiConversationAPI.deleteConversation(currentConversationId.value)
    
    // 从本地列表中移除
    conversations.value = conversations.value.filter(conv => conv.id !== currentConversationId.value)
    
    // 清空当前对话
    currentConversationId.value = null
    messages.value = []
    
    // 如果还有其他对话，选择第一个
    if (conversations.value.length > 0) {
      selectConversation(conversations.value[0].id)
    }
    
    ElMessage.success('对话删除成功')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除对话失败:', error)
      ElMessage.error('删除对话失败')
    }
  }
}

// 导出对话为txt文件
const exportConversation = () => {
  if (!currentConversationId.value || messages.value.length === 0) {
    ElMessage.warning('当前没有可导出的对话内容')
    return
  }
  
  try {
    // 获取当前对话标题
    const currentConv = conversations.value.find(conv => conv.id === currentConversationId.value)
    const conversationTitle = currentConv?.title || '对话记录'
    
    // 生成txt内容
    let txtContent = `对话标题: ${conversationTitle}\n`
    txtContent += `导出时间: ${new Date().toLocaleString('zh-CN')}\n`
    txtContent += `助手: ${currentAssistant.value.name}\n`
    txtContent += '\n' + '='.repeat(50) + '\n\n'
    
    // 遍历消息列表
    messages.value.forEach((message, index) => {
      const role = message.role === 'user' ? '用户' : 'AI助手'
      const time = message.createdAt ? new Date(message.createdAt).toLocaleString('zh-CN') : ''
      
      txtContent += `[${role}]`
      if (time) {
        txtContent += ` ${time}`
      }
      txtContent += '\n'
      
      // 处理消息内容，移除HTML标签和markdown格式
      let content = message.content || ''
      content = content.replace(/<[^>]*>/g, '') // 移除HTML标签
      content = content.replace(/\*\*(.*?)\*\*/g, '$1') // 移除粗体markdown
      content = content.replace(/\*(.*?)\*/g, '$1') // 移除斜体markdown
      content = content.replace(/`(.*?)`/g, '$1') // 移除代码markdown
      
      txtContent += content + '\n\n'
    })
    
    // 创建Blob对象
    const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8' })
    
    // 创建下载链接
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    
    // 生成文件名
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
    const filename = `${conversationTitle}_${timestamp}.txt`
    link.download = filename
    
    // 触发下载
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    // 释放URL对象
    window.URL.revokeObjectURL(url)
    
    ElMessage.success('对话导出成功')
  } catch (error) {
    console.error('导出对话失败:', error)
    ElMessage.error('导出对话失败')
  }
}

// 滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    const container = messagesContainer.value
    if (container) {
      container.scrollTop = container.scrollHeight
    }
  })
}

// 加载可用的AI模型
const loadAvailableModels = async () => {
  try {
    await aiModelStore.loadAvailableModels()
    
    if (aiModelStore.availableModels.length === 0) {
      ElMessage.warning('暂无可用的AI模型')
    }
  } catch (error) {
    console.error('加载AI模型列表失败:', error)
    ElMessage.error('加载AI模型列表失败')
  }
}

// 初始化
onMounted(async () => {
  try {
    // 处理URL参数中的assistant_id
    const assistantId = route.query.assistant_id
    if (assistantId) {
      try {
        const assistantResponse = await aiAssistantAPI.getAssistant(assistantId)
        currentAssistant.value = {
          id: assistantResponse.data.id,
          name: assistantResponse.data.name || 'AI助手'
        }
      } catch (error) {
        console.error('获取AI助手信息失败:', error)
      }
    }
    
    // 加载AI助手列表
    await loadAssistants()
    
    // 加载AI模型列表
    await loadAvailableModels()
    
    // 获取对话列表，传递assistant_id参数
    const conversationParams = {}
    if (currentAssistant.value.id) {
      conversationParams.assistant_id = currentAssistant.value.id
    }
    
    const response = await aiConversationAPI.getConversations(conversationParams)
    // 根据API响应结构，conversations数据在data.conversations中
    conversations.value = response.data?.conversations || response.data || []
    
    if (conversations.value.length > 0) {
      selectConversation(conversations.value[0].id)
    }
  } catch (error) {
    console.error('加载对话列表失败:', error)
  }
})
</script>

<style scoped>
.ai-chat-container {
  display: flex;
  height: calc(100vh - 100px);
  background: #ffffff;
  color: #333333;
}

/* 左侧会话列表 */
.conversation-sidebar {
  width: 280px;
  background: #f8f9fa;
  border-right: 1px solid #e9ecef;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid #e9ecef;
}

.user-info {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #4a9eff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  margin-right: 12px;
}

.username {
  font-size: 16px;
  font-weight: 500;
}

.new-chat-btn {
  width: 100%;
  padding: 12px;
  background: #4a9eff;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 14px;
  transition: background 0.2s;
}

.new-chat-btn:hover {
  background: #3a8eef;
}

.conversation-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px 12px;
  background: #ffffff;
  scrollbar-width: thin;
  scrollbar-color: #e2e8f0 transparent;
}

.conversation-list::-webkit-scrollbar {
  width: 3px;
}

.conversation-list::-webkit-scrollbar-track {
  background: transparent;
}

.conversation-list::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 2px;
}

.conversation-list::-webkit-scrollbar-thumb:hover {
  background: #cbd5e1;
}

.conversation-item {
  padding: 14px 16px;
  border-radius: 12px;
  cursor: pointer;
  margin-bottom: 8px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid transparent;
  /* background: #f8fafc; */
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  position: relative;
  /* box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05); */
}

.conversation-item:hover {
  background: #ffffff;
  border-color: #e2e8f0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
}

.conversation-item.active {
  background: #ffffff;
  border-color: #3b82f6;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
  transform: translateY(-1px);
}

.conversation-preview {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.conversation-title {
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 4px;
  font-size: 14px;
  line-height: 1.4;
  letter-spacing: -0.01em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conversation-item.active .conversation-title {
  color: #1e293b;
  font-weight: 600;
}

.conversation-snippet {
  font-size: 12px;
  color: #64748b;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 400;
  opacity: 0.8;
}

.conversation-item.active .conversation-snippet {
  color: #475569;
  opacity: 1;
}

.conversation-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
  gap: 4px;
  flex-shrink: 0;
  min-width: 50px;
}

.conversation-time {
  font-size: 10px;
  color: #94a3b8;
  font-weight: 500;
  white-space: nowrap;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.conversation-item.active .conversation-time {
  color: #3b82f6;
}

.conversation-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: transparent;
  transition: all 0.3s ease;
}

.conversation-item.active .conversation-indicator {
  background: transparent;
}

.active-dot {
  width: 6px;
  height: 6px;
  background: #10b981;
  border-radius: 50%;
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
    transform: scale(1);
  }
  50% {
    box-shadow: 0 0 0 6px rgba(16, 185, 129, 0.1);
    transform: scale(1.1);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
    transform: scale(1);
  }
}

.sidebar-footer {
  padding: 20px;
  border-top: 1px solid #3a3a3a;
}

.assistant-info, .download-app {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  font-size: 14px;
  color: #ccc;
  cursor: pointer;
}

.assistant-info:hover, .download-app:hover {
  color: #4a9eff;
}

/* 右侧聊天区域 */
.chat-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #ffffff;
}

.chat-header {
  padding: 16px 24px;
  border-bottom: 1px solid #e9ecef;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

.assistant-selector {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 8px;
  transition: background-color 0.2s;
}

.assistant-selector:hover {
  background-color: #f3f4f6;
}

.assistant-name {
  font-size: 16px;
  font-weight: 500;
}

.assistant-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}

.assistant-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.assistant-info .assistant-name {
  font-size: 14px;
  font-weight: 500;
  color: #1e293b;
}

.assistant-info .assistant-type {
  font-size: 12px;
  color: #64748b;
}

.el-dropdown-menu__item.is-active {
  background-color: #f0f9ff;
  color: #0369a1;
}

.el-dropdown-menu__item.is-active .assistant-name {
  color: #0369a1;
  font-weight: 600;
}

.el-dropdown-menu__item.is-active .assistant-type {
  color: #0284c7;
}





.chat-actions {
  display: flex;
  gap: 8px;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.welcome-screen {
  text-align: center;
  padding: 60px 20px;
}

.welcome-screen h2 {
  font-size: 28px;
  margin-bottom: 40px;
  color: #333333;
}

.suggestion-cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  max-width: 600px;
  margin: 0 auto;
}

.suggestion-card {
  padding: 20px;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 12px;
  text-align: left;
}

.suggestion-card:hover {
  background: #e9ecef;
  border-color: #4a9eff;
  transform: translateY(-2px);
}

.message-item {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  padding: 0 20px;
}

.message-item.user {
  flex-direction: row-reverse;
}

.message-avatar {
  flex-shrink: 0;
}

.user-avatar,
.assistant-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 12px;
  border: 2px solid #e5e7eb;
}

.user-avatar {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.assistant-avatar {
  background: #f8fafc;
  color: #374151;
  border-color: #d1d5db;
}

.message-bubble {
  max-width: calc(100% - 60px);
  min-width: 120px;
  width: fit-content;
}

.message-content {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
}

.message-item.user .message-content {
  background: #3b82f6;
  border-color: #3b82f6;
}

.message-text {
  padding: 14px 26px;
  line-height: 1.6;
  color: #374151;
  font-size: 14px;
}

.message-item.user .message-text {
  color: white;
}

.message-text h1, .message-text h2, .message-text h3 {
  margin: 16px 0 12px 0;
  font-weight: 600;
}

.message-text h1 { font-size: 20px; }
.message-text h2 { font-size: 18px; }
.message-text h3 { font-size: 16px; }

.message-text p {
  margin: 8px 0;
}

.message-text ul, .message-text ol {
  margin: 8px 0;
  padding-left: 20px;
}

.message-text li {
  margin: 4px 0;
}

.message-text code {
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  border: 1px solid #e5e7eb;
}

.message-item.user .message-text code {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.3);
}

.message-text pre {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 12px;
  margin: 12px 0;
  overflow-x: auto;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
}

.message-item.user .message-text pre {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
}

.message-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 3px 5px 10px;
}

.message-item.user .message-footer {
  background: rgba(255, 255, 255, 0.1);
  border-top-color: rgba(255, 255, 255, 0.2);
}

.message-time {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
}

.message-item.user .message-time {
  color: rgba(255, 255, 255, 0.8);
}

.message-actions {
  display: flex;
  gap: 8px;
}

.copy-btn {
  font-size: 12px;
  color: #6b7280;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.copy-btn:hover {
  background: #f3f4f6;
  color: #374151;
  border-color: #d1d5db;
}

.message-item.user .copy-btn {
  color: rgba(255, 255, 255, 0.9);
}

.message-item.user .copy-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  color: white;
  border-color: rgba(255, 255, 255, 0.3);
}

.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 12px 16px;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #4a9eff;
  animation: typing 1.4s infinite;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%, 60%, 100% {
    transform: translateY(0);
  }
  30% {
    transform: translateY(-10px);
  }
}

.input-area {
  padding: 24px;
  border-top: 1px solid #e9ecef;
}

.input-container {
  display: flex;
  gap: 12px;
  align-items: flex-end;
  margin-bottom: 12px;
}

.input-container :deep(.el-textarea) {
  flex: 1;
}

.input-container :deep(.el-textarea__inner) {
  background: #ffffff;
  border: 1px solid #e9ecef;
  color: #333333;
  border-radius: 12px;
  padding: 12px 16px;
  resize: none;
}

.input-container :deep(.el-textarea__inner):focus {
  border-color: #4a9eff;
}

.input-actions {
  display: flex;
  align-items: center;
}

.input-actions .el-button {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  padding: 0;
}



.model-info {
  text-align: center;
  font-size: 12px;
  color: #666;
}

/* 空状态样式 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  color: #909399;
}

.empty-icon {
  font-size: 48px;
  color: #c0c4cc;
  margin-bottom: 16px;
}

.empty-text h3 {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 500;
  color: #606266;
}

.empty-text p {
  margin: 0;
  font-size: 14px;
  color: #909399;
  line-height: 1.5;
}
</style>