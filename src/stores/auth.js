import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import backendApi from '../services/backendApi'

export const useAuthStore = defineStore('auth', () => {
  // 状态
  const user = ref(null)
  const token = ref(localStorage.getItem('auth_token') || '')
  const isAuthenticated = computed(() => !!token.value)

  // 登录
  const login = async (username, password) => {
    try {
      const response = await backendApi.login(username, password)
      token.value = response.token
      user.value = response.user
      localStorage.setItem('auth_token', response.token)
      return { success: true }
    } catch (error) {
      console.error('登录失败:', error)
      return { success: false, error: error.message }
    }
  }

  // 注册
  const register = async (username, email, password) => {
    try {
      const response = await backendApi.register(username, email, password)
      token.value = response.token
      user.value = response.user
      localStorage.setItem('auth_token', response.token)
      return { success: true }
    } catch (error) {
      console.error('注册失败:', error)
      return { success: false, error: error.message }
    }
  }

  // 登出
  const logout = () => {
    user.value = null
    token.value = ''
    localStorage.removeItem('auth_token')
    backendApi.logout()
  }

  // 获取当前用户信息
  const fetchCurrentUser = async () => {
    if (!token.value) return
    
    try {
      const userData = await backendApi.getCurrentUser()
      user.value = userData
    } catch (error) {
      console.error('获取用户信息失败:', error)
      if (error.message.includes('认证已过期')) {
        logout()
      }
    }
  }

  // 修改密码
  const changePassword = async (oldPassword, newPassword) => {
    try {
      await backendApi.changePassword(oldPassword, newPassword)
      return { success: true }
    } catch (error) {
      console.error('修改密码失败:', error)
      return { success: false, error: error.message }
    }
  }

  // 初始化时获取用户信息
  const initAuth = async () => {
    if (token.value && !user.value) {
      await fetchCurrentUser()
    }
  }

  return {
    user,
    token,
    isAuthenticated,
    login,
    register,
    logout,
    fetchCurrentUser,
    changePassword,
    initAuth
  }
})
