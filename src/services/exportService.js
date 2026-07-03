/**
 * 作品集导出服务
 * - 支持导出为 PDF（基于 jspdf + html2canvas，本地渲染，无 CDN 依赖）
 * - 支持导出为 Word（.doc，基于 HTML+MIME，Word 可直接打开）
 * - 支持调整字号
 * - 多作品集结为一本，分章排版
 *
 * 说明：jsPDF 4.x 与 html2canvas 1.4.x 均不依赖任何外部 CDN 资源，
 * html2canvas 默认使用本地 Web Worker 进行图像处理，无需额外配置。
 */
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { saveAs } from 'file-saver'

/* ============ 默认导出配置 ============ */
export const DEFAULT_EXPORT_OPTIONS = {
  fontSize: 14,           // 正文字号（px）
  titleFontSize: 24,      // 标题字号
  chapterTitleSize: 18,   // 章节标题字号
  fontFamily: '"Noto Serif SC", "Songti SC", "SimSun", serif',
  paper: 'a4',            // 纸张：a4 | letter
  margin: 18,             // 页边距（mm）
  lineHeight: 1.8,        // 行高
  includeToc: true,       // 是否包含目录
  author: '墨章用户'
}

/* ============ 工具函数 ============ */

// 把 HTML 内容中的 wangEditor 残留清理一下，并保证段落可读
const sanitizeHtml = (html) => {
  if (!html) return ''
  let text = String(html)
  // 把 <p><br></p> 这类空段落换成换行
  text = text.replace(/<p><br\s*\/?><\/p>/gi, '\n\n')
  // 段落转双换行
  text = text.replace(/<\/p>/gi, '\n\n')
  text = text.replace(/<p[^>]*>/gi, '')
  // <br> 转换行
  text = text.replace(/<br\s*\/?>/gi, '\n')
  // <h1>~<h6> 转换行
  text = text.replace(/<\/h[1-6]>/gi, '\n\n')
  text = text.replace(/<h[1-6][^>]*>/gi, '')
  // 列表
  text = text.replace(/<\/li>/gi, '\n')
  text = text.replace(/<li[^>]*>/gi, '· ')
  // 去除所有剩余标签
  text = text.replace(/<[^>]+>/g, '')
  // 解码 HTML 实体
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
  // 合并多余空行
  text = text.replace(/\n{3,}/g, '\n\n').trim()
  return text
}

