<template>
  <div class="writer-container">
    <!-- 顶部标题栏 -->
    <WriterTitleBar 
      :novel-title="currentNovel?.title"
      @go-back="goBack"
    />

    <!-- 标签栏 -->
    <WriterTabsBar 
      v-model:active-tab="activeTab"
      @tab-change="onTabChange"
    />

    <!-- 主要内容区域 -->
    <div class="main-content">
      <!-- 左侧面板 -->
      <div class="left-panel">
        <!-- 章节列表面板 -->
        <WriterChapterPanel
          v-show="activeTab === 'editor'"
          :chapters="chapters"
          :current-chapter="currentChapter"
          @select-chapter="selectChapter"
          @chapter-action="handleChapterAction"
          @add-chapter="addNewChapter"
          @chapter-command="handleChapterCommand"
        />

        <!-- 人物管理面板 -->
        <WriterCharacterPanel
          v-show="activeTab === 'characters'"
          :characters="characters"
          @add-character="addCharacter"
          @batch-generate="showBatchGenerateDialog"
          @edit-character="editCharacter"
          @character-action="handleCharacterAction"
        />

        <!-- 世界观管理面板 -->
        <WriterWorldviewPanel
          v-show="activeTab === 'worldview'"
          :world-settings="worldSettings"
          @add-worldview="addWorldSetting"
          @generate-worldview="openWorldGenerateDialog"
          @edit-worldview="editWorldSetting"
          @worldview-action="handleWorldSettingAction"
        />

        <!-- 语料库面板 -->
        <WriterCorpusPanel
          v-show="activeTab === 'corpus'"
          :corpus-data="corpusData"
          @add-corpus="addCorpus"
          @edit-corpus="editCorpus"
          @delete-corpus="deleteCorpus"
        />

        <!-- 事件线面板 -->
        <WriterEventPanel
          v-show="activeTab === 'events'"
          :events="events"
          @add-event="addEvent"
          @event-action="handleEventAction"
        />
      </div>

      <!-- 右侧编辑器区域 -->
      <WriterEditor
        v-show="activeTab === 'editor'"
        :current-chapter="currentChapter"
        v-model:content="content"
        :is-saving="isSaving"
        :toolbar-config="toolbarConfig"
        :editor-config="editorConfig"
        @update-status="updateChapterStatus"
        @generate-from-outline="generateFromOutline"
        @open-continue-dialog="openContinueDialog"
        @enhance-content="enhanceContent"
        @add-new-chapter="addNewChapter"
        @editor-created="handleCreated"
        @content-change="onContentChange"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useNovelStore } from '@/stores/novel'

// 导入拆分的组件
import WriterTitleBar from '@/components/writer/WriterTitleBar.vue'
import WriterTabsBar from '@/components/writer/WriterTabsBar.vue'
import WriterChapterPanel from '@/components/writer/WriterChapterPanel.vue'
import WriterCharacterPanel from '@/components/writer/WriterCharacterPanel.vue'
import WriterWorldviewPanel from '@/components/writer/WriterWorldviewPanel.vue'
import WriterCorpusPanel from '@/components/writer/WriterCorpusPanel.vue'
import WriterEventPanel from '@/components/writer/WriterEventPanel.vue'
import WriterEditor from '@/components/writer/WriterEditor.vue'

const router = useRouter()
const novelStore = useNovelStore()

// 响应式数据
const activeTab = ref('editor')
const currentNovel = ref(null)
const currentChapter = ref(null)
const chapters = ref([])
const characters = ref([])
const worldSettings = ref([])
const corpusData = ref([])
const events = ref([])
const content = ref('')
const isSaving = ref(false)

// 编辑器配置
const toolbarConfig = reactive({
  // 工具栏配置
})

const editorConfig = reactive({
  // 编辑器配置
  placeholder: '请输入内容...',
  MENU_CONF: {}
})

// 方法定义
const goBack = () => {
  router.go(-1)
}

const onTabChange = (tabName) => {
  activeTab.value = tabName
}

const selectChapter = (chapter) => {
  currentChapter.value = chapter
  content.value = chapter.content || ''
}

const handleChapterAction = (action, chapter) => {
  // 处理章节操作
  console.log('章节操作:', action, chapter)
}

const handleChapterCommand = (command) => {
  // 处理章节命令
  console.log('章节命令:', command)
}

const addNewChapter = () => {
  console.log('添加新章节')
}

const addCharacter = () => {
  console.log('添加角色')
}

const showBatchGenerateDialog = () => {
  console.log('显示批量生成对话框')
}

const editCharacter = (character) => {
  console.log('编辑角色', character)
}

const handleCharacterAction = (action, character) => {
  console.log('角色操作:', action, character)
}

const addWorldSetting = () => {
  console.log('添加世界观设定')
}

const openWorldGenerateDialog = () => {
  console.log('打开世界观生成对话框')
}

const editWorldSetting = (setting) => {
  console.log('编辑世界观设定', setting)
}

const handleWorldSettingAction = (action, setting) => {
  console.log('世界观操作:', action, setting)
}

const addCorpus = () => {
  console.log('添加语料')
}

const editCorpus = (corpus) => {
  console.log('编辑语料', corpus)
}

const deleteCorpus = (corpus) => {
  console.log('删除语料', corpus)
}

const addEvent = () => {
  console.log('添加事件')
}

const handleEventAction = (action, event) => {
  console.log('事件操作:', action, event)
}

const updateChapterStatus = (status) => {
  if (currentChapter.value) {
    currentChapter.value.status = status
    saveCurrentChapter()
  }
}

const generateFromOutline = () => {
  console.log('根据大纲生成内容')
}

const openContinueDialog = () => {
  console.log('打开续写对话框')
}

const enhanceContent = () => {
  console.log('优化内容')
}

const handleCreated = (editor) => {
  console.log('编辑器创建完成', editor)
}

const onContentChange = (html, editor) => {
  if (currentChapter.value) {
    currentChapter.value.content = html
    autoSave()
  }
}

const saveCurrentChapter = () => {
  if (currentChapter.value) {
    isSaving.value = true
    setTimeout(() => {
      isSaving.value = false
    }, 1000)
  }
}

const autoSave = () => {
  clearTimeout(autoSaveTimer)
  autoSaveTimer = setTimeout(() => {
    saveCurrentChapter()
  }, 2000)
}

let autoSaveTimer = null

// 生命周期
onMounted(() => {
  loadNovelData()
})

const loadNovelData = () => {
  console.log('加载小说数据')
}
</script>

<style scoped>
.writer-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f5f5f5;
}

.main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.left-panel {
  width: 350px;
  background: white;
  border-right: 1px solid #e4e7ed;
  overflow: hidden;
}
</style> 