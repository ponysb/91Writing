<template>
  <div class="membership-management">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title">会员套餐管理</h1>
      <p class="page-desc">管理系统中的会员套餐配置</p>
    </div>

    <!-- 操作栏 -->
    <div class="action-bar">
      <div class="search-section">
        <el-input
          v-model="searchQuery"
          placeholder="搜索套餐名称"
          style="width: 300px"
          clearable
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-select v-model="statusFilter" placeholder="状态筛选" style="width: 120px; margin-left: 12px">
          <el-option label="全部" value="" />
          <el-option label="启用" value="active" />
          <el-option label="禁用" value="inactive" />
        </el-select>
      </div>
      <div class="action-buttons">
        <el-button type="primary" @click="showAddDialog">
          <el-icon><Plus /></el-icon>
          添加套餐
        </el-button>
      </div>
    </div>

    <!-- 套餐表格 -->
    <el-card shadow="hover">
      <el-table :data="filteredPackages" style="width: 100%" v-loading="loading">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="套餐名称" min-width="150" />
        <el-table-column prop="description" label="描述" min-width="200" />
        <el-table-column prop="price" label="价格" width="100">
          <template #default="{ row }">
            <span class="price">¥{{ row.price }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="credits" label="积分" width="100" />
        <el-table-column prop="validity_days" label="有效期" width="100">
          <template #default="{ row }">
            {{ row.validity_days }}天
          </template>
        </el-table-column>
        <el-table-column prop="original_price" label="原价" width="100">
          <template #default="{ row }">
            <span v-if="row.original_price" class="original-price">¥{{ row.original_price }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="max_activations" label="最大激活" width="100" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'danger'" size="small">
              {{ row.status === 'active' ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="sort_order" label="排序" width="80" />
        <el-table-column prop="created_at" label="创建时间" width="180" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="editPackage(row)">编辑</el-button>
            <el-button 
              :type="row.status === 'active' ? 'warning' : 'success'" 
              size="small" 
              @click="toggleStatus(row)"
            >
              {{ row.status === 'active' ? '禁用' : '启用' }}
            </el-button>
            <el-button type="danger" size="small" @click="deletePackage(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 添加/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑套餐' : '添加套餐'"
      width="800px"
      class="package-dialog"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <!-- 基本信息 -->
        <el-card class="form-section" shadow="never">
          <template #header>
            <div class="section-header">
              <el-icon><InfoFilled /></el-icon>
              <span>基本信息</span>
            </div>
          </template>
          <el-form-item label="套餐名称" prop="name">
            <el-input v-model="form.name" placeholder="请输入套餐名称" />
          </el-form-item>
          <el-form-item label="套餐描述" prop="description">
            <el-input v-model="form.description" type="textarea" :rows="3" placeholder="请输入套餐描述" />
          </el-form-item>
        </el-card>

        <!-- 价格配置 -->
        <el-card class="form-section" shadow="never">
          <template #header>
            <div class="section-header">
              <el-icon><Money /></el-icon>
              <span>价格配置</span>
            </div>
          </template>
          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="现价" prop="price">
                <el-input-number v-model="form.price" :min="0" :precision="2" style="width: 100%" placeholder="0.00" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="原价" prop="original_price">
                <el-input-number v-model="form.original_price" :min="0" :precision="2" style="width: 100%" placeholder="0.00" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="折扣" prop="discount">
                <el-input-number v-model="form.discount" :min="0" :max="1" :step="0.1" :precision="2" style="width: 100%" placeholder="0.0" />
              </el-form-item>
            </el-col>
          </el-row>
        </el-card>

        <!-- 套餐内容 -->
        <el-card class="form-section" shadow="never">
          <template #header>
            <div class="section-header">
              <el-icon><Star /></el-icon>
              <span>套餐内容</span>
            </div>
          </template>
          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="积分数量" prop="credits">
                <el-input-number v-model="form.credits" :min="1" style="width: 100%" placeholder="100" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="有效天数" prop="validity_days">
                <el-input-number v-model="form.validity_days" :min="1" style="width: 100%" placeholder="30" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="最大激活次数">
                <el-input-number v-model="form.max_activations" :min="1" style="width: 100%" placeholder="100" />
              </el-form-item>
            </el-col>
          </el-row>
        </el-card>

        <!-- 显示设置 -->
        <el-card class="form-section" shadow="never">
          <template #header>
            <div class="section-header">
              <el-icon><Setting /></el-icon>
              <span>显示设置</span>
            </div>
          </template>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="排序" prop="sort_order">
                <el-input-number v-model="form.sort_order" :min="0" style="width: 100%" placeholder="0" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="状态" prop="status">
                <el-select v-model="form.status" placeholder="请选择状态" style="width: 100%">
                  <el-option label="启用" value="active" />
                  <el-option label="禁用" value="inactive" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
        </el-card>
      </el-form>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="savePackage" :loading="saving">
            {{ isEdit ? '更新' : '添加' }}
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus, InfoFilled, Money, Setting, Star } from '@element-plus/icons-vue'
import { packageAPI } from '@/api'

const loading = ref(false)
const saving = ref(false)
const searchQuery = ref('')
const statusFilter = ref('')
const dialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref()

const packages = ref([])

const form = ref({
  id: null,
  name: '',
  description: '',
  credits: 100,
  validity_days: 30,
  price: 0,
  original_price: 0,
  discount: 0,
  type: 'basic',
  features: [],
  max_activations: 1000,
  status: 'active',
  sort_order: 0,
  is_popular: false
})

const rules = {
  name: [{ required: true, message: '请输入套餐名称', trigger: 'blur' }],
  description: [{ required: true, message: '请输入套餐描述', trigger: 'blur' }],
  credits: [{ required: true, message: '请输入积分数量', trigger: 'blur' }],
  validity_days: [{ required: true, message: '请输入有效天数', trigger: 'blur' }],
  price: [{ required: true, message: '请输入价格', trigger: 'blur' }],
  max_activations: [{ required: false }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }]
}

const filteredPackages = computed(() => {
  let result = packages.value
  
  if (searchQuery.value) {
    result = result.filter(pkg => 
      pkg.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      pkg.description.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
  }
  
  if (statusFilter.value) {
    result = result.filter(pkg => pkg.status === statusFilter.value)
  }
  
  return result
})

const showAddDialog = () => {
  isEdit.value = false
  form.value = {
    id: null,
    name: '',
    description: '',
    credits: 100,
    validity_days: 30,
    price: 0,
    original_price: 0,
    discount: 0,
    max_activations: 1000,
    status: 'active',
    sort_order: 0
  }
  dialogVisible.value = true
}

const editPackage = (pkg) => {
  isEdit.value = true
  form.value = { ...pkg }
  dialogVisible.value = true
}

const savePackage = async () => {
  try {
    await formRef.value.validate()
    saving.value = true
    
    const packageData = { ...form.value }
    if (!isEdit.value) {
      delete packageData.id // 创建时不需要id字段
    }
    
    let response
    if (isEdit.value) {
      response = await packageAPI.updatePackage(form.value.id, packageData)
      console.log('Update response:', response)
    } else {
      response = await packageAPI.createPackage(packageData)
      console.log('Create response:', response)
    }
    
    // 处理响应
    if (response) {
      ElMessage.success(isEdit.value ? '套餐更新成功' : '套餐添加成功')
      dialogVisible.value = false
      await loadPackages()
    } else {
      throw new Error('响应数据为空')
    }
    
  } catch (error) {
    console.error('Save package error:', error)
    
    // 如果是表单验证错误，不显示错误提示（Element Plus会自动显示）
    if (error && typeof error === 'object' && !error.response) {
      // 这是表单验证错误，不需要额外提示
      return
    }
    
    // 其他错误才显示提示
    const errorMessage = error.response?.data?.message || error.message || '未知错误'
    ElMessage.error('保存失败：' + errorMessage)
  } finally {
    saving.value = false
  }
}

const toggleStatus = async (pkg) => {
  const action = pkg.status === 'active' ? '禁用' : '启用'
  try {
    await ElMessageBox.confirm(`确定要${action}套餐「${pkg.name}」吗？`, '确认操作')
    
    const newStatus = pkg.status === 'active' ? 'inactive' : 'active'
    const updateData = { ...pkg, status: newStatus }
    const response = await packageAPI.updatePackage(pkg.id, updateData)
    console.log('Toggle status response:', response)
    
    if (response) {
      pkg.status = newStatus
      ElMessage.success(`套餐${action}成功`)
    } else {
      throw new Error(`${action}失败`)
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Toggle status error:', error)
      const errorMessage = error.response?.data?.message || error.message || '未知错误'
      ElMessage.error(`${action}失败：` + errorMessage)
    }
  }
}

const deletePackage = async (pkg) => {
  try {
    await ElMessageBox.confirm(`确定要删除套餐「${pkg.name}」吗？`, '确认删除', { type: 'warning' })
    
    const response = await packageAPI.deletePackage(pkg.id)
    console.log('Delete response:', response)
    
    if (response) {
      ElMessage.success('套餐删除成功')
      await loadPackages()
    } else {
      throw new Error('删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Delete package error:', error)
      const errorMessage = error.response?.data?.message || error.message || '未知错误'
      ElMessage.error('删除失败：' + errorMessage)
    }
  }
}

// 加载套餐列表
const loadPackages = async () => {
  loading.value = true
  try {
    const response = await packageAPI.getPackages()
    console.log('API Response:', response)
    
    // 直接处理响应数据，无论是否包装在success字段中
    if (response && response.data) {
      let packageData = []
      
      // 处理不同的响应格式
      if (response.data.success && response.data.data) {
        // 格式1: { success: true, data: { packages: [...] } }
        if (response.data.data.packages) {
          packageData = response.data.data.packages
        }
        // 格式2: { success: true, data: [...] }
        else if (Array.isArray(response.data.data)) {
          packageData = response.data.data
        }
      }
      // 格式3: 直接返回数组
      else if (Array.isArray(response.data)) {
        packageData = response.data
      }
      // 格式4: { packages: [...] }
      else if (response.data.packages) {
        packageData = response.data.packages
      }
      
      packages.value = packageData
      console.log('Loaded packages:', packageData)
      
      if (packageData.length === 0) {
        ElMessage.info('暂无套餐数据')
      } else {
        ElMessage.success(`成功加载 ${packageData.length} 个套餐`)
      }
    } else {
      throw new Error('响应数据格式错误')
    }
  } catch (error) {
    console.error('Load packages error:', error)
    const errorMessage = error.response?.data?.message || error.message || '未知错误'
    ElMessage.error('加载套餐列表失败：' + errorMessage)
    packages.value = []
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadPackages()
})
</script>

<style scoped>
.membership-management {
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

.price {
  font-weight: 600;
  color: #e74c3c;
}

.original-price {
  color: #909399;
  text-decoration: line-through;
  font-size: 14px;
}

/* 弹窗样式 */
.package-dialog {
  .form-section {
    margin-bottom: 20px;
    border: 1px solid #e4e7ed;
    border-radius: 8px;
    
    .section-header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      color: #303133;
      font-size: 16px;
      
      .el-icon {
        color: #409eff;
      }
    }
    
    :deep(.el-card__header) {
      background: #f8f9fa;
      border-bottom: 1px solid #e4e7ed;
      padding: 16px 20px;
    }
    
    :deep(.el-card__body) {
      padding: 20px;
    }
  }
  
  .features-group {
    .el-checkbox {
      margin-right: 0;
      margin-bottom: 8px;
      width: 100%;
    }
  }
  
  .dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding-top: 20px;
    border-top: 1px solid #e4e7ed;
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .package-dialog {
    width: 95% !important;
    
    .form-section {
      :deep(.el-card__body) {
        padding: 16px;
      }
    }
  }
}
</style>