// 通用增删改查操作工具类
import { ElMessage, ElMessageBox } from 'element-plus'
import { characterAPI, worldviewAPI, timelineAPI, corpusAPI } from '@/api'

/**
 * 通用CRUD操作类
 */
export class CRUDOperations {
  constructor(api, entityName, entityNameCN) {
    this.api = api
    this.entityName = entityName
    this.entityNameCN = entityNameCN
  }

  /**
   * 创建实体
   * @param {Object} data - 创建数据
   * @param {Function} onSuccess - 成功回调
   * @param {Function} onError - 错误回调
   */
  async create(data, onSuccess, onError) {
    try {
      const result = await this.api.create(data)
      ElMessage.success(`${this.entityNameCN}创建成功`)
      if (onSuccess) onSuccess(result)
      return result
    } catch (error) {
      const message = error.message || `创建${this.entityNameCN}失败`
      ElMessage.error(message)
      if (onError) onError(error)
      throw error
    }
  }

  /**
   * 批量创建实体
   * @param {Array} dataList - 批量创建数据
   * @param {Function} onSuccess - 成功回调
   * @param {Function} onError - 错误回调
   */
  async batchCreate(dataList, onSuccess, onError) {
    try {
      const result = await this.api.batchCreate(dataList)
      ElMessage.success(`批量创建${this.entityNameCN}成功`)
      if (onSuccess) onSuccess(result)
      return result
    } catch (error) {
      const message = error.message || `批量创建${this.entityNameCN}失败`
      ElMessage.error(message)
      if (onError) onError(error)
      throw error
    }
  }

  /**
   * 获取实体列表
   * @param {Object} params - 查询参数
   * @param {Function} onSuccess - 成功回调
   * @param {Function} onError - 错误回调
   */
  async getList(params = {}, onSuccess, onError) {
    try {
      const result = await this.api.getList(params)
      if (onSuccess) onSuccess(result)
      return result
    } catch (error) {
      const message = error.message || `获取${this.entityNameCN}列表失败`
      ElMessage.error(message)
      if (onError) onError(error)
      throw error
    }
  }

  /**
   * 获取实体详情
   * @param {Number} id - 实体ID
   * @param {Function} onSuccess - 成功回调
   * @param {Function} onError - 错误回调
   */
  async getDetail(id, onSuccess, onError) {
    try {
      const result = await this.api.getDetail(id)
      if (onSuccess) onSuccess(result)
      return result
    } catch (error) {
      const message = error.message || `获取${this.entityNameCN}详情失败`
      ElMessage.error(message)
      if (onError) onError(error)
      throw error
    }
  }

  /**
   * 更新实体
   * @param {Number} id - 实体ID
   * @param {Object} data - 更新数据
   * @param {Function} onSuccess - 成功回调
   * @param {Function} onError - 错误回调
   */
  async update(id, data, onSuccess, onError) {
    try {
      const result = await this.api.update(id, data)
      ElMessage.success(`${this.entityNameCN}更新成功`)
      if (onSuccess) onSuccess(result)
      return result
    } catch (error) {
      const message = error.message || `更新${this.entityNameCN}失败`
      ElMessage.error(message)
      if (onError) onError(error)
      throw error
    }
  }

  /**
   * 删除实体（带确认）
   * @param {Number} id - 实体ID
   * @param {String} name - 实体名称（用于确认提示）
   * @param {Function} onSuccess - 成功回调
   * @param {Function} onError - 错误回调
   */
  async delete(id, name = '', onSuccess, onError) {
    try {
      await ElMessageBox.confirm(
        `确定要删除${this.entityNameCN}"${name}"吗？此操作不可恢复。`,
        '确认删除',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )
      
      const result = await this.api.delete(id)
      ElMessage.success(`${this.entityNameCN}删除成功`)
      if (onSuccess) onSuccess(result)
      return result
    } catch (error) {
      if (error === 'cancel') {
        return // 用户取消删除
      }
      const message = error.message || `删除${this.entityNameCN}失败`
      ElMessage.error(message)
      if (onError) onError(error)
      throw error
    }
  }

  /**
   * 批量删除实体（带确认）
   * @param {Array} ids - 实体ID数组
   * @param {Function} onSuccess - 成功回调
   * @param {Function} onError - 错误回调
   */
  async batchDelete(ids, onSuccess, onError) {
    if (!ids || ids.length === 0) {
      ElMessage.warning('请选择要删除的项目')
      return
    }

    try {
      await ElMessageBox.confirm(
        `确定要删除选中的 ${ids.length} 个${this.entityNameCN}吗？此操作不可恢复。`,
        '确认批量删除',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )
      
      const result = await this.api.batchDelete(ids)
      ElMessage.success(`批量删除${this.entityNameCN}成功`)
      if (onSuccess) onSuccess(result)
      return result
    } catch (error) {
      if (error === 'cancel') {
        return // 用户取消删除
      }
      const message = error.message || `批量删除${this.entityNameCN}失败`
      ElMessage.error(message)
      if (onError) onError(error)
      throw error
    }
  }
}

