import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import enUs from 'element-plus/dist/locale/en.mjs'
import router from './router'
import i18n, { getCurrentLocale } from './locales'
import { useSiteSettingsStore } from './stores/siteSettings'
import { updateSiteInfo } from './utils/faviconUtils'
import './style.css'
import App from './App.vue'

const app = createApp(App)
const pinia = createPinia()

// 注册所有图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// 根据当前语言设置Element Plus的语言包
function getElementPlusLocale() {
  const currentLocale = getCurrentLocale()
  return currentLocale === 'en-US' ? enUs : zhCn
}

app.use(pinia)
app.use(router)
app.use(i18n)
app.use(ElementPlus, {
  locale: getElementPlusLocale(),
})

// 动态设置favicon和页面标题
const setupSiteSettings = async () => {
  const siteSettingsStore = useSiteSettingsStore()
  
  // 初始化网站设置
  await siteSettingsStore.initializeSettings()
  
  // 设置页面标题和图标
  updateSiteInfo({
    title: siteSettingsStore.settings.siteName,
    iconPath: siteSettingsStore.settings.siteIcon
  })
}

// 先设置网站配置，再挂载应用
setupSiteSettings().then(() => {
  app.mount('#app')
}).catch(() => {
  // 即使设置失败也要挂载应用
  app.mount('#app')
})
