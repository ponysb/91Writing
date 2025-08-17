<template>
  <div class="activation-code-management">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title">激活码管理</h1>
      <p class="page-desc">管理系统中的激活码生成、使用和追踪</p>
    </div>

    <!-- 操作栏 -->
    <div class="action-bar">
      <div class="search-section">
        <el-input
          v-model="searchQuery"
          placeholder="搜索激活码、批次ID或备注"
          style="width: 300px; margin-right: 16px;"
          clearable
          @keyup.enter="handleSearch"
          @clear="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-select 
          v-model="statusFilter" 
          placeholder="状态筛选" 
          style="width: 120px; margin-right: 16px;" 
          clearable
          @change="handleSearch"
        >
          <el-option label="全部" value="" />
          <el-option label="未使用" value="unused" />
          <el-option label="已使用" value="used" />
          <el-option label="已过期" value="expired" />
        </el-select>
        <el-select 
          v-model="packageFilter" 
          placeholder="套餐筛选" 
          style="width: 150px; margin-right: 16px;" 
          clearable
          @change="handleSearch"
        >
          <el-option label="全部套餐" value="" />
          <el-option 
            v-for="pkg in packages" 
            :key="pkg.id" 
            :label="pkg.name" 
            :value="pkg.id" 
          />
        </el-select>
        <el-select 
          v-model="batchFilter" 
          placeholder="批次筛选" 
          style="width: 150px; margin-right: 16px;" 
          clearable
          @change="handleSearch"
        >
          <el-option label="全部批次" value="" />
          <el-option 
            v-for="batch in batches" 
            :key="batch.id" 
            :label="`批次 ${batch.id}`" 
            :value="batch.id" 
          />
        </el-select>
      </div>
      <div class="action-buttons">
        <el-button type="primary" @click="showGenerateDialog">
          <el-icon><Plus /></el-icon>
          生成激活码
        </el-button>
        <el-button 
          @click="exportSelectedCodes" 
          :disabled="selectedCodes.length === 0"
        >
          <el-icon><Download /></el-icon>
          导出选中 ({{ selectedCodes.length }})
        </el-button>
        <el-button @click="handleRefresh">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-cards">
      <el-card class="stat-card">
        <div class="stat-content">
          <div class="stat-number">{{ totalCodes }}</div>
          <div class="stat-label">总激活码数</div>
        </div>
      </el-card>

      <el-card class="stat-card">
        <div class="stat-content">
          <div class="stat-number">{{ unusedCodes }}</div>
          <div class="stat-label">未使用</div>
        </div>
      </el-card>

      <el-card class="stat-card">
        <div class="stat-content">
          <div class="stat-number">{{ usedCodes }}</div>
          <div class="stat-label">已使用</div>
        </div>
      </el-card>
      
      <el-card class="stat-card">
        <div class="stat-content">
          <div class="stat-number">{{ expiredCodes }}</div>
          <div class="stat-label">已过期</div>
        </div>
      </el-card>
      
      <el-card class="stat-card">
        <div class="stat-content">
          <div class="stat-number">{{ totalBatches }}</div>
          <div class="stat-label">总批次数</div>
        </div>
      </el-card>
    </div>

    <!-- 激活码表格 -->
    <el-card shadow="hover">
      <el-table 
        :data="activationCodes" 
        style="width: 100%" 
        v-loading="loading"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="code" label="激活码" min-width="200">
          <template #default="{ row }">
            <span class="activation-code">{{ row.code }}</span>
            <el-button type="text" size="small" @click="copyCode(row.code)">
              <el-icon><CopyDocument /></el-icon>
            </el-button>
          </template>
        </el-table-column>
        <el-table-column prop="package" label="关联套餐" min-width="150">
          <template #default="{ row }">
            <div v-if="row.package">
              <div class="package-name">{{ row.package.name }}</div>
              <div class="package-info">{{ row.package.credits }}积分 / {{ row.package.validity_days }}天</div>
            </div>
            <span v-else class="text-muted">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="batch_id" label="批次ID" min-width="180">
          <template #default="{ row }">
            <el-tag type="info" size="small">{{ row.batch_id }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)" size="small">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="user" label="使用者" min-width="120">
          <template #default="{ row }">
            <div v-if="row.user">
              <div>{{ row.user.username }}</div>
              <div class="text-muted small">{{ row.user.email }}</div>
            </div>
            <span v-else class="text-muted">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="used_at" label="使用时间" width="180">
          <template #default="{ row }">
            <span v-if="row.used_at">{{ formatDateTime(row.used_at) }}</span>
            <span v-else class="text-muted">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="expires_at" label="过期时间" width="180">
          <template #default="{ row }">
            <span v-if="row.expires_at">{{ formatDateTime(row.expires_at) }}</span>
            <span v-else class="text-muted">永不过期</span>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button type="primary" size="small" @click="viewCode(row)">详情</el-button>
              <el-button 
                v-if="row.status === 'unused'"
                type="warning" 
                size="small" 
                @click="disableCode(row.id)"
              >
                禁用
              </el-button>
              <el-button type="danger" size="small" @click="deleteCode(row)">删除</el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
      
      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
        />
      </div>
    </el-card>

    <!-- 生成激活码对话框 -->
    <el-dialog v-model="generateDialogVisible" title="生成激活码" width="600px">
      <el-form ref="generateFormRef" :model="generateForm" :rules="generateRules" label-width="100px">
        <el-form-item label="关联套餐" prop="package_id">
          <el-select v-model="generateForm.package_id" placeholder="请选择套餐" style="width: 100%">
            <el-option 
              v-for="pkg in packages" 
              :key="pkg.id" 
              :label="`${pkg.name} (${pkg.credits}积分/${pkg.validity_days}天)`" 
              :value="pkg.id" 
            />
          </el-select>
        </el-form-item>
        <el-form-item label="生成数量" prop="quantity">
          <el-input-number 
            v-model="generateForm.quantity" 
            :min="1" 
            :max="1000" 
            style="width: 100%" 
            placeholder="请输入生成数量"
          />
          <div class="form-tip">单次最多生成1000个激活码</div>
        </el-form-item>
        <el-form-item label="过期时间" prop="expires_at">
          <el-date-picker
            v-model="generateForm.expires_at"
            type="datetime"
            placeholder="选择过期时间"
            style="width: 100%"
            format="YYYY-MM-DD HH:mm:ss"
            value-format="YYYY-MM-DD HH:mm:ss"
          />
          <div class="form-tip">不设置则永不过期</div>
        </el-form-item>
        <el-form-item label="备注信息" prop="notes">
          <el-input 
            v-model="generateForm.notes" 
            type="textarea" 
            :rows="3" 
            placeholder="请输入备注信息，如活动名称、用途等" 
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="generateDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="generateCodes" :loading="generating">
          生成激活码
        </el-button>
        <el-button type="success" @click="generateAndExportCodes" :loading="generating">
          生成并导出
        </el-button>
      </template>
    </el-dialog>

    <!-- 激活码详情对话框 -->
    <el-dialog v-model="detailDialogVisible" title="激活码详情" width="600px">
      <div v-if="selectedCode">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="激活码">
            <el-tag size="large" style="font-family: monospace;">{{ selectedCode.code }}</el-tag>
            <el-button 
              type="text" 
              size="small" 
              @click="copyCode(selectedCode.code)"
              style="margin-left: 8px;"
            >
              复制
            </el-button>
          </el-descriptions-item>
          <el-descriptions-item label="关联套餐">
            <div v-if="selectedCode.package">
              <div><strong>{{ selectedCode.package.name }}</strong></div>
              <div class="text-gray-500">{{ selectedCode.package.credits }}积分 / {{ selectedCode.package.validity_days }}天</div>
            </div>
            <span v-else class="text-gray-400">套餐已删除</span>
          </el-descriptions-item>
          <el-descriptions-item label="批次ID">
            <el-tag type="info">{{ selectedCode.batch_id }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusTagType(selectedCode.status)">{{ getStatusLabel(selectedCode.status) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="使用用户" v-if="selectedCode.user">
            <div>
              <div><strong>{{ selectedCode.user.username }}</strong></div>
              <div class="text-gray-500">{{ selectedCode.user.email }}</div>
            </div>
          </el-descriptions-item>
          <el-descriptions-item label="使用时间" v-if="selectedCode.used_at">
            {{ formatDateTime(selectedCode.used_at) }}
          </el-descriptions-item>
          <el-descriptions-item label="过期时间">
            {{ selectedCode.expires_at ? formatDateTime(selectedCode.expires_at) : '永不过期' }}
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">
            {{ formatDateTime(selectedCode.created_at) }}
          </el-descriptions-item>
          <el-descriptions-item label="备注信息" v-if="selectedCode.notes">
            {{ selectedCode.notes }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
      <template #footer>
        <el-button @click="detailDialogVisible = false">关闭</el-button>
        <el-button 
          v-if="selectedCode && selectedCode.status === 'unused'"
          type="danger"
          @click="disableCode(selectedCode.id)"
        >
          禁用激活码
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus, Download, Refresh, CopyDocument } from '@element-plus/icons-vue'
import { activationCodeAPI, membershipAPI, packageAPI } from '@/api'

// 响应式数据
const loading = ref(false)
const generating = ref(false)
const searchQuery = ref('')
const statusFilter = ref('')
const packageFilter = ref('')
const batchFilter = ref('')
const currentPage = ref(1)
const pageSize = ref(20)
const generateDialogVisible = ref(false)
const detailDialogVisible = ref(false)
const generateFormRef = ref()
const selectedCode = ref(null)
const selectedCodes = ref([])

// 数据列表
const activationCodes = ref([])
const packages = ref([])
const batches = ref([])
const statistics = ref({
  total: 0,
  unused: 0,
  used: 0,
  expired: 0,
  total_batches: 0
})
const pagination = ref({
  total: 0,
  current_page: 1,
  per_page: 20
})

// 生成表单
const generateForm = ref({
  package_id: '',
  quantity: 10,
  expires_at: '',
  notes: ''
})

// 表单验证规则
const generateRules = {
  package_id: [{ required: true, message: '请选择关联套餐', trigger: 'change' }],
  quantity: [{ required: true, message: '请输入生成数量', trigger: 'blur' }]
}

// 计算属性
const paginatedCodes = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return activationCodes.value.slice(start, end)
})

