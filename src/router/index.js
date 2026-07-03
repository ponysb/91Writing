import { createRouter, createWebHistory, createWebHashHistory } from 'vue-router'
import Dashboard from '../views/Dashboard.vue'
import HomePage from '../views/HomePage.vue'
import PromptsLibrary from '../views/PromptsLibrary.vue'
import NovelManagement from '../views/NovelManagement.vue'
import WritingGoals from '../views/WritingGoals.vue'
import TokenBilling from '../views/TokenBilling.vue'
import ApiConfig from '../views/ApiConfig.vue'
import Settings from '../views/Settings.vue'
import ChapterManagement from '../views/ChapterManagement.vue'
import Writer from '../views/Writer.vue'
import GenreManagement from '../views/GenreManagement.vue'
import ToolsLibrary from '../views/ToolsLibrary.vue'
import ShortStory from '../views/ShortStory.vue'
import BookAnalysis from '../views/BookAnalysis.vue'
import Auth from '../views/Auth.vue'

const routes = [
  {
    path: '/auth',
    name: 'Auth',
    component: Auth
  },
  {
    path: '/',
    component: Dashboard,
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'HomePage',
        component: HomePage
      },
      {
        path: 'prompts',
        name: 'PromptsLibrary',
        component: PromptsLibrary
      },
      {
        path: 'novels',
        name: 'NovelManagement',
        component: NovelManagement
      },
      {
        path: 'goals',
        name: 'WritingGoals',
        component: WritingGoals
      },
      {
        path: 'billing',
        name: 'TokenBilling',
        component: TokenBilling
      },
      {
        path: 'config',
        name: 'ApiConfig',
        component: ApiConfig
      },
      {
        path: 'settings',
        name: 'Settings',
        component: Settings
      },
      {
        path: 'chapters',
        name: 'ChapterManagement',
        component: ChapterManagement
      },
      {
        path: 'writer',
        name: 'Writer',
        component: Writer
      },
      {
        path: 'genres',
        name: 'GenreManagement',
        component: GenreManagement
      },
      {
        path: 'tools',
        name: 'ToolsLibrary',
        component: ToolsLibrary
      },
      {
        path: 'short-story',
        name: 'ShortStory',
        component: ShortStory
      },
      {
        path: 'book-analysis',
        name: 'BookAnalysis',
        component: BookAnalysis
      }
    ]
  }
  ]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('auth_token')
  
  if (to.meta.requiresAuth && !token) {
    // 需要认证但未登录，跳转到登录页
    next('/auth')
  } else if (to.path === '/auth' && token) {
    // 已登录但访问登录页，跳转到首页
    next('/')
  } else {
    next()
  }
})

export default router