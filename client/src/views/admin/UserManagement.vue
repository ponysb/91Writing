<template>
  <div class="user-management">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title">用户管理</h1>
      <p class="page-desc">管理系统中的所有用户信息</p>
    </div>

    <!-- 操作栏 -->
    <div class="action-bar">
      <div class="search-section">
        <el-input
          v-model="searchQuery"
          placeholder="搜索用户名、邮箱或手机号"
          style="width: 300px"
          clearable
          @input="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-select v-model="statusFilter" placeholder="用户状态" style="width: 120px; margin-left: 12px" @change="handleFilterChange">
          <el-option label="全部" value="" />
          <el-option label="正常" value="active" />
          <el-option label="禁用" value="disabled" />
        </el-select>
        <el-select v-model="roleFilter" placeholder="用户角色" style="width: 120px; margin-left: 12px" @change="handleFilterChange">
          <el-option label="全部" value="" />
          <el-option label="普通用户" value="user" />
          <el-option label="会员用户" value="vip" />
          <el-option label="管理员" value="admin" />
          <el-option label="提示词专家" value="prompt_expert" />
        </el-select>
      </div>
      <div class="action-buttons">
        <el-button type="primary" @click="showAddUserDialog">
          <el-icon><Plus /></el-icon>
          添加用户
        </el-button>
        <el-button @click="exportUsers">
          <el-icon><Download /></el-icon>
          导出
        </el-button>
      </div>
    </div>

    <!-- 用户表格 -->
    <el-card shadow="hover">
      <el-table
        :data="filteredUsers"
        style="width: 100%"
        v-loading="loading"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="头像" width="80">
          <template #default="{ row }">
            <el-avatar :src="row.avatar" :size="40">
              {{ row.username.charAt(0).toUpperCase() }}
            </el-avatar>
          </template>
        </el-table-column>
        <el-table-column prop="username" label="用户名" min-width="120" />
        <el-table-column prop="email" label="邮箱" min-width="180" />
        <el-table-column prop="phone" label="手机号" width="120" />
        <el-table-column label="角色" width="120">
          <template #default="{ row }">
            <el-tag 
              :type="getRoleTagType(row.role)" 
              size="small"
            >
              {{ getRoleLabel(row.role) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'danger'" size="small">
              {{ row.status === 'active' ? '正常' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="剩余次数" width="120">
          <template #default="{ row }">
            <span :class="{ 'low-usage': (row.remaining_credits || 0) < 10 }">
              {{ row.remaining_credits || 0 }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="注册时间" width="180" />
        <el-table-column prop="lastLoginAt" label="最后登录" width="180" />
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="editUser(row)">
              编辑
            </el-button>
            <el-button 
              :type="row.status === 'active' ? 'warning' : 'success'" 
              size="small" 
              @click="toggleUserStatus(row)"
            >
              {{ row.status === 'active' ? '禁用' : '启用' }}
            </el-button>
            <el-button type="info" size="small" @click="resetPassword(row)">
              重置密码
            </el-button>
            <el-button type="danger" size="small" @click="deleteUser(row)">
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
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 添加/编辑用户对话框 -->
    <el-dialog
      v-model="userDialogVisible"
      :title="isEdit ? '编辑用户' : '添加用户'"
      width="600px"
      @close="resetUserForm"
    >
      <el-form
        ref="userFormRef"
        :model="userForm"
        :rules="userFormRules"
        label-width="80px"
      >
        <el-form-item label="用户名" prop="username">
          <el-input v-model="userForm.username" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="userForm.email" placeholder="请输入邮箱" />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="userForm.phone" placeholder="请输入手机号" />
        </el-form-item>
        <el-form-item label="密码" prop="password" v-if="!isEdit">
          <el-input v-model="userForm.password" type="password" placeholder="请输入密码" />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="userForm.role" placeholder="请选择角色">
            <el-option label="普通用户" value="user" />
            <el-option label="会员用户" value="vip" />
            <el-option label="管理员" value="admin" />
            <el-option label="提示词专家" value="prompt_expert" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="userForm.status" placeholder="请选择状态">
            <el-option label="正常" value="active" />
            <el-option label="禁用" value="disabled" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="userDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="saveUser" :loading="saving">
            {{ isEdit ? '更新' : '添加' }}
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Search,
  Plus,
  Download
} from '@element-plus/icons-vue'
import { userAPI } from '@/api'

// 响应式数据
const loading = ref(false)
const saving = ref(false)
const searchQuery = ref('')
const statusFilter = ref('')
const roleFilter = ref('')
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)
const selectedUsers = ref([])

// 用户列表数据
const users = ref([])

// 用户列表（后端已处理分页和过滤）
const filteredUsers = computed(() => {
  return users.value
})

// 用户表单
const userDialogVisible = ref(false)
const isEdit = ref(false)
const userFormRef = ref()
const userForm = ref({
  id: null,
  username: '',
  email: '',
  phone: '',
  password: '',
  role: 'client',
  status: 'active'
})

// 表单验证规则
const userFormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度在 3 到 20 个字符', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  phone: [
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号格式', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6位', trigger: 'blur' }
  ],
  role: [
    { required: true, message: '请选择角色', trigger: 'change' }
  ],
  status: [
    { required: true, message: '请选择状态', trigger: 'change' }
  ]
}