// 统计数据计算属性
const totalCodes = computed(() => statistics.value.total || 0)
const unusedCodes = computed(() => statistics.value.unused || 0)
const usedCodes = computed(() => statistics.value.used || 0)
const expiredCodes = computed(() => statistics.value.expired || 0)
const totalBatches = computed(() => statistics.value.total_batches || 0)

// 状态选项
const statusOptions = [
  { label: '全部状态', value: '' },
  { label: '未使用', value: 'unused' },
  { label: '已使用', value: 'used' },
  { label: '已过期', value: 'expired' }
]

// 工具方法
const getStatusLabel = (status) => {
  const labels = {
    unused: '未使用',
    used: '已使用',
    expired: '已过期'
  }
  return labels[status] || status
}

const getStatusTagType = (status) => {
  const types = {
    unused: 'success',
    used: 'info',
    expired: 'danger'
  }
  return types[status] || ''
}

const formatDateTime = (dateTime) => {
  if (!dateTime) return '-'
  return new Date(dateTime).toLocaleString('zh-CN')
}

const copyCode = async (code) => {
  try {
    await navigator.clipboard.writeText(code)
    ElMessage.success('激活码已复制到剪贴板')
  } catch (error) {
    ElMessage.error('复制失败')
  }
}

// 处理表格选择变化
const handleSelectionChange = (selection) => {
  selectedCodes.value = selection
}

