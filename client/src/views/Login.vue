<template>
  <div class="login-container">
    <!-- 左侧品牌展示区 -->
    <div class="brand-section">
      <div class="brand-content">
        <div class="brand-logo">
          <div class="logo-icon">
            <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="64" height="64" rx="16" fill="url(#gradient)"/>
              <path d="M20 24h24v4H20v-4zm0 8h20v4H20v-4zm0 8h16v4H20v-4z" fill="white"/>
              <defs>
                <linearGradient id="gradient" x1="0" y1="0" x2="64" y2="64">
                  <stop stop-color="#6366f1"/>
                  <stop offset="1" stop-color="#8b5cf6"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h1>{{ siteConfig.siteName }}</h1>
        </div>
        <div class="brand-description">
          <h2>开启您的AI创作之旅</h2>
          <p>{{ siteConfig.siteDescription }}</p>
        </div>
        <div class="feature-list">
          <div class="feature-item">
            <div class="feature-icon">✨</div>
            <div class="feature-text">
              <h4>AI智能创作</h4>
              <p>强大的AI助手帮您构思情节</p>
            </div>
          </div>
          <div class="feature-item">
            <div class="feature-icon">📚</div>
            <div class="feature-text">
              <h4>丰富的创作工具</h4>
              <p>角色设定、世界观构建一应俱全</p>
            </div>
          </div>
          <div class="feature-item">
            <div class="feature-icon">🎯</div>
            <div class="feature-text">
              <h4>专业的写作环境</h4>
              <p>专注创作，让灵感自由流淌</p>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 右侧登录表单区 -->
    <div class="form-section">
      <div class="form-container">
        <div class="form-header">
          <h2>欢迎回来</h2>
          <p>登录您的账号继续创作</p>
        </div>
        
        <!-- 登录表单 -->
        <div class="login-form">
          <el-form ref="loginFormRef" :model="loginForm" :rules="loginRules" label-width="0">
            <el-form-item prop="account">
              <el-input
                v-model="loginForm.account"
                placeholder="邮箱或用户名"
                prefix-icon="User"
                size="large"
              />
            </el-form-item>
            
            <el-form-item prop="password">
              <el-input
                v-model="loginForm.password"
                type="password"
                placeholder="密码"
                prefix-icon="Lock"
                size="large"
                show-password
                @keyup.enter="handleLogin"
              />
            </el-form-item>
            
            <el-form-item>
              <el-button
                type="primary"
                size="large"
                class="submit-btn"
                :loading="loading"
                @click="handleLogin"
              >
                登录
              </el-button>
            </el-form-item>
          </el-form>
          
          <div class="form-footer">
            <span>还没有账号？</span>
            <router-link to="/register">立即注册</router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { useSiteSettingsStore } from '@/stores/siteSettings'
import { authAPI } from '@/api'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const siteSettingsStore = useSiteSettingsStore()
const loginFormRef = ref()
const loading = ref(false)

// 登录表单数据
const loginForm = reactive({
  account: '',
  password: ''
})

// 登录表单验证规则
const loginRules = {
  account: [
    { required: true, message: '请输入邮箱或用户名', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 20, message: '密码长度在 6 到 20 个字符', trigger: 'blur' }
  ]
}

// 网站配置
const siteConfig = computed(() => ({
  siteName: siteSettingsStore.settings.siteName || '网文创作平台',
  siteDescription: siteSettingsStore.settings.siteDescription || '专业的AI辅助小说创作平台，让创作更简单',
  siteKeywords: siteSettingsStore.settings.siteKeywords || 'AI小说,小说创作,人工智能写作',
  siteLogo: siteSettingsStore.settings.siteLogo || '',
  siteIcon: siteSettingsStore.settings.siteIcon || ''
}))

// 处理登录
const handleLogin = async () => {
  if (!loginFormRef.value) return
  
  try {
    await loginFormRef.value.validate()
    loading.value = true
    
    // 调用真实的登录API
    const response = await authAPI.login({
      account: loginForm.account,
      password: loginForm.password
    })
    
    // 登录成功，设置用户信息
    const userData = {
      token: response.data.token,
      userInfo: response.data.user,
      role: response.data.user.role || (response.data.user.is_admin ? 'admin' : 'client')
    }
    
    // 保存用户信息到store
    userStore.login(userData)
    
    ElMessage.success('登录成功')
    
    // 根据用户角色跳转到对应页面
    if (userData.role === 'admin') {
      router.push('/admin')
    } else {
      router.push('/client/dashboard')
    }
    
  } catch (error) {
    console.error('登录失败:', error)
    // 优先使用API返回的错误信息
    let errorMessage = '登录失败，请检查用户名和密码'
    if (error.response && error.response.data && error.response.data.message) {
      errorMessage = error.response.data.message
    } else if (error.message) {
      errorMessage = error.message
    }
    ElMessage.error(errorMessage)
  } finally {
    loading.value = false
  }
}



