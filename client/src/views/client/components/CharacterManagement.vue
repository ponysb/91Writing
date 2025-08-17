<template>
  <div class="character-management">
    <!-- 操作栏 -->
    <div class="action-bar">
      <el-button type="primary" @click="showCreateDialog">
        <el-icon><Plus /></el-icon>
        新增人物
      </el-button>
      <el-button 
        type="danger" 
        :disabled="selectedCharacters.length === 0"
        @click="handleBatchDelete"
      >
        <el-icon><Delete /></el-icon>
        批量删除
      </el-button>
      <el-button @click="refreshList">
        <el-icon><Refresh /></el-icon>
        刷新
      </el-button>
      
      <div class="search-box">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索人物姓名..."
          clearable
          @input="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
      </div>
    </div>

    <!-- 人物列表 -->
    <el-table
      v-loading="loading"
      :data="characterList"
      @selection-change="handleSelectionChange"
      stripe
      border
    >
      <el-table-column type="selection" width="55" />
      <el-table-column prop="name" label="姓名" width="120" />
      <el-table-column prop="gender" label="性别" width="80">
        <template #default="{ row }">
          <el-tag :type="row.gender === '男' ? 'primary' : 'danger'" size="small">
            {{ row.gender || '未设定' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="age" label="年龄" width="80" />
      <el-table-column prop="occupation" label="职业" width="120" />
      <el-table-column prop="importance_level" label="重要程度" width="100">
        <template #default="{ row }">
          <el-rate
            v-model="row.importance_level"
            :max="10"
            disabled
            show-score
            text-color="#ff9900"
            score-template="{value}"
          />
        </template>
      </el-table-column>
      <el-table-column prop="personality" label="性格特点" show-overflow-tooltip />
      <el-table-column prop="created_at" label="创建时间" width="180">
        <template #default="{ row }">
          {{ formatDate(row.created_at) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="showDetailDialog(row)">
            查看
          </el-button>
          <el-button size="small" type="primary" @click="showEditDialog(row)">
            编辑
          </el-button>
          <el-button size="small" type="danger" @click="handleDelete(row)">
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="pagination-wrapper">
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.limit"
        :total="pagination.total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>

    <!-- 创建/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="600px"
      @close="resetForm"
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="100px"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="姓名" prop="name">
              <el-input v-model="formData.name" placeholder="请输入人物姓名" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="性别" prop="gender">
              <el-select v-model="formData.gender" placeholder="请选择性别">
                <el-option label="男" value="男" />
                <el-option label="女" value="女" />
                <el-option label="其他" value="其他" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="年龄" prop="age">
              <el-input-number
                v-model="formData.age"
                :min="0"
                :max="200"
                placeholder="请输入年龄"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="职业" prop="occupation">
              <el-input v-model="formData.occupation" placeholder="请输入职业" />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item label="重要程度" prop="importance_level">
          <el-rate
            v-model="formData.importance_level"
            :max="10"
            show-score
            text-color="#ff9900"
            score-template="{value}分"
          />
        </el-form-item>
        
        <el-form-item label="外貌描述" prop="appearance">
          <el-input
            v-model="formData.appearance"
            type="textarea"
            :rows="3"
            placeholder="请描述人物外貌特征"
          />
        </el-form-item>
        
        <el-form-item label="性格特点" prop="personality">
          <el-input
            v-model="formData.personality"
            type="textarea"
            :rows="3"
            placeholder="请描述人物性格特点"
          />
        </el-form-item>
        
        <el-form-item label="背景故事" prop="background">
          <el-input
            v-model="formData.background"
            type="textarea"
            :rows="4"
            placeholder="请描述人物背景故事"
          />
        </el-form-item>
        
        <el-form-item label="关系网络" prop="relationships">
          <el-input
            v-model="formData.relationships"
            type="textarea"
            :rows="3"
            placeholder="请描述人物关系网络"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmit" :loading="submitting">
            {{ isEdit ? '更新' : '创建' }}
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="人物详情"
      width="600px"
    >
      <div v-if="currentCharacter" class="character-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="姓名">{{ currentCharacter.name }}</el-descriptions-item>
          <el-descriptions-item label="性别">{{ currentCharacter.gender || '未设定' }}</el-descriptions-item>
          <el-descriptions-item label="年龄">{{ currentCharacter.age || '未设定' }}</el-descriptions-item>
          <el-descriptions-item label="职业">{{ currentCharacter.occupation || '未设定' }}</el-descriptions-item>
          <el-descriptions-item label="重要程度" :span="2">
            <el-rate
              :model-value="currentCharacter.importance_level"
              :max="10"
              disabled
              show-score
              text-color="#ff9900"
              score-template="{value}分"
            />
          </el-descriptions-item>
          <el-descriptions-item label="外貌描述" :span="2">
            {{ currentCharacter.appearance || '暂无描述' }}
          </el-descriptions-item>
          <el-descriptions-item label="性格特点" :span="2">
            {{ currentCharacter.personality || '暂无描述' }}
          </el-descriptions-item>
          <el-descriptions-item label="背景故事" :span="2">
            {{ currentCharacter.background || '暂无描述' }}
          </el-descriptions-item>
          <el-descriptions-item label="关系网络" :span="2">
            {{ currentCharacter.relationships || '暂无描述' }}
          </el-descriptions-item>
          <el-descriptions-item label="创建时间" :span="2">
            {{ formatDate(currentCharacter.created_at) }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Delete, Refresh, Search } from '@element-plus/icons-vue'
import { characterOps, crudUtils } from '@/utils/crudOperations'

const props = defineProps({
  novelId: {
    type: [String, Number],
    required: true
  }
})

// 响应式数据
const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const detailDialogVisible = ref(false)
const isEdit = ref(false)
const characterList = ref([])
const selectedCharacters = ref([])
const currentCharacter = ref(null)
const searchKeyword = ref('')
const formRef = ref()

// 分页数据
const pagination = reactive({
  page: 1,
  limit: 10,
  total: 0
})

// 表单数据
const formData = reactive({
  name: '',
  gender: '',
  age: null,
  occupation: '',
  importance_level: 5,
  appearance: '',
  personality: '',
  background: '',
  relationships: '',
  novel_id: props.novelId
})

// 表单验证规则
const formRules = {
  name: [
    { required: true, message: '请输入人物姓名', trigger: 'blur' },
    { min: 1, max: 50, message: '姓名长度在1到50个字符', trigger: 'blur' }
  ],
  importance_level: [
    { required: true, message: '请设置重要程度', trigger: 'change' }
  ]
}

// 计算属性
const dialogTitle = computed(() => {
  return isEdit.value ? '编辑人物' : '新增人物'
})

// 防抖搜索
const handleSearch = crudUtils.debounce(() => {
  pagination.page = 1
  loadCharacterList()
}, 300)

// 加载人物列表
const loadCharacterList = async () => {
  loading.value = true
  try {
    const params = crudUtils.formatPaginationParams(
      pagination.page,
      pagination.limit,
      {
        novel_id: props.novelId,
        search: searchKeyword.value,
        ...crudUtils.formatSortParams('created_at', 'DESC')
      }
    )
    
    const result = await characterOps.getList(params)
    characterList.value = result.data || []
    pagination.total = result.total || 0
  } catch (error) {
    crudUtils.handleApiError(error, '获取人物列表失败')
  } finally {
    loading.value = false
  }
}

// 显示创建对话框
const showCreateDialog = () => {
  isEdit.value = false
  resetForm()
  dialogVisible.value = true
}

// 显示编辑对话框
const showEditDialog = (character) => {
  isEdit.value = true
  Object.assign(formData, character)
  dialogVisible.value = true
}

// 显示详情对话框
const showDetailDialog = (character) => {
  currentCharacter.value = character
  detailDialogVisible.value = true
}

// 重置表单
const resetForm = () => {
  if (formRef.value) {
    formRef.value.resetFields()
  }
  Object.assign(formData, {
    name: '',
    gender: '',
    age: null,
    occupation: '',
    importance_level: 5,
    appearance: '',
    personality: '',
    background: '',
    relationships: '',
    novel_id: props.novelId
  })
}

// 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    submitting.value = true
    
    if (isEdit.value) {
      await characterOps.update(formData.id, formData, () => {
        dialogVisible.value = false
        loadCharacterList()
      })
    } else {
      await characterOps.createCharacter(formData, () => {
        dialogVisible.value = false
        loadCharacterList()
      })
    }
  } catch (error) {
    console.error('表单验证失败:', error)
  } finally {
    submitting.value = false
  }
}

// 删除人物
const handleDelete = async (character) => {
  await characterOps.delete(character.id, character.name, () => {
    loadCharacterList()
  })
}

// 批量删除
const handleBatchDelete = async () => {
  const ids = selectedCharacters.value.map(item => item.id)
  await characterOps.batchDelete(ids, () => {
    selectedCharacters.value = []
    loadCharacterList()
  })
}

// 选择变化
const handleSelectionChange = (selection) => {
  selectedCharacters.value = selection
}

// 分页变化
const handleSizeChange = (size) => {
  pagination.limit = size
  pagination.page = 1
  loadCharacterList()
}

const handleCurrentChange = (page) => {
  pagination.page = page
  loadCharacterList()
}

// 刷新列表
const refreshList = () => {
  pagination.page = 1
  searchKeyword.value = ''
  loadCharacterList()
}

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleString('zh-CN')
}

// 监听小说ID变化
watch(() => props.novelId, (newId) => {
  if (newId) {
    formData.novel_id = newId
    loadCharacterList()
  }
}, { immediate: true })

// 组件挂载时加载数据
onMounted(() => {
  if (props.novelId) {
    loadCharacterList()
  }
})
</script>

<style scoped>
.character-management {
  padding: 20px;
}

.action-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.search-box {
  margin-left: auto;
  width: 300px;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.character-detail {
  padding: 10px 0;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

@media (max-width: 768px) {
  .action-bar {
    flex-direction: column;
    align-items: stretch;
  }
  
  .search-box {
    margin-left: 0;
    width: 100%;
  }
}
</style>