// 导出选中的激活码
const exportSelectedCodes = () => {
  if (selectedCodes.value.length === 0) {
    ElMessage.warning('请先选择要导出的激活码')
    return
  }
  
  exportCodesAsText(selectedCodes.value)
}

// 本地生成并下载txt文件
const exportCodesAsText = (codes) => {
  const content = codes.map(code => `激活码: ${code.code}`).join('\n')
  
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `activation_codes_${new Date().toISOString().split('T')[0]}.txt`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
  
  ElMessage.success(`成功导出 ${codes.length} 个激活码`)
}

// 对话框操作
const showGenerateDialog = () => {
  generateForm.value = {
    package_id: '',
    quantity: 10,
    expires_at: '',
    notes: ''
  }
  generateDialogVisible.value = true
}

const generateCodes = async () => {
  try {
    await generateFormRef.value.validate()
    generating.value = true
    
    const response = await activationCodeAPI.generate(generateForm.value)
    
    ElMessage.success(`成功生成 ${response.data.quantity} 个激活码`)
    generateDialogVisible.value = false
    
    // 重新加载数据
    await loadActivationCodes()
    await loadStatistics()
  } catch (error) {
    ElMessage.error('生成失败：' + (error.response?.data?.message || error.message))
  } finally {
    generating.value = false
  }
}

