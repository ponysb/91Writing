<template>
  <div class="novel-create">
    <div class="create-header">
      <el-button @click="goBack" type="text" class="back-btn">
        <el-icon><ArrowLeft /></el-icon>
        返回列表
      </el-button>
      <h2>{{ isEdit ? '编辑小说' : '创建新小说' }}</h2>
    </div>

    <div class="create-container">
      <el-form
        ref="formRef"
        :model="novelData"
        :rules="rules"
        label-width="120px"
        class="novel-form"
      >
        <el-form-item label="小说标题" prop="title">
          <el-input
            v-model="novelData.title"
            placeholder="请输入小说标题"
            maxlength="100"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="小说类型" prop="genre">
          <el-select v-model="novelData.genre" placeholder="请选择小说类型">
            <el-option 
              v-for="option in genreOptions" 
              :key="option.id" 
              :label="option.name" 
              :value="option.name" 
            />
          </el-select>
        </el-form-item>

        <el-form-item label="介绍" prop="description">
          <el-input
            v-model="novelData.description"
            type="textarea"
            :rows="4"
            placeholder="请输入小说介绍"
            maxlength="1000"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="目标字数" prop="target_word_count">
          <el-input-number
            v-model="novelData.target_word_count"
            :min="1000"
            :max="10000000"
            :step="1000"
            placeholder="目标字数"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="封面上传">
          <el-upload
            class="cover-uploader"
            action="#"
            :auto-upload="false"
            :show-file-list="false"
            :before-upload="beforeCoverUpload"
            :on-change="handleCoverChange"
            accept="image/*"
          >
            <img v-if="novelData.coverPreview" :src="novelData.coverPreview.startsWith('data:') ? novelData.coverPreview : getCoverImageUrl(novelData.coverPreview)" class="cover-image" />
            <el-icon v-else class="cover-uploader-icon"><Plus /></el-icon>
          </el-upload>
          <div class="upload-tip">支持 JPG、PNG、GIF、WEBP 格式，文件大小不超过 5MB</div>
        </el-form-item>

        <el-form-item label="标签">
          <div class="tag-input-container">
            <el-tag
              v-for="tag in novelData.tags"
              :key="tag"
              closable
              @close="removeTag(tag)"
              style="margin-right: 8px; margin-bottom: 8px;"
            >
              {{ tag }}
            </el-tag>
            <el-input
              v-if="tagInputVisible"
              ref="tagInputRef"
              v-model="tagInput"
              size="small"
              style="width: 120px;"
              @keyup.enter="addTag"
              @blur="addTag"
            />
            <el-button
              v-else
              size="small"
              @click="showTagInput"
            >
              + 添加标签
            </el-button>
          </div>
        </el-form-item>

        <el-form-item>
          <el-button @click="goBack">取消</el-button>
          <el-button type="primary" @click="saveNovel">
            {{ isEdit ? '更新小说' : '创建小说' }}
          </el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Plus } from '@element-plus/icons-vue'
import { novelAPI, novelTypeAPI } from '@/api'
import { getCoverImageUrl } from '@/utils/imageUtils'

const route = useRoute()
const router = useRouter()

// 表单引用
const formRef = ref(null)
const tagInputRef = ref(null)

// 是否为编辑模式
const isEdit = ref(false)

// 小说数据
const novelData = ref({
  title: '',
  description: '',
  genre: '',
  target_word_count: 50000,
  cover: '',
  coverFile: null,
  coverPreview: '',
  tags: []
})

// 标签输入
const tagInput = ref('')
const tagInputVisible = ref(false)

// 类型选项
const genreOptions = ref([])

// 标签管理
const showTagInput = () => {
  tagInputVisible.value = true
  nextTick(() => {
    tagInputRef.value?.focus()
  })
}

const addTag = () => {
  const tag = tagInput.value.trim()
  if (tag && !novelData.value.tags.includes(tag)) {
    novelData.value.tags.push(tag)
  }
  tagInput.value = ''
  tagInputVisible.value = false
}

const removeTag = (tag) => {
  const index = novelData.value.tags.indexOf(tag)
  if (index > -1) {
    novelData.value.tags.splice(index, 1)
  }
}

// 封面上传
const beforeCoverUpload = (file) => {
  const isImage = file.type.startsWith('image/')
  const isLt5M = file.size / 1024 / 1024 < 5
  const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']

  if (!isImage || !supportedTypes.includes(file.type)) {
    ElMessage.error('只能上传 JPG、PNG、GIF、WEBP 格式的图片!')
    return false
  }
  if (!isLt5M) {
    ElMessage.error('图片大小不能超过 5MB!')
    return false
  }
  return true
}

const handleCoverChange = (file) => {
  if (file.raw) {
    // 保存文件对象
    novelData.value.coverFile = file.raw
    
    // 创建预览URL
    const reader = new FileReader()
    reader.onload = (e) => {
      novelData.value.coverPreview = e.target.result
    }
    reader.readAsDataURL(file.raw)
  }
}

