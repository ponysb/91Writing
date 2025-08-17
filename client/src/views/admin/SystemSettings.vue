<template>
  <div class="system-settings">
    <div class="page-header">
      <h1 class="page-title">网站设置</h1>
      <p class="page-desc">管理网站基础信息和社交媒体配置</p>
    </div>

    <!-- 基础设置 -->
    <el-card class="settings-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span>基础设置</span>
        </div>
      </template>
      
      <el-form ref="basicFormRef" :model="basicSettings" :rules="basicRules" label-width="120px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="网站名称" prop="siteName">
              <el-input v-model="basicSettings.siteName" placeholder="请输入网站名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="网站版本" prop="version">
              <el-input v-model="basicSettings.version" placeholder="请输入版本号" />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item label="网站描述" prop="siteDescription">
          <el-input 
            v-model="basicSettings.siteDescription" 
            type="textarea" 
            :rows="3" 
            placeholder="请输入网站描述" 
          />
        </el-form-item>
        
        <el-form-item label="网站关键词" prop="siteKeywords">
          <el-input v-model="basicSettings.siteKeywords" placeholder="请输入关键词，用逗号分隔" />
        </el-form-item>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="网站Logo" prop="siteLogo">
              <div class="upload-container">
                <el-upload
                  class="logo-uploader"
                  :action="''"
                  :http-request="uploadLogo"
                  :show-file-list="false"
                  :before-upload="beforeLogoUpload"
                  accept=".jpg,.jpeg,.png,.gif,.webp,.svg"
                >
                  <img v-if="basicSettings.siteLogo" :src="getFullImageUrl(basicSettings.siteLogo)" class="logo-preview" />
                  <el-icon v-else class="logo-uploader-icon"><Plus /></el-icon>
                </el-upload>
                <div class="upload-tips">支持 JPG、PNG、GIF、WebP、SVG 格式，文件大小不超过 5MB</div>
                <el-input v-model="basicSettings.siteLogo" placeholder="Logo路径" readonly style="margin-top: 8px;" />
              </div>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="网站图标" prop="siteIcon">
              <div class="upload-container">
                <el-upload
                  class="icon-uploader"
                  :action="''"
                  :http-request="uploadIcon"
                  :show-file-list="false"
                  :before-upload="beforeIconUpload"
                  accept=".jpg,.jpeg,.png,.gif,.webp,.svg,.ico"
                >
                  <img v-if="basicSettings.siteIcon" :src="getFullImageUrl(basicSettings.siteIcon)" class="icon-preview" />
                  <el-icon v-else class="icon-uploader-icon"><Plus /></el-icon>
                </el-upload>
                <div class="upload-tips">支持 JPG、PNG、GIF、WebP、SVG、ICO 格式，文件大小不超过 2MB</div>
                <el-input v-model="basicSettings.siteIcon" placeholder="图标路径" readonly style="margin-top: 8px;" />
              </div>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="备案号" prop="icp">
              <el-input v-model="basicSettings.icp" placeholder="请输入备案号" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="联系邮箱" prop="contactEmail">
              <el-input v-model="basicSettings.contactEmail" placeholder="请输入联系邮箱" />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="联系QQ" prop="contactQQ">
              <el-input v-model="basicSettings.contactQQ" placeholder="请输入联系QQ" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="联系微信" prop="contactWechat">
              <el-input v-model="basicSettings.contactWechat" placeholder="请输入联系微信" />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="发卡平台" prop="cardPlatformUrl">
              <el-input v-model="basicSettings.cardPlatformUrl" placeholder="请输入发卡平台链接" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="版权信息" prop="copyright">
              <el-input v-model="basicSettings.copyright" placeholder="请输入版权信息" />
            </el-form-item>
          </el-col>
        </el-row>
        
        <div class="form-actions">
          <el-button type="primary" @click="saveBasicSettings" :loading="saving">
            保存基础设置
          </el-button>
        </div>
      </el-form>
    </el-card>

    <!-- 协议设置 -->
    <el-card class="settings-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span>协议设置</span>
        </div>
      </template>
      
      <el-form :model="agreementSettings" label-width="120px">
        <el-form-item label="隐私协议">
          <el-input 
            v-model="agreementSettings.privacyPolicy" 
            type="textarea" 
            :rows="6" 
            placeholder="请输入隐私协议内容" 
          />
        </el-form-item>
        
        <el-form-item label="用户协议">
          <el-input 
            v-model="agreementSettings.userAgreement" 
            type="textarea" 
            :rows="6" 
            placeholder="请输入用户协议内容" 
          />
        </el-form-item>
        
        <el-form-item label="会员协议">
          <el-input 
            v-model="agreementSettings.membershipAgreement" 
            type="textarea" 
            :rows="6" 
            placeholder="请输入会员协议内容" 
          />
        </el-form-item>
        
        <el-form-item label="关于我们">
          <el-input 
            v-model="agreementSettings.aboutUs" 
            type="textarea" 
            :rows="6" 
            placeholder="请输入关于我们的内容" 
          />
        </el-form-item>
        
        <div class="form-actions">
          <el-button type="primary" @click="saveAgreementSettings" :loading="saving">
            保存协议设置
          </el-button>
        </div>
      </el-form>
    </el-card>

    <!-- 社交媒体设置 -->
    <el-card class="settings-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span>社交媒体设置</span>
        </div>
      </template>
      
      <el-form :model="socialSettings" label-width="120px">
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="微博链接">
              <el-input v-model="socialSettings.socialMedia.weibo" placeholder="请输入微博链接" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="抖音账号">
              <el-input v-model="socialSettings.socialMedia.douyin" placeholder="请输入抖音账号" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="B站链接">
              <el-input v-model="socialSettings.socialMedia.bilibili" placeholder="请输入B站链接" />
            </el-form-item>
          </el-col>
        </el-row>
        
        <div class="form-actions">
          <el-button type="primary" @click="saveSocialSettings" :loading="saving">
            保存社交媒体设置
          </el-button>
        </div>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { useSiteSettingsStore } from '@/stores/siteSettings'
