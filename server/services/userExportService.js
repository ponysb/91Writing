const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const Novel = require('../models/novel');
const Chapter = require('../models/chapter');
const ShortStory = require('../models/shortStory');
const Character = require('../models/character');
const Worldview = require('../models/worldview');
const Corpus = require('../models/corpus');
const Timeline = require('../models/timeline');

/**
 * 用户数据导出服务
 * 将用户的所有数据导出为用户友好的文本格式，并打包成压缩包
 */
class UserExportService {
  /**
   * 导出用户所有数据
   * @param {number} userId - 用户ID
   * @param {string} exportPath - 导出路径
   * @returns {Promise<string>} 压缩包文件路径
   */
  async exportUserData(userId, exportPath) {
    try {
      // 创建临时目录
      const tempDir = path.join(exportPath, `user_${userId}_export_${Date.now()}`);
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // 导出各类数据
      await this.exportNovels(userId, tempDir);
      await this.exportShortStories(userId, tempDir);
      await this.exportCharacters(userId, tempDir);
      await this.exportWorldviews(userId, tempDir);
      await this.exportCorpus(userId, tempDir);
      await this.exportTimelines(userId, tempDir);
      
      // 创建导出说明文件
      await this.createReadmeFile(userId, tempDir);

      // 打包成压缩文件
      const zipPath = await this.createZipFile(tempDir, exportPath, userId);

      // 清理临时目录
      this.cleanupTempDir(tempDir);

      return zipPath;
    } catch (error) {
      console.error('导出用户数据失败:', error);
      throw error;
    }
  }

  /**
   * 导出长篇小说
   */
  async exportNovels(userId, exportDir) {
    const novels = await Novel.findAll({
      where: { user_id: userId, deleted_at: null },
      include: [{
        model: Chapter,
        as: 'chapters',
        where: { deleted_at: null },
        required: false,
        order: [['chapter_number', 'ASC']]
      }],
      order: [['created_at', 'DESC']]
    });

    if (novels.length === 0) return;

    const novelsDir = path.join(exportDir, '长篇小说');
    if (!fs.existsSync(novelsDir)) {
      fs.mkdirSync(novelsDir, { recursive: true });
    }

    for (const novel of novels) {
      const novelDir = path.join(novelsDir, this.sanitizeFileName(novel.title));
      if (!fs.existsSync(novelDir)) {
        fs.mkdirSync(novelDir, { recursive: true });
      }

      // 小说基本信息
      let novelInfo = `小说标题：${novel.title}\n`;
      novelInfo += `创建时间：${this.formatDate(novel.created_at)}\n`;
      novelInfo += `更新时间：${this.formatDate(novel.updated_at)}\n`;
      novelInfo += `字数统计：${novel.word_count || 0}字\n`;
      novelInfo += `章节数量：${novel.chapter_count || 0}章\n`;
      novelInfo += `状态：${this.getStatusText(novel.status)}\n`;
      novelInfo += `类型：${novel.type || '未分类'}\n`;
      if (novel.description) {
        novelInfo += `\n简介：\n${novel.description}\n`;
      }
      if (novel.outline) {
        novelInfo += `\n大纲：\n${novel.outline}\n`;
      }
      if (novel.tags) {
        novelInfo += `\n标签：${novel.tags}\n`;
      }

      fs.writeFileSync(path.join(novelDir, '小说信息.txt'), novelInfo, 'utf8');

      // 导出章节
      if (novel.chapters && novel.chapters.length > 0) {
        const chaptersDir = path.join(novelDir, '章节内容');
        if (!fs.existsSync(chaptersDir)) {
          fs.mkdirSync(chaptersDir, { recursive: true });
        }

        for (const chapter of novel.chapters) {
          let chapterContent = `第${chapter.chapter_number}章 ${chapter.title}\n`;
          chapterContent += `创建时间：${this.formatDate(chapter.created_at)}\n`;
          chapterContent += `字数：${chapter.word_count || 0}字\n`;
          chapterContent += `状态：${this.getStatusText(chapter.status)}\n\n`;
          
          if (chapter.summary) {
            chapterContent += `章节摘要：\n${chapter.summary}\n\n`;
          }
          
          chapterContent += `正文内容：\n${chapter.content || ''}\n`;

          const fileName = `第${String(chapter.chapter_number).padStart(3, '0')}章_${this.sanitizeFileName(chapter.title)}.txt`;
          fs.writeFileSync(path.join(chaptersDir, fileName), chapterContent, 'utf8');
        }
      }
    }
  }