// 方法
const handleSearch = () => {
  currentPage.value = 1
  loadUsers()
}

// 监听过滤条件变化
const handleFilterChange = () => {
  currentPage.value = 1
  loadUsers()
}

const handleSelectionChange = (selection) => {
  selectedUsers.value = selection
}

const handleSizeChange = (size) => {
  pageSize.value = size
  currentPage.value = 1
  loadUsers()
}

const handleCurrentChange = (page) => {
  currentPage.value = page
  loadUsers()
}

const showAddUserDialog = () => {
  isEdit.value = false
  userDialogVisible.value = true
}

const editUser = (user) => {
  isEdit.value = true
  userForm.value = { ...user }
  userDialogVisible.value = true
}

const resetUserForm = () => {
  userForm.value = {
    id: null,
    username: '',
    email: '',
    phone: '',
    password: '',
    role: 'user',
    status: 'active'
  }
  userFormRef.value?.resetFields()
}

const saveUser = async () => {
  try {
    await userFormRef.value.validate()
    saving.value = true
    
    if (isEdit.value) {
      // 更新用户
      await userAPI.updateUser(userForm.value.id, userForm.value)
      ElMessage.success('用户更新成功')
    } else {
      // 添加用户
      await userAPI.createUser(userForm.value)
      ElMessage.success('用户添加成功')
    }
    
    userDialogVisible.value = false
    await loadUsers()
  } catch (error) {
    ElMessage.error('保存失败：' + error.message)
  } finally {
    saving.value = false
  }
}

const toggleUserStatus = async (user) => {
  try {
    const action = user.status === 'active' ? '禁用' : '启用'
    await ElMessageBox.confirm(`确定要${action}用户 ${user.username} 吗？`, '确认操作')
    
    user.status = user.status === 'active' ? 'disabled' : 'active'
    ElMessage.success(`用户${action}成功`)
  } catch (error) {
    // 用户取消操作
  }
}

const resetPassword = async (user) => {
  try {
    const defaultPassword = `${user.username}123`
    await ElMessageBox.confirm(
      `确定要重置用户 ${user.username} 的密码吗？\n重置后的密码为：${defaultPassword}`, 
      '确认重置密码', 
      {
        type: 'warning',
        confirmButtonText: '确定重置',
        cancelButtonText: '取消'
      }
    )
    
    await userAPI.resetPassword(user.id, user.username)
    ElMessage.success(`密码重置成功！新密码为：${defaultPassword}`)
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('重置密码失败：' + error.message)
    }
  }
}

const deleteUser = async (user) => {
  try {
    await ElMessageBox.confirm(`确定要删除用户 ${user.username} 吗？此操作不可恢复！`, '确认删除', {
      type: 'warning'
    })
    
    await userAPI.deleteUser(user.id)
    ElMessage.success('用户删除成功')
    await loadUsers()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败：' + error.message)
    }
  }
}

const exportUsers = () => {
  ElMessage.info('导出功能开发中')
}

const loadUsers = async () => {
  loading.value = true
  try {
    const params = {
      page: currentPage.value,
      limit: pageSize.value,
      search: searchQuery.value,
      role: roleFilter.value,
      status: statusFilter.value
    }
    
    const response = await userAPI.getUsers(params)
    users.value = response.data.users
    total.value = response.data.pagination.total
    
  } catch (error) {
    ElMessage.error('加载用户列表失败：' + error.message)
  } finally {
    loading.value = false
  }
}

// 获取角色标签类型
const getRoleTagType = (role) => {
  switch (role) {
    case 'admin':
      return 'danger'
    case 'vip':
      return 'warning'
    case 'prompt_expert':
      return 'success'
    case 'user':
    default:
      return 'primary'
  }
}

// 获取角色显示标签
const getRoleLabel = (role) => {
  switch (role) {
    case 'admin':
      return '管理员'
    case 'vip':
      return '会员用户'
    case 'prompt_expert':
      return '提示词专家'
    case 'user':
    default:
      return '普通用户'
  }
}

onMounted(() => {
  loadUsers()
})
</script>

<style scoped>
.user-management {
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
  flex-wrap: wrap;
  gap: 16px;
}

.search-section {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.action-buttons {
  display: flex;
  gap: 12px;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.low-usage {
  color: #f56c6c;
  font-weight: bold;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .action-bar {
    flex-direction: column;
    align-items: stretch;
  }
  
  .search-section {
    justify-content: center;
  }
  
  .action-buttons {
    justify-content: center;
  }
}
</style>