import { useUserStore } from '@/stores/user'
import { siteSettingsAPI } from '@/api/siteSettings'
import { updateFavicon } from '@/utils/faviconUtils'

const saving = ref(false)
const siteSettingsStore = useSiteSettingsStore()
const userStore = useUserStore()

// 获取管理员token
const getAdminToken = () => {
  return userStore.token || localStorage.getItem('admin_token') || localStorage.getItem('token')
}

// 表单引用
const basicFormRef = ref()

// 基础设置
const basicSettings = ref({
  siteName: '',
  siteDescription: '',
  siteKeywords: '',
  siteLogo: '',
  siteIcon: '',
  icp: '',
  contactEmail: '',
  contactQQ: '',
  contactWechat: '',
  cardPlatformUrl: '',
  copyright: '',
  version: ''
})





// 协议设置
const agreementSettings = ref({
  privacyPolicy: '',
  userAgreement: '',
  membershipAgreement: '',
  aboutUs: ''
})

// 社交媒体设置
const socialSettings = ref({
  socialMedia: {
    weibo: '',
    douyin: '',
    bilibili: ''
  }
})

// 表单验证规则
const basicRules = {
  siteName: [{ required: true, message: '请输入网站名称', trigger: 'blur' }],
  siteDescription: [{ required: true, message: '请输入网站描述', trigger: 'blur' }],
  contactEmail: [
    { required: true, message: '请输入联系邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ]
}

// Logo上传前验证
const beforeLogoUpload = (file) => {
  const isValidType = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'].includes(file.type)
  const isLt5M = file.size / 1024 / 1024 < 5

  if (!isValidType) {
    ElMessage.error('只支持上传 JPG、PNG、GIF、WebP、SVG 格式的图片文件')
    return false
  }
  if (!isLt5M) {
    ElMessage.error('上传文件大小不能超过 5MB')
    return false
  }
  return true
}

// Icon上传前验证
const beforeIconUpload = (file) => {
  const isValidType = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/x-icon'].includes(file.type)
  const isLt2M = file.size / 1024 / 1024 < 2

  if (!isValidType) {
    ElMessage.error('只支持上传 JPG、PNG、GIF、WebP、SVG、ICO 格式的图片文件')
    return false
  }
  if (!isLt2M) {
    ElMessage.error('上传文件大小不能超过 2MB')
    return false
  }
  return true
}

// 上传Logo
const uploadLogo = async (options) => {
  try {
    const token = getAdminToken()
    const response = await siteSettingsAPI.uploadLogo(token, options.file)
    
    console.log('Logo上传响应:', response)
    
    // 统一处理响应数据
    let data = response
    if (response && typeof response === 'object') {
      // 如果是axios响应，取data字段
      if (response.data) {
        data = response.data
      }
      // 如果有config字段，说明是axios响应对象
      if (response.config) {
        data = response.data
      }
    }
    
    console.log('处理后的数据:', data)
    
    // 检查是否上传成功 - 简化判断逻辑
    const logoPath = data?.data?.logoPath || data?.logoPath
    
    if (logoPath) {
      basicSettings.value.siteLogo = logoPath
      ElMessage.success('Logo上传成功')
      options.onSuccess(data)
    } else {
      const errorMsg = data?.message || 'Logo上传失败'
      console.error('Logo上传失败:', errorMsg, data)
      ElMessage.error(errorMsg)
      options.onError(new Error(errorMsg))
    }
  } catch (error) {
    console.error('Logo上传异常:', error)
    ElMessage.error('Logo上传失败')
    options.onError(error)
  }
}

// 上传Icon
const uploadIcon = async (options) => {
  try {
    const token = getAdminToken()
    const response = await siteSettingsAPI.uploadIcon(token, options.file)
    
    console.log('Icon上传响应:', response)
    
    // 统一处理响应数据
    let data = response
    if (response && typeof response === 'object') {
      // 如果是axios响应，取data字段
      if (response.data) {
        data = response.data
      }
      // 如果有config字段，说明是axios响应对象
      if (response.config) {
        data = response.data
      }
    }
    
    console.log('处理后的数据:', data)
    
    // 检查是否上传成功 - 简化判断逻辑
    const iconPath = data?.data?.iconPath || data?.iconPath
  
    
    if (iconPath) {
      basicSettings.value.siteIcon = iconPath
      // 立即更新favicon
      updateFavicon(iconPath)
      ElMessage.success('Icon上传成功')
      options.onSuccess(data)
    } else {
      const errorMsg = data?.message || 'Icon上传失败'
      console.error('Icon上传失败:', errorMsg, data)
      ElMessage.error(errorMsg)
      options.onError(new Error(errorMsg))
    }
  } catch (error) {
    console.error('Icon上传异常:', error)
    ElMessage.error('Icon上传失败')
    options.onError(error)
  }
}

// 保存基础设置
const saveBasicSettings = async () => {
  try {
    await basicFormRef.value.validate()
    saving.value = true
    
    const token = getAdminToken()
    await siteSettingsStore.updateSettings(token, basicSettings.value)
    
    // 如果有新的icon，立即更新favicon
    if (basicSettings.value.siteIcon) {
      updateFavicon(basicSettings.value.siteIcon)
    }
    
    ElMessage.success('基础设置保存成功')
  } catch (error) {
    console.error('保存失败:', error)
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}





// 保存协议设置
const saveAgreementSettings = async () => {
  saving.value = true
  try {
    const token = getAdminToken()
    await siteSettingsStore.updateSettings(token, agreementSettings.value)
    
    ElMessage.success('协议设置保存成功')
  } catch (error) {
    console.error('保存失败:', error)
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

// 保存社交媒体设置
const saveSocialSettings = async () => {
  saving.value = true
  try {
    const token = getAdminToken()
    await siteSettingsStore.updateSettings(token, socialSettings.value)
    
    ElMessage.success('社交媒体设置保存成功')
  } catch (error) {
    console.error('保存失败:', error)
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

// 加载设置数据
const loadSettings = async () => {
  try {
    const token = getAdminToken()
    const response = await siteSettingsStore.loadAdminSettings(token)
    
    if (response && response.data) {
      const data = response.data
      
      // 基础设置
      Object.assign(basicSettings.value, {
        siteName: data.siteName || '',
        siteDescription: data.siteDescription || '',
        siteKeywords: data.siteKeywords || '',
        siteLogo: data.siteLogo || '',
        siteIcon: data.siteIcon || '',
        icp: data.icp || '',
        contactEmail: data.contactEmail || '',
        contactQQ: data.contactQQ || '',
        contactWechat: data.contactWechat || '',
        cardPlatformUrl: data.cardPlatformUrl || '',
        copyright: data.copyright || '',
        version: data.version || ''
      })
      
      // 协议设置
      Object.assign(agreementSettings.value, {
        privacyPolicy: data.privacyPolicy || '',
        userAgreement: data.userAgreement || '',
        membershipAgreement: data.membershipAgreement || '',
        aboutUs: data.aboutUs || ''
      })
      
      // 社交媒体设置
      Object.assign(socialSettings.value, {
        socialMedia: {
          weibo: data.socialMedia?.weibo || '',
          douyin: data.socialMedia?.douyin || '',
          bilibili: data.socialMedia?.bilibili || ''
        }
      })
    }
  } catch (error) {
    console.error('加载设置失败:', error)
    ElMessage.error('加载设置失败')
  }
}

// 获取完整的图片URL
const getFullImageUrl = (imagePath) => {
  if (!imagePath) return ''
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath
  }
  const baseUrl = import.meta.env.VITE_IMAGE_BASE_URL || 'http://localhost:3000'
  return `${baseUrl}${imagePath}`
}

onMounted(() => {
  loadSettings()
})
</script>

<style scoped>
.system-settings {
  padding: 20px;
}

.page-header {
  margin-bottom: 24px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #333;
  margin: 0 0 8px 0;
}

.page-desc {
  color: #666;
  margin: 0;
}

.settings-card {
  margin-bottom: 20px;
}

.card-header {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.form-actions {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #ebeef5;
  text-align: right;
}

.form-actions .el-button {
  margin-left: 10px;
}

/* 上传组件样式 */
.upload-container {
  width: 100%;
}

.logo-uploader, .icon-uploader {
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: border-color 0.3s;
  width: 120px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-uploader:hover, .icon-uploader:hover {
  border-color: #409eff;
}

.logo-uploader-icon, .icon-uploader-icon {
  font-size: 28px;
  color: #8c939d;
  width: 120px;
  height: 120px;
  text-align: center;
  line-height: 120px;
}

.logo-preview, .icon-preview {
  width: 120px;
  height: 120px;
  object-fit: contain;
  display: block;
}

.icon-uploader {
  width: 80px;
  height: 80px;
}

.icon-uploader-icon {
  width: 80px;
  height: 80px;
  line-height: 80px;
  font-size: 24px;
}

.icon-preview {
  width: 80px;
  height: 80px;
}

.upload-tips {
  font-size: 12px;
  color: #999;
  margin-top: 8px;
  line-height: 1.4;
}
</style>