  /**
   * 导出短篇小说/短文
   */
  async exportShortStories(userId, exportDir) {
    const shortStories = await ShortStory.findAll({
      where: { user_id: userId, deleted_at: null },
      order: [['created_at', 'DESC']]
    });

    if (shortStories.length === 0) return;

    const shortStoriesDir = path.join(exportDir, '短篇小说');
    if (!fs.existsSync(shortStoriesDir)) {
      fs.mkdirSync(shortStoriesDir, { recursive: true });
    }

    for (const story of shortStories) {
      let content = `标题：${story.title}\n`;
      content += `创建时间：${this.formatDate(story.created_at)}\n`;
      content += `更新时间：${this.formatDate(story.updated_at)}\n`;
      content += `字数：${story.word_count || 0}字\n`;
      content += `状态：${this.getStatusText(story.status)}\n`;
      
      if (story.description) {
        content += `\n简介：\n${story.description}\n`;
      }
      
      if (story.tags) {
        content += `\n标签：${story.tags}\n`;
      }
      
      content += `\n正文内容：\n${story.content || ''}\n`;

      const fileName = `${this.sanitizeFileName(story.title)}.txt`;
      fs.writeFileSync(path.join(shortStoriesDir, fileName), content, 'utf8');
    }
  }

  /**
   * 导出人物设定
   */
  async exportCharacters(userId, exportDir) {
    const characters = await Character.findAll({
      where: { user_id: userId, deleted_at: null },
      order: [['created_at', 'DESC']]
    });

    if (characters.length === 0) return;

    const charactersDir = path.join(exportDir, '人物设定');
    if (!fs.existsSync(charactersDir)) {
      fs.mkdirSync(charactersDir, { recursive: true });
    }

    for (const character of characters) {
      let content = `人物姓名：${character.name}\n`;
      content += `创建时间：${this.formatDate(character.created_at)}\n`;
      content += `更新时间：${this.formatDate(character.updated_at)}\n`;
      
      if (character.description) {
        content += `\n人物描述：\n${character.description}\n`;
      }
      
      if (character.personality) {
        content += `\n性格特点：\n${character.personality}\n`;
      }
      
      if (character.background) {
        content += `\n背景故事：\n${character.background}\n`;
      }
      
      if (character.appearance) {
        content += `\n外貌描述：\n${character.appearance}\n`;
      }
      
      if (character.relationships) {
        content += `\n人物关系：\n${character.relationships}\n`;
      }
      
      if (character.tags) {
        content += `\n标签：${character.tags}\n`;
      }

      const fileName = `${this.sanitizeFileName(character.name)}.txt`;
      fs.writeFileSync(path.join(charactersDir, fileName), content, 'utf8');
    }
  }

  /**
   * 导出世界观设定
   */
  async exportWorldviews(userId, exportDir) {
    const worldviews = await Worldview.findAll({
      where: { user_id: userId, deleted_at: null },
      order: [['created_at', 'DESC']]
    });

    if (worldviews.length === 0) return;

    const worldviewsDir = path.join(exportDir, '世界观设定');
    if (!fs.existsSync(worldviewsDir)) {
      fs.mkdirSync(worldviewsDir, { recursive: true });
    }

    for (const worldview of worldviews) {
      let content = `世界观名称：${worldview.name}\n`;
      content += `创建时间：${this.formatDate(worldview.created_at)}\n`;
      content += `更新时间：${this.formatDate(worldview.updated_at)}\n`;
      
      if (worldview.description) {
        content += `\n描述：\n${worldview.description}\n`;
      }
      
      if (worldview.content) {
        content += `\n详细内容：\n${worldview.content}\n`;
      }
      
      if (worldview.tags) {
        content += `\n标签：${worldview.tags}\n`;
      }

      const fileName = `${this.sanitizeFileName(worldview.name)}.txt`;
      fs.writeFileSync(path.join(worldviewsDir, fileName), content, 'utf8');
    }
  }

