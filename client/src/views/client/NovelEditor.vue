<template>
  <div class="novel-editor">
    <!-- 编辑器区域 -->
    <div class="editor-container">
      <!-- 章节侧边栏（固定显示） -->
      <div class="chapter-sidebar">
        <div class="sidebar-header">
          <h3>{{ $t('novel.chapterList') }}</h3>
          <el-button @click="addChapter" type="primary" size="small">
            <el-icon><Plus /></el-icon>
            {{ $t('novel.addChapter') }}
          </el-button>
        </div>
        <div class="chapter-list" ref="chapterListRef" @scroll="handleChapterListScroll">
          <div 
            v-for="chapter in chapters" 
            :key="chapter.id"
            :class="['chapter-item', { active: currentChapter?.id === chapter.id }]"
            @click="selectChapter(chapter)"
          >
            <div class="chapter-content">
              <div class="chapter-title">{{ chapter.title }}</div>
              <div class="chapter-subtitle">{{ chapter.summary || $t('common.noDescription') }}</div>
              <div class="chapter-meta">
                <span class="word-count">{{ chapter.word_count || 0 }}{{ $t('dashboard.words') }}</span>
                <el-tag size="small" :type="chapter.status === 'published' ? 'success' : 'warning'" class="chapter-status">
                  {{ getChapterStatusText(chapter.status) }}
                </el-tag>
              </div>
            </div>
            <div class="chapter-actions">
              <el-dropdown @command="handleChapterAction">
                <el-button link size="small">
                  <el-icon><MoreFilled /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item :command="{action: 'edit', chapter}">{{ $t('common.edit') }}</el-dropdown-item>
                    <el-dropdown-item :command="{action: 'delete', chapter}" divided>{{ $t('common.delete') }}</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>
          
          <!-- 加载更多提示 -->
          <div v-if="chapterPagination.hasMore" class="load-more-container">
            <el-button 
              v-if="!chapterPagination.loading" 
              @click="loadMoreChapters" 
              link 
              size="small"
              class="load-more-btn"
            >
              加载更多章节
            </el-button>
            <div v-else class="loading-indicator">
              <el-icon class="is-loading"><Loading /></el-icon>
              <span>加载中...</span>
            </div>
          </div>
          
          <!-- 没有更多数据提示 -->
          <div v-else-if="chapters.length > 0" class="no-more-data">
            <span>已加载全部章节</span>
          </div>
        </div>
      </div>

      <!-- 主编辑区域 -->
      <div class="main-editor">
        <!-- 编辑器顶部工具栏 -->
        <div class="editor-toolbar">
          <div class="toolbar-left">
             <el-button @click="goBack" link class="back-btn">
               <el-icon><ArrowLeft /></el-icon>
               {{ $t('common.backToList') }}
             </el-button>
           </div>
          <div class="toolbar-center">
            <div class="novel-info">
              <span class="novel-title">{{ novelData.title || $t('novel.untitledNovel') }}</span>
              <el-tag size="small" :type="novelData.status === 'published' ? 'success' : 'warning'">{{ getStatusText(novelData.status) }}</el-tag>
            </div>
          </div>
          <div class="toolbar-right">
            <el-button @click="saveNovel" type="primary" :loading="saving" size="small">
              <el-icon><Document /></el-icon>
              {{ $t('common.save') }}
            </el-button>
            <el-button @click="showSettings = true" size="small">
              <el-icon><Setting /></el-icon>
              {{ $t('common.settings') }}
            </el-button>
          </div>
        </div>

        <div v-if="currentChapter" class="chapter-editor">
          <div class="chapter-header">
            <el-input 
              v-model="currentChapter.title" 
              :placeholder="$t('novel.chapterTitle')"
              class="chapter-title-input"
              @blur="updateChapterTitle"
            />
            <div class="chapter-stats">
              <span>{{ $t('novel.wordCount') }}: {{ currentChapter.wordCount || 0 }}</span>
              <span>{{ $t('common.status') }}: {{ getChapterStatusText(currentChapter.status) }}</span>
              <span class="auto-save-status" :class="{ saving: autoSaving }">
                <el-icon v-if="autoSaving"><Loading /></el-icon>
                <el-icon v-else-if="lastSaveTime"><Check /></el-icon>
                <span v-if="autoSaving">自动保存中...</span>
                <span v-else-if="lastSaveTime">已保存 {{ formatSaveTime(lastSaveTime) }}</span>
                <span v-else>未保存</span>
              </span>
            </div>
          </div>
          <div class="editor-wrapper">
            <div id="novel-vditor" class="vditor-container"></div>
          </div>
        </div>
        <div v-else class="no-chapter">
          <el-empty :description="$t('novel.selectOrCreateChapter')">
            <el-button @click="addChapter" type="primary">{{ $t('novel.createFirstChapter') }}</el-button>
          </el-empty>
        </div>
      </div>

      <!-- 右侧AI助手面板 -->
      <div class="ai-assistant-panel" :class="{ collapsed: !showAiPanel }" :style="{ width: aiPanelWidth + 'px' }">
        <!-- 拖拽调节手柄 -->
        <div 
          class="resize-handle" 
          @mousedown="startResize"
          v-if="showAiPanel"
        ></div>
        <div class="ai-panel-header">
          <div class="header-content">
            <div class="assistant-title">
              <h3>{{ $t('novel.writingAssistant') }}</h3>
            </div>
            <div class="header-actions">
              <el-button @click="createNewSession" size="small" link :title="$t('novel.newSession')">
                <el-icon><Plus /></el-icon>
                {{ $t('novel.newSession') }}
              </el-button>
              <el-button @click="showSessionDialog = true" size="small" link :title="$t('novel.sessionList')">
                <el-icon><List /></el-icon>
                {{ $t('novel.sessionList') }}
              </el-button>
            </div>
          </div>
        </div>
        
        <div v-if="showAiPanel" class="ai-panel-content">
          <!-- 左右结构容器 -->
          <div class="panel-layout">
            <!-- 主要内容区域 -->
            <div class="panel-main">
              
              <!-- AI助手聊天界面 -->
               <div v-if="activeTool === 'assistant'" class="assistant-chat">

                 
                 <!-- 聊天消息区域 -->
                 <div class="chat-messages" ref="chatMessages">
                   <div v-for="(message, index) in chatHistory" :key="index" class="message-item">
                     <div class="message-header">
                       <span class="message-sender">{{ message.type === 'user' ? $t('novel.user') : $t('novel.writingAssistant') }}</span>
                       <span class="message-time">{{ formatTime(message.timestamp) }}</span>
                     </div>
                     <div class="message-content">
                       <div v-if="message.streaming && !message.content" class="typing-indicator">
                         <span></span>
                         <span></span>
                         <span></span>
                       </div>
                       <div v-else class="message-text">{{ message.content }}</div>
                     </div>
                     <div class="message-actions">
                       <div class="action-buttons">
                         <el-button @click="copyMessage(message.content)" size="small" link>
                           <el-icon><CopyDocument /></el-icon>
                           {{ $t('common.copy') }}
                         </el-button>
                         <el-button @click="insertToEditor(message.content)" size="small" link>
                           <el-icon><Edit /></el-icon>
                           {{ $t('novel.insertToEditor') }}
                         </el-button>
                         <el-dropdown @command="handleInsertContent" trigger="click">
                           <el-button size="small" link>
                             <el-icon><Plus /></el-icon>
                             {{ $t('novel.insertContent') }}
                             <el-icon class="el-icon--right"><ArrowDown /></el-icon>
                           </el-button>
                           <template #dropdown>
                             <el-dropdown-menu>
                               <el-dropdown-item :command="{type: 'character', message: message, index: index}">
                                 <el-icon><User /></el-icon>
                                 {{ $t('novel.insertCharacter') }}
                               </el-dropdown-item>
                               <el-dropdown-item :command="{type: 'worldview', message: message, index: index}">
                                 <el-icon><FolderOpened /></el-icon>
                                 {{ $t('novel.insertWorldview') }}
                               </el-dropdown-item>
                               <el-dropdown-item :command="{type: 'timeline', message: message, index: index}">
                                 <el-icon><List /></el-icon>
                                 {{ $t('novel.insertTimeline') }}
                               </el-dropdown-item>
                               <el-dropdown-item :command="{type: 'chapter', message: message, index: index}">
                                 <el-icon><Document /></el-icon>
                                 插入章节列表
                               </el-dropdown-item>
                               <!-- <el-dropdown-item :command="{type: 'corpus', message: message, index: index}">
                                 <el-icon><Collection /></el-icon>
                                 插入语料库
                               </el-dropdown-item> -->

                             </el-dropdown-menu>
                           </template>
                         </el-dropdown>
                       </div>
                     </div>
                   </div>
                 </div>
                 
                 <!-- 输入区域 -->
                 <div class="chat-input">
                   <!-- 工具栏 -->
                   <div class="input-toolbar">
                     <div class="toolbar-left">
                       <el-button 
                         size="small"
                         @click="openPromptDialog"
                         :type="selectedPromptId ? 'primary' : 'default'"
                       >
                         <el-icon><List /></el-icon>
                         <span>{{ selectedPromptName || '选择提示词' }}</span>
                       </el-button>
                     </div>
                     
                     <div class="toolbar-right">
                       <div class="reference-tools">
                         <el-button 
                           size="small" 
                           @click="openReferencePanel('chapter')"
                           :type="activeReferenceType === 'chapter' ? 'primary' : 'default'"
                           title="引用章节"
                         >
                           <el-icon><Document /></el-icon>
                         </el-button>
                         <el-button 
                           size="small" 
                           @click="openReferencePanel('character')"
                           :type="activeReferenceType === 'character' ? 'primary' : 'default'"
                           title="引用人物"
                         >
                           <el-icon><User /></el-icon>
                         </el-button>
                         <el-button 
                           size="small" 
                           @click="openReferencePanel('worldview')"
                           :type="activeReferenceType === 'worldview' ? 'primary' : 'default'"
                           title="引用世界观"
                         >
                           <el-icon><FolderOpened /></el-icon>
                         </el-button>
                         <el-button 
                           size="small" 
                           @click="openReferencePanel('timeline')"
                           :type="activeReferenceType === 'timeline' ? 'primary' : 'default'"
                           title="引用事件线"
                         >
                           <el-icon><List /></el-icon>
                         </el-button>
                         <el-button 
                           size="small" 
                           @click="openReferencePanel('corpus')"
                           :type="activeReferenceType === 'corpus' ? 'primary' : 'default'"
                           title="引用语料库"
                         >
                           <el-icon><Collection /></el-icon>
                         </el-button>
                       </div>
                       
                       <div v-if="selectedReferences.length > 0" class="reference-count">
                         <el-badge :value="selectedReferences.length" class="reference-badge">
                           <el-button size="small" @click="toggleStagingArea" title="查看暂存区">
                             <el-icon><Postcard /></el-icon>
                           </el-button>
                         </el-badge>
                       </div>
                     </div>
                   </div>
                   
                   <!-- 暂存区（可折叠） -->
                   <div v-if="selectedReferences.length > 0 && showStagingArea" class="staging-area">
                     <div class="staging-header">
                       <span class="staging-title">
                         <el-icon><Postcard /></el-icon>
                         已选择 {{ selectedReferences.length }} 项引用
                       </span>
                       <div class="staging-actions">
                         <el-button size="small" text @click="clearSelectedReferences" title="清空全部">
                           <el-icon><Delete /></el-icon>
                         </el-button>
                         <el-button size="small" text @click="toggleStagingArea" title="收起">
                           <el-icon><ArrowUp /></el-icon>
                         </el-button>
                       </div>
                     </div>
                     <div class="staging-content">
                       <div class="staging-tags">
                         <el-tag 
                           v-for="(item, index) in selectedReferences" 
                           :key="`${item.type}-${item.id}`"
                           closable
                           @close="removeSelectedReference(index)"
                           class="staging-tag"
                           :type="getReferenceTagType(item.type)"
                         >
                           <span class="tag-prefix">{{ getReferencePrefix(item.type) }}</span>
                           {{ item.name }}
                         </el-tag>
                       </div>
                     </div>
                   </div>
                   
                   <!-- 输入框区域 -->
                   <div class="input-wrapper">
                     <div class="input-container">
                       <el-input
                         ref="inputRef"
                         v-model="userInput"
                         type="textarea"
                         :rows="3"
                         placeholder="输入你的问题...（回车键发送，Ctrl+Enter换行）"
                         @keydown="handleKeyDown"
                         :disabled="isAiTyping"
                         resize="none"
                         class="main-input"
                       />
                     </div>
                     
                     <!-- 引用选择面板 -->
                     <div v-if="showReferencePanel" class="reference-panel">
                       <div class="panel-header">
                         <span>选择{{ getReferenceTypeLabel(activeReferenceType) }}</span>
                         <el-button size="small" text @click="closeReferencePanel">
                           <el-icon><Close /></el-icon>
                         </el-button>
                       </div>
                       <div class="panel-content">
                         <div class="reference-search">
                           <el-input
                             v-model="referenceSearchText"
                             size="small"
                             placeholder="搜索..."
                             clearable
                           />
                         </div>
                         <div class="reference-list">
                           <div 
                             v-for="item in filteredReferenceItems" 
                             :key="item.id"
                             class="reference-item"
                             @click="selectReference(item)"
                           >
                             <div class="reference-icon">
                               <el-icon><component :is="getReferenceIcon(activeReferenceType)" /></el-icon>
                             </div>
                             <div class="reference-content">
                               <div class="reference-name">{{ item.name || item.title }}</div>
                               <div class="reference-desc">{{ getReferenceDescription(item) }}</div>
                             </div>
                           </div>
                           <div v-if="filteredReferenceItems.length === 0" class="no-references">
                             暂无{{ getReferenceTypeLabel(activeReferenceType) }}数据
                           </div>
                         </div>
                       </div>
                     </div>
                   </div>
                 </div>
               </div>
              
              <!-- 人物管理界面 -->
              <div v-else-if="activeTool === 'character'" class="character-management">
                <div class="management-toolbar">
                  <el-button @click="addCharacter" type="primary" size="small">
                    <el-icon><Plus /></el-icon>
                    添加人物
                  </el-button>
                </div>
                
                <div class="character-list">
                  <div v-for="character in characters" :key="character.id" class="character-card">
                    <div class="character-main">
                      <div class="character-header">
                        <div class="character-title-section">
                          <h4>{{ character.name }}</h4>
                          <div class="character-meta">
                            <span v-if="character.nickname" class="nickname">{{ character.nickname }}</span>
                            <div class="character-basic-info">
                              <el-tag size="small" :type="character.role === 'protagonist' ? 'success' : character.role === 'antagonist' ? 'danger' : 'info'">{{ getRoleText(character.role) }}</el-tag>
                              <span v-if="character.gender" class="info-item">{{ character.gender === 'male' ? '男' : character.gender === 'female' ? '女' : character.gender }}</span>
                              <span v-if="character.age" class="info-item">{{ character.age }}岁</span>
                            </div>
                          </div>
                        </div>
                        <div class="character-actions">
                          <el-button @click="editCharacter(character)" size="small" text>
                            <el-icon><Edit /></el-icon>
                          </el-button>
                          <el-button @click="deleteCharacter(character.id)" size="small" text type="danger">
                            <el-icon><Delete /></el-icon>
                          </el-button>
                        </div>
                      </div>
                      
                      <div class="character-content">
                         <div class="character-info-grid">
                           <div class="info-section">
                             <div class="basic-info-inline">
                               <span v-if="character.occupation" class="info-item">{{ character.occupation }}</span>
                             </div>
                             <p class="character-desc">{{ character.description || '暂无描述' }}</p>
                           </div>
                           
                           <div class="details-section" v-if="character.appearance || character.personality || character.background">
                             <div class="detail-compact" v-if="character.appearance">
                               <span class="detail-label">外貌:</span>
                               <span class="detail-text">{{ character.appearance }}</span>
                             </div>
                             <div class="detail-compact" v-if="character.personality">
                               <span class="detail-label">性格:</span>
                               <span class="detail-text">{{ character.personality }}</span>
                             </div>
                             <div class="detail-compact" v-if="character.background">
                               <span class="detail-label">背景:</span>
                               <span class="detail-text">{{ character.background }}</span>
                             </div>
                           </div>
                         </div>

                       </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- 世界观管理界面 -->
              <div v-else-if="activeTool === 'world'" class="world-management">
                <div class="management-toolbar">
                  <el-button @click="addWorldSetting" type="primary" size="small">
                    <el-icon><Plus /></el-icon>
                    添加设定
                  </el-button>
                </div>
                
                <div class="world-categories">
                  <div v-for="worldview in worldviews" :key="worldview.id" class="world-category">
                    <div class="world-item">
                      <div class="item-header">
                        <span class="item-title">{{ worldview.name || '未命名世界观' }}</span>
                        <div class="item-meta">

                        </div>
                        <div class="item-actions">
                          <el-button @click="editWorldItem(worldview)" size="small" text>
                            <el-icon><Edit /></el-icon>
                          </el-button>
                          <el-button @click="deleteWorldItem(worldview.id)" size="small" text type="danger">
                            <el-icon><Delete /></el-icon>
                          </el-button>
                        </div>
                      </div>
                      <p class="item-content">{{ worldview.description || '暂无描述' }}</p>
                      <div class="world-details" v-if="worldview.geography || worldview.history || worldview.culture">
                        <div class="detail-item" v-if="worldview.geography">
                          <strong>地理:</strong> {{ worldview.geography }}
                        </div>
                        <div class="detail-item" v-if="worldview.history">
                          <strong>历史:</strong> {{ worldview.history }}
                        </div>
                        <div class="detail-item" v-if="worldview.culture">
                          <strong>文化:</strong> {{ worldview.culture }}
                        </div>
                        <div class="detail-item" v-if="worldview.magic_system">
                          <strong>魔法体系:</strong> {{ worldview.magic_system }}
                        </div>
                      </div>
                      <div class="world-tags" v-if="worldview.tags && worldview.tags.length > 0">
                        <el-tag v-for="tag in worldview.tags" :key="tag" size="small">{{ tag }}</el-tag>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- 事件线管理界面 -->
              <div v-else-if="activeTool === 'timeline'" class="timeline-management">
                <div class="management-toolbar">
                  <el-button @click="addTimelineEvent" type="primary" size="small">
                    <el-icon><Plus /></el-icon>
                    添加事件
                  </el-button>
                  <div style="margin-left: 10px; font-size: 12px; color: #666;">
                    事件数量: {{ timelineEvents.length }}
                  </div>
                </div>
                
                <div class="timeline-container">
                  <!-- 空状态提示 -->
                  <div v-if="!timelineEvents || timelineEvents.length === 0" class="empty-state">
                    <div class="empty-icon">
                      <el-icon size="48" color="#c0c4cc"><List /></el-icon>
                    </div>
                    <div class="empty-text">暂无事件数据</div>
                    <div class="empty-description">点击上方"添加事件"按钮创建第一个事件</div>
                  </div>
                  
                  <!-- 事件列表 -->
                  <template v-else>
                    <div v-for="(event, index) in timelineEvents" :key="event.id || index" class="timeline-event">
                      <!-- 事件标记点 -->
                      <div class="event-marker" :class="getEventTypeClass(event.event_type || 'default')"></div>
                      
                      <!-- 事件内容卡片 -->
                      <div class="event-content">
                        <!-- 事件头部 -->
                        <div class="event-header">
                          <div class="event-title-section">
                            <h4 class="event-title">{{ event.name || '未命名事件' }}</h4>
                            <div class="event-meta">
                              <el-tag size="small" :type="getEventTypeTagType(event.event_type)">{{ getEventTypeDisplayName(event.event_type) }}</el-tag>
                            </div>
                          </div>
                          <div class="event-actions">
                            <el-button @click="editTimelineEvent(event)" size="small" text>
                              <el-icon><Edit /></el-icon>
                            </el-button>
                            <el-button @click="deleteTimelineEvent(event.id)" size="small" text type="danger" :disabled="!event.id">
                              <el-icon><Delete /></el-icon>
                            </el-button>
                          </div>
                        </div>
                        
                        <!-- 事件描述 -->
                        <div class="event-description" v-if="event.description">
                          {{ event.description }}
                        </div>
                        
                        <!-- 事件详情 -->
                        <div class="event-details" v-if="hasEventDetails(event)">
                          <div class="detail-row" v-if="event.estimated_duration || event.actual_duration">
                            <span class="detail-label">持续时间:</span>
                            <span class="detail-value">
                              预估: {{ event.estimated_duration || '未设定' }} | 
                              实际: {{ event.actual_duration || '未设定' }}
                            </span>
                          </div>
                          
                          <div class="detail-row" v-if="event.locations && event.locations.length > 0">
                            <span class="detail-label">相关地点:</span>
                            <span class="detail-value">{{ formatArrayField(event.locations) }}</span>
                          </div>
                          
                          <div class="detail-row" v-if="event.key_events && event.key_events.length > 0">
                            <span class="detail-label">关键事件:</span>
                            <span class="detail-value">{{ formatArrayField(event.key_events) }}</span>
                          </div>
                          
                          <div class="detail-row" v-if="event.themes && event.themes.length > 0">
                            <span class="detail-label">主题:</span>
                            <span class="detail-value">{{ formatArrayField(event.themes) }}</span>
                          </div>
                        </div>
                        
                        <!-- 进度条 -->
                        <div class="event-progress" v-if="event.completion_percentage && event.completion_percentage > 0">
                          <div class="progress-info">
                            <span class="progress-label">完成进度:</span>
                            <span class="progress-value">{{ event.completion_percentage }}%</span>
                          </div>
                          <el-progress :percentage="Number(event.completion_percentage)" :stroke-width="6" :show-text="false" />
                        </div>
                        
                        <!-- 统计信息 -->
                        <div class="event-stats">
                          <div class="stat-item" v-if="event.word_count_estimate || event.actual_word_count">
                            <span class="stat-label">字数:</span>
                            <span class="stat-value">
                              {{ event.actual_word_count || 0 }} / {{ event.word_count_estimate || 0 }}
                            </span>
                          </div>
                          <div class="stat-item" v-if="event.novel && event.novel.title">
                            <span class="stat-label">所属小说:</span>
                            <span class="stat-value">{{ event.novel.title }}</span>
                          </div>
                          <div class="stat-item" v-if="event.created_at">
                            <span class="stat-label">创建时间:</span>
                            <span class="stat-value">{{ formatDate(event.created_at) }}</span>
                          </div>
                        </div>
                        
                        <!-- 标签 -->
                        <div class="event-tags" v-if="event.tags && event.tags.length > 0">
                          <el-tag v-for="tag in event.tags" :key="tag" size="small">{{ tag }}</el-tag>
                        </div>
                      </div>
                    </div>
                  </template>
                </div>
              </div>
              
              <!-- 语料库管理界面 -->
              <div v-else-if="activeTool === 'corpus'" class="corpus-management">
                <div class="management-toolbar">
                  <el-button @click="addCorpusItem" type="primary" size="small">
                    <el-icon><Plus /></el-icon>
                    添加素材
                  </el-button>
                </div>
                
                <div class="corpus-categories">
                  <div class="corpus-tabs">
                    <div v-for="category in corpusCategories" :key="category.id" 
                         class="corpus-tab" 
                         :class="{ active: activeCorpusCategory === category.id }"
                         @click="activeCorpusCategory = category.id">
                      {{ category.name }}
                    </div>
                  </div>
                  
                  <div class="corpus-content">
                    <div v-for="item in getActiveCorpusItems()" :key="item.id" class="corpus-item">
                      <div class="corpus-header">
                        <div class="corpus-title-section">
                          <h4>{{ item.title || '未命名素材' }}</h4>
                          <div class="corpus-meta">
                            <el-tag size="small" type="info">{{ getContentTypeDisplayName(item.content_type || 'reference') }}</el-tag>
                            <span class="word-count">{{ (item.content || '').length }}字</span>
                          </div>
                        </div>
                        <div class="corpus-actions">
                          <el-button @click="editCorpusItem(item)" size="small" link>
                            <el-icon><Edit /></el-icon>
                          </el-button>
                          <el-button @click="deleteCorpusItem(item.id)" size="small" link type="danger">
                            <el-icon><Delete /></el-icon>
                          </el-button>
                        </div>
                      </div>
                      <p class="corpus-content-text">{{ item.content || '暂无内容' }}</p>


                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- 右侧工具导航 -->
            <div class="panel-sidebar">
              <div class="sidebar-header">
                <span class="sidebar-title">工具</span>
              </div>
              <div class="nav-list">
                <div class="nav-item" :class="{ active: activeTool === 'assistant' }" @click="switchTool('assistant')" title="AI智能助手">
                  <div class="nav-icon">
                    <el-icon><Service /></el-icon>
                  </div>
                  <span class="nav-label">助手</span>
                  <div class="nav-indicator"></div>
                </div>
                <div class="nav-item" :class="{ active: activeTool === 'character' }" @click="switchTool('character')" title="人物角色管理">
                  <div class="nav-icon">
                    <el-icon><Avatar /></el-icon>
                  </div>
                  <span class="nav-label">人物</span>
                  <div class="nav-indicator"></div>
                </div>
                <div class="nav-item" :class="{ active: activeTool === 'world' }" @click="switchTool('world')" title="世界观设定">
                  <div class="nav-icon">
                    <el-icon><FolderOpened /></el-icon>
                  </div>
                  <span class="nav-label">世界观</span>
                  <div class="nav-indicator"></div>
                </div>
                <div class="nav-item" :class="{ active: activeTool === 'timeline' }" @click="switchTool('timeline')" title="时间线管理">
                  <div class="nav-icon">
                    <el-icon><List /></el-icon>
                  </div>
                  <span class="nav-label">事件线</span>
                  <div class="nav-indicator"></div>
                </div>
                <div class="nav-item" :class="{ active: activeTool === 'corpus' }" @click="switchTool('corpus')" title="语料库管理">
                  <div class="nav-icon">
                    <el-icon><Collection /></el-icon>
                  </div>
                  <span class="nav-label">语料库</span>
                  <div class="nav-indicator"></div>
                </div>
                <!-- <div class="nav-item" @click="goToMindMap" title="思维导图模式">
                  <div class="nav-icon">
                    <el-icon><Share /></el-icon>
                  </div>
                  <span class="nav-label">思维导图</span>
                  <div class="nav-indicator"></div>
                </div> -->
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 小说设置对话框 -->
    <el-dialog v-model="showSettings" title="小说设置" width="700px">
      <el-form :model="novelData" label-width="100px">
        <el-form-item label="小说标题">
          <el-input v-model="novelData.title" placeholder="请输入小说标题" />
        </el-form-item>
        <el-form-item label="小说简介">
          <el-input 
            v-model="novelData.description" 
            type="textarea" 
            :rows="4"
            :placeholder="$t('novel.enterNovelDescription')"
          />
        </el-form-item>
        <el-form-item label="小说类型">
          <el-select v-model="novelData.genre" placeholder="请选择小说类型">
            <el-option 
              v-for="option in genreOptions" 
              :key="option.id" 
              :label="option.name" 
              :value="option.name" 
            />
          </el-select>
        </el-form-item>
        <el-form-item label="封面">
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
        <el-form-item :label="$t('novel.novelStatus')">
          <el-select v-model="novelData.status" :placeholder="$t('common.selectStatus')">
            <el-option label="策划中" value="planning" />
            <el-option label="写作中" value="writing" />
            <el-option label="暂停" value="paused" />
            <el-option label="已完成" value="completed" />
            <el-option label="已发布" value="published" />
            <el-option label="已归档" value="archived" />
          </el-select>
        </el-form-item>
        <el-form-item :label="$t('novel.targetWordCount')">
          <el-input-number v-model="novelData.targetWordCount" :min="0" :step="1000" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showSettings = false">{{ $t('common.cancel') }}</el-button>
        <el-button @click="saveNovelSettings" type="primary" :loading="saving">{{ $t('common.save') }}</el-button>
      </template>
    </el-dialog>

    <!-- 章节编辑对话框 -->
    <el-dialog v-model="showChapterDialog" :title="chapterDialogTitle" width="400px">
      <el-form :model="editingChapter" label-width="80px">
        <el-form-item :label="$t('novel.chapterTitle')">
          <el-input v-model="editingChapter.title" :placeholder="$t('novel.enterChapterTitle')" />
        </el-form-item>
        <el-form-item :label="$t('novel.chapterStatus')">
          <el-select v-model="editingChapter.status" :placeholder="$t('common.selectStatus')">
            <el-option label="草稿" value="draft" />
            <el-option label="已发布" value="published" />
          </el-select>
        </el-form-item>
        <el-form-item :label="$t('novel.chapterOutline')">
          <el-input 
            v-model="editingChapter.outline" 
            type="textarea" 
            :rows="4" 