// 页面初始化
onMounted(async () => {
  await siteSettingsStore.loadPublicSettings()
  
  // 从URL参数自动填充邮箱
  const email = route.query.email
  if (email) {
    loginForm.account = email
  }
  
  // 设置页面标题和图标
  document.title = siteConfig.value.siteName
  if (siteConfig.value.siteIcon) {
    const favicon = document.querySelector('link[rel="icon"]') || document.createElement('link')
    favicon.rel = 'icon'
    favicon.href = siteConfig.value.siteIcon
    document.head.appendChild(favicon)
  }
  
  // 设置meta标签
  const metaDescription = document.querySelector('meta[name="description"]') || document.createElement('meta')
  metaDescription.name = 'description'
  metaDescription.content = siteConfig.value.siteDescription
  document.head.appendChild(metaDescription)
  
  const metaKeywords = document.querySelector('meta[name="keywords"]') || document.createElement('meta')
  metaKeywords.name = 'keywords'
  metaKeywords.content = siteConfig.value.siteKeywords
  document.head.appendChild(metaKeywords)
})
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
}

/* 左侧品牌展示区 */
.brand-section {
  flex: 1;
  background: #1a1a1a;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px;
  position: relative;
  overflow: hidden;
}

.brand-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
  background-image: url("data:image/svg+xml,%3Csvg width='10' height='10' viewBox='0 0 10 10' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.015'%3E%3Cpath d='M0 5h10v0.2H0zM5 0v10h0.2V0z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
  opacity: 0.8;
  z-index: 1;
}

.brand-section::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle at 30% 70%, rgba(99, 102, 241, 0.08) 0%, transparent 50%);
  pointer-events: none;
  z-index: 2;
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
}

.brand-content {
  text-align: left;
  color: white;
  z-index: 3;
  position: relative;
  max-width: 520px;
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 60vh;
}

.brand-logo {
  display: flex;
  align-items: center;
  margin-bottom: 60px;
  opacity: 0;
  animation: fadeInUp 1s ease 0.2s forwards;
}

.logo-icon {
  width: 64px;
  height: 64px;
  margin-right: 18px;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
}

.brand-logo h1 {
  font-size: 32px;
  font-weight: 800;
  margin: 0;
  letter-spacing: -0.8px;
  color: #ffffff;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.brand-description {
  margin-bottom: 60px;
  opacity: 0;
  animation: fadeInUp 1s ease 0.4s forwards;
}

.brand-description h2 {
  font-size: 42px;
  font-weight: 700;
  margin: 0 0 24px 0;
  line-height: 1.1;
  letter-spacing: -1px;
  color: #ffffff;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  background: linear-gradient(135deg, #ffffff 0%, #e5e5e5 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.brand-description p {
  font-size: 19px;
  color: #b8b8b8;
  line-height: 1.7;
  margin: 0;
  font-weight: 400;
  max-width: 460px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.feature-list {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
  opacity: 0;
  animation: fadeInUp 1s ease 0.6s forwards;
}

.feature-item {
  display: flex;
  align-items: flex-start;
  gap: 20px;
  padding: 24px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(10px);
  position: relative;
  overflow: hidden;
  cursor: pointer;
}

.feature-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, transparent 50%);
  opacity: 0;
  transition: opacity 0.4s ease;
}

.feature-item:hover {
  transform: translateY(-4px);
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.15);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.feature-item:hover::before {
  opacity: 1;
}

.feature-icon {
  font-size: 24px;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #ffffff;
  font-weight: 400;
  position: relative;
  z-index: 1;
}

.feature-text {
  flex: 1;
  position: relative;
  z-index: 1;
}

.feature-text h4 {
  font-size: 20px;
  font-weight: 700;
  margin: 0 0 8px 0;
  color: #ffffff;
  letter-spacing: -0.3px;
}

.feature-text p {
  font-size: 16px;
  color: #eaeaea;
  margin: 0;
  line-height: 1.6;
  font-weight: 400;
}

/* 右侧表单区 */
.form-section {
  flex: 1;
  background: #fafafa;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px;
  min-height: 100vh;
  position: relative;
}

.form-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60"><defs><pattern id="dots" width="30" height="30" patternUnits="userSpaceOnUse"><circle cx="15" cy="15" r="0.8" fill="%23e8e8e8" opacity="0.6"/></pattern></defs><rect width="60" height="60" fill="url(%23dots)"/></svg>');
  opacity: 0.7;
  pointer-events: none;
}

.form-container {
  width: 100%;
  max-width: 420px;
  background: #ffffff;
  padding: 48px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border: 1px solid #e5e5e5;
  position: relative;
  z-index: 1;
  transition: all 0.3s ease;
}

.form-container:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.form-header {
  text-align: center;
  margin-bottom: 40px;
}

.form-header h2 {
  font-size: 28px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 12px 0;
  letter-spacing: -0.5px;
}

.form-header p {
  font-size: 16px;
  color: #666666;
  margin: 0;
  line-height: 1.5;
  font-weight: 400;
}

.login-form,
.register-form {
  margin-bottom: 32px;
}