  /**
   * 导出语料库
   */
  async exportCorpus(userId, exportDir) {
    const corpus = await Corpus.findAll({
      where: { user_id: userId, deleted_at: null },
      order: [['created_at', 'DESC']]
    });

    if (corpus.length === 0) return;

    const corpusDir = path.join(exportDir, '语料库');
    if (!fs.existsSync(corpusDir)) {
      fs.mkdirSync(corpusDir, { recursive: true });
    }

    for (const item of corpus) {
      let content = `语料标题：${item.title}\n`;
      content += `创建时间：${this.formatDate(item.created_at)}\n`;
      content += `更新时间：${this.formatDate(item.updated_at)}\n`;
      content += `类型：${item.type || '未分类'}\n`;
      
      if (item.description) {
        content += `\n描述：\n${item.description}\n`;
      }
      
      if (item.content) {
        content += `\n内容：\n${item.content}\n`;
      }
      
      if (item.tags) {
        content += `\n标签：${item.tags}\n`;
      }

      const fileName = `${this.sanitizeFileName(item.title)}.txt`;
      fs.writeFileSync(path.join(corpusDir, fileName), content, 'utf8');
    }
  }

  /**
   * 导出事件线
   */
  async exportTimelines(userId, exportDir) {
    const timelines = await Timeline.findAll({
      where: { user_id: userId, deleted_at: null },
      order: [['created_at', 'DESC']]
    });

    if (timelines.length === 0) return;

    const timelinesDir = path.join(exportDir, '事件线');
    if (!fs.existsSync(timelinesDir)) {
      fs.mkdirSync(timelinesDir, { recursive: true });
    }

    for (const timeline of timelines) {
      let content = `事件线名称：${timeline.name}\n`;
      content += `创建时间：${this.formatDate(timeline.created_at)}\n`;
      content += `更新时间：${this.formatDate(timeline.updated_at)}\n`;
      
      if (timeline.description) {
        content += `\n描述：\n${timeline.description}\n`;
      }
      
      if (timeline.content) {
        content += `\n事件内容：\n${timeline.content}\n`;
      }
      
      if (timeline.tags) {
        content += `\n标签：${timeline.tags}\n`;
      }

      const fileName = `${this.sanitizeFileName(timeline.name)}.txt`;
      fs.writeFileSync(path.join(timelinesDir, fileName), content, 'utf8');
    }
  }

  /**
   * 创建说明文件
   */
  async createReadmeFile(userId, exportDir) {
    const readme = `用户数据导出说明\n\n` +
      `导出时间：${this.formatDate(new Date())}\n` +
      `用户ID：${userId}\n\n` +
      `本压缩包包含您在平台上的所有创作数据，包括：\n` +
      `1. 长篇小说 - 包含小说信息和章节内容\n` +
      `2. 短篇小说 - 您创作的短篇作品\n` +
      `3. 人物设定 - 您创建的人物角色信息\n` +
      `4. 世界观设定 - 您构建的世界观内容\n` +
      `5. 语料库 - 您收集的写作素材\n` +
      `6. 事件线 - 您规划的故事情节线\n\n` +
      `所有文件均为UTF-8编码的文本格式，可用任何文本编辑器打开。\n` +
      `文件夹结构按内容类型组织，便于查找和管理。\n\n` +
      `感谢您使用我们的平台！`;

    fs.writeFileSync(path.join(exportDir, '导出说明.txt'), readme, 'utf8');
  }

  /**
   * 创建压缩文件
   */
  async createZipFile(sourceDir, outputDir, userId) {
    return new Promise((resolve, reject) => {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const zipFileName = `用户${userId}_数据导出_${timestamp}.zip`;
      const zipPath = path.join(outputDir, zipFileName);
      
      const output = fs.createWriteStream(zipPath);
      const archive = archiver('zip', {
        zlib: { level: 9 } // 最高压缩级别
      });

      output.on('close', () => {
        console.log(`压缩包创建完成: ${zipPath} (${archive.pointer()} bytes)`);
        resolve(zipPath);
      });

      archive.on('error', (err) => {
        reject(err);
      });

      archive.pipe(output);
      archive.directory(sourceDir, false);
      archive.finalize();
    });
  }

  /**
   * 清理临时目录
   */
  cleanupTempDir(tempDir) {
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (error) {
      console.error('清理临时目录失败:', error);
    }
  }

  /**
   * 清理文件名中的非法字符
   */
  sanitizeFileName(fileName) {
    return fileName.replace(/[<>:"/\\|?*]/g, '_').trim();
  }

  /**
   * 格式化日期
   */
  formatDate(date) {
    if (!date) return '未知';
    return new Date(date).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  /**
   * 获取状态文本
   */
  getStatusText(status) {
    const statusMap = {
      'draft': '草稿',
      'published': '已发布',
      'completed': '已完结',
      'paused': '暂停',
      'deleted': '已删除'
    };
    return statusMap[status] || status || '未知';
  }
}

module.exports = new UserExportService();