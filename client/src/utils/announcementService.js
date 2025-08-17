import { siteSettingsAPI } from '@/api/siteSettings'

/**
 * 公告服务类
 * 负责管理公告的获取、过滤和显示逻辑
 */
class AnnouncementService {
  constructor() {
    this.announcements = []
    this.readAnnouncements = this.getReadAnnouncements()
  }

  /**
   * 获取已读公告列表
   * @returns {Array} 已读公告ID数组
   */
  getReadAnnouncements() {
    try {
      return JSON.parse(localStorage.getItem('readAnnouncements') || '[]')
    } catch (error) {
      console.error('获取已读公告列表失败:', error)
      return []
    }
  }

  /**
   * 标记公告为已读
   * @param {number} announcementId 公告ID
   */
  markAsRead(announcementId) {
    try {
      if (!this.readAnnouncements.includes(announcementId)) {
        this.readAnnouncements.push(announcementId)
        localStorage.setItem('readAnnouncements', JSON.stringify(this.readAnnouncements))
      }
    } catch (error) {
      console.error('标记公告已读失败:', error)
    }
  }

  /**
   * 获取有效公告
   * @returns {Promise<Array>} 公告列表
   */
  async getActiveAnnouncements() {
    try {
      const response = await siteSettingsAPI.getActiveAnnouncements()
      this.announcements = response.data || []
      return this.announcements
    } catch (error) {
      console.error('获取公告失败:', error)
      return []
    }
  }

  /**
   * 获取未读公告
   * @returns {Promise<Array>} 未读公告列表
   */
  async getUnreadAnnouncements() {
    const announcements = await this.getActiveAnnouncements()
    return announcements.filter(announcement => 
      !this.readAnnouncements.includes(announcement.id)
    )
  }

  /**
   * 检查是否有新公告
   * @returns {Promise<boolean>} 是否有新公告
   */
  async hasNewAnnouncements() {
    const unreadAnnouncements = await this.getUnreadAnnouncements()
    return unreadAnnouncements.length > 0
  }

  /**
   * 按优先级和时间排序公告
   * @param {Array} announcements 公告列表
   * @returns {Array} 排序后的公告列表
   */
  sortAnnouncements(announcements) {
    const priorityOrder = { high: 3, medium: 2, low: 1 }
    
    return announcements.sort((a, b) => {
      // 首先按优先级排序
      const priorityDiff = (priorityOrder[b.priority] || 2) - (priorityOrder[a.priority] || 2)
      if (priorityDiff !== 0) {
        return priorityDiff
      }
      
      // 然后按创建时间排序（新的在前）
      return new Date(b.createdAt) - new Date(a.createdAt)
    })
  }

  /**
   * 获取排序后的未读公告
   * @returns {Promise<Array>} 排序后的未读公告列表
   */
  async getSortedUnreadAnnouncements() {
    const unreadAnnouncements = await this.getUnreadAnnouncements()
    return this.sortAnnouncements(unreadAnnouncements)
  }

  /**
   * 清除所有已读记录（用于测试）
   */
  clearReadRecords() {
    try {
      localStorage.removeItem('readAnnouncements')
      this.readAnnouncements = []
    } catch (error) {
      console.error('清除已读记录失败:', error)
    }
  }

  /**
   * 获取公告统计信息
   * @returns {Promise<Object>} 统计信息
   */
  async getAnnouncementStats() {
    const allAnnouncements = await this.getActiveAnnouncements()
    const unreadAnnouncements = await this.getUnreadAnnouncements()
    
    return {
      total: allAnnouncements.length,
      unread: unreadAnnouncements.length,
      read: allAnnouncements.length - unreadAnnouncements.length,
      highPriority: unreadAnnouncements.filter(a => a.priority === 'high').length,
      mediumPriority: unreadAnnouncements.filter(a => a.priority === 'medium').length,
      lowPriority: unreadAnnouncements.filter(a => a.priority === 'low').length
    }
  }
}

// 创建单例实例
const announcementService = new AnnouncementService()

export default announcementService

// 导出类供其他地方使用
export { AnnouncementService }