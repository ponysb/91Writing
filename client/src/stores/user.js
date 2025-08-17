import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useUserStore = defineStore('user', () => {
  // 状态
  const token = ref(localStorage.getItem('token') || '')
  const userInfo = ref(JSON.parse(localStorage.getItem('userInfo') || '{}'))
  const userRole = ref(localStorage.getItem('userRole') || 'client')

  // 计算属性
  const isAuthenticated = computed(() => {
    return !!token.value
  })

  const userName = computed(() => {
    return userInfo.value.nickname || userInfo.value.username || userInfo.value.name || '未登录用户'
  })

  // 方法
  const login = (loginData) => {
    token.value = loginData.token
    userInfo.value = loginData.userInfo
    userRole.value = loginData.role || 'client'
    
    // 保存到本地存储
    localStorage.setItem('token', token.value)
    localStorage.setItem('userInfo', JSON.stringify(userInfo.value))
    localStorage.setItem('userRole', userRole.value)
  }

  const logout = () => {
    token.value = ''
    userInfo.value = {}
    userRole.value = 'client'
    
    // 清除本地存储
    localStorage.removeItem('token')
    localStorage.removeItem('userInfo')
    localStorage.removeItem('userRole')
  }

  const updateUserInfo = (newUserInfo) => {
    userInfo.value = { ...userInfo.value, ...newUserInfo }
    localStorage.setItem('userInfo', JSON.stringify(userInfo.value))
  }

  const updateUserRole = (newRole) => {
    userRole.value = newRole
    localStorage.setItem('userRole', newRole)
  }

  return {
    token,
    userInfo,
    userRole,
    isAuthenticated,
    userName,
    login,
    logout,
    updateUserInfo,
    updateUserRole
  }
})