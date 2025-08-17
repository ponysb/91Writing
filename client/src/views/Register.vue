<template>
  <div class="register-container">
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
    
    <!-- 右侧注册表单区 -->
    <div class="form-section">
      <div class="form-container">
        <div class="form-header">
          <h2>创建账号</h2>
          <p>加入我们，开始您的创作之旅</p>
        </div>
        
        <!-- 注册表单 -->
        <div class="register-form">
          <el-form ref="registerFormRef" :model="registerForm" :rules="registerRules" label-width="0">
            <el-form-item prop="username">
              <el-input
                v-model="registerForm.username"
                placeholder="用户名（3-20字符）"
                prefix-icon="User"
                size="large"
              />
            </el-form-item>
            
            <el-form-item prop="email">
              <el-input
                v-model="registerForm.email"
                placeholder="邮箱地址"
                prefix-icon="Message"
                size="large"
              />
            </el-form-item>
            
            <el-form-item prop="password">
              <el-input
                v-model="registerForm.password"
                type="password"
                placeholder="密码（至少6位）"
                prefix-icon="Lock"
                size="large"
                show-password
              />
            </el-form-item>
            

            
            <el-form-item prop="inviteCode">
              <div class="invite-code-wrapper">
                <el-input
                  v-model="registerForm.inviteCode"
                  placeholder="邀请码（可选）"
                  prefix-icon="Ticket"
                  size="large"
                  class="invite-code-input"
                />
                <el-button 
                  v-if="registerForm.inviteCode" 
                  @click="validateInviteCode"
                  :loading="inviteCodeValidating"
                  type="primary"
                  size="large"
                  class="validate-btn"
                >
                  验证
                </el-button>
              </div>
              <div v-if="inviteCodeStatus" class="invite-code-status">
                <span :class="inviteCodeStatus.valid ? 'valid' : 'invalid'">
                  {{ inviteCodeStatus.message }}
                </span>
              </div>
            </el-form-item>
            
            <el-form-item>
              <el-button
                type="primary"
                size="large"
                class="submit-btn"
                :loading="loading"
                @click="handleRegister"
              >
                注册
              </el-button>
            </el-form-item>
          </el-form>
          
          <div class="form-footer">
            <span>已有账号？</span>
            <router-link to="/login">立即登录</router-link>
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
const registerFormRef = ref()
const loading = ref(false)
const inviteCodeValidating = ref(false)
const inviteCodeStatus = ref(null)

// 注册表单数据
const registerForm = reactive({
  username: '',
  email: '',
  password: '',
  inviteCode: ''
})

// 网站配置
const siteConfig = computed(() => ({
  siteName: siteSettingsStore.settings.siteName || '网文创作平台',
  siteDescription: siteSettingsStore.settings.siteDescription || '专业的AI辅助小说创作平台，让创作更简单',
  siteKeywords: siteSettingsStore.settings.siteKeywords || 'AI小说,小说创作,人工智能写作',
  siteLogo: siteSettingsStore.settings.siteLogo || '',
  siteIcon: siteSettingsStore.settings.siteIcon || ''
}))

// 注册表单验证规则
const registerRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度在 3 到 20 个字符', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 20, message: '密码长度在 6 到 20 个字符', trigger: 'blur' }
  ]
}

// 处理注册
const handleRegister = async () => {
  if (!registerFormRef.value) return
  
  try {
    await registerFormRef.value.validate()
    loading.value = true
    
    // 调用注册API
    const response = await authAPI.register({
      username: registerForm.username,
      email: registerForm.email,
      password: registerForm.password,
      invite_code: registerForm.inviteCode || undefined
    })
    
    ElMessage.success('注册成功，请登录')
    
    // 跳转到登录页面，并将邮箱作为参数传递
    router.push({
      path: '/login',
      query: { email: registerForm.email }
    })
    
  } catch (error) {
    console.error('注册失败:', error)
    // 优先使用API返回的错误信息
    let errorMessage = '注册失败，请检查输入信息'
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

// 验证邀请码
const validateInviteCode = async () => {
  if (!registerForm.inviteCode) {
    inviteCodeStatus.value = null
    return
  }
  
  try {
    inviteCodeValidating.value = true
    
    const response = await authAPI.validateInviteCode(registerForm.inviteCode)
    
    inviteCodeStatus.value = {
      valid: true,
      message: `邀请码有效 - ${response.data.description || '可享受特殊权益'}`
    }
    
  } catch (error) {
    // 优先使用API返回的错误信息
    let errorMessage = '邀请码无效或已过期'
    if (error.response && error.response.data && error.response.data.message) {
      errorMessage = error.response.data.message
    } else if (error.message) {
      errorMessage = error.message
    }
    inviteCodeStatus.value = {
      valid: false,
      message: errorMessage
    }
  } finally {
    inviteCodeValidating.value = false
  }
}

// 页面初始化
onMounted(async () => {
  await siteSettingsStore.loadPublicSettings()
  
  // 从URL参数自动填充激活码
  const inviteCode = route.query.code || route.query.invite_code || route.query.inviteCode
  if (inviteCode) {
    registerForm.inviteCode = inviteCode
    // 自动验证激活码
    await validateInviteCode()
  }
  
  // 设置页面标题和图标
  document.title = `注册 - ${siteConfig.value.siteName}`
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
.register-container {
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
  max-width: 500px;
  animation: float 6s ease-in-out infinite;
}

.brand-logo {
  display: flex;
  align-items: center;
  margin-bottom: 40px;
}

.logo-icon {
  width: 60px;
  height: 60px;
  margin-right: 16px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(255, 255, 255, 0.2);
}

.logo-icon svg {
  width: 100%;
  height: 100%;
}

.brand-logo h1 {
  font-size: 32px;
  font-weight: 800;
  margin: 0;
  color: #ffffff;
  letter-spacing: -1px;
}

.brand-description {
  margin-bottom: 48px;
}

.brand-description h2 {
  font-size: 36px;
  font-weight: 700;
  margin: 0 0 16px 0;
  line-height: 1.2;
  letter-spacing: -1px;
  color: #ffffff;
}

.brand-description p {
  font-size: 18px;
  color: rgba(255, 255, 255, 0.8);
  margin: 0;
  line-height: 1.6;
  font-weight: 400;
}

.feature-list {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.feature-item {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #ffffff;
  font-weight: 400;
  position: relative;
  z-index: 1;
}

.feature-icon {
  font-size: 24px;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  border-radius: 12px;
  flex-shrink: 0;
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

.invite-code-wrapper {
  display: flex;
  gap: 12px;
  align-items: stretch;
}

.invite-code-input {
  flex: 1;
}

.validate-btn {
  flex-shrink: 0;
  min-width: 80px;
  height: 40px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
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
  .register-container {
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