// 表单验证规则
const rules = {
  title: [
    { required: true, message: '请输入小说标题', trigger: 'blur' },
    { min: 1, max: 100, message: '标题长度在 1 到 100 个字符', trigger: 'blur' }
  ],
  description: [
    { required: true, message: '请输入小说介绍', trigger: 'blur' },
    { min: 10, max: 1000, message: '介绍长度在 10 到 1000 个字符', trigger: 'blur' }
  ],
  genre: [
    { required: true, message: '请选择小说类型', trigger: 'change' }
  ],
  target_word_count: [
    { required: true, message: '请输入目标字数', trigger: 'blur' },
    { type: 'number', min: 1000, max: 10000000, message: '目标字数在 1000 到 10000000 之间', trigger: 'blur' }
  ]
}

// 获取小说类型列表
const loadNovelTypes = async () => {
  try {
    const response = await novelTypeAPI.getAvailableNovelTypes()
    if (response.success && response.data) {
      genreOptions.value = response.data
    }
  } catch (error) {
    console.error('获取小说类型失败:', error)
    ElMessage.error('获取小说类型失败')
  }
}

// 返回列表
const goBack = () => {
  router.push('/client/novels')
}

// 保存小说
const saveNovel = async () => {
  try {
    await formRef.value.validate()
    
    let novelPayload
    
    // 如果有封面文件，使用FormData格式
    if (novelData.value.coverFile && !isEdit.value) {
      novelPayload = new FormData()
      novelPayload.append('title', novelData.value.title)
      novelPayload.append('description', novelData.value.description)
      novelPayload.append('genre', novelData.value.genre)
      novelPayload.append('target_word_count', novelData.value.target_word_count)
      novelPayload.append('tags', novelData.value.tags.join(','))
      novelPayload.append('cover', novelData.value.coverFile)
    } else {
      // 普通JSON格式
      novelPayload = {
        title: novelData.value.title,
        description: novelData.value.description,
        genre: novelData.value.genre,
        target_word_count: novelData.value.target_word_count,
        tags: novelData.value.tags.join(',')
      }
      
      // 编辑模式下如果有封面URL，添加到payload中
      if (novelData.value.cover) {
        novelPayload.cover_image = novelData.value.cover
      }
    }
    
    let response
    if (isEdit.value) {
      response = await novelAPI.updateNovel(route.params.id, novelPayload)
    } else {
      response = await novelAPI.createNovel(novelPayload)
    }
    
    if (response.success) {
      ElMessage.success(isEdit.value ? '小说更新成功！' : '小说创建成功！')
      router.push('/client/novels')
    } else {
      ElMessage.error(response.message || '操作失败')
    }
  } catch (error) {
    console.error('保存小说失败:', error)
    ElMessage.error('保存失败，请重试')
  }
}



// 加载小说数据（编辑模式）
const loadNovelData = async () => {
  if (!isEdit.value) return
  
  try {
    const response = await novelAPI.getNovel(route.params.id)
    if (response.success && response.data) {
      const novel = response.data
      novelData.value = {
        title: novel.title || '',
        description: novel.description || '',
        genre: novel.genre || '',
        target_word_count: novel.target_word_count || 50000,
        cover: novel.cover_image || '',
        coverFile: null,
        coverPreview: novel.cover_image || '',
        tags: novel.tags ? (typeof novel.tags === 'string' ? novel.tags.split(',').filter(tag => tag.trim()) : novel.tags) : []
      }
    } else {
      ElMessage.error('加载小说数据失败')
      router.push('/client/novels')
    }
  } catch (error) {
    console.error('加载小说数据失败:', error)
    ElMessage.error('加载失败，请重试')
    router.push('/client/novels')
  }
}

// 挂载时检查是否为编辑模式
onMounted(() => {
  // 加载小说类型列表
  loadNovelTypes()
  
  if (route.params.id && route.params.id !== 'new') {
    isEdit.value = true
    loadNovelData()
  }
})
</script>

<style scoped>
.novel-create {
  padding: 24px;
  background: #f5f5f5;
  min-height: 100vh;
}

.create-header {
  display: flex;
  align-items: center;
  margin-bottom: 24px;
  padding: 16px 24px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.back-btn {
  margin-right: 16px;
  color: #666;
}

.back-btn:hover {
  color: #409eff;
}

.create-header h2 {
  margin: 0;
  color: #333;
  font-size: 20px;
  font-weight: 600;
}

.create-container {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.novel-form {
  padding: 32px;
}

.novel-form .el-form-item {
  margin-bottom: 24px;
}

.novel-form .el-textarea__inner {
  resize: vertical;
}

.novel-form .el-button {
  margin-right: 12px;
}

.novel-form .el-button:last-child {
  margin-right: 0;
}

.cover-uploader {
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: all 0.3s;
  width: 178px;
  height: 178px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cover-uploader :deep(.el-upload) {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cover-uploader :deep(.el-upload-dragger) {
  width: 100%;
  height: 100%;
  border: none;
  border-radius: 0;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cover-uploader:hover {
  border-color: #409eff;
}

.cover-uploader-icon {
  font-size: 28px;
  color: #8c939d;
}

.cover-image {
  width: 178px;
  height: 178px;
  object-fit: cover;
  display: block;
}

.upload-tip {
  margin-top: 8px;
  font-size: 12px;
  color: #999;
  line-height: 1.4;
}
</style>