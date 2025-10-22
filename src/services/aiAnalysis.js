/**
 * AI 高级分析服务
 * 提供创意生成、一致性检查、逻辑分析等高级功能
 */

import apiService from './api'
import { ElMessage } from 'element-plus'

class AIAnalysisService {
  constructor() {
    this.analysisHistory = []
  }

  /**
   * 1. AI 创意头脑风暴
   * 根据当前小说内容生成创意灵感
   */
  async brainstorm(novelData, options = {}) {
    const {
      type = 'plot', // plot | character | scene | dialogue | twist
      context = '',
      count = 5
    } = options

    const typePrompts = {
      plot: '情节发展创意',
      character: '人物设定创意',
      scene: '场景描写创意',
      dialogue: '对话设计创意',
      twist: '剧情反转创意'
    }

    const prompt = `
你是一位经验丰富的小说策划大师，请为以下小说提供${typePrompts[type]}建议。

## 小说信息
标题：${novelData.title}
类型：${novelData.genre || '未知'}
简介：${novelData.description || '暂无'}

## 当前进展
${context || '小说刚开始创作'}

## 已有内容概要
${this.getNovelSummary(novelData)}

## 任务
请生成 ${count} 个创意${typePrompts[type]}，每个创意需要：
1. 简短标题（5-10字）
2. 详细描述（50-100字）
3. 可行性评分（1-10分）
4. 实施建议（如何融入当前故事）

请以 JSON 数组格式返回，格式如下：
[
  {
    "title": "创意标题",
    "description": "详细描述",
    "feasibility": 8,
    "suggestion": "实施建议"
  }
]
`

    try {
      const response = await apiService.generateText(prompt, {
        temperature: 0.9, // 更高的创造性
        maxTokens: 2000
      })

      const ideas = this.parseJSON(response, [])
      
      // 保存到历史记录
      this.analysisHistory.push({
        type: 'brainstorm',
        subType: type,
        timestamp: new Date(),
        result: ideas
      })

      return {
        success: true,
        ideas,
        count: ideas.length
      }
    } catch (error) {
      console.error('创意生成失败:', error)
      return {
        success: false,
        error: error.message,
        ideas: []
      }
    }
  }

  /**
   * 2. 自动情节冲突检测
   * 检测小说中的情节矛盾和逻辑问题
   */
  async detectPlotConflicts(chapters) {
    if (!chapters || chapters.length === 0) {
      return { success: false, conflicts: [] }
    }

    const chaptersText = chapters
      .map((ch, idx) => `第${idx + 1}章 ${ch.title}\n${ch.content || ''}`)
      .join('\n\n---\n\n')

    const prompt = `
你是一位专业的小说编辑，请仔细分析以下小说章节，检测其中的情节冲突和逻辑问题。

## 小说章节
${chaptersText.substring(0, 8000)} ${chaptersText.length > 8000 ? '...(内容过长已截断)' : ''}

## 检测维度
1. **时间线矛盾**: 事件发生时间前后矛盾
2. **人物行为矛盾**: 人物行为与性格设定不符
3. **场景矛盾**: 场景描写前后不一致
4. **逻辑漏洞**: 剧情发展不合理
5. **伏笔遗忘**: 设置的伏笔没有回收

## 输出格式
请返回 JSON 数组，每个冲突包含：
[
  {
    "type": "时间线矛盾|人物行为矛盾|场景矛盾|逻辑漏洞|伏笔遗忘",
    "severity": "严重|中等|轻微",
    "location": "第X章",
    "description": "问题描述",
    "suggestion": "修改建议"
  }
]

如果没有发现明显冲突，返回空数组 []
`

    try {
      const response = await apiService.generateText(prompt, {
        temperature: 0.3, // 较低的创造性，更注重准确性
        maxTokens: 2000
      })

      const conflicts = this.parseJSON(response, [])

      // 按严重程度排序
      const sortedConflicts = conflicts.sort((a, b) => {
        const severityOrder = { '严重': 0, '中等': 1, '轻微': 2 }
        return severityOrder[a.severity] - severityOrder[b.severity]
      })

      this.analysisHistory.push({
        type: 'plotConflicts',
        timestamp: new Date(),
        result: sortedConflicts
      })

      return {
        success: true,
        conflicts: sortedConflicts,
        summary: this.generateConflictSummary(sortedConflicts)
      }
    } catch (error) {
      console.error('情节冲突检测失败:', error)
      return {
        success: false,
        error: error.message,
        conflicts: []
      }
    }
  }

