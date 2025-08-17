<template>
  <div class="mindmap-page">
    <!-- 顶部工具栏 -->
    <div class="mindmap-header">
      <div class="header-left">
        <el-button @click="goBack" type="primary" plain>
          <el-icon><ArrowLeft /></el-icon>
          返回编辑器
        </el-button>
        <span class="current-file-name">{{ currentFile?.name || '未选择文件' }}</span>
      </div>
      <div class="header-right">
        <el-button @click="saveMindMap" :loading="saving" type="primary">
          <el-icon><Document /></el-icon>
          保存
        </el-button>
      </div>
    </div>

    <!-- 主要内容区域 -->
    <div class="mindmap-content">
      <!-- 左侧文件管理 -->
      <div class="file-panel">
        <div class="panel-header">
          <span>思维导图文件</span>
          <div class="header-actions">
            <el-button @click="createFolder" size="small" type="primary" plain>
              <el-icon><FolderAdd /></el-icon>
            </el-button>
            <el-button @click="createFile" size="small" type="primary">
              <el-icon><DocumentAdd /></el-icon>
            </el-button>
          </div>
        </div>
        
        <div class="file-list">
          <!-- 文件夹 -->
          <div v-for="folder in folders" :key="folder.id" class="folder-item">
            <div class="folder-header" @click="toggleFolder(folder.id)" @contextmenu.prevent="showFolderContextMenu($event, folder)">
              <el-icon class="folder-icon">
                <FolderOpened v-if="folder.expanded" />
                <Folder v-else />
              </el-icon>
              <span class="folder-name">{{ folder.name }}</span>
              <div class="folder-actions">
                <el-button @click.stop="editFolder(folder)" size="small" type="primary" text>
                  <el-icon><Edit /></el-icon>
                </el-button>
                <el-button @click.stop="deleteFolder(folder.id)" size="small" type="danger" text>
                  <el-icon><Delete /></el-icon>
                </el-button>
              </div>
            </div>
            
            <!-- 文件夹内的文件 -->
            <div v-if="folder.expanded" class="folder-files">
              <div 
                v-for="file in getFilesInFolder(folder.id)" 
                :key="file.id" 
                class="file-item"
                :class="{ active: currentFile?.id === file.id }"
                @click="selectFile(file)"
              >
                <el-icon class="file-icon"><Document /></el-icon>
                <span class="file-name">{{ file.name }}</span>
                <div class="file-actions">
                  <el-button @click.stop="editFile(file)" size="small" type="primary" text>
                    <el-icon><Edit /></el-icon>
                  </el-button>
                  <el-button @click.stop="deleteFile(file.id)" size="small" type="danger" text>
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 根目录文件 -->
          <div class="root-files">
            <div 
              v-for="file in getRootFiles()" 
              :key="file.id" 
              class="file-item"
              :class="{ active: currentFile?.id === file.id }"
              @click="selectFile(file)"
            >
              <el-icon class="file-icon"><Document /></el-icon>
              <span class="file-name">{{ file.name }}</span>
              <div class="file-actions">
                <el-button @click.stop="editFile(file)" size="small" type="primary" text>
                  <el-icon><Edit /></el-icon>
                </el-button>
                <el-button @click.stop="deleteFile(file.id)" size="small" type="danger" text>
                  <el-icon><Delete /></el-icon>
                </el-button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 中间思维导图绘制区 -->
      <div class="mindmap-canvas">
        <div class="canvas-header">
          <div class="canvas-title">
            <span v-if="currentFile">{{ currentFile.name }}</span>
            <span v-else class="placeholder">请选择一个思维导图文件</span>
          </div>
          <div class="canvas-tools">
            <el-button @click="zoomOut" size="small" type="primary" plain>
              <el-icon><ZoomOut /></el-icon>
            </el-button>
            <el-button @click="resetZoom" size="small" type="primary" plain>
              <el-icon><Refresh /></el-icon>
            </el-button>
            <el-button @click="zoomIn" size="small" type="primary" plain>
              <el-icon><ZoomIn /></el-icon>
            </el-button>
            <el-dropdown @command="handleExport" trigger="hover">
              <el-button size="small" type="success" plain>
                <el-icon><Download /></el-icon>
                导出
                <el-icon class="el-icon--right"><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="markdown">
                    <el-icon><Document /></el-icon>
                    导出为 Markdown
                  </el-dropdown-item>
                  <el-dropdown-item command="png">
                    <el-icon><Picture /></el-icon>
                    导出为图片
                  </el-dropdown-item>
                  <el-dropdown-item command="svg">
                    <el-icon><PictureRounded /></el-icon>
                    导出为 SVG
                  </el-dropdown-item>
                  <el-dropdown-item command="json">
                    <el-icon><DataBoard /></el-icon>
                    导出为 JSON
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
        
        <div class="canvas-container">
          <div id="mindmap-container" class="mindmap-container"></div>
          <div v-if="!currentFile" class="empty-state">
            <el-icon class="empty-icon"><Document /></el-icon>
            <p>请选择或创建一个思维导图文件开始编辑</p>
          </div>
        </div>
      </div>

      <!-- 右侧AI助手 -->
      <div class="ai-chat-panel">
        <div class="panel-header">
          <span>AI助手</span>
        </div>
        
        <div class="chat-messages" ref="chatMessagesRef">
          <div v-for="(message, index) in chatMessages" :key="index" class="message" :class="message.type">
            <div class="message-content">
              <div class="message-text">{{ message.content }}</div>
              <div v-if="message.type === 'ai'" class="message-actions">
                <el-button @click="addToMindMap(message.content)" size="small" type="primary" text>
                  <el-icon><Plus /></el-icon>
                  添加到思维导图
                </el-button>
              </div>
            </div>
          </div>
          
          <div v-if="isAiTyping" class="message ai typing">
            <div class="message-content">
              <div class="typing-indicator">
                <span></span><span></span><span></span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="chat-input">
          <div class="input-container">
            <el-input
              v-model="userInput"
              type="textarea"
              :rows="3"
              placeholder="向AI助手提问，获取创作灵感..."
              @keydown.ctrl.enter="sendMessage"
            />
          </div>
          <div class="input-actions">
            <el-button @click="sendMessage" type="primary" :loading="isAiTyping" :disabled="!userInput.trim()">
              <el-icon><Promotion /></el-icon>
              发送
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 文件夹对话框 -->
    <el-dialog v-model="showFolderDialog" :title="editingFolder.id ? '编辑文件夹' : '创建文件夹'" width="400px">
      <el-form :model="editingFolder" label-width="80px">
        <el-form-item label="文件夹名">
          <el-input v-model="editingFolder.name" placeholder="请输入文件夹名称" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showFolderDialog = false">取消</el-button>
        <el-button type="primary" @click="saveFolderDialog">确定</el-button>
      </template>
    </el-dialog>

    <!-- 文件对话框 -->
    <el-dialog v-model="showFileDialog" :title="editingFile.id ? '编辑文件' : '创建思维导图文件'" width="400px">
      <el-form :model="editingFile" label-width="80px">
        <el-form-item label="文件名">
          <el-input v-model="editingFile.name" placeholder="请输入文件名称" />
        </el-form-item>
        <el-form-item label="所属文件夹">
          <el-select v-model="editingFile.folderId" placeholder="选择文件夹（可选）" clearable>
            <el-option label="根目录" :value="null" />
            <el-option 
              v-for="folder in folders" 
              :key="folder.id" 
              :label="folder.name" 
              :value="folder.id" 
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showFileDialog = false">取消</el-button>
        <el-button type="primary" @click="saveFileDialog">确定</el-button>
      </template>
    </el-dialog>

    <!-- 文件夹右键菜单 -->
    <div 
      v-if="contextMenu.visible" 
      class="context-menu"
      :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
    >
      <div class="context-menu-item" @click="createFileInContextFolder">
        <el-icon><DocumentAdd /></el-icon>
        新建思维导图文件
      </div>
    </div>

    <!-- 思维导图右键菜单 -->
    <div 
      v-if="nodeContextMenu.visible" 
      class="node-context-menu"
      :style="{ left: nodeContextMenu.x + 'px', top: nodeContextMenu.y + 'px' }"
    >
      <div class="context-menu-item" @click="insertSiblingNode">
        <el-icon><Plus /></el-icon>
        插入同级节点
      </div>
      <div class="context-menu-item" @click="insertChildNode">
        <el-icon><Plus /></el-icon>
        插入子级节点
      </div>
      <div class="context-menu-item" @click="insertParentNode">
        <el-icon><Plus /></el-icon>
        插入父级节点
      </div>
      <div class="context-menu-divider"></div>
      <div class="context-menu-item" @click="copyNode">
        <el-icon><Share /></el-icon>
        复制节点
      </div>
      <div class="context-menu-item" @click="pasteNode">
        <el-icon><Document /></el-icon>
        粘贴节点
      </div>
      <div class="context-menu-divider"></div>
      <div class="context-menu-item danger" @click="deleteNode">
        <el-icon><Delete /></el-icon>
        删除节点
      </div>
    </div>

    <!-- 遮罩层 -->
    <div v-if="contextMenu.visible || nodeContextMenu.visible" class="context-menu-overlay" @click="hideAllContextMenus"></div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ArrowLeft,
  Document,
  FolderAdd,
  DocumentAdd,
  Folder,
  FolderOpened,
  Edit,
  Delete,
  Share,
  ZoomIn,
  ZoomOut,
  Refresh,
  Download,
  Plus,
  Promotion,
  ArrowDown,
  Picture,
  PictureRounded,
  DataBoard
} from '@element-plus/icons-vue'
import MindMap from 'simple-mind-map'
import RainbowLines from 'simple-mind-map/src/plugins/RainbowLines.js'
import Export from 'simple-mind-map/src/plugins/Export.js'