/**
 * 人物管理操作类
 */
export class CharacterOperations extends CRUDOperations {
  constructor() {
    super({
      create: characterAPI.createCharacter,
      getList: characterAPI.getCharacters,
      getDetail: characterAPI.getCharacter,
      update: characterAPI.updateCharacter,
      delete: characterAPI.deleteCharacter,
      batchDelete: characterAPI.batchDeleteCharacters
    }, 'character', '人物')
  }

  /**
   * 获取小说人物列表
   * @param {Number} novelId - 小说ID
   * @param {Object} params - 查询参数
   */
  async getNovelCharacters(novelId, params = {}) {
    try {
      const result = await characterAPI.getNovelCharacters(novelId, params)
      return result
    } catch (error) {
      ElMessage.error('获取小说人物列表失败')
      throw error
    }
  }

  /**
   * 验证人物数据
   * @param {Object} data - 人物数据
   */
  validateCharacterData(data) {
    const errors = []
    
    if (!data.name || !data.name.trim()) {
      errors.push('人物姓名不能为空')
    }
    
    if (!data.novel_id) {
      errors.push('必须指定所属小说')
    }
    
    if (data.importance_level && (data.importance_level < 1 || data.importance_level > 10)) {
      errors.push('重要程度必须在1-10之间')
    }
    
    if (data.age && (data.age < 0 || data.age > 200)) {
      errors.push('年龄必须在合理范围内')
    }
    
    return errors
  }

  /**
   * 创建人物（带验证）
   */
  async createCharacter(data, onSuccess, onError) {
    const errors = this.validateCharacterData(data)
    if (errors.length > 0) {
      ElMessage.error(errors.join('；'))
      return
    }
    
    return await this.create(data, onSuccess, onError)
  }
}

/**
 * 世界观管理操作类
 */
export class WorldviewOperations extends CRUDOperations {
  constructor() {
    super({
      create: worldviewAPI.createWorldview,
      getList: worldviewAPI.getWorldviews,
      getDetail: worldviewAPI.getWorldview,
      update: worldviewAPI.updateWorldview,
      delete: worldviewAPI.deleteWorldview,
      batchDelete: worldviewAPI.batchDeleteWorldviews
    }, 'worldview', '世界观')
  }

  /**
   * 验证世界观数据
   * @param {Object} data - 世界观数据
   */
  validateWorldviewData(data) {
    const errors = []
    
    if (!data.name || !data.name.trim()) {
      errors.push('世界观名称不能为空')
    }
    
    if (!data.novel_id) {
      errors.push('必须指定所属小说')
    }
    
    if (data.complexity_level && (data.complexity_level < 1 || data.complexity_level > 10)) {
      errors.push('复杂程度必须在1-10之间')
    }
    
    if (data.completeness_level && (data.completeness_level < 0 || data.completeness_level > 100)) {
      errors.push('完整度必须在0-100之间')
    }
    
    return errors
  }

  /**
   * 创建世界观（带验证）
   */
  async createWorldview(data, onSuccess, onError) {
    const errors = this.validateWorldviewData(data)
    if (errors.length > 0) {
      ElMessage.error(errors.join('；'))
      return
    }
    
    return await this.create(data, onSuccess, onError)
  }
}

/**
 * 事件线管理操作类
 */
export class TimelineOperations extends CRUDOperations {
  constructor() {
    super({
      create: timelineAPI.createEvent,
      getList: timelineAPI.getEvents,
      getDetail: timelineAPI.getEvent,
      update: timelineAPI.updateEvent,
      delete: timelineAPI.deleteEvent,
      batchDelete: timelineAPI.batchDeleteEvents
    }, 'timeline', '事件线')
  }

  /**
   * 获取事件线统计信息
   * @param {Number} novelId - 小说ID
   */
  async getTimelineStats(novelId) {
    try {
      const result = await timelineAPI.getStats({ novel_id: novelId })
      return result.data || {
        total_timelines: 0,
        by_event_type: {},
        completion_stats: {
          completed: 0,
          in_progress: 0,
          planned: 0
        },
        average_completion: 0,
        total_estimated_words: 0,
        total_actual_words: 0
      }
    } catch (error) {
      ElMessage.error('获取事件线统计信息失败')
      throw error
    }
  }

  /**
   * 验证事件线数据
   * @param {Object} data - 事件线数据
   */
  validateTimelineData(data) {
    const errors = []
    
    if (!data.name || !data.name.trim()) {
      errors.push('事件线名称不能为空')
    }
    
    if (!data.novel_id) {
      errors.push('必须指定所属小说')
    }
    
    if (data.completion_percentage && (data.completion_percentage < 0 || data.completion_percentage > 100)) {
      errors.push('完成百分比必须在0-100之间')
    }
    
    if (data.word_count_estimate && data.word_count_estimate < 0) {
      errors.push('预估字数不能为负数')
    }
    
    if (data.actual_word_count && data.actual_word_count < 0) {
      errors.push('实际字数不能为负数')
    }
    
    return errors
  }