// 生成并导出激活码
const generateAndExportCodes = async () => {
  try {
    await generateFormRef.value.validate()
    generating.value = true
    
    const response = await activationCodeAPI.generate(generateForm.value)
    
    // 如果后端返回了生成的激活码数据，直接导出
    if (response.data.codes && response.data.codes.length > 0) {
      exportCodesAsText(response.data.codes)
      ElMessage.success(`成功生成并导出 ${response.data.codes.length} 个激活码`)
    } else {
      ElMessage.success(`成功生成 ${response.data.quantity} 个激活码，请手动选择导出`)
    }
    
    generateDialogVisible.value = false
    
    // 重新加载数据
    await loadActivationCodes()
    await loadStatistics()
  } catch (error) {
    ElMessage.error('生成失败：' + (error.response?.data?.message || error.message))
  } finally {
    generating.value = false
  }
}

const viewCode = (code) => {
  selectedCode.value = code
  detailDialogVisible.value = true
}

const disableCode = async (codeId) => {
  try {
    await ElMessageBox.confirm('确定要禁用这个激活码吗？', '确认操作')
    
    await activationCodeAPI.disable(codeId)
    ElMessage.success('激活码已禁用')
    
    // 重新加载数据
    await loadActivationCodes()
    await loadStatistics()
    detailDialogVisible.value = false
  } catch (error) {
    if (error.response) {
      ElMessage.error('禁用失败：' + (error.response.data?.message || error.message))
    }
  }
}

const deleteCode = async (code) => {
  try {
    await ElMessageBox.confirm(`确定要删除激活码「${code.code}」吗？`, '确认删除', { type: 'warning' })
    
    await activationCodeAPI.delete(code.id)
    ElMessage.success('激活码删除成功')
    
    // 重新加载数据
    await loadActivationCodes()
    await loadStatistics()
  } catch (error) {
    if (error.response) {
      ElMessage.error('删除失败：' + (error.response.data?.message || error.message))
    }
  }
}