// 注册插件
MindMap.usePlugin(RainbowLines)
MindMap.usePlugin(Export)

const route = useRoute()
const router = useRouter()

// 响应式数据
const saving = ref(false)
const currentFile = ref(null)
const mindMapInstance = ref(null)

// 文件管理数据
const folders = ref([
  { id: 1, name: '人物设定', expanded: false },
  { id: 2, name: '世界观设定', expanded: false },
  { id: 3, name: '情节大纲', expanded: false }
])

const files = ref([
  { id: 1, name: '主要人物关系图', folderId: 1, data: null },
  { id: 2, name: '世界地图', folderId: 2, data: null },
  { id: 3, name: '故事主线', folderId: 3, data: null },
  { id: 4, name: '整体构思', folderId: null, data: null }
])

// 对话框状态
const showFolderDialog = ref(false)
const showFileDialog = ref(false)
const editingFolder = reactive({ id: null, name: '' })
const editingFile = reactive({ id: null, name: '', folderId: null })

// AI聊天数据
const chatMessages = ref([
  { type: 'ai', content: '你好！我是你的AI写作助手，可以帮你分析情节、完善人物设定、提供创作建议。有什么需要帮助的吗？' }
])
const userInput = ref('')
const isAiTyping = ref(false)
const chatMessagesRef = ref(null)

