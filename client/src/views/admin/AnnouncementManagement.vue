<template>
  <div class="announcement-management">
    <div class="page-header">
      <h1>公告管理</h1>
      <p>管理系统公告，包括创建、编辑和删除公告</p>
    </div>

    <div class="content-wrapper">
      <!-- 操作栏 -->
      <div class="toolbar">
        <el-button type="primary" @click="showCreateDialog">
          <el-icon><Plus /></el-icon>
          新建公告
        </el-button>
        <el-button @click="refreshData">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>

      <!-- 公告列表 -->
      <el-card class="table-card" shadow="never">
        <el-table
          v-loading="loading"
          :data="announcements"
          style="width: 100%"
          @sort-change="handleSortChange"
        >
          <el-table-column prop="id" label="ID" width="80" sortable />
          <el-table-column prop="title" label="标题" min-width="200" show-overflow-tooltip />
          <el-table-column prop="type" label="类型" width="100">
            <template #default="{ row }">
              <el-tag :type="getTypeTagType(row.type)" size="small">
                {{ getTypeLabel(row.type) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="priority" label="优先级" width="100">
            <template #default="{ row }">
              <el-tag :type="getPriorityTagType(row.priority)" size="small">
                {{ getPriorityLabel(row.priority) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="isActive" label="状态" width="100">
            <template #default="{ row }">
              <el-switch
                v-model="row.isActive"
                @change="toggleStatus(row)"
                :loading="row.statusLoading"
              />
            </template>
          </el-table-column>
          <el-table-column prop="startDate" label="开始时间" width="180">
            <template #default="{ row }">
              {{ formatDate(row.startDate) }}
            </template>
          </el-table-column>
          <el-table-column prop="endDate" label="结束时间" width="180">
            <template #default="{ row }">
              {{ formatDate(row.endDate) }}
            </template>
          </el-table-column>
          <el-table-column prop="createdAt" label="创建时间" width="180" sortable>
            <template #default="{ row }">
              {{ formatDate(row.createdAt) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" size="small" @click="editAnnouncement(row)">
                编辑
              </el-button>
              <el-button type="danger" size="small" @click="deleteAnnouncement(row)">
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>

    <!-- 创建/编辑公告对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑公告' : '新建公告'"
      width="600px"
      @close="resetForm"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="100px"
      >
        <el-form-item label="标题" prop="title">
          <el-input v-model="form.title" placeholder="请输入公告标题" />
        </el-form-item>
        <el-form-item label="内容" prop="content">
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="4"
            placeholder="请输入公告内容"
          />
        </el-form-item>
        <el-form-item label="类型" prop="type">
          <el-select v-model="form.type" placeholder="请选择公告类型">
            <el-option label="信息" value="info" />
            <el-option label="成功" value="success" />
            <el-option label="警告" value="warning" />
            <el-option label="错误" value="error" />
          </el-select>
        </el-form-item>
        <el-form-item label="优先级" prop="priority">
          <el-select v-model="form.priority" placeholder="请选择优先级">
            <el-option label="高" value="high" />
            <el-option label="中" value="medium" />
            <el-option label="低" value="low" />
          </el-select>
        </el-form-item>
        <el-form-item label="时间范围" prop="dateRange">
          <el-date-picker
            v-model="form.dateRange"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            format="YYYY-MM-DD HH:mm:ss"
            value-format="YYYY-MM-DDTHH:mm:ss.sssZ"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="form.isActive" active-text="启用" inactive-text="禁用" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm" :loading="submitLoading">
          {{ isEdit ? '更新' : '创建' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh } from '@element-plus/icons-vue'
import { siteSettingsAPI } from '@/api/siteSettings'
import { useUserStore } from '@/stores/user'

// 用户store
const userStore = useUserStore()

// 获取管理员token
const getAdminToken = () => {
  return userStore.token || localStorage.getItem('admin_token') || localStorage.getItem('token')
}

// 响应式数据
const loading = ref(false)
const announcements = ref([])
const dialogVisible = ref(false)
const isEdit = ref(false)
const submitLoading = ref(false)
const formRef = ref()

// 表单数据
const form = reactive({
  id: null,
  title: '',
  content: '',
  type: 'info',
  priority: 'medium',
  dateRange: [],
  isActive: true
})

// 表单验证规则
const rules = {
  title: [
    { required: true, message: '请输入公告标题', trigger: 'blur' },
    { min: 1, max: 100, message: '标题长度在 1 到 100 个字符', trigger: 'blur' }
  ],
  content: [
    { required: true, message: '请输入公告内容', trigger: 'blur' },
    { min: 1, max: 1000, message: '内容长度在 1 到 1000 个字符', trigger: 'blur' }
  ],
  type: [
    { required: true, message: '请选择公告类型', trigger: 'change' }
  ],
  priority: [
    { required: true, message: '请选择优先级', trigger: 'change' }
  ]
}

// 获取公告列表
const loadAnnouncements = async () => {
  loading.value = true
  try {
    const token = getAdminToken()
    const response = await siteSettingsAPI.getAdminAnnouncements(token)
    
    // 处理不同的API响应格式
    let announcementsData = []
    if (response && response.data) {
      if (response.data.success && response.data.data && response.data.data.announcements) {
        // 新格式: { success: true, data: { announcements: [...] } }
        announcementsData = response.data.data.announcements
      } else if (Array.isArray(response.data)) {
        // 旧格式: 直接数组
        announcementsData = response.data
      } else if (response.data.announcements && Array.isArray(response.data.announcements)) {
        // 其他格式: { announcements: [...] }
        announcementsData = response.data.announcements
      }
    }
    
    announcements.value = announcementsData.map(item => ({
      ...item,
      statusLoading: false
    }))
  } catch (error) {
    console.error('获取公告列表失败:', error)
    ElMessage.error('获取公告列表失败')
  } finally {
    loading.value = false
  }
}

// 刷新数据
const refreshData = () => {
  loadAnnouncements()
}

// 显示创建对话框
const showCreateDialog = () => {
  isEdit.value = false
  dialogVisible.value = true
}

// 编辑公告
const editAnnouncement = (row) => {
  isEdit.value = true
  form.id = row.id
  form.title = row.title
  form.content = row.content
  form.type = row.type
  form.priority = row.priority
  form.dateRange = [row.startDate, row.endDate]
  form.isActive = row.isActive
  dialogVisible.value = true
}

// 切换状态
const toggleStatus = async (row) => {
  row.statusLoading = true
  try {
    const token = getAdminToken()
    await siteSettingsAPI.updateAnnouncement(token, row.id, {
      ...row,
      isActive: row.isActive
    })
    ElMessage.success('状态更新成功')
  } catch (error) {
    console.error('状态更新失败:', error)
    ElMessage.error('状态更新失败')
    // 恢复原状态
    row.isActive = !row.isActive
  } finally {
    row.statusLoading = false
  }
}

// 删除公告
const deleteAnnouncement = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除公告"${row.title}"吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const token = getAdminToken()
    await siteSettingsAPI.deleteAnnouncement(token, row.id)
    ElMessage.success('删除成功')
    loadAnnouncements()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

// 提交表单
const submitForm = async () => {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    
    submitLoading.value = true
    
    const data = {
      title: form.title,
      content: form.content,
      type: form.type,
      priority: form.priority,
      startDate: form.dateRange[0],
      endDate: form.dateRange[1],
      isActive: form.isActive
    }
    
    const token = getAdminToken()
    
    if (isEdit.value) {
      await siteSettingsAPI.updateAnnouncement(token, form.id, data)
      ElMessage.success('更新成功')
    } else {
      await siteSettingsAPI.createAnnouncement(token, data)
      ElMessage.success('创建成功')
    }
    
    dialogVisible.value = false
    loadAnnouncements()
  } catch (error) {
    if (error.message) {
      console.error('提交失败:', error)
      ElMessage.error('提交失败')
    }
  } finally {
    submitLoading.value = false
  }
}

// 重置表单
const resetForm = () => {
  if (formRef.value) {
    formRef.value.resetFields()
  }
  form.id = null
  form.title = ''
  form.content = ''
  form.type = 'info'
  form.priority = 'medium'
  form.dateRange = []
  form.isActive = true
}

// 排序处理
const handleSortChange = ({ column, prop, order }) => {
  // 这里可以实现排序逻辑
  console.log('排序:', { column, prop, order })
}

// 获取类型标签类型
const getTypeTagType = (type) => {
  const typeMap = {
    info: '',
    success: 'success',
    warning: 'warning',
    error: 'danger'
  }
  return typeMap[type] || ''
}

// 获取类型标签文本
const getTypeLabel = (type) => {
  const typeMap = {
    info: '信息',
    success: '成功',
    warning: '警告',
    error: '错误'
  }
  return typeMap[type] || type
}

// 获取优先级标签类型
const getPriorityTagType = (priority) => {
  const priorityMap = {
    high: 'danger',
    medium: 'warning',
    low: 'info'
  }
  return priorityMap[priority] || ''
}

// 获取优先级标签文本
const getPriorityLabel = (priority) => {
  const priorityMap = {
    high: '高',
    medium: '中',
    low: '低'
  }
  return priorityMap[priority] || priority
}

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 组件挂载时加载数据
onMounted(() => {
  loadAnnouncements()
})
</script>

<style scoped>
.announcement-management {
  padding: 24px;
  background-color: #f5f7fa;
  min-height: 100vh;
}

.page-header {
  background: #fff;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  margin-bottom: 24px;
}

.page-header h1 {
  margin: 0 0 8px 0;
  color: #303133;
  font-size: 24px;
  font-weight: 600;
}

.page-header p {
  margin: 0;
  color: #606266;
  font-size: 14px;
  line-height: 1.5;
}

.content-wrapper {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.toolbar {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #ebeef5;
}

.table-card {
  border: none;
  box-shadow: none;
}

.table-card :deep(.el-card__body) {
  padding: 0;
}

.el-table {
  border-radius: 8px;
  overflow: hidden;
}

.el-table :deep(.el-table__header-wrapper) {
  background-color: #fafafa;
}

.el-table :deep(.el-table__header th) {
  background-color: #fafafa;
  color: #606266;
  font-weight: 600;
  border-bottom: 1px solid #ebeef5;
}

.el-table :deep(.el-table__row) {
  transition: background-color 0.2s;
}

.el-table :deep(.el-table__row:hover) {
  background-color: #f5f7fa;
}

.el-table :deep(.el-table__cell) {
  border-bottom: 1px solid #f0f2f5;
}

/* 对话框样式优化 */
:deep(.el-dialog) {
  border-radius: 12px;
  overflow: hidden;
}

:deep(.el-dialog__header) {
  background-color: #fafafa;
  padding: 20px 24px;
  border-bottom: 1px solid #ebeef5;
}

:deep(.el-dialog__title) {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

:deep(.el-dialog__body) {
  padding: 24px;
}

:deep(.el-dialog__footer) {
  padding: 16px 24px;
  background-color: #fafafa;
  border-top: 1px solid #ebeef5;
}

/* 表单样式优化 */
:deep(.el-form-item__label) {
  font-weight: 500;
  color: #606266;
}

:deep(.el-input__wrapper) {
  border-radius: 6px;
}

:deep(.el-textarea__inner) {
  border-radius: 6px;
}

:deep(.el-select) {
  width: 100%;
}

:deep(.el-date-editor) {
  width: 100%;
}

/* 按钮样式优化 */
:deep(.el-button) {
  border-radius: 6px;
  font-weight: 500;
}

:deep(.el-button--primary) {
  background-color: #409eff;
  border-color: #409eff;
}

:deep(.el-button--primary:hover) {
  background-color: #66b1ff;
  border-color: #66b1ff;
}

/* 标签样式优化 */
:deep(.el-tag) {
  border-radius: 4px;
  font-weight: 500;
}

/* 开关样式优化 */
:deep(.el-switch) {
  --el-switch-on-color: #409eff;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .announcement-management {
    padding: 16px;
  }
  
  .page-header {
    padding: 20px;
  }
  
  .content-wrapper {
    padding: 20px;
  }
}

@media (max-width: 768px) {
  .announcement-management {
    padding: 12px;
  }
  
  .page-header {
    padding: 16px;
  }
  
  .page-header h1 {
    font-size: 20px;
  }
  
  .content-wrapper {
    padding: 16px;
  }
  
  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }
  
  .toolbar .el-button {
    width: 100%;
    justify-content: center;
  }
  
  :deep(.el-dialog) {
    width: 95% !important;
    margin: 5vh auto;
  }
  
  :deep(.el-table) {
    font-size: 12px;
  }
  
  :deep(.el-table .el-button) {
    padding: 4px 8px;
    font-size: 12px;
  }
}

@media (max-width: 480px) {
  .page-header h1 {
    font-size: 18px;
  }
  
  .page-header p {
    font-size: 13px;
  }
  
  :deep(.el-dialog__header) {
    padding: 16px 20px;
  }
  
  :deep(.el-dialog__body) {
    padding: 20px;
  }
  
  :deep(.el-dialog__footer) {
    padding: 12px 20px;
  }
}
</style>