  /**
   * 3. 人物性格一致性检查
   * 检查人物在不同章节中的行为是否符合性格设定
   */
  async checkCharacterConsistency(characters, chapters) {
    if (!characters || characters.length === 0) {
      return { success: false, issues: [] }
    }

    const characterProfiles = characters.map(char => ({
      name: char.name,
      personality: char.personality,
      background: char.background,
      goals: char.goals
    }))

    const chaptersText = chapters
      .slice(0, 20) // 最多分析前 20 章
      .map((ch, idx) => `第${idx + 1}章 ${ch.title}\n${ch.content?.substring(0, 500) || ''}`)
      .join('\n\n')

    const prompt = `
你是一位资深的人物塑造专家，请分析以下人物在小说中的行为是否符合性格设定。

## 人物设定
${JSON.stringify(characterProfiles, null, 2)}

## 章节内容（摘要）
${chaptersText}

## 分析任务
检查每个主要人物的行为、对话、决策是否与其性格设定一致。

## 输出格式
返回 JSON 数组，每个问题包含：
[
  {
    "character": "人物名称",
    "chapter": "第X章",
    "issue": "不一致描述",
    "expected": "根据性格应该...",
    "actual": "但实际上...",
    "severity": "严重|中等|轻微",
    "suggestion": "修改建议"
  }
]

如果所有人物行为都符合设定，返回空数组 []
`

    try {
      const response = await apiService.generateText(prompt, {
        temperature: 0.4,
        maxTokens: 2000
      })

      const issues = this.parseJSON(response, [])

      this.analysisHistory.push({
        type: 'characterConsistency',
        timestamp: new Date(),
        result: issues
      })

      return {
        success: true,
        issues,
        summary: `检查了 ${characters.length} 个人物，发现 ${issues.length} 处不一致`
      }
    } catch (error) {
      console.error('人物一致性检查失败:', error)
      return {
        success: false,
        error: error.message,
        issues: []
      }
    }
  }

  /**
   * 4. 时间线验证
   * 验证小说中的时间线是否合理
   */
  async validateTimeline(chapters) {
    if (!chapters || chapters.length === 0) {
      return { success: false, timeline: [] }
    }

    // 提取每章的时间信息
    const chaptersInfo = chapters.map((ch, idx) => ({
      chapter: idx + 1,
      title: ch.title,
      content: ch.content?.substring(0, 300) || ''
    }))

    const prompt = `
你是时间线分析专家，请分析以下章节的时间线，检测时间矛盾。

## 章节列表
${JSON.stringify(chaptersInfo, null, 2)}

## 分析任务
1. 提取每章的时间点（相对时间或绝对时间）
2. 检测时间跳跃是否合理
3. 标记时间矛盾（如时间倒流、时间跨度不合理等）

## 输出格式
返回 JSON 对象：
{
  "timeline": [
    {
      "chapter": 1,
      "timePoint": "故事开始 / 第1天 / XX年XX月",
      "duration": "持续时间",
      "events": ["主要事件1", "主要事件2"]
    }
  ],
  "issues": [
    {
      "type": "时间倒流|时间跳跃过大|时间矛盾",
      "chapters": "第X章 → 第Y章",
      "description": "问题描述",
      "suggestion": "修改建议"
    }
  ]
}
`

    try {
      const response = await apiService.generateText(prompt, {
        temperature: 0.3,
        maxTokens: 2000
      })

      const result = this.parseJSON(response, { timeline: [], issues: [] })

      this.analysisHistory.push({
        type: 'timeline',
        timestamp: new Date(),
        result
      })

      return {
        success: true,
        ...result,
        summary: `时间线跨度 ${result.timeline.length} 个时间点，发现 ${result.issues.length} 处问题`
      }
    } catch (error) {
      console.error('时间线验证失败:', error)
      return {
        success: false,
        error: error.message,
        timeline: [],
        issues: []
      }
    }
  }

  /**
   * 5. 剧情逻辑检查
   * 检查剧情发展的合理性和逻辑性
   */
  async checkPlotLogic(chapters, worldview = {}) {
    if (!chapters || chapters.length === 0) {
      return { success: false, issues: [] }
    }

    const chaptersText = chapters
      .map((ch, idx) => `第${idx + 1}章 ${ch.title}\n${ch.content?.substring(0, 500) || ''}`)
      .join('\n\n')

    const worldviewText = worldview.rules 
      ? `世界观设定：\n${worldview.rules}`
      : '世界观：未设定'

    const prompt = `
你是剧情逻辑分析专家，请检查以下小说的剧情逻辑性。

## 世界观
${worldviewText}

## 章节内容（摘要）
${chaptersText}

## 检查维度
1. **因果关系**: 事件的因果关系是否合理
2. **动机合理性**: 人物行为动机是否充分
3. **世界观一致性**: 是否违反世界观设定
4. **情节跳跃**: 情节发展是否过于突兀
5. **伏笔逻辑**: 伏笔设置和回收是否合理

## 输出格式
返回 JSON 数组：
[
  {
    "type": "因果关系|动机合理性|世界观一致性|情节跳跃|伏笔逻辑",
    "chapter": "第X章",
    "issue": "问题描述",
    "severity": "严重|中等|轻微",
    "impact": "对故事的影响",
    "suggestion": "修改建议"
  }
]

如果逻辑合理，返回空数组 []
`

    try {
      const response = await apiService.generateText(prompt, {
        temperature: 0.4,
        maxTokens: 2000
      })

      const issues = this.parseJSON(response, [])

      // 按严重程度排序
      const sortedIssues = issues.sort((a, b) => {
        const severityOrder = { '严重': 0, '中等': 1, '轻微': 2 }
        return severityOrder[a.severity] - severityOrder[b.severity]
      })

      this.analysisHistory.push({
        type: 'plotLogic',
        timestamp: new Date(),
        result: sortedIssues
      })

      return {
        success: true,
        issues: sortedIssues,
        summary: this.generateLogicSummary(sortedIssues)
      }
    } catch (error) {
      console.error('剧情逻辑检查失败:', error)
      return {
        success: false,
        error: error.message,
        issues: []
      }
    }
  }