const escapeHtml = (str) => String(str || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')

const formatDate = () => {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const sanitizeFilename = (name) => String(name || 'untitled')
  .replace(/[\\/:*?"<>|]/g, '_')
  .slice(0, 60)

/**
 * 在文档中构建一个隐藏的渲染容器，并把所有作品内容渲染进去
 * @param {Array} novels 小说列表
 * @param {Object} options 选项
 * @returns {HTMLElement} 渲染容器的 DOM 节点
 */
const buildRenderContainer = (novels, options) => {
  const container = document.createElement('div')
  container.style.cssText = `
    position: fixed;
    left: -99999px;
    top: 0;
    width: 800px;
    background: #fffdf7;
    color: #2a241e;
    padding: 56px 64px;
    font-family: ${options.fontFamily};
    font-size: ${options.fontSize}px;
    line-height: ${options.lineHeight};
    box-sizing: border-box;
    letter-spacing: 0.02em;
  `

  // 封面
  const cover = document.createElement('div')
  cover.style.cssText = `
    text-align: center;
    padding: 120px 0 80px 0;
    border-bottom: 2px solid #9a5b2e;
    margin-bottom: 40px;
  `
  cover.innerHTML = `
    <div style="font-family: 'Cormorant Garamond', serif; font-size: ${options.titleFontSize + 12}px; color: #9a5b2e; letter-spacing: 0.2em; margin-bottom: 24px;">墨章</div>
    <div style="font-family: 'Noto Serif SC', serif; font-size: ${options.titleFontSize + 6}px; font-weight: 700; color: #2a241e; margin-bottom: 32px;">作品集</div>
    <div style="font-size: ${options.fontSize}px; color: #786c5d;">著者：${escapeHtml(options.author)}</div>
    <div style="font-size: ${Math.max(12, options.fontSize - 2)}px; color: #a99e8c; margin-top: 8px;">${formatDate()}</div>
    <div style="margin-top: 48px; font-size: ${Math.max(12, options.fontSize - 2)}px; color: #786c5d;">共收录 ${novels.length} 部作品</div>
  `
  container.appendChild(cover)

  // 目录
  if (options.includeToc && novels.length > 1) {
    const toc = document.createElement('div')
    toc.style.cssText = `
      margin-bottom: 48px;
      page-break-after: always;
    `
    const tocTitle = document.createElement('div')
    tocTitle.textContent = '目  录'
    tocTitle.style.cssText = `
      font-family: 'Noto Serif SC', serif;
      font-size: ${options.chapterTitleSize}px;
      font-weight: 600;
      text-align: center;
      margin-bottom: 32px;
      letter-spacing: 0.4em;
      color: #2a241e;
    `
    toc.appendChild(tocTitle)
    novels.forEach((novel, idx) => {
      const item = document.createElement('div')
      const num = String(idx + 1).padStart(2, '0')
      item.innerHTML = `
        <span style="display:inline-block; width: 48px; color: #9a5b2e; font-family: 'Cormorant Garamond', serif;">${num}</span>
        <span style="color: #2a241e;">${escapeHtml(novel.title || '未命名作品')}</span>
        <span style="display:inline-block; margin-left: 12px; color: #a99e8c; font-size: ${Math.max(12, options.fontSize - 2)}px;">${(novel.chapterList || []).length} 章</span>
      `
      item.style.cssText = `
        padding: 8px 0;
        border-bottom: 1px dashed #e3dac8;
      `
      toc.appendChild(item)
    })
    container.appendChild(toc)
  }

  // 各作品正文
  novels.forEach((novel, idx) => {
    const section = document.createElement('div')
    section.style.cssText = `
      page-break-before: always;
    `

    // 卷标题
    const volTitle = document.createElement('div')
    const num = String(idx + 1).padStart(2, '0')
    volTitle.innerHTML = `
      <div style="font-family: 'Cormorant Garamond', serif; font-size: ${options.fontSize}px; color: #9a5b2e; letter-spacing: 0.3em; margin-bottom: 12px;">VOLUME ${num}</div>
      <div style="font-family: 'Noto Serif SC', serif; font-size: ${options.titleFontSize}px; font-weight: 700; color: #2a241e; margin-bottom: 16px;">${escapeHtml(novel.title || '未命名作品')}</div>
      ${novel.description ? `<div style="font-size: ${Math.max(12, options.fontSize - 2)}px; color: #786c5d; font-style: italic; line-height: 1.6; padding: 0 24px;">${escapeHtml(novel.description)}</div>` : ''}
      <div style="width: 60px; height: 2px; background: #9a5b2e; margin: 24px 0 32px 0;"></div>
    `
    section.appendChild(volTitle)

    // 章节内容
    const chapters = novel.chapterList || []
    if (chapters.length === 0) {
      // 没有分章，直接显示正文
      const body = document.createElement('div')
      body.textContent = sanitizeHtml(novel.content || novel.currentNovel || '')
      body.style.cssText = `white-space: pre-wrap; word-break: break-word; text-align: justify;`
      section.appendChild(body)
    } else {
      chapters.forEach((chapter, ci) => {
        const ch = document.createElement('div')
        ch.style.cssText = `
          margin-bottom: 32px;
          page-break-inside: avoid;
        `
        const chTitle = document.createElement('div')
        chTitle.innerHTML = `
          <span style="color: #9a5b2e; font-family: 'Cormorant Garamond', serif; margin-right: 8px;">第 ${ci + 1} 章</span>
          <span style="color: #2a241e;">${escapeHtml(chapter.title || `第 ${ci + 1} 章`)}</span>
        `
        chTitle.style.cssText = `
          font-family: 'Noto Serif SC', serif;
          font-size: ${options.chapterTitleSize}px;
          font-weight: 600;
          margin-bottom: 16px;
          padding-bottom: 8px;
          border-bottom: 1px solid #e3dac8;
        `
        ch.appendChild(chTitle)

        const chBody = document.createElement('div')
        const chapterText = sanitizeHtml(chapter.content || chapter.generatedText || '')
        chBody.textContent = chapterText
        chBody.style.cssText = `
          white-space: pre-wrap;
          word-break: break-word;
          text-align: justify;
          text-indent: 2em;
        `
        ch.appendChild(chBody)
        section.appendChild(ch)
      })
    }

    container.appendChild(section)
  })

  document.body.appendChild(container)
  return container
}

/* ============ PDF 导出 ============ */
/**
 * 将多部小说集结导出为一个 PDF 文件
 * 使用 canvas 切片方式精确分页，避免整图重复绘制
 * @param {Array} novels 小说列表
 * @param {Object} userOptions 用户选项（覆盖默认值）
 * @param {Function} onProgress 可选进度回调 (0~100)
 */
export const exportNovelsToPDF = async (novels, userOptions = {}, onProgress = null) => {
  if (!novels || novels.length === 0) {
    throw new Error('没有可导出的作品')
  }

  const options = { ...DEFAULT_EXPORT_OPTIONS, ...userOptions }
  const report = (p) => { if (typeof onProgress === 'function') onProgress(p) }
  report(5)

  const container = buildRenderContainer(novels, options)
  report(15)

  try {
    await new Promise(r => requestAnimationFrame(r))
    if (document.fonts && document.fonts.ready) await document.fonts.ready
    report(25)

    const fullCanvas = await html2canvas(container, {
      scale: 2,
      useCORS: false,
      allowTaint: false,
      backgroundColor: '#fffdf7',
      logging: false,
      windowWidth: 800
    })
    report(60)

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: options.paper || 'a4',
      compress: true
    })

    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = options.margin
    const usableWidth = pageWidth - margin * 2
    const usableHeight = pageHeight - margin * 2

    // 一个 A4 页面在画布上对应的像素高度
    const pageHeightPx = Math.floor((usableHeight * fullCanvas.width) / usableWidth)
    const totalPages = Math.ceil(fullCanvas.height / pageHeightPx)

    // 创建临时 canvas 用于切片
    const sliceCanvas = document.createElement('canvas')
    sliceCanvas.width = fullCanvas.width
    sliceCanvas.height = pageHeightPx
    const ctx = sliceCanvas.getContext('2d')

    for (let i = 0; i < totalPages; i++) {
      if (i > 0) pdf.addPage()
      const startY = i * pageHeightPx
      const drawHeight = Math.min(pageHeightPx, fullCanvas.height - startY)

      // 清空切片 canvas
      ctx.fillStyle = '#fffdf7'
      ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height)
      // 从完整 canvas 复制一段到切片 canvas
      ctx.drawImage(
        fullCanvas,
        0, startY, fullCanvas.width, drawHeight,
        0, 0, fullCanvas.width, drawHeight
      )

      const imgData = sliceCanvas.toDataURL('image/jpeg', 0.92)
      const sliceImgHeight = (drawHeight * usableWidth) / fullCanvas.width
      pdf.addImage(imgData, 'JPEG', margin, margin, usableWidth, sliceImgHeight, undefined, 'FAST')

      report(60 + Math.round((i + 1) / totalPages * 35))
    }

    pdf.setProperties({
      title: '墨章作品集',
      subject: `${novels.length} 部作品集结`,
      author: options.author,
      creator: '墨章 · AI 创作工坊'
    })

    const filename = `墨章作品集_${novels.length}部_${Date.now()}.pdf`
    pdf.save(filename)
    report(100)

    return { filename, pageCount: totalPages }
  } finally {
    if (container && container.parentNode) {
      container.parentNode.removeChild(container)
    }
  }
}

/* ============ Word 导出（.doc） ============ */
/**
 * 将多部小说集结导出为一个 Word（.doc）文件
 * 基于 HTML+MIME 方式，Word 可直接打开编辑
 */
export const exportNovelsToWord = (novels, userOptions = {}, onProgress = null) => {
  if (!novels || novels.length === 0) {
    throw new Error('没有可导出的作品')
  }
  const options = { ...DEFAULT_EXPORT_OPTIONS, ...userOptions }
  const report = (p) => { if (typeof onProgress === 'function') onProgress(p) }
  report(10)

  // 构建 Word 兼容的 HTML
  const sections = []

  // 封面
  sections.push(`
    <div style="text-align:center; padding:80pt 0 60pt 0; border-bottom:2pt solid #9a5b2e;">
      <p style="font-family:'Cormorant Garamond',serif; font-size:${options.titleFontSize + 12}pt; color:#9a5b2e; letter-spacing:0.2em; margin:0 0 18pt 0;">墨章</p>
      <p style="font-family:'Noto Serif SC',serif; font-size:${options.titleFontSize + 6}pt; font-weight:bold; color:#2a241e; margin:0 0 24pt 0;">作品集</p>
      <p style="font-size:${options.fontSize}pt; color:#786c5d; margin:0;">著者：${escapeHtml(options.author)}</p>
      <p style="font-size:${Math.max(9, options.fontSize - 2)}pt; color:#a99e8c; margin:6pt 0 0 0;">${formatDate()}</p>
      <p style="font-size:${Math.max(9, options.fontSize - 2)}pt; color:#786c5d; margin:36pt 0 0 0;">共收录 ${novels.length} 部作品</p>
    </div>
    <br clear="all" />
    <br/>
  `)

  // 目录
  if (options.includeToc && novels.length > 1) {
    const tocItems = novels.map((novel, idx) => {
      const num = String(idx + 1).padStart(2, '0')
      const ch = (novel.chapterList || []).length
      return `
        <p style="padding:4pt 0; border-bottom:1pt dashed #e3dac8; margin:0;">
          <span style="color:#9a5b2e; font-family:'Cormorant Garamond',serif; margin-right:8pt;">${num}</span>
          <span style="color:#2a241e;">${escapeHtml(novel.title || '未命名作品')}</span>
          <span style="color:#a99e8c; margin-left:12pt; font-size:${Math.max(9, options.fontSize - 2)}pt;">${ch} 章</span>
        </p>`
    }).join('')
    sections.push(`
      <div style="page-break-after:always;">
        <p style="font-family:'Noto Serif SC',serif; font-size:${options.chapterTitleSize}pt; font-weight:bold; text-align:center; margin:0 0 24pt 0; letter-spacing:0.4em;">目  录</p>
        ${tocItems}
      </div>
    `)
  }

  report(40)

  // 各作品正文
  novels.forEach((novel, idx) => {
    const num = String(idx + 1).padStart(2, '0')
    const chapters = novel.chapterList || []

    let bodyHtml = ''
    if (chapters.length === 0) {
      bodyHtml = `<div style="text-align:justify; text-indent:2em;">${escapeHtml(sanitizeHtml(novel.content || novel.currentNovel || '')).replace(/\n/g, '<br/>')}</div>`
    } else {
      bodyHtml = chapters.map((chapter, ci) => `
        <div style="margin-bottom:24pt;">
          <p style="font-family:'Noto Serif SC',serif; font-size:${options.chapterTitleSize}pt; font-weight:bold; margin:0 0 12pt 0; padding-bottom:6pt; border-bottom:1pt solid #e3dac8;">
            <span style="color:#9a5b2e; font-family:'Cormorant Garamond',serif; margin-right:8pt;">第 ${ci + 1} 章</span>
            <span style="color:#2a241e;">${escapeHtml(chapter.title || `第 ${ci + 1} 章`)}</span>
          </p>
          <div style="text-align:justify; text-indent:2em;">
            ${escapeHtml(sanitizeHtml(chapter.content || chapter.generatedText || '')).replace(/\n/g, '<br/>')}
          </div>
        </div>
      `).join('')
    }

    sections.push(`
      <div style="page-break-before:always;">
        <p style="font-family:'Cormorant Garamond',serif; font-size:${options.fontSize}pt; color:#9a5b2e; letter-spacing:0.3em; margin:0 0 6pt 0;">VOLUME ${num}</p>
        <p style="font-family:'Noto Serif SC',serif; font-size:${options.titleFontSize}pt; font-weight:bold; color:#2a241e; margin:0 0 12pt 0;">${escapeHtml(novel.title || '未命名作品')}</p>
        ${novel.description ? `<p style="font-size:${Math.max(9, options.fontSize - 2)}pt; color:#786c5d; font-style:italic; line-height:1.6; padding:0 18pt; margin:0 0 18pt 0;">${escapeHtml(novel.description)}</p>` : ''}
        <hr style="border:none; border-top:2pt solid #9a5b2e; width:60pt; margin:0 0 24pt 0;"/>
        ${bodyHtml}
      </div>
    `)
  })

  report(75)

  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="UTF-8"/>
  <title>墨章作品集</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page { size: ${options.paper}; margin: ${options.margin}mm ${options.margin}mm; }
    body { font-family: 'Noto Serif SC', 'SimSun', serif; font-size: ${options.fontSize}pt; line-height: ${options.lineHeight}; color: #2a241e; }
    p { margin: 0; }
  </style>
</head>
<body>
  ${sections.join('\n')}
</body>
</html>`

  // 转 Blob 并下载
  const blob = new Blob(['\ufeff', html], { type: 'application/msword;charset=utf-8' })
  const filename = `墨章作品集_${novels.length}部_${Date.now()}.doc`
  saveAs(blob, filename)
  report(100)

  return { filename, novelCount: novels.length }
}

/* ============ 纯文本导出（备用） ============ */
export const exportNovelsToText = (novels, userOptions = {}) => {
  if (!novels || novels.length === 0) {
    throw new Error('没有可导出的作品')
  }
  const options = { ...DEFAULT_EXPORT_OPTIONS, ...userOptions }
  const lines = []
  lines.push('墨章作品集')
  lines.push(`著者：${options.author}`)
  lines.push(`生成时间：${formatDate()}`)
  lines.push(`共收录 ${novels.length} 部作品`)
  lines.push('='.repeat(48))
  novels.forEach((novel, idx) => {
    lines.push('')
    lines.push(`【卷 ${String(idx + 1).padStart(2, '0')}】 ${novel.title || '未命名作品'}`)
    if (novel.description) lines.push(`    ${novel.description}`)
    lines.push('-'.repeat(48))
    const chapters = novel.chapterList || []
    if (chapters.length === 0) {
      lines.push(sanitizeHtml(novel.content || novel.currentNovel || ''))
    } else {
      chapters.forEach((chapter, ci) => {
        lines.push('')
        lines.push(`第 ${ci + 1} 章  ${chapter.title || `第 ${ci + 1} 章`}`)
        lines.push(sanitizeHtml(chapter.content || chapter.generatedText || ''))
      })
    }
  })
  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
  const filename = `墨章作品集_${novels.length}部_${Date.now()}.txt`
  saveAs(blob, filename)
  return { filename }
}

export default {
  exportNovelsToPDF,
  exportNovelsToWord,
  exportNovelsToText,
  DEFAULT_EXPORT_OPTIONS
}