const exportCodes = async () => {
  try {
    const params = {
      search: searchQuery.value,
      status: statusFilter.value,
      package_id: packageFilter.value,
      batch_id: batchFilter.value
    }
    
    const response = await activationCodeAPI.export(params)
    
    // 创建下载链接
    const blob = new Blob([response.data], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `activation_codes_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    window.URL.revokeObjectURL(url)
    
    ElMessage.success('激活码导出成功')
  } catch (error) {
    ElMessage.error('导出失败：' + (error.response?.data?.message || error.message))
  }
}

// 数据加载方法
const loadActivationCodes = async () => {
  try {
    loading.value = true
    const params = {
      page: currentPage.value,
      per_page: pageSize.value,
      search: searchQuery.value,
      status: statusFilter.value,
      package_id: packageFilter.value,
      batch_id: batchFilter.value
    }
    
    const response = await activationCodeAPI.list(params)
    activationCodes.value = response.data.codes || []
    pagination.value = {
      total: response.data.pagination?.total || 0,
      current_page: response.data.pagination?.page || 1,
      per_page: response.data.pagination?.limit || 20
    }
    
    // 更新统计数据
    if (response.data.statistics) {
      statistics.value = {
        total: response.data.statistics.total || 0,
        unused: (response.data.statistics.total || 0) - (response.data.statistics.used || 0) - (response.data.statistics.expired || 0),
        used: response.data.statistics.used || 0,
        expired: response.data.statistics.expired || 0,
        total_batches: response.data.statistics.batches || 0
      }
    }
  } catch (error) {
    ElMessage.error('加载激活码列表失败：' + (error.response?.data?.message || error.message))
  } finally {
    loading.value = false
  }
}

const loadStatistics = async () => {
  try {
    // 统计数据现在从激活码列表接口的statistics字段获取
    // 不需要单独调用统计接口，数据在loadActivationCodes中已更新
    console.log('统计数据已从激活码列表接口获取')
  } catch (error) {
    console.error('加载统计数据失败：', error)
  }
}

const loadPackages = async () => {
  try {
    const response = await packageAPI.getPackages({ status: 'active' })
    packages.value = response.data.packages || []
  } catch (error) {
    console.error('加载套餐列表失败：', error)
    ElMessage.error('加载套餐列表失败')
  }
}

const loadBatches = async () => {
  try {
    const response = await activationCodeAPI.getBatches()
    // 根据API文档，批次数据直接在data字段中
    batches.value = response.data || []
  } catch (error) {
    console.error('加载批次列表失败：', error)
  }
}

// 分页处理
const handlePageChange = (page) => {
  currentPage.value = page
  loadActivationCodes()
}

const handleSizeChange = (size) => {
  pageSize.value = size
  currentPage.value = 1
  loadActivationCodes()
}

// 搜索和筛选
const handleSearch = () => {
  currentPage.value = 1
  loadActivationCodes()
}

const handleRefresh = () => {
  searchQuery.value = ''
  statusFilter.value = ''
  packageFilter.value = ''
  batchFilter.value = ''
  currentPage.value = 1
  loadActivationCodes()
  loadStatistics()
}

// 生命周期
onMounted(async () => {
  await Promise.all([
    loadActivationCodes(),
    loadStatistics(),
    loadPackages(),
    loadBatches()
  ])
})
</script>

<style scoped>
.card-management {
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

.stats-cards {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
}

.stat-card {
  flex: 1;
  text-align: center;
}

.stat-content {
  padding: 20px;
}

.stat-number {
  font-size: 32px;
  font-weight: 600;
  color: #409eff;
  margin-bottom: 8px;
}

.stat-label {
  color: #666;
  font-size: 14px;
}

.card-code {
  font-family: monospace;
  font-weight: 600;
  color: #409eff;
}

.value {
  font-weight: 600;
  color: #e74c3c;
}

.text-muted {
  color: #999;
}

.pagination-wrapper {
  margin-top: 20px;
  text-align: center;
}

.card-detail {
  padding: 20px 0;
}

.detail-item {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.detail-item label {
  width: 80px;
  font-weight: 600;
  color: #333;
}

.detail-item span {
  flex: 1;
}

.action-buttons {
  display: flex;
  gap: 4px;
  align-items: center;
  flex-wrap: nowrap;
  justify-content: flex-start;
}

.action-buttons .el-button {
  min-width: auto;
  padding: 5px 8px;
  font-size: 12px;
}

.form-tip {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.text-gray-500 {
  color: #6b7280;
}

.text-gray-400 {
  color: #9ca3af;
}

.activation-code {
  font-family: 'Courier New', monospace;
  font-weight: 600;
  color: #409eff;
  background: #f0f9ff;
  padding: 2px 6px;
  border-radius: 4px;
}
</style>