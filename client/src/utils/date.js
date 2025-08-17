/**
 * 日期时间工具函数
 */

/**
 * 格式化日期时间
 * @param {string|Date} dateString - 日期字符串或Date对象
 * @param {string} format - 格式类型: 'datetime', 'date', 'time'
 * @returns {string} 格式化后的日期时间字符串
 */
export const formatDateTime = (dateString, format = 'datetime') => {
  if (!dateString) return '-'
  
  try {
    const date = new Date(dateString)
    
    // 检查日期是否有效
    if (isNaN(date.getTime())) {
      return '-'
    }
    
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    
    switch (format) {
      case 'date':
        return `${year}-${month}-${day}`
      case 'time':
        return `${hours}:${minutes}:${seconds}`
      case 'datetime':
      default:
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
    }
  } catch (error) {
    console.error('日期格式化错误:', error)
    return '-'
  }
}

/**
 * 格式化日期（不包含时间）
 * @param {string|Date} dateString - 日期字符串或Date对象
 * @returns {string} 格式化后的日期字符串
 */
export const formatDate = (dateString) => {
  return formatDateTime(dateString, 'date')
}

/**
 * 格式化时间（不包含日期）
 * @param {string|Date} dateString - 日期字符串或Date对象
 * @returns {string} 格式化后的时间字符串
 */
export const formatTime = (dateString) => {
  return formatDateTime(dateString, 'time')
}

/**
 * 获取相对时间描述
 * @param {string|Date} dateString - 日期字符串或Date对象
 * @returns {string} 相对时间描述
 */
export const getRelativeTime = (dateString) => {
  if (!dateString) return '-'
  
  try {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    const months = Math.floor(days / 30)
    const years = Math.floor(days / 365)
    
    if (years > 0) {
      return `${years}年前`
    } else if (months > 0) {
      return `${months}个月前`
    } else if (days > 0) {
      return `${days}天前`
    } else if (hours > 0) {
      return `${hours}小时前`
    } else if (minutes > 0) {
      return `${minutes}分钟前`
    } else {
      return '刚刚'
    }
  } catch (error) {
    console.error('相对时间计算错误:', error)
    return '-'
  }
}

/**
 * 判断日期是否过期
 * @param {string|Date} dateString - 日期字符串或Date对象
 * @returns {boolean} 是否过期
 */
export const isExpired = (dateString) => {
  if (!dateString) return false
  
  try {
    const date = new Date(dateString)
    const now = new Date()
    return date.getTime() < now.getTime()
  } catch (error) {
    console.error('日期比较错误:', error)
    return false
  }
}

/**
 * 获取日期范围描述
 * @param {string|Date} startDate - 开始日期
 * @param {string|Date} endDate - 结束日期
 * @returns {string} 日期范围描述
 */
export const getDateRange = (startDate, endDate) => {
  const start = formatDate(startDate)
  const end = formatDate(endDate)
  
  if (start === '-' && end === '-') {
    return '-'
  } else if (start === '-') {
    return `至 ${end}`
  } else if (end === '-') {
    return `${start} 至今`
  } else {
    return `${start} 至 ${end}`
  }
}

/**
 * 计算两个日期之间的天数差
 * @param {string|Date} startDate - 开始日期
 * @param {string|Date} endDate - 结束日期
 * @returns {number} 天数差
 */
export const getDaysDiff = (startDate, endDate) => {
  try {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diff = end.getTime() - start.getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  } catch (error) {
    console.error('日期差计算错误:', error)
    return 0
  }
}

/**
 * 获取今天的日期字符串
 * @returns {string} 今天的日期字符串 (YYYY-MM-DD)
 */
export const getToday = () => {
  return formatDate(new Date())
}

/**
 * 获取昨天的日期字符串
 * @returns {string} 昨天的日期字符串 (YYYY-MM-DD)
 */
export const getYesterday = () => {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return formatDate(yesterday)
}

/**
 * 获取本周开始日期
 * @returns {string} 本周开始日期字符串 (YYYY-MM-DD)
 */
export const getWeekStart = () => {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const start = new Date(now)
  start.setDate(now.getDate() - dayOfWeek)
  return formatDate(start)
}

/**
 * 获取本月开始日期
 * @returns {string} 本月开始日期字符串 (YYYY-MM-DD)
 */
export const getMonthStart = () => {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  return formatDate(start)
}