// 右键菜单数据
const contextMenu = reactive({
  visible: false,
  x: 0,
  y: 0,
  folderId: null
})
// 节点右键菜单
  const nodeContextMenu = reactive({
    visible: false,
    x: 0,
    y: 0,
    node: null
  })
  
  // 获取小说ID
const novelId = route.params.id

// 文件管理方法
const toggleFolder = (folderId) => {
  const folder = folders.value.find(f => f.id === folderId)
  if (folder) {
    folder.expanded = !folder.expanded
  }
}

const getFilesInFolder = (folderId) => {
  return files.value.filter(file => file.folderId === folderId)
}

const getRootFiles = () => {
  return files.value.filter(file => file.folderId === null)
}

const createFolder = () => {
  editingFolder.id = null
  editingFolder.name = ''
  showFolderDialog.value = true
}

const editFolder = (folder) => {
  editingFolder.id = folder.id
  editingFolder.name = folder.name
  showFolderDialog.value = true
}

const saveFolderDialog = () => {
  if (!editingFolder.name.trim()) {
    ElMessage.warning('请输入文件夹名称')
    return
  }
  
  if (editingFolder.id) {
    const folder = folders.value.find(f => f.id === editingFolder.id)
    if (folder) {
      folder.name = editingFolder.name
    }
  } else {
    const newId = Math.max(...folders.value.map(f => f.id), 0) + 1
    folders.value.push({
      id: newId,
      name: editingFolder.name,
      expanded: false
    })
  }
  
  showFolderDialog.value = false
  ElMessage.success(editingFolder.id ? '文件夹编辑成功' : '文件夹创建成功')
}

