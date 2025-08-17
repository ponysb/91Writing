/**
 * Favicon 工具函数
 * 用于动态更新网站图标
 */

/**
 * 获取完整图片URL
 * @param {string} path - 图片路径
 * @returns {string} 完整的图片URL
 */
export const getFullImageUrl = (path) => {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }
  return `${import.meta.env.VITE_IMAGE_BASE_URL || 'http://localhost:3000'}${path.startsWith('/') ? '' : '/'}${path}`
}

/**
 * 更新网站favicon
 * @param {string} iconPath - 图标路径
 */
export const updateFavicon = (iconPath) => {
  if (!iconPath) return
  
  const fullUrl = getFullImageUrl(iconPath)
  
  // 移除现有的favicon
  const existingFavicons = document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]')
  existingFavicons.forEach(favicon => favicon.remove())
  
  // 创建新的favicon
  const favicon = document.createElement('link')
  favicon.rel = 'icon'
  favicon.type = 'image/x-icon'
  // 添加时间戳强制刷新缓存
  favicon.href = `${fullUrl}?t=${Date.now()}`
  
  document.head.appendChild(favicon)
  
  // 同时创建shortcut icon以兼容更多浏览器
  const shortcutIcon = document.createElement('link')
  shortcutIcon.rel = 'shortcut icon'
  shortcutIcon.type = 'image/x-icon'
  shortcutIcon.href = `${fullUrl}?t=${Date.now()}`
  
  document.head.appendChild(shortcutIcon)
}

/**
 * 更新网站标题
 * @param {string} title - 网站标题
 */
export const updateTitle = (title) => {
  if (title) {
    document.title = title
  }
}

/**
 * 同时更新网站标题和图标
 * @param {Object} options - 配置选项
 * @param {string} options.title - 网站标题
 * @param {string} options.iconPath - 图标路径
 */
export const updateSiteInfo = ({ title, iconPath }) => {
  if (title) {
    updateTitle(title)
  }
  if (iconPath) {
    updateFavicon(iconPath)
  }
}