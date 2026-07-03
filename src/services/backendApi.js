/**
 * 后端 API 服务
 * 负责与墨章后端服务器通信
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

class BackendApiService {
  constructor() {
    this.token = localStorage.getItem('auth_token');
  }

  // 设置认证 token
  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  // 获取认证头
  getAuthHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  // 通用请求方法
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      headers: this.getAuthHeaders(),
      ...options
    };

    try {
      const response = await fetch(url, config);
      
      if (response.status === 401) {
        // Token 过期或无效，清除登录状态
        this.setToken(null);
        window.dispatchEvent(new CustomEvent('auth:logout'));
        throw new Error('认证已过期，请重新登录');
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '请求失败');
      }

      return await response.json();
    } catch (error) {
      console.error('API 请求错误:', error);
      throw error;
    }
  }

  // ========== 认证相关 ==========
  
  async register(username, email, password) {
    const result = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password })
    });
    if (result.token) {
      this.setToken(result.token);
    }
    return result;
  }

  async login(username, password) {
    const result = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    if (result.token) {
      this.setToken(result.token);
    }
    return result;
  }

  logout() {
    this.setToken(null);
  }

  async getCurrentUser() {
    return await this.request('/auth/me');
  }

  async changePassword(oldPassword, newPassword) {
    return await this.request('/auth/password', {
      method: 'PUT',
      body: JSON.stringify({ oldPassword, newPassword })
    });
  }

  // ========== 小说管理 ==========
  
  async getNovels() {
    return await this.request('/novels');
  }

  async getNovel(id) {
    return await this.request(`/novels/${id}`);
  }

  async createNovel(novelData) {
    return await this.request('/novels', {
      method: 'POST',
      body: JSON.stringify(novelData)
    });
  }

  async updateNovel(id, novelData) {
    return await this.request(`/novels/${id}`, {
      method: 'PUT',
      body: JSON.stringify(novelData)
    });
  }

  async deleteNovel(id) {
    return await this.request(`/novels/${id}`, {
      method: 'DELETE'
    });
  }

  // ========== 章节管理 ==========
  
  async getChapters(novelId) {
    return await this.request(`/chapters/novel/${novelId}`);
  }

  async getChapter(id) {
    return await this.request(`/chapters/${id}`);
  }

  async createChapter(novelId, chapterData) {
    return await this.request(`/chapters/novel/${novelId}`, {
      method: 'POST',
      body: JSON.stringify(chapterData)
    });
  }

  async updateChapter(id, chapterData) {
    return await this.request(`/chapters/${id}`, {
      method: 'PUT',
      body: JSON.stringify(chapterData)
    });
  }

  async deleteChapter(id) {
    return await this.request(`/chapters/${id}`, {
      method: 'DELETE'
    });
  }

  async reorderChapters(novelId, chapterIds) {
    return await this.request(`/chapters/novel/${novelId}/reorder`, {
      method: 'PUT',
      body: JSON.stringify({ chapterIds })
    });
  }

  // ========== 角色管理 ==========
  
  async getCharacters(novelId) {
    return await this.request(`/characters/novel/${novelId}`);
  }

  async createCharacter(novelId, characterData) {
    return await this.request(`/characters/novel/${novelId}`, {
      method: 'POST',
      body: JSON.stringify(characterData)
    });
  }

  async updateCharacter(id, characterData) {
    return await this.request(`/characters/${id}`, {
      method: 'PUT',
      body: JSON.stringify(characterData)
    });
  }

  async deleteCharacter(id) {
    return await this.request(`/characters/${id}`, {
      method: 'DELETE'
    });
  }

  // ========== 世界观管理 ==========
  
  async getWorldSettings(novelId) {
    return await this.request(`/world-settings/novel/${novelId}`);
  }

  async createWorldSetting(novelId, settingData) {
    return await this.request(`/world-settings/novel/${novelId}`, {
      method: 'POST',
      body: JSON.stringify(settingData)
    });
  }

  async updateWorldSetting(id, settingData) {
    return await this.request(`/world-settings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(settingData)
    });
  }

  async deleteWorldSetting(id) {
    return await this.request(`/world-settings/${id}`, {
      method: 'DELETE'
    });
  }

  // ========== 写作目标 ==========
  
  async getGoals() {
    return await this.request('/goals');
  }

  async updateGoals(goalsData) {
    return await this.request('/goals', {
      method: 'PUT',
      body: JSON.stringify(goalsData)
    });
  }

  async recordActivity(wordCount) {
    return await this.request('/goals/activity', {
      method: 'POST',
      body: JSON.stringify({ word_count: wordCount })
    });
  }

  // ========== 提示词模板 ==========
  
  async getPrompts(category = null) {
    const query = category ? `?category=${category}` : '';
    return await this.request(`/prompts${query}`);
  }

  async getPrompt(id) {
    return await this.request(`/prompts/${id}`);
  }

  async createPrompt(promptData) {
    return await this.request('/prompts', {
      method: 'POST',
      body: JSON.stringify(promptData)
    });
  }

  async updatePrompt(id, promptData) {
    return await this.request(`/prompts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(promptData)
    });
  }

  async deletePrompt(id) {
    return await this.request(`/prompts/${id}`, {
      method: 'DELETE'
    });
  }

  // ========== AI 配置 ==========
  
  async getAIConfig() {
    return await this.request('/ai/config');
  }

  async saveAIConfig(configData) {
    return await this.request('/ai/config', {
      method: 'POST',
      body: JSON.stringify(configData)
    });
  }

  // ========== AI 生成 ==========
  
  async generateOutline(keywords, genre, template) {
    return await this.request('/ai/generate/outline', {
      method: 'POST',
      body: JSON.stringify({ keywords, genre, template })
    });
  }

  async generateChapter(chapterData) {
    return await this.request('/ai/generate/chapter', {
      method: 'POST',
      body: JSON.stringify(chapterData)
    });
  }

  async chatCompletion(messages, stream = false) {
    return await this.request('/ai/chat/completions', {
      method: 'POST',
      body: JSON.stringify({ messages, stream })
    });
  }

  // ========== 健康检查 ==========
  
  async healthCheck() {
    return await this.request('/health');
  }
}

export default new BackendApiService();