.login-form :deep(.el-form-item),
.register-form :deep(.el-form-item) {
  margin-bottom: 24px;
}

.login-form :deep(.el-input__wrapper),
.register-form :deep(.el-input__wrapper) {
  background-color: #ffffff;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  padding: 12px 16px;
  transition: all 0.3s ease;
  position: relative;
  min-height: 40px;
}

.login-form :deep(.el-input__wrapper:hover),
.register-form :deep(.el-input__wrapper:hover) {
  border-color: #999999;
  background-color: #ffffff;
}

.login-form :deep(.el-input.is-focus .el-input__wrapper),
.register-form :deep(.el-input.is-focus .el-input__wrapper) {
  border-color: #1a1a1a;
  background-color: #ffffff;
  box-shadow: 0 0 0 2px rgba(26, 26, 26, 0.1);
}

.login-form :deep(.el-input__inner),
.register-form :deep(.el-input__inner) {
  color: #1e293b;
  font-size: 16px;
  font-weight: 500;
}

.login-form :deep(.el-input__inner::placeholder),
.register-form :deep(.el-input__inner::placeholder) {
  color: #94a3b8;
  font-weight: 400;
}

.submit-btn {
  width: 100%;
  height: 48px;
  background: #1a1a1a;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.5px;
  transition: all 0.3s ease;
  position: relative;
}

.submit-btn:hover {
  background: #333333;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.submit-btn:active {
  transform: translateY(0);
}

.form-footer {
  text-align: center;
  color: #666666;
  font-size: 14px;
  padding: 20px 0;
  border-top: 1px solid #e5e5e5;
  margin-top: 24px;
}

.form-footer a {
  color: #1a1a1a;
  text-decoration: none;
  font-weight: 600;
  margin-left: 6px;
  transition: all 0.3s ease;
  position: relative;
}

.form-footer a::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  width: 0;
  height: 1px;
  background: #1a1a1a;
  transition: width 0.3s ease;
}

.form-footer a:hover {
  color: #333333;
}

.form-footer a:hover::after {
  width: 100%;
}

.invite-code-status {
  margin-top: 8px;
  font-size: 14px;
  font-weight: 500;
}

.invite-code-status .valid {
  color: #10b981;
}

.invite-code-status .invalid {
  color: #ef4444;
}

/* 输入框图标样式 */
.login-form :deep(.el-input__prefix),
.register-form :deep(.el-input__prefix) {
  color: #94a3b8;
}

.login-form :deep(.el-input.is-focus .el-input__prefix),
.register-form :deep(.el-input.is-focus .el-input__prefix) {
  color: #6366f1;
}

/* 验证按钮样式 */
.register-form :deep(.el-input-group__append .el-button) {
  background: #6366f1;
  border: none;
  color: white;
  border-radius: 0 12px 12px 0;
  font-weight: 600;
  transition: all 0.3s ease;
}

.register-form :deep(.el-input-group__append .el-button:hover) {
  background: #5b5bd6;
}

/* 注册表单特殊样式 */
.register-form {
  position: relative;
}

.register-form.active {
  animation: slideInUp 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.register-form.active :deep(.el-form-item) {
  animation: fadeInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  opacity: 0;
}

.register-form.active :deep(.el-form-item:nth-child(1)) { animation-delay: 0.1s; }
.register-form.active :deep(.el-form-item:nth-child(2)) { animation-delay: 0.2s; }
.register-form.active :deep(.el-form-item:nth-child(3)) { animation-delay: 0.3s; }
.register-form.active :deep(.el-form-item:nth-child(4)) { animation-delay: 0.4s; }
.register-form.active :deep(.el-form-item:nth-child(5)) { animation-delay: 0.5s; }
.register-form.active .submit-btn { 
  animation: fadeInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) 0.6s forwards;
  opacity: 0;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
}

@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(30px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes glow {
  0%, 100% {
    box-shadow: 0 0 20px rgba(99, 102, 241, 0.3);
  }
  50% {
    box-shadow: 0 0 30px rgba(99, 102, 241, 0.5);
  }
}

/* 注册表单简洁样式 */
.register-form {
  position: relative;
}

.register-form.active {
  animation: slideInUp 0.4s ease;
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .login-container {
    flex-direction: column;
  }
  
  .brand-section {
    min-height: 40vh;
    padding: 40px 20px;
  }
  
  .form-section {
    padding: 40px 20px;
  }
  
  .brand-description h2 {
    font-size: 28px;
  }
  
  .feature-list {
    display: none;
  }
}

@media (max-width: 768px) {
  .brand-section {
    min-height: 30vh;
    padding: 30px 20px;
  }
  
  .form-section {
    padding: 30px 20px;
  }
  
  .form-header h2 {
    font-size: 28px;
  }
  
  .brand-logo {
    margin-bottom: 24px;
  }
  
  .brand-logo h1 {
    font-size: 24px;
  }
  
  .brand-description {
    margin-bottom: 0;
  }
  
  .brand-description h2 {
    font-size: 24px;
  }
  
  .brand-description p {
    font-size: 16px;
  }
}
</style>