  /**
   * 创建事件线（带验证）
   */
  async createTimeline(data, onSuccess, onError) {
    const errors = this.validateTimelineData(data)
    if (errors.length > 0) {
      ElMessage.error(errors.join('；'))
      return
    }
    
    return await this.create(data, onSuccess, onError)
  }
}

/**
 * 语料库管理操作类
 */
export class CorpusOperations extends CRUDOperations {
  constructor() {
    super({
      create: corpusAPI.createCorpus,
      getList: corpusAPI.getCorpus,
      getDetail: corpusAPI.getCorpusItem,
      update: corpusAPI.updateCorpus,
      delete: corpusAPI.deleteCorpus,
      batchDelete: corpusAPI.batchDeleteCorpus
    }, 'corpus', '语料')
  }

  /**
   * 获取语料库统计信息
   * @param {Number} novelId - 小说ID
   */
  async getCorpusStats(novelId) {
    try {
      const result = await this.api.getList({ novel_id: novelId })
      return {
        total: result.data?.length || 0,
        active: result.data?.filter(item => item.status === 'active').length || 0
      }
    } catch (error) {
      ElMessage.error('获取语料库统计信息失败')
      throw error
    }
  }

  /**
   * 搜索推荐语料
   * @param {Object} criteria - 搜索条件
   */
  async recommendCorpus(criteria) {
    try {
      const result = await this.api.getList(criteria)
      return result
    } catch (error) {
      ElMessage.error('搜索推荐语料失败')
      throw error
    }
  }

  /**
   * 验证语料数据
   * @param {Object} data - 语料数据
   */
  validateCorpusData(data) {
    const errors = []
    
    if (!data.title || !data.title.trim()) {
      errors.push('语料标题不能为空')
    }
    
    if (!data.content || !data.content.trim()) {
      errors.push('语料内容不能为空')
    }
    
    if (!data.novel_id) {
      errors.push('必须指定所属小说')
    }
    
    if (data.quality_score && (data.quality_score < 1 || data.quality_score > 10)) {
      errors.push('质量评分必须在1-10之间')
    }
    
    if (data.difficulty_level && (data.difficulty_level < 1 || data.difficulty_level > 5)) {
      errors.push('难度等级必须在1-5之间')
    }
    
    return errors
  }

  /**
   * 创建语料（带验证）
   */
  async createCorpus(data, onSuccess, onError) {
    const errors = this.validateCorpusData(data)
    if (errors.length > 0) {
      ElMessage.error(errors.join('；'))
      return
    }
    
    return await this.create(data, onSuccess, onError)
  }
}

// 导出实例
export const characterOps = new CharacterOperations()
export const worldviewOps = new WorldviewOperations()
export const timelineOps = new TimelineOperations()
export const corpusOps = new CorpusOperations()

// 导出工具函数
export const crudUtils = {
  /**
   * 格式化分页参数
   * @param {Number} page - 页码
   * @param {Number} limit - 每页数量
   * @param {Object} filters - 筛选条件
   */
  formatPaginationParams(page = 1, limit = 10, filters = {}) {
    return {
      page,
      limit,
      ...filters
    }
  },

  /**
   * 格式化排序参数
   * @param {String} sortBy - 排序字段
   * @param {String} sortOrder - 排序方向
   */
  formatSortParams(sortBy = 'created_at', sortOrder = 'DESC') {
    return {
      sort_by: sortBy,
      sort_order: sortOrder
    }
  },

  /**
   * 处理API错误
   * @param {Error} error - 错误对象
   * @param {String} defaultMessage - 默认错误消息
   */
  handleApiError(error, defaultMessage = '操作失败') {
    const message = error.response?.data?.message || error.message || defaultMessage
    ElMessage.error(message)
    console.error('API Error:', error)
  },

  /**
   * 验证必填字段
   * @param {Object} data - 数据对象
   * @param {Array} requiredFields - 必填字段数组
   */
  validateRequiredFields(data, requiredFields) {
    const errors = []
    requiredFields.forEach(field => {
      if (!data[field] || (typeof data[field] === 'string' && !data[field].trim())) {
        errors.push(`${field}不能为空`)
      }
    })
    return errors
  },

  /**
   * 深度克隆对象
   * @param {Object} obj - 要克隆的对象
   */
  deepClone(obj) {
    return JSON.parse(JSON.stringify(obj))
  },

  /**
   * 防抖函数
   * @param {Function} func - 要防抖的函数
   * @param {Number} delay - 延迟时间
   */
  debounce(func, delay = 300) {
    let timeoutId
    return function (...args) {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => func.apply(this, args), delay)
    }
  }
}