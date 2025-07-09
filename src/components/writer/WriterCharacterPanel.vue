<template>
  <div class="panel-content">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>👥 人物角色</span>
          <div class="character-actions">
            <el-button size="small" type="primary" @click="$emit('add-character')">
              <el-icon><Plus /></el-icon>
              新增
            </el-button>
            <el-button size="small" type="success" @click="$emit('batch-generate')">
              🤖 AI批量生成
            </el-button>
          </div>
        </div>
      </template>
      
      <div class="characters-list">
        <div v-for="character in characters" :key="character.id" class="character-item">
          <div class="character-content" @click="$emit('edit-character', character)">
            <div class="character-avatar">
              <img v-if="character.avatar" :src="character.avatar" />
              <div v-else class="default-avatar">{{ character.name?.charAt(0) || '？' }}</div>
            </div>
            <div class="character-info">
              <h4>{{ character.name }}</h4>
              <div class="character-meta">
                <el-tag :type="getRoleType(character.role)" size="small">{{ getRoleText(character.role) }}</el-tag>
                <el-tag v-if="character.gender" type="info" size="small">{{ getGenderText(character.gender) }}</el-tag>
                <span v-if="character.age" class="age-text">{{ character.age }}岁</span>
              </div>
              <el-tooltip 
                v-if="character.personality" 
                :content="character.personality" 
                placement="right"
                :disabled="character.personality.length <= 60"
                effect="light"
                :show-after="300"
              >
                <p class="character-desc character-desc-truncated">
                  {{ character.personality.length > 60 ? character.personality.substring(0, 60) + '...' : character.personality }}
                </p>
              </el-tooltip>
              <div class="character-tags" v-if="character.tags && character.tags.length">
                <el-tag v-for="tag in character.tags" :key="tag" size="small">{{ tag }}</el-tag>
              </div>
            </div>
          </div>
          <div class="character-actions">
            <el-dropdown @command="(cmd) => $emit('character-action', cmd, character)" trigger="click">
              <el-button size="small" type="text" @click.stop>
                <el-icon><MoreFilled /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="edit">
                    <el-icon><Edit /></el-icon>
                    编辑
                  </el-dropdown-item>
                  <el-dropdown-item command="delete" divided>
                    <el-icon><Delete /></el-icon>
                    删除
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
        
        <div v-if="characters.length === 0" class="empty-state">
          <p>暂无人物设定</p>
          <el-button size="small" @click="$emit('add-character')">创建第一个角色</el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { Plus, MoreFilled, Edit, Delete } from '@element-plus/icons-vue'

defineProps({
  characters: {
    type: Array,
    required: true
  }
})

defineEmits([
  'add-character',
  'batch-generate',
  'edit-character',
  'character-action'
])

const getRoleType = (role) => {
  const roleTypes = {
    'protagonist': 'primary',
    'supporting': 'success',
    'antagonist': 'danger',
    'minor': 'info'
  }
  return roleTypes[role] || ''
}

const getRoleText = (role) => {
  const roleTexts = {
    'protagonist': '主角',
    'supporting': '配角',
    'antagonist': '反派',
    'minor': '路人'
  }
  return roleTexts[role] || role
}

const getGenderText = (gender) => {
  const genderTexts = {
    'male': '男',
    'female': '女',
    'other': '其他'
  }
  return genderTexts[gender] || gender
}
</script>

<style scoped>
.panel-content {
  height: 100%;
  padding: 16px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.character-actions {
  display: flex;
  gap: 8px;
}

.characters-list {
  max-height: calc(100vh - 200px);
  overflow-y: auto;
}

.character-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  margin-bottom: 12px;
  transition: all 0.3s ease;
}

.character-item:hover {
  border-color: #409eff;
  background-color: #f0f9ff;
}

.character-content {
  display: flex;
  flex: 1;
  cursor: pointer;
}

.character-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  overflow: hidden;
  margin-right: 12px;
  flex-shrink: 0;
}

.character-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.default-avatar {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 18px;
}

.character-info {
  flex: 1;
}

.character-info h4 {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 8px 0;
}

.character-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.age-text {
  font-size: 12px;
  color: #909399;
}

.character-desc {
  font-size: 13px;
  color: #606266;
  line-height: 1.4;
  margin-bottom: 8px;
}

.character-desc-truncated {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.character-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.character-actions {
  margin-left: 12px;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #909399;
}

.empty-state p {
  margin-bottom: 16px;
}
</style> 