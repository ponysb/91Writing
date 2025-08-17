/**
 * 图片工具函数
 */

/**
 * 获取完整的图片URL
 * @param {string} imagePath - 图片路径
 * @returns {string} 完整的图片URL
 */
export const getImageUrl = (imagePath) => {
  if (!imagePath) return ''
  
  // 如果已经是完整的URL（包含http或https），直接返回
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath
  }
  
  // 如果是相对路径，转换为配置的图片基础URL
  const baseUrl = import.meta.env.VITE_IMAGE_BASE_URL || 'http://localhost:3000'
  
  // 确保路径以/开头
  const normalizedPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`
  
  return `${baseUrl}${normalizedPath}`
}

/**
 * 获取封面图片URL
 * @param {string} coverPath - 封面图片路径
 * @returns {string} 完整的封面图片URL
 */
export const getCoverImageUrl = (coverPath) => {
  return getImageUrl(coverPath)
}