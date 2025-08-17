<template>
  <div class="worldview-management">
    <!-- 操作栏 -->
    <div class="action-bar">
      <el-button type="primary" @click="showCreateDialog">
        <el-icon><Plus /></el-icon>
        新增世界观
      </el-button>
      <el-button type="success" @click="showBatchInsertDialog">
        <el-icon><Upload /></el-icon>
        批量插入
      </el-button>
      <el-button 
        type="danger" 
        :disabled="selectedWorldviews.length === 0"
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
          placeholder="搜索世界观名称..."
          clearable
          @input="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
      </div>
    </div>

    <!-- 世界观列表 -->
    <el-table
      v-loading="loading"
      :data="worldviewList"
      @selection-change="handleSelectionChange"
      stripe
      border
    >
      <el-table-column type="selection" width="55" />
      <el-table-column prop="name" label="名称" width="150" />
      <el-table-column prop="type" label="类型" width="120">
        <template #default="{ row }">
          <el-tag :type="getTypeTagType(row.type)" size="small">
            {{ row.type || '未分类' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="complexity_level" label="复杂程度" width="120">
        <template #default="{ row }">
          <el-rate
            v-model="row.complexity_level"
            :max="10"
            disabled
            show-score
            text-color="#ff9900"
            score-template="{value}"
          />
        </template>
      </el-table-column>
      <el-table-column prop="completeness_level" label="完整度" width="100">
        <template #default="{ row }">
          <el-progress
            :percentage="row.completeness_level || 0"
            :stroke-width="8"
            :show-text="true"
          />
        </template>
      </el-table-column>
      <el-table-column prop="description" label="描述" show-overflow-tooltip />
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
      width="700px"
      @close="resetForm"
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="120px"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="名称" prop="name">
              <el-input v-model="formData.name" placeholder="请输入世界观名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="类型" prop="type">
              <el-select v-model="formData.type" placeholder="请选择世界观类型">
                <el-option label="现代都市" value="现代都市" />
                <el-option label="古代历史" value="古代历史" />
                <el-option label="奇幻魔法" value="奇幻魔法" />
                <el-option label="科幻未来" value="科幻未来" />
                <el-option label="武侠江湖" value="武侠江湖" />
                <el-option label="仙侠修真" value="仙侠修真" />
                <el-option label="末世废土" value="末世废土" />
                <el-option label="异世大陆" value="异世大陆" />
                <el-option label="其他" value="其他" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="复杂程度" prop="complexity_level">
              <el-rate
                v-model="formData.complexity_level"
                :max="10"
                show-score
                text-color="#ff9900"
                score-template="{value}分"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="完整度" prop="completeness_level">
              <el-slider
                v-model="formData.completeness_level"
                :min="0"
                :max="100"
                show-input
                :format-tooltip="val => `${val}%`"
              />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item label="简要描述" prop="description">
          <el-input
            v-model="formData.description"
            type="textarea"
            :rows="3"
            placeholder="请简要描述世界观"
          />
        </el-form-item>
        
        <el-form-item label="地理环境" prop="geography">
          <el-input
            v-model="formData.geography"
            type="textarea"
            :rows="4"
            placeholder="请描述地理环境、地形地貌等"
          />
        </el-form-item>
        
        <el-form-item label="历史背景" prop="history">
          <el-input
            v-model="formData.history"
            type="textarea"
            :rows="4"
            placeholder="请描述历史背景、重要事件等"
          />
        </el-form-item>
        
        <el-form-item label="社会制度" prop="social_system">
          <el-input
            v-model="formData.social_system"
            type="textarea"
            :rows="3"
            placeholder="请描述社会制度、政治体系等"
          />
        </el-form-item>
        
        <el-form-item label="文化特色" prop="culture">
          <el-input
            v-model="formData.culture"
            type="textarea"
            :rows="3"
            placeholder="请描述文化特色、风俗习惯等"
          />
        </el-form-item>
        
        <el-form-item label="技术水平" prop="technology">
          <el-input
            v-model="formData.technology"
            type="textarea"
            :rows="3"
            placeholder="请描述技术水平、科技发展等"
          />
        </el-form-item>
        
        <el-form-item label="魔法/超能力" prop="magic_system">
          <el-input
            v-model="formData.magic_system"
            type="textarea"
            :rows="3"
            placeholder="请描述魔法体系或超能力设定（如有）"
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
      title="世界观详情"
      width="800px"
    >
      <div v-if="currentWorldview" class="worldview-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="名称">{{ currentWorldview.name }}</el-descriptions-item>
          <el-descriptions-item label="类型">
            <el-tag :type="getTypeTagType(currentWorldview.type)" size="small">
              {{ currentWorldview.type || '未分类' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="复杂程度">
            <el-rate
              :model-value="currentWorldview.complexity_level"
              :max="10"
              disabled
              show-score
              text-color="#ff9900"
              score-template="{value}分"
            />
          </el-descriptions-item>
          <el-descriptions-item label="完整度">
            <el-progress
              :percentage="currentWorldview.completeness_level || 0"
              :stroke-width="8"
              :show-text="true"
            />
          </el-descriptions-item>
          <el-descriptions-item label="简要描述" :span="2">
            <div class="detail-content">{{ currentWorldview.description || '暂无描述' }}</div>
          </el-descriptions-item>
          <el-descriptions-item label="地理环境" :span="2">
            <div class="detail-content">{{ currentWorldview.geography || '暂无描述' }}</div>
          </el-descriptions-item>
          <el-descriptions-item label="气候设定" :span="2">
            <div class="detail-content">{{ currentWorldview.climate || '暂无描述' }}</div>
          </el-descriptions-item>
          <el-descriptions-item label="历史背景" :span="2">
            <div class="detail-content">{{ currentWorldview.history || '暂无描述' }}</div>
          </el-descriptions-item>
          <el-descriptions-item label="文化特色" :span="2">
            <div class="detail-content">{{ currentWorldview.culture || '暂无描述' }}</div>
          </el-descriptions-item>
          <el-descriptions-item label="社会结构" :span="2">
            <div class="detail-content">{{ currentWorldview.society || '暂无描述' }}</div>
          </el-descriptions-item>
          <el-descriptions-item label="政治体系" :span="2">
            <div class="detail-content">{{ currentWorldview.politics || '暂无描述' }}</div>
          </el-descriptions-item>
          <el-descriptions-item label="经济体系" :span="2">
            <div class="detail-content">{{ currentWorldview.economy || '暂无描述' }}</div>
          </el-descriptions-item>
          <el-descriptions-item label="技术水平" :span="2">
            <div class="detail-content">{{ currentWorldview.technology || '暂无描述' }}</div>
          </el-descriptions-item>
          <el-descriptions-item label="魔法体系" :span="2">
            <div class="detail-content">{{ currentWorldview.magic_system || '暂无描述' }}</div>
          </el-descriptions-item>
          <el-descriptions-item label="力量体系" :span="2">
            <div class="detail-content">{{ currentWorldview.power_system || '暂无描述' }}</div>
          </el-descriptions-item>
          <el-descriptions-item label="种族设定" :span="2">
            <div class="detail-content">
              <template v-if="currentWorldview.races && currentWorldview.races.length > 0">
                <el-tag v-for="race in currentWorldview.races" :key="race" size="small" style="margin-right: 8px; margin-bottom: 4px;">{{ race }}</el-tag>
              </template>
              <span v-else>暂无设定</span>
            </div>
          </el-descriptions-item>
          <el-descriptions-item label="重要组织" :span="2">
            <div class="detail-content">
              <template v-if="currentWorldview.organizations && currentWorldview.organizations.length > 0">
                <div v-for="org in currentWorldview.organizations" :key="org.name" class="organization-item">
                  <strong>{{ org.name }}</strong> ({{ org.type }})<br>
                  <span class="org-description">{{ org.description }}</span><br>
                  <small class="org-influence">影响力：{{ org.influence }}</small>
                </div>
              </template>
              <span v-else>暂无设定</span>
            </div>
          </el-descriptions-item>
          <el-descriptions-item label="重要地点" :span="2">
            <div class="detail-content">
              <template v-if="currentWorldview.locations && currentWorldview.locations.length > 0">
                <div v-for="location in currentWorldview.locations" :key="location.name" class="location-item">
                  <strong>{{ location.name }}</strong> ({{ location.type }})<br>
                  <span class="location-description">{{ location.description }}</span><br>
                  <small class="location-importance">重要性：{{ location.importance }}</small>
                </div>
              </template>
              <span v-else>暂无设定</span>
            </div>
          </el-descriptions-item>
          <el-descriptions-item label="语言设定" :span="2">
            <div class="detail-content">
              <template v-if="currentWorldview.languages && currentWorldview.languages.length > 0">
                <div v-for="lang in currentWorldview.languages" :key="lang.name" class="language-item">
                  <strong>{{ lang.name }}</strong><br>
                  <span class="lang-speakers">使用者：{{ lang.speakers }}</span><br>
                  <small class="lang-characteristics">特征：{{ lang.characteristics }}</small>
                </div>
              </template>
              <span v-else>暂无设定</span>
            </div>
          </el-descriptions-item>
          <el-descriptions-item label="宗教信仰" :span="2">
            <div class="detail-content">
              <template v-if="currentWorldview.religions && currentWorldview.religions.length > 0">
                <div v-for="religion in currentWorldview.religions" :key="religion.name" class="religion-item">
                  <strong>{{ religion.name }}</strong><br>
                  <span class="religion-beliefs">信仰：{{ religion.beliefs }}</span><br>
                  <span class="religion-practices">仪式：{{ religion.practices }}</span><br>
                  <small class="religion-influence">影响：{{ religion.influence }}</small>
                </div>
              </template>
              <span v-else>暂无设定</span>
            </div>
          </el-descriptions-item>
          <el-descriptions-item label="法律制度" :span="2">
            <div class="detail-content">
              <template v-if="currentWorldview.laws && currentWorldview.laws.length > 0">
                <div v-for="law in currentWorldview.laws" :key="law.category" class="law-item">
                  <strong>{{ law.category }}</strong><br>
                  <span class="law-description">{{ law.description }}</span><br>
                  <small class="law-enforcement">执行：{{ law.enforcement }}</small>
                </div>
              </template>
              <span v-else>暂无设定</span>
            </div>
          </el-descriptions-item>
          <el-descriptions-item label="特殊元素" :span="2">
            <div class="detail-content">
              <template v-if="currentWorldview.special_elements && currentWorldview.special_elements.length > 0">
                <div v-for="element in currentWorldview.special_elements" :key="element.name" class="element-item">
                  <strong>{{ element.name }}</strong> ({{ element.type }})<br>
                  <span class="element-description">{{ element.description }}</span><br>
                  <small class="element-effects">效果：{{ element.effects }}</small>
                </div>
              </template>
              <span v-else>暂无设定</span>
            </div>
          </el-descriptions-item>
          <el-descriptions-item label="时间线" :span="2">
            <div class="detail-content">
              <template v-if="currentWorldview.timeline && currentWorldview.timeline.length > 0">
                <div v-for="period in currentWorldview.timeline" :key="period.period" class="timeline-item">
                  <strong>{{ period.period }}</strong> ({{ period.start_year }} - {{ period.end_year }})<br>
                  <span class="timeline-events">主要事件：{{ period.major_events }}</span><br>
                  <small class="timeline-characteristics">特征：{{ period.characteristics }}</small>
                </div>
              </template>
              <span v-else>暂无设定</span>
            </div>
          </el-descriptions-item>
          <el-descriptions-item label="主要冲突" :span="2">
            <div class="detail-content">
              <template v-if="currentWorldview.conflicts && currentWorldview.conflicts.length > 0">
                <div v-for="conflict in currentWorldview.conflicts" :key="conflict.name" class="conflict-item">
                  <strong>{{ conflict.name }}</strong> ({{ conflict.type }})<br>
                  <span class="conflict-parties">参与方：{{ conflict.parties }}</span><br>
                  <span class="conflict-cause">原因：{{ conflict.cause }}</span><br>
                  <small class="conflict-status">状态：{{ conflict.status }}</small>
                </div>
              </template>
              <span v-else>暂无设定</span>
            </div>
          </el-descriptions-item>
          <el-descriptions-item label="主题元素" :span="2">
            <div class="detail-content">
              <template v-if="currentWorldview.themes && currentWorldview.themes.length > 0">
                <el-tag v-for="theme in currentWorldview.themes" :key="theme" size="small" type="info" style="margin-right: 8px; margin-bottom: 4px;">{{ theme }}</el-tag>
              </template>
              <span v-else>暂无设定</span>
            </div>
          </el-descriptions-item>
          <el-descriptions-item label="灵感来源" :span="2">
            <div class="detail-content">
              <template v-if="currentWorldview.inspiration_sources && currentWorldview.inspiration_sources.length > 0">
                <el-tag v-for="source in currentWorldview.inspiration_sources" :key="source" size="small" type="warning" style="margin-right: 8px; margin-bottom: 4px;">{{ source }}</el-tag>
              </template>
              <span v-else>暂无设定</span>
            </div>
          </el-descriptions-item>
          <el-descriptions-item label="视觉风格" :span="2">
            <div class="detail-content">{{ currentWorldview.visual_style || '暂无描述' }}</div>
          </el-descriptions-item>
          <el-descriptions-item label="情感基调" :span="2">
            <div class="detail-content">{{ currentWorldview.emotional_tone || '暂无描述' }}</div>
          </el-descriptions-item>
          <el-descriptions-item label="标签" :span="2">
            <div class="detail-content">
              <template v-if="currentWorldview.tags && currentWorldview.tags.length > 0">
                <el-tag v-for="tag in currentWorldview.tags" :key="tag" size="small" type="success" style="margin-right: 8px; margin-bottom: 4px;">{{ tag }}</el-tag>
              </template>
              <span v-else>暂无标签</span>
            </div>
          </el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">
            <div class="detail-content">{{ currentWorldview.notes || '暂无备注' }}</div>
          </el-descriptions-item>
          <el-descriptions-item label="创建时间" :span="2">
            {{ formatDate(currentWorldview.created_at) }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>

    <!-- 批量插入对话框 -->
    <el-dialog
      v-model="batchInsertDialogVisible"
      title="批量插入世界观"
      width="900px"
      @close="resetBatchInsertForm"
    >
      <div class="batch-insert-container">
        <el-alert
          title="批量插入说明"
          type="info"
          :closable="false"
          show-icon
        >
          <template #default>
            <p>• 请在下方文本框中输入JSON格式的世界观数据</p>
            <p>• 支持单个对象或对象数组格式</p>
            <p>• 单次最多插入20个世界观</p>
            <p>• 必填字段：name（名称）</p>
            <p>• 可参考右侧示例格式</p>
          </template>
        </el-alert>
        
        <el-row :gutter="20" style="margin-top: 20px;">
          <el-col :span="14">
            <el-form-item label="JSON数据" label-width="80px">
              <el-input
                v-model="batchInsertData"
                type="textarea"
                :rows="20"
                placeholder="请输入JSON格式的世界观数据..."
                style="font-family: 'Courier New', monospace;"
              />
            </el-form-item>
            
            <div class="batch-actions">
              <el-button @click="validateBatchData">验证数据</el-button>
              <el-button @click="formatBatchData">格式化</el-button>
              <el-button @click="clearBatchData">清空</el-button>
              <el-button type="primary" @click="loadExample">加载示例</el-button>
            </div>
          </el-col>
          
          <el-col :span="10">
            <div class="example-container">
              <h4>示例格式：</h4>
              <pre class="example-code">{
  "name": "中土世界",
  "description": "托尔金创造的奇幻世界",
  "type": "奇幻魔法",
  "geography": "包含夏尔、刚铎、魔多等地区",
  "climate": "温带大陆性气候",
  "history": "从创世纪到第四纪的完整历史",
  "culture": "多种族文化并存",
  "society": "封建制度与部落制并存",
  "politics": "王国制度",
  "economy": "农业和手工业为主",
  "technology": "中世纪科技水平",
  "magic_system": "基于戒指和法师的魔法体系",
  "power_system": "魔法师等级制度",
  "complexity_level": 9,
  "completeness_level": 85,
  "visual_style": "史诗奇幻",
  "emotional_tone": "英雄主义",
  "races": ["人类", "精灵", "矮人", "霍比特人"],
  "themes": ["善恶对立", "友谊", "牺牲"],
  "tags": ["经典", "奇幻", "史诗"]
}</pre>
            </div>
          </el-col>
        </el-row>
        
        <div v-if="validationResult" class="validation-result">
          <el-alert
            :title="validationResult.success ? '数据验证通过' : '数据验证失败'"
            :type="validationResult.success ? 'success' : 'error'"
            :closable="false"
            show-icon
          >
            <template #default>
              <div v-if="validationResult.success">
                <p>检测到 {{ validationResult.count }} 个有效的世界观数据</p>
              </div>
              <div v-else>
                <p v-for="error in validationResult.errors" :key="error">{{ error }}</p>
              </div>
            </template>
          </el-alert>
        </div>
      </div>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="batchInsertDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleBatchInsert" :loading="batchInserting">
            批量插入
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Delete, Refresh, Search, Upload } from '@element-plus/icons-vue'
import { worldviewOps, crudUtils } from '@/utils/crudOperations'
import { worldviewAPI } from '@/api'

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
const batchInsertDialogVisible = ref(false)
const isEdit = ref(false)
const worldviewList = ref([])
const selectedWorldviews = ref([])
const currentWorldview = ref(null)
const searchKeyword = ref('')
const formRef = ref()
const batchInsertData = ref('')
const batchInserting = ref(false)
const validationResult = ref(null)

// 分页数据
const pagination = reactive({
  page: 1,
  limit: 10,
  total: 0
})

// 表单数据
const formData = reactive({
  name: '',
  type: '',
  complexity_level: 5,
  completeness_level: 0,
  description: '',
  geography: '',
  history: '',
  social_system: '',
  culture: '',
  technology: '',
  magic_system: '',
  novel_id: props.novelId
})

// 表单验证规则
const formRules = {
  name: [
    { required: true, message: '请输入世界观名称', trigger: 'blur' },
    { min: 1, max: 100, message: '名称长度在1到100个字符', trigger: 'blur' }
  ],
  complexity_level: [
    { required: true, message: '请设置复杂程度', trigger: 'change' }
  ]
}

// 计算属性
const dialogTitle = computed(() => {
  return isEdit.value ? '编辑世界观' : '新增世界观'
})

// 获取类型标签样式
const getTypeTagType = (type) => {
  const typeMap = {
    '现代都市': 'primary',
    '古代历史': 'warning',
    '奇幻魔法': 'success',
    '科幻未来': 'info',
    '武侠江湖': 'danger',
    '仙侠修真': 'info',
    '末世废土': 'warning',
    '异世大陆': 'success'
  }
  return typeMap[type] || 'info'
}

// 防抖搜索
const handleSearch = crudUtils.debounce(() => {
  pagination.page = 1
  loadWorldviewList()
}, 300)

// 加载世界观列表
const loadWorldviewList = async () => {
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
    
    const result = await worldviewOps.getList(params)
    worldviewList.value = result.data || []
    pagination.total = result.total || 0
  } catch (error) {
    crudUtils.handleApiError(error, '获取世界观列表失败')
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
const showEditDialog = (worldview) => {
  isEdit.value = true
  Object.assign(formData, worldview)
  dialogVisible.value = true
}

// 显示详情对话框
const showDetailDialog = (worldview) => {
  currentWorldview.value = worldview
  detailDialogVisible.value = true
}

// 重置表单
const resetForm = () => {
  if (formRef.value) {
    formRef.value.resetFields()
  }
  Object.assign(formData, {
    name: '',
    type: '',
    complexity_level: 5,
    completeness_level: 0,
    description: '',
    geography: '',
    history: '',
    social_system: '',
    culture: '',
    technology: '',
    magic_system: '',
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
      await worldviewOps.update(formData.id, formData, () => {
        dialogVisible.value = false
        loadWorldviewList()
      })
    } else {
      await worldviewOps.createWorldview(formData, () => {
        dialogVisible.value = false
        loadWorldviewList()
      })
    }
  } catch (error) {
    console.error('表单验证失败:', error)
  } finally {
    submitting.value = false
  }
}

// 删除世界观
const handleDelete = async (worldview) => {
  await worldviewOps.delete(worldview.id, worldview.name, () => {
    loadWorldviewList()
  })
}

// 批量删除
const handleBatchDelete = async () => {
  const ids = selectedWorldviews.value.map(item => item.id)
  await worldviewOps.batchDelete(ids, () => {
    selectedWorldviews.value = []
    loadWorldviewList()
  })
}

// 选择变化
const handleSelectionChange = (selection) => {
  selectedWorldviews.value = selection
}

// 刷新列表
const refreshList = () => {
  loadWorldviewList()
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

// 显示批量插入对话框
const showBatchInsertDialog = () => {
  batchInsertDialogVisible.value = true
  resetBatchInsertForm()
}

// 重置批量插入表单
const resetBatchInsertForm = () => {
  batchInsertData.value = ''
  validationResult.value = null
}

// 验证批量数据
const validateBatchData = () => {
  if (!batchInsertData.value.trim()) {
    validationResult.value = {
      success: false,
      errors: ['请输入JSON数据']
    }
    return
  }
  
  try {
    let data = JSON.parse(batchInsertData.value)
    
    // 如果是单个对象，转换为数组
    if (!Array.isArray(data)) {
      data = [data]
    }
    
    // 验证数据
    const errors = []
    
    if (data.length === 0) {
      errors.push('数据不能为空')
    } else if (data.length > 20) {
      errors.push('单次最多插入20个世界观')
    }
    
    // 验证每个世界观数据
    data.forEach((item, index) => {
      if (!item.name || !item.name.trim()) {
        errors.push(`第${index + 1}个世界观缺少名称字段`)
      }
      
      if (item.complexity_level && (item.complexity_level < 1 || item.complexity_level > 10)) {
        errors.push(`第${index + 1}个世界观的复杂程度必须在1-10之间`)
      }
      
      if (item.completeness_level && (item.completeness_level < 0 || item.completeness_level > 100)) {
        errors.push(`第${index + 1}个世界观的完整度必须在0-100之间`)
      }
    })
    
    // 检查重名
    const names = data.map(item => item.name).filter(Boolean)
    const duplicateNames = names.filter((name, index) => names.indexOf(name) !== index)
    if (duplicateNames.length > 0) {
      errors.push(`存在重复的名称: ${duplicateNames.join(', ')}`)
    }
    
    if (errors.length > 0) {
      validationResult.value = {
        success: false,
        errors
      }
    } else {
      validationResult.value = {
        success: true,
        count: data.length
      }
    }
  } catch (error) {
    validationResult.value = {
      success: false,
      errors: ['JSON格式错误: ' + error.message]
    }
  }
}

// 格式化批量数据
const formatBatchData = () => {
  if (!batchInsertData.value.trim()) {
    ElMessage.warning('请先输入数据')
    return
  }
  
  try {
    const data = JSON.parse(batchInsertData.value)
    batchInsertData.value = JSON.stringify(data, null, 2)
    ElMessage.success('格式化成功')
  } catch (error) {
    ElMessage.error('JSON格式错误: ' + error.message)
  }
}

// 清空批量数据
const clearBatchData = () => {
  batchInsertData.value = ''
  validationResult.value = null
}

// 加载示例数据
const loadExample = () => {
  const exampleData = {
    name: "中土世界",
    description: "托尔金创造的奇幻世界",
    type: "奇幻魔法",
    geography: "包含夏尔、刚铎、魔多等地区",
    climate: "温带大陆性气候",
    history: "从创世纪到第四纪的完整历史",
    culture: "多种族文化并存",
    society: "封建制度与部落制并存",
    politics: "王国制度",
    economy: "农业和手工业为主",
    technology: "中世纪科技水平",
    magic_system: "基于戒指和法师的魔法体系",
    power_system: "魔法师等级制度",
    complexity_level: 9,
    completeness_level: 85,
    visual_style: "史诗奇幻",
    emotional_tone: "英雄主义",
    races: ["人类", "精灵", "矮人", "霍比特人"],
    themes: ["善恶对立", "友谊", "牺牲"],
    tags: ["经典", "奇幻", "史诗"]
  }
  
  batchInsertData.value = JSON.stringify(exampleData, null, 2)
  validationResult.value = null
}

// 处理批量插入
const handleBatchInsert = async () => {
  // 先验证数据
  validateBatchData()
  
  if (!validationResult.value || !validationResult.value.success) {
    ElMessage.error('请先验证数据格式')
    return
  }
  
  try {
    batchInserting.value = true
    
    let data = JSON.parse(batchInsertData.value)
    
    // 如果是单个对象，转换为数组
    if (!Array.isArray(data)) {
      data = [data]
    }
    
    // 调用批量创建API
    const result = await worldviewAPI.batchCreateWorldviews({
      novel_id: props.novelId,
      worldviews: data
    })
    
    ElMessage.success(`成功插入 ${result.data.created_count} 个世界观`)
    batchInsertDialogVisible.value = false
    resetBatchInsertForm()
    loadWorldviewList()
    
  } catch (error) {
    console.error('批量插入失败:', error)
    ElMessage.error('批量插入失败: ' + (error.response?.data?.message || error.message))
  } finally {
    batchInserting.value = false
  }
}

// 组件挂载时加载数据
onMounted(() => {
  loadWorldviewList()
})

// 监听小说ID变化
watch(() => props.novelId, (newId) => {
  if (newId) {
    formData.novel_id = newId
    loadWorldviewList()
  }
}, { immediate: true })

// 分页变化
const handleSizeChange = (size) => {
  pagination.limit = size
  pagination.page = 1
  loadWorldviewList()
}

const handleCurrentChange = (page) => {
  pagination.page = page
  loadWorldviewList()
}





// 监听小说ID变化
watch(() => props.novelId, (newId) => {
  if (newId) {
    formData.novel_id = newId
    loadWorldviewList()
  }
}, { immediate: true })

// 组件挂载时加载数据
onMounted(() => {
  if (props.novelId) {
    loadWorldviewList()
  }
})
</script>

<style scoped>
/* 批量插入相关样式 */
.batch-insert-container {
  padding: 10px 0;
}

.batch-actions {
  margin-top: 10px;
  text-align: center;
}

.batch-actions .el-button {
  margin: 0 5px;
}

.example-container {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  padding: 15px;
  height: 100%;
}

.example-container h4 {
  margin: 0 0 10px 0;
  color: #495057;
  font-size: 14px;
  font-weight: 600;
}

.example-code {
  background: #ffffff;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 12px;
  font-size: 12px;
  line-height: 1.4;
  color: #495057;
  overflow-x: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
  margin: 0;
  max-height: 400px;
  overflow-y: auto;
}

.validation-result {
  margin-top: 15px;
}

.validation-result .el-alert {
  margin-bottom: 0;
}

.validation-result p {
  margin: 2px 0;
  font-size: 13px;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .batch-insert-container .el-row {
    flex-direction: column;
  }
  
  .batch-insert-container .el-col {
    width: 100% !important;
    margin-bottom: 20px;
  }
  
  .example-container {
    margin-top: 20px;
  }
}
.worldview-management {
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

.worldview-detail {
  padding: 10px 0;
}

.detail-content {
  max-height: 200px;
  overflow-y: auto;
  white-space: pre-wrap;
  line-height: 1.6;
}

/* 组织项样式 */
.organization-item {
  margin-bottom: 12px;
  padding: 8px;
  background-color: #f8f9fa;
  border-radius: 4px;
  border-left: 3px solid #409eff;
}

.org-description {
  color: #606266;
  font-size: 14px;
}

.org-influence {
  color: #909399;
  font-size: 12px;
}

/* 地点项样式 */
.location-item {
  margin-bottom: 12px;
  padding: 8px;
  background-color: #f0f9ff;
  border-radius: 4px;
  border-left: 3px solid #67c23a;
}

.location-description {
  color: #606266;
  font-size: 14px;
}

.location-importance {
  color: #909399;
  font-size: 12px;
}

/* 语言项样式 */
.language-item {
  margin-bottom: 12px;
  padding: 8px;
  background-color: #fef7e0;
  border-radius: 4px;
  border-left: 3px solid #e6a23c;
}

.lang-speakers, .lang-characteristics {
  color: #606266;
  font-size: 14px;
}

/* 宗教项样式 */
.religion-item {
  margin-bottom: 12px;
  padding: 8px;
  background-color: #f5f2ff;
  border-radius: 4px;
  border-left: 3px solid #9c27b0;
}

.religion-beliefs, .religion-practices {
  color: #606266;
  font-size: 14px;
}

.religion-influence {
  color: #909399;
  font-size: 12px;
}

/* 法律项样式 */
.law-item {
  margin-bottom: 12px;
  padding: 8px;
  background-color: #fff2f0;
  border-radius: 4px;
  border-left: 3px solid #f56c6c;
}

.law-description {
  color: #606266;
  font-size: 14px;
}

.law-enforcement {
  color: #909399;
  font-size: 12px;
}

/* 特殊元素项样式 */
.element-item {
  margin-bottom: 12px;
  padding: 8px;
  background-color: #f0f9ff;
  border-radius: 4px;
  border-left: 3px solid #00bcd4;
}

.element-description {
  color: #606266;
  font-size: 14px;
}

.element-effects {
  color: #909399;
  font-size: 12px;
}

/* 时间线项样式 */
.timeline-item {
  margin-bottom: 12px;
  padding: 8px;
  background-color: #f9f9f9;
  border-radius: 4px;
  border-left: 3px solid #795548;
}

.timeline-events, .timeline-characteristics {
  color: #606266;
  font-size: 14px;
}

/* 冲突项样式 */
.conflict-item {
  margin-bottom: 12px;
  padding: 8px;
  background-color: #fff5f5;
  border-radius: 4px;
  border-left: 3px solid #ff5722;
}

.conflict-parties, .conflict-cause {
  color: #606266;
  font-size: 14px;
}

.conflict-status {
  color: #909399;
  font-size: 12px;
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