:placeholder="$t('novel.enterChapterOutline')"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showChapterDialog = false">{{ $t('common.cancel') }}</el-button>
        <el-button @click="saveChapter" type="primary">{{ $t('common.save') }}</el-button>
      </template>
    </el-dialog>



    <!-- AI助手管理对话框 -->
    <el-dialog v-model="showAssistantDialog" :title="$t('novel.assistantManagement')" width="800px">
      <div class="assistant-management">
        <div class="assistant-toolbar">
          <el-button @click="createAssistant" type="primary">
            <el-icon><Plus /></el-icon>
            {{ $t('novel.createAssistant') }}
          </el-button>
          <el-button @click="loadAssistants">
            <el-icon><Refresh /></el-icon>
            {{ $t('common.refresh') }}
          </el-button>
        </div>
        
        <el-table :data="assistants" style="width: 100%" max-height="400">
          <el-table-column prop="name" :label="$t('novel.assistantName')" width="150" />
          <el-table-column prop="type" :label="$t('common.type')" width="100">
             <template #default="scope">
               <el-tag size="small" :type="scope.row.type === 'writing' ? 'success' : 'info'">
                 {{ scope.row.type === 'writing' ? $t('novel.writing') : scope.row.type === 'general' ? $t('novel.general') : scope.row.type }}
               </el-tag>
             </template>
           </el-table-column>
          <el-table-column prop="description" :label="$t('common.description')" show-overflow-tooltip />
          <el-table-column prop="model" :label="$t('novel.model')" width="120" />
          <el-table-column :label="$t('common.operation')" width="200">
            <template #default="scope">
              <el-button @click="selectAssistant(scope.row)" size="small" type="primary" text>{{ $t('common.select') }}</el-button>
              <el-button @click="editAssistant(scope.row)" size="small" text>{{ $t('common.edit') }}</el-button>
              <el-button @click="copyAssistant(scope.row)" size="small" text>{{ $t('common.copy') }}</el-button>
              <el-button 
                 v-if="scope.row.created_by !== null" 
                 @click="deleteAssistant(scope.row.id)" 
                 size="small" 
                 type="danger" 
                 text
               >
                 {{ $t('common.delete') }}
               </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <template #footer>
        <el-button @click="showAssistantDialog = false">{{ $t('common.close') }}</el-button>
      </template>
    </el-dialog>

    <!-- 会话管理对话框 -->
    <el-dialog v-model="showSessionDialog" title="会话列表" width="600px">
      <div class="session-management">
        <div class="session-list">
          <div v-for="session in sessionHistory" :key="session.id" class="session-item" :class="{ active: currentSession.id === session.id }">
            <div class="session-info" @click="switchSession(session)">
              <div class="session-name">{{ session.name }}</div>
              <div class="session-time">{{ formatDate(session.last_message_at) || '刚刚' }}</div>
            </div>
            <div class="session-actions">
              <el-button size="small" @click="editSession(session)">重命名</el-button>
              <el-button size="small" type="danger" @click="deleteSession(session.id)">删除</el-button>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showSessionDialog = false">关闭</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 重命名会话对话框 -->
    <el-dialog v-model="showRenameDialog" title="重命名会话" width="400px">
      <el-form>
        <el-form-item label="会话名称">
          <el-input v-model="renamingSession.name" placeholder="请输入会话名称" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showRenameDialog = false">取消</el-button>
          <el-button type="primary" @click="saveSessionName">保存</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 添加人物对话框 -->
    <el-dialog v-model="showCharacterDialog" :title="editingCharacterId ? '编辑人物' : '添加人物'" width="600px">
      <el-form :model="characterForm" label-width="100px">
        <el-form-item label="人物姓名" required>
          <el-input v-model="characterForm.name" placeholder="请输入人物姓名" />
        </el-form-item>
        <el-form-item label="人物描述">
          <el-input v-model="characterForm.description" type="textarea" :rows="3" placeholder="请输入人物描述" />
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="年龄">
              <el-input v-model="characterForm.age" placeholder="年龄" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="性别">
              <el-select v-model="characterForm.gender" placeholder="请选择" style="width: 100%">
                <el-option label="男" value="male" />
                <el-option label="女" value="female" />
                <el-option label="其他" value="other" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="角色类型">
              <el-select v-model="characterForm.role_type" placeholder="请选择" style="width: 100%">
                <el-option label="主角" value="protagonist" />
                <el-option label="配角" value="supporting" />
                <el-option label="反派" value="antagonist" />
                <el-option label="路人" value="minor" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="外貌特征">
          <el-input v-model="characterForm.appearance" type="textarea" :rows="2" placeholder="请描述外貌特征" />
        </el-form-item>
        <el-form-item label="性格特点">
          <el-input v-model="characterForm.personality" type="textarea" :rows="2" placeholder="请描述性格特点" />
        </el-form-item>
        <el-form-item label="背景故事">
          <el-input v-model="characterForm.background" type="textarea" :rows="3" placeholder="请输入背景故事" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showCharacterDialog = false">取消</el-button>
          <el-button type="primary" @click="saveCharacter" :loading="saving">保存</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 添加世界观对话框 -->
    <el-dialog v-model="showWorldviewDialog" :title="editingWorldviewId ? '编辑世界观' : '添加世界观'" width="600px">
      <el-form :model="worldviewForm" label-width="100px">
        <el-form-item label="设定名称" required>
          <el-input v-model="worldviewForm.name" placeholder="请输入设定名称" />
        </el-form-item>
        <el-form-item label="设定描述">
          <el-input v-model="worldviewForm.description" type="textarea" :rows="3" placeholder="请输入设定描述" />
        </el-form-item>
        <el-row :gutter="16">


        </el-row>
        <el-form-item label="地理环境">
          <el-input v-model="worldviewForm.geography" type="textarea" :rows="2" placeholder="请描述地理环境" />
        </el-form-item>
        <el-form-item label="历史背景">
          <el-input v-model="worldviewForm.history" type="textarea" :rows="2" placeholder="请描述历史背景" />
        </el-form-item>
        <el-form-item label="文化特色">
          <el-input v-model="worldviewForm.culture" type="textarea" :rows="2" placeholder="请描述文化特色" />
        </el-form-item>
        <el-form-item label="魔法体系">
          <el-input v-model="worldviewForm.magic_system" type="textarea" :rows="2" placeholder="请描述魔法体系（如适用）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showWorldviewDialog = false">取消</el-button>
          <el-button type="primary" @click="saveWorldview" :loading="saving">保存</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 添加事件对话框 -->
    <el-dialog v-model="showTimelineDialog" :title="editingTimelineId ? '编辑事件' : '添加事件'" width="700px">
      <el-form :model="timelineForm" label-width="100px">
        <el-form-item label="事件名称" required>
          <el-input v-model="timelineForm.name" placeholder="请输入事件名称" />
        </el-form-item>
        <el-form-item label="事件描述">
          <el-input v-model="timelineForm.description" type="textarea" :rows="3" placeholder="请输入事件描述" />
        </el-form-item>
        <el-form-item label="事件类型">
          <el-select v-model="timelineForm.event_type" placeholder="请选择" style="width: 100%">
            <el-option label="主线" value="main" />
            <el-option label="支线" value="side" />
            <el-option label="背景" value="background" />
          </el-select>
        </el-form-item>

        <el-form-item label="关键地点">
          <el-input v-model="timelineForm.locations" placeholder="请输入关键地点，用逗号分隔" />
        </el-form-item>
        <el-form-item label="关键事件">
          <el-input v-model="timelineForm.key_events" type="textarea" :rows="2" placeholder="请描述关键事件" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showTimelineDialog = false">取消</el-button>
          <el-button type="primary" @click="saveTimelineEvent" :loading="saving">保存</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 添加语料库对话框 -->
    <el-dialog v-model="showCorpusDialog" :title="editingCorpusId ? '编辑语料' : '添加语料'" width="600px">
      <el-form ref="corpusFormRef" :model="corpusForm" :rules="corpusFormRules" label-width="100px">
        <el-form-item label="素材标题" prop="title" required>
          <el-input v-model="corpusForm.title" placeholder="请输入素材标题" />
        </el-form-item>
        <el-form-item label="素材内容" prop="content">
          <el-input v-model="corpusForm.content" type="textarea" :rows="5" placeholder="请输入素材内容" />
        </el-form-item>
        <el-form-item label="内容类型">
          <el-select v-model="corpusForm.content_type" placeholder="请选择" style="width: 100%">
            <el-option label="参考" value="reference" />
            <el-option label="描写" value="description" />
            <el-option label="对话" value="dialogue" />
            <el-option label="情节" value="plot" />
          </el-select>
        </el-form-item>

      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showCorpusDialog = false">取消</el-button>
          <el-button type="primary" @click="saveCorpus" :loading="saving">保存</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- AI内容预览对话框 -->
    <el-dialog v-model="showPreviewDialog" :title="`预览${getTypeLabel(previewContentType)}数据`" width="800px" class="preview-dialog">
      <div class="preview-content">
        <div class="preview-header">
          <el-alert 
            :title="`共解析出 ${previewData.length} 个${getTypeLabel(previewContentType)}数据，请检查并修改后插入`" 
            type="info" 
            :closable="false"
          />

        </div>
        
        <div class="preview-items">
          <div v-for="(item, index) in previewData" :key="index" class="preview-item">
            <div class="item-header">
              <h4>{{ getTypeLabel(previewContentType) }} {{ index + 1 }}</h4>
              <el-button @click="removePreviewItem(index)" size="small" type="danger" text>
                <el-icon><Delete /></el-icon>
                删除
              </el-button>
            </div>
            
            <!-- 人物预览 -->
            <div v-if="previewContentType === 'character'" class="character-preview">
              <el-form :model="item" label-width="100px" size="small">
                <el-form-item label="人物姓名" required>
                  <el-input v-model="item.name" placeholder="请输入人物姓名" />
                </el-form-item>
                <el-form-item label="人物描述">
                  <el-input v-model="item.description" type="textarea" :rows="3" placeholder="请输入人物描述" />
                </el-form-item>
                <el-row :gutter="16">
                  <el-col :span="8">
                    <el-form-item label="年龄">
                      <el-input v-model="item.age" placeholder="年龄" />
                    </el-form-item>
                  </el-col>
                  <el-col :span="8">
                    <el-form-item label="性别">
                      <el-select v-model="item.gender" placeholder="请选择" style="width: 100%">
                        <el-option label="男" value="male" />
                        <el-option label="女" value="female" />
                        <el-option label="其他" value="other" />
                      </el-select>
                    </el-form-item>
                  </el-col>
                  <el-col :span="8">
                    <el-form-item label="角色类型">
                      <el-select v-model="item.role_type" placeholder="请选择" style="width: 100%">
                        <el-option label="主角" value="protagonist" />
                        <el-option label="配角" value="supporting" />
                        <el-option label="反派" value="antagonist" />
                        <el-option label="路人" value="minor" />
                      </el-select>
                    </el-form-item>
                  </el-col>
                </el-row>
                <el-form-item label="外貌特征">
                  <el-input v-model="item.appearance" type="textarea" :rows="2" placeholder="请描述外貌特征" />
                </el-form-item>
                <el-form-item label="性格特点">
                  <el-input v-model="item.personality" type="textarea" :rows="2" placeholder="请描述性格特点" />
                </el-form-item>
                <el-form-item label="背景故事">
                  <el-input v-model="item.background" type="textarea" :rows="3" placeholder="请输入背景故事" />
                </el-form-item>
              </el-form>
            </div>
            
            <!-- 世界观预览 -->
            <div v-else-if="previewContentType === 'worldview'" class="worldview-preview">
              <el-form :model="item" label-width="100px" size="small">
                <el-form-item label="设定名称" required>
                  <el-input v-model="item.name" placeholder="请输入设定名称" />
                </el-form-item>
                <el-form-item label="设定描述">
                  <el-input v-model="item.description" type="textarea" :rows="3" placeholder="请输入设定描述" />
                </el-form-item>
                <el-row :gutter="16">
                </el-row>
                <el-form-item label="地理环境">
                  <el-input v-model="item.geography" type="textarea" :rows="2" placeholder="请描述地理环境" />
                </el-form-item>
                <el-form-item label="历史背景">
                  <el-input v-model="item.history" type="textarea" :rows="2" placeholder="请描述历史背景" />
                </el-form-item>
                <el-form-item label="文化特色">
                  <el-input v-model="item.culture" type="textarea" :rows="2" placeholder="请描述文化特色" />
                </el-form-item>
                <el-form-item label="魔法体系">
                  <el-input v-model="item.magic_system" type="textarea" :rows="2" placeholder="请描述魔法体系（如适用）" />
                </el-form-item>
              </el-form>
            </div>
            
            <!-- 事件线预览 -->
            <div v-else-if="previewContentType === 'timeline'" class="timeline-preview">
              <el-form :model="item" label-width="100px" size="small">
                <el-form-item label="事件名称" required>
                  <el-input v-model="item.name" placeholder="请输入事件名称" />
                </el-form-item>
                <el-form-item label="事件描述">
                  <el-input v-model="item.description" type="textarea" :rows="3" placeholder="请输入事件描述" />
                </el-form-item>
                <el-form-item label="事件类型">
                  <el-select v-model="item.event_type" placeholder="请选择" style="width: 100%">
                    <el-option label="主线" value="main" />
                    <el-option label="支线" value="side" />
                    <el-option label="背景" value="background" />
                  </el-select>
                </el-form-item>
                <el-form-item label="关键地点">
                  <el-input v-model="item.locations" placeholder="请输入关键地点，用逗号分隔" />
                </el-form-item>
                <el-form-item label="关键事件">
                  <el-input v-model="item.key_events" type="textarea" :rows="2" placeholder="请描述关键事件" />
                </el-form-item>
              </el-form>
            </div>
            
            <!-- 章节预览 -->
            <div v-else-if="previewContentType === 'chapter'" class="chapter-preview">
              <el-form :model="item" label-width="100px" size="small">
                <el-form-item label="章节标题" required>
                  <el-input v-model="item.title" placeholder="请输入章节标题" />
                </el-form-item>
                <el-form-item label="章节摘要">
                  <el-input v-model="item.summary" type="textarea" :rows="2" placeholder="请输入章节摘要" />
                </el-form-item>
              </el-form>
            </div>

          </div>
        </div>
      </div>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showPreviewDialog = false">取消</el-button>
          <el-button type="primary" @click="confirmInsertContent" :loading="saving">
            确认插入 ({{ previewData.length }}个)
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 提示词选择弹窗 -->
    <el-dialog
      v-model="showPromptDialog"
      title="选择提示词"
      width="800px"
      :before-close="handlePromptDialogClose"
      class="prompt-dialog"
    >
      <div class="prompt-dialog-content">
        <!-- 搜索栏 -->
        <div class="prompt-search">
          <el-input
            v-model="promptSearchText"
            placeholder="搜索提示词..."
            size="default"
            clearable
            style="margin-bottom: 16px;"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>

        <!-- 分类筛选 -->
        <div class="prompt-categories">
          <el-button
            v-for="category in promptCategories"
            :key="category.value"
            :type="selectedCategory === category.value ? 'primary' : 'default'"
            size="small"
            @click="selectedCategory = category.value"
            style="margin-right: 8px; margin-bottom: 8px;"
          >
            {{ category.label }}
          </el-button>
        </div>

        <!-- 提示词卡片列表 -->
        <div class="prompt-cards" v-loading="promptLoading">
          <div
            v-for="prompt in filteredPrompts"
            :key="prompt.id"
            class="prompt-card"
            :class="{ 'selected': selectedPromptId === prompt.id }"
            @click="selectPrompt(prompt)"
          >
            <div class="prompt-card-header">
              <h4 class="prompt-title">{{ prompt.name }}</h4>
              <el-tag size="small" :type="getPromptTypeColor(prompt.category)">
                {{ getPromptTypeLabel(prompt.category) }}
              </el-tag>
            </div>
            <div class="prompt-description">
              {{ prompt.description || '暂无描述' }}
            </div>
            <div class="prompt-card-footer">
              <span class="prompt-author">作者: {{ prompt.author || '系统' }}</span>
              <!-- <span class="prompt-likes">
                <el-icon><Star /></el-icon>
                {{ prompt.likes || 0 }}
              </span> -->
            </div>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-if="filteredPrompts.length === 0 && !promptLoading" class="empty-state">
          <el-empty description="暂无匹配的提示词" />
        </div>
      </div>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="clearPromptSelection">清除选择</el-button>
          <el-button @click="showPromptDialog = false">取消</el-button>
          <el-button type="primary" @click="confirmPromptSelection" :disabled="!selectedPromptId">
            确认选择
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, onBeforeUnmount, computed, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useAiModelStore } from '@/stores/aiModel'
import { useI18n } from 'vue-i18n'
import { useAutoI18n } from '@/composables/useAutoI18n'
import Vditor from 'vditor'
import 'vditor/dist/index.css'
import { novelAPI, chapterAPI, characterAPI, worldviewAPI, timelineAPI, corpusAPI, aiConversationAPI, aiChatAPI, aiAssistantAPI, promptAPI, novelTypeAPI } from '@/api'
import { getCoverImageUrl } from '@/utils/imageUtils'
import {
  Plus,
  Setting,
  Edit,
  Delete,
  Document,
  FolderOpened,
  ChatDotRound,
  ArrowRight,
  ArrowLeft,
  ArrowDown,
  User,
  EditPen,
  Avatar,
  List,
  Loading,
  Check,
  Postcard,
  Tools,
  Collection,
  Service,
  Star,
  Close,
  Refresh,
  CopyDocument,
  MoreFilled,
  Search
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const route = useRoute()
const router = useRouter()
const { t: $t } = useI18n()
const { translateText, smartTranslateText, hybridTranslate } = useAutoI18n()

// 编辑器实例
let vditor = null

// 响应式数据
const saving = ref(false)
const showSettings = ref(false)
const showChapterDialog = ref(false)
const editingChapter = ref({})

// 章节列表容器引用
const chapterListRef = ref(null)

// 标签输入相关
const tagInput = ref('')
const tagInputVisible = ref(false)
const tagInputRef = ref(null)

// 小说类型选项
const genreOptions = ref([])

const currentChapter = ref(null)
const showSessionDialog = ref(false)
const showRenameDialog = ref(false)
const renamingSession = ref({ id: null, name: '' })

// 添加功能对话框状态
const showCharacterDialog = ref(false)
const showWorldviewDialog = ref(false)
const showTimelineDialog = ref(false)
const showCorpusDialog = ref(false)

// 表单数据
const characterForm = reactive({
  name: '',
  description: '',
  age: '',
  gender: '',
  role_type: '',
  appearance: '',
  personality: '',
  background: '',
  novel_id: null
})

const worldviewForm = reactive({
  name: '',
  description: '',
  geography: '',
  history: '',
  culture: '',
  magic_system: '',
  novel_id: null
})

const timelineForm = reactive({
  name: '',
  description: '',
  event_type: 'main',
  locations: '',
  key_events: '',
  novel_id: null
})

const corpusForm = reactive({
  title: '',
  content: '',
  content_type: 'reference',
  novel_id: null
})

// 表单引用
const corpusFormRef = ref()

// 表单验证规则
const corpusFormRules = {
  title: [
    { required: true, message: '请输入素材标题', trigger: 'blur' },
    { min: 1, max: 200, message: '标题长度在1到200个字符', trigger: 'blur' }
  ],
  content: [
    { required: true, message: '请输入素材内容', trigger: 'blur' },
    { min: 10, message: '内容至少10个字符', trigger: 'blur' }
  ]
}

// AI助手相关数据
const showAiPanel = ref(true)
const activeTool = ref('assistant')
const userInput = ref('')
const isAiTyping = ref(false)
const chatMessages = ref(null)
const chatHistory = ref([])
const showAssistantDialog = ref(false)
const assistants = ref([])
const currentAssistant = ref({ id: 1, name: '小说创作助手', type: 'writing' })

// AI面板拖拽调节相关数据
const aiPanelWidth = ref(580) // 默认宽度
const isResizing = ref(false)
const startX = ref(0)
const startWidth = ref(0)

// Prompt选择相关数据
const selectedPromptId = ref(null)
const selectedPromptName = ref('')
const availablePrompts = ref([])
const promptLoading = ref(false)
const showPromptDialog = ref(false)
const promptSearchText = ref('')
const selectedCategory = ref('all')

// 引用面板相关数据
const inputRef = ref(null)
const showReferencePanel = ref(false)
const activeReferenceType = ref('')
const referenceSearchText = ref('')

// 暂存区相关数据
const selectedReferences = ref([]) // 存储选择的引用内容
const showStagingArea = ref(false) // 控制暂存区显示

// 章节侧边栏控制（已移除，现在固定显示）

// 会话管理数据
const currentSession = ref({ id: null, name: '默认会话' })
const sessionHistory = ref([])

// 人物管理数据
const characters = ref([])

// 世界观管理数据
const worldviews = ref([])

// 事件线管理数据
const timelineEvents = ref([])

// 语料库管理数据
const activeCorpusCategory = ref(1)
const corpusCategories = ref([])
const corpusItems = ref([])

// 编辑状态变量
const editingCharacterId = ref(null)
const editingWorldviewId = ref(null)
const editingTimelineId = ref(null)
const editingCorpusId = ref(null)

// 自动保存相关变量
const autoSaveTimer = ref(null)
const autoSaving = ref(false)
const lastSaveTime = ref(null)

// 预览弹窗相关变量
const showPreviewDialog = ref(false)
const previewData = ref([])
const previewContentType = ref('')

// 小说数据
const novelData = reactive({
  id: null,
  title: '',
  description: '',
  genre: '',
  status: 'writing',
  targetWordCount: 50000,
  currentWordCount: 0,
  cover: '',
  coverFile: null,
  coverPreview: '',
  tags: []
})

// 章节数据
const chapters = ref([
  {
    id: 1,
    title: '第一章 开始',
    content: '',
    wordCount: 0,
    status: 'draft',
    createdAt: new Date().toISOString()
  }
])

// 章节分页数据
const chapterPagination = reactive({
  currentPage: 1,
  pageSize: 10,
  total: 0,
  hasMore: true,
  loading: false
})

// 计算属性
const chapterDialogTitle = computed(() => {
  return editingChapter.value.id ? '编辑章节' : '新增章节'
})

// 提示词分类选项 - 只显示有数据的分类
const promptCategories = computed(() => {
  const categories = [{ label: '全部', value: 'all' }]
  
  // 获取所有存在的分类
  const existingCategories = new Set()
  availablePrompts.value.forEach(prompt => {
    if (prompt.category) {
      existingCategories.add(prompt.category)
    }
  })
  
  // 分类标签映射
  const categoryLabels = {
    'outline': '大纲',
    'synopsis': '简介',
    'detailed_outline': '细纲',
    'basic_content': '基础正文',
    'basic_text': '基础正文',
    'scene_description': '场景描写',
    'scene': '场景描写',
    'action_plot': '动作情节',
    'psychological_description': '心理描写',
    'psychology': '心理描写',
    'smart_continuation': '智能续写',
    'smart_continue': '智能续写',
    'polish_optimization': '润色优化',
    'polish': '润色优化',
    'rewrite': '改写',
    'golden_title': '黄金标题',
    'golden_finger': '金手指',
    'golden_opening': '黄金开篇',
    'inspiration_trigger': '灵感激发',
    'inspiration': '灵感激发',
    'brainstorm_generation': '脑洞生成',
    'brainstorm': '脑洞生成',
    'short_writing': '短文写作',
    'short_story': '短篇小说',
    'book_analysis': '拆书分析',
    'character': '人物生成',
    'worldview': '世界观生成'
  }
  
  // 添加存在的分类
  existingCategories.forEach(category => {
    const label = categoryLabels[category] || category
    categories.push({ label, value: category })
  })
  
  return categories
})

// 过滤后的提示词列表
const filteredPrompts = computed(() => {
  let filtered = availablePrompts.value
  
  // 按分类筛选
  if (selectedCategory.value !== 'all') {
    filtered = filtered.filter(prompt => prompt.category === selectedCategory.value)
  }
  
  // 按搜索文本筛选
  if (promptSearchText.value) {
    const searchText = promptSearchText.value.toLowerCase()
    filtered = filtered.filter(prompt => {
      const name = (prompt.name || '').toLowerCase()
      const description = (prompt.description || '').toLowerCase()
      return name.includes(searchText) || description.includes(searchText)
    })
  }
  
  return filtered
})

// 过滤后的引用项目
const filteredReferenceItems = computed(() => {
  const searchText = referenceSearchText.value.toLowerCase()
  let items = []
  
  switch (activeReferenceType.value) {
    case 'character':
      items = characters.value
      break
    case 'worldview':
      items = worldviews.value
      break
    case 'timeline':
      items = timelineEvents.value
      break
    case 'corpus':
      items = corpusItems.value
      break
    case 'chapter':
      items = chapters.value
      break
  }
  
  if (!searchText) return items
  
  return items.filter(item => {
    const name = (item.name || item.title || '').toLowerCase()
    const description = (item.description || item.content || '').toLowerCase()
    return name.includes(searchText) || description.includes(searchText)
  })
})

// 获取状态文本
const getStatusText = (status) => {
  const statusMap = {
    planning: '策划中',
    writing: '写作中',
    paused: '暂停',
    completed: '已完成',
    published: '已发布',
    archived: '已归档'
  }
  return statusMap[status] || '未知'
}

const getChapterStatusText = (status) => {
  const statusMap = {
    draft: $t('novel.draft'),
    published: $t('novel.published')
  }
  return statusMap[status] || $t('novel.draft')
}

// 初始化编辑器
const initEditor = async () => {
  await nextTick()
  
  // 等待DOM元素准备就绪，最多重试5次
  let editorElement = null
  let retries = 0
  const maxRetries = 5
  
  while (!editorElement && retries < maxRetries) {
    editorElement = document.getElementById('novel-vditor')
    if (!editorElement) {
      await new Promise(resolve => setTimeout(resolve, 100)) // 等待100ms
      retries++
    }
  }
  
  if (!editorElement) {
    console.error('Failed to get element by id: novel-vditor after', maxRetries, 'retries')
    return Promise.reject(new Error('Vditor container element not found'))
  }
  
  if (vditor && typeof vditor.destroy === 'function') {
    try {
      vditor.destroy()
    } catch (error) {
      console.warn('Failed to destroy vditor:', error)
    }
    vditor = null
  }
  
  return new Promise((resolve) => {
    vditor = new Vditor('novel-vditor', {
      height: 'calc(100vh - 200px)',
      mode: 'wysiwyg',
      placeholder: '开始编写你的故事...',
      theme: 'classic',
      icon: 'material',
      lang: 'en_US',
      toolbar: [
        'headings',
        'bold',
        'italic',
        '|',
        'list',
        'ordered-list',
        '|',
        'quote',
        'line',
        '|',
        'undo',
        'redo',
        '|',
        'fullscreen'
      ],
      cache: {
        enable: false
      },
      counter: {
        enable: true,
        type: 'text'
      },
      after: () => {
          // 编辑器初始化完成后的回调
          if (currentChapter.value && vditor && typeof vditor.setValue === 'function') {
            try {
              vditor.setValue(currentChapter.value.content || '')
            } catch (error) {
              console.warn('Failed to set vditor content in after callback:', error)
            }
          }
          
          // 自定义编辑器样式
          const vditorElement = document.querySelector('.vditor')
          if (vditorElement) {
            vditorElement.style.border = 'none'
            vditorElement.style.borderRadius = '0'
          }
          
          const toolbarElement = document.querySelector('.vditor-toolbar')
          if (toolbarElement) {
            toolbarElement.style.borderBottom = '1px solid #e5e7eb'
            toolbarElement.style.background = '#ffffff'
            toolbarElement.style.padding = '12px 24px'
          }
          
          const contentElement = document.querySelector('.vditor-content')
          if (contentElement) {
            contentElement.style.background = '#ffffff'
          }
          
          const wysiwygElement = document.querySelector('.vditor-wysiwyg')
          if (wysiwygElement) {
            wysiwygElement.style.padding = '24px 32px'
            wysiwygElement.style.fontSize = '16px'
            wysiwygElement.style.lineHeight = '1.8'
            wysiwygElement.style.color = '#111827'
          }
          
          resolve() // 解析Promise，表示编辑器已完全初始化
        },
      input: (value) => {
        if (currentChapter.value) {
          currentChapter.value.content = value
          // 计算字数（去除markdown标记）
          const plainText = value.replace(/[#*`\[\]()]/g, '').replace(/\n/g, '')
          currentChapter.value.wordCount = plainText.length
          
          // 更新小说总字数
          novelData.currentWordCount = chapters.value.reduce((total, chapter) => {
            return total + (chapter.wordCount || 0)
          }, 0)
          
          // 自动保存（防抖）
          autoSave()
        }
      }
    })
  })
}

// 选择章节
const selectChapter = async (chapter) => {
  // 确保vditor已经初始化并且有必要的方法
  if (currentChapter.value && vditor && typeof vditor.getValue === 'function') {
    try {
      // 保存当前章节内容
      currentChapter.value.content = vditor.getValue()
    } catch (error) {
      console.warn('Failed to get vditor content:', error)
    }
  }
  
  try {
    // 调用章节详情API获取完整内容
    const response = await chapterAPI.getChapter(chapter.id)
    const chapterDetail = response.data
    
    // 更新当前章节为详情数据
    currentChapter.value = {
      ...chapter,
      ...chapterDetail,
      content: chapterDetail.content || ''
    }
    
    // 计算字数（去除markdown标记）
    const plainText = (currentChapter.value.content || '').replace(/[#*`\[\]()]/g, '').replace(/\n/g, '')
    currentChapter.value.wordCount = plainText.length
    
    // 设置最后保存时间为当前时间，显示"无变化"状态
    lastSaveTime.value = new Date()
    
    // 等待下一个tick确保DOM更新完成
    await nextTick()
    
    // 如果编辑器还没有初始化，先初始化
    if (!vditor) {
      await initEditor()
    } else {
      // 将内容加载到编辑器
      if (typeof vditor.setValue === 'function') {
        try {
          vditor.setValue(currentChapter.value.content || '')
        } catch (error) {
          console.warn('Failed to set vditor content:', error)
          // 如果设置内容失败，尝试重新初始化编辑器
          await initEditor()
        }
      }
    }
  } catch (error) {
    ElMessage.error('获取章节详情失败：' + (error.message || '未知错误'))
    // 如果获取详情失败，仍然选中章节但内容为空
    currentChapter.value = chapter
    currentChapter.value.wordCount = 0
    lastSaveTime.value = new Date()
    if (vditor && typeof vditor.setValue === 'function') {
      try {
        vditor.setValue('')
      } catch (error) {
        console.warn('Failed to clear vditor content:', error)
      }
    }
  }
}



// 添加章节
const addChapter = () => {
  editingChapter.value = {
    title: `第${chapters.value.length + 1}章`,
    content: '',
    wordCount: 0,
    status: 'draft',
    outline: ''
  }
  showChapterDialog.value = true
}



// 保存章节
const saveChapter = async () => {
  if (!editingChapter.value.title.trim()) {
    ElMessage.warning('请输入章节标题')
    return
  }
  
  try {
    if (editingChapter.value.id) {
      // 编辑现有章节
      await chapterAPI.updateChapter(editingChapter.value.id, {
        title: editingChapter.value.title,
        status: editingChapter.value.status || 'draft',
        outline: editingChapter.value.outline || ''
      })
      const index = chapters.value.findIndex(c => c.id === editingChapter.value.id)
      if (index !== -1) {
        chapters.value[index] = { ...chapters.value[index], ...editingChapter.value }
        
        // 如果是当前章节，更新当前章节引用
        if (currentChapter.value?.id === editingChapter.value.id) {
          currentChapter.value = chapters.value[index]
        }
      }
    } else {
      // 新增章节
      const chapterData = {
        title: editingChapter.value.title,
        content: '',
        word_count: 0,
        status: editingChapter.value.status || 'draft',
        outline: editingChapter.value.outline || '',
        novel_id: novelData.id
      }
      const response = await chapterAPI.createChapter(chapterData)
      const newChapter = {
        ...response.data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      chapters.value.push(newChapter)
      
      // 如果是第一章，自动选中
      if (chapters.value.length === 1) {
        selectChapter(newChapter)
      }
    }
    
    showChapterDialog.value = false
    editingChapter.value = { title: '', content: '', outline: '' }
    ElMessage.success('章节保存成功')
  } catch (error) {
    ElMessage.error('保存章节失败：' + (error.message || '未知错误'))
  }
}

// 处理章节操作
const handleChapterAction = async ({ action, chapter }) => {
  switch (action) {
    case 'edit':
      editingChapter.value = { 
        ...chapter,
        outline: chapter.outline || ''
      }
      showChapterDialog.value = true
      break
    case 'delete':
      try {
        await ElMessageBox.confirm(
          `确定要删除章节「${chapter.title}」吗？此操作不可恢复。`,
          '确认删除',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )
        
        // 调用API删除章节
        await chapterAPI.deleteChapter(chapter.id)
        
        const index = chapters.value.findIndex(c => c.id === chapter.id)
        if (index !== -1) {
          chapters.value.splice(index, 1)
          
          // 如果删除的是当前章节，清空编辑器
          if (currentChapter.value?.id === chapter.id) {
            currentChapter.value = null
            if (vditor && typeof vditor.setValue === 'function') {
      try {
        vditor.setValue('')
      } catch (error) {
        console.warn('Failed to clear vditor content:', error)
      }
    }
          }
        }
        
        ElMessage.success('章节删除成功')
      } catch (error) {
        if (error !== 'cancel') {
          ElMessage.error('删除章节失败：' + (error.message || '未知错误'))
        }
      }
      break
  }
}

// 更新章节标题
const updateChapterTitle = () => {
  if (currentChapter.value) {
    const index = chapters.value.findIndex(c => c.id === currentChapter.value.id)
    if (index !== -1) {
      chapters.value[index].title = currentChapter.value.title
    }
  }
}

// 保存小说
const saveNovel = async () => {
  if (saving.value) return
  
  try {
    saving.value = true
    
    // 获取编辑器内容
    const content = vditor?.getValue() || ''
    
    // 更新当前章节内容
    if (currentChapter.value) {
      currentChapter.value.content = content
      // 计算字数（去除markdown标记）
      const plainText = content.replace(/[#*`\[\]()]/g, '').replace(/\n/g, '')
      currentChapter.value.word_count = plainText.length
      currentChapter.value.updated_at = new Date().toISOString()
      
      // 保存章节
      if (currentChapter.value.id) {
        await chapterAPI.updateChapter(currentChapter.value.id, {
          title: currentChapter.value.title,
          content: currentChapter.value.content,
          word_count: currentChapter.value.word_count,
          status: currentChapter.value.status || 'draft'
        })
      } else {
        const response = await chapterAPI.createChapter({
          title: currentChapter.value.title,
          content: currentChapter.value.content,
          word_count: currentChapter.value.word_count,
          status: currentChapter.value.status || 'draft',
          novel_id: novelData.id
        })
        currentChapter.value.id = response.data.id
      }
    }
    
    // 计算小说总字数
    const totalWordCount = chapters.value.reduce((total, chapter) => {
      return total + (chapter.word_count || 0)
    }, 0)
    
    // 保存小说基本信息
    const novelUpdateData = {
      ...novelData,
      current_word_count: totalWordCount,
      updated_at: new Date().toISOString()
    }
    
    if (novelData.id) {
      await novelAPI.updateNovel(novelData.id, novelUpdateData)
    } else {
      const response = await novelAPI.createNovel(novelUpdateData)
      novelData.id = response.data.id
    }
    
    ElMessage.success('保存成功')
  } catch (error) {
    ElMessage.error('保存失败：' + (error.message || '未知错误'))
  } finally {
    saving.value = false
  }
}

// 自动保存函数（防抖）
const autoSave = () => {
  // 清除之前的定时器
  if (autoSaveTimer.value) {
    clearTimeout(autoSaveTimer.value)
  }
  
  // 设置新的定时器，3秒后执行保存
  autoSaveTimer.value = setTimeout(async () => {
    if (autoSaving.value || !currentChapter.value) return
    
    try {
      autoSaving.value = true
      
      // 获取编辑器内容
      const content = vditor?.getValue() || ''
      
      // 更新当前章节内容
      if (currentChapter.value) {
        currentChapter.value.content = content
        // 计算字数（去除markdown标记）
        const plainText = content.replace(/[#*`\[\]()]/g, '').replace(/\n/g, '')
        currentChapter.value.word_count = plainText.length
        currentChapter.value.updated_at = new Date().toISOString()
        
        // 保存章节
        if (currentChapter.value.id) {
          await chapterAPI.updateChapter(currentChapter.value.id, {
            title: currentChapter.value.title,
            content: currentChapter.value.content,
            word_count: currentChapter.value.word_count,
            status: currentChapter.value.status || 'draft'
          })
        }
        
        // 更新最后保存时间
        lastSaveTime.value = new Date()
        
        // 显示保存成功提示（可选，避免过于频繁的提示）
        // ElMessage.success('自动保存成功')
      }
    } catch (error) {
      console.warn('自动保存失败:', error)
      // ElMessage.warning('自动保存失败：' + (error.message || '未知错误'))
    } finally {
      autoSaving.value = false
    }
  }, 3000) // 3秒防抖
}

// 标签管理方法
const showTagInput = () => {
  tagInputVisible.value = true
  nextTick(() => {
    tagInputRef.value?.focus()
  })
}

const addTag = () => {
  const tag = tagInput.value.trim()
  if (tag && !novelData.tags.includes(tag)) {
    novelData.tags.push(tag)
  }
  tagInput.value = ''
  tagInputVisible.value = false
}

const removeTag = (tag) => {
  const index = novelData.tags.indexOf(tag)
  if (index > -1) {
    novelData.tags.splice(index, 1)
  }
}

// 封面上传方法
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
    novelData.coverFile = file.raw
    
    // 创建预览URL
    const reader = new FileReader()
    reader.onload = (e) => {
      novelData.coverPreview = e.target.result
    }
    reader.readAsDataURL(file.raw)
  }
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

// 保存小说设置
const saveNovelSettings = async () => {
  if (saving.value) return
  
  try {
    saving.value = true
    
    let novelPayload
    
    // 如果有封面文件，使用FormData格式
    if (novelData.coverFile) {
      novelPayload = new FormData()
      novelPayload.append('title', novelData.title)
      novelPayload.append('description', novelData.description)
      novelPayload.append('genre', novelData.genre)
      novelPayload.append('status', novelData.status)
      novelPayload.append('target_word_count', novelData.targetWordCount)
      novelPayload.append('tags', novelData.tags.join(','))
      novelPayload.append('cover', novelData.coverFile)
    } else {
      // 普通JSON格式
      novelPayload = {
        title: novelData.title,
        description: novelData.description,
        genre: novelData.genre,
        status: novelData.status,
        target_word_count: novelData.targetWordCount,
        tags: novelData.tags.join(',')
      }
      
      // 如果有封面URL，添加到payload中
      if (novelData.cover) {
        novelPayload.cover_image = novelData.cover
      }
    }
    
    if (novelData.id) {
      const response = await novelAPI.updateNovel(novelData.id, novelPayload)
      
      // 如果响应包含更新的数据，同步到本地
      if (response.data) {
        // 更新封面相关字段
          if (response.data.cover_image) {
            novelData.cover = response.data.cover_image
            // 上传成功后，使用服务器返回的URL替换本地预览
            novelData.coverPreview = response.data.cover_image
          }
        
        // 更新其他可能变化的字段
        if (response.data.title) novelData.title = response.data.title
        if (response.data.description) novelData.description = response.data.description
        if (response.data.genre) novelData.genre = response.data.genre
        if (response.data.status) novelData.status = response.data.status
        if (response.data.target_word_count) novelData.targetWordCount = response.data.target_word_count
        if (response.data.tags) {
          novelData.tags = typeof response.data.tags === 'string' 
            ? response.data.tags.split(',').filter(tag => tag.trim()) 
            : response.data.tags || []
        }
        
        // 清空文件对象，避免重复上传
        novelData.coverFile = null
      }
      
      ElMessage.success('小说设置保存成功')
    } else {
      ElMessage.error('小说ID不存在，无法保存设置')
    }
    
    showSettings.value = false
  } catch (error) {
    console.error('保存小说设置失败:', error)
    ElMessage.error('保存失败：' + (error.message || '未知错误'))
  } finally {
    saving.value = false
  }
}

// 格式化保存时间
const formatSaveTime = (saveTime) => {
  if (!saveTime) return ''
  
  const now = new Date()
  const diff = Math.floor((now - saveTime) / 1000) // 秒数差
  
  if (diff < 60) {
    return '刚刚'
  } else if (diff < 3600) {
    return `${Math.floor(diff / 60)}分钟前`
  } else if (diff < 86400) {
    return `${Math.floor(diff / 3600)}小时前`
  } else {
    return saveTime.toLocaleDateString()
  }
}

// 返回小说列表
const goBack = () => {
  router.push('/client/novels')
}

// 跳转到思维导图模式
const goToMindMap = () => {
  router.push(`/client/mindmap/${novelData.id}`)
}



// 创建新会话
const createNewSession = async () => {
  try {
    // 确保有选中的助手
    if (!currentAssistant.value.id) {
      ElMessage.warning('请先选择一个AI助手')
      return
    }
    
    const response = await aiConversationAPI.createConversation({
      title: '新建会话',
      description: 'AI写作助手对话',
      assistant_id: currentAssistant.value.id,
      novel_id: novelData.id || null
    })
    
    currentSession.value = {
      id: response.data.id,
      name: response.data.title,
    }
    
    // 添加到会话历史
    sessionHistory.value.unshift(currentSession.value)
    
    // 添加欢迎消息
    chatHistory.value = [
      {
        type: 'ai',
        content: '你好！我是你的AI写作助手，可以帮助你进行小说创作。你可以向我询问情节发展、角色塑造、细节描写等问题。',
        timestamp: new Date().toLocaleTimeString()
      }
    ]
    
  } catch (error) {
    ElMessage.error('创建会话失败：' + error.message)
  }
}

// 加载会话历史
const loadSessionHistory = async () => {
  try {
    const response = await aiConversationAPI.getConversations({
  novel_id: novelData.id,
  page: 1,
  limit: 20,
  order: 'desc'
})
    
    sessionHistory.value = response.data.conversations.map(session => ({
      id: session.id,
      name: session.title,
      last_message_at: session.last_message_at
    }))
    
    // 如果有会话历史，选择第一个作为当前会话
    if (sessionHistory.value.length > 0) {
      currentSession.value = sessionHistory.value[0]
      await loadSessionMessages(currentSession.value.id)
    } else {
      // 没有会话历史，创建新会话
      await createNewSession()
    }
  } catch (error) {
    console.error('加载会话历史失败:', error)
    // 创建新会话作为备选
    await createNewSession()
  }
}

// 加载会话消息
const loadSessionMessages = async (sessionId) => {
  try {
    const response = await aiConversationAPI.getMessages(sessionId, {
  page: 1,
  limit: 50,
  order: 'asc',
  include: 'model_info'
})
    
    chatHistory.value = response.data.messages.map(msg => ({
      id: msg.id,
      type: msg.role === 'user' ? 'user' : 'ai',
      model: msg.model || 'gpt-3.5-turbo',
      content: msg.content,
      timestamp: new Date(msg.created_at).toLocaleTimeString()
    }))
    
    nextTick(() => {
      scrollToBottom()
    })
  } catch (error) {
    ElMessage.error('加载消息失败：' + error.message)
  }
}



// 加载小说数据
const loadNovelData = async () => {
  const novelId = route.params.id
  
  if (novelId && novelId !== 'new') {
    // 加载现有小说数据
    try {
      const response = await novelAPI.getNovel(novelId)
      const novel = response.data
      
      // 更新小说数据，包含新增的字段
      Object.assign(novelData, {
        id: novel.id,
        title: novel.title || '',
        description: novel.description || '',
        status: novel.status || 'draft',
        targetWordCount: novel.target_word_count || 50000,
        currentWordCount: novel.current_word_count || 0,
        genre: novel.genre || '',
        cover: novel.cover_image || '',
        coverFile: null,
        coverPreview: novel.cover_image || '',
        tags: novel.tags ? (typeof novel.tags === 'string' ? novel.tags.split(',').filter(tag => tag.trim()) : novel.tags) : []
      })
      
      // 加载章节列表
      const chaptersResponse = await chapterAPI.getChapters({ novel_id: novelId })
      chapters.value = chaptersResponse.data?.chapters || []
      
      // 加载人物数据
      const charactersResponse = await characterAPI.getCharacters({ novel_id: novelId })
      characters.value = charactersResponse.data?.characters || []
      
      // 加载世界观数据
      const worldviewResponse = await worldviewAPI.getWorldviews({ novel_id: novelId })
      worldviews.value = worldviewResponse.data?.worldviews || []
      
      // 加载事件线数据
      const timelineResponse = await timelineAPI.getEvents({ novel_id: novelId })
      timelineEvents.value = timelineResponse.data?.timelines || []
      
    } catch (error) {
      ElMessage.error('加载小说数据失败：' + (error.message || '未知错误'))
    }
  } else {
    // 新建小说
    novelData.title = '新建小说'
  }
  
  // 加载语料库数据
  try {
    const corpusResponse = await corpusAPI.getCorpus({ novel_id: novelId })
    corpusItems.value = corpusResponse.data?.corpus || []
    
    // 根据语料库数据生成分类
    const categories = [...new Set(corpusItems.value.map(item => item.category).filter(Boolean))]
    corpusCategories.value = categories.map((cat, index) => ({ id: index + 1, name: cat }))
    
    // 如果没有分类，设置默认分类
    if (corpusCategories.value.length === 0) {
      corpusCategories.value = [{ id: 1, name: '全部' }]
    }
  } catch (error) {
    console.error('加载语料库失败:', error)
  }
  
  // 加载AI助手列表
  await loadAssistants()
  
  // 加载AI会话历史
  await loadSessionHistory()
  
  // 加载可用的Prompt列表
  await loadAvailablePrompts()
  
  // 所有数据加载完成后，触发工具栏重新渲染
  await nextTick()
  setTimeout(() => {
    // 强制触发工具栏重新渲染
    const toolbarElement = document.querySelector('.input-toolbar')
    if (toolbarElement) {
      toolbarElement.style.display = 'none'
      toolbarElement.offsetHeight // 触发重排
      toolbarElement.style.display = ''
    }
    
    // 同时触发响应式更新
    showAiPanel.value = showAiPanel.value
  }, 100)
}

// 初始化编辑器的安全方法
const safeInitEditor = async () => {
  // 确保 currentChapter 存在且 DOM 元素已渲染
  if (!currentChapter.value) {
    console.log('No current chapter, skipping editor initialization')
    return
  }
  
  // 等待DOM完全渲染
  await nextTick()
  
  // 再次检查元素是否存在
  const editorElement = document.getElementById('vditor')
  if (!editorElement) {
    console.log('Vditor element not found, waiting for DOM render')
    // 等待一个额外的渲染周期
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  try {
    await initEditor()
  } catch (error) {
    console.error('Editor initialization failed:', error)
    ElMessage.error('编辑器初始化失败，请刷新页面重试')
  }
}

// 生命周期
onMounted(async () => {
  // 加载小说类型列表
  await loadNovelTypes()
  
  await loadNovelData()
  
  // 选择第一章并加载其内容到编辑器
  if (chapters.value.length > 0) {
    await selectChapter(chapters.value[0])
  }
  
  // 确保工具栏相关数据完全加载后再进行DOM操作
  await nextTick()
  
  // 等待所有异步数据加载完成后再触发工具栏重新渲染
  setTimeout(async () => {
    // 确保所有数据都已加载完成
    await Promise.all([
      // 等待所有异步加载完成
      new Promise(resolve => {
        const checkDataLoaded = () => {
          if (availablePrompts.value.length >= 0 && 
              assistants.value.length >= 0 && 
              characters.value.length >= 0 &&
              worldviews.value.length >= 0 &&
              timelineEvents.value.length >= 0 &&
              corpusItems.value.length >= 0) {
            resolve()
          } else {
            setTimeout(checkDataLoaded, 50)
          }
        }
        checkDataLoaded()
      })
    ])
    
    // 触发响应式更新，确保工具栏正确显示
    showAiPanel.value = showAiPanel.value
    
    // 强制重新渲染AI面板内容
    await nextTick()
    activeTool.value = activeTool.value
  }, 200)
})

// 监听章节切换，确保编辑器内容同步（移除自动重新初始化以避免内容丢失）
// watch(currentChapter, async (newChapter, oldChapter) => {
//   if (newChapter && newChapter !== oldChapter) {
//     await safeInitEditor()
//   }
// }, { immediate: false })

// 监听数据加载状态，确保工具栏正确显示
watch([availablePrompts, assistants, characters, worldviews, timelineEvents, corpusItems], () => {
  // 当任何数据发生变化时，强制重新渲染工具栏
  nextTick(() => {
    // 触发工具栏重新渲染
    const toolbarElement = document.querySelector('.input-toolbar')
    if (toolbarElement) {
      // 强制重新计算样式
      toolbarElement.style.display = 'none'
      toolbarElement.offsetHeight // 触发重排
      toolbarElement.style.display = ''
    }
  })
}, { deep: true, flush: 'post' })

// 组件销毁前清理定时器
onBeforeUnmount(() => {
  if (autoSaveTimer.value) {
    clearTimeout(autoSaveTimer.value)
  }
})

// AI助手相关方法
const toggleAiPanel = () => {
  showAiPanel.value = !showAiPanel.value
}

// AI面板拖拽调节方法
const startResize = (e) => {
  isResizing.value = true
  startX.value = e.clientX
  startWidth.value = aiPanelWidth.value
  
  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

const handleResize = (e) => {
  if (!isResizing.value) return
  
  const deltaX = startX.value - e.clientX // 向左拖拽为正值
  const newWidth = startWidth.value + deltaX
  
  // 限制最小和最大宽度
  const minWidth = 300
  const maxWidth = 800
  
  if (newWidth >= minWidth && newWidth <= maxWidth) {
    aiPanelWidth.value = newWidth
  }
}

const stopResize = () => {
  isResizing.value = false
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

// AI助手管理方法
const loadAssistants = async () => {
  try {
    const response = await aiAssistantAPI.getAssistants()
    console.log('AI助手API响应:', response)
    
    // 根据实际API响应结构解析数据
    let assistantList = []
    if (response.data && response.data.assistants) {
      assistantList = response.data.assistants
    } else if (response.data && Array.isArray(response.data)) {
      assistantList = response.data
    } else if (Array.isArray(response)) {
      assistantList = response
    }
    
    assistants.value = assistantList
    console.log('解析后的助手列表:', assistants.value)
  } catch (error) {
    console.error('加载AI助手失败:', error)
    ElMessage.error('加载AI助手失败')
  }
}

// 助手切换功能已移除，使用固定的助手ID: 1

const selectAssistant = (assistant) => {
  currentAssistant.value = assistant
  showAssistantDialog.value = false
  ElMessage.success(`已选择助手: ${assistant.name}`)
}

const createAssistant = () => {
  ElMessage.info('创建助手功能开发中...')
}

const editAssistant = (assistant) => {
  ElMessage.info(`编辑助手: ${assistant.name}`)
}

const copyAssistant = async (assistant) => {
  try {
    await aiAssistantAPI.copyAssistant(assistant.id)
    ElMessage.success('助手复制成功')
    await loadAssistants()
  } catch (error) {
    console.error('复制助手失败:', error)
    ElMessage.error('复制助手失败')
  }
}

const deleteAssistant = async (assistantId) => {
  try {
    await ElMessageBox.confirm('确定要删除这个助手吗？', '确认删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await aiAssistantAPI.deleteAssistant(assistantId)
    ElMessage.success('助手删除成功')
    await loadAssistants()
    
    // 如果删除的是当前助手，切换到第一个可用助手
    if (currentAssistant.value.id === assistantId && assistants.value.length > 0) {
      currentAssistant.value = assistants.value[0]
    }
  } catch (error) {
    if (error.message) {
      ElMessage.error('删除失败：' + error.message)
    }
  }
}

const switchTool = (tool) => {
  activeTool.value = tool
  
  // 如果切换到助手界面，自动滚动到聊天区域底部
  if (tool === 'assistant') {
    nextTick(() => {
      scrollToBottom()
    })
  }
}

const getActiveToolTitle = () => {
  const titles = {
    assistant: 'AI助手',
    character: '人物管理',
    world: '世界观管理',
    timeline: '事件线管理'
  }
  return titles[activeTool.value] || 'AI助手'
}

// 人物管理方法
const addCharacter = () => {
  // 重置表单
  Object.assign(characterForm, {
    name: '',
    description: '',
    age: '',
    gender: '',
    role_type: '',
    appearance: '',
    personality: '',
    background: '',
    novel_id: novelData.id
  })
  editingCharacterId.value = null
  showCharacterDialog.value = true
}

const saveCharacter = async () => {
  if (!characterForm.name.trim()) {
    ElMessage.warning('请输入人物姓名')
    return
  }
  
  try {
    saving.value = true
    
    // 准备发送给后端的数据，将role_type映射为role
    const characterData = {
      ...characterForm,
      role: characterForm.role_type
    }
    delete characterData.role_type
    
    if (editingCharacterId.value) {
      // 编辑模式
      const result = await characterAPI.updateCharacter(editingCharacterId.value, characterData)
      const index = characters.value.findIndex(c => c.id === editingCharacterId.value)
      if (index !== -1) {
        characters.value[index] = result.data
      }
      ElMessage.success('人物更新成功')
    } else {
      // 新增模式
      const result = await characterAPI.createCharacter(characterData)
      characters.value.push(result.data)
      ElMessage.success('人物添加成功')
    }
    
    showCharacterDialog.value = false
    editingCharacterId.value = null
  } catch (error) {
    ElMessage.error('保存失败：' + (error.message || '未知错误'))
  } finally {
    saving.value = false
  }
}

const editCharacter = (character) => {
  // 填充表单数据
  Object.assign(characterForm, {
    name: character.name || '',
    description: character.description || '',
    age: character.age || '',
    gender: character.gender || '',
    role_type: character.role || '',
    appearance: character.appearance || '',
    personality: character.personality || '',
    background: character.background || '',
    novel_id: character.novel_id || novelData.id
  })
  
  // 设置编辑模式
  editingCharacterId.value = character.id
  showCharacterDialog.value = true
}

const deleteCharacter = async (characterId) => {
  try {
    await ElMessageBox.confirm('确定要删除这个人物吗？', '确认删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await characterAPI.deleteCharacter(characterId)
    
    const index = characters.value.findIndex(c => c.id === characterId)
    if (index !== -1) {
      characters.value.splice(index, 1)
      ElMessage.success('人物删除成功')
    }
  } catch (error) {
    if (error.message) {
      ElMessage.error('删除失败：' + error.message)
    }
    // 用户取消删除时不显示错误
  }
}

// 世界观管理方法
const addWorldSetting = () => {
  // 重置表单
  Object.assign(worldviewForm, {
    name: '',
    description: '',
    geography: '',
    history: '',
    culture: '',
    magic_system: '',
    novel_id: novelData.id
  })
  editingWorldviewId.value = null
  showWorldviewDialog.value = true
}

const saveWorldview = async () => {
  if (!worldviewForm.name.trim()) {
    ElMessage.warning('请输入设定名称')
    return
  }
  
  try {
    saving.value = true
    
    if (editingWorldviewId.value) {
      // 编辑模式
      const result = await worldviewAPI.updateWorldview(editingWorldviewId.value, worldviewForm)
      const index = worldviews.value.findIndex(w => w.id === editingWorldviewId.value)
      if (index !== -1) {
        worldviews.value[index] = result.data
      }
      ElMessage.success('世界观设定更新成功')
    } else {
      // 新增模式
      const result = await worldviewAPI.createWorldview(worldviewForm)
      worldviews.value.push(result.data)
      ElMessage.success('世界观设定添加成功')
    }
    
    showWorldviewDialog.value = false
    editingWorldviewId.value = null
  } catch (error) {
    ElMessage.error('保存失败：' + (error.message || '未知错误'))
  } finally {
    saving.value = false
  }
}

const editWorldItem = (item) => {
  // 填充表单数据
  Object.assign(worldviewForm, {
    name: item.name || '',
    description: item.description || '',
    geography: item.geography || '',
    history: item.history || '',
    culture: item.culture || '',
    magic_system: item.magic_system || '',
    novel_id: item.novel_id || novelData.id
  })
  
  // 设置编辑模式
  editingWorldviewId.value = item.id
  showWorldviewDialog.value = true
}

const deleteWorldItem = async (itemId) => {
  try {
    await ElMessageBox.confirm('确定要删除这个设定吗？', '确认删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await worldviewAPI.deleteWorldview(itemId)
    
    const index = worldviews.value.findIndex(item => item.id === itemId)
    if (index !== -1) {
      worldviews.value.splice(index, 1)
      ElMessage.success('设定删除成功')
    }
  } catch (error) {
    if (error.message) {
      ElMessage.error('删除失败：' + error.message)
    }
    // 用户取消删除时不显示错误
  }
}

// 事件线管理方法
const addTimelineEvent = () => {
  // 重置表单
  Object.assign(timelineForm, {
    name: '',
    description: '',
    event_type: 'main',
    locations: '',
    key_events: '',
    novel_id: novelData.id
  })
  editingTimelineId.value = null
  showTimelineDialog.value = true
}

const saveTimelineEvent = async () => {
  if (!timelineForm.name.trim()) {
    ElMessage.warning('请输入事件名称')
    return
  }
  
  try {
    saving.value = true
    
    if (editingTimelineId.value) {
      // 编辑模式
      await timelineAPI.updateEvent(editingTimelineId.value, timelineForm)
      ElMessage.success('事件更新成功')
    } else {
      // 新增模式
      await timelineAPI.createEvent(timelineForm)
      ElMessage.success('事件添加成功')
    }
    
    // 重新加载事件线数据以确保数据一致性
    const timelineResponse = await timelineAPI.getEvents({ novel_id: novelData.id })
    timelineEvents.value = timelineResponse.data?.timelines || []
    
    showTimelineDialog.value = false
    editingTimelineId.value = null
  } catch (error) {
    ElMessage.error('保存失败：' + (error.message || '未知错误'))
  } finally {
    saving.value = false
  }
}

const editTimelineEvent = (event) => {
  // 填充表单数据
  Object.assign(timelineForm, {
    name: event.name || '',
    description: event.description || '',
    event_type: event.event_type || 'main',
    locations: event.locations || '',
    key_events: event.key_events || '',
    novel_id: event.novel_id || novelData.id
  })
  
  // 设置编辑模式
  editingTimelineId.value = event.id
  showTimelineDialog.value = true
}

const deleteTimelineEvent = async (eventId) => {
  if (!eventId) {
    ElMessage.warning('无效的事件ID')
    return
  }
  
  try {
    await ElMessageBox.confirm('确定要删除这个事件吗？', '确认删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await timelineAPI.deleteEvent(eventId)
    
    const index = timelineEvents.value.findIndex(e => e.id === eventId)
    if (index !== -1) {
      timelineEvents.value.splice(index, 1)
      ElMessage.success('事件删除成功')
    }
  } catch (error) {
    if (error.message) {
      ElMessage.error('删除失败：' + error.message)
    }
    // 用户取消删除时不显示错误
  }
}

// 事件线辅助方法
const getEventTypeClass = (eventType) => {
  const typeClassMap = {
    'main': 'event-marker-main',
    'side': 'event-marker-side',
    'background': 'event-marker-background'
  }
  return typeClassMap[eventType] || 'event-marker-default'
}

const getEventTypeTagType = (eventType) => {
  const typeMap = {
    'main': 'primary',
    'side': 'success',
    'background': 'info'
  }
  return typeMap[eventType] || 'info'
}

const getEventTypeDisplayName = (eventType) => {
  const displayMap = {
    'main': '主线',
    'side': '支线',
    'background': '背景'
  }
  return displayMap[eventType] || '未分类'
}



const hasEventDetails = (event) => {
  return event.estimated_duration || event.actual_duration ||
         event.locations || event.key_events || event.themes
}

const formatArrayField = (field) => {
  if (!field) return '未设定'
  if (Array.isArray(field)) {
    return field.join(', ')
  }
  if (typeof field === 'string') {
    try {
      const parsed = JSON.parse(field)
      if (Array.isArray(parsed)) {
        return parsed.join(', ')
      }
    } catch (e) {
      // 如果解析失败，直接返回字符串
    }
  }
  return field.toString()
}

const formatDate = (dateString) => {
  if (!dateString) return '未设定'
  try {
    const date = new Date(dateString)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  } catch (e) {
    return '无效日期'
  }
}

// 角色标签转换为中文
const getRoleText = (role) => {
  const roleMap = {
    'protagonist': '主角',
    'antagonist': '反派',
    'supporting': '配角'
  }
  return roleMap[role] || '未设定角色'
}

// 语料库管理方法
// 获取内容类型中文显示名称
const getContentTypeDisplayName = (contentType) => {
  const displayMap = {
    'reference': '参考',
    'description': '描写',
    'dialogue': '对话',
    'plot': '情节'
  }
  return displayMap[contentType] || '未分类'
}

const addCorpusItem = () => {
  // 重置表单
  Object.assign(corpusForm, {
    title: '',
    content: '',
    content_type: 'reference',
    novel_id: novelData.id
  })
  editingCorpusId.value = null
  showCorpusDialog.value = true
}

const saveCorpus = async () => {
  if (!corpusFormRef.value) return
  
  try {
    // 表单验证
    const isValid = await corpusFormRef.value.validate().catch(err => {
      console.log('表单验证失败:', err)
      return false
    })
    
    if (!isValid) {
      ElMessage.error('请填写完整的表单信息')
      return
    }
    
    saving.value = true
    // 计算字数
    corpusForm.word_count = corpusForm.content.length
    
    if (editingCorpusId.value) {
      // 编辑模式
      const result = await corpusAPI.updateCorpus(editingCorpusId.value, corpusForm)
      const index = corpusItems.value.findIndex(c => c.id === editingCorpusId.value)
      if (index !== -1) {
        corpusItems.value[index] = result.data
      }
      ElMessage.success('语料素材更新成功')
    } else {
      // 新增模式
      const result = await corpusAPI.createCorpus(corpusForm)
      corpusItems.value.push(result.data)
      ElMessage.success('语料素材添加成功')
    }
    
    showCorpusDialog.value = false
    editingCorpusId.value = null
  } catch (error) {
    // 打印完整错误信息到控制台，便于调试
    console.error('saveCorpus 错误详情:', error)
    
    // 表单验证失败的处理
    if (error && typeof error === 'object' && error.fields) {
      // Element Plus 表单验证错误
      const firstError = Object.values(error.fields)[0][0]
      ElMessage.error(firstError.message)
      return // 表单验证错误时直接返回，不继续执行
    } else if (error.response) {
      // HTTP 响应错误
      const errorMsg = error.response.data?.message || error.response.statusText || `HTTP ${error.response.status} 错误`
      ElMessage.error('保存失败：' + errorMsg)
    } else if (error.request) {
      // 网络请求错误
      ElMessage.error('网络请求失败，请检查网络连接')
    } else {
      // 其他错误
      ElMessage.error('保存失败：' + (error.message || '发生未知错误，请查看控制台获取详细信息'))
    }
  } finally {
    saving.value = false
  }
}

const editCorpusItem = (item) => {
  // 填充表单数据
  Object.assign(corpusForm, {
    title: item.title || '',
    content: item.content || '',
    content_type: item.content_type || 'reference',
    genre_type: item.genre_type || 'novel',

    novel_id: item.novel_id || novelData.id
  })
  
  // 设置编辑模式
  editingCorpusId.value = item.id
  showCorpusDialog.value = true
}

const deleteCorpusItem = async (itemId) => {
  try {
    await ElMessageBox.confirm('确定要删除这个素材吗？', '确认删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await corpusAPI.deleteCorpus(itemId)
    
    const index = corpusItems.value.findIndex(item => item.id === itemId)
    if (index !== -1) {
      corpusItems.value.splice(index, 1)
      ElMessage.success('素材删除成功')
    }
  } catch (error) {
    if (error.message) {
      ElMessage.error('删除失败：' + error.message)
    }
    // 用户取消删除时不显示错误
  }
}

const getActiveCorpusItems = () => {
  if (!corpusCategories.value.length || activeCorpusCategory.value === 1) {
    // 显示全部或没有分类时返回所有项目
    return corpusItems.value
  }
  
  const activeCategory = corpusCategories.value.find(cat => cat.id === activeCorpusCategory.value)
  if (!activeCategory) {
    return corpusItems.value
  }
  
  return corpusItems.value.filter(item => item.category === activeCategory.name)
}

// 处理键盘事件
const handleKeyDown = (event) => {
  if (event.key === 'Enter') {
    if (event.ctrlKey) {
      // Ctrl+Enter: 换行
      return // 让默认行为处理换行
    } else {
      // 单独Enter: 发送消息
      event.preventDefault()
      sendMessage()
    }
  }
}

const sendMessage = async () => {
  if (!userInput.value.trim() || isAiTyping.value) return
  
  // 检查是否选择了AI助手
  if (!currentAssistant.value.id) {
    ElMessage.warning('请先选择一个AI助手')
    return
  }
  
  const userMessage = userInput.value.trim()
  
  // 构建完整的消息内容（用户输入 + 暂存区内容）
  let fullMessage = userMessage
  
  // 如果有暂存区内容，添加到消息中
  if (selectedReferences.value.length > 0) {
    const referenceContent = selectedReferences.value
      .map(item => item.fullContent)
      .join('\n\n')
    
    fullMessage = `${userMessage}\n\n=== 引用内容 ===\n${referenceContent}`
  }
  
  // 处理@符号引用，提取引用信息
  const processedMessage = processAtReferences(fullMessage)
  
  userInput.value = ''
  closeReferencePanel()
  
  // 清空暂存区
  selectedReferences.value = []
  
  // 添加用户消息（显示原始用户输入）
  chatHistory.value.push({
    type: 'user',
    content: userMessage,
    timestamp: new Date()
  })
  
  // 确保有当前会话
  if (!currentSession.value.id) {
    await createNewSession()
  }
  
  // 如果是新会话的第一条消息，更新会话标题
  if (chatHistory.value.length === 1 && currentSession.value.name === '新建会话') {
    const newTitle = userMessage.length > 20 ? userMessage.substring(0, 20) + '...' : userMessage
    try {
      await aiConversationAPI.updateConversation(currentSession.value.id, {
        title: newTitle
      })
      currentSession.value.name = newTitle
      // 更新会话历史中的标题
      const sessionIndex = sessionHistory.value.findIndex(s => s.id === currentSession.value.id)
      if (sessionIndex !== -1) {
        sessionHistory.value[sessionIndex].name = newTitle
      }
    } catch (error) {
      console.warn('更新会话标题失败:', error)
    }
  }
  
  // 添加AI消息占位符
  const aiMessageIndex = chatHistory.value.length
  chatHistory.value.push({
    id: Date.now(),
    type: 'ai',
    content: '',
    timestamp: new Date(),
    streaming: true
  })
  
  scrollToBottom()
  
  // 发送消息到AI
  isAiTyping.value = true
  
  try {
    // 构建包含小说信息的完整内容
    let contentWithNovelInfo = processedMessage
    
    // 添加小说基本信息到content中
    const contextInfo = []
    if (novelData.title) {
      contextInfo.push(`小说标题：${novelData.title}`)
    }
    if (novelData.description) {
      contextInfo.push(`小说简介：${novelData.description}`)
    }
    
    // 添加当前章节信息
    if (currentChapter.value) {
      const chapterInfo = []
      
      // 章节编号和标题
      const chapterNumber = chapters.value.findIndex(c => c.id === currentChapter.value.id) + 1
      chapterInfo.push(`章节数：第${chapterNumber}章`)
      
      if (currentChapter.value.title) {
        chapterInfo.push(`章节名称：${currentChapter.value.title}`)
      }
      
      // 章节纲要
      if (currentChapter.value.outline) {
        chapterInfo.push(`章节纲要：${currentChapter.value.outline}`)
      }
      
      // 章节内容（获取编辑器中的最新内容）
      let currentContent = ''
      if (vditor && typeof vditor.getValue === 'function') {
        try {
          currentContent = vditor.getValue() || ''
        } catch (error) {
          console.warn('获取编辑器内容失败:', error)
          currentContent = currentChapter.value.content || ''
        }
      } else {
        currentContent = currentChapter.value.content || ''
      }
      
      if (currentContent) {
        chapterInfo.push(`章节内容：${currentContent}`)
      }
      
      contextInfo.push(`\n当前章节：${chapterInfo.join('，')}`)
    }
    
    if (contextInfo.length > 0) {
      contentWithNovelInfo = `${processedMessage}\n\n=== 小说信息 ===\n${contextInfo.join('\n')}`
    }
    
    // 直接使用fetch进行流式请求
    const userStore = useUserStore()
    const aiModelStore = useAiModelStore()
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'}/ai-chat/conversation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userStore.token}`
      },
      body: JSON.stringify({
        conversation_id: currentSession.value.id,
        content: contentWithNovelInfo,
        content_type: 'text',
        stream: true,
        assistant_id: currentAssistant.value.id,
        model_id: String(aiModelStore.selectedModelId || currentAssistant.value.model_config?.model_id || '1'),
        prompt_id: selectedPromptId.value || null,
        temperature: currentAssistant.value.model_config?.temperature || 0.8,
        attachments: [],
        metadata: {
          context: `当前正在编辑小说：${novelData.title || '未命名小说'}`
        }
      })
    })
    
    if (!response.ok) {
      // 尝试解析错误响应
      let errorMessage = `HTTP error! status: ${response.status}`
      try {
        const errorText = await response.text()
        console.log('Error response text:', errorText) // 调试日志
        const errorData = JSON.parse(errorText)
        errorMessage = errorData.message || errorMessage
      } catch (parseError) {
        console.error('Failed to parse error response:', parseError) // 调试日志
      }
      throw new Error(errorMessage)
    }
    
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || '' // 保留不完整的行
      
      for (const line of lines) {
        if (line.trim() === '') continue
        
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          
          if (data === '[DONE]') {
            chatHistory.value[aiMessageIndex].streaming = false
            break
          }
          
          try {
            const parsed = JSON.parse(data)
            if (parsed.content) {
              chatHistory.value[aiMessageIndex].content += parsed.content
              scrollToBottom()
            }
          } catch (e) {
            console.warn('解析SSE数据失败:', e, data)
          }
        }
      }
    }
    
  } catch (error) {
    console.error('发送消息失败:', error)
    // 移除失败的消息
    chatHistory.value.splice(aiMessageIndex, 1)
    ElMessage.error('AI回复失败：' + error.message)
  } finally {
    isAiTyping.value = false
  }
}

const generateAiResponse = (message, tool) => {
  // 简单的模拟回复逻辑
  const responses = {
    assistant: `关于"${message}"，我建议你可以从以下几个角度来考虑：\n\n1. 角色的内心动机\n2. 情节的逻辑性\n3. 场景的描写细节\n\n你希望我详细展开哪个方面呢？`,
    character: `关于角色"${message}"的塑造，我建议：\n\n**外貌特征：**\n- 身材修长，气质优雅\n- 眼神中带着坚毅和智慧\n\n**性格特点：**\n- 表面冷静，内心热情\n- 有强烈的正义感\n\n**背景故事：**\n- 出身书香门第\n- 经历过重大变故`,
    world: `关于世界观"${message}"的构建，我建议：\n\n**世界设定：**\n- 时代背景和历史脉络\n- 地理环境和气候特征\n\n**社会结构：**\n- 政治制度和权力分配\n- 经济体系和社会阶层\n\n**文化特色：**\n- 宗教信仰和价值观念\n- 风俗习惯和传统节日`,
    timeline: `关于事件线"${message}"的梳理，我建议：\n\n**主线情节：**\n- 起因：故事的开端和导火索\n- 发展：矛盾冲突的逐步升级\n- 高潮：关键转折点和决定性事件\n- 结局：问题解决和故事收尾\n\n**支线情节：**\n- 角色成长线\n- 感情发展线\n- 悬念揭秘线`,
    corpus: `关于语料库"${message}"的管理，我建议：\n\n**描写素材：**\n- 人物外貌和神态描写\n- 环境场景和氛围营造\n- 动作细节和心理活动\n\n**对话素材：**\n- 不同性格角色的语言特色\n- 各种情境下的对话模板\n- 方言俚语和专业术语`,
    default: `我理解你的问题"${message}"。作为你的AI写作助手，我会尽力帮助你解决创作中的困难。请告诉我更多细节，这样我能给出更准确的建议。`
  }
  
  return responses[tool] || responses.default
}

const likeMessage = (index) => {
  ElMessage.success('感谢你的反馈！')
}

const dislikeMessage = (index) => {
  ElMessage.info('我会努力改进回答质量')
}

const regenerateMessage = async (index) => {
  if (isAiTyping.value) return
  
  const aiMessage = chatHistory.value[index]
  if (!aiMessage || aiMessage.type !== 'ai') return
  
  isAiTyping.value = true
  
  try {
    // 重置消息内容并设置为流式状态
    chatHistory.value[index].content = ''
    chatHistory.value[index].streaming = true
    
    // 直接使用fetch进行流式请求
    const userStore = useUserStore()
    const aiModelStore = useAiModelStore()
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'}/ai-chat/regenerate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userStore.token}`
      },
      body: JSON.stringify({
        conversation_id: currentSession.value.id,
        message_id: aiMessage.id,
        assistant_id: currentAssistant.value.id,
        stream: true
      })
    })
    
    if (!response.ok) {
      // 尝试解析错误响应
      let errorMessage = `HTTP error! status: ${response.status}`
      try {
        const errorText = await response.text()
        console.log('Regenerate error response text:', errorText) // 调试日志
        const errorData = JSON.parse(errorText)
        errorMessage = errorData.message || errorMessage
      } catch (parseError) {
        console.error('Failed to parse regenerate error response:', parseError) // 调试日志
      }
      throw new Error(errorMessage)
    }
    
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || '' // 保留不完整的行
      
      for (const line of lines) {
        if (line.trim() === '') continue
        
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          
          if (data === '[DONE]') {
            chatHistory.value[index].streaming = false
            break
          }
          
          try {
            const parsed = JSON.parse(data)
            if (parsed.content) {
              chatHistory.value[index].content += parsed.content
              scrollToBottom()
            }
          } catch (e) {
            console.warn('解析SSE数据失败:', e, data)
          }
        }
      }
    }
    
    ElMessage.success('已重新生成回答')
  } catch (error) {
    console.error('重新生成失败:', error)
    chatHistory.value[index].streaming = false
    ElMessage.error('重新生成失败：' + error.message)
  } finally {
    isAiTyping.value = false
  }
}

const copyMessage = async (content) => {
  try {
    await navigator.clipboard.writeText(content)
    ElMessage.success('已复制到剪贴板')
  } catch (error) {
    ElMessage.error('复制失败')
  }
}

const insertToEditor = (content) => {
  try {
    if (vditor && typeof vditor.insertValue === 'function') {
      vditor.insertValue(content)
      ElMessage.success('内容已插入到编辑器')
    } else {
      ElMessage.warning('编辑器未准备就绪')
    }
  } catch (error) {
    ElMessage.error('插入失败')
  }
}

// 格式化时间
const formatTime = (timestamp) => {
  if (!timestamp) return ''
  
  const date = new Date(timestamp)
  // 检查日期是否有效
  if (isNaN(date.getTime())) {
    return ''
  }
  
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.floor((today - messageDate) / (24 * 60 * 60 * 1000))
  
  const timeStr = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  
  if (diffDays === 0) {
    // 今天
    return timeStr
  } else if (diffDays === 1) {
    // 昨天
    return '昨天 ' + timeStr
  } else {
    // 其他日期
    return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }) + ' ' + timeStr
  }
}

const scrollToBottom = () => {
  nextTick(() => {
    if (chatMessages.value) {
      chatMessages.value.scrollTop = chatMessages.value.scrollHeight
    }
  })
}

// 会话管理方法
const handleSessionCommand = async (command) => {
  if (command === 'new') {
    // 新增会话
    await createNewSession()
    ElMessage.success('新会话已创建')
  } else if (command === 'manage') {
     // 会话管理
     showSessionDialog.value = true
  } else {
    // 切换到指定会话
    const session = sessionHistory.value.find(s => s.id === command)
    if (session) {
      await switchSession(session)
      ElMessage.success(`已切换到 ${session.name}`)
    }
  }
}

// 切换会话
const switchSession = async (session) => {
  if (currentSession.value.id === session.id) {
    return // 已经是当前会话
  }
  
  try {
    currentSession.value = session
    await loadSessionMessages(session.id)
    showSessionDialog.value = false
    ElMessage.success(`已切换到会话: ${session.name}`)
  } catch (error) {
    ElMessage.error('切换会话失败：' + error.message)
  }
}

// 编辑会话
const editSession = (session) => {
  renamingSession.value = { ...session }
  showRenameDialog.value = true
}

// 删除会话
const deleteSession = async (sessionId) => {
  try {
    await ElMessageBox.confirm('确定要删除这个会话吗？', '确认删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await aiConversationAPI.deleteConversation(sessionId)
    
    const index = sessionHistory.value.findIndex(s => s.id === sessionId)
    if (index !== -1) {
      sessionHistory.value.splice(index, 1)
      
      // 如果删除的是当前会话，切换到第一个会话或创建新会话
      if (currentSession.value.id === sessionId) {
        if (sessionHistory.value.length > 0) {
          currentSession.value = sessionHistory.value[0]
          await loadSessionMessages(currentSession.value.id)
        } else {
          await createNewSession()
        }
      }
      
      ElMessage.success('会话已删除')
    }
  } catch (error) {
    if (error.message) {
      ElMessage.error('删除失败：' + error.message)
    }
    // 用户取消删除时不显示错误
  }
}

// 保存会话名称
const saveSessionName = async () => {
  if (!renamingSession.value.name.trim()) {
    ElMessage.warning('请输入会话名称')
    return
  }
  
  try {
    await aiConversationAPI.updateConversation(renamingSession.value.id, {
      title: renamingSession.value.name
    })
    
    const session = sessionHistory.value.find(s => s.id === renamingSession.value.id)
    if (session) {
      session.name = renamingSession.value.name
      if (currentSession.value.id === session.id) {
        currentSession.value.name = session.name
      }
    }
    
    ElMessage.success('会话名称已更新')
    showRenameDialog.value = false
  } catch (error) {
    ElMessage.error('重命名失败：' + error.message)
  }
}

// 处理@符号引用的方法
const processAtReferences = (message) => {
  // 匹配@符号引用格式：@名称[类型:ID]
  const atReferenceRegex = /@([^\[]+)\[([^:]+):(\d+)\]/g
  let processedMessage = message
  const references = []
  
  let match
  while ((match = atReferenceRegex.exec(message)) !== null) {
    const [fullMatch, name, type, id] = match
    references.push({ name, type, id: parseInt(id) })
  }
  
  if (references.length > 0) {
    // 构建引用信息
    let referenceInfo = '\n\n【引用信息】\n'
    
    references.forEach(ref => {
      let details = ''
      
      switch (ref.type) {
        case 'character':
          const character = characters.value.find(c => c.id === ref.id)
          if (character) {
            details = `人物：${character.name}\n`
            if (character.description) details += `描述：${character.description}\n`
            if (character.personality) details += `性格：${character.personality}\n`
            if (character.background) details += `背景：${character.background}\n`
          }
          break
          
        case 'worldview':
          const worldview = worldviews.value.find(w => w.id === ref.id)
          if (worldview) {
            details = `世界观：${worldview.name}\n`
            if (worldview.description) details += `描述：${worldview.description}\n`
            if (worldview.geography) details += `地理：${worldview.geography}\n`
            if (worldview.culture) details += `文化：${worldview.culture}\n`
          }
          break
          
        case 'timeline':
          const timeline = timelineEvents.value.find(t => t.id === ref.id)
          if (timeline) {
            details = `事件线：${timeline.name}\n`
            if (timeline.description) details += `描述：${timeline.description}\n`
            if (timeline.key_events) details += `关键事件：${timeline.key_events}\n`
          }
          break
          
        case 'corpus':
          const corpus = corpusItems.value.find(c => c.id === ref.id)
          if (corpus) {
            details = `语料库：${corpus.title}\n`
            if (corpus.content) details += `内容：${corpus.content}\n`

          }
          break
      }
      
      if (details) {
        referenceInfo += details + '\n'
      }
    })
    
    // 将引用的@标记替换为普通文本
    processedMessage = message.replace(atReferenceRegex, '@$1')
    processedMessage += referenceInfo
  }
  
  return processedMessage
}

// 引用面板相关方法
const openReferencePanel = (type) => {
  activeReferenceType.value = type
  showReferencePanel.value = true
  referenceSearchText.value = ''
}

const closeReferencePanel = () => {
  showReferencePanel.value = false
  activeReferenceType.value = ''
  referenceSearchText.value = ''
}

const selectReference = (item) => {
  // 检查是否已经添加过该项目
  const existingIndex = selectedReferences.value.findIndex(
    ref => ref.type === activeReferenceType.value && ref.id === item.id
  )
  
  if (existingIndex !== -1) {
    ElMessage.warning('该项目已经添加到暂存区')
    return
  }
  
  // 添加到暂存区
  const referenceItem = {
    id: item.id,
    type: activeReferenceType.value,
    name: item.name || item.title,
    description: getReferenceDescription(item),
    fullContent: getFullReferenceContent(item)
  }
  
  selectedReferences.value.push(referenceItem)
  closeReferencePanel()
  
  // 自动显示暂存区
  showStagingArea.value = true
  
  ElMessage.success(`已添加${getReferenceTypeLabel(activeReferenceType.value)}：${referenceItem.name}`)
}

const getReferenceTypeLabel = (type) => {
  const labels = {
    'character': '人物',
    'worldview': '世界观',
    'timeline': '事件线',
    'corpus': '语料库',
    'chapter': '章节'
  }
  return labels[type] || ''
}

const getReferenceIcon = (type) => {
  const icons = {
    'character': User,
    'worldview': FolderOpened,
    'timeline': List,
    'corpus': Collection,
    'chapter': Document
  }
  return icons[type] || User
}

const getReferenceDescription = (item) => {
  if (item.description) {
    return item.description.length > 50 ? item.description.substring(0, 50) + '...' : item.description
  }
  if (item.content) {
    return item.content.length > 50 ? item.content.substring(0, 50) + '...' : item.content
  }
  if (item.personality) {
    return item.personality.length > 50 ? item.personality.substring(0, 50) + '...' : item.personality
  }
  return '暂无描述'
}

const getFullReferenceContent = (item) => {
  let content = `【${item.name || item.title}】\n`
  
  switch (activeReferenceType.value) {
    case 'character':
      content += `类型：人物\n`
      if (item.description) content += `描述：${item.description}\n`
      if (item.age) content += `年龄：${item.age}\n`
      if (item.gender) content += `性别：${item.gender}\n`
      if (item.role_type) content += `角色类型：${item.role_type}\n`
      if (item.appearance) content += `外貌：${item.appearance}\n`
      if (item.personality) content += `性格：${item.personality}\n`
      if (item.background) content += `背景：${item.background}\n`
      break
    case 'worldview':
      content += `类型：世界观\n`
      if (item.description) content += `描述：${item.description}\n`
      if (item.geography) content += `地理环境：${item.geography}\n`
      if (item.history) content += `历史背景：${item.history}\n`
      if (item.culture) content += `文化特色：${item.culture}\n`
      if (item.magic_system) content += `魔法体系：${item.magic_system}\n`
      break
    case 'timeline':
      content += `类型：事件线\n`
      if (item.description) content += `描述：${item.description}\n`
      if (item.event_type) content += `事件类型：${item.event_type}\n`
      if (item.locations) content += `地点：${item.locations}\n`
      if (item.key_events) content += `关键事件：${item.key_events}\n`
      break
    case 'corpus':
      content += `类型：语料库\n`
      if (item.content) content += `内容：${item.content}\n`
      if (item.content_type) content += `内容类型：${item.content_type}\n`
      if (item.genre_type) content += `体裁类型：${item.genre_type}\n`

      break
    case 'chapter':
      content += `类型：章节\n`
      if (item.content) content += `内容：${item.content}\n`
      if (item.wordCount) content += `字数：${item.wordCount}\n`
      if (item.status) content += `状态：${item.status}\n`
      if (item.createdAt) content += `创建时间：${item.createdAt}\n`
      break
  }
  
  return content
}

// 清空暂存区
const clearSelectedReferences = () => {
  selectedReferences.value = []
  ElMessage.success('已清空暂存区')
}

// 移除单个暂存项
const removeSelectedReference = (index) => {
  const item = selectedReferences.value[index]
  selectedReferences.value.splice(index, 1)
  ElMessage.success(`已移除${getReferenceTypeLabel(item.type)}：${item.name}`)
}

// Prompt选择相关方法
const loadAvailablePrompts = async () => {
  try {
    promptLoading.value = true
    const response = await promptAPI.getPrompts({
      page: 1,
      limit: 100, // 获取更多数据用于选择
      is_public: true, // 只获取公开的prompt
      status: 'active' // 只获取激活状态的prompt
    })
    
    // 处理API响应数据结构
    if (response.data && response.data.prompts) {
      availablePrompts.value = response.data.prompts
    } else if (Array.isArray(response.data)) {
      availablePrompts.value = response.data
    } else {
      availablePrompts.value = []
    }
  } catch (error) {
    console.error('加载Prompt列表失败:', error)
    ElMessage.error('加载Prompt列表失败')
    availablePrompts.value = []
  } finally {
    promptLoading.value = false
  }
}

const handlePromptChange = (promptId) => {
  if (promptId) {
    const prompt = availablePrompts.value.find(p => p.id === promptId)
    if (prompt) {
      ElMessage.success(`已选择Prompt: ${prompt.name}`)
    }
  } else {
    ElMessage.info('已清除Prompt选择')
  }
}

// 提示词弹窗相关方法
const openPromptDialog = () => {
  showPromptDialog.value = true
  // 重置搜索和筛选
  promptSearchText.value = ''
  selectedCategory.value = 'all'
}

const closePromptDialog = () => {
  showPromptDialog.value = false
}

const selectPrompt = (prompt) => {
  selectedPromptId.value = prompt.id
  selectedPromptName.value = prompt.name
  showPromptDialog.value = false
  handlePromptChange(prompt.id)
}

const clearPromptSelection = () => {
  selectedPromptId.value = null
  selectedPromptName.value = ''
  showPromptDialog.value = false
  handlePromptChange(null)
}

const confirmPromptSelection = () => {
  if (selectedPromptId.value) {
    const prompt = availablePrompts.value.find(p => p.id === selectedPromptId.value)
    if (prompt) {
      selectedPromptName.value = prompt.name
    }
  }
  showPromptDialog.value = false
}

const handlePromptDialogClose = () => {
  showPromptDialog.value = false
}

// 将英文类型转换为中文
const getPromptTypeLabel = (category) => {
  const labelMap = {
    'outline': '大纲',
    'synopsis': '简介',
    'detailed_outline': '细纲',
    'basic_text': '基础正文',
    'scene': '场景描写',
    'action_plot': '动作情节',
    'psychology': '心理描写',
    'smart_continue': '智能续写',
    'polish': '润色优化',
    'character': '人物生成',
    'rewrite': '改写',
    'golden_title': '黄金标题',
    'golden_finger': '金手指',
    'golden_opening': '黄金开篇',
    'inspiration': '灵感激发',
    'worldview': '世界观生成',
    'brainstorm': '脑洞生成',
    'short_writing': '短文写作',
    'short_story': '短篇小说',
    'book_analysis': '拆书分析'
  }
  return labelMap[category] || category
}

const getPromptTypeColor = (category) => {
  const colorMap = {
    'outline': 'primary',
    'synopsis': 'success',
    'detailed_outline': 'warning',
    'basic_text': 'info',
    'scene': 'success',
    'action_plot': 'danger',
    'psychology': 'warning',
    'smart_continue': 'primary',
    'polish': 'success',
    'character': 'success',
    'rewrite': 'warning',
    'golden_title': 'danger',
    'golden_finger': 'warning',
    'golden_opening': 'primary',
    'inspiration': 'success',
    'worldview': 'warning',
    'brainstorm': 'info',
    'short_writing': 'info',
    'short_story': 'danger',
    'book_analysis': 'primary'
  }
  return colorMap[category] || 'info'
}

// 内容插入相关方法
const handleInsertContent = async (command) => {
  const { type, message, index } = command
  
  try {
    const content = message.content
    
    // 首先尝试提取JSON格式数据
    let jsonData = extractJsonFromContent(content, type)
    
    // 如果没有找到JSON数据，则尝试从文本内容中智能提取
    if (!jsonData) {
      jsonData = extractDataFromText(content, type)
    }
    
    if (!jsonData || (Array.isArray(jsonData) && jsonData.length === 0)) {
      ElMessage.warning(`无法从消息中提取有效的${getTypeLabel(type)}数据，请确保AI回复包含相关内容`)
      return
    }
    
    // 设置预览数据并显示预览弹窗
    const dataArray = Array.isArray(jsonData) ? jsonData : [jsonData]
    
    // 处理数组字段转换为文本字段（用于预览显示）
    if (type === 'character') {
      dataArray.forEach(item => {
        // 将数组字段转换为文本字段用于预览
        if (Array.isArray(item.skills) && !item.skills_text) {
          item.skills_text = item.skills.join(', ')
        }
        if (Array.isArray(item.strengths) && !item.strengths_text) {
          item.strengths_text = item.strengths.join(', ')
        }
        if (Array.isArray(item.weaknesses) && !item.weaknesses_text) {
          item.weaknesses_text = item.weaknesses.join(', ')
        }
        if (Array.isArray(item.fears) && !item.fears_text) {
          item.fears_text = item.fears.join(', ')
        }
        if (Array.isArray(item.desires) && !item.desires_text) {
          item.desires_text = item.desires.join(', ')
        }
        if (Array.isArray(item.tags) && !item.tags_text) {
          item.tags_text = item.tags.join(', ')
        }
        if (typeof item.relationships === 'object' && item.relationships && !item.relationships_text) {
          const relationshipTexts = []
          for (const [type, person] of Object.entries(item.relationships)) {
            relationshipTexts.push(`${type}:${person}`)
          }
          item.relationships_text = relationshipTexts.join('; ')
        }
      })
    }
    
    previewData.value = dataArray
    previewContentType.value = type
    
    // 确保数据正确设置后再显示对话框
    await nextTick()
    showPreviewDialog.value = true
    
    console.log('预览数据设置完成:', {
      type: type,
      dataCount: dataArray.length,
      firstItem: dataArray[0]
    })
    
  } catch (error) {
    console.error('插入内容失败:', error)
    ElMessage.error(`插入${getTypeLabel(type)}失败: ${error.message}`)
  }
}

const extractJsonFromContent = (content, type) => {
  try {
    // 尝试多种JSON提取方式
    const patterns = [
      // 标准JSON格式
      /```json\s*([\s\S]*?)\s*```/g,
      // 代码块格式
      /```([\s\S]*?)```/g,
      // 直接JSON格式
      /{[\s\S]*}/g
    ]
    
    for (const pattern of patterns) {
      const matches = content.match(pattern)
      if (matches) {
        for (const match of matches) {
          try {
            const jsonStr = match.replace(/```json|```/g, '').trim()
            const parsed = JSON.parse(jsonStr)
            
            // 验证JSON数据格式是否符合预期
            if (validateJsonFormat(parsed, type)) {
              return parsed
            }
          } catch (e) {
            continue
          }
        }
      }
    }
    
    return null
  } catch (error) {
    console.error('JSON解析失败:', error)
    return null
  }
}

// 从文本内容中智能提取数据
const extractDataFromText = (content, type) => {
  try {
    switch (type) {
      case 'character':
        return extractCharactersFromText(content)
      case 'worldview':
        return extractWorldviewsFromText(content)
      case 'timeline':
        return extractTimelinesFromText(content)
      case 'corpus':
        return extractCorpusFromText(content)
      case 'chapter':
        return extractChaptersFromText(content)
      default:
        return null
    }
  } catch (error) {
    console.error('文本数据提取失败:', error)
    return null
  }
}

// 从文本中提取人物信息
const extractCharactersFromText = (content) => {
  const characters = []
  
  // 尝试解析结构化的人物信息
  const lines = content.split('\n')
  let currentCharacter = null
  
  for (const line of lines) {
    const trimmedLine = line.trim()
    if (!trimmedLine) continue
    
    // 检测新人物开始 - 更宽松的匹配规则
    const nameMatch = trimmedLine.match(/(?:姓名|名字|人物名称?|角色)[:：]\s*(.+)/i) ||
                     trimmedLine.match(/^\d+[.、]\s*(.+)/) ||
                     trimmedLine.match(/^[-*•]\s*(.+)/) ||
                     trimmedLine.match(/^【(.+?)】/) ||
                     trimmedLine.match(/^《(.+?)》/) ||
                     trimmedLine.match(/^人物\d*[:：]?\s*(.+)/i) ||
                     trimmedLine.match(/^角色\d*[:：]?\s*(.+)/i)
    
    // 如果是明显的人物名称格式
    const isCharacterName = /^[\u4e00-\u9fa5a-zA-Z]{2,8}[:：]/.test(trimmedLine) ||
                           /^\d+[.、][\u4e00-\u9fa5a-zA-Z]{2,8}/.test(trimmedLine)
    
    if (nameMatch || isCharacterName) {
      // 保存上一个人物
      if (currentCharacter && currentCharacter.name) {
        characters.push(currentCharacter)
      }
      
      let characterName = ''
      if (nameMatch) {
        characterName = nameMatch[1].trim()
      } else if (isCharacterName) {
        // 提取人物名称
        const nameExtract = trimmedLine.match(/^(?:\d+[.、])?([\u4e00-\u9fa5a-zA-Z]{2,8})/)
        characterName = nameExtract ? nameExtract[1] : trimmedLine.split(/[:：]/)[0]
      }
      
      // 清理名称，移除多余字符
      characterName = characterName.replace(/[：:()（）【】《》""'']/g, '').trim()
      
      if (characterName && characterName.length >= 2) {
        // 开始新人物
        currentCharacter = {
          name: characterName,
          nickname: '',
          role: 'supporting', // 默认配角
          gender: '',
          age: '',
          age_range: '',
          occupation: '',
          title: '',
          description: '',
          appearance: '',
          personality: '',
          background: '',
          motivation: '',
          skills: [],
          skills_text: '',
          relationships: {},
          relationships_text: '',
          character_arc: '',
          dialogue_style: '',
          catchphrase: '',
          strengths: [],
          strengths_text: '',
          weaknesses: [],
          weaknesses_text: '',
          fears: [],
          fears_text: '',
          desires: [],
          desires_text: '',
          importance_level: 5,
          first_appearance_chapter: 1,
          status: 'active',
          tags: [],
          tags_text: '',
          novel_id: novelData.id
        }
      }
      continue
    }
    
    // 如果有当前人物，尝试提取其他信息
    if (currentCharacter) {
      // 年龄
      const ageMatch = trimmedLine.match(/(?:年龄|岁数?)[:：]?\s*(\d+)/i)
      if (ageMatch) {
        currentCharacter.age = ageMatch[1]
        continue
      }
      
      // 性别
      const genderMatch = trimmedLine.match(/(?:性别)[:：]?\s*(男|女|其他)/i)
      if (genderMatch) {
        const genderMap = { '男': 'male', '女': 'female', '其他': 'other' }
        currentCharacter.gender = genderMap[genderMatch[1]] || ''
        continue
      }
      
      // 角色类型
      const roleMatch = trimmedLine.match(/(?:角色|类型|身份)[:：]?\s*(主角|配角|反派|主要|次要)/i)
      if (roleMatch) {
        const roleMap = {
          '主角': 'protagonist',
          '配角': 'supporting', 
          '反派': 'antagonist',
          '主要': 'protagonist',
          '次要': 'supporting'
        }
        currentCharacter.role = roleMap[roleMatch[1]] || 'supporting'
        continue
      }
      
      // 昵称
      const nicknameMatch = trimmedLine.match(/(?:昵称|别名|绰号)[:：]\s*(.+)/i)
      if (nicknameMatch) {
        currentCharacter.nickname = nicknameMatch[1].trim()
        continue
      }
      
      // 职业
      const occupationMatch = trimmedLine.match(/(?:职业|工作|职务)[:：]\s*(.+)/i)
      if (occupationMatch) {
        currentCharacter.occupation = occupationMatch[1].trim()
        continue
      }
      
      // 头衔
      const titleMatch = trimmedLine.match(/(?:头衔|称号|职位)[:：]\s*(.+)/i)
      if (titleMatch) {
        currentCharacter.title = titleMatch[1].trim()
        continue
      }
      
      // 动机
      const motivationMatch = trimmedLine.match(/(?:动机|目标|愿望)[:：]\s*(.+)/i)
      if (motivationMatch) {
        currentCharacter.motivation = motivationMatch[1].trim()
        continue
      }
      
      // 技能
      const skillsMatch = trimmedLine.match(/(?:技能|能力|特长)[:：]\s*(.+)/i)
      if (skillsMatch) {
        currentCharacter.skills_text = skillsMatch[1].trim()
        currentCharacter.skills = skillsMatch[1].split(/[,，、]/).map(s => s.trim()).filter(s => s)
        continue
      }
      
      // 优点
      const strengthsMatch = trimmedLine.match(/(?:优点|长处|优势)[:：]\s*(.+)/i)
      if (strengthsMatch) {
        currentCharacter.strengths_text = strengthsMatch[1].trim()
        currentCharacter.strengths = strengthsMatch[1].split(/[,，、]/).map(s => s.trim()).filter(s => s)
        continue
      }
      
      // 缺点
      const weaknessesMatch = trimmedLine.match(/(?:缺点|弱点|不足)[:：]\s*(.+)/i)
      if (weaknessesMatch) {
        currentCharacter.weaknesses_text = weaknessesMatch[1].trim()
        currentCharacter.weaknesses = weaknessesMatch[1].split(/[,，、]/).map(s => s.trim()).filter(s => s)
        continue
      }
      
      // 外貌
      const appearanceMatch = trimmedLine.match(/(?:外貌|长相|外表)[:：]\s*(.+)/i)
      if (appearanceMatch) {
        currentCharacter.appearance = appearanceMatch[1].trim()
        continue
      }
      
      // 性格
      const personalityMatch = trimmedLine.match(/(?:性格|个性|特点)[:：]\s*(.+)/i)
      if (personalityMatch) {
        currentCharacter.personality = personalityMatch[1].trim()
        continue
      }
      
      // 背景
      const backgroundMatch = trimmedLine.match(/(?:背景|经历|出身)[:：]\s*(.+)/i)
      if (backgroundMatch) {
        currentCharacter.background = backgroundMatch[1].trim()
        continue
      }
      
      // 描述（通用）
      const descMatch = trimmedLine.match(/(?:描述|简介|介绍)[:：]\s*(.+)/i)
      if (descMatch) {
        currentCharacter.description = descMatch[1].trim()
        continue
      }
      
      // 如果没有匹配到特定字段，添加到描述中
      if (trimmedLine.length > 5 && !trimmedLine.includes('：') && !trimmedLine.includes(':')) {
        if (currentCharacter.description) {
          currentCharacter.description += ' ' + trimmedLine
        } else {
          currentCharacter.description = trimmedLine
        }
      }
    }
  }
  
  // 保存最后一个人物
  if (currentCharacter && currentCharacter.name) {
    characters.push(currentCharacter)
  }
  
  // 如果没有提取到结构化数据，尝试简单提取
  if (characters.length === 0) {
    // 尝试多种模式提取人物名称
    const patterns = [
      /([\u4e00-\u9fa5a-zA-Z]{2,8})(?=是|，|。|\s|的|在|有|说|道|问|答|笑|哭|走|来|去)/g,
      /"([\u4e00-\u9fa5a-zA-Z]{2,8})"/g,
      /'([\u4e00-\u9fa5a-zA-Z]{2,8})'/g,
      /【([\u4e00-\u9fa5a-zA-Z]{2,8})】/g,
      /《([\u4e00-\u9fa5a-zA-Z]{2,8})》/g,
      /([\u4e00-\u9fa5a-zA-Z]{2,8})[:：]/g
    ]
    
    const allMatches = new Set()
    patterns.forEach(pattern => {
      const matches = content.match(pattern)
      if (matches) {
        matches.forEach(match => {
          const name = match.replace(/["'【】《》：:]/g, '').trim()
          if (name.length >= 2 && name.length <= 8) {
            allMatches.add(name)
          }
        })
      }
    })
    
    // 过滤掉常见的非人名词汇
    const excludeWords = ['小说', '故事', '情节', '角色', '人物', '主角', '配角', '反派', '世界', '背景', '设定', '描述', '介绍', '内容', '文本', '回复', '生成', '创建', '修改', '删除', '保存', '确认', '取消', '关闭', '打开', '编辑', '查看', '搜索', '筛选', '排序', '分页', '列表', '详情', '信息', '数据', '字段', '属性', '参数', '配置', '选项', '功能', '操作', '按钮', '菜单', '页面', '界面', '系统', '平台', '应用', '软件', '程序', '代码', '文件', '目录', '路径', '链接', '地址', '网址', '邮箱', '电话', '手机', '微信', 'QQ', '用户', '账号', '密码', '登录', '注册', '退出', '设置', '帮助', '关于', '版本', '更新', '下载', '上传', '导入', '导出', '备份', '恢复', '同步', '刷新', '重置', '清空', '全选', '反选', '批量', '单个', '多个', '所有', '部分', '全部', '完整', '详细', '简单', '基础', '高级', '专业', '标准', '自定义', '默认', '推荐', '热门', '最新', '最热', '最多', '最少', '最大', '最小', '最长', '最短', '最好', '最差', '第一', '第二', '第三', '最后', '开始', '结束', '中间', '前面', '后面', '左边', '右边', '上面', '下面', '中心', '边缘', '内部', '外部', '顶部', '底部', '头部', '尾部', '首页', '末页', '上一页', '下一页', '当前', '之前', '之后', '以前', '以后', '现在', '将来', '过去', '未来', '今天', '昨天', '明天', '今年', '去年', '明年', '本月', '上月', '下月', '本周', '上周', '下周', '今日', '昨日', '明日', '此时', '彼时', '那时', '这时', '何时', '什么', '哪个', '哪些', '怎么', '如何', '为什么', '因为', '所以', '但是', '然而', '不过', '而且', '并且', '或者', '还是', '要么', '既然', '如果', '假如', '除非', '只要', '只有', '无论', '不管', '尽管', '虽然', '即使', '哪怕', '就算', '纵然', '纵使', '即便', '便是', '就是', '正是', '恰是', '确实', '的确', '当然', '自然', '显然', '明显', '清楚', '清晰', '明确', '准确', '精确', '正确', '错误', '失误', '问题', '困难', '麻烦', '简单', '容易', '复杂', '困难', '艰难', '轻松', '方便', '快速', '缓慢', '迅速', '立即', '马上', '很快', '稍后', '随后', '接着', '然后', '最后', '终于', '总算', '总是', '经常', '偶尔', '有时', '从不', '永远', '一直', '始终', '依然', '仍然', '还是', '依旧', '照样', '照常', '如常', '正常', '异常', '特殊', '普通', '一般', '平常', '寻常', '常见', '罕见', '稀有', '珍贵', '宝贵', '重要', '关键', '核心', '主要', '次要', '辅助', '补充', '额外', '附加', '增加', '减少', '提高', '降低', '改善', '改进', '优化', '完善', '修复', '修正', '纠正', '调整', '调节', '控制', '管理', '处理', '解决', '处置', '应对', '面对', '遇到', '碰到', '发现', '找到', '寻找', '搜索', '查找', '检索', '获取', '得到', '收到', '接收', '发送', '传送', '传递', '传达', '通知', '告知', '提醒', '警告', '提示', '建议', '推荐', '介绍', '说明', '解释', '描述', '叙述', '讲述', '表达', '表示', '显示', '展示', '呈现', '体现', '反映', '代表', '象征', '意味', '表明', '证明', '验证', '确认', '肯定', '否定', '拒绝', '接受', '同意', '反对', '支持', '赞成', '反对', '批评', '赞扬', '表扬', '夸奖', '称赞', '鼓励', '安慰', '劝告', '劝说', '说服', '影响', '感动', '感染', '感化', '教育', '培养', '训练', '学习', '掌握', '理解', '明白', '知道', '了解', '熟悉', '认识', '记住', '忘记', '回忆', '想起', '想到', '考虑', '思考', '琢磨', '研究', '分析', '判断', '决定', '选择', '挑选', '采用', '使用', '利用', '运用', '应用', '实施', '执行', '进行', '开展', '举行', '组织', '安排', '计划', '准备', '预备', '筹备', '布置', '设置', '配置', '调配', '分配', '安排', '排列', '整理', '收拾', '打扫', '清洁', '清理', '清除', '消除', '去除', '移除', '删除', '取消', '撤销', '废除', '禁止', '允许', '许可', '批准', '通过', '拒绝', '驳回', '否决', '反对', '抗议', '投诉', '举报', '报告', '汇报', '反馈', '回应', '答复', '回答', '解答', '回复', '回信', '回电', '回访', '回顾', '回想', '回忆', '怀念', '思念', '想念', '牵挂', '担心', '担忧', '忧虑', '焦虑', '紧张', '害怕', '恐惧', '畏惧', '害怕', '胆怯', '勇敢', '勇气', '胆量', '魄力', '决心', '意志', '毅力', '坚持', '坚定', '坚强', '坚韧', '顽强', '刚强', '强硬', '强烈', '激烈', '剧烈', '猛烈', '厉害', '严重', '严格', '严肃', '认真', '仔细', '细心', '小心', '谨慎', '慎重', '注意', '留意', '关注', '重视', '看重', '珍视', '爱护', '保护', '守护', '维护', '捍卫', '坚守', '遵守', '服从', '听从', '顺从', '屈服', '妥协', '让步', '退让', '退缩', '后退', '倒退', '前进', '进步', '发展', '成长', '提升', '上升', '增长', '扩大', '扩展', '延伸', '延长', '缩短', '缩小', '减小', '降低', '下降', '下跌', '上涨', '增加', '增多', '增强', '加强', '强化', '巩固', '稳定', '平稳', '稳固', '牢固', '坚固', '结实', '扎实', '踏实', '实在', '真实', '真正', '真的', '假的', '虚假', '虚伪', '欺骗', '撒谎', '说谎', '诚实', '老实', '坦诚', '坦率', '直接', '间接', '直白', '含蓄', '委婉', '客气', '礼貌', '粗鲁', '无礼', '失礼', '得体', '合适', '适当', '恰当', '正当', '合理', '不合理', '荒谬', '荒唐', '可笑', '滑稽', '幽默', '风趣', '有趣', '无趣', '乏味', '枯燥', '单调', '丰富', '多样', '各种', '种种', '各类', '多种', '不同', '相同', '一样', '相似', '类似', '近似', '接近', '靠近', '远离', '距离', '间隔', '空间', '时间', '地点', '位置', '方向', '角度', '程度', '水平', '层次', '等级', '级别', '档次', '品质', '质量', '数量', '分量', '重量', '轻重', '大小', '高低', '长短', '宽窄', '厚薄', '深浅', '明暗', '亮度', '颜色', '色彩', '形状', '样子', '模样', '外观', '外表', '内在', '本质', '实质', '性质', '特性', '特点', '特色', '特征', '标志', '记号', '符号', '信号', '暗号', '密码', '口令', '指令', '命令', '要求', '请求', '申请', '邀请', '招待', '接待', '款待', '对待', '待遇', '治疗', '医治', '救治', '抢救', '拯救', '挽救', '营救', '解救', '援救', '帮助', '协助', '支援', '支持', '赞助', '资助', '补助', '津贴', '奖励', '奖金', '奖品', '礼品', '礼物', '赠品', '纪念品', '收藏品', '艺术品', '作品', '产品', '商品', '货物', '物品', '东西', '事物', '事情', '事件', '事故', '意外', '偶然', '必然', '自然', '人为', '故意', '无意', '有意', '刻意', '特意', '专门', '专业', '业余', '兼职', '全职', '工作', '职业', '事业', '生意', '买卖', '交易', '合作', '竞争', '比赛', '竞赛', '比较', '对比', '区别', '差别', '不同', '差异', '差距', '距离', '关系', '联系', '连接', '结合', '组合', '配合', '搭配', '匹配', '符合', '适合', '合适', '恰当', '正确', '准确', '精确', '确切', '明确', '清楚', '清晰', '模糊', '混乱', '杂乱', '整齐', '规整', '规范', '标准', '统一', '一致', '协调', '和谐', '平衡', '均衡', '公平', '公正', '公开', '透明', '明朗', '光明', '黑暗', '阴暗', '昏暗', '明亮', '光亮', '闪亮', '耀眼', '刺眼', '醒目', '显眼', '突出', '明显', '清楚', '清晰', '模糊', '朦胧', '隐约', '依稀', '大概', '大约', '左右', '上下', '前后', '内外', '里外', '中外', '国内', '国外', '海内', '海外', '境内', '境外', '省内', '省外', '市内', '市外', '县内', '县外', '区内', '区外', '校内', '校外', '院内', '院外', '室内', '室外', '屋内', '屋外', '家里', '家外', '门内', '门外', '窗内', '窗外', '楼上', '楼下', '楼内', '楼外', '车内', '车外', '船内', '船外', '机内', '机外', '网上', '网下', '线上', '线下', '台上', '台下', '桌上', '桌下', '床上', '床下', '地上', '地下', '天上', '天下', '山上', '山下', '水上', '水下', '空中', '地面', '表面', '里面', '外面', '中间', '两边', '四周', '周围', '附近', '邻近', '相邻', '毗邻', '接壤', '交界', '边界', '界限', '范围', '区域', '地区', '地带', '地段', '地方', '场所', '地点', '位置', '方位', '朝向', '面向', '背向', '转向', '指向', '导向', '趋向', '倾向', '偏向', '偏爱', '喜爱', '热爱', '深爱', '钟爱', '疼爱', '关爱', '慈爱', '仁爱', '博爱', '大爱', '真爱', '纯爱', '初恋', '恋爱', '爱情', '友情', '亲情', '感情', '情感', '情绪', '心情', '心境', '心态', '态度', '姿态', '状态', '形态', '动态', '静态', '常态', '异态', '变态', '正常', '反常', '失常', '无常', '平常', '非常', '特别', '格外', '尤其', '特殊', '独特', '奇特', '神奇', '奇妙', '美妙', '绝妙', '巧妙', '精妙', '微妙', '玄妙', '奥妙', '深奥', '高深', '深刻', '深入', '深度', '广度', '宽度', '长度', '高度', '厚度', '密度', '浓度', '强度', '力度', '速度', '温度', '湿度', '亮度', '硬度', '软度', '韧度', '脆度', '粘度', '流度', '稠度', '稀度', '纯度', '清度', '浊度', '透度', '明度', '暗度', '冷度', '热度', '凉度', '温度', '燥度', '湿度', '干度', '润度', '滑度', '涩度', '粗度', '细度', '厚度', '薄度', '重度', '轻度', '大度', '小度', '宽度', '窄度', '长度', '短度', '高度', '低度', '深度', '浅度', '远度', '近度', '快度', '慢度', '急度', '缓度', '紧度', '松度', '严度', '宽度', '紧度', '松度']
    
    const filteredNames = Array.from(allMatches).filter(name => {
      return !excludeWords.includes(name) && 
             !/^\d+$/.test(name) && // 排除纯数字
             !/^[a-zA-Z]+$/.test(name) && // 排除纯英文
             name.length >= 2 && name.length <= 6 // 合理的人名长度
    })
    
    // 提取更多人物，最多20个
    filteredNames.slice(0, 20).forEach(name => {
      characters.push({
        name: name.trim(),
        nickname: '',
        role: 'supporting',
        gender: '',
        age: '',
        age_range: '',
        occupation: '',
        title: '',
        description: `从AI回复中提取的人物：${name}`,
        appearance: '',
        personality: '',
        background: '',
        motivation: '',
        skills: [],
        skills_text: '',
        relationships: {},
        relationships_text: '',
        character_arc: '',
        dialogue_style: '',
        catchphrase: '',
        strengths: [],
        strengths_text: '',
        weaknesses: [],
        weaknesses_text: '',
        fears: [],
        fears_text: '',
        desires: [],
        desires_text: '',
        importance_level: 5,
        first_appearance_chapter: 1,
        status: 'active',
        tags: [],
        tags_text: '',
        novel_id: novelData.id
      })
    })
  }
  
  return characters.length > 0 ? characters : null
}

// 从文本中提取世界观信息
const extractWorldviewsFromText = (content) => {
  const worldviews = []
  let currentWorldview = null
  
  const lines = content.split('\n')
  
  for (const line of lines) {
    const trimmedLine = line.trim()
    if (!trimmedLine) continue
    
    // 检测新的世界观开始
    const worldviewMatch = trimmedLine.match(/(?:世界观|世界|背景|设定)[:：]?\s*(.+)/i)
    if (worldviewMatch) {
      // 保存前一个世界观
      if (currentWorldview && currentWorldview.name) {
        worldviews.push(currentWorldview)
      }
      
      currentWorldview = {
        name: worldviewMatch[1].trim() || '世界观设定',
        description: '',
        type: '',
        geography: '',
        history: '',
        culture: '',
        magic_system: '',
        races: [],
        organizations: [],
        locations: [],
        novel_id: novelData.id
      }
      continue
    }
    
    if (!currentWorldview) {
      currentWorldview = {
        name: '世界观设定',
        description: '',
        type: '',
        geography: '',
        history: '',
        culture: '',
        magic_system: '',
        races: [],
        organizations: [],
        locations: [],
        novel_id: novelData.id
      }
    }
    
    // 提取具体字段
    const typeMatch = trimmedLine.match(/(?:类型|风格|体裁)[:：]\s*(.+)/i)
    if (typeMatch) {
      currentWorldview.type = typeMatch[1].trim()
      continue
    }
    
    const geographyMatch = trimmedLine.match(/(?:地理|地形|地貌|环境)[:：]\s*(.+)/i)
    if (geographyMatch) {
      currentWorldview.geography = geographyMatch[1].trim()
      continue
    }
    
    const historyMatch = trimmedLine.match(/(?:历史|背景|起源)[:：]\s*(.+)/i)
    if (historyMatch) {
      currentWorldview.history = historyMatch[1].trim()
      continue
    }
    
    const cultureMatch = trimmedLine.match(/(?:文化|习俗|传统)[:：]\s*(.+)/i)
    if (cultureMatch) {
      currentWorldview.culture = cultureMatch[1].trim()
      continue
    }
    
    const magicMatch = trimmedLine.match(/(?:魔法|法术|力量|能力)[:：]\s*(.+)/i)
    if (magicMatch) {
      currentWorldview.magic_system = magicMatch[1].trim()
      continue
    }
    
    // 如果没有匹配到特定字段，添加到描述中
    if (trimmedLine.length > 5) {
      currentWorldview.description += (currentWorldview.description ? '\n' : '') + trimmedLine
    }
  }
  
  // 保存最后一个世界观
  if (currentWorldview && (currentWorldview.name || currentWorldview.description)) {
    worldviews.push(currentWorldview)
  }
  
  // 如果没有提取到结构化数据，创建一个默认的
  if (worldviews.length === 0 && content.trim().length > 20) {
    worldviews.push({
      name: '世界观设定',
      description: content.trim(),
      type: '',
      geography: '',
      history: '',
      culture: '',
      magic_system: '',
      races: [],
      organizations: [],
      locations: [],
      novel_id: novelData.id
    })
  }
  
  return worldviews.length > 0 ? worldviews : null
}

// 从文本中提取时间线信息
const extractTimelinesFromText = (content) => {
  const timelines = []
  let currentTimeline = null
  
  const lines = content.split('\n')
  
  for (const line of lines) {
    const trimmedLine = line.trim()
    if (!trimmedLine) continue
    
    // 检测新的事件开始
    const eventMatch = trimmedLine.match(/(?:事件|情节|剧情|章节)[:：]?\s*(.+)/i)
    if (eventMatch) {
      // 保存前一个事件
      if (currentTimeline && currentTimeline.name) {
        timelines.push(currentTimeline)
      }
      
      currentTimeline = {
        name: eventMatch[1].trim(),
        description: '',
        event_type: 'main',
        time_period: '',
        start_time: '',
        end_time: '',
        location: '',


        key_events: [],
        plot_points: [],
        conflicts: [],
        conflicts_text: '',
        themes: [],
        themes_text: '',
        novel_id: novelData.id
      }
      continue
    }
    
    if (!currentTimeline) {
      // 如果是列表项，创建新事件
      const listMatch = trimmedLine.match(/^(?:\d+[.、]|[-*•])\s*(.+)/)
      if (listMatch) {
        currentTimeline = {
          name: listMatch[1].trim(),
          description: '',
          event_type: 'main',
          time_period: '',
          start_time: '',
          end_time: '',
          location: '',


          key_events: [],
          plot_points: [],
          conflicts: [],
          conflicts_text: '',
          themes: [],
          themes_text: '',
          novel_id: novelData.id
        }
        continue
      }
    }
    
    if (currentTimeline) {
      // 提取具体字段
      const typeMatch = trimmedLine.match(/(?:类型|性质)[:：]\s*(.+)/i)
      if (typeMatch) {
        const typeMap = {
          '主线': 'main',
          '支线': 'side',
          '背景': 'background',
          '冲突': 'conflict',
          '转折': 'turning_point'
        }
        currentTimeline.event_type = typeMap[typeMatch[1].trim()] || 'main'
        continue
      }
      
      const timeMatch = trimmedLine.match(/(?:时间|时期|阶段)[:：]\s*(.+)/i)
      if (timeMatch) {
        currentTimeline.time_period = timeMatch[1].trim()
        continue
      }
      
      const locationMatch = trimmedLine.match(/(?:地点|位置|场所)[:：]\s*(.+)/i)
      if (locationMatch) {
        currentTimeline.location = locationMatch[1].trim()
        continue
      }
      
      const charactersMatch = trimmedLine.match(/(?:角色|人物|参与者)[:：]\s*(.+)/i)
      if (charactersMatch) {
        const characters = charactersMatch[1].split(/[,，、]/).map(c => c.trim()).filter(c => c)
        continue
      }
      
      const conflictMatch = trimmedLine.match(/(?:冲突|矛盾|问题)[:：]\s*(.+)/i)
      if (conflictMatch) {
        currentTimeline.conflicts.push(conflictMatch[1].trim())
        currentTimeline.conflicts_text = conflictMatch[1].trim()
        continue
      }
      
      const themeMatch = trimmedLine.match(/(?:主题|意义|寓意)[:：]\s*(.+)/i)
      if (themeMatch) {
        const themes = themeMatch[1].split(/[,，、]/).map(t => t.trim()).filter(t => t)
        currentTimeline.themes = themes
        currentTimeline.themes_text = themeMatch[1].trim()
        continue
      }
      
      // 如果没有匹配到特定字段，添加到描述中
      if (trimmedLine.length > 5) {
        currentTimeline.description += (currentTimeline.description ? '\n' : '') + trimmedLine
      }
    }
  }
  
  // 保存最后一个事件
  if (currentTimeline && currentTimeline.name) {
    timelines.push(currentTimeline)
  }
  
  // 如果没有提取到结构化数据，尝试简单提取
  if (timelines.length === 0) {
    const eventPatterns = [
      /(?:^|\n)\s*(?:\d+[.、]|[-*•])\s*([^\n]+)/gm,
      /([^\n]{10,50})(?=\n|$)/g
    ]
    
    eventPatterns.forEach(pattern => {
      const matches = content.matchAll(pattern)
      for (const match of matches) {
        const eventName = match[1]?.trim()
        if (eventName && eventName.length > 5 && timelines.length < 5) {
          timelines.push({
            name: eventName,
            description: `从AI回复中提取的事件：${eventName}`,
            event_type: 'main',
            time_period: '',
            start_time: '',
            end_time: '',
            location: '',


            key_events: [],
            plot_points: [],
            conflicts: [],
            conflicts_text: '',
            themes: [],
            themes_text: '',
            novel_id: novelData.id
          })
        }
      }
    })
  }
  
  return timelines.length > 0 ? timelines : null
}

// 从文本中提取语料库信息
const extractCorpusFromText = (content) => {
  const corpus = []
  
  // 将内容按段落分割
  const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 20)
  
  paragraphs.forEach((paragraph, index) => {
    corpus.push({
      title: `AI生成内容${index + 1}`,
      content: paragraph.trim(),
      content_type: 'reference',
      genre_type: 'novel',

      novel_id: novelData.id
    })
  })
  
  return corpus.length > 0 ? corpus : null
}

// 从文本中提取章节信息
const extractChaptersFromText = (content) => {
  const chapters = []
  
  // 章节匹配规则（按优先级排序）
  const chapterPatterns = [
    // 最常见的中文章节标题
    /^\s*第[一二三四五六七八九十百千万\d]+章[^\n]*$/gm,
    /^\s*第[\d]+章[^\n]*$/gm,
    // 英文章节标题
    /^\s*Chapter\s*[\d]+[^\n]*$/gmi,
    /^\s*CHAPTER\s*[\d]+[^\n]*$/gmi,
    // 卷标题
    /^\s*第[一二三四五六七八九十百千万\d]+卷[^\n]*$/gm,
    // 数字编号章节
    /^\s*[\d]+\s*[、.。]\s*[^\n]{1,30}$/gm,
    // 特殊标记章节
    /^\s*【[^】]{1,20}】\s*$/gm,
    /^\s*\[[^\]]{1,20}\]\s*$/gm
  ]
  
  let chapterTitles = []
  
  // 尝试不同的匹配模式
  for (const pattern of chapterPatterns) {
    const matches = content.match(pattern)
    if (matches && matches.length > 0) {
      chapterTitles = matches
      break
    }
  }
  
  if (chapterTitles.length === 0) {
    // 如果没有找到章节标题，尝试按段落分割
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 50)
    if (paragraphs.length > 1) {
      paragraphs.forEach((paragraph, index) => {
        const firstLine = paragraph.split('\n')[0].trim()
        const title = firstLine.length > 50 ? `第${index + 1}章` : firstLine
        chapters.push({
          title: title,
          content: paragraph.trim(),
          summary: '',
          status: 'draft',
          sort_order: index + 1,
          novel_id: novelData.id
        })
      })
    }
  } else {
    // 根据章节标题分割内容
    const lines = content.split('\n')
    let currentChapter = null
    let chapterIndex = 0
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      
      // 检查是否是章节标题
      const isChapterTitle = chapterTitles.some(title => 
        line === title.trim() || line.includes(title.trim())
      )
      
      if (isChapterTitle) {
        // 保存上一章节
        if (currentChapter) {
          chapters.push(currentChapter)
        }
        
        // 开始新章节
        chapterIndex++
        currentChapter = {
          title: line,
          content: '',
          summary: '',
          status: 'draft',
          sort_order: chapterIndex,
          novel_id: novelData.id
        }
      } else if (currentChapter && line) {
        // 添加内容到当前章节
        currentChapter.content += (currentChapter.content ? '\n' : '') + line
      }
    }
    
    // 添加最后一个章节
    if (currentChapter) {
      chapters.push(currentChapter)
    }
  }
  
  return chapters.length > 0 ? chapters : null
}

const validateJsonFormat = (data, type) => {
  if (!data || typeof data !== 'object') return false
  
  switch (type) {
    case 'character':
      return Array.isArray(data) ? 
        data.every(item => item.name) : 
        data.name
    case 'worldview':
      return Array.isArray(data) ? 
        data.every(item => item.name) : 
        data.name
    case 'timeline':
      return Array.isArray(data) ? 
        data.every(item => item.name) : 
        data.name
    case 'corpus':
      return Array.isArray(data) ? 
        data.every(item => item.title && item.content) : 
        data.title && data.content
    case 'chapter':
      return Array.isArray(data) ? 
        data.every(item => item.title) : 
        data.title
    default:
      return false
  }
}

const batchInsertContent = async (type, data) => {
  const items = Array.isArray(data) ? data : [data]
  
  switch (type) {
    case 'character':
      // 人物批量创建需要特殊的数据格式：{novel_id, characters: [...]}
      const characterData = {
        novel_id: novelData.id,
        characters: items
      }
      await characterAPI.batchCreateCharacters(characterData)
      break
    case 'worldview':
      // 世界观批量创建需要特殊的数据格式：{novel_id, worldviews: [...]}
      const worldviewData = {
        novel_id: novelData.id,
        worldviews: items
      }
      await worldviewAPI.batchCreateWorldviews(worldviewData)
      break
    case 'timeline':
      // 批量创建事件线需要传递包含timelines数组和novel_id的对象
      const timelineData = {
        novel_id: novelData.id,
        timelines: items
      }
      await timelineAPI.batchCreateEvents(timelineData)
      break
    case 'corpus':
      // 为每个项目添加novel_id
      const corpusItems = items.map(item => ({
        ...item,
        novel_id: novelData.id
      }))
      await corpusAPI.batchCreateCorpus(corpusItems)
      break
    case 'chapter':
      // 章节批量创建需要特殊的数据格式：{novel_id, chapters: [...]}
      const chapterData = {
        novel_id: novelData.id,
        chapters: items
      }
      await chapterAPI.batchCreateChapters(chapterData)
      break
    default:
      throw new Error(`不支持的内容类型: ${type}`)
  }
}

// 加载人物数据
const loadCharacters = async () => {
  try {
    const charactersResponse = await characterAPI.getCharacters({ novel_id: novelData.id })
    characters.value = charactersResponse.data?.characters || []
  } catch (error) {
    console.error('加载人物数据失败:', error)
  }
}

// 加载世界观数据
const loadWorldviews = async () => {
  try {
    const worldviewResponse = await worldviewAPI.getWorldviews({ novel_id: novelData.id })
    worldviews.value = worldviewResponse.data?.worldviews || []
  } catch (error) {
    console.error('加载世界观数据失败:', error)
  }
}

// 加载事件线数据
const loadTimelineEvents = async () => {
  try {
    const timelineResponse = await timelineAPI.getEvents({ novel_id: novelData.id })
    timelineEvents.value = timelineResponse.data?.timelines || []
  } catch (error) {
    console.error('加载事件线数据失败:', error)
  }
}

// 加载语料库数据
const loadCorpusItems = async () => {
  try {
    const corpusResponse = await corpusAPI.getCorpus({ novel_id: novelData.id })
    corpusItems.value = corpusResponse.data?.corpus || []
    
    // 根据语料库数据生成分类
    const categories = [...new Set(corpusItems.value.map(item => item.category).filter(Boolean))]
    corpusCategories.value = categories.map((cat, index) => ({ id: index + 1, name: cat }))
    
    // 如果没有分类，设置默认分类
    if (corpusCategories.value.length === 0) {
      corpusCategories.value = [{ id: 1, name: '全部' }]
    }
  } catch (error) {
    console.error('加载语料库数据失败:', error)
  }
}

const loadChapters = async (loadMore = false) => {
  try {
    if (!loadMore) {
      chapterPagination.loading = true
      chapterPagination.currentPage = 1
    }
    
    const params = {
      novel_id: novelData.id,
      page: chapterPagination.currentPage,
      limit: chapterPagination.pageSize
    }
    
    const chaptersResponse = await chapterAPI.getChapters(params)
    const newChapters = chaptersResponse.data?.chapters || []
    const pagination = chaptersResponse.data?.pagination
    
    if (loadMore) {
      // 加载更多时追加数据
      chapters.value = [...chapters.value, ...newChapters]
    } else {
      // 初始加载时替换数据
      chapters.value = newChapters
    }
    
    // 更新分页信息
    if (pagination) {
      chapterPagination.total = pagination.total_count || 0
      chapterPagination.hasMore = pagination.has_next_page || false
    } else {
      chapterPagination.hasMore = false
    }
    
  } catch (error) {
    console.error('加载章节数据失败:', error)
  } finally {
    chapterPagination.loading = false
  }
}

// 加载更多章节
const loadMoreChapters = async () => {
  if (chapterPagination.loading || !chapterPagination.hasMore) {
    return
  }
  
  chapterPagination.currentPage++
  await loadChapters(true)
}

// 章节列表滚动监听
const handleChapterListScroll = (event) => {
  const { scrollTop, scrollHeight, clientHeight } = event.target
  
  // 当滚动到距离底部50px以内时，自动加载更多
  if (scrollHeight - scrollTop - clientHeight < 50) {
    if (chapterPagination.hasMore && !chapterPagination.loading) {
      loadMoreChapters()
    }
  }
}

const refreshDataList = async (type) => {
  switch (type) {
    case 'character':
      await loadCharacters()
      break
    case 'worldview':
      await loadWorldviews()
      break
    case 'timeline':
      await loadTimelineEvents()
      break
    case 'corpus':
      await loadCorpusItems()
      break
    case 'chapter':
      await loadChapters()
      break
  }
}

const getTypeLabel = (type) => {
  const labels = {
    'character': '人物',
    'worldview': '世界观',
    'timeline': '事件线',
    'corpus': '语料库',
    'chapter': '章节'
  }
  return labels[type] || type
}

// 预览弹窗相关方法
const removePreviewItem = (index) => {
  previewData.value.splice(index, 1)
  if (previewData.value.length === 0) {
    showPreviewDialog.value = false
  }
}

// 暂存区相关方法
const toggleStagingArea = () => {
  showStagingArea.value = !showStagingArea.value
}

const getReferenceTagType = (type) => {
  const typeMap = {
    'chapter': 'primary',
    'character': 'success', 
    'worldview': 'warning',
    'timeline': 'info',
    'corpus': 'danger'
  }
  return typeMap[type] || 'default'
}

const getReferencePrefix = (type) => {
  const prefixMap = {
    'chapter': '@章节',
    'character': '@人物',
    'worldview': '@世界观', 
    'timeline': '@事件线',
    'corpus': '@语料库'
  }
  return prefixMap[type] || '@'
}

// 章节侧边栏相关方法（已移除，现在固定显示）

const confirmInsertContent = async () => {
  if (previewData.value.length === 0) {
    ElMessage.warning('没有可插入的数据')
    return
  }
  
  try {
    saving.value = true
    
    // 处理数组字段（不需要在这里添加novel_id，batchInsertContent会处理）
    const processedData = previewData.value.map(item => {
      const processedItem = {
        ...item
      }
      
      // 处理人物数据的数组字段
      if (previewContentType.value === 'character') {
        // 将文本字段转换为数组
        if (item.skills_text) {
          processedItem.skills = item.skills_text.split(/[,，、]/).map(s => s.trim()).filter(s => s)
          delete processedItem.skills_text
        }
        if (item.strengths_text) {
          processedItem.strengths = item.strengths_text.split(/[,，、]/).map(s => s.trim()).filter(s => s)
          delete processedItem.strengths_text
        }
        if (item.weaknesses_text) {
          processedItem.weaknesses = item.weaknesses_text.split(/[,，、]/).map(s => s.trim()).filter(s => s)
          delete processedItem.weaknesses_text
        }
        if (item.fears_text) {
          processedItem.fears = item.fears_text.split(/[,，、]/).map(s => s.trim()).filter(s => s)
          delete processedItem.fears_text
        }
        if (item.desires_text) {
          processedItem.desires = item.desires_text.split(/[,，、]/).map(s => s.trim()).filter(s => s)
          delete processedItem.desires_text
        }
        if (item.tags_text) {
          processedItem.tags = item.tags_text.split(/[,，、]/).map(s => s.trim()).filter(s => s)
          delete processedItem.tags_text
        }
        if (item.relationships_text) {
          // 解析关系文本，格式：关系类型:相关人物;关系类型2:相关人物2
          const relationships = {}
          item.relationships_text.split(/[;；]/).forEach(rel => {
            const [type, person] = rel.split(/[:：]/).map(s => s.trim())
            if (type && person) {
              relationships[type] = person
            }
          })
          processedItem.relationships = relationships
          delete processedItem.relationships_text
        }
        
        // 确保数组字段存在
        if (!processedItem.skills) processedItem.skills = []
        if (!processedItem.strengths) processedItem.strengths = []
        if (!processedItem.weaknesses) processedItem.weaknesses = []
        if (!processedItem.fears) processedItem.fears = []
        if (!processedItem.desires) processedItem.desires = []
        if (!processedItem.tags) processedItem.tags = []
        if (!processedItem.relationships) processedItem.relationships = {}
      }
      
      // 处理时间线的数组字段
      if (previewContentType.value === 'timeline') {
        // 将文本字段转换为数组
        if (item.conflicts_text) {
          processedItem.conflicts = item.conflicts_text.split(/[,，、]/).map(c => c.trim()).filter(c => c)
          delete processedItem.conflicts_text
        }
        if (item.themes_text) {
          processedItem.themes = item.themes_text.split(/[,，、]/).map(t => t.trim()).filter(t => t)
          delete processedItem.themes_text
        }
        
        // 确保数组字段存在
        if (!processedItem.key_events) processedItem.key_events = []
        if (!processedItem.plot_points) processedItem.plot_points = []
        if (!processedItem.conflicts) processedItem.conflicts = []
        if (!processedItem.themes) processedItem.themes = []
      }
      
      // 处理世界观的数组字段
      if (previewContentType.value === 'worldview') {
        // 确保数组字段存在
        if (!processedItem.races) processedItem.races = []
        if (!processedItem.organizations) processedItem.organizations = []
        if (!processedItem.locations) processedItem.locations = []
      }
      
      return processedItem
    })
    
    // 调用批量插入API
    await batchInsertContent(previewContentType.value, processedData)
    
    const count = processedData.length
    ElMessage.success(`成功插入${count}个${getTypeLabel(previewContentType.value)}数据`)
    
    // 刷新对应的数据列表
    await refreshDataList(previewContentType.value)
    
    // 关闭预览弹窗
    showPreviewDialog.value = false
    
  } catch (error) {
    console.error('插入内容失败:', error)
    
    // 提取详细的错误信息
    let errorMessage = `插入${getTypeLabel(previewContentType.value)}失败`
    
    if (error.response && error.response.data) {
      // 如果有服务器返回的错误信息
      const { data } = error.response
      if (data.message) {
        errorMessage += `: ${data.message}`
      } else if (data.error) {
        errorMessage += `: ${data.error}`
      } else if (typeof data === 'string') {
        errorMessage += `: ${data}`
      }
      
      // 如果有详细的验证错误信息
      if (data.details && Array.isArray(data.details)) {
        const detailMessages = data.details.map(detail => {
          if (typeof detail === 'string') {
            return detail
          } else if (detail.message) {
            return detail.message
          } else if (detail.field && detail.error) {
            return `${detail.field}: ${detail.error}`
          }
          return JSON.stringify(detail)
        })
        errorMessage += `\n详细信息: ${detailMessages.join(', ')}`
      }
    } else if (error.message) {
      errorMessage += `: ${error.message}`
    }
    
    ElMessage.error(errorMessage)
  } finally {
    saving.value = false
  }
}

onUnmounted(() => {
  if (vditor && typeof vditor.destroy === 'function') {
    try {
      vditor.destroy()
    } catch (error) {
      console.warn('Failed to destroy vditor on unmount:', error)
    }
    vditor = null
  }
})
</script>

<style scoped>
@import url("./NovelEditor.css");
</style>