<template>
  <div class="novel-type-management">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title">小说类型管理</h1>
      <p class="page-desc">管理系统中的小说类型，包括提示词模板和写作指导</p>
    </div>

    <!-- 操作栏 -->
    <div class="action-bar">
      <div class="search-section">
        <el-input
          v-model="searchQuery"
          placeholder="搜索类型名称或描述"
          style="width: 300px"
          clearable
          @input="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-select 
          v-model="activeFilter" 
          placeholder="状态筛选" 
          style="width: 120px; margin-left: 12px"
          @change="handleSearch"
        >
          <el-option label="全部" value="" />
          <el-option label="启用" value="true" />
          <el-option label="禁用" value="false" />
        </el-select>

      </div>
      <div class="action-buttons">
        <el-button 
          type="danger" 
          :disabled="selectedTypes.length === 0"
          @click="batchDelete"
        >
          <el-icon><Delete /></el-icon>
          批量删除 ({{ selectedTypes.length }})
        </el-button>
        <el-button type="primary" @click="showAddDialog">
          <el-icon><Plus /></el-icon>
          添加类型
        </el-button>
      </div>
    </div>

    <!-- 类型表格 -->
    <el-card shadow="hover">
      <el-table 
        :data="types" 
        style="width: 100%" 
        v-loading="loading"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="类型名称" min-width="150" />
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />



        <el-table-column prop="usage_count" label="使用次数" width="100" />
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-switch
              v-model="row.is_active"
              @change="toggleStatus(row)"
              :loading="row.statusLoading"
            />
          </template>
        </el-table-column>

        <el-table-column prop="created_at" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="viewDetails(row)">
              详情
            </el-button>
            <el-button type="warning" size="small" @click="editType(row)">
              编辑
            </el-button>
            <el-button type="danger" size="small" @click="deleteType(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadTypes"
          @current-change="loadTypes"
        />
      </div>
    </el-card>

    <!-- 添加/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑类型' : '添加类型'"
      width="800px"
      :close-on-click-modal="false"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="120px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="类型名称" prop="name">
              <el-input v-model="form.name" placeholder="请输入类型名称" />
            </el-form-item>
          </el-col>

        </el-row>
        
        <el-form-item label="描述" prop="description">
          <el-input 
            v-model="form.description" 
            type="textarea" 
            :rows="3" 
            placeholder="请输入类型描述" 
          />
        </el-form-item>
        

        

        

        

        
        <el-form-item label="提示词模板" prop="prompt_template">
          <el-input 
            v-model="form.prompt_template" 
            type="textarea" 
            :rows="4" 
            placeholder="请输入提示词模板" 
          />
        </el-form-item>
        

        

        

        

        
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="排序顺序" prop="sort_order">
              <el-input-number v-model="form.sort_order" :min="1" :max="999" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="是否启用">
              <el-switch v-model="form.is_active" />
            </el-form-item>
          </el-col>

        </el-row>
      </el-form>
      
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveType" :loading="saving">
          {{ isEdit ? '更新' : '添加' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="类型详情"
      width="900px"
    >
      <div v-if="selectedType" class="type-details">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="类型名称">{{ selectedType.name }}</el-descriptions-item>

          <el-descriptions-item label="使用次数">{{ selectedType.usage_count }}</el-descriptions-item>



          <el-descriptions-item label="排序顺序">{{ selectedType.sort_order }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="selectedType.is_active ? 'success' : 'danger'" size="small">
              {{ selectedType.is_active ? '启用' : '禁用' }}
            </el-tag>
          </el-descriptions-item>

          <el-descriptions-item label="创建时间" :span="2">{{ formatDate(selectedType.created_at) }}</el-descriptions-item>
          <el-descriptions-item label="更新时间" :span="2">{{ formatDate(selectedType.updated_at) }}</el-descriptions-item>
        </el-descriptions>
        
        <el-divider>描述</el-divider>
        <p>{{ selectedType.description }}</p>
        

        

        
        <el-divider>提示词模板</el-divider>
        <el-input 
          :model-value="selectedType.prompt_template" 
          type="textarea" 
          :rows="6" 
          readonly
        />
        

        

        

        

      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus, Delete } from '@element-plus/icons-vue'
import { novelTypeAPI } from '@/api/index'

const loading = ref(false)
const saving = ref(false)
const searchQuery = ref('')
const activeFilter = ref('')

const dialogVisible = ref(false)
const detailDialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref()
const selectedTypes = ref([])
const selectedType = ref(null)

// 分页相关
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const types = ref([])

// 表单数据
const form = ref({
  id: null,
  name: '',
  description: '',
  prompt_template: '',
  sort_order: 1,
  is_active: true
})



// 表单验证规则
const rules = {
  name: [{ required: true, message: '请输入类型名称', trigger: 'blur' }],
  description: [{ required: true, message: '请输入描述', trigger: 'blur' }],
  prompt_template: [{ required: true, message: '请输入提示词模板', trigger: 'blur' }]
}



// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString('zh-CN')
}

// 加载类型列表
const loadTypes = async () => {
  try {
    loading.value = true
    const params = {
      page: currentPage.value,
      limit: pageSize.value
    }
    
    if (searchQuery.value) {
      params.search = searchQuery.value
    }
    if (activeFilter.value !== '') {
      params.is_active = activeFilter.value
    }

    
    const response = await novelTypeAPI.getNovelTypes(params)
    
    // 处理API响应数据结构
    if (response.data && response.data.types) {
      types.value = response.data.types
      total.value = response.data.pagination?.total || 0
    } else if (Array.isArray(response.data)) {
      types.value = response.data
      total.value = response.data.length
    } else {
      types.value = []
      total.value = 0
    }
    
    // 为每个类型添加加载状态
    types.value.forEach(type => {
      type.statusLoading = false
    })
    
  } catch (error) {
    console.error('加载类型列表失败:', error)
    ElMessage.error('加载类型列表失败')
    types.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

// 搜索处理
const handleSearch = () => {
  currentPage.value = 1
  loadTypes()
}

// 选择变化处理
const handleSelectionChange = (selection) => {
  selectedTypes.value = selection
}

// 显示添加对话框
const showAddDialog = () => {
  isEdit.value = false
  form.value = {
    id: null,
    name: '',
    description: '',
    prompt_template: '',
    sort_order: 1,
    is_active: true
  }
  dialogVisible.value = true
}

// 编辑类型
const editType = async (type) => {
  try {
    // 获取完整的类型详情
    const response = await novelTypeAPI.getNovelType(type.id)
    const typeData = response.data
    
    isEdit.value = true
    form.value = {
      id: typeData.id,
      name: typeData.name || '',
      description: typeData.description || '',
      prompt_template: typeData.prompt_template || '',
      sort_order: typeData.sort_order || 1,
      is_active: typeData.is_active !== undefined ? typeData.is_active : true
    }
    

    
    dialogVisible.value = true
  } catch (error) {
    console.error('获取类型详情失败:', error)
    ElMessage.error('获取类型详情失败')
  }
}

// 查看详情
const viewDetails = async (type) => {
  try {
    const response = await novelTypeAPI.getNovelType(type.id)
    selectedType.value = response.data
    detailDialogVisible.value = true
  } catch (error) {
    console.error('获取类型详情失败:', error)
    ElMessage.error('获取类型详情失败')
  }
}



// 保存类型
const saveType = async () => {
  try {
    await formRef.value.validate()
    

    
    saving.value = true
    
    const typeData = { ...form.value }
    delete typeData.id // 移除ID字段
    
    if (isEdit.value) {
      await novelTypeAPI.updateNovelType(form.value.id, typeData)
      ElMessage.success('类型更新成功')
    } else {
      await novelTypeAPI.createNovelType(typeData)
      ElMessage.success('类型添加成功')
    }
    
    dialogVisible.value = false
    loadTypes()
  } catch (error) {
    if (error.errors) {
      // 表单验证错误
      return
    }
    console.error('保存失败:', error)
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

// 切换状态
const toggleStatus = async (type) => {
  try {
    type.statusLoading = true
    await novelTypeAPI.updateNovelType(type.id, { is_active: type.is_active })
    ElMessage.success(`类型${type.is_active ? '启用' : '禁用'}成功`)
  } catch (error) {
    // 恢复原状态
    type.is_active = !type.is_active
    console.error('状态切换失败:', error)
    ElMessage.error('状态切换失败')
  } finally {
    type.statusLoading = false
  }
}



// 删除类型
const deleteType = async (type) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除类型「${type.name}」吗？此操作不可恢复。`,
      '确认删除',
      { type: 'warning' }
    )
    
    await novelTypeAPI.deleteNovelType(type.id)
    ElMessage.success('类型删除成功')
    loadTypes()
  } catch (error) {
    if (error === 'cancel') return
    console.error('删除失败:', error)
    ElMessage.error('删除失败')
  }
}

// 批量删除
const batchDelete = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedTypes.value.length} 个类型吗？此操作不可恢复。`,
      '确认批量删除',
      { type: 'warning' }
    )
    
    const ids = selectedTypes.value.map(type => type.id)
    await novelTypeAPI.batchDeleteNovelTypes(ids)
    ElMessage.success(`成功删除 ${ids.length} 个类型`)
    selectedTypes.value = []
    loadTypes()
  } catch (error) {
    if (error === 'cancel') return
    console.error('批量删除失败:', error)
    ElMessage.error('批量删除失败')
  }
}

// 组件挂载时加载数据
onMounted(() => {
  loadTypes()
})
</script>

<style scoped>
.novel-type-management {
  padding: 20px;
}

.page-header {
  margin-bottom: 24px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #333;
  margin: 0 0 8px 0;
}

.page-desc {
  color: #666;
  margin: 0;
}

.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.search-section {
  display: flex;
  align-items: center;
}

.action-buttons {
  display: flex;
  gap: 12px;
}

.color-preview {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: 1px solid #ddd;
  margin: 0 auto;
}



.pagination-wrapper {
  margin-top: 20px;
  text-align: center;
}

.type-details {
  max-height: 600px;
  overflow-y: auto;
}



.el-divider {
  margin: 20px 0 16px 0;
}

.el-descriptions {
  margin-bottom: 20px;
}

.el-form-item {
  margin-bottom: 18px;
}

.el-textarea {
  margin-bottom: 16px;
}
</style>