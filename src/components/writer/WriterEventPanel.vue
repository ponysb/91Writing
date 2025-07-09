<template>
  <div class="panel-content">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>📊 事件时间线</span>
          <el-button size="small" type="primary" @click="$emit('add-event')">
            <el-icon><Plus /></el-icon>
            新增
          </el-button>
        </div>
      </template>
      
      <div class="events-timeline">
        <div v-for="event in events" :key="event.id" class="event-item">
          <div class="event-marker"></div>
          <div class="event-content">
            <div class="event-header">
              <h4>{{ event.title }}</h4>
              <div class="event-actions">
                <el-dropdown @command="(cmd) => $emit('event-action', cmd, event)" trigger="click">
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
            <el-tooltip 
              :content="event.description" 
              placement="right"
              :disabled="event.description.length <= 80"
              effect="light"
              :show-after="300"
            >
              <p class="event-desc event-desc-truncated">
                {{ event.description.length > 80 ? event.description.substring(0, 80) + '...' : event.description }}
              </p>
            </el-tooltip>
            <div class="event-meta">
              <el-tag size="small">{{ event.chapter }}</el-tag>
              <span class="event-time">{{ event.time }}</span>
            </div>
          </div>
        </div>
        
        <div v-if="events.length === 0" class="empty-state">
          <p>暂无事件记录</p>
          <el-button size="small" @click="$emit('add-event')">添加第一个事件</el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { Plus, MoreFilled, Edit, Delete } from '@element-plus/icons-vue'

defineProps({
  events: {
    type: Array,
    required: true
  }
})

defineEmits([
  'add-event',
  'event-action'
])
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

.events-timeline {
  max-height: calc(100vh - 200px);
  overflow-y: auto;
  position: relative;
}

.event-item {
  display: flex;
  align-items: flex-start;
  margin-bottom: 20px;
  position: relative;
}

.event-marker {
  width: 12px;
  height: 12px;
  background-color: #409eff;
  border-radius: 50%;
  margin-right: 16px;
  margin-top: 6px;
  flex-shrink: 0;
  position: relative;
  z-index: 2;
}

.event-marker::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 12px;
  width: 2px;
  height: 40px;
  background-color: #e4e7ed;
  transform: translateX(-50%);
  z-index: 1;
}

.event-item:last-child .event-marker::after {
  display: none;
}

.event-content {
  flex: 1;
  background: white;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 16px;
  transition: all 0.3s ease;
}

.event-content:hover {
  border-color: #409eff;
  background-color: #f0f9ff;
}

.event-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.event-header h4 {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 0;
  flex: 1;
}

.event-desc {
  font-size: 13px;
  color: #606266;
  line-height: 1.4;
  margin-bottom: 8px;
}

.event-desc-truncated {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.event-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.event-time {
  color: #909399;
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