  /**
   * 综合分析 - 一次性运行所有检查
   */
  async comprehensiveAnalysis(novelData) {
    ElMessage.info('开始综合分析，这可能需要几分钟...')

    const results = {
      plotConflicts: null,
      characterConsistency: null,
      timeline: null,
      plotLogic: null
    }

    try {
      // 1. 情节冲突检测
      results.plotConflicts = await this.detectPlotConflicts(novelData.chapters)

      // 2. 人物一致性检查
      if (novelData.characters && novelData.characters.length > 0) {
        results.characterConsistency = await this.checkCharacterConsistency(
          novelData.characters,
          novelData.chapters
        )
      }

      // 3. 时间线验证
      results.timeline = await this.validateTimeline(novelData.chapters)

      // 4. 剧情逻辑检查
      results.plotLogic = await this.checkPlotLogic(
        novelData.chapters,
        novelData.worldview
      )

      const totalIssues = 
        (results.plotConflicts?.conflicts?.length || 0) +
        (results.characterConsistency?.issues?.length || 0) +
        (results.timeline?.issues?.length || 0) +
        (results.plotLogic?.issues?.length || 0)

      ElMessage.success(`分析完成！共发现 ${totalIssues} 处需要注意的问题`)

      return {
        success: true,
        ...results,
        summary: {
          totalIssues,
          timestamp: new Date()
        }
      }
    } catch (error) {
      console.error('综合分析失败:', error)
      ElMessage.error('分析失败，请重试')
      return {
        success: false,
        error: error.message,
        ...results
      }
    }
  }

  // ==================== 辅助方法 ====================

  /**
   * 解析 JSON 响应
   */
  parseJSON(text, defaultValue = null) {
    try {
      // 尝试直接解析
      return JSON.parse(text)
    } catch (error) {
      // 尝试提取 JSON 块
      const jsonMatch = text.match(/\[[\s\S]*\]|\{[\s\S]*\}/)
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0])
        } catch (e) {
          console.warn('JSON 解析失败:', e)
        }
      }
      return defaultValue
    }
  }

  /**
   * 获取小说摘要
   */
  getNovelSummary(novelData) {
    const { chapters = [], characters = [] } = novelData
    
    const summary = []
    summary.push(`已创作 ${chapters.length} 章`)
    
    if (characters.length > 0) {
      summary.push(`主要人物：${characters.map(c => c.name).slice(0, 5).join('、')}`)
    }

    if (chapters.length > 0) {
      const totalWords = chapters.reduce((sum, ch) => sum + (ch.wordCount || 0), 0)
      summary.push(`总字数：${totalWords} 字`)
    }

    return summary.join('\n')
  }

  /**
   * 生成冲突摘要
   */
  generateConflictSummary(conflicts) {
    const severityCounts = {
      '严重': 0,
      '中等': 0,
      '轻微': 0
    }

    conflicts.forEach(c => {
      if (severityCounts[c.severity] !== undefined) {
        severityCounts[c.severity]++
      }
    })

    return `发现 ${conflicts.length} 处冲突：严重 ${severityCounts['严重']} 处，中等 ${severityCounts['中等']} 处，轻微 ${severityCounts['轻微']} 处`
  }

  /**
   * 生成逻辑问题摘要
   */
  generateLogicSummary(issues) {
    const typeCounts = {}
    issues.forEach(i => {
      typeCounts[i.type] = (typeCounts[i.type] || 0) + 1
    })

    const summary = Object.entries(typeCounts)
      .map(([type, count]) => `${type} ${count}处`)
      .join('，')

    return `发现 ${issues.length} 处逻辑问题：${summary}`
  }

  /**
   * 获取分析历史
   */
  getHistory(type = null) {
    if (type) {
      return this.analysisHistory.filter(h => h.type === type)
    }
    return this.analysisHistory
  }

  /**
   * 清除历史记录
   */
  clearHistory() {
    this.analysisHistory = []
  }
}

export default new AIAnalysisService()

