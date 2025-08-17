import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'

// 导入布局组件
import ClientLayout from '@/layouts/ClientLayout.vue'
import AdminLayout from '@/layouts/AdminLayout.vue'

// 导入页面组件
import Login from '@/views/Login.vue'
import Register from '@/views/Register.vue'
import Dashboard from '@/views/client/Dashboard.vue'
import NovelList from '@/views/client/NovelList.vue'
import NovelCreate from '@/views/client/NovelCreate.vue'
import NovelEditor from '@/views/client/NovelEditor.vue'
import MindMap from '@/views/client/MindMap.vue'
import PromptLibrary from '@/views/client/PromptLibrary.vue'
import ToolLibrary from '@/views/client/ToolLibrary.vue'
import AIChat from '@/views/client/AIChat.vue'
import ShortStoryWriting from '@/views/client/ShortStoryWriting.vue'
import BookAnalysis from '@/views/client/BookAnalysis.vue'
import SystemSettings from '@/views/client/SystemSettings.vue'
import ManagementCenter from '@/views/client/ManagementCenter.vue'

// 导入管理后台页面组件
import AdminDashboard from '@/views/admin/Dashboard.vue'
import UserManagement from '@/views/admin/UserManagement.vue'
import NovelManagement from '@/views/admin/NovelManagement.vue'
import PromptManagement from '@/views/admin/PromptManagement.vue'
import NovelTypeManagement from '@/views/admin/NovelTypeManagement.vue'
import AIModelManagement from '@/views/admin/AIModelManagement.vue'
import MembershipManagement from '@/views/admin/MembershipManagement.vue'
import CardManagement from '@/views/admin/CardManagement.vue'
import InvitationManagement from '@/views/admin/InvitationManagement.vue'
import InviteRecordManagement from '@/views/admin/InviteRecordManagement.vue'
import CommissionRecords from '@/views/admin/CommissionRecords.vue'
import PaymentConfigManagement from '@/views/admin/PaymentConfigManagement.vue'
import AdminSystemSettings from '@/views/admin/SystemSettings.vue'
import AICallRecordManagement from '@/views/admin/AICallRecordManagement.vue'
import AIAssistantManagement from '@/views/admin/AIAssistantManagement.vue'
import AnnouncementManagement from '@/views/admin/AnnouncementManagement.vue'
import DistributionConfig from '@/views/admin/DistributionConfig.vue'
import DistributionAccounts from '@/views/admin/DistributionAccounts.vue'
import WithdrawalManagement from '@/views/admin/WithdrawalManagement.vue'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { requiresAuth: false }
  },
  {
    path: '/register',
    name: 'Register',
    component: Register,
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    redirect: '/client/dashboard'
  },
  // 客户端路由
  {
    path: '/client',
    component: ClientLayout,
    meta: { requiresAuth: true, role: 'client' },
    children: [
      {
        path: 'dashboard',
        name: 'ClientDashboard',
        component: Dashboard,
        meta: { title: '首页仪表盘', icon: 'Odometer' }
      },
      {
        path: 'novels',
        name: 'NovelList',
        component: NovelList,
        meta: { title: '小说列表', icon: 'Reading' }
      },
      {
        path: 'novels/new',
        name: 'NovelCreate',
        component: NovelCreate,
        meta: { title: '创建小说', icon: 'Plus' }
      },
      {
        path: 'novels/:id/edit',
        name: 'NovelEditor',
        component: NovelEditor,
        meta: { title: '小说编辑', icon: 'Edit' }
      },
      {
        path: 'novels/:id/settings',
        name: 'NovelSettings',
        component: NovelCreate,
        meta: { title: '小说设置', icon: 'Setting' }
      },
      {
        path: 'mindmap/:id',
        name: 'MindMap',
        component: MindMap,
        meta: { title: '思维导图', icon: 'Share' }
      },
      {
        path: 'prompts',
        name: 'PromptLibrary',
        component: PromptLibrary,
        meta: { title: '提示词库', icon: 'ChatDotRound' }
      },
      {
        path: 'tools',
        name: 'ToolLibrary',
        component: ToolLibrary,
        meta: { title: '工具库', icon: 'Tools' }
      },
      {
        path: 'ai-chat',
        name: 'AIChat',
        component: AIChat,
        meta: { title: 'AI网文助手', icon: 'ChatDotRound' }
      },
      {
        path: 'short-story',
        name: 'ShortStoryWriting',
        component: ShortStoryWriting,
        meta: { title: '短文写作', icon: 'Edit' }
      },
      {
        path: 'book-analysis',
        name: 'BookAnalysis',
        component: BookAnalysis,
        meta: { title: '拆书工具', icon: 'Document' }
      },
      {
        path: 'management/:novelId?',
        name: 'ManagementCenter',
        component: ManagementCenter,
        meta: { title: '内容管理', icon: 'Files' }
      },
      {
        path: 'system-settings',
        name: 'SystemSettings',
        component: SystemSettings,
        meta: { title: '系统设置', icon: 'Setting' }
      },
      {
        path: 'membership-center',
        name: 'MembershipCenter',
        component: () => import('@/views/client/MembershipCenter.vue'),
        meta: { title: '会员中心', icon: 'CreditCard' }
      },
      {
        path: 'distribution',
        name: 'DistributionCenter',
        component: () => import('@/views/client/DistributionCenter.vue'),
        meta: { title: '我的邀请', icon: 'Money' }
      }
    ]
  },
  // 管理端路由
  {
    path: '/admin',
    component: AdminLayout,
    meta: { requiresAuth: true, role: 'admin' },
    children: [
      {
        path: '',
        redirect: '/admin/dashboard'
      },
      {
        path: 'dashboard',
        name: 'AdminDashboard',
        component: AdminDashboard,
        meta: { title: '首页仪表盘', icon: 'Odometer' }
      },
      {
        path: 'users',
        name: 'UserManagement',
        component: UserManagement,
        meta: { title: '用户管理', icon: 'UserFilled' }
      },
      {
        path: 'novels',
        name: 'NovelManagement',
        component: NovelManagement,
        meta: { title: '小说管理', icon: 'Reading' }
      },
      {
        path: 'prompts',
        name: 'PromptManagement',
        component: PromptManagement,
        meta: { title: '提示词管理', icon: 'ChatDotRound' }
      },
      {
        path: 'novel-types',
        name: 'NovelTypeManagement',
        component: NovelTypeManagement,
        meta: { title: '小说类型管理', icon: 'Collection' }
      },
      {
        path: 'ai-models',
        name: 'AIModelManagement',
        component: AIModelManagement,
        meta: { title: 'AI模型管理', icon: 'Cpu' }
      },
      {
        path: 'ai-assistants',
        name: 'AIAssistantManagement',
        component: AIAssistantManagement,
        meta: { title: 'AI助手管理', icon: 'Avatar' }
      },
      {
        path: 'membership',
        name: 'MembershipManagement',
        component: MembershipManagement,
        meta: { title: '会员套餐管理', icon: 'CreditCard' }
      },
      {
        path: 'membership-records',
        name: 'MembershipRecords',
        component: () => import('@/views/admin/MembershipRecords.vue'),
        meta: { title: '会员开通记录', icon: 'Document' }
      },
      {
        path: 'cards',
        name: 'CardManagement',
        component: CardManagement,
        meta: { title: '发卡管理', icon: 'Ticket' }
      },
      {
        path: 'invite-records',
        name: 'InviteRecordManagement',
        component: InviteRecordManagement,
        meta: { title: '邀请记录管理', icon: 'UserFilled' }
      },
      {
        path: 'commission-records',
        name: 'CommissionRecords',
        component: CommissionRecords,
        meta: { title: '分成记录管理', icon: 'Share' }
      },
      {
        path: 'payment',
        name: 'PaymentConfigManagement',
        component: PaymentConfigManagement,
        meta: { title: '支付管理', icon: 'Money' }
      },
      {
        path: 'ai-call-records',
        name: 'AICallRecordManagement',
        component: AICallRecordManagement,
        meta: { title: 'AI调用记录', icon: 'DataAnalysis' }
      },
      {
        path: 'announcements',
        name: 'AnnouncementManagement',
        component: AnnouncementManagement,
        meta: { title: '公告管理', icon: 'Bell' }
      },
      {
        path: 'distribution-config',
        name: 'DistributionConfig',
        component: DistributionConfig,
        meta: { title: '分销配置', icon: 'Setting' }
      },
      {
        path: 'distribution-accounts',
        name: 'DistributionAccounts',
        component: DistributionAccounts,
        meta: { title: '佣金账户管理', icon: 'Wallet' }
      },
      {
        path: 'withdrawal-management',
        name: 'WithdrawalManagement',
        component: WithdrawalManagement,
        meta: { title: '提现工单管理', icon: 'CreditCard' }
      },
      {
        path: 'system',
        name: 'AdminSystemSettings',
        component: AdminSystemSettings,
        meta: { title: '系统设置', icon: 'Setting' }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const userStore = useUserStore()
  
  // 检查是否需要认证
  if (to.meta.requiresAuth) {
    if (!userStore.isAuthenticated) {
      next('/login')
      return
    }
    
    // 检查用户角色权限
    if (to.meta.role && to.meta.role !== userStore.userRole) {
      // 如果是普通用户尝试访问管理后台，重定向到用户端
      if (to.meta.role === 'admin' && userStore.userRole !== 'admin') {
        next('/client/dashboard')
        return
      }
      // 管理员可以访问用户端，不需要限制
    }
  }
  
  next()
})

export default router