const deleteFolder = async (folderId) => {
  const folderFiles = getFilesInFolder(folderId)
  if (folderFiles.length > 0) {
    ElMessage.warning('文件夹不为空，无法删除')
    return
  }
  
  try {
    await ElMessageBox.confirm('确定要删除这个文件夹吗？', '确认删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    folders.value = folders.value.filter(f => f.id !== folderId)
    ElMessage.success('文件夹删除成功')
  } catch {
    // 用户取消删除
  }
}

const createFile = () => {
  editingFile.id = null
  editingFile.name = ''
  editingFile.folderId = null
  showFileDialog.value = true
}

const createFileInFolder = (folderId) => {
  editingFile.id = null
  editingFile.name = ''
  editingFile.folderId = folderId
  showFileDialog.value = true
}

const showFolderContextMenu = (event, folder) => {
  contextMenu.visible = true
  contextMenu.x = event.clientX
  contextMenu.y = event.clientY
  contextMenu.folderId = folder.id
}

const hideContextMenu = () => {
  contextMenu.visible = false
  contextMenu.folderId = null
}

const hideAllContextMenus = () => {
  hideContextMenu()
  nodeContextMenu.visible = false
  nodeContextMenu.node = null
}

const createFileInContextFolder = () => {
  createFileInFolder(contextMenu.folderId)
  hideContextMenu()
}

const editFile = (file) => {
  editingFile.id = file.id
  editingFile.name = file.name
  editingFile.folderId = file.folderId
  showFileDialog.value = true
}

const saveFileDialog = () => {
  if (!editingFile.name.trim()) {
    ElMessage.warning('请输入文件名称')
    return
  }
  
  if (editingFile.id) {
    const file = files.value.find(f => f.id === editingFile.id)
    if (file) {
      file.name = editingFile.name
      file.folderId = editingFile.folderId
    }
  } else {
    const newId = Math.max(...files.value.map(f => f.id), 0) + 1
    const newFile = {
      id: newId,
      name: editingFile.name,
      folderId: editingFile.folderId,
      data: {
        data: {
          text: editingFile.name
        },
        children: []
      }
    }
    files.value.push(newFile)
    selectFile(newFile)
  }
  
  showFileDialog.value = false
  ElMessage.success(editingFile.id ? '文件编辑成功' : '文件创建成功')
}

const deleteFile = async (fileId) => {
  try {
    await ElMessageBox.confirm('确定要删除这个思维导图文件吗？', '确认删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    files.value = files.value.filter(f => f.id !== fileId)
    
    if (currentFile.value?.id === fileId) {
      currentFile.value = null
      destroyMindMap()
    }
    
    ElMessage.success('文件删除成功')
  } catch {
    // 用户取消删除
  }
}

const selectFile = (file) => {
  currentFile.value = file
  initMindMap()
}

// 思维导图相关方法
const initMindMap = async () => {
  if (!currentFile.value) return
  
  await nextTick()
  destroyMindMap()
  
  const container = document.getElementById('mindmap-container')
  if (!container) return
  
  try {
    const mindMapData = currentFile.value.data || {
      data: {
        text: currentFile.value.name
      },
      children: []
    }
    
    mindMapInstance.value = new MindMap({
      el: container,
      data: mindMapData,
      layout: 'logicalStructure',
      theme: 'default',
      readonly: false,
      enableFreeDrag: true,
      watermark: {
        show: false
      },
      // 启用编辑功能
      enableNodeEdit: true,
      enableKeyboard: true,
      mousewheelAction: 'zoom',
      // 彩虹线条配置
      rainbowLinesConfig: {
        open: true,
        colorsList: [
          'rgb(59, 130, 246)',   // 蓝色
          'rgb(249, 115, 22)',   // 橙色
          'rgb(239, 68, 68)',    // 红色
          'rgb(16, 185, 129)',   // 绿色
          'rgb(139, 92, 246)',   // 紫色
          'rgb(55, 65, 81)'      // 黑色
        ]
      },
      themeConfig: {
        // 背景
        backgroundColor: '#f8fafc',
        // 连接线样式 - 圆润的曲线
        lineWidth: 3,
        lineStyle: 'curve',
        lineRadius: 5,
        secondLineWidth: 2,
        nodeLineWidth: 2,
        // 不设置lineColor，让彩虹线条插件控制颜色
        // 根节点 - 蓝色主题
        root: {
          fillColor: '#3b82f6',
          color: '#ffffff',
          borderColor: '#2563eb',
          borderWidth: 2,
          fontSize: 18,
          fontWeight: 'bold',
          borderRadius: 12,
          paddingX: 20,
          paddingY: 12
        },
        // 二级节点 - 橙色主题
        second: {
          fillColor: '#f97316',
          color: '#ffffff',
          borderColor: '#ea580c',
          borderWidth: 2,
          fontSize: 16,
          fontWeight: '600',
          borderRadius: 10,
          paddingX: 16,
          paddingY: 10
        },
        // 三级及以下节点 - 灰色主题
        node: {
          fillColor: '#6b7280',
          color: '#ffffff',
          borderColor: '#4b5563',
          borderWidth: 1,
          fontSize: 14,
          fontWeight: 'normal',
          borderRadius: 8,
          paddingX: 12,
          paddingY: 8
        },
        // 激活状态 - 发光效果
        active: {
          borderColor: '#fbbf24',
          borderWidth: 3
        },
        // 悬停状态
        hover: {
          borderColor: '#a78bfa',
          borderWidth: 2
        }
      },
      // 节点操作配置
        nodeOperationBtnConfig: {
          show: true,
          list: [
            {
              text: '添加子节点',
              icon: 'plus',
              onClick: (node) => {
                try {
                  // 清除当前激活节点
                  mindMapInstance.value.renderer.clearActiveNode()
                  // 激活目标节点
                  node.active()
                  // 执行插入子级节点命令
                  mindMapInstance.value.execCommand('INSERT_CHILD_NODE')
                } catch (error) {
                  console.error('添加子节点失败:', error)
                  ElMessage.error('添加子节点失败')
                }
              }
            }
          ]
        }
    })
    
    // 监听数据变化
    mindMapInstance.value.on('data_change', (data) => {
      if (currentFile.value) {
        currentFile.value.data = data
      }
    })
    
    // 监听节点双击编辑
    mindMapInstance.value.on('node_dblclick', (node) => {
      mindMapInstance.value.renderer.startTextEdit()
    })
    
    // 监听节点右键菜单
    mindMapInstance.value.on('node_contextmenu', (e, node) => {
      e.preventDefault()
      nodeContextMenu.visible = true
      nodeContextMenu.x = e.clientX
      nodeContextMenu.y = e.clientY
      nodeContextMenu.node = node
    })
    
    // 监听画布点击
    mindMapInstance.value.on('draw_click', () => {
      hideAllContextMenus()
    })
    
    // 监听按键
    mindMapInstance.value.on('keydown', (e) => {
      if (e.keyCode === 113) { // F2
        e.preventDefault()
        mindMapInstance.value.renderer.startTextEdit()
      }
    })
    
    // 确保彩虹线条插件生效
    setTimeout(() => {
      if (mindMapInstance.value && mindMapInstance.value.rainbowLines) {
        mindMapInstance.value.rainbowLines.updateRainLinesConfig({
          open: true,
          colorsList: [
            'rgb(59, 130, 246)',   // 蓝色
            'rgb(249, 115, 22)',   // 橙色
            'rgb(239, 68, 68)',    // 红色
            'rgb(16, 185, 129)',   // 绿色
            'rgb(139, 92, 246)',   // 紫色
            'rgb(55, 65, 81)'      // 黑色
          ]
        })
      }
    }, 100)
    
  } catch (error) {
    console.error('初始化思维导图失败:', error)
    ElMessage.error('思维导图初始化失败')
  }
}

const destroyMindMap = () => {
  if (mindMapInstance.value) {
    try {
      mindMapInstance.value.destroy()
    } catch (error) {
      console.warn('销毁思维导图实例失败:', error)
    }
    mindMapInstance.value = null
  }
}

// 思维导图操作方法
const zoomIn = () => {
  if (mindMapInstance.value) {
    mindMapInstance.value.view.enlarge()
  }
}

const zoomOut = () => {
  if (mindMapInstance.value) {
    mindMapInstance.value.view.narrow()
  }
}

const resetZoom = () => {
  if (mindMapInstance.value) {
    mindMapInstance.value.view.reset()
  }
}

const handleExport = async (command) => {
  if (!mindMapInstance.value || !currentFile.value) {
    ElMessage.warning('请先选择一个思维导图文件')
    return
  }
  
  const fileName = currentFile.value.name
  
  try {
    switch (command) {
      case 'markdown':
        // 导出为Markdown格式
        mindMapInstance.value.export('md', true, fileName)
        ElMessage.success('Markdown导出成功')
        break
        
      case 'png':
        // 导出为PNG图片
        mindMapInstance.value.export('png', true, fileName)
        ElMessage.success('图片导出成功')
        break
        
      case 'svg':
        // 导出为SVG格式
        mindMapInstance.value.export('svg', true, fileName)
        ElMessage.success('SVG导出成功')
        break
        
      case 'json':
        // 导出为JSON格式
        const jsonData = JSON.stringify(mindMapInstance.value.getData(), null, 2)
        downloadFile(jsonData, `${fileName}.json`, 'application/json')
        ElMessage.success('JSON导出成功')
        break
        
      default:
        ElMessage.warning('不支持的导出格式')
    }
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败，请重试')
  }
}

// 下载文件的辅助函数
const downloadFile = (content, filename, mimeType) => {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

const saveMindMap = () => {
  if (!currentFile.value) {
    ElMessage.warning('请先选择一个文件')
    return
  }
  
  saving.value = true
  
  setTimeout(() => {
    saving.value = false
    ElMessage.success('保存成功')
  }, 1000)
}

// 节点操作方法
const insertSiblingNode = () => {
  if (!mindMapInstance.value || !nodeContextMenu.node) return
  
  try {
    // 清除当前激活节点
    mindMapInstance.value.renderer.clearActiveNode()
    // 激活目标节点
    nodeContextMenu.node.active()
    // 执行插入同级节点命令
    mindMapInstance.value.execCommand('INSERT_NODE')
    hideAllContextMenus()
    ElMessage.success('已插入同级节点')
  } catch (error) {
    console.error('插入同级节点失败:', error)
    hideAllContextMenus()
    ElMessage.error('插入同级节点失败')
  }
}

const insertChildNode = () => {
  if (!mindMapInstance.value || !nodeContextMenu.node) return
  
  try {
    // 清除当前激活节点
    mindMapInstance.value.renderer.clearActiveNode()
    // 激活目标节点
    nodeContextMenu.node.active()
    // 执行插入子级节点命令
    mindMapInstance.value.execCommand('INSERT_CHILD_NODE')
    hideAllContextMenus()
    ElMessage.success('已插入子级节点')
  } catch (error) {
    console.error('插入子级节点失败:', error)
    hideAllContextMenus()
    ElMessage.error('插入子级节点失败')
  }
}

const insertParentNode = () => {
  if (!mindMapInstance.value || !nodeContextMenu.node) return
  
  try {
    // 清除当前激活节点
    mindMapInstance.value.renderer.clearActiveNode()
    // 激活目标节点
    nodeContextMenu.node.active()
    // 执行插入父级节点命令
    mindMapInstance.value.execCommand('INSERT_PARENT_NODE')
    hideAllContextMenus()
    ElMessage.success('已插入父级节点')
  } catch (error) {
    console.error('插入父级节点失败:', error)
    hideAllContextMenus()
    ElMessage.error('插入父级节点失败')
  }
}

const copyNode = () => {
  if (!nodeContextMenu.node) return
  
  try {
    // 复制节点数据，只复制基本数据，避免循环引用
    const nodeData = nodeContextMenu.node.getData()
    // 安全地访问节点数据，避免 undefined 错误
    const nodeDataObj = nodeData && nodeData.data ? nodeData.data : {}
    const cleanNodeData = {
      data: {
        text: nodeDataObj.text || '新节点',
        ...nodeDataObj
      },
      children: nodeData && nodeData.children ? JSON.parse(JSON.stringify(nodeData.children)) : []
    }
    // 存储到剪贴板或全局变量
    window.copiedNodeData = cleanNodeData
    hideAllContextMenus()
    ElMessage.success('节点已复制')
  } catch (error) {
    console.error('复制节点失败:', error)
    hideAllContextMenus()
    ElMessage.error('复制节点失败')
  }
}

const pasteNode = () => {
  if (!mindMapInstance.value || !nodeContextMenu.node || !window.copiedNodeData) {
    ElMessage.warning('请先复制一个节点')
    return
  }
  
  try {
    // 清除当前激活节点
    mindMapInstance.value.renderer.clearActiveNode()
    // 激活目标节点
    nodeContextMenu.node.active()
    // 创建一个新的节点数据，避免直接传入可能有循环引用的数据
    const newNodeData = {
      text: window.copiedNodeData.data.text || '新节点'
    }
    // 执行插入子级节点命令，只传入基本的文本数据
    mindMapInstance.value.execCommand('INSERT_CHILD_NODE', false, [], newNodeData)
    hideAllContextMenus()
    ElMessage.success('节点已粘贴')
  } catch (error) {
    console.error('粘贴节点失败:', error)
    hideAllContextMenus()
    ElMessage.error('粘贴节点失败')
  }
}

const deleteNode = async () => {
  if (!mindMapInstance.value || !nodeContextMenu.node) return
  
  if (nodeContextMenu.node.isRoot) {
    ElMessage.warning('不能删除根节点')
    hideAllContextMenus()
    return
  }
  
  // 在确认删除之前保存节点引用，避免异步操作后引用丢失
  const targetNode = nodeContextMenu.node
  
  try {
    await ElMessageBox.confirm('确定要删除这个节点吗？', '确认删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    // 检查节点是否仍然有效
    if (!targetNode) {
      ElMessage.error('节点引用已失效')
      hideAllContextMenus()
      return
    }
    
    // 清除当前激活节点
    mindMapInstance.value.renderer.clearActiveNode()
    // 激活目标节点
    targetNode.active()
    // 执行删除节点命令
    mindMapInstance.value.execCommand('REMOVE_NODE')
    hideAllContextMenus()
    ElMessage.success('节点已删除')
  } catch (error) {
    console.error('删除节点失败:', error)
    hideAllContextMenus()
  }
}

// AI聊天方法
const sendMessage = async () => {
  if (!userInput.value.trim()) return
  
  const message = userInput.value.trim()
  chatMessages.value.push({ type: 'user', content: message })
  userInput.value = ''
  
  isAiTyping.value = true
  
  try {
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))
    
    const responses = [
      '这是一个很有趣的想法！你可以考虑从以下几个角度来发展：\n1. 人物的内心冲突\n2. 环境对情节的影响\n3. 意外转折的设置',
      '根据你的描述，我建议你可以深入挖掘角色的背景故事，这样能让情节更加丰富和有说服力。',
      '这个情节很有潜力！建议你可以添加一些伏笔，为后续的发展做铺垫。',
      '从创作角度来看，你可以考虑增加一些对比元素，比如光明与黑暗、希望与绝望的对比。'
    ]
    
    const randomResponse = responses[Math.floor(Math.random() * responses.length)]
    chatMessages.value.push({ type: 'ai', content: randomResponse })
    
  } catch (error) {
    chatMessages.value.push({ type: 'ai', content: '抱歉，我现在无法回应。请稍后再试。' })
  } finally {
    isAiTyping.value = false
    scrollToBottom()
  }
}

const addToMindMap = (content) => {
  if (!mindMapInstance.value) {
    ElMessage.warning('请先选择一个思维导图文件')
    return
  }
  
  try {
    const activeNodes = mindMapInstance.value.renderer.activeNodeList
    const targetNode = activeNodes.length > 0 ? activeNodes[0] : mindMapInstance.value.renderer.root
    
    mindMapInstance.value.execCommand('INSERT_CHILD_NODE', targetNode, {
      text: content.substring(0, 50) + (content.length > 50 ? '...' : '')
    })
    
    ElMessage.success('内容已添加到思维导图')
  } catch (error) {
    console.error('添加到思维导图失败:', error)
    ElMessage.error('添加失败')
  }
}

const scrollToBottom = () => {
  nextTick(() => {
    if (chatMessagesRef.value) {
      chatMessagesRef.value.scrollTop = chatMessagesRef.value.scrollHeight
    }
  })
}

// 页面方法
const goBack = () => {
  router.push(`/client/novels/${novelId}/edit`)
}

// 生命周期
onMounted(() => {
  document.addEventListener('click', hideAllContextMenus)
})

onUnmounted(() => {
  document.removeEventListener('click', hideAllContextMenus)
  destroyMindMap()
})

// 监听当前文件变化
watch(currentFile, (newFile) => {
  if (newFile) {
    initMindMap()
  }
}, { immediate: true })
</script>

<style scoped>
.mindmap-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f8fafc;
}

/* 顶部工具栏 */
.mindmap-header {
  height: 60px;
  background: white;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.current-file-name {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.header-right {
  display: flex;
  gap: 12px;
}

/* 主要内容区域 */
.mindmap-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* 左侧文件管理面板 */
.file-panel {
  width: 280px;
  background: white;
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
}

.panel-header {
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  border-bottom: 1px solid #e5e7eb;
  font-weight: 600;
  color: #111827;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.file-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.folder-item {
  margin-bottom: 4px;
}

.folder-header {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  border-radius: 6px;
  transition: background-color 0.2s;
}

.folder-header:hover {
  background: #f3f4f6;
}

.folder-icon {
  margin-right: 8px;
  color: #f59e0b;
}

.folder-name {
  flex: 1;
  font-size: 14px;
  color: #374151;
}

.folder-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.folder-header:hover .folder-actions {
  opacity: 1;
}

.folder-files {
  margin-left: 20px;
  border-left: 1px solid #e5e7eb;
  padding-left: 12px;
}

.file-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  border-radius: 6px;
  margin-bottom: 2px;
  transition: all 0.2s;
}

.file-item:hover {
  background: #f3f4f6;
}

.file-item.active {
  background: #dbeafe;
  color: #1d4ed8;
}

.file-icon {
  margin-right: 8px;
  color: #6b7280;
}

.file-item.active .file-icon {
  color: #1d4ed8;
}

.file-name {
  flex: 1;
  font-size: 14px;
}

.file-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.file-item:hover .file-actions {
  opacity: 1;
}

.root-files {
  margin-top: 8px;
}

/* 中间思维导图绘制区 */
.mindmap-canvas {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #ffffff;
}

.canvas-header {
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  border-bottom: 1px solid #e5e7eb;
}

.canvas-title {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}

.canvas-title .placeholder {
  color: #9ca3af;
  font-weight: normal;
}

.canvas-tools {
  display: flex;
  gap: 8px;
}

.canvas-container {
  flex: 1;
  position: relative;
}

.mindmap-container {
  width: 100%;
  height: 100%;
}

.empty-state {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: #9ca3af;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

/* 右侧AI聊天面板 */
.ai-chat-panel {
  width: 320px;
  background: white;
  border-left: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.message {
  margin-bottom: 16px;
}

.message.user .message-content {
  background: #dbeafe;
  margin-left: 20%;
}

.message.ai .message-content {
  background: #f3f4f6;
  margin-right: 20%;
}

.message-content {
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.5;
}

.message-text {
  white-space: pre-wrap;
  word-break: break-word;
}

.message-actions {
  margin-top: 8px;
  display: flex;
  gap: 8px;
}

.typing {
  opacity: 0.7;
}

.typing-indicator {
  display: flex;
  gap: 4px;
  align-items: center;
}

.typing-indicator span {
  width: 6px;
  height: 6px;
  background: #9ca3af;
  border-radius: 50%;
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

.chat-input {
  border-top: 1px solid #e5e7eb;
  padding: 16px;
}

.input-container {
  margin-bottom: 12px;
}

.input-actions {
  display: flex;
  justify-content: flex-end;
}

/* 右键菜单 */
.context-menu,
.node-context-menu {
  position: fixed;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 10000;
  min-width: 180px;
  padding: 4px 0;
  font-size: 14px;
}

.context-menu-item {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  cursor: pointer;
  color: #374151;
  transition: all 0.2s;
}

.context-menu-item:hover {
  background: #f8fafc;
  color: #1f2937;
}

.context-menu-item.danger {
  color: #dc2626;
}

.context-menu-item.danger:hover {
  background: #fef2f2;
  color: #b91c1c;
}

.context-menu-item .el-icon {
  margin-right: 10px;
  font-size: 16px;
  color: #6b7280;
}

.context-menu-item.danger .el-icon {
  color: #dc2626;
}

.context-menu-divider {
  height: 1px;
  background: #e5e7eb;
  margin: 4px 0;
}

.context-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .file-panel {
    width: 240px;
  }
  
  .ai-chat-panel {
    width: 280px;
  }
}

@media (max-width: 768px) {
  .mindmap-content {
    flex-direction: column;
  }
  
  .file-panel,
  .ai-chat-panel {
    width: 100%;
    height: 200px;
  }
  
  .mindmap-canvas {
    height: calc(100vh - 460px);
  }
}
</style>